"""Written answers marked by an educator (written@1): proofs, constructions, explanations.

Nothing is marked automatically. A parent chooses to share one pupil's written answers with one educator (an account
with the educator role, content_review); that educator sees those answers under a pseudonym ("Learner 3f2a"), marks
each one once against its rubric, and the mark is kept append-only. The parent's app reads the marks; only a mark of
"correct" is evidence of success (learning.py independent_at, and the app's records.ts).
"""
from __future__ import annotations

import hashlib
import re

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .answer_types import HUMAN
from .learning import content
from .models import ContentReviewer, MarkingShare, Pupil, PupilEvent, WrittenMark
from .views import AccountBase


def _is_educator(user):
    return ContentReviewer.objects.filter(user=user, role='educator', revoked_at__isnull=True).exists()


def _alias(pupil_id):
    return 'Learner ' + hashlib.sha256(f'written:{pupil_id}'.encode()).hexdigest()[:4]


def _shared_pupils(user):
    return Pupil.objects.filter(marking_shares__reviewer=user, marking_shares__revoked_at__isnull=True).exclude(parent=user).distinct()


def _written_attempts(pupil):
    qs = content()['questions']
    for body in PupilEvent.objects.filter(pupil=pupil, subject='mathematics', kind='learning_record').order_by('seq').values_list('body', flat=True):
        if body.get('record') == 'attempt' and (qs.get(body.get('questionId')) or {}).get('type') in HUMAN:
            yield body, qs[body['questionId']]


def _mark_json(m, with_marker=False):
    out = {'attemptId': m.attempt_id, 'questionId': m.question_id, 'verdict': m.verdict, 'score': m.score, 'outOf': m.out_of, 'feedback': m.feedback, 'at': m.at.isoformat().replace('+00:00', 'Z'), 'role': 'educator'}
    if with_marker:
        out['marker'] = m.marker.email if m.marker else None
    return out


class MarkingShareView(AccountBase):
    """The parent shares (POST {email}) or stops sharing (DELETE {email}) one pupil's written answers with an educator."""

    def get(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        return Response({'shares': [{'email': s.reviewer.email, 'since': s.granted_at.isoformat()} for s in pupil.marking_shares.filter(revoked_at__isnull=True).select_related('reviewer')]})

    def post(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        email = str(request.data.get('email', '')).strip().lower()
        reviewer = get_user_model().objects.filter(email__iexact=email).first() if email else None
        # the same answer whether the account does not exist or is not an educator: no account discovery
        if not reviewer or not _is_educator(reviewer) or reviewer == request.user:
            raise ValidationError({'email': 'That address is not an OpenPath educator who can mark written answers.'})
        if not pupil.marking_shares.filter(reviewer=reviewer, revoked_at__isnull=True).exists():
            MarkingShare.objects.create(pupil=pupil, reviewer=reviewer)
        return Response({'shared': True}, status=status.HTTP_201_CREATED)

    def delete(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        email = str(request.data.get('email', '')).strip().lower()
        n = pupil.marking_shares.filter(reviewer__email__iexact=email, revoked_at__isnull=True).update(revoked_at=timezone.now())
        return Response({'stopped': n})


class PupilMarksView(AccountBase):
    """The parent's app reads its pupil's marks (the marker is shown by role only)."""

    def get(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        return Response({'marks': [_mark_json(m) for m in WrittenMark.objects.filter(pupil=pupil)]})


class MarkingQueueView(AccountBase):
    """An educator's queue: written answers from pupils shared with them, pseudonymous, with the task and rubric."""

    def get(self, request):
        if not _is_educator(request.user):
            raise PermissionDenied('Marking written answers needs the educator role.')
        out = []
        for pupil in _shared_pupils(request.user):
            marked = {m.attempt_id: m for m in WrittenMark.objects.filter(pupil=pupil)}
            for body, task in _written_attempts(pupil):
                m = marked.get(body['id'])
                out.append({
                    'pupil': str(pupil.pk), 'learner': _alias(pupil.pk), 'attemptId': body['id'], 'questionId': body['questionId'], 'at': body.get('at'),
                    'task': {k: task.get(k) for k in ('prompt', 'kind', 'rubric', 'guidance', 'competency', 'figure', 'grade')}, 'response': body.get('response', ''),
                    'mark': _mark_json(m, with_marker=True) if m else None,
                })
        out.sort(key=lambda r: (r['mark'] is not None, r['at'] or ''))
        return Response({'queue': out})


class WrittenMarkView(AccountBase):
    """An educator marks one written answer, once (append-only)."""

    def post(self, request):
        if not _is_educator(request.user):
            raise PermissionDenied('Marking written answers needs the educator role.')
        d = request.data
        pupil = _shared_pupils(request.user).filter(pk=d.get('pupil')).first()
        if not pupil:
            raise PermissionDenied('This learner has not shared written answers with you.')
        found = next(((b, t) for b, t in _written_attempts(pupil) if b['id'] == d.get('attemptId')), None)
        if not found:
            raise ValidationError({'attemptId': 'No written answer with that id.'})
        body, task = found
        out_of = sum(int(r.get('points', 0)) for r in task.get('rubric', [])) or 1
        score, verdict, feedback = d.get('score'), d.get('verdict'), str(d.get('feedback', '')).strip()
        if verdict not in {'correct', 'partial', 'incorrect'}:
            raise ValidationError({'verdict': 'Correct, partly correct or not yet correct.'})
        if type(score) is not int or not 0 <= score <= out_of:
            raise ValidationError({'score': f'A whole number of points from 0 to {out_of}.'})
        if (verdict == 'correct') != (score == out_of):
            raise ValidationError({'verdict': 'Correct means full marks on the rubric, and full marks means correct.'})
        if not feedback or len(feedback) > 2000 or re.search(r'<[a-z/]', feedback, re.I):
            raise ValidationError({'feedback': 'Write feedback for the learner (up to 2000 characters, plain text).'})
        try:
            with transaction.atomic():
                m = WrittenMark.objects.create(pupil=pupil, attempt_id=body['id'], question_id=body['questionId'], verdict=verdict, score=score, out_of=out_of, feedback=feedback, marker=request.user)
        except IntegrityError:
            return Response({'detail': 'This answer is already marked; marks are not changed.'}, status=status.HTTP_409_CONFLICT)
        return Response(_mark_json(m, with_marker=True), status=status.HTTP_201_CREATED)
