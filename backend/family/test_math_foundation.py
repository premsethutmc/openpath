from datetime import timedelta
from unittest import mock
from django.utils import timezone
from rest_framework.test import APIClient
from .tests import FamilyTestCase
from .math_foundation import programs

class FoundationTests(FamilyTestCase):
    def setUp(self):
        super().setUp()
        self.client = self.parent()
        self.pupil_id = str(self.pupil(self.client, 'Synthetic foundation pupil'))
        self.seq = 0
        self.serial = 0
        self.program = programs()[0]

    def event(self, action='complete', stage='concept', **extra):
        self.serial += 1
        return {**dict(kind='math_foundation_activity', id=f'foundation-{self.serial}', at='2000-01-01T00:00:00Z', learnerId=self.pupil_id, sessionId=f'math:{self.pupil_id}:test', programId=self.program['id'], lessonVersion='1.0.0', journey='school', action=action, stage=stage, elapsedMs=100), **extra}

    def save(self, event):
        response = self.append(self.client, self.pupil_id, self.seq, event, subject='mathematics')
        if response.status_code == 201:
            self.seq += 1
        return response

    def records(self):
        return self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']

    def test_authentication_ownership_and_eligibility_injection(self):
        self.assertEqual(APIClient().get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').status_code, 403)
        for extra in [dict(learnerId='other'), dict(verified=True), dict(retentionDueAt='2000-01-01'), dict(lessonVersion='future'), dict(programId='invented'), dict(sessionId='math:other:visit')]:
            self.assertEqual(self.save(self.event(**extra)).status_code, 400)
        self.assertEqual(self.records(), [])

    def test_fixed_order_interaction_requirement_duplicates_and_conflicts(self):
        self.assertEqual(self.save(self.event(stage='worked')).status_code, 400)
        event = self.event()
        self.assertEqual(self.save(event).status_code, 201)
        self.assertEqual(self.save(event).status_code, 400)
        self.assertEqual(self.save(self.event(stage='explore')).status_code, 400)
        self.assertEqual(self.save(self.event('draft', 'explore', questionId='model', response='[3,2,2,1,4,2]')).status_code, 201)
        self.assertEqual(self.save(self.event('draft', 'explore', questionId='exploration', response='done')).status_code, 201)
        self.assertEqual(self.save(self.event(stage='explore')).status_code, 201)
        self.assertEqual(self.append(self.client, self.pupil_id, 0, self.event(), subject='mathematics').status_code, 409)

    def test_three_programs_resume_and_delayed_review_separate_from_gre(self):
        now = timezone.now()
        for spec in programs():
            self.program = spec
            with mock.patch('family.math_foundation.timezone.now', return_value=now):
                for stage in spec['stages'][:7]:
                    if stage['id'] == 'explore':
                        self.assertEqual(self.save(self.event('draft', 'explore', questionId='exploration', response='done')).status_code, 201)
                    for qid in stage['questions']:
                        self.assertEqual(self.save(self.event('answer', stage['id'], questionId=qid, response='0')).status_code, 201)
                    self.assertEqual(self.save(self.event(stage=stage['id'])).status_code, 201)
                previous = self.records()
                self.assertEqual(timezone.datetime.fromisoformat(previous[-1]['retentionDueAt']), now + timedelta(days=1))
                self.assertEqual(self.save(self.event('answer', 'retention', questionId='retention', response='0')).status_code, 400)
                self.assertEqual(self.save(self.event(journey='gre-quant')).status_code, 201)
                self.assertEqual(self.save(self.event(stage='worked', journey='gre-quant')).status_code, 400)
                self.assertEqual(self.records()[:-1], previous)
            with mock.patch('family.math_foundation.timezone.now', return_value=now + timedelta(days=1, seconds=1)):
                self.assertEqual(self.save(self.event('answer', 'retention', questionId='retention', response='0')).status_code, 201)
                self.assertEqual(self.save(self.event(stage='retention')).status_code, 201)
            own = [e for e in self.records() if e.get('programId') == spec['id'] and e['action'] == 'complete']
            self.assertEqual(sum(e['journey'] == 'school' for e in own), 8)
            self.assertEqual(sum(e['journey'] == 'gre-quant' for e in own), 1)

    def test_new_completion_cannot_unlock_legacy_program(self):
        self.assertEqual(self.save(self.event()).status_code, 201)
        old = dict(kind='math_activity', id='legacy-worked', at='2000-01-01T00:00:00Z', learnerId=self.pupil_id, sessionId=f'math:{self.pupil_id}:test', journey='school', lessonVersion='2.0.0', action='complete', stage='worked', elapsedMs=0)
        self.assertEqual(self.save(old).status_code, 400)
        self.assertEqual(len(self.records()), 1)

    def test_invalid_answers_and_models(self):
        for raw in ['1/0', 'NaN', '٢', '1e3']:
            self.assertEqual(self.save(self.event('answer', 'guided', questionId='guided', response=raw)).status_code, 400)
        for raw in ['null', '{}', '[1000000000]', '[0,0,0,0,0,0]']:
            self.assertEqual(self.save(self.event('draft', 'explore', questionId='model', response=raw)).status_code, 400)
