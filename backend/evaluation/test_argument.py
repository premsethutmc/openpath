"""Offline contract tests; no claims about provider linguistic accuracy."""
import copy
import json
from unittest import mock
from django.test import override_settings
from rest_framework.test import APIClient
from family.test_developer import DevTestCase
from . import essay, argument, foundation
from .test_essay import LLM, anthropic_reply, URL, STATUS
from .models import AIUsageBucket, EssayEvaluationRecord

TEXT = 'Public libraries should offer longer opening hours. Many workers cannot visit during the day. Longer hours might help them find information, although staffing costs would need to be considered before making the change.'
def request():
    return {'data_use': 'synthetic_test', 'task': 'observe', 'request': {
        'protocol': 'essay-observe.v2', 'rubric': argument.RUBRIC, 'request_id': 'argument:1', 'grade': 0,
        'essay': {'id': 'draft:1', 'text': TEXT, 'words': len(TEXT.split())}, 'max_observations': 8,
        'task_context': {'stage': 'for', 'topic': 'Library opening hours', 'prompt': 'Argue for longer hours.'}}}
def output():
    return {'essay_id': 'draft:1', 'rubric': argument.RUBRIC, 'findings': [
        {'area': 'evidence', 'quote': 'Many workers cannot visit during the day.', 'question': 'What could help you check this claim?', 'hint': 'Consider what information would distinguish an assumption from a supported reason.'}], 'not_observable': ['counterargument']}

class ArgumentTests(DevTestCase):
    @override_settings(**LLM)
    def test_success_stages_prompt_and_metadata(self):
        dev = self.developer()
        for stage in ('initial', 'for', 'against', 'revision'):
            b = request(); b['request']['task_context']['stage'] = stage
            b['request']['task_context']['previous'] = TEXT
            transport = anthropic_reply(json.dumps(output()))
            with mock.patch.object(essay, 'TRANSPORT', transport):
                r = dev.post(URL, b, format='json')
            self.assertEqual(r.status_code, 200, r.content)
            sent = transport.calls[0][2]
            self.assertEqual(sent['system'], argument.PROMPT)
            self.assertIn('never write it for them', sent['system'])
            self.assertEqual(r.json()['output'], output())
        self.assertEqual(AIUsageBucket.objects.get(scope='global').requests, 4)
        self.assertNotIn(TEXT, str(list(EssayEvaluationRecord.objects.values())))

    @override_settings(**LLM)
    def test_guards_invalid_input_and_real_data(self):
        dev = self.developer(); transport = anthropic_reply(json.dumps(output()))
        bad = []
        for key, value in [('grade', True), ('grade', 8), ('max_observations', 9), ('prompt', 'override'), ('task_context', {}), ('essay', {})]:
            b = request(); b['request'][key] = value; bad.append(b)
        for patch in [{'stage': 'scoring'}, {'topic': ''}, {'previous': 'x' * 10001}, {'extra': 'x'}]:
            b = request(); b['request']['task_context'].update(patch); bad.append(b)
        b = request(); b['request']['essay']['words'] = 30; bad.append(b)
        with mock.patch.object(essay, 'TRANSPORT', transport):
            for b in bad:
                self.assertEqual(dev.post(URL, b, format='json').status_code, 400)
            b = request(); b['data_use'] = 'real_learner'
            self.assertEqual(dev.post(URL, b, format='json').status_code, 403)
            self.assertEqual(self.parent('parent@example.org').post(URL, request(), format='json').status_code, 403)
            self.assertIn(APIClient().post(URL, request(), format='json').status_code, (401, 403))
        self.assertFalse(transport.calls)

    @override_settings(**LLM)
    def test_rejects_replacements_scores_ungrounded_and_contradictory_output(self):
        dev = self.developer(); invalid = []
        for patch in [{'quote': 'invented'}, {'area': 'score'}, {'area': []}, {'question': 'Here is your answer.'}, {'hint': ''}, {'correction': 'replacement'}, {'question': 'x' * 601}]:
            o = output(); o['findings'][0].update(patch); invalid.append(o)
        for patch in [{'score': 9}, {'rubric': 'other'}, {'essay_id': 'other'}, {'findings': [output()['findings'][0]] * 9}, {'not_observable': ['evidence']}, {'not_observable': ['clarity', 'clarity']}]:
            o = output(); o.update(patch); invalid.append(o)
        for o in invalid:
            with mock.patch.object(essay, 'TRANSPORT', anthropic_reply(json.dumps(o))):
                r = dev.post(URL, request(), format='json')
            self.assertEqual(r.status_code, 502, r.content)
            self.assertEqual(r.json()['error'], 'invalid argument coaching response')

    @override_settings(**LLM)
    def test_context_scrub_and_quota(self):
        dev = self.developer(); b = request(); b['request']['task_context']['previous'] = 'Contact test@example.org or https://example.org'
        transport = anthropic_reply(json.dumps(output()))
        with mock.patch.object(essay, 'TRANSPORT', transport), override_settings(OPENPATH_AI_USER_DAILY_REQUESTS=1):
            self.assertEqual(dev.post(URL, b, format='json').status_code, 200)
            self.assertEqual(dev.post(URL, b, format='json').status_code, 429)
        self.assertNotIn('test@example.org', str(transport.calls[0][2]))
        self.assertEqual(len(transport.calls), 1)

class FoundationTests(DevTestCase):
    def test_all_profile_status_and_canonical_requests(self):
        dev = self.developer()
        for rubric, (goal, band) in foundation.RUBRICS.items():
            self.assertEqual(dev.get(STATUS, {'rubric': rubric}).status_code, 200)
            b = request()['request']; b.pop('task_context'); b['rubric'] = rubric; b['grade'] = 7 if goal == 'grade7' else 0
            b['competencies'] = [{'id': key, 'name': 'injected name'} for key in foundation.competencies()]
            req, _ = essay.validate_essay_request('observe', b)
            self.assertNotIn('injected name', str(req))
            self.assertEqual(len(req['competencies']), 20)
            q = {'rubric': rubric, 'grade': b['grade'], 'competency': {'id': 'EN.GRM.VERB.sva', 'target_band': band}}
            canonical = foundation.validate_request('questions', q)
            self.assertTrue(canonical['competency']['bands'])
            self.assertEqual(canonical['competency']['target_band'], band)
            q['competency']['target_band'] = 5
            with self.assertRaises(Exception): foundation.validate_request('questions', q)
        prompt = foundation.prompt(essay._prompt(essay.OBSERVE_V2))
        self.assertNotIn('Grade 8', prompt)
        self.assertIn('not validated levels', prompt)

    @override_settings(**LLM)
    def test_foundation_transport_uses_non_grade8_instructions(self):
        b = request(); req = b['request']; req.pop('task_context'); req['rubric'] = 'foundation-writing-general-foundation@1'
        req['competencies'] = list(foundation.competencies().values())
        o = {'essay_id': 'draft:1', 'rubric': req['rubric'], 'observations': [], 'not_observable': []}
        transport = anthropic_reply(json.dumps(o))
        with mock.patch.object(essay, 'TRANSPORT', transport):
            r = self.developer().post(URL, b, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('Grade 8', transport.calls[0][2]['system'])
        self.assertIn('self-selected practice references', transport.calls[0][2]['system'])

    @override_settings(**LLM)
    def test_foundation_question_and_own_rewrite_routes(self):
        from .test_essay import questions_request, QUESTIONS_OUTPUT
        dev = self.developer()
        b = questions_request(rubric='foundation-writing-grade7-developing@1', grade=7)
        b['request']['competency']['target_band'] = 4
        transport = anthropic_reply(json.dumps(QUESTIONS_OUTPUT))
        with mock.patch.object(essay, 'TRANSPORT', transport):
            r = dev.post(URL, b, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('Grade 8', transport.calls[0][2]['system'])
        self.assertNotIn('about 13', transport.calls[0][2]['system'])
        req = {'protocol': 'essay-rewrite.v2', 'rubric': 'foundation-writing-general-stretch@1', 'request_id': 'rw:1',
               'original': {'id': 'draft:1', 'text': TEXT}, 'rewrite': {'id': 'rw:1', 'text': 'Longer hours may help workers access libraries.', 'words': 7, 'limit': 50},
               'dimensions': ['meaning_preservation', 'clarity', 'coherence', 'grammar', 'concision']}
        transport = anthropic_reply(json.dumps({'rewrite_id': 'rw:1', 'rubric': req['rubric'], 'dimensions': [], 'key_ideas': []}))
        with mock.patch.object(essay, 'TRANSPORT', transport):
            r = dev.post(URL, {'task': 'rewrite', 'request': req, 'data_use': 'synthetic_test'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('Grade 8', transport.calls[0][2]['system'])
        self.assertIn('Never supply replacement paragraphs', transport.calls[0][2]['system'])
