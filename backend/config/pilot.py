"""family-pilot@1: the hosted server for a real learner's own record (docs/product/FAMILY_PILOT.md).

Unlike the preview (config.preview, synthetic data only), this keeps a real record, so it refuses to start on anything but
its own PostgreSQL database: a record must never land in a file that the next deploy throws away. Model services stay off.
"""
from django.core.exceptions import ImproperlyConfigured

from .settings import *  # noqa: F403
from .settings import DATABASES, DEBUG

if DEBUG:
    raise ImproperlyConfigured('The pilot runs with DJANGO_DEBUG=0.')
if DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
    raise ImproperlyConfigured('The pilot keeps real records: set DATABASE_URL to its PostgreSQL database.')
# the database is reached over the internet: never without encryption (the query part of DATABASE_URL is not read)
DATABASES['default']['OPTIONS'] = {'sslmode': 'require'}
# a hosted database may sleep when idle; a connection is opened for each request and checked before use
DATABASES['default']['CONN_MAX_AGE'] = 0

# readiness at /healthz/ (reveals no account information)
ROOT_URLCONF = 'config.preview_urls'
OPENPATH_ESSAY_EVALUATOR = 'disabled'
OPENPATH_EVALUATION_ADAPTER = 'disabled'
OPENPATH_LLM_API_KEY = ''
# the time of a record is the server's
OPENPATH_TRUST_CLIENT_CLOCK = False
# no mail service is configured: a password-reset link is not sent anywhere (and never printed to the log)
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
