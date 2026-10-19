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
from .learning_families import generated
from .models import PupilEvent

ROOT = 'content/learning'
ACTIVITIES = {'diagnostic', 'probe', 'guided', 'check', 'practice', 'transfer', 'retention', 'original', 'challenge'}
RECORDS = {
    'enrol': {'grade', 'academicYear', 'curriculum'},
    'goal': {'pathway', 'active', 'targetYear'},
    'curriculum': {'release'},
    'attempt': {'questionId', 'response', 'activity', 'hints', 'solution', 'competency', 'context', 'working'},
    'teach': {'rule', 'strategy', 'competency'},
    'skip': {'target'},
}
BASE = {'kind', 'id', 'at', 'learnerId', 'sessionId', 'record'}
# the delayed check (status@1 RETENTION_DAYS), less the half-day tolerance the shared engine also allows
# a delayed check: seven full days after independent success (status@1 RETENTION_DAYS; no tolerance on this surface)
RETENTION_DELAY = timedelta(days=7)
INDEPENDENT_MIN = 2
INDEPENDENT = ACTIVITIES - {'guided', 'probe'}
NUMBER = r'[+-]?\d{1,9}'
RATIONAL = r'[+-]?\d{1,9}(?:\.\d{1,6})?(?:/[+-]?\d{1,9})?'


def _load(name):
    return json.loads((Path(settings.BASE_DIR).parent / ROOT / name).read_text())


@lru_cache
def content():
    modules = _load('modules.v1.json')
    library = _load('library.v1.json')['modules']
    problems = _load('problems.v1.json')['problems']
    questions = {q['id']: q for q in modules['questions']}
    for p in problems:
        for f in [p['full'], *p['fragments']]:
            questions[f['id']] = {**f, 'competency': f['competencies'][-1], 'role': 'challenge'}
    graph = {c['id'] for c in json.loads((Path(settings.BASE_DIR).parent / 'content/mathematics/curriculum.v1.json').read_text())['competencies']}
    graph |= {c['id'] for c in _load('competency-additions.v1.json')['competencies']}
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


def canonical(kind, raw):
    """The answer's canonical form (the app's `canonical`), or None if it is not one of this kind."""
    t = str(raw).strip().replace('−', '-')
    try:
        if kind == 'choice':
            return t.upper() if t.upper() in {'A', 'B', 'C', 'D'} else None
        if kind == 'integer':
            return str(int(t)) if re.fullmatch(NUMBER, t, flags=re.ASCII) else None
        if kind == 'fraction':
            return str(Fraction(t.replace(' ', '')))
        if kind == 'set':
            parts = [Fraction(p.strip()) for p in t.split(',')]
            return ','.join(sorted(str(p) for p in parts)) if len(set(parts)) == len(parts) else None
    except (ValueError, ZeroDivisionError):
        return None
    return t


def right(q, response):
    c = canonical(q['type'], response)
    return c is not None and c == canonical(q['type'], q['answer'])


def independent_at(prior, competency):
    """When independent success on this competency was first shown (the app's skillEvidence.independentAt)."""
    qs = content()['questions']
    seen, distinct = {}, set()
    for e in prior:
        q = qs.get(e.get('questionId')) or generated(e.get('questionId')) if e.get('record') == 'attempt' else None
        if not q:
            continue
        n = seen[e['questionId']] = seen.get(e['questionId'], 0) + 1
        if q['competency'] != competency or n > 1 or e.get('hints') or e.get('solution') or e.get('activity') not in INDEPENDENT:
            continue
        if right(q, e.get('response', '')):
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
    if kind == 'choice':
        return t.upper() in {'A', 'B', 'C', 'D'}
    if kind == 'integer':
        return re.fullmatch(NUMBER, t, flags=re.ASCII) is not None
    if kind == 'fraction':
        return re.fullmatch(RATIONAL, t.replace(' ', ''), flags=re.ASCII) is not None and not re.search(r'/[+-]?0+$', t)
    if kind == 'set':
        parts = [p.strip() for p in t.split(',')]
        return 0 < len(parts) <= 6 and all(re.fullmatch(RATIONAL, p, flags=re.ASCII) for p in parts)
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
    prior = [e for e in PupilEvent.objects.filter(pupil=pupil, subject='mathematics', kind='learning_record').values_list('body', flat=True)]
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
        if not isinstance(event.get('response'), str) or len(event['response']) > 80 or not _answer_ok(q['type'], event['response']):
            _reject('That answer is not in the form this question asks for.')
        if 'context' in event and not _text(event['context'], 80):
            _reject('Invalid context.')
        w = event.get('working', [])
        if not isinstance(w, list) or len(w) > 8 or not all(isinstance(x, str) and len(x) <= 80 for x in w):
            _reject('Working is at most 8 lines of 80 characters.')
        if event['activity'] == 'retention':
            # the same rule as the app (status@1): two distinct right first answers on your own, then seven full days
            since = independent_at(prior, q['competency'])
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
