"""recovery-handoff@0 (RESEARCH, deep-recovery@0): a stopped deep recovery is handed to the educator the parent shared the pupil with.
Creation from each blocked outcome, deduplication, access, resolution, the server switch, and old records unaffected. Synthetic only."""
from django.core.management import call_command
from django.test import override_settings
from rest_framework.test import APIClient

from .models import DiagnosticAccessLog, HandoverAcknowledgement, PupilEvent, RecoveryHandoff, WrittenMark
from .test_learning import LearningBase

ORIG = 'eq-d1'
SKILL = 'MATH.algebra.linear-equations'
STEP = 'MATH.number.equivalent-fractions'
EPISODE = f'deep:{ORIG}#2000-01-01T00:00:00Z'
CTX = f'deep:{ORIG}|{SKILL}>{STEP}@{STEP}'
REASONS = ['missing-content', 'no-fresh-question', 'teaching-not-worked', 'budget-exhausted', 'unsettled']


@override_settings(OPENPATH_DEEP_RECOVERY_HANDOFF=True)
class RecoveryHandoffTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.teacher = self.parent('teacher@example.org')
        self.other_teacher = self.parent('other-teacher@example.org')
        for e in ('teacher@example.org', 'other-teacher@example.org'):
            call_command('content_reviewer', 'grant', e, role='educator', stdout=open('/dev/null', 'w'))
        self.other_parent = self.parent('other-parent@example.org')
        self.other_pupil = str(self.pupil(self.other_parent, 'Other synthetic pupil'))
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        self.assertEqual(self.save(self.attempt(ORIG, '2', activity='practice')).status_code, 201)
        self.assertEqual(self.save(self.attempt('eq-d2', '3', context=CTX)).status_code, 201)

    def share(self, email='teacher@example.org'):
        self.assertEqual(self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': email}, format='json').status_code, 201)

    def report(self, client=None, pupil=None, **over):
        body = {'original': ORIG, 'skill': SKILL, 'step': STEP, 'episode': EPISODE, 'reason': 'missing-content', 'path': [SKILL, STEP],
                'detail': 'The answers point to Equivalent fractions. OpenPath cannot teach it yet.', **over}
        return (client or self.client).post(f'/api/pupils/{pupil or self.pupil_id}/recovery-handoffs/', body, format='json')

    def mine(self, client=None):
        return (client or self.client).get(f'/api/pupils/{self.pupil_id}/recovery-handoffs/')

    def queue(self, client):
        return client.get('/api/recovery-handoffs/')

    def resolve(self, client, hid, note='We went through equivalent fractions together.'):
        return client.post(f'/api/recovery-handoffs/{hid}/resolve/', {'note': note}, format='json')

    # ---------------------------------------------------------------- creation

    def test_each_blocked_outcome_creates_one_handoff(self):
        for i, reason in enumerate(REASONS):
            r = self.report(skill=f'{SKILL}-{i}', reason=reason)
            self.assertEqual(r.status_code, 201, r.content)
            self.assertEqual((r.json()['reason'], r.json()['status']), (reason, 'open'))
        self.assertEqual(sorted(RecoveryHandoff.objects.values_list('reason', flat=True)), sorted(REASONS))
        self.assertEqual(self.report(reason='solved').status_code, 400, 'only a stopped recovery is handed off')

    def test_a_no_fresh_question_stop_needs_only_the_original_answer(self):
        # that stop asks nothing with a deep: context: the saved answer on the original question is the recovery's start
        self.assertEqual(self.save(self.attempt('eq-d3', '1', activity='practice')).status_code, 201)
        r = self.report(original='eq-d3', episode='deep:eq-d3#2000-01-01T00:00:00Z', skill=SKILL + '-x', step='', path=[], reason='no-fresh-question')
        self.assertEqual(r.status_code, 201, r.content)

    def test_creation_is_validated_and_needs_a_saved_recovery(self):
        self.assertEqual(self.report(original='eq-d3', episode='deep:eq-d3#2000-01-01T00:00:00Z').status_code, 400, 'nothing saved for that question')
        self.assertEqual(self.report(episode='deep:eq-d9#2000-01-01T00:00:00Z').status_code, 400, 'the episode must be this recovery')
        self.assertEqual(self.report(episode='junk').status_code, 400)
        self.assertEqual(self.report(skill='bad skill').status_code, 400)
        self.assertEqual(self.report(detail='<script>').status_code, 400)
        self.assertEqual(self.report(detail='').status_code, 400)
        self.assertEqual(self.report(path=['x'] * 17).status_code, 400)
        self.assertEqual(RecoveryHandoff.objects.count(), 0)

    # ---------------------------------------------------------------- deduplication

    def test_one_open_item_per_learner_and_skill(self):
        self.assertEqual(self.report().status_code, 201)
        r = self.report(reason='budget-exhausted', detail='This recovery has used its effort limit.')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.report(episode=f'deep:{ORIG}#2000-02-01T00:00:00Z').status_code, 200, 'a new episode on the same skill joins the open item')
        h = RecoveryHandoff.objects.get()
        self.assertEqual((h.reports, h.reason, h.episode), (3, 'missing-content', f'deep:{ORIG}#2000-02-01T00:00:00Z'), 'the latest report wins')
        self.assertEqual(self.report(skill=SKILL + '-other').status_code, 201, 'another skill is another item')
        self.assertEqual(RecoveryHandoff.objects.count(), 2)

    def test_a_resolved_episode_is_not_reopened_but_a_new_one_is_reported(self):
        self.share()
        hid = self.report().json()['id']
        self.assertEqual(self.resolve(self.teacher, hid).status_code, 200)
        again = self.report()
        self.assertEqual((again.status_code, again.json()['status'], again.json()['id']), (200, 'resolved', hid), 'the learner going back to the stop screen')
        new = self.report(episode=f'deep:{ORIG}#2000-03-01T00:00:00Z')
        self.assertEqual((new.status_code, new.json()['status']), (201, 'open'), 'a later recovery that stops again is a new item')
        self.assertEqual(RecoveryHandoff.objects.count(), 2)

    # ---------------------------------------------------------------- access

    def test_only_the_shared_educator_sees_it(self):
        hid = self.report().json()['id']
        self.assertEqual(self.queue(self.teacher).json()['handoffs'], [], 'not shared yet')
        self.share()
        rows = self.queue(self.teacher).json()['handoffs']
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertTrue(row['learner'].startswith('Learner '))
        self.assertEqual((row['skill'], row['step'], row['reason'], row['status']), (SKILL, STEP, 'missing-content', 'open'))
        self.assertNotIn('Synthetic', str(row), 'no display name')
        self.assertNotIn('asha.parent', str(row), 'no parent email')
        self.assertEqual([e['questionId'] for e in row['evidence']], [ORIG, 'eq-d2'], 'the answers of this recovery only')
        self.assertEqual(row['evidence'][1]['step'], STEP)
        # others
        self.assertEqual(self.queue(self.other_teacher).json()['handoffs'], [], 'an educator the pupil was not shared with')
        self.assertEqual(self.queue(self.other_parent).status_code, 403, 'a parent is not an educator')
        self.assertEqual(self.queue(self.client).status_code, 403, 'the learner’s (parent’s) account is not an educator')
        self.assertEqual(self.mine(self.other_parent).status_code, 404, 'another parent cannot read this pupil')
        self.assertEqual(self.mine(self.teacher).status_code, 404, 'the educator does not read the learner endpoint')
        self.assertEqual(self.report(self.other_parent).status_code, 404, 'another parent cannot report for this pupil')
        self.assertEqual(self.report(self.teacher).status_code, 404)
        anon = APIClient()
        for r in (self.queue(anon), anon.get(f'/api/pupils/{self.pupil_id}/recovery-handoffs/'), self.resolve(anon, hid)):
            self.assertIn(r.status_code, (401, 403))
        self.assertEqual(self.resolve(self.other_teacher, hid).status_code, 403)
        self.assertEqual(self.resolve(self.other_parent, hid).status_code, 403)
        self.assertEqual(self.resolve(self.client, hid).status_code, 403, 'the learner cannot resolve their own hand-off')
        # a revoked share or a removed educator role ends it
        self.client.delete(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json')
        self.assertEqual(self.queue(self.teacher).json()['handoffs'], [])
        self.assertEqual(self.resolve(self.teacher, hid).status_code, 403)
        self.share()
        call_command('content_reviewer', 'revoke', 'teacher@example.org', role='educator', stdout=open('/dev/null', 'w'))
        self.assertEqual(self.queue(self.teacher).status_code, 403)
        self.assertFalse(self.mine().json()['educatorCanSee'], 'the learner is not told an educator can see it when none can')

    def test_the_learner_is_told_whether_an_educator_can_see_it(self):
        self.report()
        self.assertFalse(self.mine().json()['educatorCanSee'])
        self.share()
        self.assertTrue(self.mine().json()['educatorCanSee'])

    # ---------------------------------------------------------------- resolution

    def test_resolution_is_once_audited_and_shown_to_the_learner(self):
        self.share()
        hid = self.report().json()['id']
        self.assertEqual(self.mine().json()['handoffs'][0]['note'], '', 'no note before it is resolved')
        self.assertEqual(self.resolve(self.teacher, hid, note='<b>').status_code, 400)
        r = self.resolve(self.teacher, hid)
        self.assertEqual((r.status_code, r.json()['status']), (200, 'resolved'))
        self.assertEqual(self.resolve(self.teacher, hid).status_code, 409, 'once')
        mine = self.mine().json()['handoffs'][0]
        self.assertEqual((mine['status'], mine['resolvedBy'], mine['note']), ('resolved', 'educator', 'We went through equivalent fractions together.'))
        self.assertNotIn('teacher@example.org', str(mine), 'the educator is shown by role only')
        self.assertEqual(self.queue(self.teacher).json()['handoffs'][0]['status'], 'resolved')
        self.assertTrue(DiagnosticAccessLog.objects.filter(action='recovery-handoff-resolve', detail=f'handoff {hid}').exists())

    def test_resolution_changes_nothing_in_the_learners_records(self):
        self.share()
        before = list(PupilEvent.objects.filter(pupil_id=self.pupil_id).values_list('seq', 'body'))
        self.resolve(self.teacher, self.report().json()['id'])
        self.assertEqual(list(PupilEvent.objects.filter(pupil_id=self.pupil_id).values_list('seq', 'body')), before)
        self.assertEqual((WrittenMark.objects.count(), HandoverAcknowledgement.objects.count()), (0, 0), 'not a mark, not an acknowledgement')

    # ---------------------------------------------------------------- switch and old records

    @override_settings(OPENPATH_DEEP_RECOVERY_HANDOFF=False)
    def test_switched_off_everything_is_404_and_nothing_is_written(self):
        self.share()
        self.assertEqual(self.report().status_code, 404)
        self.assertEqual(self.mine().status_code, 404)
        self.assertEqual(self.queue(self.teacher).status_code, 404)
        self.assertEqual(self.resolve(self.teacher, 1).status_code, 404)
        self.assertEqual(RecoveryHandoff.objects.count(), 0)

    def test_existing_records_and_flows_are_unaffected(self):
        self.share()
        self.report()
        self.assertEqual(len(self.records()), 3, 'the learner’s records are only what was saved')
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/marking-share/').status_code, 200)
        self.assertEqual(self.teacher.get('/api/written/queue/').status_code, 200)
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/handover-acknowledgements/').json()['acknowledgements'], [])
        self.assertEqual(self.save(self.attempt('eq-d3', '1')).status_code, 201, 'learning records save as before')


class RecoveryHandoffDefaultTests(LearningBase):
    def test_off_by_default(self):
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/recovery-handoffs/').status_code, 404)
