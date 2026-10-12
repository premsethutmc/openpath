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
    "rest_framework",
    "learners",
    "evidence",
    "evaluation",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
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
    "DEFAULT_THROTTLE_RATES": {"enrol": "60/hour"},
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
