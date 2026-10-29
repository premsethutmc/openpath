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
    "family.observability.MetricsMiddleware",
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
    "DEFAULT_THROTTLE_RATES": {
        "enrol": "60/hour",
        "account": os.environ.get("OPENPATH_ACCOUNT_RATE", "30/hour"),
        "account-register": os.environ.get("OPENPATH_ACCOUNT_RATE", "20/hour"),
        "account-login": os.environ.get("OPENPATH_ACCOUNT_RATE", "60/hour"),
        "account-reset": os.environ.get("OPENPATH_ACCOUNT_RATE", "10/hour"),
        "account-password": os.environ.get("OPENPATH_ACCOUNT_RATE", "20/hour"),
        "developer-claim": "10/hour",
        "telemetry": "240/hour",
        "pupil-events": os.environ.get("OPENPATH_EVENT_RATE", "600/hour"),
    },
    # Rate limits are keyed on the client address. Behind N trusted proxies, set OPENPATH_NUM_PROXIES=N so the
    # address is read from the right place in X-Forwarded-For; 0 ignores that (client-controlled) header entirely.
    "NUM_PROXIES": int(os.environ.get("OPENPATH_NUM_PROXIES", "0")),
    "UNAUTHENTICATED_USER": None,
}

OPENPATH_CURRICULUM = REPO_DIR / "shared" / "curriculum" / "math-early-number.json"
OPENPATH_TRUST_CLIENT_CLOCK = os.environ.get("OPENPATH_TRUST_CLIENT_CLOCK", "1" if DEBUG else "0") == "1"
OPENPATH_CONSENT_POLICY_VERSION = "2026-10-prototype"
# E3a free-form evaluation gateway. Only "disabled" (default), "mock" and "replay" exist; there is no live
# provider adapter, and configuring one fails at start-up (decision of 12 October; E3b needs approval).
OPENPATH_EVALUATION_ADAPTER = os.environ.get("OPENPATH_EVALUATION_ADAPTER", "disabled")
OPENPATH_EVALUATION_REPLAY_FILE = os.environ.get("OPENPATH_EVALUATION_REPLAY_FILE") or None

# Essay Intelligence v2: the essay evaluator behind the server (evaluation/essay.py). Off by default.
#   disabled   refuses every request (the default); the essay studio uses its recorded samples and pattern stand-in
#   replay     recorded outputs by text fingerprint (OPENPATH_ESSAY_REPLAY_FILE): repeatable tests, no provider
#   llm        a configured LLM provider (evaluation/llm.py); the key is read from the environment only
# Only developer accounts may call it, and only for synthetic test essays: real learners' essays are refused until
# consent, retention and deletion policies are approved (that switch is not configurable here).
OPENPATH_ESSAY_EVALUATOR = os.environ.get("OPENPATH_ESSAY_EVALUATOR", "disabled")
OPENPATH_ESSAY_REPLAY_FILE = os.environ.get("OPENPATH_ESSAY_REPLAY_FILE") or None
OPENPATH_ESSAY_EVALUATOR_VERSION = os.environ.get("OPENPATH_ESSAY_EVALUATOR_VERSION", "essay-llm@1")
OPENPATH_LLM_PROVIDER = os.environ.get("OPENPATH_LLM_PROVIDER", "anthropic")
OPENPATH_LLM_MODEL = os.environ.get("OPENPATH_LLM_MODEL", "")
OPENPATH_LLM_BASE_URL = os.environ.get("OPENPATH_LLM_BASE_URL", "")
OPENPATH_LLM_API_KEY = os.environ.get("OPENPATH_LLM_API_KEY", "")
OPENPATH_LLM_MAX_OUTPUT_TOKENS = int(os.environ.get("OPENPATH_LLM_MAX_OUTPUT_TOKENS", "4000"))
OPENPATH_LLM_TIMEOUT_S = float(os.environ.get("OPENPATH_LLM_TIMEOUT_S", "60"))
OPENPATH_LLM_RETRIES = int(os.environ.get("OPENPATH_LLM_RETRIES", "1"))
# bounded cost: requests and tokens per day across all developers; over either limit, requests are refused
OPENPATH_ESSAY_DAILY_REQUESTS = int(os.environ.get("OPENPATH_ESSAY_DAILY_REQUESTS", "50"))
OPENPATH_ESSAY_DAILY_TOKENS = int(os.environ.get("OPENPATH_ESSAY_DAILY_TOKENS", "300000"))
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
# Behind a proxy that terminates HTTPS and sets X-Forwarded-Proto (set only when that proxy is trusted).
if os.environ.get("OPENPATH_BEHIND_HTTPS_PROXY") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
DEFAULT_FROM_EMAIL = os.environ.get("DJANGO_DEFAULT_FROM_EMAIL", "OpenPath <no-reply@localhost>")
if os.environ.get("DJANGO_EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ["DJANGO_EMAIL_HOST"]
    EMAIL_PORT = int(os.environ.get("DJANGO_EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("DJANGO_EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("DJANGO_EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = True
    if not DEBUG and "OPENPATH_PASSWORD_RESET_URL" not in os.environ:
        raise RuntimeError("Set OPENPATH_PASSWORD_RESET_URL so reset emails link to the real app.")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
OPENPATH_MAX_PUPILS_PER_PARENT = 12
OPENPATH_MAX_EVENTS_PER_PUPIL = 100_000
OPENPATH_MAX_EVENT_BYTES = 32_000
OPENPATH_MAX_BOOK_EVENT_BYTES = 140_000  # one My Books text (at most 30,000 characters), saved as a single "book" event
OPENPATH_MAX_REQUEST_BYTES = 20_000_000  # an import of a large device record; refused before the body is read
OPENPATH_LOGIN_FAILURES_PER_EMAIL = 10
OPENPATH_LOGIN_FAILURE_WINDOW = 15 * 60


# ---------------------------------------------------------------- diagnostics and observability
def _commit() -> str:
    if os.environ.get("OPENPATH_COMMIT"):
        return os.environ["OPENPATH_COMMIT"][:40]
    try:
        import subprocess

        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=REPO_DIR, capture_output=True, text=True, timeout=2)
        return out.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


OPENPATH_COMMIT = _commit()
OPENPATH_CLAIM_TTL_HOURS = 24
