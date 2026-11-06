"""recovery-handoff@0 (RESEARCH, deep-recovery@0; off unless OPENPATH_DEEP_RECOVERY_HANDOFF=1 on the server, and only the
`--test --deep-recovery` app build ever writes one).

When a deep recovery stops without teaching the learner through (blocked: OpenPath cannot teach the missing step; escalate: no fresh
question, teaching did not work, the effort limit, or no next step), the learner's app records one hand-off here. Nobody is emailed or
messaged: the hand-off is only VISIBLE, in Content review → Marking, to an educator the parent has shared this pupil with — the same
authorisation written@1 marking and handover@1 acknowledgements use (an active educator role + an active MarkingShare). The educator sees the
pupil under the marking pseudonym, the original skill, the step it stopped at, why, and the answers of that recovery; they can mark it
resolved with a note. Resolving changes nothing in the learner's records: it is not a mark, not evidence and not mastery.

Who may do what:
  - the parent's account (the account the learner's app uses) creates and reads its own pupil's hand-offs; never resolves them;
  - an educator with an active share for the pupil reads and resolves them; no one else sees them (other educators, other parents: 404/403);
  - signed-out requests are refused.
Deduplication: one open hand-off per pupil and original skill (a re-report updates it); a report for an episode already resolved returns the
resolved item and does not reopen it (a learner going back to the stop screen does not undo the educator's resolution).
"""
from __future__ import annotations

import os
import re

from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .decisions import verdict_of
from .developer import audit
from .learning import DEEP_EPISODE
from .models import MarkingShare, Pupil, PupilEvent, RecoveryHandoff
from .views import AccountBase
from .written import _alias, _is_educator, _shared_pupils

ORIGINAL = re.compile(r'[^|#@>\s]{1,120}')
SKILL = re.compile(r'[A-Za-z0-9._\-]{1,80}')
REASONS = {r for r, _ in RecoveryHandoff.REASONS}
EVIDENCE_LIMIT = 40


def enabled() -> bool:
    v = getattr(settings, 'OPENPATH_DEEP_RECOVERY_HANDOFF', None)
    return bool(v) if v is not None else os.environ.get('OPENPATH_DEEP_RECOVERY_HANDOFF') == '1'


def _iso(t):
    return t.isoformat().replace('+00:00', 'Z') if t else None


def _plain(value, field, required=False):
    v = str(value or '').strip()
    if (required and not v) or len(v) > 1000 or '<' in v:
        raise ValidationError({field: 'Plain text, up to 1000 characters.'})
    return v


def _attempts(pupil):
    return (b for b in PupilEvent.objects.filter(pupil=pupil, subject='mathematics', kind='learning_record').order_by('seq').values_list('body', flat=True) if b.get('record') == 'attempt')


def _in_recovery(body, original):
    c = body.get('context')
    return isinstance(c, str) and c.startswith(f'deep:{original}|')


def _on_original(body, original):
    q = body.get('questionId')
    return isinstance(q, str) and re.sub(r':(mc|w)$', '', q) == original


def _evidence(pupil, original):
    """the answers of this recovery (the original question and every answer recorded with its deep: context), newest last"""
    out = []
    for b in _attempts(pupil):
        if _on_original(b, original) or _in_recovery(b, original):
            c = b.get('context') or ''
            out.append({'questionId': b.get('questionId'), 'competency': b.get('competency'), 'response': str(b.get('response', ''))[:200], 'verdict': verdict_of(b),
                        'at': b.get('at'), 'step': c.rsplit('@', 1)[-1] if '@' in c else None})
    return out[-EVIDENCE_LIMIT:]


def _status(h):
    return 'resolved' if h.resolved_at else 'open'


def _learner_json(h):
    return {'id': h.pk, 'skill': h.skill, 'original': h.original, 'episode': h.episode, 'reason': h.reason, 'status': _status(h), 'createdAt': _iso(h.created_at),
            'resolvedAt': _iso(h.resolved_at), 'note': h.note if h.resolved_at else '', 'resolvedBy': 'educator' if h.resolved_at else None}


def _reported(h):
    return {**_learner_json(h), 'educatorCanSee': educator_can_see(h.pupil)}


def _educator_json(h, with_evidence=True):
    out = {'id': h.pk, 'pupil': str(h.pupil_id), 'learner': _alias(h.pupil_id), 'skill': h.skill, 'original': h.original, 'step': h.step, 'reason': h.reason, 'detail': h.detail,
           'path': h.path, 'status': _status(h), 'createdAt': _iso(h.created_at), 'reportedAt': _iso(h.reported_at), 'reports': h.reports,
           'resolvedAt': _iso(h.resolved_at), 'note': h.note}
    if with_evidence:
        out['evidence'] = _evidence(h.pupil, h.original)
    return out


def educator_can_see(pupil) -> bool:
    """whether any account with an ACTIVE educator role holds an ACTIVE share for this pupil (what the learner may be told)"""
    return any(_is_educator(s.reviewer) for s in MarkingShare.objects.filter(pupil=pupil, revoked_at__isnull=True).exclude(reviewer=pupil.parent).select_related('reviewer'))


class _Switched(AccountBase):
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not enabled():
            raise Http404


class PupilRecoveryHandoffsView(_Switched):
    """The learner's app (the parent's account): GET its pupil's hand-offs; POST one from a stopped deep recovery."""

    def get(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        return Response({'handoffs': [_learner_json(h) for h in pupil.recovery_handoffs.all()], 'educatorCanSee': educator_can_see(pupil)})

    def post(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        d = request.data
        original, skill, step, episode, reason = d.get('original'), d.get('skill'), d.get('step') or '', d.get('episode'), d.get('reason')
        if not isinstance(original, str) or not ORIGINAL.fullmatch(original):
            raise ValidationError({'original': 'The original question id.'})
        if not isinstance(skill, str) or not SKILL.fullmatch(skill):
            raise ValidationError({'skill': 'The original skill id.'})
        if not isinstance(step, str) or (step and not SKILL.fullmatch(step)):
            raise ValidationError({'step': 'The skill the recovery stopped at.'})
        m = DEEP_EPISODE.fullmatch(episode) if isinstance(episode, str) and len(episode) <= 200 else None
        if not m or m.group(1) != original:
            raise ValidationError({'episode': 'This recovery’s id (deep:<original>#<time>).'})
        if reason not in REASONS:
            raise ValidationError({'reason': 'One of: ' + ', '.join(sorted(REASONS)) + '.'})
        path = d.get('path') or []
        if not isinstance(path, list) or len(path) > 16 or not all(isinstance(p, str) and SKILL.fullmatch(p) for p in path):
            raise ValidationError({'path': 'Up to 16 skill ids.'})
        detail = _plain(d.get('detail'), 'detail', required=True)
        # only a recovery that actually started can be handed off: the learner's saved answer on the original question (which the
        # episode id is named after) or an answer saved with this recovery's deep: context (a no-fresh-question stop asks nothing more)
        if not any(_on_original(b, original) or _in_recovery(b, original) for b in _attempts(pupil)):
            raise ValidationError({'original': 'No saved answers for this recovery.'})
        now = timezone.now()
        fields = {'original': original, 'episode': episode, 'step': step, 'reason': reason, 'detail': detail, 'path': path, 'reported_at': now}
        with transaction.atomic():
            open_ = RecoveryHandoff.objects.select_for_update().filter(pupil=pupil, skill=skill, resolved_at__isnull=True).first()
            if open_:
                for k, v in fields.items():
                    setattr(open_, k, v)
                open_.reports += 1
                open_.save()
                return Response(_reported(open_), status=status.HTTP_200_OK)
            done = RecoveryHandoff.objects.filter(pupil=pupil, skill=skill, episode=episode, resolved_at__isnull=False).order_by('-resolved_at').first()
            if done:
                return Response(_reported(done), status=status.HTTP_200_OK)
            try:
                with transaction.atomic():
                    h = RecoveryHandoff.objects.create(pupil=pupil, skill=skill, **fields)
            except IntegrityError:  # a concurrent report created it first
                h = RecoveryHandoff.objects.get(pupil=pupil, skill=skill, resolved_at__isnull=True)
                return Response(_reported(h), status=status.HTTP_200_OK)
        return Response(_reported(h), status=status.HTTP_201_CREATED)


class RecoveryHandoffQueueView(_Switched):
    """An educator's list: hand-offs of pupils shared with them (open first), pseudonymous, with that recovery's answers."""

    def get(self, request):
        if not _is_educator(request.user):
            raise PermissionDenied('Seeing learners who need help needs the educator role.')
        rows = RecoveryHandoff.objects.filter(pupil__in=_shared_pupils(request.user)).select_related('pupil')
        out = sorted((_educator_json(h) for h in rows), key=lambda r: (r['status'] != 'open', r['reportedAt'] or ''))
        return Response({'handoffs': out})


class RecoveryHandoffResolveView(_Switched):
    """An educator marks one hand-off resolved (once), with an optional note the learner's app shows."""

    def post(self, request, handoff_id):
        if not _is_educator(request.user):
            raise PermissionDenied('Resolving a hand-off needs the educator role.')
        h = RecoveryHandoff.objects.filter(pk=handoff_id, pupil__in=_shared_pupils(request.user)).first()
        if not h:
            raise PermissionDenied('This learner has not been shared with you.')
        note = _plain(request.data.get('note'), 'note')
        n = RecoveryHandoff.objects.filter(pk=h.pk, resolved_at__isnull=True).update(resolved_at=timezone.now(), resolved_by=request.user, note=note)
        if not n:
            return Response({'detail': 'This hand-off is already resolved.'}, status=status.HTTP_409_CONFLICT)
        h.refresh_from_db()
        audit(request.user, 'recovery-handoff-resolve', pupil=h.pupil_id, detail=f'handoff {h.pk}')
        return Response(_educator_json(h, with_evidence=False))
