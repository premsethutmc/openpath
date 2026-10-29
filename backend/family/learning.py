"""My Learning Year records ("learning_record", in the mathematics stream): shape, ownership and references only.

No estimate, status, mastery or verification is calculated or accepted here; the app derives everything from these
records through the shared engine. The server keeps the time (an event's "at" is the server's), checks every reference
(questions, strategies, goals, curriculum releases by content hash) and refuses a delayed check that is not due.
"""
import json
import os
import re
from datetime import timedelta
from fractions import Fraction
from functools import lru_cache
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .answer_types import HUMAN, NEW_TYPES, SAMPLED, canonical_of, expanded_form, parse as parse_expression, same_answer
from . import decisions
from .kernel_grader import enabled as grader_enabled, kernel_decision
from .question_status import quarantined
from .learning_families import exposure, generated
from .models import PupilEvent

ROOT = 'content/learning'
ACTIVITIES = {'diagnostic', 'probe', 'guided', 'check', 'practice', 'transfer', 'retention', 'original', 'challenge'}
RECORDS = {
    'enrol': {'grade', 'academicYear', 'curriculum'},
    'goal': {'pathway', 'active', 'targetYear'},
    'curriculum': {'release'},
    'attempt': {'questionId', 'response', 'activity', 'hints', 'solution', 'competency', 'context', 'working', 'assessment'},
    'teach': {'rule', 'strategy', 'competency'},
    'skip': {'target'},
    'study_session': {'planId', 'revision', 'phase', 'time', 'advice'},
    'topic_session': {'academicYear', 'stage', 'target', 'minutes', 'curriculum'},
}
BASE = {'kind', 'id', 'at', 'learnerId', 'sessionId', 'record'}
# a written answer (proof, construction, explanation) may be long; an educator marks it
WRITTEN_LIMIT = 16000  # a written answer, or a drawing with its note (draw@1; frontend/src/year/SketchPad.tsx)
# the delayed check (status@1 RETENTION_DAYS), less the half-day tolerance the shared engine also allows
# a delayed check: seven full days after independent success (status@1 RETENTION_DAYS; no tolerance on this surface)
RETENTION_DELAY = timedelta(days=7)
INDEPENDENT_MIN = 2
INDEPENDENT = ACTIVITIES - {'guided', 'probe'}
NUMBER = r'[+-]?\d{1,9}(?:\.\d{0,9})?'  # a whole number may be typed with a zero decimal part (the app's canonical)
RATIONAL = r'[+-]?\d{1,9}(?:\.\d{1,6})?(?:/[+-]?\d{1,9})?'
# mixed@1: a mixed number "3 1/2" is 3 + 1/2 ("-3 1/2" is -(3 + 1/2)), never 31/2 (packages/mathematics answers.ts)
MIXED = r'([+-]?)(\d{1,9})\s+(\d{1,9})/(\d{1,9})'


def _rational(t):
    m = re.fullmatch(MIXED, t, flags=re.ASCII)
    if m:
        v = int(m.group(2)) + Fraction(int(m.group(3)), int(m.group(4)))
        return -v if m.group(1) == '-' else v
    if ' ' in t:
        raise ValueError('not a number')
    return Fraction(t)


def _load(name):
    return json.loads((Path(settings.BASE_DIR).parent / ROOT / name).read_text())


@lru_cache
def content():
    modules = _load('modules.v1.json')
    marked = _load('written-modules.v1.json')
    modules = {**modules, 'questions': [*modules['questions'], *marked['questions']], 'modules': [*modules['modules'], *marked['modules']]}
    library = _load('library.v1.json')['modules']
    problems = _load('problems.v1.json')['problems']
    questions = {q['id']: q for q in modules['questions']}
    for p in problems:
        for f in [p['full'], *p['fragments']]:
            questions[f['id']] = {**f, 'competency': f['competencies'][-1], 'role': 'challenge'}
    for t in _load('written.v1.json')['tasks']:
        # written@1: an educator marks it; the answer is the mark "correct" (never the learner's text)
        questions[t['id']] = {**t, 'type': 'written', 'answer': '', 'role': 'written'}
    graph = {c['id'] for c in json.loads((Path(settings.BASE_DIR).parent / 'content/mathematics/curriculum.v1.json').read_text())['competencies']}
    graph |= {c['id'] for c in _load('competency-additions.v1.json')['competencies']}
    expansion = Path(settings.BASE_DIR).parent / ROOT / 'competency-expansion.v1.json'
    if expansion.exists():
        graph |= {c['id'] for c in json.loads(expansion.read_text())['competencies']}
    releases = {(r['id'], r['version']): r['hash'] for r in _load('curricula/index.json')['releases']}
    return {
        'questions': questions,
        # hand-written modules, then modules synthesised from blueprints (library.v1.json); a hand-written one wins
        'modules': {**{m['competency']: m for m in library}, **{m['competency']: m for m in modules['modules']}},
        'goals': {g['id'] for g in _load('goals.v1.json')['goals']},
        'graph': graph,
        'releases': releases,
    }


def hash_of(value):
    """The app's content hash (FNV-1a over the JSON text, by UTF-16 code unit), so a release can be checked here."""
    text = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    h = 0x811C9DC5
    data = text.encode('utf-16-le')
    for i in range(0, len(data), 2):
        h = ((h ^ (data[i] | data[i + 1] << 8)) * 0x01000193) & 0xFFFFFFFF
    return format(h, '08x')


def server_now(pupil):
    """The server's clock. TEST ONLY: with OPENPATH_TEST_CLOCK_FILE set (never in production), a JSON file
    {pupil id: days} moves the clock forward for a synthetic pupil, so browser tests can reach a delayed check without
    changing any stored record. The browser's clock is moved by the same amount."""
    now = timezone.now()
    path = os.environ.get('OPENPATH_TEST_CLOCK_FILE')
    if path and pupil.display_name.startswith('Synthetic'):
        try:
            days = json.loads(Path(path).read_text()).get(str(pupil.pk), 0)
        except (OSError, ValueError):
            days = 0
        if isinstance(days, (int, float)) and 0 <= days <= 3650:
            now += timedelta(days=days)
    return now


def _unbrace(t):
    """An unordered set may be written with its braces: {1, 2} is 1, 2 (the app's canonical)."""
    m = re.fullmatch(r'\{([^{}]*)\}', t)
    return m.group(1) if m else t


def canonical(kind, raw):
    """The answer's canonical form (the app's `canonical`), or None if it is not one of this kind. answers@2 types
    (answer_types.py): exact types have a canonical form; sampled types are compared in `right`; written: none."""
    if kind in NEW_TYPES:
        return canonical_of(kind, raw)
    t = str(raw).strip().replace('−', '-')
    try:
        if kind == 'choice':
            return t.upper() if t.upper() in {'A', 'B', 'C', 'D'} else None
        if kind == 'integer':
            if not re.fullmatch(NUMBER, t, flags=re.ASCII):
                return None
            v = Fraction(t)
            return str(v.numerator) if v.denominator == 1 else str(v)
        if kind == 'fraction':
            return str(_rational(t))
        if kind == 'set':
            parts = [Fraction(p.strip()) for p in _unbrace(t).split(',')]
            return ','.join(sorted(str(p) for p in parts)) if len(set(parts)) == len(parts) else None
    except (ValueError, ZeroDivisionError):
        return None
    return t


def right(q, response):
    if q['type'] in HUMAN:
        return False  # an educator marks it
    # form@1: an "expand" task's answer must be written expanded, whatever its value
    if q.get('expanded') and not expanded_form(response):
        return False
    if q['type'] in SAMPLED:
        return same_answer(q['type'], response, q['answer'])
    c = canonical(q['type'], response)
    return c is not None and c == canonical(q['type'], q['answer'])


ASSESSMENT_KEYS = {'policy', 'answerCorrect', 'methodExamined', 'derivationVerified', 'firstError', 'clarificationRequired', 'aiFallbackUsed', 'unresolved', 'source'}
ASSESSMENT_SOURCES = {'kernel', 'legacy', 'educator', 'held', 'disagreement', 'parser', 'verifier', 'infrastructure'}
GRADER_SOURCES = {'kernel', 'verifier', 'parser', 'held'}  # decided by the trusted grader (grading/decision.ts): the record carries the verdict


def _assessment_ok(a, q, response=None):
    """assessment@1, SHAPE only. What the client says about its own grading is advisory: it may carry diagnosis text and the
    step offers it showed, but it cannot carry a verdict the server has not made (`_authoritative` overwrites answerCorrect and
    unresolved from the stored answer), and it may not claim a derivation check or AI use."""
    if not isinstance(a, dict) or set(a) != ASSESSMENT_KEYS or a['policy'] != 'assessment@1' or a['source'] not in ASSESSMENT_SOURCES:
        return False
    if any(type(a[k]) is not bool for k in ('methodExamined', 'derivationVerified', 'clarificationRequired', 'aiFallbackUsed', 'unresolved')):
        return False
    if a['derivationVerified'] or a['aiFallbackUsed'] or a['answerCorrect'] not in (True, False, None):
        return False
    fe = a['firstError']
    return fe is None or (isinstance(fe, dict) and set(fe) == {'transition', 'from', 'to', 'kind', 'explanation'} and type(fe['transition']) is int
                          and all(isinstance(fe[k], str) and len(fe[k]) <= 240 for k in ('from', 'to', 'kind', 'explanation')))


def _authoritative(event, q, readable):
    """The server's assessment@1 for one answer (the decision's compatibility view); see _decide."""
    return _decide(event, q)[0]


def _decide(event, q, now=None):
    """The server's decision about one answer, and nothing the client claims: (assessment@1 view, grading-decision@1).
    grading-policy@1 (Phase C): the trusted grader runs THE decision (the app's own code) for every known question and its verdict is
    recorded as is. There is no stored-answer fallback (UNIFIED_GRADING_ARCHITECTURE.md §11, D12): the grader not runnable (missing,
    tampered, disabled, timed out, crashed) -> unresolved, source "infrastructure"; a reply refused because the grader's stored answer
    differs from this server's (parity: a contract inconsistency) -> unresolved, source "held". A quarantined question gets no grade;
    written answers stay with the educator. Unresolved is never incorrect, never credited, never an attempt; the answer is kept."""
    a = event.get('assessment')
    if quarantined(event.get('questionId')):
        # question-status@1: no authoritative grade for a quarantined question, whatever the browser sent; the answer is kept
        base = a if a is not None else {'policy': 'assessment@1', 'methodExamined': False, 'derivationVerified': False, 'aiFallbackUsed': False}
        return ({**base, 'answerCorrect': None, 'firstError': None, 'clarificationRequired': False, 'unresolved': True, 'source': 'held'},
                decisions.build(event, failure='quarantined', now=now))
    if q['type'] in HUMAN:
        return (None if a is None else {**a, 'answerCorrect': None, 'unresolved': False, 'firstError': None, 'source': 'educator'},
                decisions.build(event, educator=True, now=now))
    base = a if a is not None else {'policy': 'assessment@1', 'methodExamined': False, 'derivationVerified': False, 'aiFallbackUsed': False, 'clarificationRequired': False, 'firstError': None}
    k = kernel_decision(event.get('questionId'), event['response'], q['answer'], event.get('working'))
    if k is not None:
        ok = k['credit']
        return ({**base, 'answerCorrect': ok, 'unresolved': ok is None, 'clarificationRequired': ok is None, 'firstError': base.get('firstError') if ok is False else None, 'source': k['source']},
                decisions.build(event, grader=k, now=now))
    source = 'held' if grader_enabled() else 'infrastructure'
    return ({**base, 'answerCorrect': None, 'firstError': None, 'clarificationRequired': False, 'unresolved': True, 'source': source},
            decisions.build(event, failure=source, now=now))


def credited(q, event):
    """Whether a stored attempt earned answer credit, from its RECORDED verdict (UNIFIED_GRADING_ARCHITECTURE.md §9, D11): the server's
    grading decision, else the assessment this server recorded with it. Only a record with no recorded verdict at all (saved before the
    server recorded assessments) is compared again, with the stored-answer comparison it was graded by; the reconstruction dry run
    reports those."""
    if quarantined(event.get('questionId')):
        return False
    v = decisions.verdict_of(event)
    if v is not None:
        return v == 'correct'
    return right(q, event.get('response', ''))


def independent_at(prior, competency, marks=None):
    """When independent success on this competency was first shown (the app's skillEvidence.independentAt). A written
    answer counts only once an educator has marked it correct (marks: attempt id -> verdict); unmarked, it is not
    yet evidence of anything."""
    qs = content()['questions']
    marks = marks or {}
    seen, distinct = {}, set()
    for e in prior:
        if e.get('record') == 'attempt' and (qs.get(e.get('questionId')) or {}).get('type') in HUMAN and e.get('id') not in marks:
            continue
        q = qs.get(e.get('questionId')) or generated(e.get('questionId')) if e.get('record') == 'attempt' else None
        if not q:
            continue
        # one exposure per problem, whichever answer format (the app's families.ts exposureKey; distinct@1)
        key = exposure(e['questionId'])
        if quarantined(e['questionId']):
            continue  # question-status@1: never an attempt, never evidence
        if decisions.verdict_of(e) == 'unresolved':
            continue  # undecided (set by this server, never by the browser): not an attempt, however many (approved policy P1, D16)
        n = seen[key] = seen.get(key, 0) + 1
        if q['competency'] != competency or n > 1 or e.get('hints') or e.get('solution') or e.get('activity') not in INDEPENDENT:
            continue
        ok = marks.get(e.get('id')) == 'correct' if q['type'] in HUMAN else credited(q, e)
        if ok:
            distinct.add(e['questionId'])
            if len(distinct) >= INDEPENDENT_MIN:
                return timezone.datetime.fromisoformat(e['at'].replace('Z', '+00:00'))
    return None


def _reject(message):
    raise ValidationError({'event': message})


def _text(value, limit):
    return isinstance(value, str) and 0 < len(value) <= limit


def _answer_ok(kind, raw):
    t = raw.strip().replace('−', '-')
    if kind in HUMAN:
        return 0 < len(t) <= WRITTEN_LIMIT
    if kind in SAMPLED:
        try:
            parse_expression(re.sub(r'\s*\+\s*[cCkK]\s*$', '', t) if kind == 'antiderivative' else t)
            return True
        except Exception:  # noqa: BLE001 - any unreadable expression
            return False
    if kind in NEW_TYPES:
        return canonical_of(kind, t) is not None
    if kind == 'choice':
        return t.upper() in {'A', 'B', 'C', 'D'}
    if kind == 'integer':
        return re.fullmatch(NUMBER, t, flags=re.ASCII) is not None
    if kind == 'fraction':
        return (re.fullmatch(RATIONAL, t, flags=re.ASCII) is not None or re.fullmatch(MIXED, t, flags=re.ASCII) is not None) and not re.search(r'/[+-]?0+$', t)
    if kind == 'set':
        parts = [p.strip() for p in _unbrace(t).split(',')]
        return 0 < len(parts) <= 30 and all(re.fullmatch(RATIONAL, p, flags=re.ASCII) for p in parts)
    if kind == 'polynomial':
        return re.fullmatch(r'[0-9x+\-*^() /.²³]{1,60}', t) is not None
    return False


def _check_release(release, pupil_prior):
    c = content()
    if not isinstance(release, dict):
        _reject('A curriculum release must be an object.')
    allowed = {'id', 'version', 'status', 'grade', 'title', 'hash', 'source', 'review', 'subjects'}
    if set(release) - allowed or not _text(release.get('id'), 120) or not _text(release.get('version'), 20) or not _text(release.get('title'), 200):
        _reject('Unknown curriculum release fields.')
    if release.get('status') != 'reviewed' or not isinstance(release.get('review'), dict):
        _reject('Only a reviewed curriculum release can be saved for a learner.')
    if release['review'].get('educatorReviewed') is not False:
        _reject('An educator review cannot be claimed from the app.')
    if type(release.get('grade')) is not int or not 1 <= release['grade'] <= 12:
        _reject('A curriculum release needs a grade from 1 to 12.')
    if not isinstance(release.get('source'), dict) or release['source'].get('kind') != 'textbook':
        _reject('A curriculum release says which textbook it came from.')
    if hash_of({**release, 'hash': ''}) != release.get('hash'):
        _reject('The curriculum release does not match its content hash.')
    subjects = release.get('subjects')
    if not isinstance(subjects, list) or not subjects:
        _reject('A curriculum release needs its subjects.')
    def outcomes(node, depth=0):
        # a chapter's own outcomes, then its sections' (any depth, bounded)
        if not isinstance(node, dict) or depth > 8:
            return []
        own = [o for o in node.get('outcomes', []) if isinstance(o, dict)]
        return own + [o for sec in node.get('sections', []) or [] for o in outcomes(sec, depth + 1)]
    for s in subjects:
        for ch in s.get('chapters', []) if isinstance(s, dict) else []:
            for o in outcomes(ch):
                for m in (o.get('mapping') or {}).get('competencies', []):
                    if m.get('status') == 'accepted' and m.get('id') not in c['graph']:
                        _reject('A curriculum release assigns an unknown competency.')
                    if m.get('status') == 'accepted' and (o.get('mapping') or {}).get('verdict') == 'unsupported':
                        _reject('An outcome of an unsupported subject cannot be mapped.')
                prop = (o.get('mapping') or {}).get('proposal')
                if prop and (prop.get('status') != 'provisional-proposal' or prop.get('id') in c['graph']):
                    _reject('A proposal stays provisional and cannot reuse a competency id.')


def _known_release(ref, prior):
    c = content()
    if not isinstance(ref, dict) or set(ref) != {'id', 'version', 'hash'} or not all(_text(ref.get(k), 120) for k in ref):
        return False
    if c['releases'].get((ref['id'], ref['version'])) == ref['hash']:
        return True
    return any(
        e.get('record') == 'curriculum' and isinstance(e.get('release'), dict)
        and (e['release'].get('id'), e['release'].get('version'), e['release'].get('hash')) == (ref['id'], ref['version'], ref['hash'])
        for e in prior
    )


def checked_learning(event, pupil):
    c = content()
    record = event.get('record')
    if record not in RECORDS or set(event) - BASE - RECORDS[record] or event.get('kind') != 'learning_record':
        _reject('Unknown learning record or fields.')
    if event.get('learnerId') != str(pupil.pk):
        _reject('A learning record must belong to this learner.')
    if not _text(event.get('id'), 100):
        _reject('A learning record needs an id.')
    if not isinstance(event.get('sessionId'), str) or not event['sessionId'].startswith(f'learn:{pupil.pk}:') or len(event['sessionId']) > 160:
        _reject('A learning visit must belong to this learner.')
    prior = decisions.effective(pupil, PupilEvent.objects.filter(pupil=pupil, subject='mathematics', kind='learning_record').order_by('seq').values_list('body', flat=True))
    if any(e.get('id') == event['id'] for e in prior):
        _reject('This activity ID already exists. Reload to confirm a retry.')
    now = server_now(pupil)

    if record == 'enrol':
        if type(event.get('grade')) is not int or not 1 <= event['grade'] <= 12:
            _reject('Choose a grade from 1 to 12.')
        if not isinstance(event.get('academicYear'), str) or not re.fullmatch(r'20\d\d-\d\d', event['academicYear']):
            _reject('An academic year looks like 2026-27.')
        if not _known_release(event.get('curriculum'), prior):
            _reject('Unknown curriculum release (or its content has changed).')
    elif record == 'topic_session':
        if event.get('stage') not in ('diagnostic', 'plan'):
            _reject('Unknown topic session stage.')
        if event['stage'] == 'diagnostic' and 'minutes' in event:
            _reject('Select a duration only after diagnosis.')
        if event['stage'] == 'plan' and (type(event.get('minutes')) is not int or event['minutes'] not in (15, 30, 60)):
            _reject('Choose a 15, 30 or 60 minute session.')
        current = next((e for e in reversed(prior) if e.get('record') == 'enrol'), None)
        if not current or event.get('academicYear') != current.get('academicYear') or current.get('grade') != 7 or event.get('curriculum') != current.get('curriculum'):
            _reject('A session plan must use the learner current Grade 7 curriculum.')
        if event.get('target') not in c['modules'] or not _known_release(event.get('curriculum'), prior):
            _reject('Unknown session target or curriculum.')
    elif record == 'study_session':
        event = _study_session(event, prior, pupil, c)
    elif record == 'goal':
        if event.get('pathway') not in c['goals'] or type(event.get('active')) is not bool:
            _reject('Unknown goal pathway.')
        if 'targetYear' in event and (type(event['targetYear']) is not int or not 2026 <= event['targetYear'] <= 2045):
            _reject('A target year from 2026 to 2045.')
    elif record == 'curriculum':
        _check_release(event.get('release'), prior)
    elif record == 'attempt':
        q = c['questions'].get(event.get('questionId')) or generated(event.get('questionId'))
        if not q:
            _reject('Unknown question.')
        if event.get('competency') != q['competency']:
            _reject('The question belongs to another skill.')
        if event.get('activity') not in ACTIVITIES:
            _reject('Unknown activity.')
        if type(event.get('hints')) is not int or not 0 <= event['hints'] <= 5 or type(event.get('solution')) is not bool:
            _reject('Hints and solutions are recorded as given.')
        if not isinstance(event.get('response'), str) or len(event['response']) > (WRITTEN_LIMIT if q['type'] in HUMAN else 300 if q['type'] in NEW_TYPES or q['type'] == 'set' else 80) or not event['response'].strip():
            _reject('That answer is too long, or empty.')
        readable = _answer_ok(q['type'], event['response'])  # not readable: saved undecided below, never recorded as wrong
        if isinstance(event.get('context'), str) and event['context'].startswith('study:'):
            plan_id = event['context'][6:]
            visits = [e for e in prior if e.get('record') == 'study_session' and e.get('planId') == plan_id]
            if not visits or visits[-1]['phase'] == 'ended':
                _reject('Open this study session before recording answers; a completed summary is final.')
        if 'context' in event and not _text(event['context'], 80):
            _reject('Invalid context.')
        if 'assessment' in event and not _assessment_ok(event['assessment'], q):
            _reject('The assessment result is malformed.')
        decided, decision = _decide(event, q, now)
        if decided is not None:
            event = {**event, 'assessment': decided}
        # grading-decision@1 (stage 7): the server's decision is kept in the immutable event body and appended to the decision log (views.py)
        event = {**event, 'decision': decision}
        w = event.get('working', [])
        if not isinstance(w, list) or len(w) > 8 or not all(isinstance(x, str) and len(x) <= 80 for x in w):
            _reject('Working is at most 8 lines of 80 characters.')
        if event['activity'] == 'retention':
            # the same rule as the app (status@1): two distinct right first answers on your own, then seven full days
            from .models import WrittenMark
            marks = dict(WrittenMark.objects.filter(pupil=pupil).values_list('attempt_id', 'verdict'))
            since = independent_at(prior, q['competency'], marks)
            if since is None or now - since < RETENTION_DELAY:
                _reject('The delayed check is not due yet.')
    elif record == 'teach':
        m = c['modules'].get(event.get('competency'))
        if not m or event.get('strategy') not in {s['id'] for s in m['strategies']} or not _text(event.get('rule'), 40):
            _reject('Unknown teaching for this skill.')
    elif record == 'skip':
        if not _text(event.get('target'), 120):
            _reject('Invalid skip.')
    # the server keeps the time: the delayed check and everything else is measured by it
    return {**event, 'at': now.isoformat().replace('+00:00', 'Z'), 'savedAt': now.isoformat()}


def _study_session(event, prior, pupil, c):
    """Cumulative client timing + server-counted performance, never mastery evidence."""
    plan = next((e for e in prior if e.get('id') == event.get('planId') and e.get('record') == 'topic_session' and e.get('stage') == 'plan'), None)
    if not plan:
        _reject('A study session needs this learner saved study plan.')
    visits = [e for e in prior if e.get('record') == 'study_session' and e.get('planId') == plan['id']]
    last = visits[-1] if visits else None
    phase = event.get('phase')
    if type(event.get('revision')) is not int or event['revision'] != (last['revision'] + 1 if last else 0):
        _reject('Reload the latest study session before saving another checkpoint.')
    if (last and last['phase'] == 'ended') or phase not in ('start', 'active', 'ended') or (phase == 'start') != (last is None):
        _reject('A study session starts once and ends once. Its saved summary is final.')
    clock = event.get('time')
    keys = {'activeMs', 'solvingMs', 'idleMs'}
    if not isinstance(clock, dict) or set(clock) != keys or any(type(v) is not int or not 0 <= v <= 86_400_000 for v in clock.values()):
        _reject('Invalid cumulative study timing.')
    before = last['time'] if last else dict.fromkeys(keys, 0)
    if any(clock[k] < before[k] for k in keys) or clock['solvingMs'] - before['solvingMs'] > clock['activeMs'] - before['activeMs']:
        _reject('Timing must be cumulative; solving time is part of active time.')
    if phase == 'start' and any(clock.values()):
        _reject('Start a new study clock at zero.')
    if phase != 'ended':
        if 'advice' in event:
            _reject('Recommendations belong to the completed session summary.')
        return event
    advice = event.get('advice')
    if not isinstance(advice, dict) or set(advice) != {'gaps', 'morePractice', 'next'}:
        _reject('A session summary needs the shared planner recommendations.')
    gaps, more, nxt = advice['gaps'], advice['morePractice'], advice['next']
    if not isinstance(more, list) or len(more) > 200 or len(set(x for x in more if isinstance(x, str))) != len(more) or any(not isinstance(x, str) or x not in c['graph'] for x in more):
        _reject('Unknown practice competency.')
    if not isinstance(nxt, dict) or set(nxt) != {'competency', 'reason'} or (nxt['competency'] is not None and (not isinstance(nxt['competency'], str) or nxt['competency'] not in c['graph'])) or not _text(nxt['reason'], 1000):
        _reject('Unknown next recommendation.')
    if not isinstance(gaps, list) or len(gaps) > 100:
        _reject('Invalid prerequisite findings.')
    attempts = [e for e in prior if e.get('record') == 'attempt' and e.get('context') == f"study:{plan['id']}"]
    for gap in gaps:
        if not isinstance(gap, dict) or set(gap) != {'competency', 'reason', 'sourceQuestion'} or not isinstance(gap['competency'], str) or gap['competency'] not in c['graph'] or not _text(gap['reason'], 1000) or not any(a['questionId'] == gap['sourceQuestion'] for a in prior if a.get('record') == 'attempt'):
            _reject('A prerequisite finding needs its recorded source question.')
    from .models import WrittenMark
    marks = dict(WrittenMark.objects.filter(pupil=pupil).values_list('attempt_id', 'verdict'))
    correct, incorrect, pending = [], [], []
    for a in attempts:
        q = c['questions'].get(a['questionId']) or generated(a['questionId'])
        if quarantined(a['questionId']) or decisions.verdict_of(a) == 'unresolved':
            continue  # question-status@1 and approved policy P1 (D19): neither correct nor incorrect (kept in attemptIds as answered)
        if q['type'] in HUMAN and a['id'] not in marks:
            pending.append(a['id'])
        elif (marks.get(a['id']) == 'correct' if q['type'] in HUMAN else credited(q, a)):
            correct.append(a['id'])
        else:
            incorrect.append(a['id'])
    return {**event, 'summary': {**advice, 'attemptIds': [a['id'] for a in attempts], 'correctIds': correct, 'incorrectIds': incorrect, 'pendingIds': pending, 'competencies': list(dict.fromkeys(a['competency'] for a in attempts))}}
