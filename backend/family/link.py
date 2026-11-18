"""link@1: connect another phone to this family's account with a short code.

A phone that is signed in (a name-only guest account included) asks for a code. Typed into another phone within
fifteen minutes, the code signs that phone in to the same account: the same pupils, the same records, nothing copied.
This is how a parent's phone and a child's phone are joined without an email or a password.

A code is as strong as a sign-in, so it is treated like one: eight characters from an unambiguous alphabet
(32^8 possibilities), stored only as a keyed hash, valid once and for fifteen minutes, one live code per account,
and guessing is rate-limited with the sign-in limit.
"""

from __future__ import annotations

import secrets
from datetime import timedelta

from django.contrib.auth import login
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import FamilyLinkCode
from .views import AccountBase, ThrottledPublic, _account, _field

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O and no 1/I: read aloud and typed without mistakes
CODE_LENGTH = 8
VALID = timedelta(minutes=15)
REFUSED = "That code is not valid. A code works once, for 15 minutes: ask for a new one on the other phone."


def normalise(code: str) -> str:
    return "".join(ch for ch in str(code).upper() if ch.isalnum())


def code_hash(code: str) -> str:
    return salted_hmac("openpath.family.link@1", code, algorithm="sha256").hexdigest()


class LinkCodeView(AccountBase):
    """A new code for the signed-in account. Any earlier unused code of this account stops working."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account-password"

    def post(self, request):
        now = timezone.now()
        FamilyLinkCode.objects.filter(user=request.user, used_at__isnull=True).delete()
        FamilyLinkCode.objects.filter(expires_at__lt=now - timedelta(days=1)).delete()  # old rows are of no use
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        FamilyLinkCode.objects.create(user=request.user, code_hash=code_hash(code), expires_at=now + VALID)
        return Response({"code": f"{code[:4]}-{code[4:]}", "expires_in": int(VALID.total_seconds())}, status=status.HTTP_201_CREATED)


class LinkJoinView(ThrottledPublic):
    """Sign this device in to the account the code belongs to. The code is used up, whoever typed it."""

    throttle_scope = "account-login"

    def post(self, request):
        code = normalise(_field(request.data, "code"))
        if len(code) != CODE_LENGTH:
            raise ValidationError({"code": REFUSED})
        with transaction.atomic():
            row = FamilyLinkCode.objects.select_for_update().filter(code_hash=code_hash(code), used_at__isnull=True, expires_at__gt=timezone.now()).first()
            if row is None:
                raise ValidationError({"code": REFUSED})
            row.used_at = timezone.now()
            row.save(update_fields=["used_at"])
        user = row.user
        if not (request.user.is_authenticated and request.user.pk == user.pk):
            login(request._request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(_account(user))
