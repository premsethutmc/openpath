"""Hand-designed templates, part 1: helpers + domain-change, extraneous-root, cancellation, multiplication-by-zero.
Each template: f(rng) -> dict(problem, lines, intent, tag). Text uses the explicit grammar; lines are restyled later."""
from fractions import Fraction as Fr


def ri(rng, lo, hi, nz=True):
    while True:
        v = rng.randint(lo, hi)
        if v or not nz:
            return v


def co(rng):
    """Coefficient: mostly small ints, sometimes up to 40, sometimes fractions; never 0."""
    r = rng.random()
    if r < 0.55:
        return Fr(ri(rng, -9, 9))
    if r < 0.80:
        return Fr(ri(rng, -40, 40))
    return Fr(ri(rng, -17, 17), rng.choice([2, 3, 4, 5, 6, 8]))


def F(v, rng=None):
    v = Fr(v)
    if v.denominator == 1:
        return str(v.numerator)
    if rng is not None and v.denominator in (2, 4, 5) and rng.random() < 0.5:
        s = format(float(v), 'g')
        return s
    return '(%d/%d)' % (v.numerator, v.denominator)


def mono(a):
    a = Fr(a)
    return 'x' if a == 1 else '-x' if a == -1 else F(a) + '*x'


def const(b):
    b = Fr(b)
    return '' if b == 0 else ('+' + F(b)) if b > 0 else '-' + F(-b)


def lin(a, b):
    return mono(a) + const(b)


def LP(a, b):
    return '(' + lin(a, b) + ')'


def xa(a):
    return '(' + lin(1, -Fr(a)) + ')'


def cl(v):
    v = Fr(v)
    return 'x=' + (str(v.numerator) if v.denominator == 1 else '%d/%d' % (v.numerator, v.denominator))


def pn(v):
    v = Fr(v)
    return F(v) if v >= 0 else '(' + F(v) + ')'


def T(problem, lines, intent, tag):
    return dict(problem=problem, lines=lines, intent=intent, tag=tag)


# ---------------- (1) domain change ----------------
def dc_cancel_poly(rng):
    a, p, q, s = Fr(ri(rng, -9, 9)), co(rng), co(rng), co(rng)
    rt = (s - q) / p
    if rt == a:
        return None
    prob = '%s*%s=%s*%s' % (xa(a), LP(p, q), xa(a), pn(s))
    if rng.random() < 0.6:
        return T(prob, [lin(p, q) + '=' + F(s), cl(rt)], 'invalid', 'dc_cancel_bad')
    return T(prob, ['%s*(%s)=0' % (xa(a), lin(p, q - s)), 'x=%s or %s=0' % (F(a), lin(p, q - s)),
                    'x=%s or %s' % (F(a), cl(rt))], 'valid-complete', 'dc_cancel_good')


def dc_cancel_removable(rng):
    a, p, q = Fr(ri(rng, -9, 9)), co(rng), co(rng)
    ext = rng.random() < 0.4
    s = p * a + q if ext else co(rng)
    rt = (s - q) / p
    if (rt == a) != ext:
        return None
    prob = '%s*%s/%s=%s' % (LP(p, q), xa(a), xa(a), pn(s))
    base = [lin(p, q) + '=' + F(s), cl(rt)]
    if not ext:
        return T(prob, base, 'valid-complete', 'dc_removable_ok')
    if rng.random() < 0.5:
        return T(prob, base, 'invalid', 'dc_removable_accept_excluded')
    return T(prob, base + ['no solution'], 'valid-complete', 'dc_removable_reject')


def dc_mult_poly(rng):
    p, q, s, a = co(rng), co(rng), co(rng), Fr(ri(rng, -9, 9))
    rt = (s - q) / p
    if rt == a:
        return None
    prob = '%s=%s' % (lin(p, q), F(s))
    m1 = '%s*%s=%s*%s' % (LP(p, q), xa(a), pn(s), xa(a))
    m2 = 'x=%s or %s=%s' % (F(a), lin(p, q), F(s))
    r = rng.random()
    if r < 0.4:
        return T(prob, [m1, m2, cl(rt)], 'valid-complete', 'dc_mult_check')
    if r < 0.7:
        return T(prob, [m1, m2, 'x=%s or x=%s' % (F(a), F(rt))], 'invalid', 'dc_mult_accept_both')
    return T(prob, ['%s*%s=%s' % (LP(p, q), xa(a), pn(s)), cl(rt)], 'invalid', 'dc_mult_one_side')


def dc_mult_rational(rng):
    a, m, k, n = Fr(ri(rng, -9, 9)), co(rng), co(rng), co(rng)
    if m == k:
        return None
    rt = a + (k - m) / n
    prob = '%s/%s+%s=%s/%s' % (pn(m), xa(a), pn(n), pn(k), xa(a))
    if rng.random() < 0.7:
        return T(prob, ['%s+%s*%s=%s' % (F(m), pn(n), xa(a), F(k)), '%s=%s' % (lin(n, m - n * a), F(k)), cl(rt)],
                 'valid-complete', 'dc_mult_rat_ok')
    return T(prob, ['%s+%s=%s' % (F(m), pn(n), F(k)), cl(rt)], 'invalid', 'dc_mult_rat_forgot')


def dc_square(rng):
    p, q, s = co(rng), co(rng), Fr(ri(rng, 1, 15))
    r1, r2 = (s - q) / p, (-s - q) / p
    prob = '%s=%s' % (lin(p, q), F(s))
    sq = '%s^2=%s^2' % (LP(p, q), F(s))
    alt = '%s=%s or %s=-%s' % (lin(p, q), F(s), lin(p, q), F(s))
    r = rng.random()
    if r < 0.5:
        return T(prob, [sq, alt, cl(r1)], 'valid-complete', 'dc_square_check')
    if r < 0.8:
        return T(prob, [sq, alt, 'x=%s or x=%s' % (F(r1), F(r2))], 'invalid', 'dc_square_both')
    return T(prob, [sq, cl(r1)], 'valid-complete', 'dc_square_direct')


def dc_cross_cancel(rng):
    a, b, c = (Fr(ri(rng, -9, 9)) for _ in range(3))
    if len({a, b, c}) < 3:
        return None
    prob = '%s/%s=%s/%s' % (xa(a), xa(b), xa(a), xa(c))
    if rng.random() < 0.5:
        return T(prob, ['1/%s=1/%s' % (xa(b), xa(c)), 'no solution'], 'invalid', 'dc_cancel_numerator')
    return T(prob, ['%s*%s=%s*%s' % (xa(a), xa(c), xa(a), xa(b)), '%s*(%s)=0' % (xa(a), lin(1, -c) + '-(' + lin(1, -b) + ')'),
                    cl(a)], 'valid-complete', 'dc_cross_good')


# ---------------- (2) extraneous root ----------------
def ex_same_den(rng):
    a, c, d = Fr(ri(rng, -9, 9)), co(rng), co(rng)
    prob = '%s/%s=%s/%s' % (LP(c, d), xa(a), pn(c * a + d), xa(a))
    base = ['%s=%s' % (lin(c, d), F(c * a + d)), cl(a)]
    return T(prob, base, 'invalid', 'ex_accept') if rng.random() < 0.5 else \
        T(prob, base + ['no solution'], 'valid-complete', 'ex_reject')


def ex_two_den(rng):
    a, b = Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    n1, n2 = co(rng), co(rng)
    if a == b or n1 + n2 == 0:
        return None
    mode = rng.choice(['ext', 'ext', 'ok'])
    c = n1 * (a - b) if mode == 'ext' else co(rng)
    rt = (c + n1 * b + n2 * a) / (n1 + n2)
    if mode == 'ext':
        # root is a only when n1+n2 divides properly: root = (n1 a - n1 b + n1 b + n2 a)/(n1+n2) = a
        pass
    if rt == b or (mode == 'ok' and rt == a):
        return None
    den = '(%s*%s)' % (xa(a), xa(b))
    prob = '%s/%s+%s/%s=%s/%s' % (pn(n1), xa(a), pn(n2), xa(b), pn(c), den)
    lines = ['(%s*%s+%s*%s)/%s=%s/%s' % (pn(n1), xa(b), pn(n2), xa(a), den, pn(c), den),
             '%s*%s+%s*%s=%s' % (pn(n1), xa(b), pn(n2), xa(a), F(c)),
             '%s=%s' % (lin(n1 + n2, -(n1 * b + n2 * a)), F(c)), cl(rt)]
    if rt == a:
        return T(prob, lines, 'invalid', 'ex2_accept') if rng.random() < 0.5 else \
            T(prob, lines + ['no solution'], 'valid-complete', 'ex2_reject')
    return T(prob, lines, 'valid-complete', 'ex2_nonextraneous')


def ex_identity(rng):
    a = Fr(ri(rng, -9, 9))
    one = rng.random() < 0.6
    n = Fr(1) if one else co(rng)
    if not one and n == 1:
        return None
    prob = 'x/%s-%s/%s=%s' % (xa(a), pn(a), xa(a), F(n))
    l1 = '%s/%s=%s' % (xa(a), xa(a), F(n))
    if one:
        exc = 'all real numbers except %s' % F(a)
        if rng.random() < 0.5:
            return T(prob, [l1, '1=1', exc], 'valid-complete', 'ex_identity_ok')
        return T(prob, [l1, '1=1', 'all real numbers'], 'invalid', 'ex_identity_forgot_exclusion')
    return T(prob, [l1, '1=%s' % F(n), 'no solution'], 'valid-complete', 'ex_identity_none')


def ex_product(rng):
    a, b = Fr(ri(rng, -9, 9)), Fr(ri(rng, -9, 9))
    if a == b:
        return None
    prob = '%s*%s/%s=0' % (xa(b), xa(a), xa(a))
    l1, l2 = '%s*%s=0' % (xa(b), xa(a)), 'x=%s or x=%s' % (F(b), F(a))
    r = rng.random()
    if r < 0.5:
        return T(prob, [l1, l2, cl(b)], 'valid-complete', 'ex_product_reject')
    return T(prob, [l1, l2], 'invalid', 'ex_product_accept_both')


# ---------------- (3) cancellation ----------------
def ca_diff_sq(rng):
    a, n = ri(rng, 1, 9), Fr(ri(rng, -20, 20))
    ext = rng.random() < 0.3
    if ext:
        n = Fr(2 * a)
    rt = n - a
    if (rt == a) != ext:
        return None
    if rng.random() < 0.35:
        prob = '(x^2-%d)/%s=%s' % (a * a, xa(a), pn(n))
    else:
        prob = '%s*%s/%s=%s' % (xa(a), xa(-a), xa(a), pn(n))
    base = ['x+%d=%s' % (a, F(n)), cl(rt)]
    if not ext:
        return T(prob, base, 'valid-complete', 'ca_diffsq_ok')
    return T(prob, base, 'invalid', 'ca_diffsq_accept') if rng.random() < 0.5 else \
        T(prob, base + ['no solution'], 'valid-complete', 'ca_diffsq_reject')


def ca_illegal_add(rng):
    r = rng.random()
    if r < 0.35:
        a, b, n = ri(rng, -20, 20), ri(rng, 1, 20), Fr(ri(rng, -9, 9), rng.choice([1, 2, 3]))
        if n * b == a or n == 1:
            return None
        return T('(x+%d)/(x+%d)=%s' % (a, b, pn(n)), ['%d/%d=%s' % (a, b, F(n)), 'no solution'], 'invalid', 'ca_cancel_x_term')
    if r < 0.7:
        c, a, n = ri(rng, 2, 12), ri(rng, 1, 30), Fr(ri(rng, -9, 9))
        rt = n - a
        prob = '(%d*x+%d)/%d=%s' % (c, a, c, pn(n))
        return T(prob, ['x+%d=%s' % (a, F(n)), cl(rt)], 'invalid', 'ca_partial_cancel_const')
    c, a, n = ri(rng, 2, 12), ri(rng, 1, 30), Fr(ri(rng, -9, 9))
    prob = '(%d*x+%d*%d)/%d=%s' % (c, c, a, c, pn(n))
    return T(prob, ['x+%d=%s' % (a, F(n)), cl(n - a)], 'valid-complete', 'ca_common_const_ok')


def ca_removable_rational(rng):
    a, b, c = (Fr(ri(rng, -9, 9)) for _ in range(3))
    if len({a, b, c}) < 3:
        return None
    ext = rng.random() < 0.3
    n = (b - a) / (c - a) if ext else Fr(ri(rng, -9, 9), rng.choice([1, 2, 3]))
    if n in (0, 1):
        return None
    rt = (b - n * c) / (1 - n)
    if ext != (rt == a) or rt == c:
        return None
    prob = '%s*%s/(%s*%s)=%s' % (xa(a), xa(b), xa(a), xa(c), pn(n))
    lines = ['%s/%s=%s' % (xa(b), xa(c), F(n)), '%s=%s*%s' % (xa(b), pn(n), xa(c)), cl(rt)]
    if not ext:
        return T(prob, lines, 'valid-complete', 'ca_removable_ok')
    return T(prob, lines, 'invalid', 'ca_removable_accept') if rng.random() < 0.5 else \
        T(prob, lines + ['no solution'], 'valid-complete', 'ca_removable_reject')


def ca_illegal_factor(rng):
    a, b, c = (Fr(ri(rng, -9, 9)) for _ in range(3))
    if len({a, b, c}) < 3:
        return None
    n = Fr(ri(rng, 2, 7))
    prob = '(%s+%s)/(%s+%s)=%s' % (xa(a), xa(b), xa(a), xa(c), pn(n))
    return T(prob, ['%s/%s=%s' % (xa(b), xa(c), F(n))], 'invalid', 'ca_cancel_summand_bracket')


# ---------------- (4) multiplication by zero ----------------
def mz_root(rng):
    p, q, s = co(rng), co(rng), co(rng)
    rt = (s - q) / p
    prob = '%s=%s' % (lin(p, q), F(s))
    return T(prob, ['%s*%s=%s*%s' % (LP(p, q), xa(rt), pn(s), xa(rt)),
                    '%s*(%s)=0' % (xa(rt), lin(p, q - s)), cl(rt)], 'valid-complete', 'mz_by_root_ok')


def mz_zero(rng):
    p, q, s = co(rng), co(rng), co(rng)
    rt = (s - q) / p
    prob = '%s=%s' % (lin(p, q), F(s))
    r = rng.random()
    if r < 0.4:
        return T(prob, ['0*%s=0*%s' % (LP(p, q), pn(s)), '0=0', cl(rt)], 'invalid', 'mz_const_zero')
    if r < 0.7:
        return T(prob, ['0*%s=0*%s' % (LP(p, q), pn(s)), '0=0', 'all real numbers'], 'invalid', 'mz_const_zero_allreals')
    a = ri(rng, -9, 9)
    return T(prob, ['0*%s*%s=0*%s' % (xa(a), LP(p, q), pn(s)), '0=0'], 'invalid', 'mz_zero_times_bracket')


def mz_nonroot(rng):
    p, q, s = co(rng), co(rng), co(rng)
    rt = (s - q) / p
    a = Fr(ri(rng, -9, 9)) if rng.random() < 0.6 else Fr(0)
    if a == rt:
        return None
    prob = '%s=%s' % (lin(p, q), F(s))
    f = 'x' if a == 0 else xa(a)
    m = '%s*%s=%s*%s' % (f, LP(p, q), pn(s), f)
    r = rng.random()
    if r < 0.45:
        return T(prob, [m, '%s=0 or %s=%s' % (f, lin(p, q), F(s)), 'x=%s or x=%s' % (F(a), F(rt))], 'invalid', 'mz_nonroot_claim_both')
    if r < 0.8:
        return T(prob, [m, '%s=0 or %s=%s' % (f, lin(p, q), F(s)), cl(rt)], 'valid-complete', 'mz_nonroot_check')
    return T(prob, [m], 'valid-incomplete', 'mz_nonroot_stop')


def mz_rational_lcd(rng):
    a, m, n = Fr(ri(rng, -9, 9)), co(rng), co(rng)
    rt = a + m / n
    prob = '%s/%s=%s' % (pn(m), xa(a), pn(n))
    r = rng.random()
    if r < 0.5:
        return T(prob, ['%s=%s*%s' % (F(m), pn(n), xa(a)), cl(rt)], 'valid-complete', 'mz_rat_ok')
    return T(prob, ['%s*%s/%s=%s*%s' % (pn(m), xa(rt), xa(a), pn(n), xa(rt)), '%s=%s*%s' % (F(m), pn(n), xa(a)) if False else
                    '%s*%s=%s*%s*%s' % (pn(m), xa(rt), pn(n), xa(a), xa(rt)), cl(rt)],
             None, 'mz_rat_by_root')
