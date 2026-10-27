"""Rejection testing: take CORRECT reasoning steps from planner traces, corrupt each into an invalid transition,
and require the independent checker (check.step_ok: SymPy, domain-aware) to reject every one.
Ground truth for 'this mutant really is invalid' comes from a SECOND oracle (exact Fraction arithmetic, no SymPy),
so the checker is not graded by itself. Mutants the oracle cannot call invalid are excluded and counted.
Usage: python3 -I reject_test.py constructed.traces.json seeded500.traces.json out.json [N] [seed]"""
import json, sys, re, random, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fractions import Fraction as F
from check import step_ok
def oracle_affine(text):
    """Exact Fraction solver for an equation affine in x -> ('unique', s) | ('none',) | ('all',) | None if not affine/undefined."""
    l, r = text.split('=')
    code = lambda s: re.sub(r'\d+(\.\d+)?', lambda m: 'F("%s")' % m.group(), s)
    def f(xv):
        return eval(code(l), {'F': F, 'x': xv}) - eval(code(r), {'F': F, 'x': xv})
    try:
        f0, f1, f2 = f(F(0)), f(F(1)), f(F(2))
    except ZeroDivisionError:
        return None
    a = f1 - f0
    if f2 - f1 != a: return None
    if a == 0: return ('all',) if f0 == 0 else ('none',)
    return ('unique', -f0 / a)
def mutate(kind, text, rnd):
    l, r = text.split('=')
    if kind == 'off-by-one constant':
        ms = list(re.finditer(r'\d+(\.\d+)?', text))
        if not ms: return None
        m = rnd.choice(ms); v = F(m.group()) + 1
        return text[:m.start()] + (str(v) if v.denominator == 1 else m.group()+'1') + text[m.end():]
    if kind == 'multiply one side only': return f'{rnd.randint(2,5)}*({l})={r}'
    if kind == 'divide one side only': return f'({l})/{rnd.randint(2,5)}={r}'
    if kind == 'flip a + or - sign':
        ops = [m.start() for m in re.finditer(r'(?<=[\w)])[+-]', text)]
        if not ops: return None
        i = rnd.choice(ops); return text[:i] + ('-' if text[i] == '+' else '+') + text[i+1:]
    if kind == 'multiply both sides by 0': return f'0*({l})=0*({r})'
    if kind == 'multiply both sides by x': return f'x*({l})=x*({r})'
    if kind == 'divide both sides by x': return f'({l})/x=({r})/x'
    if kind == 'negate one side': return f'{l}=-({r})'
    raise ValueError(kind)
KINDS = ['off-by-one constant', 'multiply one side only', 'divide one side only', 'flip a + or - sign',
         'multiply both sides by 0', 'multiply both sides by x', 'divide both sides by x', 'negate one side']
def truly_invalid(kind, prev_text, mut):
    """Second oracle. True/False, or None if undecidable here."""
    pv = oracle_affine(prev_text)
    if pv is None: return None
    if kind == 'divide both sides by x': return True            # introduces the restriction x != 0 that the previous equation did not have
    if kind == 'multiply both sides by x':                       # solution set becomes {0} u sol(prev)
        return not (pv == ('all',) or pv == ('unique', F(0)))
    mv = oracle_affine(mut)
    if mv is None: return None
    return mv != pv
def main():
    paths, out = sys.argv[1:-1], sys.argv[-1]
    n_target = 1000; seed = 20261029
    steps = []
    for p in [a for a in paths if a.endswith('.json')]:
        for t in json.load(open(p)):
            if t['outcome'] != 'solved': continue
            prev = t['text']
            for st in t['steps']:
                steps.append((t['id'], prev, st['to'])); prev = st['to']
    rnd = random.Random(seed); rnd.shuffle(steps)
    stats = {k: {'injected': 0, 'invalid': 0, 'rejected': 0, 'excluded': 0} for k in KINDS}
    missed, ex = [], []
    i = 0
    while sum(s['injected'] for s in stats.values()) < n_target and i < len(steps) * 3:
        tid, prev, cur = steps[i % len(steps)]; i += 1
        kind = KINDS[i % len(KINDS)]
        mut = mutate(kind, cur, rnd)
        if mut is None: continue
        s = stats[kind]; s['injected'] += 1
        inv = truly_invalid(kind, prev, mut)
        if inv is not True:
            s['excluded'] += 1; continue
        s['invalid'] += 1
        if not step_ok(prev, mut): s['rejected'] += 1
        else: missed.append({'trace': tid, 'kind': kind, 'previous': prev, 'mutant': mut})
    tot = {k: sum(s[k] for s in stats.values()) for k in ['injected', 'invalid', 'rejected', 'excluded']}
    # sanity in the other direction: the checker must still ACCEPT the genuine steps (no blanket rejection)
    accept = sum(step_ok(p, c) for _, p, c in steps[:300])
    res = {'seed': seed, 'kinds': stats, 'total': tot, 'missed': missed, 'genuineStepsAccepted': accept, 'genuineStepsTried': min(300, len(steps))}
    json.dump(res, open(out, 'w'), indent=1)
    print(f"injected {tot['injected']}; truly invalid {tot['invalid']}; rejected {tot['rejected']}; excluded(not provably invalid) {tot['excluded']}; missed {len(missed)}; genuine accepted {accept}/{res['genuineStepsTried']}")
if __name__ == '__main__': main()
