"""Real sessions and canonical records; all identities are synthetic fixtures."""
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, TestCase, override_settings
from django.utils import timezone
from family.models import Pupil, PupilEvent
from .demo_student import COOKIE, PREFIX, TTL

middleware = [m for m in settings.MIDDLEWARE if not m.startswith('config.demo_student.')]
middleware.insert(middleware.index('django.contrib.sessions.middleware.SessionMiddleware'), 'config.demo_student.DemoCookieMiddleware')
middleware.insert(middleware.index('django.contrib.auth.middleware.AuthenticationMiddleware')+1, 'config.demo_student.DemoAccessMiddleware')

@override_settings(ROOT_URLCONF='config.preview_urls', MIDDLEWARE=middleware, ALLOWED_HOSTS=['testserver'])
class DemoStudentTests(TestCase):
    def setUp(self):
        self.c = Client(enforce_csrf_checks=True)
    def start(self, c=None, reset=False):
        c = c or self.c
        token = c.get('/api/preview-demo/bootstrap/', HTTP_X_OPENPATH_DEMO_STUDENT='1').json()['csrf']
        return c.post('/api/preview-demo/'+('reset/' if reset else 'start/'),
                      {'csrfmiddlewaretoken':token}, HTTP_X_OPENPATH_DEMO_STUDENT='1')
    def demo(self, path, c=None):
        return (c or self.c).get(path, HTTP_X_OPENPATH_DEMO_STUDENT='1')
    def test_one_click_identity_is_synthetic_and_starts_an_existing_lesson(self):
        r = self.start()
        self.assertEqual(r.status_code,200)
        self.assertIn('#writing/MATH.number.long-division',r.json()['url'])
        self.assertIn('subject%3Amathematics',r.json()['url'])
        self.assertIn(COOKIE,r.cookies)
        self.assertNotIn(settings.SESSION_COOKIE_NAME,r.cookies)
        pupil = Pupil.objects.get(pk=r.json()['learner'])
        self.assertFalse(pupil.parent.has_usable_password())
        self.assertFalse(pupil.parent.email)
        self.assertFalse(pupil.parent.is_staff)
        self.assertFalse(pupil.shared_for_diagnostics)
        enrol = pupil.events.get().body
        self.assertEqual(enrol['record'],'enrol')
        self.assertEqual(enrol['curriculum']['id'],'openpath-sample-mathematics-grade-4')
        self.assertNotIn('mastery',enrol)
        self.assertTrue(self.demo('/api/account/').json()['authenticated'])
    def test_resume_and_reset_only_current_visitor(self):
        a = self.start().json()['learner']
        other = Client(enforce_csrf_checks=True)
        b = self.start(other).json()['learner']
        self.assertNotEqual(a,b)
        self.assertEqual(self.start().json()['learner'],a)
        self.assertEqual(self.demo(f'/api/pupils/{b}/events/?subject=mathematics').status_code,403)
        self.assertEqual(self.start(reset=True).status_code,200)
        self.assertFalse(Pupil.objects.filter(pk=a).exists())
        self.assertTrue(Pupil.objects.filter(pk=b).exists())
    def test_demo_does_not_replace_real_account_session(self):
        user = get_user_model().objects.create_user(username='synthetic-owner', password='synthetic-owner-password')
        self.c.force_login(user)
        normal_cookie = self.c.cookies[settings.SESSION_COOKIE_NAME].value
        self.start()
        self.assertEqual(self.c.cookies[settings.SESSION_COOKIE_NAME].value,normal_cookie)
        self.assertEqual(self.c.get('/api/account/').wsgi_request.user.pk,user.pk)
        self.assertNotEqual(self.demo('/api/account/').wsgi_request.user.pk,user.pk)
        self.start(reset=True)
        self.assertTrue(get_user_model().objects.filter(pk=user.pk).exists())
        self.assertEqual(self.c.get('/api/account/').wsgi_request.user.pk,user.pk)
    def test_unknown_cookie_cannot_flush_a_real_account(self):
        owner = get_user_model().objects.create_user(username='synthetic-preserved-owner', password='synthetic-pass-3726')
        self.c.force_login(owner)
        key = self.c.cookies[settings.SESSION_COOKIE_NAME].value
        self.c.cookies[COOKIE] = key
        self.assertEqual(self.start(reset=True).status_code,200)
        self.assertEqual(self.c.get('/api/account/').wsgi_request.user.pk,owner.pk)
        from django.contrib.sessions.models import Session
        self.assertTrue(Session.objects.filter(session_key=key).exists())
    def test_cleanup_and_capacity_never_delete_normal_accounts(self):
        User = get_user_model()
        normal = User.objects.create_user(username='synthetic-normal',password='synthetic-pass')
        old = User.objects.create_user(username=PREFIX+'old',password=None)
        User.objects.filter(pk__in=[normal.pk,old.pk]).update(date_joined=timezone.now()-timedelta(seconds=TTL+1))
        self.start()
        self.assertTrue(User.objects.filter(pk=normal.pk).exists())
        self.assertFalse(User.objects.filter(pk=old.pk).exists())
        User.objects.bulk_create([User(username=PREFIX+str(i),password='!') for i in range(100)])
        other = Client(enforce_csrf_checks=True)
        self.assertEqual(self.start(other).status_code,429)
    def test_csrf_and_internal_gateway_are_required(self):
        self.assertEqual(self.c.post('/api/preview-demo/start/', HTTP_X_OPENPATH_DEMO_STUDENT='1').status_code,403)
        token = self.c.get('/api/preview-demo/bootstrap/').json()['csrf']
        self.assertEqual(self.c.post('/api/preview-demo/start/',{'csrfmiddlewaretoken':token}).status_code,403)
        self.assertEqual(Pupil.objects.count(),0)
    def test_demo_cannot_read_admin_accounts_other_subjects_or_change_curriculum(self):
        learner = self.start().json()['learner']
        for path in ['/api/content-review/','/api/developer/overview/', '/api/pupils/'+learner+'/export/',
                     f'/api/pupils/{learner}/events/?subject=english', '/api/account/password/']:
            self.assertEqual(self.demo(path).status_code,403,path)
        self.assertEqual(self.demo(f'/api/pupils/{learner}/events/?subject=mathematics').status_code,200)
        # A copied synthetic session cannot become a normal privileged account session.
        self.c.cookies[settings.SESSION_COOKIE_NAME] = self.c.cookies[COOKIE].value
        self.assertEqual(self.c.get('/api/account/').status_code,403)
    def test_expired_session_restarts_without_claiming_old_evidence(self):
        old = self.start().json()['learner']
        from django.contrib.sessions.models import Session
        Session.objects.filter(session_key=self.c.cookies[COOKIE].value).update(expire_date=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.demo('/api/account/').status_code,401)
        new = self.start().json()['learner']
        self.assertNotEqual(old,new)
        self.assertEqual(PupilEvent.objects.filter(pupil_id=new).count(),1)
    def test_resume_cannot_extend_the_identity_beyond_two_hours(self):
        first = self.start().json()
        pupil = Pupil.objects.get(pk=first['learner'])
        get_user_model().objects.filter(pk=pupil.parent_id).update(date_joined=timezone.now()-timedelta(hours=1))
        again = self.start().json()
        self.assertEqual(again['learner'],first['learner'])
        self.assertLessEqual(again['expiresIn'],3600)
        get_user_model().objects.filter(pk=pupil.parent_id).update(date_joined=timezone.now()-timedelta(hours=3))
        self.assertNotEqual(self.start().json()['learner'],first['learner'])
    def test_production_does_not_register_demo_endpoints(self):
        with override_settings(ROOT_URLCONF='config.urls'):
            self.assertEqual(self.c.get('/api/preview-demo/bootstrap/').status_code,404)
