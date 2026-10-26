"""Hand-designed templates, part 2: invalid-division, rational-expressions, alternative-paths, controls,
ambiguous-notation, unsupported."""
from fractions import Fraction as Fr
from math import lcm
from adv_templates1 import ri, co, F, mono, const, lin, LP, xa, cl, pn, T


# ---------------- (5) invalid division ----------------
def id_div(rng):
    p, q = co(rng), co(rng)
    r, s = co(rng), co(rng)
    if p == r:
        return None
    rt = (s - q) / (p - r)
    kind = rng.choice(['x', 'x', 'xa', 'xa', 'xa_root', 'xx', 'x_lin0'])
    if kind == 'x':
        if rt == 0:
            return None
        prob = 'x*%s=x*%s' % (LP(p, q), LP(r, s))
        return T(prob, ['%s=%s' % (lin(p, q), lin(r, s)), cl(rt)], 'invalid', 'id_div_by_x')
    if kind == 'xa':
        a = Fr(ri(rng, -9, 9))
        if rt == a:
            return None
        prob = '%s*%s=%s*%s' % (xa(a), LP(p, q), xa(a), LP(r, s))
        return T(prob, ['%s=%s' % (lin(p, q), lin(r, s)), cl(rt)], 'invalid', 'id_div_by_xa')
    if kind == 'xa_root':
        prob = '%s*%s=%s*%s' % (xa(rt), LP(p, q), xa(rt), LP(r, s))
        return T(prob, ['%s=%s' % (lin(p, q), lin(r, s)), cl(rt)], 'valid-complete', 'id_div_by_root_harmless')
    if kind == 'xx':
        c = Fr(ri(rng, -30, 30))
        prob = 'x*x=%s*x' % pn(c)
        return T(prob, ['x=%s' % F(c), cl(c)], 'invalid', 'id_div_xx')
    a = Fr(ri(rng, -9, 9))
    prob = 'x*%s=0' % xa(a)
    return T(prob, ['%s=0' % lin(1, -a), cl(a)], 'invalid', 'id_div_x_times')


# ---------------- (6) rational expressions ----------------
def re_lcd2(rng):
    a, b = Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    n1, n2, c = co(rng), co(rng), co(rng)
    if a == b or n1 + n2 == 0:
        return None
    rt = (c + n1 * b + n2 * a) / (n1 + n2)
    if rt in (a, b):
        return None
    den = '(%s*%s)' % (xa(a), xa(b))
    prob = '%s/%s+%s/%s=%s/%s' % (pn(n1), xa(a), pn(n2), xa(b), pn(c), den)
    comb = '%s*%s+%s*%s' % (pn(n1), xa(b), pn(n2), xa(a))
    mode = rng.choice(['ok', 'ok', 'add', 'partial', 'drop', 'sign'])
    fin = [cl(rt)]
    if mode == 'ok':
        return T(prob, ['(%s)/%s=%s/%s' % (comb, den, pn(c), den), comb + '=' + F(c),
                        '%s=%s' % (lin(n1 + n2, -(n1 * b + n2 * a)), F(c))] + fin, 'valid-complete', 're_lcd2_ok')
    if mode == 'add':
        return T(prob, ['(%s)/(%s+%s)=%s/%s' % (F(n1 + n2) if n1 + n2 >= 0 else '(%s)' % F(n1 + n2), xa(a), xa(b), pn(c), den)] + fin,
                 'invalid', 're_lcd2_wrong_add')
    if mode == 'partial':
        return T(prob, [comb + '=%s/%s' % (pn(c), den)] + fin, 'invalid', 're_lcd2_partial_clear')
    if mode == 'drop':
        return T(prob, ['%s=%s*%s' % (comb, pn(c), xa(a))] + fin, 'invalid', 're_lcd2_drop_factor')
    return T(prob, [comb + '=' + F(c), '%s=%s' % (lin(n1 + n2, n1 * b + n2 * a), F(c))] + fin, 'invalid', 're_lcd2_sign')


def re_x2x(rng):
    m = rng.choice([2, 3, 4, 5, 6, 8, 10, 12])
    n1, n2, c = co(rng), co(rng), co(rng)
    num = m * n1 + n2
    if num == 0:
        return None
    rt = Fr(num) / (m * c)
    prob = '%s/x+%s/(%d*x)=%s' % (pn(n1), pn(n2), m, pn(c))
    mode = rng.choice(['ok', 'ok', 'add', 'partial'])
    fin = [cl(rt)]
    if mode == 'ok':
        return T(prob, ['(%s)/(%d*x)=%s' % (F(num), m, pn(c)), '%s=%s*x' % (F(num), pn(m * c)) if True else '', ] + fin,
                 'valid-complete', 're_x2x_ok')
    if mode == 'add':
        return T(prob, ['(%s)/(%d*x)=%s' % (F(n1 + n2), m, pn(c)), '%s=%s*x' % (F(n1 + n2), pn(m * c))] + [cl(Fr(n1 + n2) / (m * c))],
                 'invalid', 're_x2x_wrong_add')
    return T(prob, ['%s+%s=%s' % (pn(m * n1), pn(n2), F(c))] + fin, 'invalid', 're_x2x_partial')


def re_cross(rng):
    a, b = Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    n1, n2 = co(rng), co(rng)
    if a == b or n1 == n2:
        return None
    rt = (n1 * b - n2 * a) / (n1 - n2)
    prob = '%s/%s=%s/%s' % (pn(n1), xa(a), pn(n2), xa(b))
    if rng.random() < 0.6:
        return T(prob, ['%s*%s=%s*%s' % (pn(n1), xa(b), pn(n2), xa(a)), '%s=0' % lin(n1 - n2, n2 * a - n1 * b), cl(rt)],
                 'valid-complete', 're_cross_ok')
    return T(prob, ['%s*%s=%s*%s' % (pn(n1), xa(a), pn(n2), xa(b)), cl(rt)], 'invalid', 're_cross_wrong')


def re_three(rng):
    a = Fr(ri(rng, -9, 9))
    n1, n2, n3 = co(rng), co(rng), co(rng)
    if a == 0 or n1 + n2 == 0:
        return None
    rt = (n3 + n1 * a) / (n1 + n2)
    if rt in (0, a):
        return None
    den = '(x*%s)' % xa(a)
    prob = '%s/x+%s/%s=%s/%s' % (pn(n1), pn(n2), xa(a), pn(n3), den)
    comb = '%s*%s+%s*x' % (pn(n1), xa(a), pn(n2))
    mode = rng.choice(['ok', 'ok', 'partial', 'miss'])
    if mode == 'ok':
        return T(prob, ['(%s)/%s=%s/%s' % (comb, den, pn(n3), den), comb + '=' + F(n3),
                        '%s=%s' % (lin(n1 + n2, -n1 * a), F(n3)), cl(rt)], 'valid-complete', 're_three_ok')
    if mode == 'partial':
        return T(prob, [comb + '=%s/%s' % (pn(n3), den), cl(rt)], 'invalid', 're_three_partial')
    return T(prob, ['%s+%s=%s' % (pn(n1), pn(n2), F(n3)) if False else '%s*%s+%s=%s' % (pn(n1), xa(a), pn(n2), F(n3)), cl(rt)],
             'invalid', 're_three_missing_multiplier')


def _numeric(rng):
    ms = rng.sample([2, 3, 4, 5, 6, 8, 9, 10, 12, 15], 3)
    pq = [(co(rng), co(rng)) for _ in range(3)]
    pq = [(Fr(int(p)), Fr(int(q))) if rng.random() < 0.7 else (p, q) for p, q in pq]
    c1 = pq[0][0] / ms[0] - pq[1][0] / ms[1] - pq[2][0] / ms[2]
    c0 = pq[0][1] / ms[0] - pq[1][1] / ms[1] - pq[2][1] / ms[2]
    if c1 == 0:
        return None
    return ms, pq, c1, c0


def re_numeric(rng):
    z = _numeric(rng)
    if z is None:
        return None
    ms, pq, c1, c0 = z
    L = lcm(*ms)
    prob = '%s/%d=%s/%d+%s/%d' % (LP(*pq[0]), ms[0], LP(*pq[1]), ms[1], LP(*pq[2]), ms[2])
    rt = -c0 / c1
    ok = ['%d*%s=%d*%s+%d*%s' % (L // ms[0], LP(*pq[0]), L // ms[1], LP(*pq[1]), L // ms[2], LP(*pq[2])),
          '%s=0' % lin(c1 * L, c0 * L), cl(rt)]
    if rng.random() < 0.55:
        return T(prob, ok, 'valid-complete', 're_numeric_ok')
    bad = ['%d*%s=%d*%s+%s' % (L // ms[0], LP(*pq[0]), L // ms[1], LP(*pq[1]), LP(*pq[2])), cl(rt)]
    return T(prob, bad, 'invalid', 're_numeric_partial')


def re_repeated(rng):
    a, m, n, c = Fr(ri(rng, -9, 9)), co(rng), co(rng), co(rng)
    ext = rng.random() < 0.35
    if ext:
        c = m
    rt = a + (c - m) / n
    prob = '%s/%s^2+%s/%s=%s/%s^2' % (pn(m), xa(a), pn(n), xa(a), pn(c), xa(a))
    ok = ['%s+%s*%s=%s' % (pn(m), pn(n), xa(a), F(c)), '%s=%s' % (lin(n, m - n * a), F(c)), cl(rt)]
    if ext:
        return T(prob, ok, 'invalid', 'ex_repeated_accept') if rng.random() < 0.5 else \
            T(prob, ok + ['no solution'], 'valid-complete', 'ex_repeated_reject')
    if rng.random() < 0.6:
        return T(prob, ok, 'valid-complete', 're_repeated_ok')
    return T(prob, ['%s/%s+%s=%s/%s' % (pn(m), xa(a), pn(n), pn(c), xa(a)), cl(rt)], 'invalid', 're_repeated_single_power')


# ---------------- (8) alternative paths (all valid-complete) ----------------
def ap_const_first(rng):
    p, q, r, s = co(rng), co(rng), co(rng), co(rng)
    if p == r:
        return None
    K = rng.choice([Fr(2), Fr(-3), Fr(5), Fr(1, 2), Fr(10), Fr(-1, 4), Fr(7), Fr(-12), Fr(40), Fr(3, 2)])
    rt = (s - q) / (p - r)
    prob = '%s=%s' % (lin(p, q), lin(r, s))
    lines = ['%s*(%s)=%s*(%s)' % (pn(K), lin(p, q), pn(K), lin(r, s)), '%s=%s' % (lin(K * (p - r), 0), F(K * (s - q)))]
    lines.append(rng.choice([cl(rt), cl(rt)[2:] + '=x']))
    return T(prob, lines, 'valid-complete', 'ap_const_first')


def ap_odd_order(rng):
    p, q, r, s = co(rng), co(rng), co(rng), co(rng)
    if p == r:
        return None
    rt = (s - q) / (p - r)
    prob = '%s=%s' % (lin(p, q), lin(r, s))
    lines = ['%s=%s' % (lin(r, s), lin(p, q)), '%s=%s' % (F(q - s), lin(r - p, 0)) if r != p else '',
             rng.choice([cl(rt), '%s=x' % F(rt)])]
    return T(prob, lines, 'valid-complete', 'ap_odd_order')


def ap_expand_collect(rng):
    a, b, d, e, f, c, g = co(rng), co(rng), co(rng), co(rng), co(rng), Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    k = a * (d * g - b * c)
    if a * (b + d) == e:
        return None
    rt = (f - k) / (a * (b + d) - e)
    prob = '%s*(%s*%s+%s*(x+%s))=%s' % (pn(a), pn(b), xa(c), pn(d), F(g) if g >= 0 else '(%s)' % F(g), lin(e, f))
    if g < 0:
        prob = '%s*(%s*%s+%s*%s)=%s' % (pn(a), pn(b), xa(c), pn(d), xa(-g), lin(e, f))
    lines = ['%s*(%s)=%s' % (pn(a), lin(b + d, d * g - b * c), lin(e, f)), '%s=%s' % (lin(a * (b + d), k), lin(e, f)),
             '%s=%s' % (lin(a * (b + d) - e, 0), F(f - k)), cl(rt)]
    return T(prob, lines, 'valid-complete', 'ap_nested_expand')


def ap_cross_mult(rng):
    a, p, q = Fr(ri(rng, -9, 9)), co(rng), co(rng)
    n, m = Fr(ri(rng, -12, 12)), Fr(ri(rng, 1, 12))
    if n == 0 or m * p == n:
        return None
    rt = -(m * q + n * a) / (m * p - n)
    if rt == a:
        return None
    prob = '%s/%s=%s/%s' % (LP(p, q), xa(a), pn(n), F(m))
    lines = ['%s*%s=%s*%s' % (F(m), LP(p, q), pn(n), xa(a)), '%s=0' % lin(m * p - n, m * q + n * a), cl(rt)]
    return T(prob, lines, 'valid-complete', 'ap_cross_mult')


def ap_fraction_move(rng):
    m1, m2 = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 12, 15, 20], 2)
    c, d = co(rng), co(rng)
    rt = (d - c) * m1 * m2 / (m2 - m1)
    prob = 'x/%d+%s=x/%d+%s' % (m1, pn(c), m2, pn(d))
    lines = ['x/%d-x/%d=%s' % (m1, m2, F(d - c)), '%s*x/%d=%s' % (pn(m2 - m1), m1 * m2, F(d - c)), cl(rt)]
    return T(prob, lines, 'valid-complete', 'ap_fraction_move')


def ap_protected(rng):
    p, q, r, s = co(rng), co(rng), co(rng), co(rng)
    if p == r:
        return None
    rt = (s - q) / (p - r)
    if rt == 0:
        return None
    prob = 'x*%s=x*%s' % (LP(p, q), LP(r, s))
    lines = ['x=0 or %s=%s' % (lin(p, q), lin(r, s)), 'x=0 or %s' % cl(rt)]
    return T(prob, lines, 'valid-complete', 'ap_protected_division')


def _dec(v):
    return format(float(v), 'g')


def ap_decimal(rng):
    qs = [Fr(ri(rng, -80, 80), 4) for _ in range(4)]
    p, q, r, s = qs
    if p == r or p == 0 or r == 0:
        return None
    rt = (s - q) / (p - r)
    d = lambda v: '(%s)' % _dec(v) if v < 0 else _dec(v)
    prob = '%s*x+%s=%s*x+%s' % (d(p), d(q), d(r), d(s))
    prob = prob.replace('+(-', '-(').replace('-(', '-(') if False else prob
    lines = ['100*(%s*x+%s)=100*(%s*x+%s)' % (d(p), d(q), d(r), d(s)),
             '%s=%s' % (lin(100 * (p - r), 0), F(100 * (s - q))), cl(rt)]
    return T(prob, lines, 'valid-complete', 'ap_decimal_scale')


def ap_direct(rng):
    a, b = Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    n1, n2, c = co(rng), co(rng), co(rng)
    if a == b or n1 + n2 == 0:
        return None
    rt = (c + n1 * b + n2 * a) / (n1 + n2)
    if rt in (a, b):
        return None
    den = '(%s*%s)' % (xa(a), xa(b))
    prob = '%s/%s+%s/%s=%s/%s' % (pn(n1), xa(a), pn(n2), xa(b), pn(c), den)
    return T(prob, [cl(rt)], 'valid-complete', 'ap_direct_answer')


# ---------------- (9) plain controls ----------------
def cc_linear(rng):
    p, q, s = co(rng), co(rng), co(rng)
    rt = (s - q) / p
    prob = '%s=%s' % (lin(p, q), F(s))
    return T(prob, ['%s=%s' % (lin(p, 0), F(s - q)), cl(rt)], 'valid-complete', 'cc_linear_const_one_side')


def cc_two_sided(rng):
    p, q, r, s = co(rng), co(rng), co(rng), co(rng)
    if p == r:
        return None
    rt = (s - q) / (p - r)
    prob = '%s=%s' % (lin(p, q), lin(r, s))
    return T(prob, ['%s=%s' % (lin(p - r, 0), F(s - q)), cl(rt)], 'valid-complete', 'cc_two_sided')


def cc_frac_both(rng):
    p, q, r, s = co(rng), co(rng), co(rng), co(rng)
    m, n = rng.choice([2, 3, 4, 5, 6, 7, 9, 10, 15]), rng.choice([2, 3, 4, 5, 8, 11, 12])
    if m == n or n * p == m * r:
        return None
    rt = (m * s - n * q) / (n * p - m * r)
    prob = '%s/%d=%s/%d' % (LP(p, q), m, LP(r, s), n)
    return T(prob, ['%d*%s=%d*%s' % (n, LP(p, q), m, LP(r, s)), '%s=%s' % (lin(n * p - m * r, 0), F(m * s - n * q)), cl(rt)],
             'valid-complete', 'cc_fractions_both_sides')


def cc_rational(rng):
    a, m, n = Fr(ri(rng, -9, 9)), co(rng), co(rng)
    rt = a + m / n
    prob = '%s/%s=%s' % (pn(m), xa(a), pn(n))
    return T(prob, ['%s=%s*%s' % (F(m), pn(n), xa(a)), cl(rt)], 'valid-complete', 'cc_rational_simple')


def cc_nested(rng):
    a, b, c, d, e = co(rng), co(rng), Fr(ri(rng, -9, 9)), co(rng), co(rng)
    if a * b == 0:
        return None
    k = a * (d - b * c)
    if a * b == e:
        return None
    rt = (-k + 0) / (a * b - e) if False else (-k) / (a * b - e)
    prob = '%s*(%s*%s+%s)=%s*x' % (pn(a), pn(b), xa(c), pn(d), pn(e))
    lines = ['%s=%s*x' % (lin(a * b, k), pn(e)), '%s=%s' % (lin(a * b - e, 0), F(-k)), cl(rt)]
    return T(prob, lines, 'valid-complete', 'cc_nested_brackets')


# ---------------- (7) ambiguous notation (raw lines) ----------------
def _am(prob, lines, tag):
    t = T(prob, lines, None, tag)
    t['raw'] = True
    return t


def am_div_x(rng):
    a, b, c = ri(rng, -30, 30), ri(rng, -9, 9), ri(rng, 2, 12)
    if abs(a) == abs(b * c):
        return None
    if rng.random() < 0.5:   # intended tight
        rt = Fr(a, b * c)
        return _am('%d/(%d*x)=%d' % (a, c, b), ['%d/%dx=%d' % (a, c, b), '%d=%dx' % (a, b * c), cl(rt)], 'am_div_x_tight')
    rt = Fr(b * c, a)
    return _am('(%d/%d)*x=%d' % (a, c, b), ['%d/%dx=%d' % (a, c, b), '%dx=%d' % (a, b * c), cl(rt)], 'am_div_x_lr')


def am_paren(rng):
    p, q, r, k = ri(rng, 1, 15), ri(rng, 2, 9), ri(rng, -9, 9), ri(rng, 1, 12)
    rr = '+%d' % r if r >= 0 else '-%d' % -r
    if rng.random() < 0.5:
        rt = Fr(k * q, p) - r
        return _am('(%d/%d)*(x%s)=%d' % (p, q, rr, k), ['%d/%d(x%s)=%d' % (p, q, rr, k), 'x%s=%s' % (rr, F(Fr(k * q, p))), cl(rt)], 'am_paren_lr')
    rt = Fr(p, k * q) - r
    return _am('%d/(%d*(x%s))=%d' % (p, q, rr, k), ['%d/%d(x%s)=%d' % (p, q, rr, k), '%d=%d*(x%s)' % (p, k * q, rr), cl(rt)], 'am_paren_tight')


def am_product(rng):
    k, m, a, b = ri(rng, 1, 9), ri(rng, 2, 9), ri(rng, 1, 9), ri(rng, 1, 9)
    if a == b:
        return None
    if rng.random() < 0.5:
        return _am('(%d/%d)*(x+%d)*(x+%d)=0' % (k, m, a, b),
                   ['%d/%d(x+%d)(x+%d)=0' % (k, m, a, b), 'x+%d=0 or x+%d=0' % (a, b), 'x=-%d or x=-%d' % (a, b)], 'am_product_lr')
    return _am('%d/(%d*(x+%d)*(x+%d))=0' % (k, m, a, b), ['%d/%d(x+%d)(x+%d)=0' % (k, m, a, b), 'no solution'], 'am_product_tight')


def am_sum(rng):
    a, b, c = ri(rng, -9, 9), ri(rng, -9, 9), ri(rng, 1, 9)
    m, n = rng.choice([2, 3, 4, 5]), rng.choice([6, 7, 8, 9])
    num = a * n + b * m
    if num == 0:
        return None
    rt = Fr(num, m * n * c)
    return _am('%d/(%d*x)+%d/(%d*x)=%d' % (a, m, b, n, c),
               ['%d/%dx+%d/%dx=%d' % (a, m, b, n, c), '%d/%dx=%d' % (num, m * n, c), '%d=%dx' % (num, m * n * c), cl(rt)], 'am_sum_tight')


def am_agree(rng):
    a, b, c, d, k = ri(rng, 2, 12), ri(rng, -9, 9), ri(rng, 2, 9), ri(rng, 2, 9), ri(rng, -20, 20)
    kind = rng.choice([0, 1, 2])
    if kind == 0:   # a x / c + d (x - b) = k
        co1 = Fr(a, c) + d
        rt = (k + d * b) / co1
        return _am('%d*x/%d+%d*(x-%d)=%d' % (a, c, d, b, k), ['%dx/%d+%d(x-%d)=%d' % (a, c, d, b, k), 'x=%s' % F(rt)], 'am_agree_implicit_numerator')
    if kind == 1:   # d(x+b)/c = k
        rt = Fr(k * c, d) - b
        return _am('%d*(x+%d)/%d=%d' % (d, b, c, k), ['%d(x+%d)/%d=%d' % (d, b, c, k), 'x+%d=%s' % (b, F(Fr(k * c, d))), cl(rt)], 'am_agree_paren_numerator')
    rt = Fr(k * c, a)
    return _am('%d*x/%d=%d' % (a, c, k), ['%dx/%d=%d' % (a, c, k), '%dx=%d' % (a, k * c), cl(rt)], 'am_agree_ax_over_c')


def am_wrong(rng):
    """After-slash juxtaposition with a sabotaged line; readings may coincide on the verdict."""
    t = rng.choice([am_div_x, am_paren, am_product, am_sum])(rng)
    if t is None:
        return None
    t['lines'] = t['lines'][:-1] + [cl(Fr(ri(rng, -9, 9), rng.choice([1, 2])))]
    t['tag'] += '_wrongclaim'
    return t


# ---------------- (10) unsupported ----------------
def un_any(rng):
    p, q, s = co(rng), co(rng), co(rng)
    rt = (s - q) / p
    prob = '%s=%s' % (lin(p, q), F(s))
    good = [lin(p, 0) + '=' + F(s - q), cl(rt)]
    kind = rng.choice(['sqrt', 'usqrt', 'x2', 'irrquad', 'letter', 'eqeq', 'func', 'letter2'])
    n = rng.choice([2, 3, 5, 6, 7, 8, 10, 11, 13, 17, 19, 20, 23])
    if kind == 'sqrt':
        bad = 'x=sqrt(%d)' % n
    elif kind == 'usqrt':
        bad = 'x=√%d' % n
    elif kind == 'x2':
        bad = 'x^2=%d' % n
    elif kind == 'irrquad':
        a, b = ri(rng, 1, 9), ri(rng, 1, 15)
        bad = 'x*(x-%d)=%d' % (a, b)
        prob = 'x*(x-%d)=%d*x' % (a, b)
        good = ['x*(x-%d-%d)=0' % (a, b)]
    elif kind == 'letter':
        bad = 'x=%s*k' % F(p)
    elif kind == 'letter2':
        bad = '%s*y%s=%s' % (F(p), const(q), F(s))
    elif kind == 'eqeq':
        bad = 'x == %s' % F(rt)
    else:
        bad = rng.choice(['abs(x)=%d' % abs(n), 'log(x)=%d' % n, 'sin(x)=0', 'ln(x)=%d' % n])
    pos = rng.choice([0, 1, 2]) if len(good) + 1 > 2 else rng.choice([0, 1])
    lines = good[:pos] + [bad] + good[pos:]
    if kind == 'irrquad':
        lines = ['x*(x-%d)=%d*x' % (a, b), bad, 'x=%d or x=%d' % (0, a + b)][: rng.choice([2, 3])]
    return T(prob, lines, 'unsupported', 'un_' + kind)


# registries
CATS = {
    'domain-change': ['dc_cancel_poly', 'dc_cancel_removable', 'dc_mult_poly', 'dc_mult_rational', 'dc_square', 'dc_cross_cancel'],
    'extraneous-root': ['ex_same_den', 'ex_two_den', 'ex_identity', 'ex_product', 're_repeated'],
    'cancellation': ['ca_diff_sq', 'ca_illegal_add', 'ca_removable_rational', 'ca_illegal_factor', 'dc_cancel_removable'],
    'multiplication-by-zero': ['mz_root', 'mz_zero', 'mz_nonroot', 'mz_rational_lcd'],
    'invalid-division': ['id_div'],
    'rational-expressions': ['re_lcd2', 're_x2x', 're_cross', 're_three', 're_numeric', 're_repeated'],
    'ambiguous-notation': ['am_div_x', 'am_paren', 'am_product', 'am_sum', 'am_agree', 'am_wrong'],
    'alternative-paths': ['ap_const_first', 'ap_odd_order', 'ap_expand_collect', 'ap_cross_mult', 'ap_fraction_move',
                          'ap_protected', 'ap_decimal', 'ap_direct'],
    'correct-controls': ['cc_linear', 'cc_two_sided', 'cc_frac_both', 'cc_rational', 'cc_nested', 'dc_mult_poly', 'dc_mult_rational',
                         'dc_square', 'dc_cancel_poly', 'dc_cancel_removable', 'ex_same_den', 'ex_two_den', 'ca_diff_sq',
                         'ca_removable_rational', 'mz_root', 'mz_nonroot', 're_lcd2', 're_x2x', 're_cross', 're_three',
                         're_numeric', 're_repeated', 'id_div'],
    'unsupported': ['un_any'],
}
