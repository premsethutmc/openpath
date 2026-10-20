"""Authenticated activity/draft integration on the existing pupil and mathematics ledger."""
import uuid
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .views import AccountBase
from .models import Pupil, PupilEvent, WritingDraft
from .writing_math import lesson, checked_work, check, probes, teaching, CONTRACT


def receipt(draft, action, payload):
    # Caller holds the pupil row lock, the same lock as the existing event endpoint.
    # seq=0 is a real sequence position, not an empty stream.
    last = PupilEvent.objects.filter(pupil=draft.pupil, subject='mathematics').aggregate(n=Max('seq'))['n']
    seq = 0 if last is None else last+1
    if seq >= settings.OPENPATH_MAX_EVENTS_PER_PUPIL: raise ValidationError({'detail':'This learner record is full.'})
    at = timezone.now()
    body = {'kind': 'math_writing', 'id': str(uuid.uuid4()), 'at': at.isoformat(), 'learnerId': str(draft.pupil_id), 'draftId': str(draft.pk), 'journey': 'school', 'lessonVersion': 'writing-lessons@1', 'action': action, 'problem': lesson(draft.topic, draft.parameters)['problem'], 'contentStatus': 'provisional', 'assisted': bool(draft.support.get('helpSeen')), 'admissible': False, 'payload': payload}
    PupilEvent.objects.create(pupil=draft.pupil, subject='mathematics', seq=seq, kind='math_writing', occurred_at=at, body=body)
    return body


def output(d):
    return {'probe': next(({k:v for k,v in p.items() if k!='expected'} for p in probes(lesson(d.topic,d.parameters), d.support['error']) if p['id'] not in d.support.get('answers',{})),None) if d.stage=='diagnostic' else None, 'id': str(d.pk), 'version': d.version, 'stage': d.stage, 'work': d.work, 'lesson': lesson(d.topic, d.parameters), 'support': d.support,
            'receipts': [e for e in PupilEvent.objects.filter(pupil=d.pupil, subject='mathematics', kind='math_writing').order_by('seq').values_list('body', flat=True) if e.get('draftId') == str(d.pk)]}


def locked(request, pupil_id, draft_id):
    pupil = get_object_or_404(Pupil.objects.select_for_update(), pk=pupil_id, parent=request.user)
    return get_object_or_404(WritingDraft.objects.select_for_update(), pk=draft_id, pupil=pupil)


class WritingLessonsView(AccountBase):
    def post(self, request, pupil_id):
        spec = lesson(request.data.get('topic', 'division'), request.data.get('parameters', {}))
        with transaction.atomic():
            pupil = get_object_or_404(Pupil.objects.select_for_update(), pk=pupil_id, parent=request.user)
            d, created = WritingDraft.objects.get_or_create(pupil=pupil, problem_key=spec['problem']['id'], defaults={'topic': spec['topic'], 'parameters': spec['parameters']})
            if created: receipt(d, 'assigned', {'review': 'provisional'})
            return Response(output(d), status=201 if created else 200)


class WritingDraftView(AccountBase):
    def get(self, request, pupil_id, draft_id):
        d = get_object_or_404(WritingDraft, pk=draft_id, pupil__id=pupil_id, pupil__parent=request.user)
        return Response(output(d))

    def put(self, request, pupil_id, draft_id):
        with transaction.atomic():
            d = locked(request, pupil_id, draft_id)
            if type(request.data.get('version')) is not int or request.data['version'] != d.version:
                return Response({'detail': 'This draft changed on another device. Reload before editing.', 'version': d.version}, status=409)
            work = checked_work(request.data.get('work'), d, lesson(d.topic, d.parameters))
            if d.work and work['revision'] == d.work['revision'] and work != d.work:
                return Response({'detail': 'A work revision cannot be rewritten.'}, status=409)
            d.work = work
            if d.stage == 'complete' and work['revision'] != d.support.get('completedRevision'):
                d.stage = 'workspace'
            d.version += 1
            d.save()
            return Response({'version': d.version, 'revision': work['revision']})


class WritingActionView(AccountBase):
    def post(self, request, pupil_id, draft_id):
        with transaction.atomic():
            d = locked(request, pupil_id, draft_id)
            action = request.data.get('action')
            spec = lesson(d.topic, d.parameters)
            if action == 'next':
                if d.stage not in ['intro', 'worked']:
                    raise ValidationError({'action': 'The lesson is already open.'})
                d.stage = 'worked' if d.stage == 'intro' else 'workspace'
                receipt(d, 'instruction', {'stage': d.stage})
            elif action == 'probe':
                if d.stage != 'diagnostic': raise ValidationError({'action': 'No follow-up is open.'})
                expected = probes(spec, d.support['error'])
                answers = d.support.setdefault('answers', {})
                p = next((p for p in expected if p['id'] not in answers), None)
                raw = request.data.get('response')
                if not p or request.data.get('probeId') != p['id'] or not isinstance(raw, str) or len(raw) > 40:
                    raise ValidationError({'response': 'Answer the current follow-up.'})
                answers[p['id']] = raw.strip()
                receipt(d, 'probe', {'id': p['id'], 'response': raw, 'expected': str(p['expected']), 'correct': raw.strip() == str(p['expected']), 'hypothesisOnly': True})
                if len(answers) == len(expected):
                    d.support['teaching'] = teaching(spec, d.support['error'], answers)
                    d.stage = 'teaching'
                    receipt(d, 'teaching', d.support['teaching'])
            elif action == 'input-correction':
                if d.stage!='diagnostic':raise ValidationError({'action':'No interpretation is awaiting review.'})
                receipt(d,'input-correction',{'receiptId':d.support.get('lastValidation'),'reason':'Student disputes the transcription, not mathematical understanding.'})
                d.support['helpSeen']=d.support.get('helpBeforeError',False)
                d.stage='workspace'
            elif action == 'resume':
                if d.stage != 'teaching': raise ValidationError({'action': 'Finish the short follow-up first.'})
                d.stage = 'workspace'
            else: raise ValidationError({'action': 'Unknown lesson action.'})
            d.version += 1
            d.save()
            result = output(d)
            if d.stage == 'diagnostic':
                result['probe'] = next(({k: v for k, v in p.items() if k != 'expected'} for p in probes(spec, d.support['error']) if p['id'] not in d.support.get('answers', {})), None)
            return Response(result)


class WritingValidationView(AccountBase):
    def post(self, request, pupil_id, draft_id):
        with transaction.atomic():
            d = locked(request, pupil_id, draft_id)
            if not d.work:
                raise ValidationError({'detail': 'Open the working step first.'})
            if request.data.get('revision') != d.work['revision']:
                return Response({'detail': 'Work changed; save before checking.'}, status=409)
            prior=PupilEvent.objects.filter(pupil=d.pupil,subject='mathematics',kind='math_writing',body__draftId=str(d.pk),body__action='validation',body__payload__inputRevision=d.work['revision']).first()
            if prior:
                return Response({'feedback':prior.body['payload']['feedback'],'activity':output(d),'result':prior.body['payload']['result'],'receipt':prior.body['id']})
            if d.stage not in ['workspace','complete']:raise ValidationError({'detail':'Finish the current follow-up before checking again.'})
            spec = lesson(d.topic, d.parameters)
            result = check(spec, d.work)
            region = result.get('region', spec['layout']['regions'][0]['id'])
            response = {'contract': CONTRACT, 'workId': str(d.pk), 'revision': d.work['revision'], 'status': 'clarification' if result['outcome'] == 'input-clarification' else 'feedback', 'messages': [{'regionId': region, 'text': result['message'], 'kind': 'input-clarification' if result['outcome'] == 'input-clarification' else 'mathematical-feedback'}]}
            if result['outcome'] == 'input-clarification':
                return Response({'feedback': response, 'activity': output(d), 'result': result})
            # Record server-validated practice only in the one existing pupil event stream.
            disputed=[e.get('payload',{}).get('receiptId') for e in PupilEvent.objects.filter(pupil=d.pupil,subject='mathematics',kind='math_writing',body__action='input-correction').values_list('body',flat=True)]
            seen = PupilEvent.objects.exclude(body__id__in=disputed).filter(pupil=d.pupil, subject='mathematics', kind='math_writing', body__draftId=str(d.pk), body__action='validation').exists()
            body = receipt(d, 'validation', {'input': {k:v for k,v in d.work.items() if k not in ['history','future']}, 'inputRevision':d.work['revision'], 'feedback':response, 'result': result, 'afterFeedback': seen, 'competency': spec['competency']})
            if result['outcome'] == 'incorrect':
                d.support = {**d.support, 'helpBeforeError':bool(d.support.get('helpSeen')), 'lastValidation':body['id'], 'helpSeen': True, 'error': result, 'answers': {}}
                d.stage = 'diagnostic'
            elif result['outcome'] == 'complete':
                d.stage = 'complete'
                d.support['completedRevision'] = d.work['revision']
            d.support['lastResult'] = result
            d.version += 1
            d.save()
            activity = output(d)
            if d.stage == 'diagnostic':
                activity['probe'] = {k: v for k, v in probes(spec, result)[0].items() if k != 'expected'}
            return Response({'feedback': response, 'activity': activity, 'result': result, 'receipt': body['id']})
