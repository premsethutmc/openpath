"""family-pilot@1: the pilot settings refuse anything but their own PostgreSQL database, and reach it only encrypted."""
import os
import subprocess
import sys
from pathlib import Path
from unittest import TestCase

BACKEND = Path(__file__).resolve().parent.parent
PROBE = (
    'import config.pilot as s, json;'
    'd = s.DATABASES["default"];'
    'print(json.dumps([d["ENGINE"], d["HOST"], d["NAME"], d["OPTIONS"], s.ROOT_URLCONF, s.DEBUG, s.OPENPATH_TRUST_CLIENT_CLOCK, s.OPENPATH_LLM_API_KEY, s.EMAIL_BACKEND]))'
)


def probe(**env):
    base = {k: v for k, v in os.environ.items() if not k.startswith(('DJANGO_', 'DATABASE_', 'OPENPATH_'))}
    return subprocess.run([sys.executable, '-c', PROBE], cwd=BACKEND, env={**base, **env}, capture_output=True, text=True)


class PilotSettingsTests(TestCase):
    def test_refuses_to_start_without_a_database(self):
        r = probe(DJANGO_DEBUG='0', DJANGO_SECRET_KEY='x' * 50)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('real records', r.stderr)

    def test_refuses_debug(self):
        r = probe(DJANGO_DEBUG='1', DATABASE_URL='postgresql://u:p@db.example.org/openpath')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('DJANGO_DEBUG=0', r.stderr)

    def test_uses_its_postgresql_database_encrypted_with_model_services_off(self):
        r = probe(DJANGO_DEBUG='0', DJANGO_SECRET_KEY='x' * 50, DATABASE_URL='postgresql://u:p%40ss@db.example.org:5432/openpath?sslmode=disable', OPENPATH_LLM_API_KEY='secret', OPENPATH_TRUST_CLIENT_CLOCK='1')
        self.assertEqual(r.returncode, 0, r.stderr)
        import json
        engine, host, name, options, urlconf, debug, trust_clock, llm_key, email = json.loads(r.stdout)
        self.assertEqual([engine, host, name], ['django.db.backends.postgresql', 'db.example.org', 'openpath'])
        self.assertEqual(options, {'sslmode': 'require'}, 'encryption is required whatever the address says')
        self.assertEqual([urlconf, debug, trust_clock, llm_key], ['config.preview_urls', False, False, ''])
        self.assertIn('dummy', email)
