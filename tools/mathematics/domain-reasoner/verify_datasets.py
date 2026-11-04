"""Second, SymPy-FREE oracle: exact Fraction evaluation of the equation text over a grid of rationals. For every stored
expectation it checks what can be checked by brute exact arithmetic, independently of domain_oracle.py:
  equations:    each expected solution satisfies L=R exactly; every excluded value makes a denominator zero (ZeroDivisionError);
                no grid point outside the excluded set satisfies L=R unless it is an expected solution; an identity holds at every
                non-excluded grid point; every 'rejected' candidate is excluded.
  transitions:  the claimed validity agrees with grid solution sets (equal sets <-> valid) and with set inclusion of restrictions.
  claims:       claimed values are tested by substitution; 'all' claims against the grid.
Also re-runs domain_oracle on every record and requires an exact match with the stored expectation (frozen file integrity).
Usage: python3 verify_datasets.py DATA_DIR OUT_JSON"""
import json, sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fractions import Fraction as F
import domain_oracle as O
GRID = sorted({F(n, d) for d in (1, 2, 3, 4, 5, 6) for n in range(-60 * d, 60 * d + 1)})
def compile_side(s):
    return compile(re.sub(r'\d+', lambda m: f'F({m.group()})', s.replace('^', '**')), '<eq>', 'eval')
def ev(code, xv):
    try: return eval(code, {'F': F, 'x': xv}), True
    except ZeroDivisionError: return None, False
def sides(text): l, r = text.split('='); return compile_side(l), compile_side(r)
def holds(cl, cr, xv):
    a, ok1 = ev(cl, xv); b, ok2 = ev(cr, xv)
    return (ok1 and ok2), (ok1 and ok2 and a == b)
def grid_solutions(text, X):
    cl, cr = sides(text); out = set(); defined = 0
    for g in GRID:
        if g in X: continue
        d, h = holds(cl, cr, g)
        if d: defined += 1
        if h: out.add(g)
    return out, defined
# ---- exact, SymPy-free solution sets via interpolation of g(x) = (L-R)(x) * prod_{v in X}(x-v)^3 ----
def padd(a, b): n = max(len(a), len(b)); return [(a[i] if i < len(a) else F(0)) + (b[i] if i < len(b) else F(0)) for i in range(n)]
def pmul(a, b):
    r = [F(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b): r[i + j] += x * y
    return r
def ptrim(a):
    while a and a[-1] == 0: a = a[:-1]
    return a
def pdivmod(a, b):
    a = ptrim(a[:]); b = ptrim(b); q = [F(0)] * max(1, len(a) - len(b) + 1)
    while len(a) >= len(b) and a:
        c = a[-1] / b[-1]; d = len(a) - len(b); q[d] = c
        for i, y in enumerate(b): a[i + d] -= c * y
        a = ptrim(a)
    return ptrim(q), a
def pgcd(a, b):
    a, b = ptrim(a), ptrim(b)
    while b: a, b = b, pdivmod(a, b)[1]
    return [c / a[-1] for c in a] if a else a
def pder(a): return ptrim([i * a[i] for i in range(1, len(a))])
def interpolate(xs, ys):
    poly = [F(0)]
    for i, (xi, yi) in enumerate(zip(xs, ys)):
        num, den = [F(1)], F(1)
        for j, xj in enumerate(xs):
            if j != i: num = pmul(num, [-xj, F(1)]); den *= (xi - xj)
        poly = padd(poly, [c * yi / den for c in num])
    return ptrim(poly)
def peval(a, x): return sum(c * x ** i for i, c in enumerate(a))
PTS = [F(101 + 3 * i) for i in range(24)]
def exact_sol(text, X):
    """-> ('all',) | ('set', monic squarefree polynomial of the real-root candidates outside X) | None (not polynomial / undecidable)."""
    cl, cr = sides(text); ys = []
    for xv in PTS:
        a, ok1 = ev(cl, xv); b, ok2 = ev(cr, xv)
        if not (ok1 and ok2): return None
        m = F(1)
        for v in X: m *= (xv - v) ** 3
        ys.append((a - b) * m)
    poly = interpolate(PTS[:20], ys[:20])
    if any(peval(poly, xv) != y for xv, y in zip(PTS[20:], ys[20:])): return None     # not a polynomial of low degree (e.g. a pole outside X)
    if not poly: return ('all',)
    for v in sorted(X):                                                                  # remove every factor (x-v)
        while True:
            q, r = pdivmod(poly, [-v, F(1)])
            if r: break
            poly = q
    if len(poly) <= 1: return ('set', [])                                                # nonzero constant: no solutions
    g = pgcd(poly, pder(poly)); sf = pdivmod(poly, g)[0] if len(g) > 1 else poly
    return ('set', [c / sf[-1] for c in sf])
def exact_roots_linear(res):
    if res is None or res[0] != 'set': return None
    p = res[1]
    if len(p) == 0 or len(p) == 1: return []
    if len(p) == 2: return [-p[0] / p[1]]
    return None
def check_equation(it, problems):
    t = it['text']; cl, cr = sides(t); X = {F(v) for v in (it['excluded'] or [])}
    if it['supported']:
        for v in X:
            d, _ = holds(cl, cr, v)
            if d: problems.append(f"excluded value {v} does not make a denominator zero")
        for v in it['rejected'] or []:
            if F(v) not in X: problems.append(f"rejected candidate {v} not excluded")
        gs, defined = grid_solutions(t, X)
        if it['class'] == 'identity-on-domain':
            if len(gs) != defined: problems.append("identity: some defined grid point fails")
        else:
            expect = {F(v) for v in it['solution']}
            for v in expect:
                d, h = holds(cl, cr, v)
                if not (d and h): problems.append(f"expected solution {v} does not satisfy the equation")
            extra = {g for g in gs if g not in expect}
            if extra: problems.append(f"grid solutions not in expected set: {sorted(map(str, extra))[:3]}")
            missing = {g for g in expect if g in GRID and g not in gs}
            if missing: problems.append(f"expected solutions missing on grid: {sorted(map(str, missing))[:3]}")
    if it['supported']:
        ex = exact_sol(t, X)
        if ex is None: problems.append("exact method could not interpolate")
        elif it['class'] == 'identity-on-domain':
            if ex != ('all',): problems.append(f"exact method: not an identity ({ex})")
        else:
            roots = exact_roots_linear(ex)
            want = sorted(F(v) for v in it['solution'])
            if roots is None or sorted(roots) != want: problems.append(f"exact method roots {roots} != stored {want}")
    a = O.analyse(t)
    for k in ['class', 'solution', 'excluded', 'candidates', 'rejected', 'removable', 'tags', 'reducedDegree', 'domainOps', 'supported', 'reasons']:
        if a[k] != it[k] and not (k == 'tags' and sorted(a[k]) == sorted([x for x in it[k] if x != 'legacy-refused'])):
            problems.append(f"stored {k}={it[k]} but oracle says {a[k]}")
def check_transition(tr, problems):
    X1 = {F(v) for v in tr['from']['excluded']}; X2 = {F(v) for v in tr['to']['excluded']}
    s1, _ = grid_solutions(tr['from']['eq'], X1); s2, _ = grid_solutions(tr['to']['eq'], X2)
    inclusion = X1 <= X2
    cl, cr = sides(tr['to']['eq'])
    closure_ok = True
    # closure on the grid: a grid point where the TO-equation is undefined must be a recorded restriction
    for g in GRID:
        if g in X2: continue
        d, _ = holds(cl, cr, g)
        if not d: closure_ok = False; break
    e1, e2 = exact_sol(tr['from']['eq'], X1), exact_sol(tr['to']['eq'], X2)
    if e1 is not None and e2 is not None:
        same = (e1 == e2) and (e1 != ('all',) or X1 == X2)
        grid_valid = inclusion and closure_ok and same
    else:
        grid_valid = inclusion and closure_ok and s1 == s2
    if grid_valid != tr['expectedValid']:
        # the grid can miss differences outside it (irrational / large values); only a VALID verdict from the grid vs invalid expectation
        # with reasons that are not grid-visible is tolerated, and counted
        if tr['expectedValid'] is False and grid_valid and tr['reasons'] == ['solution-set-changed'] and (e1 is None or e2 is None): return 'not-witnessed-on-grid'
        problems.append(f"grid says valid={grid_valid} but expected {tr['expectedValid']} ({tr['reasons']})")
    ok, why = O.step_check(tr['from'], tr['to'])
    if ok != tr['expectedValid'] or why != tr['reasons']: problems.append(f"oracle now says {ok} {why}")
def check_claim(c, problems):
    X = {F(v) for v in O.excluded_values(c['text'])[0]}
    ex = exact_sol(c['text'], X); claimed = c['claimed']
    if ex is None: problems.append("exact method could not interpolate"); return
    if ex == ('all',): ok = (claimed == 'all-except-excluded')
    elif claimed in ('all-except-excluded', 'all-real'): ok = False
    else:
        roots = exact_roots_linear(ex)
        if roots is None: problems.append("exact roots undecidable"); return
        ok = sorted(F(v) for v in claimed) == sorted(roots)
    if ok != c['expectedValid']: problems.append(f"independent exact check says valid={ok} but expected {c['expectedValid']}")
def main():
    d, out = sys.argv[1], sys.argv[2]
    res = {}
    for name, fn in [('dev.json', check_equation), ('eval.json', check_equation), ('holdout.json', check_equation), ('unsupported.json', check_equation),
                     ('adversarial.json', check_transition), ('claims.json', check_claim)]:
        items = json.load(open(os.path.join(d, name))); bad = []; nw = 0
        for it in items:
            pr = []; r = fn(it, pr)
            if r == 'not-witnessed-on-grid': nw += 1
            if pr: bad.append({'id': it['id'], 'problems': pr})
        res[name] = {'items': len(items), 'withProblems': len(bad), 'notWitnessedOnGrid': nw, 'examples': bad[:5]}
        print(f"{name}: {len(items)} items, {len(bad)} with problems, {nw} invalid-by-reason-not-visible-on-grid")
    json.dump(res, open(out, 'w'), indent=1)
    sys.exit(0 if all(v['withProblems'] == 0 for v in res.values()) else 1)
if __name__ == '__main__': main()
