"""Independent check of the teacher examples with SymPy (no evaluator code). For each example it derives the outcome from exact solution sets:
a line's meaning = its solutions over R minus (original exclusions U its own denominators' zeros U case assumptions); steps are equal / gain / loss;
the final claim is compared with the original problem. Usage: python3 check_teacher.py   (exit 1 on any disagreement with the stated outcome)"""
import sys, os, re, json
for p in os.environ.get("VENDOR", "/home/claude/vendor/sympy:/home/claude/vendor/mpmath").split(":"): sys.path.insert(0, p)
from sympy import symbols, Rational, S, FiniteSet, Complement, solveset, Reals, together, fraction, Poly, sympify
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, convert_xor, implicit_multiplication_application
x = symbols('x'); TR = standard_transformations + (convert_xor, implicit_multiplication_application)
G = [(r'[−–—]', '-'), (r'[×·⋅∙∗]', '*'), (r'[÷∕⁄]', '/')]
def clean(s):
    for a, b in G: s = re.sub(a, b, s)
    return s.strip()
def P(s): return parse_expr(clean(s), local_dict={'x': x}, transformations=TR)
def excl(expr):
    out = set()
    for den in [fraction(together(t))[1] for t in expr.as_ordered_terms()] + [fraction(together(expr))[1]]:
        if den.has(x):
            for r in solveset(den, x, Reals): out.add(r)
    return out
def parts(eq):
    l, r = eq.split('='); return P(l), P(r)
def den_zeros(eq):
    out = set(); 
    for side in parts(eq):
        for e in side.atoms(): pass
        for t in sympify(side).as_ordered_terms():
            n, d = fraction(together(t))
            if d.has(x): out |= set(solveset(d, x, Reals))
        n, d = fraction(together(side))
        if d.has(x): out |= set(solveset(d, x, Reals))
    return out
def meaning(line, X0, carried=()):
    segs = [t.strip() for t in re.split(r'\s+or\s+', clean(line))]
    X = set(X0) | set(carried); res = S.EmptySet
    for sg in segs: X |= den_zeros(sg)
    for sg in segs:
        l, r = parts(sg); f = together(l - r); n, _ = fraction(f)
        sol = S.Reals if n == 0 else solveset(n, x, Reals)
        res = res | sol
    return Complement(res, FiniteSet(*X))
def truth(problem):
    X0 = den_zeros(clean(problem)); return X0, meaning(problem, X0)
def judge(ex, lines):
    problem = ex['problem']; X0, T = truth(problem); prev = meaning(problem, X0); open_ob = False; carried = []; roots = []
    first = None; prevtext = problem
    for i, ln in enumerate(lines, 1):
        low = clean(ln).lower()
        m = re.match(r'case x\s*(=|!=|≠)\s*([^:]+):\s*(.+)$', ln, re.I)
        if m:
            c = P(m.group(2)); body = m.group(3)
            if m.group(1) == '=':
                l, r = parts(prevtext); ok = (l.subs(x, c) == r.subs(x, c)); bl, br = parts(body)
                if (bl == br) != ok: return ('invalid', i, 'step')
                if ok: roots.append(c)
                continue
            carried = carried + [c]; cur = meaning(body, X0, carried); want = Complement(meaning(prevtext, X0, [c]), FiniteSet()); 
            if cur != want: return ('invalid', i, 'step')
            prev = cur; prevtext = body; continue
        cur = meaning(ln, X0, carried)
        if roots and carried and cur == prev | FiniteSet(*roots) and cur != prev: carried = []; prev = cur; prevtext = ln; continue
        if cur == prev: pass
        elif prev.is_subset(cur): open_ob = True
        elif cur.is_subset(prev) and open_ob and T.is_subset(cur): open_ob = cur != T
        else:
            if first is None: first = i
        prev = cur; prevtext = ln
    if first: return ('invalid', first, 'step')
    last = clean(lines[-1]); fin = None
    if re.fullmatch(r'no solutions?', last.lower()): fin = S.EmptySet
    elif re.fullmatch(r'x\s*=\s*[^=x]+', last) or ' or ' in last: fin = FiniteSet(*[P(q.split('=')[1]) for q in re.split(r'\s+or\s+', last)])   # a claim is read as written: an excluded value stays in it
    if fin is None: return ('incomplete', None, None)
    return ('verified', None, None) if fin == T else ('invalid', None, 'final-claim')
bad = 0
for ex in json.load(open(os.path.join(os.path.dirname(__file__), 'examples.json')))['examples']:
    exp = ex['expected']['outcome']
    if exp == 'unsupported':
        txt = ' '.join(ex['lines']); ok = bool(re.search(r'√|\||,\s*x\s*(≠|!=)', txt)); got = 'unsupported' if ok else 'supported-by-grammar'
    elif exp == 'ambiguous':
        va = judge(ex, ex['readings'][0]); vb = judge(ex, ex['readings'][1]); got = 'ambiguous' if va != vb else 'agree'
    else:
        v = judge(ex, ex['lines']); got = v[0]
        e = ex['expected']
        if got == exp and exp == 'invalid' and (v[1], v[2]) != (e.get('first_invalid'), e.get('invalid_at')): got = f'invalid-but-{v[1:]}'
    flag = 'OK ' if got == exp else 'BAD'; bad += got != exp
    print(flag, ex['id'], exp, got)
sys.exit(1 if bad else 0)
