"""Exercise the actual authenticated synthetic essay endpoint, never a parallel model path.

Default is a no-network plan. Live use requires an existing developer, configured LLM,
explicit approval and cost/request limits. Never enables an evaluator or creates a user.
"""
import hashlib
import json
import math
import os
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory, force_authenticate
from evaluation import essay
from evaluation.models import EssayEvaluationRecord
from evaluation.usage import usage_summary, standard_rate_estimate
from family.developer import is_developer


class Command(BaseCommand):
    help = __doc__

    def add_arguments(self, parser):
        parser.add_argument('--requests', required=True)
        parser.add_argument('--out', required=True)
        parser.add_argument('--live', action='store_true')
        parser.add_argument('--approved-by', default='')
        parser.add_argument('--user-id', type=int)
        parser.add_argument('--max-calls', type=int, default=20)
        parser.add_argument('--max-cost-usd', type=float)
        parser.add_argument('--price-input', type=float)
        parser.add_argument('--price-output', type=float)

    def handle(self, *args, **o):
        try:
            data = json.loads(Path(o['requests']).read_text())
            rows = data['requests']
            policy_files = ['backend/evaluation/argument.py','backend/evaluation/foundation.py','backend/evaluation/essay.py','backend/evaluation/gateway.py','content/english/prompts/essay-observe.v2.md']
            policy_digest = hashlib.sha256('\n'.join((Path(settings.REPO_DIR) / p).read_text() for p in policy_files).encode()).hexdigest()
            reference_digest = hashlib.sha256((Path(settings.REPO_DIR) / 'content/english/essay/benchmark/workspace-writing-acceptance-v1.json').read_bytes()).hexdigest()
            if data['server_policy_digest'] != policy_digest or data['reference_digest'] != reference_digest:
                raise ValueError('stale policy/reference')
            # The manifest hash is provenance, not proof that its contents are safe.
            canonical = json.dumps(rows, ensure_ascii=False, separators=(',', ':'))
            digest = hashlib.sha256(canonical.encode()).hexdigest()
            if data['suite'] != 'workspace-writing-acceptance@1' or data['data_use'] != 'synthetic_test' or data['request_digest'] != digest:
                raise ValueError('manifest identity')
            if not isinstance(rows, list) or not 1 <= len(rows) <= 100 or len({r['id'] for r in rows}) != len(rows):
                raise ValueError('case count or identity')
            for row in rows:
                body = row['body']
                if body['task'] != 'observe' or body['data_use'] != 'synthetic_test' or row['id'] != body['request']['essay']['id']:
                    raise ValueError('case contract')
                req, _ = essay.validate_essay_request('observe', body['request'])
                if req['rubric'] not in essay.foundation.RUBRICS and req['rubric'] != essay.argument.RUBRIC:
                    raise ValueError('workspace rubric required')
        except Exception:
            # Do not echo submitted text, provider configuration or credentials.
            raise CommandError('Invalid workspace acceptance manifest; regenerate it with the repository tool.') from None
        if not 1 <= o['max_calls'] <= 100:
            raise CommandError('--max-calls must be between 1 and 100')
        out = Path(o['out'])
        if out.exists():
            raise CommandError('Output already exists; use a new path to preserve earlier evidence.')
        report = {'suite': data['suite'], 'request_digest': digest, 'server_policy_digest': policy_digest, 'reference_digest': reference_digest, 'mode': 'live' if o['live'] else 'dry-run',
                  'results': [], 'requested_cases': len(rows), 'max_calls': o['max_calls'],
                  'limit': 'Synthetic acceptance only. Passing contracts is not linguistic or pedagogical validation.'}
        def reserve_output():
            try:
                # Fail before spending, and leave a durable marker if interrupted mid-call.
                with out.open('x') as handle:
                    os.chmod(out, 0o600)
                    json.dump(report, handle, indent=2)
            except OSError:
                raise CommandError('Cannot reserve the output file. No provider call was started.') from None

        def checkpoint():
            temporary = out.with_name(out.name + '.pending')
            try:
                with temporary.open('w') as handle:
                    os.chmod(temporary, 0o600)
                    json.dump(report, handle, indent=2, ensure_ascii=False)
                    handle.flush(); os.fsync(handle.fileno())
                temporary.replace(out)
            except OSError:
                raise CommandError('Could not save the benchmark checkpoint. Stop and inspect the existing report before retrying any call.') from None

        if not o['live']:
            report['note'] = 'No provider called. Live mode requires explicit approval, a configured evaluator, existing developer account and cost limits.'
            reserve_output()
            self.stdout.write('Dry-run manifest validated. No provider called.')
            return
        prices = (o['price_input'], o['price_output'], o['max_cost_usd'])
        if not o['approved_by'].strip() or not o['user_id'] or any(p is None or not math.isfinite(p) or p <= 0 for p in prices):
            raise CommandError('Live mode requires --approved-by, --user-id and positive finite --price-input, --price-output, --max-cost-usd.')
        user = get_user_model().objects.filter(pk=o['user_id'], is_active=True).first()
        if not user or not is_developer(user):
            raise CommandError('An existing active developer account is required. No permission was changed.')
        adapter, _, why = essay._adapter()
        if adapter != 'llm' or why:
            raise CommandError('A working LLM evaluator must already be configured; this command never enables it.')
        config = essay._config()
        report['approved_by'] = o['approved_by']
        report['model'] = config.model
        report['max_cost_usd'] = o['max_cost_usd']
        report['reserved_cost_bound_usd'] = 0
        report['usage_accounting_version'] = 2
        report['standard_rate_estimate_usd'] = 0
        report['standard_rate_estimate_known_usage_usd'] = 0
        report['calls_with_unknown_usage'] = 0
        report['cost_interpretation'] = 'Provider-reported token counts at supplied standard rates, not an invoice. No cache discounts, cache-write premiums, taxes or other billing adjustments. Reasoning is already in output tokens. Unknown usage is not free; failed calls keep their reservation.'
        report['standard_prices_usd_per_million'] = {'input': o['price_input'], 'output': o['price_output']}
        report['configuration'] = {'provider': config.provider, 'model': config.model, 'max_output_tokens': config.max_output_tokens, 'retries': config.retries, 'compact_observe': essay.foundation.compact_observation_enabled()}
        reserve_output()
        factory = APIRequestFactory()
        for row in rows[:o['max_calls']]:
            req, _ = essay.validate_essay_request('observe', row['body']['request'])
            system = essay.argument.PROMPT if req['rubric'] == essay.argument.RUBRIC else essay.foundation.prompt(essay._prompt(req['protocol']))
            compact = req['rubric'] in essay.foundation.RUBRICS and essay.foundation.compact_observation_enabled()
            if compact:
                system = essay.foundation.observation_prompt(system)
            effective_req = essay.foundation.observation_payload(req) if compact else req
            effective_user = json.dumps(effective_req, ensure_ascii=False, **({'separators': (',', ':')} if compact else {}))
            # UTF-8 byte count + an envelope allowance is conservative for supported byte-based tokenizers.
            # Failed calls keep their full reservation; provider billing is not inferred from absent usage.
            input_bound = len(system.encode()) + len(json.dumps(req, ensure_ascii=False).encode()) + 4096
            bound = (input_bound * o['price_input'] + config.max_output_tokens * o['price_output']) / 1e6
            if report['reserved_cost_bound_usd'] + bound > o['max_cost_usd']:
                report['stopped'] = 'Cost reservation limit reached before the next request.'
                break
            report['reserved_cost_bound_usd'] += bound
            report['pending_case'] = row['id']
            report.setdefault('prompt_digests', {})[row['id']] = hashlib.sha256(system.encode()).hexdigest()
            report.setdefault('effective_request_digests', {})[row['id']] = hashlib.sha256(effective_user.encode()).hexdigest()
            checkpoint()
            request = factory.post('/api/evaluation/essays/', row['body'], format='json')
            force_authenticate(request, user=user)
            response = essay.EssayEvaluationView.as_view()(request)
            result = {'id': row['id'], 'status': response.status_code}
            if response.status_code == 200:
                result['response'] = response.data
            else:
                result['error'] = 'Endpoint refused or could not assess this sample. No assessment was substituted.'
                # No blind retry after a provider/schema/operational failure.
                report['stopped'] = 'Endpoint unavailable, unauthorized or request/quota refused.'
            # Only use a record returned by this endpoint for this authenticated user.
            # A response without attributable usage remains unknown, never zero.
            record_id = response.data.get('record') if isinstance(response.data, dict) else None
            record = EssayEvaluationRecord.objects.filter(pk=record_id, user=user).first() if type(record_id) is int else None
            usage = usage_summary(record) if record is not None else None
            result['usage'] = usage
            estimate = standard_rate_estimate(usage, o['price_input'], o['price_output']) if usage is not None else None
            result['standard_rate_estimate_usd'] = estimate
            if estimate is None:
                report['calls_with_unknown_usage'] += 1
                report['stopped'] = 'Provider usage is unknown; stop before further calls and review provider usage.'
            else:
                report['standard_rate_estimate_known_usage_usd'] += estimate
                if estimate > bound:
                    report['stopped'] = 'Standard-rate usage estimate exceeded the reservation; stop and review provider billing.'
            report['standard_rate_estimate_usd'] = None if report['calls_with_unknown_usage'] else report['standard_rate_estimate_known_usage_usd']
            report['results'].append(result)
            report.pop('pending_case', None)
            checkpoint()
            if report.get('stopped'):
                break
        report['calls_made'] = len(report['results'])
        if len(report['results']) < len(rows) and not report.get('stopped'):
            report['stopped'] = 'Request limit reached; uncalled cases remain missing.'
        checkpoint()
        self.stdout.write(f"Recorded {len(report['results'])} endpoint results. Run the client acceptance scorer; no release approval is implied.")
