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
