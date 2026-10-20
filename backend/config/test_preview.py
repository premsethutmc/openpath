"""Preview-only readiness/safety checks; production URLs and learning policy remain unchanged."""
import json
import os
import subprocess
import sys
import tempfile
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.conf import settings

class PreviewReadinessTests(TestCase):
    @override_settings(ROOT_URLCONF='config.preview_urls')
    def test_readiness_is_public_safe_and_does_not_bypass_account_auth(self):
        self.assertEqual(self.client.get('/healthz/').status_code,200)
        self.assertEqual(self.client.post('/healthz/').status_code,405)
        self.assertFalse(self.client.get('/api/account/').json()['authenticated'])

    @override_settings(ROOT_URLCONF='config.preview_urls')
    def test_database_failure_is_unhealthy_without_error_details(self):
        with patch('config.preview_urls.connection.cursor', side_effect=RuntimeError('private connection detail')):
            r=self.client.get('/healthz/')
        self.assertEqual(r.status_code,503)
        self.assertEqual(r.content,b'unavailable')

    def test_preview_cannot_select_the_ordinary_database_or_paid_evaluator(self):
        with tempfile.TemporaryDirectory(prefix='openpath-preview-settings-') as directory:
            env={**os.environ,'DJANGO_SETTINGS_MODULE':'config.preview','DJANGO_SECRET_KEY':'synthetic-settings-test-secret-only',
                 'DATABASE_URL':'postgres://synthetic:must-not-use@unreachable.invalid/production',
                 'OPENPATH_PREVIEW_DATA_DIR':directory,'OPENPATH_ESSAY_EVALUATOR':'llm',
                 'OPENPATH_EVALUATION_ADAPTER':'mock','OPENPATH_LLM_API_KEY':'synthetic-must-ignore'}
            env.pop('PREVIEW_DATABASE_URL',None)
            script="import json;from django.conf import settings as s;print(json.dumps([s.DATABASES['default']['ENGINE'],str(s.DATABASES['default']['NAME']),s.OPENPATH_ESSAY_EVALUATOR,s.OPENPATH_EVALUATION_ADAPTER,s.OPENPATH_LLM_API_KEY,s.EMAIL_BACKEND]))"
            p=subprocess.run([sys.executable,'-c',script],env=env,cwd=settings.BASE_DIR,capture_output=True,text=True,check=True)
            result=json.loads(p.stdout)
            self.assertEqual(result,['django.db.backends.sqlite3',directory+'/synthetic.sqlite3','disabled','disabled','','django.core.mail.backends.dummy.EmailBackend'])
