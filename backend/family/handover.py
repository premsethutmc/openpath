"""Hand-over acknowledgements (handover@1, Workstream H1).

When OpenPath pauses a competency and asks for a teacher or parent, the learner can come back on their own after a short break for one fresh
question (self-service, a bounded number of times). An educator can also record that they have gone through it with the learner: that
reopens the competency for one fresh question on the learner's own. It never marks anything correct and never gives mastery.

Who may acknowledge: an account with the educator role (content_review, the same grant that marks written answers) to whom the parent has
shared this pupil (MarkingShare). A parent account cannot: the parent's account is the one the learner's app uses, so an acknowledgement
from it could not be told apart from the learner's own. Learner records can never carry one (the learning-record allowlist refuses it).
"""
from __future__ import annotations

import uuid

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .learning import content
from .models import HandoverAcknowledgement, Pupil
from .views import AccountBase
from .written import _is_educator, _shared_pupils


def _json(a):
    return {'id': f'ack-{a.pk}', 'at': a.at.isoformat().replace('+00:00', 'Z'), 'competency': a.competency, 'by': 'educator', **({'recoveryEpisode': a.recovery_handoff.episode} if a.recovery_handoff_id else {})}


def _competencies():
    c = content()
    return {m['competency'] for m in c.get('modules', [])} if isinstance(c.get('modules'), list) else set(c.get('modules', {}).keys())


class HandoverAcknowledgementView(AccountBase):
    """An educator records that they have gone through a paused competency with a learner shared with them."""

    def post(self, request):
        if not _is_educator(request.user):
            raise PermissionDenied('Acknowledging a hand-over needs the educator role.')
        d = request.data
        try:
            pupil_id = uuid.UUID(str(d.get('pupil')))
        except ValueError:
            raise ValidationError({'pupil': 'A learner id.'})
        pupil = _shared_pupils(request.user).filter(pk=pupil_id).first()
        if not pupil:
            raise PermissionDenied('This learner has not been shared with you.')
        competency = d.get('competency')
        if not isinstance(competency, str) or competency not in _competencies():
            raise ValidationError({'competency': 'A competency with learning content.'})
        note = str(d.get('note', '')).strip()
        if len(note) > 1000 or '<' in note:
            raise ValidationError({'note': 'Plain text, up to 1000 characters.'})
        a = HandoverAcknowledgement.objects.create(pupil=pupil, competency=competency, note=note, educator=request.user)
        return Response(_json(a), status=status.HTTP_201_CREATED)


class PupilHandoverAcknowledgementsView(AccountBase):
    """The parent's app reads its pupil's acknowledgements (the educator is shown by role only)."""

    def get(self, request, pupil_id):
        pupil = get_object_or_404(Pupil, pk=pupil_id, parent=request.user)
        return Response({'acknowledgements': [_json(a) for a in HandoverAcknowledgement.objects.filter(pupil=pupil)]})
