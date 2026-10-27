"""Deterministic generator for the frozen domain-aware datasets. TEST DATA ONLY: recipes propose equations, the
INDEPENDENT oracle (domain_oracle.py, SymPy) alone decides class, solutions, exclusions, tags and scope. Nothing here
is, or will be, used by the planner. Usage: python3 gen_domain_sets.py OUT_DIR"""
import json, random, sys, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import domain_oracle as O
from sympy import Rational

SEEDS = {'dev': 20261101, 'eval': 20261102, 'holdout': 20261103, 'unsupported': 20261104, 'adversarial': 20261105}
# ---------- text helpers ----------
def sg(n): return f"+{n}" if n > 0 else f"-{-n}"
def lin(c, d):  # c*x+d
    t = "x" if c == 1 else "-x" if c == -1 else f"{c}*x"
    return t + (sg(d) if d else "")
def fac(a, c=1): return f"({lin(c, -a * c)})" if c != 1 else (f"(x{sg(-a)})" if a else "(x)")
def quad(c2, c1, c0):
    out = ""
    for c, v in ((c2, "x^2"), (c1, "x"), (c0, "")):
        if c == 0: continue
        body = v if (v and abs(c) == 1) else (f"{abs(c)}*{v}" if v else f"{abs(c)}")
        out += ("-" if c < 0 else ("+" if out else "")) + body
    return out or "0"
def nz(r, lo=-9, hi=9):
    while True:
        v = r.randint(lo, hi)
        if v: return v
def distinct(r, k, lo=-9, hi=9):
    s = []
    while len(s) < k:
        v = r.randint(lo, hi)
        if v not in s: s.append(v)
    return s
# ---------- recipes (each returns an equation text) ----------
def r_cross(r, big=False):
    m = r.choice([1, 1, 2, -1]); c1, c2 = r.choice([1, 1, 2]), r.choice([1, 1, 2]) if not big else (3, r.choice([1, 2]))
    a1, a2 = m * c1, m * c2
    n1, d1, n2, d2 = lin(a1, r.randint(-9, 9)), lin(c1, nz(r)), lin(a2, r.randint(-9, 9)), lin(c2, nz(r))
    return f"({n1})/({d1})=({n2})/({d2})"
def r_sum(r, big=False):
    a, b = distinct(r, 2); p, q = nz(r, -6, 6), nz(r, -6, 6); sgn = r.choice([1, -1]); q2 = q * sgn
    if p + q2 != 0 and r.random() < 0.4: x0 = r.choice([a, b]); rr = x0 * (p + q2) - (p * b + q2 * a)
    else: rr = r.randint(-20, 20)
    left = f"{p}/{fac(a)}{'+' if sgn == 1 else '-'}{q}/{fac(b)}"
    den = r.choice([f"{fac(a)}*{fac(b)}", f"({quad(1, -(a + b), a * b)})"])
    return f"{left}={rr}/({den})"
def r_ident(r, big=False):
    a, b = distinct(r, 2); p, q = nz(r, -5, 5), nz(r, -5, 5)
    num = f"{p + q}*x{sg(-(p * b + q * a))}" if p + q not in (1,) else f"x{sg(-(p * b + q * a))}"
    eq = f"{p}/{fac(a)}+{q}/{fac(b)}=({num})/({fac(a)}*{fac(b)})"
    if r.random() < 0.35: eq += sg(r.choice([-3, -2, -1, 1, 2, 3]))      # contradiction on a restricted domain
    return eq
def r_remov(r, big=False):
    a, p = distinct(r, 2); k = r.randint(-12, 12); kind = r.randint(0, 5)
    if kind == 0: return f"(x^2-{a * a})/{fac(a)}={k}" if a else f"x^2/(x)={k}"
    if kind == 1: return f"({fac(a)}*{fac(p)})/{fac(a)}={k}"
    if kind == 2: return f"({quad(1, -(a + p), a * p)})/{fac(a)}={k}"
    if kind == 3: c = nz(r, 2, 9); return f"({c}*x)/x={k}" if r.random() < 0.5 else f"({c}*x{sg(c * a)})/{fac(-a)}={k}"
    if kind == 4: b = a + nz(r, -4, 4); return f"{fac(a)}*{fac(p)}/{fac(a)}+{nz(r, -5, 5)}/{fac(b)}={k}/{fac(b)}"
    return f"x{sg(r.randint(-5, 5))}+(x^2-{a * a})/{fac(a)}={k}" if a else f"x+x^2/(x)={k}"
def r_simple(r, big=False):
    a = nz(r); p = r.randint(-9, 9); k = nz(r, -6, 6); m = r.randint(-8, 8); kind = r.randint(0, 3)
    if kind == 0: return f"(x{sg(p)})/{fac(a)}={k}"
    if kind == 1: return f"{k}/{fac(a)}{sg(m)}={r.randint(-9, 9)}"
    if kind == 2: c = r.choice([2, 3]) if big else r.choice([1, 2]); return f"{nz(r, -9, 9)}/({lin(c, nz(r))})={nz(r, -9, 9)}"
    return f"{nz(r, -5, 5)}/{fac(a)}={nz(r, -5, 5)}/{fac(a)}{sg(r.choice([-2, -1, 0, 1, 2]))}"
def r_poly_rat(r, big=False):
    a = nz(r); p = nz(r, -9, 9); m = r.choice([1, 1, 2, 3, -1])
    base = f"{m if m != 1 else ''}{'*' if m not in (1,) else ''}x" if m != -1 else "-x"
    num = quad(m, -a * m, p) if m != 0 else str(p)
    eq = f"{base}+{p}/{fac(a)}=({num})/{fac(a)}"
    if r.random() < 0.4: eq += sg(r.choice([-2, -1, 1, 3]))
    return eq
def r_cross_ex(r, big=False):   # (x+p)/(x-a)=(x+q)/(x-b) with the solution steered onto an excluded value
    a, b = distinct(r, 2); p = r.randint(-9, 9)
    # (x+p)(x-b) = (x+q)(x-a)  ->  x(p-b) - pb = x(q-a) - qa -> x = (pb - qa)/((p-b)-(q-a)) ; solve for q so that x = a
    # a((p-b)-(q-a)) = pb - qa -> a(p-b) + a^2 - aq = pb - qa -> a(p-b)+a^2 = pb -> only when it holds; fall back to random q
    q = r.randint(-9, 9)
    return f"(x{sg(p)})/{fac(a)}=(x{sg(q)})/{fac(b)}"
# holdout-only families (absent from dev and eval)
def _sum(cs, fs): return "".join((sg(c) if i else str(c)) + "/" + f for i, (c, f) in enumerate(zip(cs, fs)))
def r_three(r, big=False):  # three excluded values; x^2 terms cancel because the numerator constants balance
    a, b, c = distinct(r, 3, -7, 7); p, q, s_, t, u = [nz(r, -5, 5) for _ in range(5)]
    w = p + q + s_ - t - u
    if w == 0: w = 1; s_ += 1
    fs = [fac(a), fac(b), fac(c)]
    return f"{_sum([p, q, s_], fs)}={_sum([t, u, w], fs)}"
def h_three(r, big=True):   # p/(x-a)+q/(x-b) = s/(x-c)+t/(x-a), t chosen so the x^2 terms cancel
    a, b, c = distinct(r, 3, -7, 7); p, q, s_ = nz(r, -5, 5), nz(r, -5, 5), nz(r, -5, 5); t = p + q - s_
    if t == 0: t = 2; s_ = p + q - 2
    return f"{p}/{fac(a)}+{q}/{fac(b)}={s_}/{fac(c)}{sg(t)}/{fac(a)}"
def h_lead(r, big=True):    # denominators with leading coefficient 2 or 3 (rational excluded values)
    c1, c2 = r.choice([2, 3]), r.choice([2, 3]); d1, d2 = nz(r, -7, 7), nz(r, -7, 7); p, q = nz(r, -6, 6), nz(r, -6, 6)
    return f"{p}/({lin(c1, d1)})+{q}/({lin(c2, d2)})=({p * c2 + q * c1}*x{sg(p * d2 + q * d1)})/(({lin(c1, d1)})*({lin(c2, d2)})){sg(r.choice([0, 0, 1, -1, 2]))}"
def h_pair(r, big=True):    # p/(x-a) = q/(x-a) + r/(x-b)
    a, b = distinct(r, 2); return f"{nz(r, -9, 9)}/{fac(a)}={nz(r, -9, 9)}/{fac(a)}+{nz(r, -9, 9)}/{fac(b)}"
def h_scaled(r, big=True):  # numeric factors outside the bracket; equal leading coefficients so the x^2 terms cancel
    a, b = distinct(r, 2); k = r.choice([2, 3, 4]); m = nz(r, -4, 4)
    return f"({lin(m, r.randint(-6, 6))})/({k}*{fac(a)})=({lin(m, r.randint(-6, 6))})/({k}*{fac(b)})"
SHUF = ['swap', 'addc', 'mulc', 'none', 'none']
def shuffle(r, t):
    k = r.choice(SHUF); l, rr = t.split('=')
    if k == 'swap': return f"{rr}={l}"
    if k == 'addc': c = r.choice([-3, -2, -1, 1, 2, 4]); return f"{l}{sg(c)}={rr}{sg(c)}"
    if k == 'mulc': c = r.choice([2, 3, 5]); return f"{c}*({l})={c}*({rr})"
    return t
FAMILIES = {'dev': [r_cross, r_sum, r_ident, r_remov, r_simple, r_poly_rat, r_cross_ex, r_three],
            'eval': [r_cross, r_sum, r_ident, r_remov, r_simple, r_poly_rat, r_cross_ex, r_three],
            'holdout': [r_cross, r_sum, r_ident, r_remov, r_simple, r_poly_rat, r_three, h_three, h_lead, h_pair, h_scaled]}
WEIGHTS = {'dev': [3, 4, 3, 5, 2, 2, 2, 3], 'eval': [3, 4, 3, 5, 2, 2, 2, 3], 'holdout': [2, 3, 2, 4, 2, 2, 2, 3, 3, 3, 3]}
TAGS = ['restricted-identity', 'removable', 'all-candidates-rejected', 'extraneous-and-valid-root', 'extraneous-candidate', 'no-solution', 'multi-excluded', 'multi-step', 'plain', 'unique-solution']
SIZE = {'dev': 200, 'eval': 400, 'holdout': 300}
MINS = {'dev': [25, 30, 15, 15, 40, 30, 30, 25, 20, 60], 'eval': [50, 60, 30, 30, 80, 60, 60, 50, 40, 120], 'holdout': [35, 45, 20, 20, 60, 45, 45, 35, 30, 90]}
def tags_of(a):
    t = list(a['tags'])
    if not t and a['class'] == 'unique': t.append('plain')
    if a['class'] == 'unique': t.append('unique-solution')
    return t
def make_record(i, prefix, t, recipe, a):
    return {'id': f"{prefix}{i:03d}", 'text': t, 'recipe': recipe, **{k: a[k] for k in ['class', 'solution', 'excluded', 'candidates', 'rejected', 'removable', 'tags', 'reducedDegree', 'domainOps', 'supported', 'reasons']}}
def generate_supported(name, prefix, seen):
    """Phase 1: accept items that help an unmet per-tag minimum. Phase 2: fill to the set size. A recipe may supply at
    most 40% (phase 1) / 30% (phase 2) of a set so no single family dominates."""
    r = random.Random(SEEDS[name]); size = SIZE[name]; mins = dict(zip(TAGS, MINS[name])); cnt = {t: 0 for t in TAGS}
    fams, ws = FAMILIES[name], WEIGHTS[name]; per = {f.__name__: 0 for f in fams}; out = []; tries = 0
    while len(out) < size and tries < 40000:
        tries += 1
        f = r.choices(fams, ws)[0]; t = shuffle(r, f(r))
        if t in seen or len(t) > 80: continue
        try: a = O.analyse(t)
        except Exception: continue
        if not a['supported']: continue
        tg = tags_of(a); unmet = [x for x in tg if cnt[x] < mins[x]]; phase1 = any(cnt[x] < mins[x] for x in TAGS)
        if phase1 and not unmet: continue
        if per[f.__name__] >= (0.4 if phase1 else 0.3) * size: continue
        seen.add(t); per[f.__name__] += 1
        for x in tg: cnt[x] += 1
        out.append(make_record(len(out), prefix, t, f.__name__, a))
    short = {t: (cnt[t], mins[t]) for t in TAGS if cnt[t] < mins[t]}
    if len(out) < size or short: raise SystemExit(f"{name}: unfilled {len(out)}/{size}, short tags {short}, tries {tries}")
    r.shuffle(out)
    for i, it in enumerate(out): it['id'] = f"{prefix}{i:03d}"
    return out, tries
# ---------- unsupported ----------
def u_quadsum(r): a, b = distinct(r, 2); return f"{nz(r,-5,5)}/{fac(a)}+{nz(r,-5,5)}/{fac(b)}={nz(r,1,6)}"
def u_irred(r): return f"{nz(r,-6,6)}/(x^2+{r.choice([1,2,3,5])})={nz(r,1,5)}/{r.choice([2,3,4])}"
def u_cubic(r): a = nz(r, -4, 4); return f"(x^3-{a**3})/{fac(a)}={r.randint(3, 20)}" if a > 0 else f"(x^3+{(-a)**3})/{fac(a)}={r.randint(3, 20)}"
def u_irrnum(r): n = r.choice([2, 3, 5, 6, 7, 10]); a = nz(r, -5, 5); return f"(x^2-{n})/{fac(a)}={r.randint(-4, 4)}"
def u_plainquad(r): return r.choice([f"x^2={r.choice([4,9,16,25])}", f"x^2{sg(-nz(r,1,9))}*x{sg(nz(r,-8,8))}=0", f"x^2+{nz(r,1,6)}*x={nz(r,1,9)}"])
def u_square(r): a = nz(r); return f"{nz(r,1,4)}/{fac(a)}^2={nz(r,1,9)}"
def u_four(r):
    a, b, c, d = distinct(r, 4, -5, 5); return f"{nz(r,1,4)}/({fac(a)}*{fac(b)}*{fac(c)}*{fac(d)})={nz(r,1,4)}/({fac(a)}*{fac(b)})"
UNSUP = [u_quadsum, u_irred, u_cubic, u_irrnum, u_plainquad, u_square, u_four]
def generate_unsupported(seen):
    r = random.Random(SEEDS['unsupported']); out = []; per = {f.__name__: 0 for f in UNSUP}
    tries = 0
    while len(out) < 112 and tries < 5000:
        tries += 1
        f = UNSUP[len(out) % len(UNSUP)]; t = f(r)
        if t in seen: continue
        try: a = O.analyse(t)
        except Exception: continue
        if a['supported'] or not a['reasons']: continue
        seen.add(t); per[f.__name__] += 1
        out.append(make_record(len(out), 'u', t, f.__name__, a))
    return out
# ---------- adversarial transitions and claims ----------
def st(eq, X): return {'eq': eq, 'excluded': [str(v) for v in sorted(X)]}
def trans(tid, kind, intent, e1, X1, e2, X2):
    ok, why = O.step_check(st(e1, X1), st(e2, X2))
    return {'id': tid, 'kind': kind, 'intent': intent, 'from': st(e1, X1), 'to': st(e2, X2), 'expectedValid': ok, 'reasons': why}
def X_of(t): return O.excluded_values(t)[0]
def generate_adversarial():
    r = random.Random(SEEDS['adversarial']); out = []; seen = set()
    def add(**kw):
        k = (kw['from']['eq'], kw['to']['eq'], tuple(kw['from']['excluded']), tuple(kw['to']['excluded']))
        if k in seen: return
        seen.add(k); out.append(kw)
    pool = []
    fams = [r_cross, r_sum, r_ident, r_remov, r_simple, r_poly_rat]
    while len(pool) < 140:
        t = r.choice(fams)(r)
        try: a = O.analyse(t)
        except Exception: continue
        if a['supported'] and t not in {p[0] for p in pool}: pool.append((t, a))
    n = 0
    def T(kind, intent, e1, X1, e2, X2):
        nonlocal n; n += 1
        try: add(**trans(f"a{n:04d}", kind, intent, e1, X1, e2, X2))
        except O.OutOfOracle: pass
    for t, a in pool:
        X = {Rational(v) for v in a['excluded']}; L, R = t.split('=')
        sol = [Rational(v) for v in a['solution']] if a['solution'] else []
        cs = [r.randint(-8, 8) for _ in range(2)] + ([int(sol[0])] if sol and sol[0].is_integer else []) + ([int(v) for v in X if v.is_integer][:1])
        for c in cs:
            fc = f"(x{sg(-c)})" if c else "(x)"
            T('multiply-by-expression-no-check', 'illegal', t, X, f"{fc}*({L})={fc}*({R})", X)
            T('multiply-by-expression-record-restriction', 'conditional', t, X, f"{fc}*({L})={fc}*({R})", X | {Rational(c)})
            T('divide-by-expression-no-restriction', 'illegal', t, X, f"({L})/{fc}=({R})/{fc}", X)
            T('divide-by-expression-record-restriction', 'conditional', t, X, f"({L})/{fc}=({R})/{fc}", X | {Rational(c)})
        lcd = "*".join(f"(x{sg(-v)})" if v.is_integer else f"(x-{v})" for v in sorted(X)) or None
        if lcd:
            T('clear-denominators-drop-restriction', 'illegal', t, X, f"{lcd}*({L})={lcd}*({R})", set())
            T('clear-denominators-keep-restriction', 'legal', t, X, f"{lcd}*({L})={lcd}*({R})", X)
        k = r.choice([-3, -2, 2, 3, 5])
        T('add-to-both-sides', 'legal', t, X, f"{L}{sg(k)}={R}{sg(k)}", X)
        T('scale-both-sides-by-nonzero-constant', 'legal', t, X, f"{abs(k)}*({L})={abs(k)}*({R})", X)
    for _ in range(90):
        a, p, k = nz(r), nz(r), r.randint(-9, 9); b = a + nz(r, -4, 4)
        e1 = f"({fac(a)}*{fac(p)})/{fac(a)}={k}"; Xa = {Rational(a)}
        T('cancel-common-factor-drop-restriction', 'illegal', e1, Xa, f"x{sg(-p)}={k}", set())
        T('cancel-common-factor-keep-restriction', 'legal', e1, Xa, f"x{sg(-p)}={k}", Xa)
        e2 = f"(x^2-{a*a})/{fac(a)}={k}" if a else None
        if e2:
            T('cancel-common-factor-drop-restriction', 'illegal', e2, Xa, f"x{sg(a)}={k}", set())
            T('factor-numerator', 'legal', e2, Xa, f"({fac(a)}*(x{sg(a)}))/{fac(a)}={k}", Xa)
        e3 = f"(x{sg(p)})/(x{sg(a)})={k}"; Xb = {Rational(-a)}
        T('cancel-non-factor', 'illegal', e3, Xb, f"{p}/{a}={k}", Xb)
        T('cancel-non-factor', 'illegal', e3, Xb, f"{p}/{a}={k}", set())
        pp, qq = nz(r, -5, 5), nz(r, -5, 5); aa, bb = distinct(r, 2); rr = r.randint(-9, 9)
        e4 = f"{pp}/{fac(aa)}+{qq}/{fac(bb)}={rr}/({fac(aa)}*{fac(bb)})"; X4 = {Rational(aa), Rational(bb)}
        T('combine-fractions-add-denominators', 'illegal', e4, X4, f"({pp}+{qq})/({fac(aa)}+{fac(bb)})={rr}/({fac(aa)}*{fac(bb)})", X4 | X_of(f"1/({fac(aa)}+{fac(bb)})=0"))
        T('combine-fractions-correctly', 'legal', e4, X4, f"({pp + qq}*x{sg(-(pp*bb+qq*aa))})/({fac(aa)}*{fac(bb)})={rr}/({fac(aa)}*{fac(bb)})", X4)
        e5 = f"(x{sg(pp)})/{fac(aa)}=(x{sg(qq)})/{fac(bb)}"
        T('cross-multiply-wrong', 'illegal', e5, X4, f"(x{sg(pp)})*{fac(aa)}=(x{sg(qq)})*{fac(bb)}", X4)
        T('cross-multiply', 'legal', e5, X4, f"(x{sg(pp)})*{fac(bb)}=(x{sg(qq)})*{fac(aa)}", X4)
        T('cross-multiply-drop-restriction', 'illegal', e5, X4, f"(x{sg(pp)})*{fac(bb)}=(x{sg(qq)})*{fac(aa)}", set())
    return out
def generate_claims(adv_pool_seed):
    r = random.Random(adv_pool_seed + 7); out = []; seen = set(); fams = [r_cross, r_sum, r_ident, r_remov, r_simple, r_poly_rat]
    while len(out) < 400:
        t = r.choice(fams)(r)
        if t in seen: continue
        try: a = O.analyse(t)
        except Exception: continue
        if not a['supported']: continue
        seen.add(t); truth = 'all-except-excluded' if a['class'] == 'identity-on-domain' else a['solution']
        cand = []
        cand.append(('true-claim', truth, 'legal'))
        if a['rejected']: cand.append(('accept-extraneous-candidate', sorted({*(a['solution'] or []), *[str(v) for v in a['rejected']]}), 'illegal'))
        if a['class'] == 'identity-on-domain': cand.append(('ignore-domain-all-reals', 'all-real', 'illegal'))
        if a['class'] == 'unique': cand.append(('claim-no-solution', [], 'illegal')); cand.append(('wrong-root', [str(Rational(a['solution'][0]) + r.choice([-2, -1, 1, 2]))], 'illegal'))
        if a['class'] == 'none': cand.append(('claim-spurious-root', [str(r.randint(-9, 9))], 'illegal'))
        if a['excluded'] and a['class'] != 'identity-on-domain': cand.append(('claim-excluded-value', [a['excluded'][0]], 'illegal'))
        for kind, claimed, intent in cand:
            ok, truth_ = O.claim_check(t, claimed)
            out.append({'id': f"k{len(out):04d}", 'text': t, 'kind': kind, 'intent': intent, 'claimed': claimed, 'expectedValid': ok, 'truth': truth_ if truth_ is not None else None})
    return out
def sha(path): return hashlib.sha256(open(path, 'rb').read()).hexdigest()
def main(outdir):
    os.makedirs(outdir, exist_ok=True)
    legacy = [('(9*x)/x=10', 'edge50'), ('(5*x)/x=7', 'edge50'), ('(9*x)/x=9', 'edge50'), ('(7*x)/x=10', 'edge50'), ('(8*x)/x=4', 'edge50'), ('(9*x)/x=6', 'edge50')]
    seen = set(); files = {}
    dev, tries_dev = generate_supported('dev', 'd', seen)
    for i, (t, _) in enumerate(legacy):
        a = O.analyse(t); rec = make_record(len(dev), 'dl', t, 'legacy-refused-family', a); rec['id'] = f"dl{i:02d}"; rec['tags'] = rec['tags'] + ['legacy-refused']; dev.append(rec); seen.add(t)
    ev, tries_ev = generate_supported('eval', 'e', seen)
    ho, tries_ho = generate_supported('holdout', 'h', seen)
    un = generate_unsupported(seen)
    adv = generate_adversarial(); cl = generate_claims(SEEDS['adversarial'])
    data = {'dev.json': dev, 'eval.json': ev, 'holdout.json': ho, 'unsupported.json': un, 'adversarial.json': adv, 'claims.json': cl}
    for n, d in data.items(): json.dump(d, open(os.path.join(outdir, n), 'w'), indent=1)
    man = {'seeds': SEEDS, 'sympy': __import__('sympy').__version__, 'generatorTries': {'dev': tries_dev, 'eval': tries_ev, 'holdout': tries_ho},
           'files': {n: {'items': len(d), 'sha256': sha(os.path.join(outdir, n))} for n, d in data.items()}}
    json.dump(man, open(os.path.join(outdir, 'manifest.json'), 'w'), indent=1)
    print(json.dumps({n: v['items'] for n, v in man['files'].items()}))
if __name__ == '__main__': main(sys.argv[1])
