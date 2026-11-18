"""Manual isolated CI only. No raw subprocess output, key persistence or deployment.

This wrapper deliberately publishes aggregate results only; raw model feedback is
not published in this public repository. It is a smoke/acceptance run, not a full
qualitative feedback audit. Do not run locally with a real key.
"""
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

SHA = '256d54f5d28cd546d0790d7001ed4ec3a307bd37'


def validate(env):
    required = {'GITHUB_ACTIONS': 'true', 'GITHUB_REPOSITORY': 'premsethutmc/openpath',
                'GITHUB_REF': 'refs/heads/main', 'GITHUB_ACTOR': 'premsethutmc',
                'GITHUB_RUN_ATTEMPT': '1'}
    if any(env.get(k) != v for k, v in required.items()):
        raise ValueError('Not an approved first-attempt owner workflow.')
    model = env.get('TEST_MODEL', '')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{1,99}', model):
        raise ValueError('Invalid model identifier.')
    prices = [float(env.get(k, '')) for k in ('TEST_INPUT_PRICE', 'TEST_OUTPUT_PRICE')]
    if any(not math.isfinite(p) or p <= 0 or p > 1000 for p in prices):
        raise ValueError('Prices must be positive, finite and at most 1000 USD/million.')
    if not env.get('OPENPATH_LLM_API_KEY', '').strip():
        raise ValueError('The protected environment secret is missing.')
    return model, prices


def command(args, cwd, env):
    # Never print stdout/stderr: failures may contain secrets or provider text.
    result = subprocess.run(args, cwd=cwd, env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, timeout=600)
    if result.returncode:
        raise RuntimeError('An isolated subprocess failed; raw output withheld.')
    return result.stdout


def main():
    model, prices = validate(os.environ)
    root = Path(sys.argv[1]).resolve()
    safe_env = {k: os.environ[k] for k in ('PATH', 'HOME', 'LANG') if k in os.environ}
    if command(['git', 'rev-parse', 'HEAD'], root, safe_env).decode().strip() != SHA:
        raise ValueError('Evaluator source is not the reviewed immutable commit.')
    # Explicit allowlist, never inherit DATABASE_URL, deployment or other provider credentials.
    env = dict(safe_env)
    env.update(DJANGO_SETTINGS_MODULE='config.settings', DJANGO_DEBUG='1',
               OPENPATH_ESSAY_EVALUATOR='disabled', OPENPATH_AI_SHARED_CONFIG='off',
               OPENPATH_WORD_PROBLEMS='off', OPENPATH_LLM_PROVIDER='openai_compatible',
               OPENPATH_LLM_BASE_URL='https://api.openai.com/v1', OPENPATH_LLM_MODEL=model,
               OPENPATH_LLM_MAX_OUTPUT_TOKENS='1200', OPENPATH_LLM_RETRIES='0',
               OPENPATH_LLM_TIMEOUT_S='30', OPENPATH_AI_DAILY_REQUESTS='16',
               OPENPATH_AI_USER_DAILY_REQUESTS='16', OPENPATH_ESSAY_DAILY_REQUESTS='16')
    db = root / 'backend/db.sqlite3'
    if db.exists():
        raise ValueError('Refusing any existing database.')
    py = sys.executable
    manage = [py, 'backend/manage.py']
    cli = ['node', '--import', './frontend/node_modules/tsx/dist/loader.mjs',
           'frontend/scripts/workspace-writing-acceptance.mts']
    with tempfile.TemporaryDirectory(prefix='english-synthetic-') as temp:
        temp = Path(temp)
        try:
            command(manage + ['migrate', '--noinput'], root, env)
            # Authorized only by the explicit dispatch approval; isolated empty SQLite,
            # no access to any existing/production account or database.
            setup = "from django.contrib.auth import get_user_model; from family.models import DeveloperAccess; u=get_user_model().objects.create_user(username='isolated-synthetic'); u.set_unusable_password(); u.save(); DeveloperAccess.objects.create(user=u,granted_via='isolated-ci'); print(u.pk)"
            uid = command(manage + ['shell', '-c', setup], root, env).decode().strip().splitlines()[-1]
            if not uid.isdigit():
                raise RuntimeError('Temporary identity creation failed.')
            requests, report = temp / 'requests.json', temp / 'report.json'
            requests.write_bytes(command(cli, root, env))
            # Key is passed only to the bounded benchmark child, never node/dependency install.
            live_env = dict(env, OPENPATH_ESSAY_EVALUATOR='llm',
                            OPENPATH_LLM_API_KEY=os.environ['OPENPATH_LLM_API_KEY'])
            command(manage + ['workspace_writing_benchmark', '--requests', str(requests),
                    '--out', str(report), '--live', '--approved-by',
                    'owner-manual-dispatch:' + os.environ.get('GITHUB_RUN_ID', ''),
                    '--user-id', uid, '--max-calls', '16', '--max-cost-usd', '0.25',
                    '--price-input', str(prices[0]), '--price-output', str(prices[1])], root, live_env)
            del live_env
            score = json.loads(command(cli + ['--recorded', str(report)], root, env))
            raw = json.loads(report.read_text())
            # Do not render model text, arbitrary scorer fields, environment or prices.
            result = {'source': SHA, 'releaseReady': False,
                      'endpoint_results': len(raw.get('results', [])),
                      'http_200_results': sum(r.get('status') == 200 for r in raw.get('results', [])),
                      'scorer_completed': isinstance(score, dict)}
            summary = '\nIsolated synthetic run completed. Not accuracy or learning validation.\n\n```json\n' + json.dumps(result, indent=2) + '\n```\n'
            Path(os.environ['GITHUB_STEP_SUMMARY']).open('a').write(summary)
        finally:
            for p in (db, Path(str(db) + '-wal'), Path(str(db) + '-shm'), Path(str(db) + '-journal')):
                p.unlink(missing_ok=True)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('Isolated run stopped. Raw diagnostics withheld. Check provider usage before any new run.', file=sys.stderr)
        sys.exit(1)
