"""Authoritative grading decisions (grading-decision@1): built once by this server, stored immutably, replayed as recorded.

UNIFIED_GRADING_ARCHITECTURE.md §7 and §9; approved decision 3 (2026-10-29): prospective recording only. Records saved before decisions
existed are NOT rewritten; replay reads their own recorded assessment, and only a record with no recorded verdict at all is compared
again (reported by the reconstruction dry run, `manage.py reconstruct_decisions --dry-run`).

  build(...)          the decision the server records for one attempt (the trusted grader's own decision, or the server's failure /
                      quarantine / educator decision in the same schema)
  record(...)         appends it to GradingDecisionRecord (the event body keeps the same decision)
  effective(...)      event bodies with each attempt's latest non-superseded decision (a regrade appends; nothing is overwritten)
  verdict_of(event)   'correct' | 'incorrect' | 'unresolved' | 'pending-educator', or None for a record with no recorded verdict
"""
import uuid

from . import kernel_grader

SCHEMA = 'grading-decision@1'
POLICY = 'grading-policy@1'
SERVER_REASONS = {'held': 'unresolved.contract-inconsistency', 'infrastructure': 'unresolved.infrastructure', 'quarantined': 'unresolved.quarantined'}


def build(event, grader=None, failure=None, now=None, educator=False, supersedes=None):
    """grader: the trusted grader's reply (kernel_grader.grader_decision) or None; failure: 'held' | 'infrastructure' | 'quarantined'"""
    base = grader.get('decision') if grader and isinstance(grader.get('decision'), dict) else None
    if base is not None and base.get('schema') == SCHEMA:
        d = dict(base)
    else:
        verdict, reason = ('pending-educator', 'pending-educator') if educator else ('unresolved', SERVER_REASONS[failure or 'infrastructure'])
        d = {'schema': SCHEMA, 'policy': POLICY, 'questionId': event.get('questionId'), 'contract': None, 'parser': None, 'verifier': None,
             'certified': False, 'certifications': None, 'verdict': verdict, 'reason': reason,
             'response': {'raw': event.get('response'), 'working': list(event.get('working') or [])}, 'interpretation': None, 'form': None,
             'method': {'examined': False, 'verified': False}, 'diagnosis': None}
    d.update({'decisionId': str(uuid.uuid4()), 'attemptId': event.get('id'), 'decidedBy': 'server', 'decidedAt': now.isoformat() if now else None,
              'grader': {'bundleSha256': kernel_grader.bundle_sha256() if base is not None else None}})
    if supersedes:
        d['supersedes'] = supersedes
    return d


def record(pupil, subject, decision, decided_at):
    from .models import GradingDecisionRecord
    return GradingDecisionRecord.objects.create(pupil=pupil, subject=subject, attempt_id=decision['attemptId'], decision_id=decision['decisionId'],
                                                supersedes=decision.get('supersedes') or '', reason=decision['reason'], verdict=decision['verdict'],
                                                decided_at=decided_at, body=decision)


def latest(pupil, subject='mathematics'):
    """attempt id -> the latest decision that no other decision supersedes"""
    from .models import GradingDecisionRecord
    rows = list(GradingDecisionRecord.objects.filter(pupil=pupil, subject=subject).order_by('decided_at', 'id').values_list('attempt_id', 'decision_id', 'supersedes', 'body'))
    superseded = {s for _, _, s, _ in rows if s}
    out = {}
    for attempt, did, _, body in rows:
        if did not in superseded:
            out[attempt] = body
    return out


def effective(pupil, bodies, subject='mathematics'):
    """event bodies with each attempt's current decision (only differs from the stored body after a superseding decision)"""
    cur = latest(pupil, subject)
    if not cur:
        return list(bodies)
    return [{**b, 'decision': cur[b['id']]} if b.get('record') == 'attempt' and b.get('id') in cur and (b.get('decision') or {}).get('decisionId') != cur[b['id']].get('decisionId') else b for b in bodies]


def verdict_of(event):
    d = event.get('decision')
    if isinstance(d, dict) and d.get('schema') == SCHEMA and d.get('decidedBy') == 'server':
        return d.get('verdict')
    a = event.get('assessment')
    if isinstance(a, dict):
        if a.get('unresolved') is True:
            return 'unresolved'
        if a.get('answerCorrect') is True:
            return 'correct'
        if a.get('answerCorrect') is False:
            return 'incorrect'
    return None
