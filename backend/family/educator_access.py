"""Educator access (educator-access@1): an OpenPath administrator grants an existing account the educator role, or
removes it, from the Content review screen. It writes the same ContentReviewer grant that
`manage.py content_reviewer grant|revoke --role educator` writes; marking (written.py) and review decisions
(content_review.py) read that grant and are unchanged.

Who is an administrator: an active Django superuser. That flag is never set by the app (registration uses
create_user); only the server operator sets it (`manage.py createsuperuser`, or the Django shell for an existing
account). Parents, learners, educators, release managers and developers cannot grant roles.

Requests (educator-invite@1): any signed-in account can ask for the educator role (EducatorRequestView); the
administrator sees open requests beside the grants and either grants the role (which settles the request) or declines.

What an administrator sees: the educator grants (account email, active or removed, when, how). Nothing about pupils
or their records. Every grant and removal is written to the audit log by account id, not email.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from .developer import audit
from .models import ContentReviewer, EducatorRequest
from .views import AccountBase


def is_admin(user) -> bool:
    return bool(user and user.is_authenticated and user.is_active and user.is_superuser)


class IsAdministrator(BasePermission):
    message = "Managing educator access needs an OpenPath administrator account."

    def has_permission(self, request, view):
        return is_admin(request.user)


def _grant_json(g):
    return {'email': g.user.email or g.user.username, 'active': g.active, 'grantedAt': g.granted_at.isoformat().replace('+00:00', 'Z'), 'grantedVia': g.granted_via,
            'removedAt': g.revoked_at.isoformat().replace('+00:00', 'Z') if g.revoked_at else None}


def _iso(t):
    return t.isoformat().replace('+00:00', 'Z')


def _account(request):
    email = str(request.data.get('email') or '').strip().lower()
    if not email:
        raise ValidationError({'email': 'Give the account’s email.'})
    user = get_user_model().objects.filter(username=email, is_active=True).first()
    if user is None:
        raise ValidationError({'email': 'No OpenPath account uses that email. The educator must register first.'})
    return user


class EducatorAccessView(AccountBase):
    """GET: the educator grants. POST {email}: grant the educator role. DELETE {email}: remove it. Administrators only."""

    permission_classes = [IsAuthenticated, IsAdministrator]

    def get(self, request):
        grants = ContentReviewer.objects.filter(role='educator').select_related('user').order_by('-revoked_at', 'user__username')
        open_requests = EducatorRequest.objects.filter(decision='').select_related('user')
        return Response({'educators': [_grant_json(g) for g in grants],
                         'requests': [{'email': r.user.email or r.user.username, 'at': _iso(r.requested_at)} for r in open_requests]})

    def post(self, request):
        user = _account(request)
        g, _ = ContentReviewer.objects.update_or_create(user=user, role='educator', defaults={'granted_via': f'administrator {request.user.pk}', 'revoked_at': None})
        audit(request.user, 'educator-grant', detail=f'account {user.pk}')
        EducatorRequest.objects.filter(user=user, decision='').update(decision='granted', decided_at=timezone.now())
        return Response(_grant_json(g), status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = _account(request)
        n = ContentReviewer.objects.filter(user=user, role='educator', revoked_at__isnull=True).update(revoked_at=timezone.now())
        if not n:
            raise ValidationError({'email': 'That account does not have the educator role.'})
        audit(request.user, 'educator-revoke', detail=f'account {user.pk}')
        return Response(status=status.HTTP_204_NO_CONTENT)


def _request_json(user):
    if ContentReviewer.objects.filter(user=user, role='educator', revoked_at__isnull=True).exists():
        return {'status': 'educator'}
    r = EducatorRequest.objects.filter(user=user).order_by('-requested_at', '-id').first()
    if r is None:
        return {'status': 'none'}
    return {'status': {'': 'pending', 'granted': 'none', 'declined': 'declined'}[r.decision], 'at': _iso(r.requested_at)}


class EducatorRequestView(AccountBase):
    """educator-invite@1. GET: the signed-in account's own request status (none, pending, declined, educator).
    POST: ask for the educator role (one open request at a time; an educator need not ask)."""

    def get(self, request):
        return Response(_request_json(request.user))

    def post(self, request):
        state = _request_json(request.user)
        if state['status'] == 'educator':
            raise ValidationError({'detail': 'You already have the educator role.'})
        if state['status'] != 'pending':
            EducatorRequest.objects.create(user=request.user)
            audit(request.user, 'educator-request', detail=f'account {request.user.pk}')
        return Response(_request_json(request.user), status=status.HTTP_201_CREATED)


class EducatorRequestDeclineView(AccountBase):
    """educator-invite@1. POST {email}: an administrator declines that account's open request."""

    permission_classes = [IsAuthenticated, IsAdministrator]

    def post(self, request):
        user = _account(request)
        n = EducatorRequest.objects.filter(user=user, decision='').update(decision='declined', decided_at=timezone.now())
        if not n:
            raise ValidationError({'email': 'That account has no open request.'})
        audit(request.user, 'educator-decline', detail=f'account {user.pk}')
        return Response(status=status.HTTP_204_NO_CONTENT)
