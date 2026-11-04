"""Educator access (educator-access@1): only an administrator grants or removes the educator role; the grant is the
same one marking already reads. Synthetic accounts and pupils only."""
from django.contrib.auth import get_user_model

from .models import ContentReviewer, DiagnosticAccessLog
from .test_learning import LearningBase

URL = '/api/educator-access/'
TASK = 'wr:irr:sqrt2'


class EducatorAccessTests(LearningBase):
    def setUp(self):
        super().setUp()  # self.client: a parent with one pupil
        self.admin = self.parent('admin@example.org')
        get_user_model().objects.filter(username='admin@example.org').update(is_superuser=True)
        self.teacher = self.parent('teacher@example.org')

    def grant(self, client, email='teacher@example.org'):
        return client.post(URL, {'email': email}, format='json')

    def remove(self, client, email='teacher@example.org'):
        return client.delete(URL, {'email': email}, format='json')

    def active(self, email='teacher@example.org'):
        return ContentReviewer.objects.filter(user__username=email, role='educator', revoked_at__isnull=True).exists()

    def test_an_administrator_grants_and_removes_the_educator_role(self):
        self.assertTrue(self.admin.get('/api/content-review/').json()['canManageEducators'])
        r = self.grant(self.admin)
        self.assertEqual(r.status_code, 201, r.content)
        self.assertTrue(r.json()['active'])
        self.assertTrue(self.active())
        self.assertEqual(self.teacher.get('/api/content-review/').json()['roles'], ['educator'])
        listed = self.admin.get(URL).json()['educators']
        self.assertEqual([(e['email'], e['active']) for e in listed], [('teacher@example.org', True)])
        self.assertEqual(self.remove(self.admin).status_code, 204)
        self.assertFalse(self.active())
        self.assertEqual(self.teacher.get('/api/content-review/').json()['roles'], [])
        self.assertEqual([(e['email'], e['active']) for e in self.admin.get(URL).json()['educators']], [('teacher@example.org', False)])
        # granting again restores the one grant (no duplicate rows); removing twice is refused
        self.assertEqual(self.grant(self.admin).status_code, 201)
        self.assertEqual(ContentReviewer.objects.filter(user__username='teacher@example.org', role='educator').count(), 1)
        self.assertEqual(self.remove(self.admin).status_code, 204)
        self.assertEqual(self.remove(self.admin).status_code, 400)
        # audited by account id, never the email
        log = list(DiagnosticAccessLog.objects.filter(action__startswith='educator-').values_list('action', 'detail'))
        self.assertEqual([a for a, _ in log].count('educator-grant'), 2)
        self.assertFalse(any('@' in d for _, d in log))

    def test_only_existing_active_accounts_can_be_granted(self):
        self.assertEqual(self.grant(self.admin, 'nobody@example.org').status_code, 400)
        self.assertEqual(self.grant(self.admin, '').status_code, 400)
        get_user_model().objects.filter(username='teacher@example.org').update(is_active=False)
        self.assertEqual(self.grant(self.admin).status_code, 400)
        self.assertFalse(ContentReviewer.objects.exists())

    def test_parents_learners_educators_and_release_managers_cannot_grant_or_remove(self):
        from django.core.management import call_command
        call_command('content_reviewer', 'grant', 'teacher@example.org', role='educator', stdout=open('/dev/null', 'w'))
        manager = self.parent('manager@example.org')
        call_command('content_reviewer', 'grant', 'manager@example.org', role='release-manager', stdout=open('/dev/null', 'w'))
        from rest_framework.test import APIClient
        anon = APIClient()
        staff = self.parent('staff@example.org')
        get_user_model().objects.filter(username='staff@example.org').update(is_staff=True)  # staff is not administrator
        for who, c in [('parent', self.client), ('educator', self.teacher), ('release manager', manager), ('staff', staff)]:
            self.assertFalse(c.get('/api/content-review/').json()['canManageEducators'], who)
            for r in (c.get(URL), self.grant(c, 'staff@example.org'), self.remove(c)):
                self.assertEqual(r.status_code, 403, (who, r.content))
        for r in (anon.get(URL), self.grant(anon), self.remove(anon)):
            self.assertIn(r.status_code, (401, 403))
        # learners have no account of their own (a pupil belongs to a parent's account), so the parent case covers them; nothing changed
        self.assertTrue(self.active())
        self.assertFalse(ContentReviewer.objects.filter(user__username='staff@example.org').exists())
        # an administrator whose account is deactivated is refused too
        get_user_model().objects.filter(username='admin@example.org').update(is_active=False)
        self.assertNotEqual(self.remove(self.admin).status_code, 204)
        self.assertTrue(self.active())

    def test_an_educator_granted_here_reaches_the_existing_marking_queue_and_loses_it_on_removal(self):
        self.assertEqual(self.grant(self.admin).status_code, 201)
        r = self.save(self.attempt(TASK, 'Suppose √2 = a/b in lowest terms …', activity='practice'))
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(self.client.post(f'/api/pupils/{self.pupil_id}/marking-share/', {'email': 'teacher@example.org'}, format='json').status_code, 201)
        q = self.teacher.get('/api/written/queue/')
        self.assertEqual(q.status_code, 200, q.content)
        rows = q.json()['queue']
        self.assertEqual([x['questionId'] for x in rows], [TASK])
        self.assertNotIn('Synthetic learning-year pupil', q.content.decode())  # still pseudonymous
        # the administrator sees grants, never pupils or answers
        self.assertNotIn('√2', self.admin.get(URL).content.decode())
        self.assertEqual(self.admin.get('/api/written/queue/').status_code, 403)
        self.assertEqual(self.remove(self.admin).status_code, 204)
        self.assertEqual(self.teacher.get('/api/written/queue/').status_code, 403)
        self.assertEqual(self.teacher.post('/api/written/marks/', {'pupil': self.pupil_id, 'attemptId': rows[0]['attemptId'], 'verdict': 'correct', 'score': 4, 'feedback': 'x'}, format='json').status_code, 403)
