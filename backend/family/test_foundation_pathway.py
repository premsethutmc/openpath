"""Explicit persisted opt-in: validation, ownership and fresh-login history. No mastery in a goal event."""
from django.test import override_settings
from rest_framework.test import APIClient
from .test_learning import LearningBase
from .tests import PASSWORD

class FoundationPathwayTests(LearningBase):
    def test_choice_is_append_only_and_survives_fresh_login(self):
        self.assertEqual(self.save(self.enrol()).status_code, 201)
        choice = self.rec('foundation_pathway', policy='mathematics-pathway@1', target='MATH.number.addition', active=True)
        self.assertEqual(self.save(choice).status_code, 201)
        self.assertEqual(self.save(self.rec('foundation_pathway', policy='mathematics-pathway@1', target='MATH.number.addition', active=False)).status_code, 201)
        fresh = APIClient()
        self.assertEqual(fresh.post('/api/account/login/', {'email':'asha.parent@example.org','password':PASSWORD},format='json').status_code,200)
        data=fresh.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']
        self.assertEqual([e['active'] for e in data if e.get('record')=='foundation_pathway'],[True,False])
        self.assertFalse(any('decision' in e for e in data if e.get('record')=='foundation_pathway'))
        self.assertNotEqual(self.save(choice).status_code,201)

    def test_malformed_or_claimed_readiness_is_rejected_without_append(self):
        for target in ([], {}, None, 'MATH.does-not-exist'):
            self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target=target,active=True)).status_code,400)
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='unknown',target='MATH.number.addition',active=True)).status_code,400)
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.number.addition',active=True,readinessRoute=['MATH.algebra.linear-equations'])).status_code,400)
        self.assertEqual(self.records(),[])

    @override_settings(OPENPATH_GRADING='shadow')
    def test_opt_in_uses_trusted_decisions_without_changing_default_or_history(self):
        self.assertEqual(self.save(self.enrol()).status_code,201)
        self.assertEqual(self.save(self.rec('attempt',questionId='gen:ahtri:36,26',response='118',activity='diagnostic',hints=0,solution=False,competency='MATH.geometry.triangle-properties')).status_code,201)
        before=self.records()[-1]['decision']
        self.assertEqual(before['policy'],'legacy-policy@0')
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.geometry.triangle-properties',active=True)).status_code,201)
        self.assertEqual(self.save(self.rec('attempt',questionId='gen:ahtri:36,26',response='118',activity='diagnostic',hints=0,solution=False,competency='MATH.geometry.triangle-properties',working=['Use the triangle angle sum.'])).status_code,201)
        stored=self.records();self.assertEqual(stored[1]['decision'],before)
        self.assertEqual(stored[-1]['decision']['policy'],'grading-policy@1')
        self.assertEqual(stored[-1]['decision']['working']['status'],'unsupported')
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['gradingMode'],'unified')
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.geometry.triangle-properties',active=False)).status_code,201)
        self.assertEqual(self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['gradingMode'],'shadow')

    @override_settings(OPENPATH_GRADING='shadow')
    def test_recovery_retains_original_authority_after_opt_out(self):
        from unittest import mock
        from django.core.management import call_command
        import io
        self.assertEqual(self.save(self.enrol()).status_code,201)
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.geometry.triangle-properties',active=True)).status_code,201)
        event=self.rec('attempt',questionId='gen:ahtri:36,26',response='118',activity='diagnostic',hints=0,solution=False,competency='MATH.geometry.triangle-properties',working=['Use the triangle angle sum.'])
        with mock.patch('family.learning.kernel_decision',return_value=None),mock.patch('family.learning.grader_enabled',return_value=False):
            self.assertEqual(self.save(event).status_code,201)
        original=self.records()[-1]['decision']
        self.assertEqual(original['reason'],'unresolved.infrastructure')
        self.assertEqual(self.save(self.rec('foundation_pathway',policy='mathematics-pathway@1',target='MATH.geometry.triangle-properties',active=False)).status_code,201)
        call_command('regrade_unresolved',stdout=io.StringIO())
        data=self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()
        new=data['decisions'][event['id']]
        self.assertEqual(new['policy'],'grading-policy@1')
        self.assertEqual(new['supersedes'],original['decisionId'])
        self.assertEqual(new['working']['status'],'unsupported')
        self.assertEqual(self.records()[-2]['decision'],original)
