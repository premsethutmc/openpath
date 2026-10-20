"""Small deterministic validator/probe adapter for the missing division workflow.

No estimates, diagnostic certainty or mastery thresholds. All content is provisional.
Fraction equivalence uses Python Fraction, as the existing mathematics service does.
"""
from fractions import Fraction
import math
from rest_framework.exceptions import ValidationError

CONTRACT = 'openpath-math-input@1'


def integer(v, low=0, high=100000000):
    if type(v) is not int or not low <= v <= high:
        raise ValidationError({'parameters': 'Use bounded nonnegative whole numbers and a positive divisor.'})
    return v


def cycles(a, b):
    remaining = 0
    out = []
    for i, digit in enumerate(str(a)):
        partial = remaining * 10 + int(digit)
        q, remaining = divmod(partial, b)
        if not out and not q and i < len(str(a)) - 1:
            continue
        out.append({'partial': partial, 'digit': q, 'product': q*b, 'difference': remaining,
                    'bring': remaining*10+int(str(a)[i+1]) if i+1 < len(str(a)) else None})
    return out


def lesson(topic, params):
    if not isinstance(params, dict): raise ValidationError({'parameters':'Expected problem parameters.'})
    if topic == 'division':
        a, b = integer(params.get('dividend', 379)), integer(params.get('divisor', 3), 1, 999999)
        rows = [{'id': 'quotient', 'label': 'Quotient', 'role': 'quotient'}]
        cs = cycles(a, b)
        for i, c in enumerate(cs, 1):
            rows.append({'id': f'product-{i}', 'label': f'Multiply: part {i}', 'role': 'product'})
            rows.append({'id': 'remainder' if i == len(cs) else f'difference-{i}', 'label': 'Remainder' if i == len(cs) else f'Subtract: part {i}', 'role': 'difference'})
            if c['bring'] is not None:
                rows.append({'id': f'bring-down-{i}', 'label': f'Bring down: part {i}', 'role': 'bring-down'})
        layout = {'id': 'division-working@1', 'version': 1, 'width': 720, 'height': max(900, len(rows)*85+120),
                  'regions': [{**r, 'order': i, 'x': 300, 'y': 35 if i == 0 else 150+(i-1)*85, 'width': 390, 'height': 65} for i, r in enumerate(rows)],
                  'guides': [{'text': str(b), 'x': 300-len(str(b))*22-20, 'y': 140}, {'text': str(a), 'x': 325, 'y': 140, 'letterSpacing': 16}],
                  'rules': [{'x1': 300, 'y1': 100, 'x2': 690, 'y2': 100}, {'x1': 300, 'y1': 100, 'x2': 300, 'y2': 145}]}
        example = cycles(248, 4)
        return {'version': 'writing-lessons@1', 'topic': topic, 'parameters': {'dividend': a, 'divisor': b}, 'problem': {'id': f'division:{a}:{b}', 'statement': f'{a} ÷ {b}'}, 'layout': layout,
                'competency': 'MATH.number.long-division', 'review': 'provisional',
                'explanation': 'Division asks how many equal groups fit. At each place: choose a quotient digit, multiply, subtract, then bring down the next digit. The remainder must be smaller than the divisor.',
                'example': {'statement': '248 ÷ 4', 'steps': [f"{c['partial']} ÷ 4: choose {c['digit']}; {c['digit']} × 4 = {c['product']}; subtract to leave {c['difference']}" for c in example], 'answer': '62 remainder 0'}}
    if topic == 'fraction':
        n, d = integer(params.get('numerator', 1), 1, 1000), integer(params.get('denominator', 2), 1, 1000)
        return {'version': 'writing-lessons@1', 'topic': topic, 'parameters': {'numerator': n, 'denominator': d}, 'problem': {'id': f'fraction:{n}:{d}', 'statement': f'Write a fraction equivalent to {n}/{d}'},
                'competency': 'MATH.number.equivalent-fractions', 'review': 'provisional',
                'layout': {'id': 'fraction-working@1', 'version': 1, 'width': 720, 'height': 500, 'regions': [{'id': 'answer', 'label': 'Equivalent fraction', 'role': 'expression', 'order': 0, 'x': 40, 'y': 80, 'width': 640, 'height': 350}]},
                'explanation': 'Multiply or divide the numerator and denominator by the same nonzero number. The amount stays the same, though the pieces change size.',
                'example': {'statement': '1/3 = 2/6', 'steps': ['Multiply top and bottom by 2.', 'Two sixth-sized pieces cover the same amount as one third-sized piece.'], 'answer': '2/6'}}
    raise ValidationError({'topic': 'Choose division or fraction.'})


def checked_work(w, draft, spec):
    if not isinstance(w, dict) or len(str(w)) > 8000000 or w.get('contract') != CONTRACT or w.get('id') != str(draft.pk) or w.get('problem') != spec['problem'] or w.get('layout') != spec['layout']:
        raise ValidationError({'work': 'Invalid writing contract, identity, problem or layout.'})
    if type(w.get('revision')) is not int or w['revision'] < 0 or (draft.work and w['revision'] < draft.work['revision']):
        raise ValidationError({'work': 'Stale work revision.'})
    for key in ['history','future']:
        if not isinstance(w.get(key),list) or len(w[key])>60:raise ValidationError({'work':'Invalid undo history.'})
    regions = {r['id'] for r in spec['layout']['regions']}
    for snap in [w, *w.get('history', []), *w.get('future', [])]:
        if not isinstance(snap, dict) or any(not isinstance(snap.get(k), list) for k in ['strokes', 'erased', 'tokens', 'corrections']):
            raise ValidationError({'work': 'Invalid input snapshot.'})
        if any(not isinstance(s,dict) or not isinstance(s.get('points'),list) for s in snap['strokes']):raise ValidationError({'work':'Invalid strokes.'})
        ids = set()
        if len(snap['strokes']) > 10000 or sum(len(s.get('points', [])) for s in snap['strokes']) > 200000:
            raise ValidationError({'work': 'Too much ink in one worksheet.'})
        for s in snap['strokes']:
            if not isinstance(s.get('id'), str) or s['id'] in ids or s.get('regionId') not in regions or not s.get('points'):
                raise ValidationError({'work': 'Invalid stroke or region.'})
            ids.add(s['id'])
            for p in s['points']:
                if not isinstance(p,dict):raise ValidationError({'work':'Invalid pen sample.'})
                if any(type(p.get(k)) not in (float, int) or not math.isfinite(p[k]) for k in ['x', 'y', 't', 'pressure', 'tiltX', 'tiltY', 'twist']) or not 0 <= p['pressure'] <= 1:
                    raise ValidationError({'work': 'Invalid pen sample.'})
        if any(not isinstance(x,str) for x in snap['erased']) or not set(snap['erased']) <= ids:
            raise ValidationError({'work': 'Unknown erased stroke.'})
        token_ids = set()
        for t in snap['tokens']:
            if not isinstance(t,dict) or t.get('origin') not in ['manual','recognition'] or (t.get('confidence') is not None and (type(t['confidence']) not in [float,int] or not 0<=t['confidence']<=1)):raise ValidationError({'work':'Invalid input metadata.'})
            if not isinstance(t.get('id'), str) or t['id'] in token_ids or t.get('regionId') not in regions or t.get('status') not in ['confirmed', 'accepted', 'uncertain'] or not isinstance(t.get('text'), str) or not 0 < len(t['text']) <= 500 or not isinstance(t.get('strokeIds'), list) or any(not isinstance(x,str) for x in t['strokeIds']) or not set(t['strokeIds']) <= ids:
                raise ValidationError({'work': 'Invalid interpreted input.'})
            token_ids.add(t['id'])
            bounds = t.get('bounds', {})
            if not isinstance(bounds,dict):raise ValidationError({'work':'Invalid symbol positions.'})
            if any(type(bounds.get(k)) not in (float, int) or not math.isfinite(bounds[k]) for k in ['x', 'y', 'width', 'height']):
                raise ValidationError({'work': 'Invalid symbol positions.'})
    if len(w.get('history', [])) > 60 or len(w.get('future', [])) > 60:
        raise ValidationError({'work': 'Undo history exceeds workspace limit.'})
    return w


def values(w):
    tokens = w['tokens']
    active = {s['id'] for s in w['strokes']} - set(w['erased'])
    linked = {s for t in tokens if t['status'] != 'uncertain' for s in t['strokeIds']}
    if any(t['status'] == 'uncertain' for t in tokens) or not active <= linked:
        return None
    out = {}
    for r in w['layout']['regions']:
        ts = sorted([t for t in tokens if t['regionId'] == r['id']], key=lambda t: (t['bounds']['x'], t['bounds']['y']))
        if ts:
            # A row of digits is concatenated by spatial position, not trusted display serialization.
            out[r['id']] = ''.join(t['text'] for t in ts).replace(' ', '').replace('−', '-')
    return out


def check(spec, w):
    v = values(w)
    if v is None:
        return {'outcome': 'input-clarification', 'region': next((t['regionId'] for t in w['tokens'] if t['status'] == 'uncertain'), spec['layout']['regions'][0]['id']), 'message': 'Please type the unclear input. This is not a mathematical mistake.', 'observations': []}
    obs = []
    def inspect(region, expected, operation, partial=None, position=None):
        raw = v.get(region, '')
        if position is not None:
            raw = raw[position:position+1]
        if not raw:
            return {'outcome': 'incomplete', 'region': region, 'message': 'Add this part of your working, then check again.', 'observations': obs}
        import re
        if position is not None and v.get(region, '').startswith('-'):
            obs.append({'region':region,'operation':operation,'expected':str(expected),'response':v[region],'correct':False,'position':position})
            return {'outcome':'incorrect','region':region,'operation':operation,'partial':partial,'position':position,'message':'A quotient digit cannot be negative here. Let’s check grouping.','observations':obs}
        if not raw.isascii() or not re.fullmatch(r'[+-]?\d+(?:\.\d+)?',raw, re.ASCII):
            return {'outcome': 'input-clarification', 'region': region, 'message': 'Type a nonnegative whole number for this part. No mathematical error recorded.', 'observations': obs}
        normalized=Fraction(raw)
        correct = normalized == expected
        obs.append({'region': region, 'operation': operation, 'expected': str(expected), 'response': str(normalized), 'correct': correct, 'position': position})
        if not correct:
            return {'outcome': 'incorrect', 'region': region, 'operation': operation, 'partial': partial, 'position': position, 'message': f'The first step to check is {operation}. Let’s find out which part needs support.', 'observations': obs}
    if spec['topic'] == 'division':
        a, b = spec['parameters']['dividend'], spec['parameters']['divisor']
        cs = cycles(a, b)
        for i, c in enumerate(cs, 1):
            for args in [('quotient', c['digit'], 'quotient selection', c['partial'], i-1), (f'product-{i}', c['product'], 'multiplication', c['partial'], None), ('remainder' if i == len(cs) else f'difference-{i}', c['difference'], 'subtraction', c['partial'], None)]:
                bad = inspect(*args)
                if bad: return bad
            if c['bring'] is not None:
                bad = inspect(f'bring-down-{i}', c['bring'], 'bringing down', c['partial'])
                if bad: return bad
        if len(v.get('quotient', '')) != len(cs):
            return {'outcome': 'incorrect', 'region': 'quotient', 'operation': 'quotient placement', 'partial': cs[0]['partial'], 'message': 'Check the number of quotient places.', 'observations': obs}
    else:
        raw = v.get('answer', '')
        if not raw: return {'outcome': 'incomplete', 'region': 'answer', 'message': 'Enter an equivalent fraction.', 'observations': []}
        import re
        if not re.fullmatch(r'\d{1,8}/[1-9]\d{0,7}', raw, re.ASCII):
            return {'outcome': 'input-clarification', 'region': 'answer', 'message': 'Type numerator/denominator, with a nonzero denominator. No maths error recorded.', 'observations': []}
        target = Fraction(spec['parameters']['numerator'], spec['parameters']['denominator'])
        correct = Fraction(raw) == target
        obs.append({'region': 'answer', 'operation': 'fraction equivalence', 'expected': str(target), 'response': str(Fraction(raw)), 'correct': correct, 'position': None})
        if not correct: return {'outcome': 'incorrect', 'region': 'answer', 'operation': 'fraction equivalence', 'message': 'Check whether both fractions represent the same amount.', 'observations': obs}
    return {'outcome': 'complete', 'message': 'All the entered operations agree. Practice complete; this is not verified mastery.', 'observations': obs}


def probes(spec, error):
    if spec['topic'] == 'fraction':
        n,d=spec['parameters']['numerator'],spec['parameters']['denominator']
        return [{'id':'scale-top','prompt':f'If the numerator {n} doubles, what does it become?','expected':2*n,'hypothesis':'numerator scaling'},{'id':'scale-bottom','prompt':f'To keep {n}/{d} unchanged when the numerator doubles, what must denominator {d} become?','expected':2*d,'hypothesis':'same factor for both parts'}]
    d = spec['parameters']['divisor']
    p = error.get('partial') if error.get('partial') is not None else d
    q = p // d
    return [{'id': 'groups', 'prompt': f'How many complete groups of {d} fit in {p} objects?', 'expected': q, 'hypothesis': 'equal grouping'}, {'id': 'facts', 'prompt': f'What is {q} × {d}?', 'expected': q*d, 'hypothesis': 'multiplication facts'}, {'id': 'choose', 'prompt': f'Choose the largest digit q with {d} × q ≤ {p}. What is q?', 'expected': q, 'hypothesis': 'quotient selection'}]


def teaching(spec, error, answers):
    ps = probes(spec, error)
    possible = [p['hypothesis'] for p in ps if answers.get(p['id']) != str(p['expected'])]
    if spec['topic'] == 'fraction':
        n,d=spec['parameters']['numerator'],spec['parameters']['denominator']
        explanation = f'Use the same factor on top and bottom. Doubling {n}/{d} makes {2*n}/{2*d}: twice as many pieces, each half the size. Compare the amounts, not just one number.'
        visual = {'groups': 2, 'size': 2, 'total': 4}
    else:
        d, partial = spec['parameters']['divisor'], error.get('partial') if error.get('partial') is not None else spec['parameters']['divisor']
        q, rem = divmod(partial, d)
        operation = error.get('operation')
        explanation = f'{q} groups of {d} use {q*d} of {partial}, leaving {rem}. Another group needs {d} objects, so {q+1} groups would use {(q+1)*d}, which is too many.'
        if operation == 'subtraction': explanation += f' For subtraction, compare {partial} − {q*d} = {rem}, one place at a time.'
        if operation == 'bringing down': explanation += ' Keep the remainder and bring down only the next dividend digit: remainder × 10 + next digit.'
        if operation == 'quotient placement': explanation += ' Keep quotient digits above their matching dividend place, including interior zeroes.'
        visual = {'groups': q, 'size': d, 'total': partial, 'remainder': rem}
    return {'status': 'possible-support-needs' if possible else 'unresolved-possible-slip', 'possible': possible, 'explanation': explanation, 'visual': visual, 'note': 'These provisional follow-ups guide practice. They do not confirm a misconception or grant mastery.'}
