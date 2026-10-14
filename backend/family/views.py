"""Parent accounts and pupil records over HTTP.

Authentication is Django's own: django.contrib.auth checks passwords (its configured
hashers), django.contrib.sessions keeps the signed-in state in an HttpOnly cookie,
and Django's CSRF protection guards every request that changes something, including
sign-in and registration. Password recovery uses Django's reset-token generator.
Nothing here stores or compares a password itself.

Authorisation is by ownership: every pupil lookup is filtered by the signed-in parent,
so another parent's pupil is indistinguishable from one that does not exist (404).
"""

from __future__ import annotations

import json
from datetime import datetime

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException, Throttled, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import ACTIVE_SUBJECTS, Pupil, PupilEvent

User = get_user_model()


def _enforce_csrf(request) -> None:
    """Sign-in and registration change state before anyone is signed in, so check CSRF here too."""
    SessionAuthentication().enforce_csrf(request)


def _field(data, name: str, *, required: bool = True) -> str:
    value = data.get(name) if isinstance(data, dict) else None
    if value is None and not required:
        return ""
    if not isinstance(value, str) or (required and not value.strip()):
        raise ValidationError({name: "This field is required."})
    return value


def _email(data) -> str:
    email = _field(data, "email").strip().lower()
    try:
        validate_email(email)
    except DjangoValidationError:
        raise ValidationError({"email": "Enter a valid email address."})
    return email


def _account(user) -> dict:
    return {"authenticated": True, "email": user.email, "pupils": user.pupils.count()}


class FamilyView(APIView):
    """Common to every family endpoint: a cap on request size (checked before the body is read) and no caching."""

    authentication_classes = [SessionAuthentication]

    def initial(self, request, *args, **kwargs):
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = 0
        if length > settings.OPENPATH_MAX_REQUEST_BYTES:
            raise RequestTooLarge()
        super().initial(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store"
        return response


class RequestTooLarge(APIException):
    status_code = 413
    default_detail = "This request is too large."


class AccountBase(FamilyView):
    permission_classes = [IsAuthenticated]


class SensitiveAccountBase(AccountBase):
    """Checks the password again (change, delete): rate-limited, so a stolen session cannot guess it."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account-password"


class ThrottledPublic(FamilyView):
    """Endpoints used before signing in: CSRF-checked, rate-limited per endpoint, no authentication needed."""

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "account"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            _enforce_csrf(request)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AccountView(FamilyView):
    """Who is signed in (and a CSRF cookie for the requests that follow)."""

    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user
        if user is not None and user.is_authenticated:
            return Response(_account(user))
        return Response({"authenticated": False, "accounts": True})


class RegisterView(ThrottledPublic):
    throttle_scope = "account-register"

    def post(self, request):
        email = _email(request.data)
        password = _field(request.data, "password")
        if request.data.get("consent") is not True:
            raise ValidationError({"consent": "Agree to how your children's records are kept to create an account."})
        if User.objects.filter(username=email).exists():
            raise ValidationError({"email": "This email cannot be used to register. If you already have an account, sign in or reset your password."})
        candidate = User(username=email, email=email)
        try:
            validate_password(password, user=candidate)
        except DjangoValidationError as e:
            raise ValidationError({"password": list(e.messages)})
        try:
            with transaction.atomic():
                user = User.objects.create_user(username=email, email=email, password=password)
        except IntegrityError:  # registered at the same moment by another request
            raise ValidationError({"email": "This email cannot be used to register. If you already have an account, sign in or reset your password."})
        login(request._request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response(_account(user), status=status.HTTP_201_CREATED)


class LoginView(ThrottledPublic):
    throttle_scope = "account-login"

    def post(self, request):
        email = _field(request.data, "email").strip().lower()
        password = _field(request.data, "password")
        # failed sign-ins are also counted per email, whatever address they come from
        key = f"family:login-failures:{email}"
        if cache.get(key, 0) >= settings.OPENPATH_LOGIN_FAILURES_PER_EMAIL:
            raise Throttled(detail="Too many attempts for this email. Wait a while, or reset the password.")
        user = authenticate(request._request, username=email, password=password)
        if user is None:
            cache.set(key, cache.get(key, 0) + 1, settings.OPENPATH_LOGIN_FAILURE_WINDOW)
            raise ValidationError({"detail": "That email and password do not match an account."})
        cache.delete(key)
        login(request._request, user)
        return Response(_account(user))


class LogoutView(AccountBase):
    def post(self, request):
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PasswordResetView(ThrottledPublic):
    """Always answers the same way, so it cannot be used to find out who has an account."""

    throttle_scope = "account-reset"

    def post(self, request):
        email = _field(request.data, "email").strip().lower()
        user = User.objects.filter(username=email, is_active=True).first()
        if user is not None and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f"{settings.OPENPATH_PASSWORD_RESET_URL}?uid={uid}&token={token}"
            send_mail(
                "Reset your OpenPath password",
                f"Someone asked to reset the password for this OpenPath parent account.\n\n"
                f"To choose a new password, open this link (it works once, for a limited time):\n{link}\n\n"
                f"If it was not you, ignore this email: nothing changes.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
            )
        return Response({"detail": "If that email has an account, a reset link is on its way."}, status=status.HTTP_202_ACCEPTED)


class PasswordResetConfirmView(ThrottledPublic):
    throttle_scope = "account-reset"

    def post(self, request):
        try:
            pk = force_str(urlsafe_base64_decode(_field(request.data, "uid")))
            user = User.objects.get(pk=pk, is_active=True)
        except (ValueError, TypeError, OverflowError, User.DoesNotExist, DjangoValidationError):
            user = None
        token = _field(request.data, "token")
        if user is None or not default_token_generator.check_token(user, token):
            raise ValidationError({"detail": "This reset link is not valid any more. Ask for a new one."})
        password = _field(request.data, "password")
        try:
            validate_password(password, user=user)
        except DjangoValidationError as e:
            raise ValidationError({"password": list(e.messages)})
        user.set_password(password)  # also signs out every existing session (the session hash changes)
        user.save()
        return Response({"detail": "Password changed. Sign in with the new password."})


class DeleteAccountView(SensitiveAccountBase):
    """Deletes the parent, every pupil and every pupil's whole record. Needs the password again."""

    def post(self, request):
        if not request.user.check_password(_field(request.data, "password")):
            raise ValidationError({"password": "That password is not right."})
        user = request.user
        logout(request._request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(SensitiveAccountBase):
    def post(self, request):
        if not request.user.check_password(_field(request.data, "current_password")):
            raise ValidationError({"current_password": "That password is not right."})
        password = _field(request.data, "password")
        try:
            validate_password(password, user=request.user)
        except DjangoValidationError as e:
            raise ValidationError({"password": list(e.messages)})
        request.user.set_password(password)
        request.user.save()
        update_session_auth_hash(request._request, request.user)  # keep this session; sign out the others
        return Response({"detail": "Password changed."})


# ---------------------------------------------------------------- pupils


def _subject(value) -> str:
    subject = value if isinstance(value, str) and value else "english"
    if subject not in ACTIVE_SUBJECTS:
        raise ValidationError({"subject": f"Records can be kept for: {', '.join(sorted(ACTIVE_SUBJECTS))}."})
    return subject


def _pupil_json(p: Pupil, count: int | None = None, last_at=None) -> dict:
    return {
        "id": str(p.pk),
        "display_name": p.display_name,
        "created_at": p.created_at.isoformat(),
        "last_at": last_at.isoformat() if last_at else None,
        "events": count if count is not None else p.events.filter(subject="english").count(),
    }


def _display_name(data) -> str:
    name = _field(data, "display_name").strip()
    if len(name) > 40:
        raise ValidationError({"display_name": "Use at most 40 characters."})
    return name


def _owned(request, pupil_id) -> Pupil:
    return get_object_or_404(Pupil, pk=pupil_id, parent=request.user)


def _occurred_at(event) -> datetime:
    at = event.get("at")
    try:
        return datetime.fromisoformat(at.replace("Z", "+00:00"))
    except (AttributeError, ValueError):
        raise ValidationError({"event": "An event needs its time (at) in ISO 8601."})


def _check_event(event) -> dict:
    if not isinstance(event, dict):
        raise ValidationError({"event": "An event must be an object."})
    kind = event.get("kind")
    if not isinstance(kind, str) or not kind or len(kind) > 32:
        raise ValidationError({"event": "An event needs a kind."})
    if not isinstance(event.get("id"), str) or not event["id"]:
        raise ValidationError({"event": "An event needs an id."})
    if len(json.dumps(event)) > settings.OPENPATH_MAX_EVENT_BYTES:
        raise ValidationError({"event": "This event is too large."})
    return event


class PupilsView(AccountBase):
    def get(self, request):
        rows = (
            Pupil.objects.filter(parent=request.user)
            .annotate(n=Count("events", filter=Q(events__subject="english")), last=Max("events__occurred_at"))
            .order_by("created_at", "id")
        )
        return Response({"pupils": [_pupil_json(p, p.n, p.last) for p in rows]})

    def post(self, request):
        name = _display_name(request.data)
        if request.data.get("consent") is not True:
            raise ValidationError({"consent": "Agree to how this child's record is kept to add them."})
        if Pupil.objects.filter(parent=request.user).count() >= settings.OPENPATH_MAX_PUPILS_PER_PARENT:
            raise ValidationError({"detail": f"An account can have at most {settings.OPENPATH_MAX_PUPILS_PER_PARENT} pupils."})
        pupil = Pupil.objects.create(parent=request.user, display_name=name, consent_policy=settings.OPENPATH_CONSENT_POLICY_VERSION)
        return Response(_pupil_json(pupil, 0, None), status=status.HTTP_201_CREATED)


class PupilView(AccountBase):
    def get(self, request, pupil_id):
        return Response(_pupil_json(_owned(request, pupil_id)))

    def patch(self, request, pupil_id):
        pupil = _owned(request, pupil_id)
        pupil.display_name = _display_name(request.data)
        Pupil.objects.filter(pk=pupil.pk).update(display_name=pupil.display_name)
        return Response(_pupil_json(pupil))

    def delete(self, request, pupil_id):
        _owned(request, pupil_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PupilEventsView(AccountBase):
    """A pupil's ledger for one subject: read it in order, append one event, or fill an empty one (an import)."""

    def get(self, request, pupil_id):
        pupil = _owned(request, pupil_id)
        subject = _subject(request.query_params.get("subject"))
        bodies = list(PupilEvent.objects.filter(pupil=pupil, subject=subject).order_by("seq").values_list("body", flat=True))
        return Response({"subject": subject, "count": len(bodies), "events": bodies})

    def post(self, request, pupil_id):
        subject = _subject(request.data.get("subject"))
        seq = request.data.get("seq")
        if not isinstance(seq, int) or isinstance(seq, bool) or seq < 0:
            raise ValidationError({"seq": "Give the event's position in the record."})
        event = _check_event(request.data.get("event"))
        with transaction.atomic():
            # one writer at a time per pupil, so two devices cannot interleave events
            pupil = get_object_or_404(Pupil.objects.select_for_update(), pk=pupil_id, parent=request.user)
            count = PupilEvent.objects.filter(pupil=pupil, subject=subject).count()
            if seq != count:
                return Response(
                    {"detail": "The record has changed since it was loaded (another device?). Reload and try again.", "count": count},
                    status=status.HTTP_409_CONFLICT,
                )
            if count >= settings.OPENPATH_MAX_EVENTS_PER_PUPIL:
                raise ValidationError({"detail": "This record is full."})
            PupilEvent.objects.create(pupil=pupil, subject=subject, seq=seq, kind=event["kind"], occurred_at=_occurred_at(event), body=event)
        return Response({"count": count + 1}, status=status.HTTP_201_CREATED)

    def put(self, request, pupil_id):
        """Import a whole record (a backup from a device) into an empty one. History is never overwritten."""
        subject = _subject(request.data.get("subject"))
        events = request.data.get("events")
        if not isinstance(events, list) or not events:
            raise ValidationError({"events": "Give the events to import, in order."})
        if len(events) > settings.OPENPATH_MAX_EVENTS_PER_PUPIL:
            raise ValidationError({"events": "Too many events."})
        checked = [(_check_event(e), _occurred_at(e)) for e in events]
        with transaction.atomic():
            pupil = get_object_or_404(Pupil.objects.select_for_update(), pk=pupil_id, parent=request.user)
            if PupilEvent.objects.filter(pupil=pupil, subject=subject).exists():
                return Response({"detail": "This pupil already has a record. Import into a new pupil instead."}, status=status.HTTP_409_CONFLICT)
            PupilEvent.objects.bulk_create(
                PupilEvent(pupil=pupil, subject=subject, seq=i, kind=e["kind"], occurred_at=at, body=e) for i, (e, at) in enumerate(checked)
            )
        return Response({"count": len(checked)}, status=status.HTTP_201_CREATED)


class PupilExportView(AccountBase):
    def get(self, request, pupil_id):
        pupil = _owned(request, pupil_id)
        subjects = {}
        for subject in sorted(ACTIVE_SUBJECTS):
            subjects[subject] = list(PupilEvent.objects.filter(pupil=pupil, subject=subject).order_by("seq").values_list("body", flat=True))
        response = Response({"pupil": _pupil_json(pupil), "consent_policy": pupil.consent_policy, "subjects": subjects})
        response["Content-Disposition"] = f'attachment; filename="openpath-pupil-{pupil.pk}.json"'
        return response
