"""Actual argument gateway JSON-mode wire contract, with an entirely mocked provider.

A schema-shaped example alone is not an explicit JSON instruction. These tests
inspect the server-owned system message sent to Chat Completions and exercise a
fake provider's missing-JSON refusal. No live API, secret or accuracy claim.
"""
import json
from unittest import mock

from django.test import override_settings
from family.test_developer import DevTestCase
from . import argument, essay
from .test_argument import request, output
from .test_essay import LLM, URL

OPENAI = {**LLM, 'OPENPATH_LLM_PROVIDER': 'openai_compatible',
          'OPENPATH_LLM_MODEL': 'synthetic-openai-model',
          'OPENPATH_AI_SHARED_CONFIG': 'off'}


def json_mode_provider(calls):
    def transport(url, headers, payload, timeout):
        body = json.loads(payload)
        calls.append((url, body))
        # Mirror only the explicit JSON-mode instruction requirement, not model quality.
        if not any('json' in m.get('content', '').lower() for m in body['messages']):
            return 400, b'{"error":{"type":"invalid_request_error","message":"JSON instruction missing"}}'
        return 200, json.dumps({'choices': [{'message': {'content': json.dumps(output())},
                                            'finish_reason': 'stop'}],
                                'usage': {'prompt_tokens': 40, 'completion_tokens': 30}}).encode()
    return transport


@override_settings(**OPENAI)
class ArgumentJsonContractTests(DevTestCase):
    def test_all_argument_stages_send_explicit_server_owned_json_instruction(self):
        dev = self.developer()
        for stage in ('initial', 'for', 'against', 'revision', 'transfer'):
            with self.subTest(stage=stage):
                body = request()
                body['request']['task_context']['stage'] = stage
                calls = []
                with mock.patch.object(essay, 'TRANSPORT', json_mode_provider(calls)):
                    response = dev.post(URL, body, format='json')
                self.assertEqual(response.status_code, 200, response.content)
                self.assertEqual(len(calls), 1)
                url, sent = calls[0]
                self.assertTrue(url.endswith('/chat/completions'))
                self.assertEqual(sent['response_format'], {'type': 'json_object'})
                self.assertEqual(sent['messages'][0], {'role': 'system', 'content': argument.PROMPT})
                self.assertIn('one valid JSON object', sent['messages'][0]['content'])
                self.assertIn('no Markdown fences or extra prose', sent['messages'][0]['content'])
                self.assertEqual(response.json()['output'], output())

    def test_instruction_is_not_dependent_on_untrusted_writer_mentioning_json(self):
        body = request()
        self.assertNotIn('json', json.dumps(body).lower())
        calls = []
        with mock.patch.object(essay, 'TRANSPORT', json_mode_provider(calls)):
            response = self.developer().post(URL, body, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotIn('json', calls[0][1]['messages'][1]['content'].lower())
        self.assertIn('JSON', calls[0][1]['messages'][0]['content'])

    def test_mock_exposes_missing_instruction_regression_without_a_paid_call(self):
        # Mutation check: the contract probe must actually fail if the explicit word vanishes.
        prompt_without_json = argument.PROMPT.replace('JSON', 'structured')
        calls = []
        with mock.patch.object(argument, 'PROMPT', prompt_without_json), \
             mock.patch.object(essay, 'TRANSPORT', json_mode_provider(calls)):
            response = self.developer().post(URL, request(), format='json')
        self.assertEqual(response.status_code, 502)
        self.assertEqual(len(calls), 1)
        self.assertIn('status 400', response.json()['error'])
        self.assertNotIn('JSON instruction missing', response.json()['error'])
