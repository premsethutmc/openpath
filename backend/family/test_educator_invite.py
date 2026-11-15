"""educator-invite@1: a parent shares written work with an educator by the educator's code, without knowing their email;
any account can ask for the educator role and an administrator grants or declines it. Synthetic accounts only."""
from django.contrib.auth import get_user_model
from django.core.management import call_command

from .models import DiagnosticAccessLog, EducatorRequest, MarkingShare
from .test_learning import LearningBase


class EducatorCodeTests(LearningBase):
    def setUp(self):
        super().setUp()  # self.client: a parent with one pupil
        self.teacher = self.parent('teacher@example.org')
        self.stranger = self.parent('not-an-educator@example.org')
        call_command('content_reviewer', 'grant', 'teacher@example.org', role='educator', stdout=open('/dev/null', 'w'))

    def share(self, code, client=None):
        return (client or self.client).post(f'/api/pupils/{self.pupil_id}/marking-share/', {'code': code}, format='json')

    def code(self):
        r = self.teacher.get('/api/written/my-code/')
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()['code']

    def test_an_educator_has_a_stable_code_and_others_have_none(self):
        c = self.code()
        self.assertRegex(c, r'^[A-Z2-7]{4}-[A-Z2-7]{4}$')
        self.assertEqual(c, self.code(), 'the code does not change between visits')
        self.assertEqual(self.stranger.get('/api/written/my-code/').status_code, 403)
        self.assertEqual(self.client.get('/api/written/my-code/').status_code, 403)

    def test_a_parent_shares_by_code_in_any_case_and_spacing(self):
        c = self.code()
        r = self.share(' ' + c.lower().replace('-', ' ') + ' ')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['email'], 'teacher@example.org')
        self.assertEqual(MarkingShare.objects.filter(pupil_id=self.pupil_id, reviewer__username='teacher@example.org', revoked_at__isnull=True).count(), 1)
        self.assertEqual(self.share(c).status_code, 201)
        self.assertEqual(MarkingShare.objects.filter(pupil_id=self.pupil_id, revoked_at__isnull=True).count(), 1, 'sharing twice keeps one share')
        self.assertEqual(len(self.teacher.get('/api/written/queue/').json()['queue']), 0)

    def test_a_wrong_code_or_a_removed_educator_is_refused_without_revealing_anything(self):
        c = self.code()
        for bad in ('', 'ABCD', 'AAAA-AAAA', c[:-1] + ('A' if c[-1] != 'A' else 'B')):
            r = self.share(bad) if bad else self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'code': ''}, format='json')
            self.assertEqual(r.status_code, 400, bad)
            self.assertNotIn('teacher@example.org', r.content.decode())
        call_command('content_reviewer', 'revoke', 'teacher@example.org', role='educator', stdout=open('/dev/null', 'w'))
        self.assertEqual(self.share(c).status_code, 400, 'the code stops working when the role is removed')

    def test_an_educator_cannot_share_their_own_pupil_with_themselves(self):
        own = self.pupil(self.teacher, 'Synthetic own pupil')
        r = self.teacher.post(f"/api/pupils/{own}/marking-share/", {'code': self.code()}, format='json')
        self.assertEqual(r.status_code, 400)


class EducatorRequestTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.admin = self.parent('admin@example.org')
        get_user_model().objects.filter(username='admin@example.org').update(is_superuser=True)
        self.teacher = self.parent('teacher@example.org')

    def test_an_account_asks_and_an_administrator_grants(self):
        self.assertEqual(self.teacher.get('/api/educator-request/').json()['status'], 'none')
        r = self.teacher.post('/api/educator-request/')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()['status'], 'pending')
        self.teacher.post('/api/educator-request/')
        self.assertEqual(EducatorRequest.objects.filter(user__username='teacher@example.org').count(), 1, 'one open request')
        reqs = self.admin.get('/api/educator-access/').json()['requests']
        self.assertEqual([x['email'] for x in reqs], ['teacher@example.org'])
        self.assertEqual(self.admin.post('/api/educator-access/', {'email': 'teacher@example.org'}, format='json').status_code, 201)
        self.assertEqual(self.admin.get('/api/educator-access/').json()['requests'], [], 'granting settles the request')
        self.assertEqual(self.teacher.get('/api/educator-request/').json()['status'], 'educator')
        self.assertEqual(self.teacher.post('/api/educator-request/').status_code, 400)
        self.assertEqual(self.teacher.get('/api/written/my-code/').status_code, 200)

    def test_an_administrator_declines_and_the_account_may_ask_again(self):
        self.teacher.post('/api/educator-request/')
        self.assertEqual(self.teacher.post('/api/educator-access/decline/', {'email': 'teacher@example.org'}, format='json').status_code, 403, 'only an administrator declines')
        self.assertEqual(self.admin.post('/api/educator-access/decline/', {'email': 'teacher@example.org'}, format='json').status_code, 204)
        self.assertEqual(self.teacher.get('/api/educator-request/').json()['status'], 'declined')
        self.assertEqual(self.admin.post('/api/educator-access/decline/', {'email': 'teacher@example.org'}, format='json').status_code, 400)
        self.assertEqual(self.teacher.post('/api/educator-request/').json()['status'], 'pending')
        self.assertTrue(DiagnosticAccessLog.objects.filter(action='educator-decline').exists())
        self.assertFalse(DiagnosticAccessLog.objects.filter(detail__contains='@').exists(), 'the audit log keeps account ids, not emails')

    def test_asking_needs_a_signed_in_account(self):
        from rest_framework.test import APIClient
        self.assertIn(APIClient().post('/api/educator-request/').status_code, (401, 403))
