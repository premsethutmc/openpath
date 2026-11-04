"""Educator access (educator-access@1): an OpenPath administrator grants an existing account the educator role, or
removes it, from the Content review screen. It writes the same ContentReviewer grant that
`manage.py content_reviewer grant|revoke --role educator` writes; marking (written.py) and review decisions
(content_review.py) read that grant and are unchanged.

Who is an administrator: an active Django superuser. That flag is never set by the app (registration uses
create_user); only the server operator sets it (`manage.py createsuperuser`, or the Django shell for an existing
account). Parents, learners, educators, release managers and developers cannot grant roles.

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
from .models import ContentReviewer
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
        return Response({'educators': [_grant_json(g) for g in grants]})

    def post(self, request):
        user = _account(request)
        g, _ = ContentReviewer.objects.update_or_create(user=user, role='educator', defaults={'granted_via': f'administrator {request.user.pk}', 'revoked_at': None})
        audit(request.user, 'educator-grant', detail=f'account {user.pk}')
        return Response(_grant_json(g), status=status.HTTP_201_CREATED)

    def delete(self, request):
        user = _account(request)
        n = ContentReviewer.objects.filter(user=user, role='educator', revoked_at__isnull=True).update(revoked_at=timezone.now())
        if not n:
            raise ValidationError({'email': 'That account does not have the educator role.'})
        audit(request.user, 'educator-revoke', detail=f'account {user.pk}')
        return Response(status=status.HTTP_204_NO_CONTENT)
