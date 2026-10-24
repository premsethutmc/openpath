"""Private feature preview only. Never selects DATABASE_URL or enables external evaluators."""
import os
from pathlib import Path
from .settings import *  # noqa: F403
from .settings import _database

DEBUG = False
ROOT_URLCONF = 'config.preview_urls'
_preview_url = os.environ.get('PREVIEW_DATABASE_URL')
if _preview_url:
    DATABASES = {'default': _database(_preview_url)}
else:
    _data = Path(os.environ.get('OPENPATH_PREVIEW_DATA_DIR', '/app/preview-data'))
    _data.mkdir(parents=True, exist_ok=True)
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': _data / 'synthetic.sqlite3'}}
OPENPATH_ESSAY_EVALUATOR = 'disabled'
OPENPATH_EVALUATION_ADAPTER = 'disabled'
OPENPATH_LLM_API_KEY = ''
OPENPATH_TRUST_CLIENT_CLOCK = False
# No real mail or console password-reset links in the preview.
EMAIL_BACKEND = 'django.core.mail.backends.dummy.EmailBackend'
