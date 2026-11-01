"""Explicit persisted opt-in: validation, ownership and fresh-login history. No mastery in a goal event."""
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
