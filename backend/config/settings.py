"""Django settings for the OpenPath API.

Configuration comes from environment variables so the same code runs locally,
in tests and in a deployment:

    DATABASE_URL            postgres://user:pass@host:5432/dbname
                            (unset: a local SQLite file, for zero-setup review)
    DJANGO_SECRET_KEY       required when DJANGO_DEBUG is off
    DJANGO_DEBUG            "1" (default) or "0"
    DJANGO_ALLOWED_HOSTS    comma-separated, used when DJANGO_DEBUG is off
    OPENPATH_TRUST_CLIENT_CLOCK
                            "1" lets a client date its own sessions. Defaults
                            to DJANGO_DEBUG; reviewers use it to simulate
                            days passing. Keep it off in production.

Parent accounts (the family app):

    OPENPATH_SECURE_COOKIES "1" sends the session and CSRF cookies over HTTPS
                            only. Defaults to on when DJANGO_DEBUG is off.
                            Turn it off only for a local test over plain http.
    DJANGO_CSRF_TRUSTED_ORIGINS
                            comma-separated origins (https://app.example.org)
                            when the app is served from another origin than
                            the API.
    OPENPATH_PASSWORD_RESET_URL
                            the app's address for the link in a reset email.
    DJANGO_EMAIL_HOST, DJANGO_EMAIL_PORT, DJANGO_EMAIL_HOST_USER,
    DJANGO_EMAIL_HOST_PASSWORD, DJANGO_DEFAULT_FROM_EMAIL
                            SMTP for reset emails. Without DJANGO_EMAIL_HOST,
                            emails are printed to the server log (development).
"""

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-not-a-secret" if DEBUG else "")
if not SECRET_KEY:
    raise RuntimeError("Set DJANGO_SECRET_KEY when DJANGO_DEBUG is off.")
ALLOWED_HOSTS = (
    ["localhost", "127.0.0.1", "[::1]", "testserver"]
    if DEBUG
    else [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",") if h]
)

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "learners",
    "evidence",
    "evaluation",
    "family",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "UTC"


def _database(url: str | None) -> dict:
    if not url:
        return {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
    parts = urlparse(url)
    if parts.scheme not in ("postgres", "postgresql"):
        raise RuntimeError("DATABASE_URL must be a postgres:// URL.")
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parts.path.lstrip("/")),
        "USER": unquote(parts.username or ""),
        "PASSWORD": unquote(parts.password or ""),
        "HOST": parts.hostname or "",
        "PORT": str(parts.port or ""),
    }


DATABASES = {"default": _database(os.environ.get("DATABASE_URL"))}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["learners.auth.LearnerTokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["learners.auth.IsThisLearner"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_THROTTLE_RATES": {"enrol": "60/hour", "account": os.environ.get("OPENPATH_ACCOUNT_RATE", "30/hour")},
    "UNAUTHENTICATED_USER": None,
}

OPENPATH_CURRICULUM = REPO_DIR / "shared" / "curriculum" / "math-early-number.json"
OPENPATH_TRUST_CLIENT_CLOCK = os.environ.get("OPENPATH_TRUST_CLIENT_CLOCK", "1" if DEBUG else "0") == "1"
OPENPATH_CONSENT_POLICY_VERSION = "2026-10-prototype"
# E3a free-form evaluation gateway. Only "disabled" (default), "mock" and "replay" exist; there is no live
# provider adapter, and configuring one fails at start-up (decision of 12 October; E3b needs approval).
OPENPATH_EVALUATION_ADAPTER = os.environ.get("OPENPATH_EVALUATION_ADAPTER", "disabled")
OPENPATH_EVALUATION_REPLAY_FILE = os.environ.get("OPENPATH_EVALUATION_REPLAY_FILE") or None
OPENPATH_MAX_EVENTS_PER_SESSION = 5000

# ---------------------------------------------------------------- parent accounts (family app)
# Passwords: Django's own hashing (PBKDF2 by default) and validators. Sessions: an
# HttpOnly cookie; CSRF: Django's middleware, enforced on every change, including sign-in.
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
_SECURE_COOKIES = os.environ.get("OPENPATH_SECURE_COOKIES", "0" if DEBUG else "1") == "1"
SESSION_COOKIE_SECURE = _SECURE_COOKIES
CSRF_COOKIE_SECURE = _SECURE_COOKIES
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 14 * 24 * 3600
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o]
PASSWORD_RESET_TIMEOUT = 2 * 3600
OPENPATH_PASSWORD_RESET_URL = os.environ.get("OPENPATH_PASSWORD_RESET_URL", "http://localhost:4174/#reset")
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_DEFAULT_FROM_EMAIL", "OpenPath <no-reply@localhost>")
if os.environ.get("DJANGO_EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ["DJANGO_EMAIL_HOST"]
    EMAIL_PORT = int(os.environ.get("DJANGO_EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("DJANGO_EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("DJANGO_EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = True
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
OPENPATH_MAX_PUPILS_PER_PARENT = 12
OPENPATH_MAX_EVENTS_PER_PUPIL = 200_000
OPENPATH_MAX_EVENT_BYTES = 32_000
