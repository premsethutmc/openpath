"""Fixed instructional progress only. No scoring, verification, or estimator policy."""
import json
import re
from fractions import Fraction
from pathlib import Path
from functools import lru_cache
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import PupilEvent

@lru_cache
def programs():
    return json.loads((Path(settings.BASE_DIR).parent / 'content/mathematics/foundation/programs.v1.json').read_text())['programs']

def checked_foundation(event, pupil):
    def reject(message):
        raise ValidationError({'event': message})
    allowed = {'kind', 'id', 'at', 'learnerId', 'sessionId', 'programId', 'lessonVersion', 'journey', 'action', 'stage', 'elapsedMs', 'questionId', 'response'}
    if set(event) - allowed or event.get('kind') != 'math_foundation_activity' or event.get('learnerId') != str(pupil.pk):
        reject('Invalid foundation owner or fields.')
    spec = next((p for p in programs() if p['id'] == event.get('programId')), None)
    if not spec or event.get('lessonVersion') != spec['version']:
        reject('Unknown fixed program version.')
    if event.get('journey') not in {'school', 'gre-quant', 'jee-main', 'jee-advanced'}:
        reject('Unknown journey.')
    if not isinstance(event.get('sessionId'), str) or not event['sessionId'].startswith(f'math:{pupil.pk}:') or len(event['sessionId']) > 160:
        reject('Invalid visit owner.')
    stage = next((s for s in spec['stages'] if s['id'] == event.get('stage')), None)
    action = event.get('action')
    if not stage or action not in {'open', 'draft', 'hint', 'answer', 'complete'}:
        reject('Unknown activity.')
    duration = event.get('elapsedMs')
    if type(duration) not in (int, float) or not 0 <= duration <= 3600000:
        reject('Invalid duration.')
    if action in {'answer', 'draft', 'hint'}:
        exploration = action == 'draft' and stage['id'] == 'explore' and event.get('questionId') in {'exploration', 'model'}
        if not exploration and event.get('questionId') not in stage['questions']:
            reject('Question outside stage.')
    if action in {'answer', 'draft'}:
        raw = event.get('response')
        if not isinstance(raw, str) or len(raw) > 80:
            reject('Answer must be a short string.')
        if action == 'answer':
            normalized = raw.strip().replace('−', '-')
            if not re.fullmatch(r'[+-]?\d+(?:\.\d+)?(?:/[+-]?\d+)?', normalized, flags=re.ASCII):
                reject('Enter a number or fraction.')
            try:
                a, *b = normalized.split('/')
                Fraction(a) / Fraction(b[0] if b else '1')
            except (ValueError, ZeroDivisionError):
                reject('The denominator must not be zero.')
    if action == 'draft' and event.get('questionId') == 'model':
        try:
            model = json.loads(event['response'])
            if not isinstance(model, list) or len(model) != 6 or any(type(x) is not int for x in model):
                raise ValueError()
            if not 0 <= model[0] <= 8 or not 0 <= model[1] <= 8:
                raise ValueError()
            if spec['model'] == 'groups' and not (1 <= model[0] <= 6 and 1 <= model[1] <= 6):
                raise ValueError()
            for denominator, numerator in [(model[2], model[3]), (model[4], model[5])]:
                if denominator not in [2, 3, 4, 6, 8, 12] or not 0 <= numerator <= denominator:
                    raise ValueError()
        except (ValueError, TypeError):
            reject('Invalid manipulative state.')
    prior = list(PupilEvent.objects.filter(pupil=pupil, subject='mathematics').values_list('body', flat=True))
    if any(e.get('id') == event.get('id') for e in prior):
        reject('Duplicate receipt. Reload to confirm your place.')
    own = [e for e in prior if e.get('kind') == 'math_foundation_activity' and e.get('programId') == spec['id'] and e.get('lessonVersion') == spec['version'] and e.get('journey') == event['journey']]
    now = timezone.now()
    due = next((e.get('retentionDueAt') for e in own if e.get('retentionDueAt')), None)
    if stage['id'] == 'retention' and action != 'open' and (not due or now < timezone.datetime.fromisoformat(due)):
        reject('Delayed review is not due yet. Completed work is preserved.')
    if action == 'complete':
        done = {e.get('stage') for e in own if e.get('action') == 'complete'}
        position = spec['stages'].index(stage)
        if any(s['id'] not in done for s in spec['stages'][:position]):
            reject('Finish the earlier fixed activities first.')
        if any(not any(e.get('action') == 'answer' and e.get('questionId') == q for e in own) for q in stage['questions']):
            reject('Try every question first. Correctness is not a completion score.')
        if stage['id'] == 'explore' and not any(e.get('questionId') == 'exploration' and e.get('response') == 'done' for e in own):
            reject('Try the interactive model first.')
    saved = {**event, 'at': now.isoformat(), 'savedAt': now.isoformat()}
    if action == 'complete' and stage['id'] == 'transfer':
        saved['retentionDueAt'] = due or (now + timedelta(days=spec['retentionDelayDays'])).isoformat()
    return saved
