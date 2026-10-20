"""Versioned usage/checkpoint receipts in the existing pupil stream, never admissible learning evidence."""
import json
from pathlib import Path
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .learning import content
from .models import PupilEvent


def checked_session(event, pupil):
    def reject(message):
        raise ValidationError({'event': message})
    allowed = {'kind', 'version', 'id', 'at', 'learnerId', 'sessionId', 'planId', 'action', 'plan', 'competency', 'usage', 'drafts'}
    if set(event) - allowed or event.get('version') != 'math-session@1' or event.get('learnerId') != str(pupil.pk):
        reject('Invalid operational session owner, version or fields.')
    if not isinstance(event.get('sessionId'), str) or (not event['sessionId'].startswith(f'learn:{pupil.pk}:') or len(event['sessionId']) > 160):
        reject('Invalid learner visit.')
    if not isinstance(event.get('planId'), str) or len(event['planId']) > 80 or not event['planId']:
        reject('Invalid plan reference.')
    action = event.get('action')
    if not isinstance(action, str) or action not in {'plan', 'checkpoint', 'time', 'finish'}:
        reject('Unknown session action.')
    base = {'kind', 'version', 'id', 'at', 'learnerId', 'sessionId', 'planId', 'action'}
    fields = {'plan': {'plan'}, 'checkpoint': {'competency', 'drafts'}, 'time': {'competency', 'usage'}, 'finish': {'competency'}}
    if set(event) != base | fields[action]:
        reject('Invalid fields for this session action.')
    prior = [r.body for r in PupilEvent.objects.filter(pupil=pupil, subject='mathematics').order_by('seq')]
    if any(r.get('id') == event['id'] for r in prior):
        reject('This session receipt is already saved.')
    plans = [r['plan'] for r in prior if r.get('kind') == 'math_session' and r.get('action') == 'plan' and r.get('planId') == event['planId']]
    plan = event.get('plan') if action == 'plan' else (plans[0] if plans else None)
    if action == 'plan':
        if plans or not isinstance(plan, dict) or set(plan) != {'id', 'scope', 'curriculum', 'budgetMinutes', 'modules'} or plan['id'] != event['planId']:
            reject('Invalid or duplicate fixed plan.')
        if not isinstance(plan['scope'], str) or plan['scope'] not in {'school', 'gre-quant', 'jee-main', 'jee-advanced'} or type(plan['budgetMinutes']) is not int or plan['budgetMinutes'] not in {15, 30, 45, 60}:
            reject('Invalid scope or budget.')
        ref = plan['curriculum']
        enrol = next((r for r in reversed(prior) if r.get('kind') == 'learning_record' and r.get('record') == 'enrol'), None)
        if not enrol or ref != enrol.get('curriculum'):
            reject('Use the learner selected curriculum.')
        if not isinstance(plan['modules'], list) or not 1 <= len(plan['modules']) <= 12:
            reject('A plan needs 1–12 registered modules.')
        root = Path(settings.BASE_DIR).parent
        if plan['scope'] == 'school':
            releases = [r.get('release') for r in prior if r.get('record') == 'curriculum']
            releases += [json.loads(p.read_text()) for p in (root / 'content/learning/curricula').glob('*.json') if p.name != 'index.json']
            release = next((r for r in releases if r and all(r.get(k) == ref.get(k) for k in ('id', 'version', 'hash'))), None)
            eligible = set()
            def visit(node):
                if isinstance(node, dict):
                    for m in node.get('mapping', {}).get('competencies', []):
                        if m.get('status') == 'accepted':
                            eligible.add(m['id'])
                    for value in node.values():
                        visit(value)
                elif isinstance(node, list):
                    for value in node:
                        visit(value)
            visit(release)
        else:
            tracks = json.loads((root / 'content/mathematics/exam-tracks.v1.json').read_text())['tracks']
            eligible = {m['competencyId'] for t in tracks if t['id'] == plan['scope'] for m in t['syllabusMapping']}
        seen = set()
        for m in plan['modules']:
            if not isinstance(m, dict) or set(m) != {'competency', 'estimatedMs', 'source'} or not isinstance(m.get('competency'), str) or m.get('competency') not in content()['modules'] or m.get('competency') not in eligible or not isinstance(m.get('source'), str) or m.get('source') not in {'history', 'default'} or type(m.get('estimatedMs')) is not int or not 60000 <= m['estimatedMs'] <= 2400000 or m['competency'] in seen:
                reject('Invalid module or estimate.')
            seen.add(m['competency'])
        if sum(m['estimatedMs'] for m in plan['modules']) > plan['budgetMinutes'] * 60000:
            reject('Plan exceeds budget.')
    elif 'plan' in event or not plan:
        reject('A saved plan is required.')
    ids = {m['competency'] for m in plan['modules']}
    if event.get('competency') is not None and (not isinstance(event['competency'], str) or event['competency'] not in ids):
        reject('Competency is outside the fixed plan.')
    if action in {'time', 'finish'} and event.get('competency') not in ids:
        reject('A module reference is required.')
    if 'usage' in event:
        u = event['usage']
        if not isinstance(u, dict) or set(u) != {'activeMs', 'idleMs', 'solvingMs', 'helpCount'} or any(type(x) is not int or x < 0 for x in u.values()) or u['activeMs'] > 86400000 or u['idleMs'] > 31536000000 or u['solvingMs'] > u['activeMs'] or u['helpCount'] > 100:
            reject('Invalid usage interval (at most one active day and one idle year).')
    elif action == 'time':
        reject('Time interval required.')
    if 'drafts' in event:
        drafts = event['drafts']
        if not isinstance(drafts, dict) or len(drafts) > 50:
            reject('Invalid draft map.')
        for key, d in drafts.items():
            if not isinstance(key, str) or len(key) > 200 or not isinstance(d, dict) or set(d) != {'value', 'working', 'hint'} or not isinstance(d['value'], str) or len(d['value']) > 100 or not isinstance(d['working'], str) or len(d['working']) > 4000 or type(d['hint']) is not bool:
                reject('Invalid answer draft.')
    if action == 'finish' and any(r.get('kind') == 'math_session' and r.get('planId') == event['planId'] and r.get('action') == 'finish' and r.get('competency') == event['competency'] for r in prior):
        reject('This activity is already complete.')
    return {**event, 'at': timezone.now().isoformat()}
