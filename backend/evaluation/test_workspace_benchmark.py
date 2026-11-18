"""The benchmark uses the real developer/synthetic gateway; provider transport is mocked."""
import hashlib
import json
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import mock
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from django.test import override_settings
from family.test_developer import DevTestCase
from . import essay, argument
from .test_argument import request, output
from .test_essay import LLM, anthropic_reply
from .models import AIUsageBucket

class WorkspaceBenchmarkTests(DevTestCase):
    def setUp(self):
        super().setUp()
        self.tmp = TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = self.root / 'requests.json'; self.out = self.root / 'out.json'
        self.write_manifest([{'id': 'draft:1', 'body': request()}])

    def write_manifest(self, rows):
        digest = hashlib.sha256(json.dumps(rows, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        policy_files = ['backend/evaluation/argument.py','backend/evaluation/foundation.py','backend/evaluation/essay.py','backend/evaluation/gateway.py','content/english/prompts/essay-observe.v2.md']
        policy = hashlib.sha256('\n'.join((Path(settings.REPO_DIR)/p).read_text() for p in policy_files).encode()).hexdigest()
        reference = hashlib.sha256((Path(settings.REPO_DIR)/'content/english/essay/benchmark/workspace-writing-acceptance-v1.json').read_bytes()).hexdigest()
        self.path.write_text(json.dumps({'server_policy_digest':policy,'reference_digest':reference,'suite':'workspace-writing-acceptance@1', 'data_use':'synthetic_test', 'request_digest':digest, 'requests':rows}))

    def run_command(self, **kw):
        call_command('workspace_writing_benchmark', requests=str(self.path), out=str(self.out), stdout=StringIO(), **kw)

    def live_options(self):
        self.developer()
        user = get_user_model().objects.get(email='founder@example.org')
        return dict(live=True, user_id=user.pk, approved_by='synthetic test approval only', price_input=2, price_output=10, max_cost_usd=2)

    def test_default_is_no_network_and_does_not_enable_provider(self):
        with mock.patch.object(essay, 'TRANSPORT') as transport:
            self.run_command()
        transport.assert_not_called(); r=json.loads(self.out.read_text())
        self.assertEqual(r['mode'], 'dry-run'); self.assertEqual(r['results'], [])
        with self.assertRaises(CommandError): self.run_command()

    @override_settings(**LLM)
    def test_real_endpoint_prompt_and_quotas_are_used(self):
        options=self.live_options(); transport=anthropic_reply(json.dumps(output()))
        with mock.patch.object(essay, 'TRANSPORT', transport): self.run_command(**options)
        r=json.loads(self.out.read_text());self.assertEqual(r['calls_made'],1)
        self.assertEqual(r['results'][0]['response']['output'],output())
        self.assertEqual(transport.calls[0][2]['system'],argument.PROMPT)
        self.assertEqual(AIUsageBucket.objects.get(scope='global').requests,1)
        self.assertIsNotNone(r['standard_rate_estimate_usd'])
        self.assertEqual(r['calls_with_unknown_usage'],0)
        self.assertGreater(r['reserved_cost_bound_usd'],0)
        self.assertNotIn(LLM['OPENPATH_LLM_API_KEY'],self.out.read_text())

    @override_settings(**LLM)
    def test_live_refuses_missing_approval_non_developer_and_nonfinite_prices(self):
        options=self.live_options()
        for patch in [{'approved_by':''},{'price_input':float('nan')},{'price_output':-1},{'user_id':999999}]:
            with mock.patch.object(essay, 'TRANSPORT') as transport:
                with self.assertRaises(CommandError):self.run_command(**(options|patch))
                transport.assert_not_called()

    @override_settings(**LLM)
    def test_cost_cap_prevents_calls_and_disabled_evaluator_stays_disabled(self):
        options=self.live_options()
        with mock.patch.object(essay, 'TRANSPORT') as transport:
            self.run_command(**(options|{'max_cost_usd':0.000001}))
            transport.assert_not_called()
        self.assertEqual(json.loads(self.out.read_text())['calls_made'],0)
        self.out.unlink()
        with override_settings(OPENPATH_ESSAY_EVALUATOR='disabled'):
            with self.assertRaises(CommandError):self.run_command(**options)

    def test_wrong_hash_real_data_and_invalid_requests_are_refused_before_network(self):
        data=json.loads(self.path.read_text());data['request_digest']='bad';self.path.write_text(json.dumps(data))
        with self.assertRaises(CommandError):self.run_command()
        body=request();body['data_use']='real_learner';self.write_manifest([{'id':'draft:1','body':body}])
        with self.assertRaises(CommandError):self.run_command()

    @override_settings(**LLM)
    def test_duplicate_findings_rejected_by_actual_endpoint(self):
        options=self.live_options();o=output();o['findings']*=2
        with mock.patch.object(essay,'TRANSPORT',anthropic_reply(json.dumps(o))):self.run_command(**options)
        result=json.loads(self.out.read_text())['results'][0]
        self.assertEqual(result['status'],502);self.assertNotIn('response',result)

    @override_settings(**LLM)
    def test_output_is_reserved_before_any_paid_call(self):
        options=self.live_options();self.out=self.root/'missing-directory'/'out.json'
        with mock.patch.object(essay,'TRANSPORT') as transport:
            with self.assertRaises(CommandError):self.run_command(**options)
            transport.assert_not_called()

    @override_settings(**LLM)
    def test_interruption_keeps_pending_case_for_safe_recovery(self):
        options=self.live_options()
        with mock.patch.object(essay,'TRANSPORT',side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):self.run_command(**options)
        result=json.loads(self.out.read_text());self.assertEqual(result['pending_case'],'draft:1')
        self.assertGreater(result['reserved_cost_bound_usd'],0)
        self.assertTrue(result['prompt_digests']['draft:1'])
        with self.assertRaises(CommandError):self.run_command(**options)
