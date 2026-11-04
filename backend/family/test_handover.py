"""handover@1 (Workstream H1): an educator's acknowledgement of a paused competency. Only an educator with the parent's share can record one;
the parent's (learner's) account cannot, and a learner record can never carry one. Append-only; it reopens, it never marks. Synthetic only."""
from django.core.management import call_command

from .models import HandoverAcknowledgement
from .test_learning import LearningBase

LE = 'MATH.algebra.linear-equations'


class HandoverAcknowledgementTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.teacher = self.parent('teacher@example.org')
        self.stranger = self.parent('not-an-educator@example.org')
        self.unshared = self.parent('other-teacher@example.org')
        for e in ('teacher@example.org', 'other-teacher@example.org'):
            call_command('content_reviewer', 'grant', e, role='educator', stdout=open('/dev/null', 'w'))

    def ack(self, client, competency=LE, note='We went through moving terms with signs.'):
        return client.post('/api/handover/acknowledgements/', {'pupil': self.pupil_id, 'competency': competency, 'note': note}, format='json')

    def acks(self, client=None):
        return (client or self.client).get(f'/api/pupils/{self.pupil_id}/handover-acknowledgements/')

    def test_only_an_educator_with_the_parents_share_can_acknowledge(self):
        self.assertEqual(self.ack(self.client).status_code, 403, 'the parent / learner account cannot acknowledge')
        self.assertEqual(self.ack(self.stranger).status_code, 403, 'not an educator')
        self.assertEqual(self.ack(self.teacher).status_code, 403, 'an educator the learner was not shared with')
        self.assertEqual(self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').status_code, 201)
        r = self.ack(self.teacher)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual((r.json()['competency'], r.json()['by']), (LE, 'educator'))
        self.assertEqual(self.ack(self.unshared).status_code, 403)
        self.assertEqual(self.ack(self.teacher, competency='MATH.nothing.here').status_code, 400)
        self.assertEqual(self.ack(self.teacher, note='<script>').status_code, 400)
        listed = self.acks().json()['acknowledgements']
        self.assertEqual([(a['competency'], a['by']) for a in listed], [(LE, 'educator')])
        self.assertNotIn('note', listed[0]); self.assertNotIn('educator', listed[0])
        self.assertEqual(self.acks(self.teacher).status_code, 404, 'only the parent reads them back')
        self.assertEqual(self.teacher.post('/api/handover/acknowledgements/', {'pupil': 'junk', 'competency': LE}, format='json').status_code, 400, 'not a learner id')
        # the parent revokes the share: the educator can no longer acknowledge
        self.assertIn(self.client.delete(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').status_code, (200, 204))
        self.assertEqual(self.ack(self.teacher).status_code, 403, 'a revoked share ends it')

    def test_a_learner_record_cannot_carry_an_acknowledgement(self):
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        forged = self.rec('handover_ack', competency=LE, by='educator')
        self.assertEqual(self.save(forged).status_code, 400)
        forged_attempt = self.attempt('eq-d1', '2', acknowledgement={'by': 'educator'})
        self.assertEqual(self.save(forged_attempt).status_code, 400)
        self.assertEqual(self.acks().json()['acknowledgements'], [])

    def test_append_only(self):
        self.assertEqual(self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').status_code, 201)
        self.assertEqual(self.ack(self.teacher).status_code, 201)
        a = HandoverAcknowledgement.objects.get()
        with self.assertRaises(ValueError):
            a.note = 'changed'; a.save()
        with self.assertRaises(ValueError):
            a.delete()
        with self.assertRaises(ValueError):
            HandoverAcknowledgement.objects.all().delete()


import json  # noqa: E402
import os  # noqa: E402
import unittest  # noqa: E402
from pathlib import Path  # noqa: E402


@unittest.skipUnless(os.environ.get('H1_DIR'), 'run by frontend/scripts/h1-persistence.sh')
class HandoverPersistence(LearningBase):
    """A paused learner's records (first visit, failed self-service re-entry) go into the store with the server's clock set to each record's
    own time; an educator acknowledges; a NEW client reads records and acknowledgements back; a separate process rebuilds the hand-over
    state from them (frontend/scripts/h1-persistence.mts verify)."""

    def test_round_trip(self):
        from unittest import mock
        import datetime
        d = Path(os.environ['H1_DIR'])
        run = json.loads((d / 'events.json').read_text())
        for i, e in enumerate(run['events']):
            at = datetime.datetime.fromisoformat(e['at'].replace('Z', '+00:00'))
            with mock.patch('family.learning.timezone.now', return_value=at):
                r = self.append(self.client, self.pupil_id, i, {**e, 'learnerId': self.pupil_id, 'sessionId': f"learn:{self.pupil_id}:{e['sessionId'].split(':')[-1]}"}, subject='mathematics')
            self.assertEqual(r.status_code, 201, (i, e.get('record'), r.content))
        teacher = self.parent('teacher@example.org')
        call_command('content_reviewer', 'grant', 'teacher@example.org', role='educator', stdout=open('/dev/null', 'w'))
        self.assertEqual(self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').status_code, 201)
        ack_at = datetime.datetime.fromisoformat(run['ackAt'].replace('Z', '+00:00'))
        with mock.patch('django.utils.timezone.now', return_value=ack_at):
            self.assertEqual(teacher.post('/api/handover/acknowledgements/', {'pupil': self.pupil_id, 'competency': LE}, format='json').status_code, 201)
        from rest_framework.test import APIClient
        from .tests import PASSWORD
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/account/login/', {'email': 'asha.parent@example.org', 'password': PASSWORD}, format='json').status_code, 200)
        events = fresh.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']
        acks = fresh.get(f'/api/pupils/{self.pupil_id}/handover-acknowledgements/').json()['acknowledgements']
        self.assertEqual(len(events), len(run['events']))
        (d / 'stored.json').write_text(json.dumps({'learnerId': self.pupil_id, 'events': events, 'acknowledgements': acks}))

class ReentryEligibilityTests(LearningBase):
    def test_forged_reentry_does_not_consume_allowance_or_save_event(self):
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        before = len(self.records())
        for context in ('reentry:MATH.algebra.linear-equations', 'reentry:MATH.other'):
            response = self.save(self.attempt('eq-d1', '2', context=context))
            self.assertEqual(response.status_code, 400, response.content)
            self.assertEqual(len(self.records()), before)
        self.assertEqual(self.save(self.attempt('eq-d1', '2')).status_code, 201)

    def test_lesson_review_is_recorded_as_assistance(self):
        from .learning import content
        q = content()['questions']['eq-d1']
        m = content()['modules'][q['competency']]
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        self.assertEqual(self.save(self.rec('teach', competency=q['competency'], strategy=m['strategies'][0]['id'], rule='foundation-lesson-review@1')).status_code, 201)
        self.assertEqual(self.save(self.attempt('eq-d1', '2')).status_code, 201)
        self.assertEqual(self.records()[-1]['hints'], 1)

        # Review cannot be disguised as an independent re-entry, even if a caller
        # has obtained an educator acknowledgement for this same visit.
        before = len(self.records())
        r = self.save(self.attempt('eq-d1', '2', context=f"reentry:{q['competency']}"))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(len(self.records()), before)

    def test_working_only_is_saved_unresolved_and_empty_submission_is_rejected(self):
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        r = self.save(self.attempt('eq-d1', '', working=['a method the checker cannot read']))
        self.assertEqual(r.status_code, 201, r.content)
        saved = self.records()[-1]
        self.assertEqual(saved['working'], ['a method the checker cannot read'])
        self.assertEqual(saved['decision']['verdict'], 'unresolved')
        self.assertEqual(self.save(self.attempt('eq-d1', '', working=[])).status_code, 400)
        self.assertEqual(self.save(self.attempt('eq-d1', '', working=['  '])).status_code, 400)
