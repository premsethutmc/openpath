"""Validate instructional receipts; no learner estimates or evidence eligibility are calculated here."""
import json
import re
from fractions import Fraction
from datetime import timedelta
from functools import lru_cache
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import PupilEvent

# Fixed programs, by id. An activity without "program" belongs to the fractions program (the first one, v2).
PROGRAM_FILES = {
    'equivalent-fractions': 'content/mathematics/programs/equivalent-fractions.v2.json',
    'jee-quadratics': 'content/mathematics/programs/jee-quadratics.v1.json',
}
# The fractions program's retention rule, as before; other programs say theirs in the file.
FRACTIONS_RETENTION = {'retentionAfter': 'transfer', 'retentionStage': 'retention'}


@lru_cache
def program(program_id):
    return json.loads((Path(settings.BASE_DIR).parent / PROGRAM_FILES[program_id]).read_text())


def lesson():
    return program('equivalent-fractions')


def checked_activity(event, pupil):
    program_id = event.get('program', 'equivalent-fractions')
    if program_id not in PROGRAM_FILES:
        raise ValidationError({'event': 'Unknown mathematics program.'})
    spec = program(program_id)
    allowed = {'kind', 'id', 'at', 'learnerId', 'journey', 'lessonVersion', 'action', 'stage', 'questionId', 'response', 'elapsedMs', 'sessionId', 'program'}
    if set(event) - allowed or event.get('kind') != 'math_activity' or event.get('learnerId') != str(pupil.pk) or (event.get('lessonVersion') != spec['version']):
        raise ValidationError({'event': 'Invalid mathematics version, owner or activity fields.'})
    if not isinstance(event.get('sessionId'), str) or not event['sessionId'].startswith(f'math:{pupil.pk}:') or len(event['sessionId']) > 160:
        raise ValidationError({'event': 'A mathematics visit must belong to this pupil.'})
    if event.get('journey') not in ({spec['track']} if 'track' in spec else {'school', 'jee-main', 'jee-advanced', 'gre-quant'}):
        raise ValidationError({'event': 'Unknown journey.'})
    stage = next((s for s in spec['stages'] if s['id'] == event.get('stage')), None)
    if not stage or event.get('action') not in {'open', 'draft', 'hint', 'solution', 'answer', 'complete'}:
        raise ValidationError({'event': 'Unknown fixed activity.'})
    duration = event.get('elapsedMs')
    if type(duration) not in (int, float) or not 0 <= duration <= 3600000:
        raise ValidationError({'event': 'Invalid duration.'})
    if event['action'] in {'draft', 'hint', 'solution', 'answer'} and event.get('questionId') not in stage['questions']:
        raise ValidationError({'event': 'Question is not part of this stage.'})
    if event['action'] in {'answer', 'draft'} and (not isinstance(event.get('response'), str) or len(event['response']) > 80):
        raise ValidationError({'event': 'Use an answer of at most 80 characters.'})
    kind = next((q.get('type', 'number') for q in spec['questions'] if q['id'] == event.get('questionId')), 'number')
    if event['action'] == 'answer' and kind == 'choice':
        if event['response'].strip().upper() not in {'A', 'B', 'C', 'D'}:
            raise ValidationError({'event': 'Choose one of A, B, C or D.'})
    elif event['action'] == 'answer' and kind == 'integer':
        if not re.fullmatch('[+-]?\\d{1,9}', event['response'].strip().replace('−', '-'), flags=re.ASCII):
            raise ValidationError({'event': 'Enter a whole number (an integer).'})
    elif event['action'] == 'answer':
        if not re.fullmatch('[+-]?\\d+(?:\\.\\d+)?(?:/[+-]?\\d+)?', event['response'].strip().replace('−', '-'), flags=re.ASCII):
            raise ValidationError({'event': 'Use a number, decimal or fraction.'})
        try:
            parts = event['response'].strip().replace('−', '-').split('/')
            Fraction(parts[0]) / Fraction(parts[1] if len(parts) == 2 else '1')
        except (ValueError, ZeroDivisionError):
            raise ValidationError({'event': 'Use a fraction with a nonzero denominator.'})
    prior = list(PupilEvent.objects.filter(pupil=pupil, subject='mathematics').values_list('body', flat=True))
    # each program keeps its own fixed sequence; activity ids are unique across all of them
    same = [e for e in prior if e.get('program', 'equivalent-fractions') == program_id]
    rule = {k: spec[k] for k in ('retentionAfter',) if k in spec} or FRACTIONS_RETENTION
    retention_stage = spec['stages'][-1]['id'] if 'retentionAfter' in spec else FRACTIONS_RETENTION['retentionStage']
    if any((e.get('id') == event['id'] for e in prior)):
        raise ValidationError({'event': 'This activity ID already exists. Reload to confirm a retry.'})
    own = [e for e in same if e.get('journey') == event['journey']]
    done = {e.get('stage') for e in own if e.get('action') == 'complete'}
    now = timezone.now()
    if stage['id'] == retention_stage and event['action'] != 'open':
        due = next((e.get('retentionDueAt') for e in own if e.get('retentionDueAt')), None)
        if not due or now < timezone.datetime.fromisoformat(due):
            raise ValidationError({'event': 'The delayed retention check is not due yet.'})
    if event['action'] == 'complete':
        index = next((i for i, s in enumerate(spec['stages']) if s['id'] == stage['id']))
        if any((s['id'] not in done for s in spec['stages'][:index])):
            raise ValidationError({'event': 'Finish the earlier fixed activities first.'})
        # a timed section may end with questions left unanswered (they score 0); every other stage needs each attempted
        if stage.get('kind') != 'timed' and any((not any((e.get('action') == 'answer' and e.get('questionId') == q for e in own)) for q in stage['questions'])):
            raise ValidationError({'event': 'Attempt each question before finishing the activity.'})
        if stage['id'] == retention_stage:
            due = next((e.get('retentionDueAt') for e in own if e.get('retentionDueAt')), None)
            if not due or now < timezone.datetime.fromisoformat(due):
                raise ValidationError({'event': 'The delayed retention check is not due yet.'})
    saved = {**event, 'at': now.isoformat(), 'savedAt': now.isoformat()}
    if event['action'] == 'complete' and stage['id'] == rule['retentionAfter']:
        previous = next((e.get('retentionDueAt') for e in own if e.get('retentionDueAt')), None)
        saved['retentionDueAt'] = previous or (now + timedelta(days=spec['retentionDelayDays'])).isoformat()
    return saved
