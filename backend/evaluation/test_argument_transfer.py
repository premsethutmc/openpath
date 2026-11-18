"""Offline transfer boundary tests; no claims of provider accuracy or independence."""
import json
from unittest import mock
from django.test import override_settings
from family.test_developer import DevTestCase
from . import argument, essay
from .models import AIUsageBucket
from .test_argument import request, output, TEXT
from .test_essay import LLM, anthropic_reply, URL


def transfer_request():
    body = request()
    body['request']['task_context']['stage'] = 'transfer'
    return body


class ArgumentTransferTests(DevTestCase):
    @override_settings(**LLM)
    def test_transfer_uses_unchanged_output_and_no_prior_context(self):
        transport = anthropic_reply(json.dumps(output()))
        with mock.patch.object(essay, 'TRANSPORT', transport):
            response = self.developer().post(URL, transfer_request(), format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()['output'], output())
        sent = transport.calls[0][2]
        payload = json.loads(sent['messages'][0]['content'])
        self.assertEqual(set(payload['task_context']), {'stage', 'topic', 'prompt'})
        self.assertEqual(payload['task_context']['stage'], 'transfer')
        self.assertEqual(sent['system'], argument.PROMPT)
        self.assertIn('stage label alone is not evidence of independence', sent['system'])
        self.assertIn('Do not reconstruct earlier work, compare performance', sent['system'])
        self.assertEqual(AIUsageBucket.objects.get(scope='global').requests, 1)

    @override_settings(**LLM)
    def test_prior_draft_and_coaching_fields_rejected_before_transport(self):
        dev, transport = self.developer(), anthropic_reply(json.dumps(output()))
        invalid = []
        for name, value in [('previous', TEXT), ('previous', ''), ('previous', None),
                            ('coaching', 'A worked answer'), ('hint', 'Use this argument'),
                            ('history', [TEXT]), ('feedback', {'question': 'What changed?'})]:
            body = transfer_request()
            body['request']['task_context'][name] = value
            invalid.append(body)
        for container in ('request', 'essay'):
            body = transfer_request()
            target = body['request'] if container == 'request' else body['request']['essay']
            target['previous'] = TEXT
            invalid.append(body)
        with mock.patch.object(essay, 'TRANSPORT', transport):
            for body in invalid:
                self.assertEqual(dev.post(URL, body, format='json').status_code, 400)
        self.assertFalse(transport.calls)
        self.assertFalse(AIUsageBucket.objects.exists())

    @override_settings(**LLM)
    def test_transfer_retains_synthetic_and_no_comparison_output_guards(self):
        dev = self.developer()
        transport = anthropic_reply(json.dumps(output()))
        body = transfer_request(); body['data_use'] = 'real_learner'
        with mock.patch.object(essay, 'TRANSPORT', transport):
            self.assertEqual(dev.post(URL, body, format='json').status_code, 403)
        self.assertFalse(transport.calls)
        for patch in ({'improved': True}, {'score': 4}, {'mastery': True}, {'comparison': 'better'}):
            with mock.patch.object(essay, 'TRANSPORT', anthropic_reply(json.dumps({**output(), **patch}))):
                response = dev.post(URL, transfer_request(), format='json')
            self.assertEqual(response.status_code, 502)
            self.assertEqual(response.json()['error'], 'invalid argument coaching response')
