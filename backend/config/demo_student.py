"""Preview-only, per-browser synthetic identities. No production URL registration."""
import json
import re
import uuid
from datetime import timedelta
from importlib import import_module
from pathlib import Path
from urllib.parse import urlencode
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST
from family.models import Pupil, PupilEvent, WritingDraft

PREFIX = 'openpath-preview-demo-'
COOKIE = 'openpath_demo_student'
TTL = 2 * 60 * 60

def synthetic(user):
    return (user.is_authenticated and user.username.startswith(PREFIX) and not user.email
            and not user.has_usable_password() and not user.is_staff and not user.is_superuser
            and not user.content_roles.exists())

def pupil_for(request):
    if not synthetic(request.user) or request.user.date_joined < timezone.now()-timedelta(seconds=TTL):
        return None
    return Pupil.objects.filter(pk=request.session.get('demo_pupil'), parent=request.user,
                                consent_policy='synthetic-preview-only').first()

def destination(pupil):
    latest = WritingDraft.objects.filter(pupil=pupil).order_by('-updated_at').first()
    competencies = {'division': 'MATH.number.long-division', 'fraction': 'MATH.number.equivalent-fractions',
                    'multiplication': 'MATH.number.multiplication-tables'}
    competency = competencies.get(latest.topic if latest else '', 'MATH.number.long-division')
    query = {'demo':'student','learner':str(pupil.pk),'writingReturn':'["subject:mathematics"]'}
    if latest and latest.support.get('simple',{}).get('round'):
        query.update(answerRound=latest.support['simple']['round'],answerTopic=latest.topic)
    return '/year/?' + urlencode(query) + '#writing/' + competency

@require_GET
def bootstrap(request):
    return JsonResponse({'csrf': get_token(request)})

@require_POST
def start(request):
    # This header is overwritten by the loopback-only Node gateway, never accepted from visitors.
    if request.headers.get('X-OpenPath-Demo-Student') != '1':
        return JsonResponse({'detail': 'Preview gateway required.'}, status=403)
    pupil = pupil_for(request)
    reset = request.path.endswith('/reset/')
    if reset and pupil:
        user = request.user
        request.session.flush()
        user.delete()  # only the current reserved, unusable-password synthetic identity
        pupil = None
    if not pupil:
        User = get_user_model()
        # Bounded cleanup, never touch normal accounts, including unusual accounts sharing the prefix.
        stale = User.objects.filter(username__startswith=PREFIX, email='', is_staff=False, is_superuser=False,
                                    date_joined__lt=timezone.now()-timedelta(seconds=TTL)).order_by('date_joined')[:100]
        for user in stale:
            if synthetic(user):
                user.delete()
        if User.objects.filter(username__startswith=PREFIX, date_joined__gte=timezone.now()-timedelta(seconds=TTL)).count() >= 100:
            return JsonResponse({'detail': 'Demo is busy. Please try again later.'}, status=429)
        # Detach, never flush an unknown/real account session accidentally sent in a demo cookie.
        request.session = import_module(settings.SESSION_ENGINE).SessionStore()
        with transaction.atomic():
            user = User.objects.create_user(username=PREFIX+uuid.uuid4().hex, password=None)
            pupil = Pupil.objects.create(parent=user, display_name='Synthetic Demo Student',
                                         consent_policy='synthetic-preview-only')
            releases = json.loads((Path(settings.BASE_DIR).parent/'content/learning/curricula/index.json').read_text())['releases']
            release = next(r for r in reversed(releases) if r['id']=='openpath-sample-mathematics-grade-4')
            now = timezone.now()
            event = {'kind':'learning_record', 'id':'lr-'+uuid.uuid4().hex, 'at':now.isoformat(),
                     'learnerId':str(pupil.pk), 'sessionId':f'learn:{pupil.pk}:preview', 'record':'enrol',
                     'grade':4, 'academicYear':f'{now.year}-{str(now.year+1)[-2:]}',
                     'curriculum':{k:release[k] for k in ('id','version','hash')}}
            from family.learning import checked_learning
            event = checked_learning(event, pupil)
            PupilEvent.objects.create(pupil=pupil, subject='mathematics', seq=0, kind='learning_record', occurred_at=now, body=event)
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        request.session['demo_pupil'] = str(pupil.pk)
    remaining = max(1, int((pupil.parent.date_joined+timedelta(seconds=TTL)-timezone.now()).total_seconds()))
    request.session.set_expiry(remaining)
    return JsonResponse({'demo':True, 'learner':str(pupil.pk), 'url':destination(pupil), 'expiresIn':remaining})

@require_GET
def status(request):
    pupil = pupil_for(request)
    return JsonResponse({'demo':bool(pupil), **({'learner':str(pupil.pk), 'url':destination(pupil)} if pupil else {})})

class DemoCookieMiddleware:
    """Separate Django session namespace; normal account cookies are never replaced."""
    def __init__(self, get_response): self.get_response = get_response
    def __call__(self, request):
        demo = request.headers.get('X-OpenPath-Demo-Student') == '1'
        if demo:
            request.COOKIES.pop(settings.SESSION_COOKIE_NAME, None)
            if COOKIE in request.COOKIES:
                request.COOKIES[settings.SESSION_COOKIE_NAME] = request.COOKIES[COOKIE]
        response = self.get_response(request)
        if demo and settings.SESSION_COOKIE_NAME in response.cookies:
            morsel = response.cookies.pop(settings.SESSION_COOKIE_NAME)
            response.cookies[COOKIE] = morsel.value
            for key, value in morsel.items():
                if value: response.cookies[COOKIE][key] = value
            response.cookies[COOKIE]['samesite'] = 'Strict'
        return response

class DemoAccessMiddleware:
    def __init__(self, get_response): self.get_response = get_response
    def __call__(self, request):
        if request.headers.get('X-OpenPath-Demo-Student') != '1':
            if synthetic(request.user):
                return JsonResponse({'detail':'Demo gateway required.'}, status=403)
            return self.get_response(request)
        path = request.path
        if path in {'/api/preview-demo/bootstrap/', '/api/preview-demo/start/', '/api/preview-demo/reset/'}:
            return self.get_response(request)
        pupil = pupil_for(request)
        if not pupil:
            return JsonResponse({'detail':'Demo session expired. Return to the preview entry to restart.'}, status=401)
        allowed = request.method == 'GET' and path in {'/api/account/', '/api/pupils/', '/api/preview-demo/status/'}
        match = re.fullmatch(r'/api/pupils/([^/]+)/(events/|writing/(?:[0-9a-f-]+/(?:action/|validate/)?)?)?', path)
        if match and match[1] == str(pupil.pk):
            route = match[2] or ''
            allowed = (request.method == 'GET' and route == '') or (route.startswith('writing/') and request.method in {'GET','POST','PUT'})
            if route == 'events/':
                allowed = request.method == 'GET' and request.GET.get('subject') == 'mathematics'
                if request.method == 'POST':
                    try:
                        body = json.loads(request.body)
                        event = body.get('event', {})
                        allowed = body.get('subject') == 'mathematics' and event.get('kind') == 'learning_record' and event.get('record') in {'attempt','teach'}
                    except (ValueError, AttributeError): allowed = False
        if not allowed:
            return JsonResponse({'detail':'This demo provides mathematics learning only.'}, status=403)
        return self.get_response(request)
