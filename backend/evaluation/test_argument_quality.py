"""Mocked adversarial boundaries, explicitly not model or semantic accuracy tests."""

import json
from pathlib import Path
from unittest import TestCase, mock
from django.test import override_settings
from . import argument, essay, llm
from .test_argument import request
from family.test_developer import DevTestCase
from .test_essay import LLM, URL, anthropic_reply

# backend/evaluation -> backend -> repository
FIXTURE = Path(__file__).resolve().parents[2] / 'content/english/essay/benchmark/argument-coaching-quality-boundaries-v1.json'
def corpus():
    return json.loads(FIXTURE.read_text())
def example(c, data):
    req = request()['request']
    req['essay'] = {'id': 'draft:1', 'text': data['essay'], 'words': len(data['essay'].split())}
    return req, {'essay_id': 'draft:1', 'rubric': argument.RUBRIC, 'findings': [{'area': 'evidence', 'quote': data['quote'], 'question': c['question'], 'hint': c['hint']}], 'not_observable': []}

class ArgumentQualityContractTests(TestCase):
    def test_shared_adversaries_expose_semantic_limits(self):
        data = corpus()
        for c in data['cases']:
            with self.subTest(c['id']):
                req, output = example(c, data)
                if c['validation'] == 'reject':
                    with self.assertRaises(llm.LLMError):
                        argument.validate_output(output, req)
                else:
                    # Deliberately includes harmful but structurally valid coaching.
                    # Acceptance is NOT a quality verdict or release criterion.
                    argument.validate_output(output, req)
    def test_prompt_requires_learner_ownership_and_viewpoint_fairness(self):
        for text in ['unsupported premise', 'defensible opposing position', 'personal examples', 'disguise a model answer', 'return fewer or no findings']:
            self.assertIn(text, argument.PROMPT)

class ArgumentQualityGatewayTests(DevTestCase):
    @override_settings(**LLM)
    def test_copy_directives_are_refused_not_returned_to_writer(self):
        data=corpus(); dev=self.developer()
        for c in data['cases']:
            if c['validation'] != 'reject':
                continue
            req, output=example(c,data)
            with mock.patch.object(essay,'TRANSPORT',anthropic_reply(json.dumps(output))):
                response=dev.post(URL, {'data_use':'synthetic_test','task':'observe','request':req},format='json')
            self.assertEqual(response.status_code,502,response.content)
            self.assertNotIn(c['hint'],response.content.decode())
