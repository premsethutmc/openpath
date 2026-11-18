"""Provider usage, database provenance and estimates. All calls use fake transports."""
import json
import hashlib
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import mock, TestCase
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import override_settings
from family.test_developer import DevTestCase
from . import essay
from .llm import complete, LLMError
from .test_llm import cfg, Recorder
from .test_argument import request, output
from .test_essay import LLM, URL
from . import test_workspace_benchmark as benchmark_tests
from .usage import usage_summary, standard_rate_estimate
from .models import EssayEvaluationRecord

OPENAI = {**LLM, 'OPENPATH_LLM_PROVIDER':'openai_compatible', 'OPENPATH_AI_SHARED_CONFIG':'off'}
USAGE = {'prompt_tokens':100, 'completion_tokens':80,
         'prompt_tokens_details':{'cached_tokens':60},
         'completion_tokens_details':{'reasoning_tokens':30}}

def reply(usage=USAGE, finish='stop', text=None):
    data = {'choices':[{'message':{'content':json.dumps(output()) if text is None else text},'finish_reason':finish}]}
    if usage is not None:
        data['usage'] = usage
    return Recorder(body=data)

class UsageClientTests(TestCase):
    def test_openai_subsets_preserved_without_double_counting(self):
        result=complete(cfg(provider='openai_compatible'), 'S', 'U', transport=reply())
        info=usage_summary(result)
        self.assertEqual((info['total_input_tokens'],info['output_tokens']), (100,80))
        self.assertEqual((info['cached_input_tokens'],info['reasoning_output_tokens']), (60,30))
        self.assertAlmostEqual(standard_rate_estimate(info,2,10),0.001)

    def test_missing_counts_are_unknown_explicit_zero_is_zero(self):
        missing=complete(cfg(provider='openai_compatible'),'S','U',transport=reply(None))
        info=usage_summary(missing)
        for key in ('input_tokens','output_tokens','cached_input_tokens','reasoning_output_tokens','total_input_tokens'):
            self.assertIsNone(info[key])
        self.assertIsNone(standard_rate_estimate(info,2,10))
        zero=complete(cfg(provider='openai_compatible'),'S','U',transport=reply({'prompt_tokens':0,'completion_tokens':0,
            'prompt_tokens_details':{'cached_tokens':0},'completion_tokens_details':{'reasoning_tokens':0}}))
        self.assertEqual(zero.cached_input_tokens,0)
        self.assertEqual(standard_rate_estimate(usage_summary(zero),2,10),0)

    def test_missing_details_do_not_erase_reported_totals(self):
        result=complete(cfg(provider='openai_compatible'),'S','U',transport=reply({'prompt_tokens':100,'completion_tokens':80}))
        self.assertIsNone(result.cached_input_tokens)
        self.assertIsNone(result.reasoning_output_tokens)
        self.assertAlmostEqual(standard_rate_estimate(usage_summary(result),2,10),0.001)

    def test_anthropic_cache_is_additional_not_a_subset(self):
        result=complete(cfg(),'S','U',transport=Recorder(body={'content':[{'type':'text','text':'{}'}],
            'stop_reason':'end_turn','usage':{'input_tokens':10,'output_tokens':80,
                'cache_read_input_tokens':70,'cache_creation_input_tokens':20}}))
        info=usage_summary(result)
        self.assertEqual(info['input_tokens'],10)
        self.assertEqual(info['total_input_tokens'],100)
        self.assertIsNone(info['reasoning_output_tokens'])
        self.assertAlmostEqual(standard_rate_estimate(info,2,10),0.001)

    def test_anthropic_missing_cache_does_not_invent_zero(self):
        result=complete(cfg(),'S','U',transport=Recorder(body={'content':[{'type':'text','text':'{}'}],
            'stop_reason':'end_turn','usage':{'input_tokens':10,'output_tokens':80}}))
        self.assertIsNone(usage_summary(result)['total_input_tokens'])
        self.assertIsNone(standard_rate_estimate(usage_summary(result),2,10))

    def test_invalid_usage_fails_without_echoing_provider_content(self):
        invalid=[{'prompt_tokens':True}, {'prompt_tokens':-1}, {'prompt_tokens_details':'SECRET'},
                 {'prompt_tokens':10,'prompt_tokens_details':{'cached_tokens':11}},
                 {'completion_tokens':10,'completion_tokens_details':{'reasoning_tokens':11}},
                 {'completion_tokens_details':{'reasoning_tokens':'SECRET'}}]
        for usage in invalid:
            with self.subTest(usage=usage),self.assertRaises(LLMError) as error:
                complete(cfg(provider='openai_compatible'),'S','U',transport=reply(usage))
            self.assertNotIn('SECRET',str(error.exception))

    def test_output_limit_keeps_valid_usage_without_model_text(self):
        with self.assertRaises(LLMError) as error:
            complete(cfg(provider='openai_compatible'),'S','U',transport=reply(finish='length',text='PRIVATE MODEL TEXT'))
        self.assertEqual(error.exception.usage.reasoning_output_tokens,30)
        self.assertNotIn('PRIVATE',str(error.exception))
        self.assertNotIn('PRIVATE',error.exception.usage.text)

@override_settings(**OPENAI)
class UsagePersistenceTests(DevTestCase):
    def test_success_and_failed_output_keep_numeric_usage(self):
        dev=self.developer()
        for finish,status in [('stop',200),('length',502)]:
            with mock.patch.object(essay,'TRANSPORT',reply(finish=finish)):
                response=dev.post(URL,request(),format='json')
            self.assertEqual(response.status_code,status)
            record=EssayEvaluationRecord.objects.get(pk=response.json()['record'])
            self.assertEqual(record.cached_input_tokens,60)
            self.assertEqual(record.reasoning_output_tokens,30)
            self.assertEqual(record.output_tokens,80)
            self.assertEqual(record.usage_provider,'openai_compatible')

    def test_no_usage_stays_null_and_unknown_legacy_is_not_an_invoice(self):
        with mock.patch.object(essay,'TRANSPORT',reply(None)):
            response=self.developer().post(URL,request(),format='json')
        record=EssayEvaluationRecord.objects.get(pk=response.json()['record'])
        self.assertIsNone(record.input_tokens)
        self.assertIsNone(record.output_tokens)
        self.assertIsNone(record.reasoning_output_tokens)
        record.input_tokens=0;record.output_tokens=0;record.usage_provider=''
        self.assertIsNone(standard_rate_estimate(usage_summary(record),2,10))

    def test_unknown_previous_usage_pauses_future_calls_without_network(self):
        dev=self.developer()
        with mock.patch.object(essay,'TRANSPORT',reply(None)):
            self.assertEqual(dev.post(URL,request(),format='json').status_code,200)
        with mock.patch.object(essay,'TRANSPORT') as transport:
            response=dev.post(URL,request(),format='json')
        self.assertEqual(response.status_code,429)
        self.assertIn('unknown',response.json()['error'])
        transport.assert_not_called()

    @override_settings(OPENPATH_ESSAY_DAILY_TOKENS=180)
    def test_quota_does_not_add_openai_subset_counts_twice(self):
        dev=self.developer()
        with mock.patch.object(essay,'TRANSPORT',reply()):
            self.assertEqual(dev.post(URL,request(),format='json').status_code,200)
        self.assertIsNotNone(essay._over_budget())
        with override_settings(OPENPATH_ESSAY_DAILY_TOKENS=181):
            self.assertIsNone(essay._over_budget())

@override_settings(**OPENAI)
class UsageBenchmarkTests(DevTestCase):
    write_manifest=benchmark_tests.WorkspaceBenchmarkTests.write_manifest
    run_command=benchmark_tests.WorkspaceBenchmarkTests.run_command
    live_options=benchmark_tests.WorkspaceBenchmarkTests.live_options

    def setUp(self):
        super().setUp()
        tmp=TemporaryDirectory();self.addCleanup(tmp.cleanup)
        self.root=Path(tmp.name);self.path=self.root/'requests.json';self.out=self.root/'out.json'
        self.write_manifest([{'id':'draft:1','body':request()}])

    def test_cost_is_labeled_standard_rate_not_invoice_or_cache_discount(self):
        options=self.live_options()
        with mock.patch.object(essay,'TRANSPORT',reply()),override_settings(OPENPATH_ESSAY_COMPACT_OBSERVE=True):
            self.run_command(**options)
        report=json.loads(self.out.read_text())
        self.assertNotIn('reported_cost_usd',report)
        self.assertAlmostEqual(report['standard_rate_estimate_usd'],0.001)
        self.assertEqual(report['calls_with_unknown_usage'],0)
        self.assertIn('not an invoice',report['cost_interpretation'])
        self.assertTrue(report['configuration']['compact_observe'])
        self.assertEqual(report['results'][0]['usage']['reasoning_output_tokens'],30)
        self.assertEqual(report['results'][0]['usage']['cached_input_tokens'],60)

    def test_missing_usage_does_not_create_a_zero_cost_claim(self):
        options=self.live_options()
        with mock.patch.object(essay,'TRANSPORT',reply(None)):
            self.run_command(**options)
        report=json.loads(self.out.read_text())
        self.assertIsNone(report['standard_rate_estimate_usd'])
        self.assertEqual(report['calls_with_unknown_usage'],1)
        self.assertGreater(report['reserved_cost_bound_usd'],0)

    def test_failed_output_keeps_usage_estimate_and_reservation(self):
        options=self.live_options()
        with mock.patch.object(essay,'TRANSPORT',reply(finish='length')):
            self.run_command(**options)
        report=json.loads(self.out.read_text())
        self.assertEqual(report['results'][0]['status'],502)
        self.assertAlmostEqual(report['standard_rate_estimate_usd'],0.001)
        self.assertEqual(report['results'][0]['usage']['reasoning_output_tokens'],30)
        self.assertGreater(report['reserved_cost_bound_usd'],0)

    @override_settings(OPENPATH_ESSAY_COMPACT_OBSERVE=True)
    def test_benchmark_hashes_actual_compact_wire_not_full_prompt(self):
        from .test_compact_observation import body
        data=body();req=data['request'];identifier=req['essay']['id']
        self.write_manifest([{'id':identifier,'body':data}])
        transport=reply(text=json.dumps({'essay_id':identifier,'rubric':req['rubric'],'observations':[],'not_observable':[]}))
        options=self.live_options()
        with mock.patch.object(essay,'TRANSPORT',transport):
            self.run_command(**options)
        report=json.loads(self.out.read_text())
        sent=transport.calls[0][2]
        self.assertEqual(report['prompt_digests'][identifier],hashlib.sha256(sent['messages'][0]['content'].encode()).hexdigest())
        self.assertEqual(report['effective_request_digests'][identifier],hashlib.sha256(sent['messages'][1]['content'].encode()).hexdigest())
        self.assertIn('Observe-only compact rubric',sent['messages'][0]['content'])
        self.assertNotIn('"bands"',sent['messages'][1]['content'])

    def test_benchmark_stops_after_first_failure_or_unknown_usage(self):
        self.write_manifest([{'id':'draft:1','body':request()},
                             {'id':'draft:2','body':{**request(),'request':{**request()['request'],'essay':{**request()['request']['essay'],'id':'draft:2'}}}}])
        options=self.live_options()
        transport=reply(finish='length')
        with mock.patch.object(essay,'TRANSPORT',transport):
            self.run_command(**options)
        self.assertEqual(len(transport.calls),1)
        self.assertEqual(json.loads(self.out.read_text())['calls_made'],1)
