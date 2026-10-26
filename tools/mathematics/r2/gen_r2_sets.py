#!/usr/bin/env python3
"""Seeded, deterministic generator of the R2 frozen acceptance datasets.

Outputs (in this directory): composition.json, reuse.json, limits.json, tuning.json
Seed: SEED below.  Uses only refimpl.py (independent of any existing generator).

Construction (Dataset A): start from a goal-satisfying base state, apply k (2..6)
INVERSE operations (tree level, below) to scramble it, then find the forward witness
with exhaustive breadth-first search over the allowed operations.  Family membership
is decided by computed properties (see FAMILY_TESTS), never by labels alone.
"""
from __future__ import annotations

import json
import os
import random
import sys
import time
from fractions import Fraction as F

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from refimpl import *  # noqa: E402,F401,F403
import refimpl as R  # noqa: E402

SEED = 20260513
BFS_OPS = [o for o in OPS if o != 'restrict']
NODE_CAP = 20000


# ----------------------------------------------------------------------------
# small tree helpers
# ----------------------------------------------------------------------------
def lin_tree(p, q):
    """bracket p*x + q (p>0 integer)."""
    return poly_tree((F(q), F(p)))


def xr(r):
    """bracket (x - r)"""
    r = F(r)
    return poly_tree((-r, F(1))) if r.denominator == 1 else lin_tree(r.denominator, -r.numerator)


def side_tree(terms):
    return build_sum(terms)


def term_mono(c, k):
    c = F(c)
    return (sign_of(c), mono_tree(c, k))


def atomic_terms(S):
    out = []
    for i, (s, t) in enumerate(S):
        m = mono_of(t)
        if m is not None and m[0] != 0:
            out.append((i, s * m[0], m[1]))
    return out


# ----------------------------------------------------------------------------
# inverse operations on (SL, SR) = lists of signed terms
# each returns new (SL, SR) or None
# ----------------------------------------------------------------------------
def inv_split(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    at = atomic_terms(S)
    if not at:
        return None
    i, c, k = rng.choice(at)
    c1 = F(rng.choice([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]))
    if rng.random() < 0.2:
        c1 = F(rng.choice([1, 3, 5]), 2)
    c2 = c - c1
    if c2 == 0:
        return None
    new = [term_mono(c1, k), term_mono(c2, k)]
    if rng.random() < 0.4:
        new.reverse()
    S2 = S[:i] + new + S[i + 1:]
    return (S2, SR) if side == 0 else (SL, S2)


def inv_move(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S, T = [SL, SR][side], [SR, SL][side]
    if len(S) < 2:
        return None
    i = rng.randrange(len(S))
    s, t = S[i]
    S2 = S[:i] + S[i + 1:]
    T2 = T + [(-s, t)]
    return (S2, T2) if side == 0 else (T2, S2)


def _rand_small_term(rng, ctx, allow_frac=True):
    r = rng.random()
    c = rng.choice([1, 2, 3, 4, 5])
    if r < 0.35 or not allow_frac:
        return (rng.choice([1, -1]), N(c))
    if r < 0.6:
        return (rng.choice([1, -1]), mono_tree(c, 1))
    root = rng.choice(ctx['roots'])
    return (rng.choice([1, -1]), ('/', N(c), xr(root)))


def inv_add_both(rng, SL, SR, ctx):
    s, t = _rand_small_term(rng, ctx, ctx.get('frac', True))
    return SL + [(s, t)], SR + [(s, t)]


def _scale_terms(S, c):
    out = []
    for s, t in S:
        v = view(t)
        if v is None:
            out.append((s * sign_of(c), ('*', N(abs(c)), t)))
        else:
            out.append(mk_term(v[0] * s * c, v[1], v[2]))
    return out


def inv_scale(rng, SL, SR, ctx):
    c = rng.choice([F(2), F(3), F(4), F(-1), F(-2), F(1, 2), F(1, 3), F(3, 2), F(5), F(1, 4), F(2, 3)])
    return _scale_terms(SL, c), _scale_terms(SR, c)


def inv_group(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    at = atomic_terms(S)
    if len(at) < 2:
        return None
    (i, c1, k1), (j, c2, k2) = rng.sample(at, 2)
    if k1 == k2:
        return None
    choices = []
    g = math_gcd_int(c1, c2)
    if g and g > 1:
        choices.append(F(g))
    if min(k1, k2) >= 1:
        choices.append('x')
    choices.append(F(rng.choice([2, 3, -1, -2, 1, 5])))
    g = rng.choice(choices)
    if g == 'x':
        b = poly_tree(_shift_poly(c1, k1, c2, k2))
        grp = ('*', X, b)
        s_out = 1
    else:
        if g == 1:
            return None
        pc1, pc2 = c1 / g, c2 / g
        poly = [F(0)] * (max(k1, k2) + 1)
        poly[k1] += pc1
        poly[k2] += pc2
        b = poly_tree(ptrim(tuple(poly)))
        grp = ('*', N(abs(g)), b)
        s_out = sign_of(g)
    first, second = sorted([i, j])
    S2 = [x for n, x in enumerate(S) if n not in (i, j)]
    pos = rng.choice([first, min(len(S2), second - 1)])
    S2.insert(min(pos, len(S2)), (s_out, grp))
    return (S2, SR) if side == 0 else (SL, S2)


def _shift_poly(c1, k1, c2, k2):
    poly = [F(0)] * (max(k1, k2))
    poly[k1 - 1] += c1
    poly[k2 - 1] += c2
    return ptrim(tuple(poly))


def math_gcd_int(a, b):
    import math
    if F(a).denominator != 1 or F(b).denominator != 1:
        return None
    return math.gcd(int(a), int(b))


def _pick_term_view(rng, S):
    cand = []
    for i, (s, t) in enumerate(S):
        try:
            v = view(t)
        except RefError:
            v = None
        if v is not None:
            cand.append((i, s, t, v))
    return rng.choice(cand) if cand else None


def inv_cancel(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    pk = _pick_term_view(rng, S)
    if pk is None:
        return None
    i, s, t, v = pk
    if v[0] == 0:
        return None
    r = rng.choice(ctx['roots'])
    br = xr(r)
    if rng.random() < 0.3 and F(r) != 0:
        # use a scaled bracket (px+q) form
        br = lin_tree(2, -2 * r) if F(r).denominator == 1 else br
    coef, nf, df = v
    ns, nt = mk_term(coef * s, nf + ((br, 1),), df + ((br, 1),))
    S2 = S[:i] + [(ns, nt)] + S[i + 1:]
    return (S2, SR) if side == 0 else (SL, S2)


def inv_den_both(rng, SL, SR, ctx):
    r = rng.choice(ctx['roots'])
    br = xr(r)
    out = []
    for S in (SL, SR):
        S2 = []
        for s, t in S:
            if t == ZERO:
                S2.append((s, t))
                continue
            v = view(t)
            if v is None or v[0] == 0:
                return None
            coef, nf, df = v
            S2.append(mk_term(coef * s, nf, df + ((br, 1),)))
        out.append(S2)
    return out[0], out[1]


def inv_split_frac(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    cand = []
    for i, (s, t) in enumerate(S):
        v = view(t)
        if v is not None and v[2]:
            ets = et_terms(t)
            if ets and len(ets) == 1 and len(ets[0][0]) >= 2:
                cand.append((i, s, ets[0]))
            elif ets and len(ets) == 1 and len(ets[0][0]) == 1 and not v[1]:
                cand.append((i, s, ets[0]))
    if not cand:
        return None
    i, s, (monos, dens) = rng.choice(cand)
    parts = []
    dparts = [f if x == 1 else ('^', f, x) for f, x in dens]
    den = mk_prod(dparts)
    if len(monos) == 1:
        c, k = monos[0]
        if k != 0 or c.denominator != 1 or abs(c) < 2:
            return None
        c1 = F(rng.randint(1, int(abs(c)) - 1)) * sign_of(c)
        monos = [(c1, 0), (c - c1, 0)]
    for c, k in monos:
        parts.append((s * sign_of(c), ('/', mono_tree(c, k), den)))
    S2 = S[:i] + parts + S[i + 1:]
    return (S2, SR) if side == 0 else (SL, S2)


def inv_partial(rng, SL, SR, ctx):
    """(p x + q)/(x-r)  ->  p + (q + p r)/(x-r)"""
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    cand = []
    for i, (s, t) in enumerate(S):
        v = view(t)
        if v is None or len(v[2]) != 1 or v[2][0][1] != 1:
            continue
        dp = poly_of(v[2][0][0])
        if len(dp) != 2:
            continue
        Np = N_poly(v[0] * s, v[1])
        if len(Np) == 2:
            cand.append((i, Np, dp))
    if not cand:
        return None
    i, Np, dp = rng.choice(cand)
    r = -dp[0] / dp[1]
    p, q = Np[1], Np[0]
    # (p x + q)/(dp1 (x - r)) = (p/dp1) + (q + p r)/(dp1 (x-r))
    a = p / dp[1]
    b = (q + p * r) / dp[1]
    new = [term_mono(a, 0)]
    br = xr(r)
    if b != 0:
        new.append((sign_of(b), ('/', N(abs(b)), br)))
    S2 = S[:i] + new + S[i + 1:]
    return (S2, SR) if side == 0 else (SL, S2)


def inv_factor(rng, SL, SR, ctx):
    side = rng.choice([0, 1])
    S = [SL, SR][side]
    if len(S) < 2 or not all(mono_of(t) is not None for s, t in S):
        return None
    p = (F(0),)
    for s, t in S:
        c, k = mono_of(t)
        q = [F(0)] * (k + 1)
        q[k] = s * c
        p = padd(p, tuple(q))
    if len(p) < 3:
        return None
    c, facs = lin_factors(p)
    if c == 0:
        return None
    parts = []
    if abs(c) != 1:
        parts.append(N(abs(c)))
    for f, e in facs:
        parts.append(f if e == 1 else ('^', f, e))
    grp = mk_prod(parts)
    S2 = [(sign_of(c), grp)]
    return (S2, SR) if side == 0 else (SL, S2)


def inv_swap(rng, SL, SR, ctx):
    return SR, SL


def inv_shuffle(rng, SL, SR, ctx):
    a, b = list(SL), list(SR)
    rng.shuffle(a)
    rng.shuffle(b)
    if a and a[0][0] < 0 and any(s > 0 for s, _ in a):
        a.sort(key=lambda z: -z[0])
    if b and b[0][0] < 0 and any(s > 0 for s, _ in b):
        b.sort(key=lambda z: -z[0])
    return a, b


def inv_lift(rng, SL, SR, ctx):
    a = ctx.get('lift_root')
    if a is None:
        return None
    br = xr(a)

    def wrap(S):
        if len(S) == 1:
            s, t = S[0]
            return [(s, ('*', br, t))] if rng.random() < 0.5 else [(s, ('*', t, br))]
        return [(1, ('*', br, build_sum(S)))]

    return wrap(SL), wrap(SR)


INV_OPS = {
    'split': inv_split, 'move': inv_move, 'add_both': inv_add_both, 'scale': inv_scale,
    'group': inv_group, 'cancel': inv_cancel, 'den_both': inv_den_both,
    'split_frac': inv_split_frac, 'partial': inv_partial, 'factor': inv_factor,
    'swap': inv_swap, 'shuffle': inv_shuffle, 'lift': inv_lift,
}


def _clean(S):
    """drop literal-zero terms when other terms exist; empty -> 0."""
    S2 = [(s, t) for s, t in S if t != ZERO]
    return S2 if S2 else [(1, ZERO)]


def scramble(rng, base, kmin, kmax, weights, ctx):
    """base = (L tree, R tree).  Returns (SL, SR, trace) or None."""
    SL, SR = terms_of(base[0]), terms_of(base[1])
    k = rng.randint(kmin, kmax)
    trace = []
    names = list(weights)
    w = [weights[n] for n in names]
    tries = 0
    while len(trace) < k and tries < 40:
        tries += 1
        name = rng.choices(names, w)[0]
        res = INV_OPS[name](rng, SL, SR, ctx)
        if res is None:
            continue
        SL, SR = res
        SL, SR = _clean(SL), _clean(SR)
        trace.append(name)
    if len(trace) < kmin:
        return None
    return SL, SR, trace


# ----------------------------------------------------------------------------
# syntax styling (mix of syntax styles) -> start text
# ----------------------------------------------------------------------------
def stylize(rng, t, p=0.25):
    k = t[0]
    if k in 'nx':
        return t
    if k == 'neg':
        return ('neg', stylize(rng, t[1], p))
    if k == '^':
        base = stylize(rng, t[1], p)
        if t[2] == 2 and base == X and rng.random() < p * 0.4:
            return ('*', X, X)
        return ('^', base, t[2])
    a, b = stylize(rng, t[1], p), (stylize(rng, t[2], p) if k != '^' else None)
    if k == '*' and rng.random() < p:
        return ('*', b, a)
    if k == '/' and a[0] == 'n' and a[1] == 1 and b[0] in 'x+-' and b == X and rng.random() < p:
        return ('^', X, -1)
    return (k, a, b)


def render_eq(rng, SL, SR, style=True):
    L, R_ = build_sum(SL), build_sum(SR)
    if style:
        L, R_ = stylize(rng, L), stylize(rng, R_)
    text = eq_text(L, R_)
    if style and rng.random() < 0.2:
        text = text.replace(' ', '')
    elif style and rng.random() < 0.15:
        text = text.replace(' + ', '+').replace(' - ', '-')
    return text


# ----------------------------------------------------------------------------
# layered BFS with shortest-path bookkeeping
# ----------------------------------------------------------------------------
def layered(start, allowed, goal, node_cap=NODE_CAP, depth_cap=8, orig=None, state_filter=None):
    orig = orig or start
    k0 = key(start)
    nodes = {k0: (start, 0)}
    preds = {k0: []}
    if goal_holds(goal, start, orig):
        return dict(found=True, L=0, witness=[], first_moves=set(), nodes=1, capped=False, exhausted=False)
    frontier = [k0]
    d = 0
    while frontier and d < depth_cap:
        nxt = []
        for k in frontier:
            st = nodes[k][0]
            for name, p, ns in successors(st, allowed):
                kn = key(ns)
                if kn in nodes:
                    if nodes[kn][1] == d + 1:
                        preds[kn].append((k, name, p))
                    continue
                if state_filter and not state_filter(ns):
                    continue
                nodes[kn] = (ns, d + 1)
                preds[kn] = [(k, name, p)]
                nxt.append(kn)
                if len(nodes) >= node_cap:
                    return dict(found=False, L=None, witness=None, first_moves=set(), nodes=len(nodes),
                                capped=True, exhausted=False)
        goals = [k for k in nxt if goal_holds(goal, nodes[k][0], orig)]
        if goals:
            # witness: first predecessor chain
            path = []
            cur = goals[0]
            while preds[cur]:
                pk, name, p = preds[cur][0]
                path.append({'op': name, 'params': p})
                cur = pk
            path.reverse()
            # all shortest first moves
            closure = set(goals)
            stack = list(goals)
            first = set()
            while stack:
                cur = stack.pop()
                for pk, name, p in preds[cur]:
                    if pk == k0:
                        first.add((name, tuple(sorted(p.items()))))
                    if pk not in closure:
                        closure.add(pk)
                        stack.append(pk)
            return dict(found=True, L=d + 1, witness=path, first_moves=first, nodes=len(nodes),
                        capped=False, exhausted=False)
        frontier = nxt
        d += 1
    return dict(found=False, L=None, witness=None, first_moves=set(), nodes=len(nodes),
                capped=False, exhausted=True, closed=not frontier)


# ----------------------------------------------------------------------------
# base states per goal and scramble profiles
# ----------------------------------------------------------------------------
def rat(rng, lo=-5, hi=5, allow_frac=True):
    if allow_frac and rng.random() < 0.2:
        return F(rng.randint(lo * 2, hi * 2) | 1, 2)
    return F(rng.randint(lo, hi))


def num_tree(c):
    c = F(c)
    return N(c) if c >= 0 else ('neg', N(-c))


def base_state(rng, goal, ctx, kind='root'):
    """goal-satisfying base (L tree, R tree)."""
    if goal == 'SOLVE':
        if kind == 'identity':
            a, b = rng.randint(1, 3), rng.randint(-4, 4)
            t = poly_tree((F(b), F(a)))
            return (t, t)
        if kind == 'nosol':
            a, b = rng.randint(1, 3), rng.randint(-4, 4)
            return (poly_tree((F(b), F(a))), poly_tree((F(b + rng.choice([-3, -2, -1, 1, 2, 4])), F(a))))
        pool = [-4, -3, -2, -1, 1, 2, 3, 4, 5, F(1, 2), F(3, 2), F(-5, 2), 0]
        c = F(rng.choice(pool))
        ctx['solution'] = c
        return (X, num_tree(c))
    if goal == 'ONE_FRACTION_ZERO':
        p, q = rng.randint(1, 3), rng.randint(-5, 5)
        r = rng.choice(ctx['roots'])
        num = poly_tree((F(q), F(p)))
        den = xr(r)
        if rng.random() < 0.6:
            return (('/', num, den), ZERO)
        return (poly_tree((F(q), F(p))), ZERO)
    if goal == 'EXPANDED_POLY':
        a, b = rng.choice([1, 2, 3, -1, -2]), rng.randint(-6, 6)
        if rng.random() < 0.3:
            return (poly_tree((F(b), F(a), F(rng.choice([1, 2])))), ZERO)
        return (poly_tree((F(b), F(a))), ZERO)
    if goal == 'CLEARED':
        a, b, c, d = rng.randint(1, 4), rng.randint(-5, 5), rng.choice([-2, -1, 0, 1, 2]), rng.randint(-5, 5)
        return (poly_tree((F(b), F(a))), poly_tree((F(d), F(c))) if c or d else ZERO)
    if goal == 'REDUCED':
        r1, r2 = rng.sample(ctx['roots'] + [rng.randint(-3, 3)], 2) if len(ctx['roots']) > 1 else (
            ctx['roots'][0], rng.choice([x for x in range(-3, 4) if x != ctx['roots'][0]]))
        a, b = rng.randint(1, 4), rng.randint(1, 4)
        L = ('+', ('/', N(a), xr(r1)), ('/', mono_tree(b, 1), xr(r2)))
        return (L, N(rng.randint(1, 3)))
    raise KeyError(goal)


PROFILES = {
    'generic': {'split': 3, 'move': 3, 'add_both': 2, 'scale': 2, 'group': 2, 'cancel': 2, 'den_both': 2,
                'split_frac': 1, 'partial': 1, 'swap': 1, 'shuffle': 1},
    'frac': {'split': 2, 'move': 2, 'add_both': 3, 'scale': 1, 'group': 1, 'cancel': 3, 'den_both': 3,
             'split_frac': 2, 'partial': 2, 'swap': 1, 'shuffle': 1},
    'poly': {'split': 4, 'move': 3, 'add_both': 3, 'scale': 2, 'group': 3, 'factor': 2, 'cancel': 1, 'swap': 1,
             'shuffle': 1},
    'cancel': {'split': 1, 'move': 2, 'add_both': 2, 'scale': 1, 'group': 1, 'cancel': 5, 'den_both': 3,
               'split_frac': 1, 'swap': 1, 'shuffle': 1},
}


def draw_start(rng, goal, profile, kmin=3, kmax=6, base_kind='root'):
    nroots = rng.choice([1, 2, 2, 3])
    roots = rng.sample([-3, -2, -1, 0, 1, 2, 3, 4], nroots)
    ctx = {'roots': roots}
    base = base_state(rng, goal, ctx, base_kind)
    if goal == 'SOLVE' and base_kind == 'root' and rng.random() < 0.12 and ctx.get('solution') is not None:
        ctx['roots'] = [ctx['solution']] + roots[:1]
    sc = scramble(rng, base, kmin, kmax, PROFILES[profile], ctx)
    if sc is None:
        return None
    SL, SR, trace = sc
    text = render_eq(rng, SL, SR)
    if len(text) > 150:
        return None
    try:
        if not in_scope(text):
            return None
        if canon(text) == eq_text(*base):
            return None
    except RefError:
        return None
    return text, trace, ctx


# ----------------------------------------------------------------------------
# witness search, allowed sets, family tests
# ----------------------------------------------------------------------------
def ops_of(witness):
    return sorted({w['op'] for w in witness}, key=OPS.index)


def best_first(start, allowed, goal, node_cap=15000, depth_cap=14):
    """Fallback witness finder (not shortest): greedy best-first on size + 0.3*depth."""
    import heapq
    orig = start
    k0 = key(start)
    store = {k0: (start, None, None, 0)}
    heap = [(size(start), 0, k0)]
    cnt = 0
    while heap and len(store) < node_cap:
        _, _, k = heapq.heappop(heap)
        st, _, _, d = store[k]
        if d >= depth_cap:
            continue
        for name, p, ns in successors(st, allowed):
            kn = key(ns)
            if kn in store:
                continue
            store[kn] = (ns, k, {'op': name, 'params': p}, d + 1)
            if goal_holds(goal, ns, orig):
                path, cur = [], kn
                while store[cur][1] is not None:
                    path.append(store[cur][2])
                    cur = store[cur][1]
                path.reverse()
                return path
            cnt += 1
            heapq.heappush(heap, (size(ns) + 0.3 * (d + 1), cnt, kn))
    return None


def pick_allowed(rng, witness, start_has_restr, n_extra=None):
    ops = set(ops_of(witness))
    rest = [o for o in BFS_OPS if o not in ops]
    k = rng.choice([0, 1, 1, 2, 2, 3]) if n_extra is None else n_extra
    ops |= set(rng.sample(rest, min(k, len(rest))))
    if start_has_restr:
        ops.add('restrict')
    return sorted(ops, key=OPS.index)


def replay(start, witness):
    sts = [start]
    for w in witness:
        ns = apply_op(sts[-1], w['op'], w['params'])
        if ns is None:
            return None
        sts.append(ns)
    return sts


def with_restrict(start, witness, allowed):
    """prepend the explicit restrict step when it is applicable and allowed."""
    if 'restrict' in allowed and apply_op(start, 'restrict', {}) is not None:
        return [{'op': 'restrict', 'params': {}}] + witness
    return witness


def test_order(start, W, goal):
    sts = replay(start, W)
    for i in range(len(W) - 1):
        a, b = W[i], W[i + 1]
        s1 = apply_op(sts[i], b['op'], b['params'])
        if s1 is None:
            continue
        s2 = apply_op(s1, a['op'], a['params'])
        if s2 is not None and key(s2) == key(sts[i + 2]):
            continue
        cur = s2
        for step in W[i + 2:]:
            if cur is None:
                break
            cur = apply_op(cur, step['op'], step['params'])
        if cur is not None and goal_holds(goal, cur, start):
            continue
        return {'pair_index': i, 'first': a['op'], 'second': b['op']}
    return None


def test_shortest_not_obvious(start, res, allowed):
    """every shortest first move fails to reduce terms, degree, fractions and total;
    and a size-reducing move exists at the start (a tempting alternative)."""
    s0 = size_parts(start)
    if not res['first_moves']:
        return None
    for name, pt in res['first_moves']:
        ns = apply_op(start, name, dict(pt))
        sp = size_parts(ns)
        if any(sp[i] < s0[i] for i in range(3)) or sum(sp) < sum(s0):
            return None
    tempting = [(n, p) for n, p, ns in successors(start, set(allowed)) if size(ns) < size(start)]
    if not tempting:
        return None
    return {'first_moves': sorted(f'{n}' for n, _ in res['first_moves']), 'tempting_reducing_moves': len(tempting)}


def test_local_trap(start, L, goal, allowed):
    best = None
    for name, p, ns in successors(start, set(allowed)):
        sz = size(ns)
        if best is None or sz < best[0]:
            best = (sz, name, p, ns)
    if best is None or best[0] >= size(start):
        return None
    r = layered(best[3], set(allowed), goal, node_cap=NODE_CAP, depth_cap=L, orig=start)
    if r['capped'] or r['found']:
        return None
    return {'attractive_move': best[1], 'attractive_params': best[2], 'extra_steps': 'unreachable-or->=2',
            'closed': bool(r.get('closed'))}


def test_complexity_up(start, L, goal, allowed):
    t0, d0 = size_parts(start)[:2]
    flt = lambda st: size_parts(st)[0] <= t0 and size_parts(st)[1] <= d0
    r = layered(start, set(allowed), goal, node_cap=NODE_CAP, depth_cap=max(8, L), orig=start, state_filter=flt)
    if r['capped'] or r['found']:
        return None
    return {'start_terms': t0, 'start_degree': d0}


# ----------------------------------------------------------------------------
# families
# ----------------------------------------------------------------------------
FAM_NAMES = {1: 'order', 2: 'shortest-not-obvious', 3: 'local-trap', 4: 'complexity-up',
             5: 'restriction-gate', 6: 'goal-variety', 7: 'solve-mixed'}

GOAL_MIX = {
    1: [('SOLVE', 4), ('ONE_FRACTION_ZERO', 2), ('EXPANDED_POLY', 2), ('CLEARED', 1), ('REDUCED', 1)],
    2: [('SOLVE', 4), ('ONE_FRACTION_ZERO', 2), ('EXPANDED_POLY', 3), ('CLEARED', 1), ('REDUCED', 1)],
    3: [('SOLVE', 6), ('ONE_FRACTION_ZERO', 2), ('EXPANDED_POLY', 2), ('REDUCED', 1)],
    4: [('SOLVE', 4), ('ONE_FRACTION_ZERO', 2), ('EXPANDED_POLY', 3), ('CLEARED', 2), ('REDUCED', 1)],
}


def wchoice(rng, pairs):
    return rng.choices([a for a, _ in pairs], [b for _, b in pairs])[0]


def make_task_dict(fam, text, goal, allowed, witness, trace, props, notes, reachable=True):
    return {'family': FAM_NAMES[fam], 'start': text, 'goal': goal, 'allowed': allowed, 'reachable': reachable,
            'witness': witness, 'notes': notes, 'props': props}


def candidate(rng, goal, profile, kmin=3, kmax=6, base_kind='root', minL=2, cap0=5000, allowed_fixed=None):
    try:
        return _candidate(rng, goal, profile, kmin, kmax, base_kind, minL, cap0, allowed_fixed)
    except (ZeroDivisionError, RefError, KeyError, ValueError, RecursionError) as e:
        EXC_COUNT[type(e).__name__] = EXC_COUNT.get(type(e).__name__, 0) + 1
        return None


EXC_COUNT = {}


def _candidate(rng, goal, profile, kmin=3, kmax=6, base_kind='root', minL=2, cap0=5000, allowed_fixed=None):
    R.clear_caches()
    d = draw_start(rng, goal, profile, kmin, kmax, base_kind)
    if not d:
        return None
    text, trace, ctx = d
    start = initial_state(text)
    if goal_holds(goal, start, start):
        return None
    r0 = layered(start, set(BFS_OPS), goal, node_cap=cap0, depth_cap=8)
    if r0['found']:
        W0 = r0['witness']
    elif allowed_fixed is not None and not r0['found']:
        W0 = best_first(start, set(BFS_OPS), goal)
        if W0 is None:
            return None
    else:
        return None
    if len(W0) < minL:
        return None
    has_restr = bool(extract_state(start))
    if allowed_fixed is None:
        allowed = pick_allowed(rng, W0, has_restr)
        r = layered(start, set(allowed), goal, node_cap=NODE_CAP, depth_cap=8)
        if not r['found']:
            return None
    else:
        allowed = list(allowed_fixed)
        r = dict(found=True, L=len(W0), witness=W0, first_moves=set(), nodes=r0['nodes'], capped=False)
    return dict(text=text, trace=trace, ctx=ctx, start=start, allowed=allowed, r=r, goal=goal)


def finalize(fam, c, props, notes):
    start, goal, allowed = c['start'], c['goal'], c['allowed']
    W = with_restrict(start, c['r']['witness'], allowed)
    ok, rep = verify_trace(c['text'], W, goal)
    assert ok, (c['text'], goal, W, rep)
    props = dict(props)
    props.update({'k_inverse_ops': len(c['trace']), 'scramble': c['trace'], 'shortest_len': c['r']['L'],
                  'bfs_nodes': c['r']['nodes'], 'final_state': rep})
    return make_task_dict(fam, c['text'], goal, allowed, W, c['trace'], props, notes)


def gen_basic_family(fam, rng, n_target, max_attempts, seen=None):
    """families 1-4: computed-property rejection sampling."""
    out = []
    seen = set() if seen is None else seen
    attempts = 0
    stats = {'attempts': 0, 'drawn': 0, 'passed': 0}
    while len(out) < n_target and attempts < max_attempts:
        attempts += 1
        goal = wchoice(rng, GOAL_MIX[fam])
        profile = rng.choice(['generic', 'frac', 'cancel', 'frac'])
        c = candidate(rng, goal, profile, 3, 6, minL=(3 if fam in (1, 2, 4) else 2))
        if c is None:
            continue
        stats['drawn'] += 1
        sk = (canon(c['text']), goal)
        if sk in seen:
            continue
        r, allowed, start, L = c['r'], c['allowed'], c['start'], c['r']['L']
        props = None
        notes = None
        if fam == 1:
            t = test_order(start, r['witness'], goal)
            if t:
                props, notes = {'order_test': t}, (f"swapping adjacent steps {t['first']} / {t['second']} "
                                                   f"breaks the continuation")
        elif fam == 2:
            t = test_shortest_not_obvious(start, r, allowed)
            if t:
                props, notes = {'first_moves': t}, ('every shortest witness starts with a move that reduces no '
                                                    'size measure; a size-reducing move exists but is not on a shortest path')
        elif fam == 3:
            t = test_local_trap(start, L, goal, allowed)
            if t:
                props, notes = {'trap': t}, (f"the locally best move {t['attractive_move']} (smallest size) leaves a "
                                             f"state needing >= 2 extra steps or unreachable")
        elif fam == 4:
            t = test_complexity_up(start, L, goal, allowed)
            if t:
                props, notes = {'complexity': t}, ('no witness of length <= 8 stays within the start terms/degree; '
                                                   'every witness passes through a larger state')
        if props is None:
            continue
        seen.add(sk)
        stats['passed'] += 1
        out.append(finalize(fam, c, props, notes))
    return out, stats


def gate_start(rng):
    a = rng.choice([-3, -2, -1, 1, 2, 3, 4])
    p = rng.choice([0, 1, 2, 3, -1])
    q = rng.randint(-4, 4)
    m = rng.choice([-3, -2, -1, 1, 2, 3, 5])
    br = xr(a)
    PL = poly_tree((F(q), F(p)))
    PR = poly_tree((F(q + m), F(p)))
    SL = [(1, ('*', br, PL))]
    SR = [(1, ('*', br, PR))] if rng.random() < 0.7 else [(1, ('*', PR, br))]
    ctx = {'roots': [x for x in [-3, -2, -1, 0, 1, 2, 3, 4] if x != a][:5], 'frac': False}
    rng_roots = rng.sample(ctx['roots'], rng.choice([1, 2]))
    ctx['roots'] = rng_roots
    trace = ['gate_base']
    for _ in range(rng.randint(2, 4)):
        name = rng.choice(['scale', 'den_both', 'cancel', 'swap', 'scale'])
        res = INV_OPS[name](rng, SL, SR, ctx)
        if res is None:
            continue
        SL, SR = _clean(res[0]), _clean(res[1])
        trace.append(name)
    if len(trace) < 3:
        return None
    text = render_eq(rng, SL, SR)
    return text, a, trace


def gen_gate_family(rng, n_target, max_attempts, seen=None):
    out = []
    seen = set() if seen is None else seen
    attempts = 0
    while len(out) < n_target and attempts < max_attempts:
        attempts += 1
        R.clear_caches()
        g = gate_start(rng)
        if g is None:
            continue
        text, a, trace = g
        try:
            if not in_scope(text):
                continue
            start = initial_state(text)
        except RefError:
            continue
        if F(a) in known(start):
            continue
        if not divide_factor_structural(start, a):
            continue
        # tempting step: structurally possible, illegal here, and would change the solution set
        if apply_op(start, 'divide-restricted-factor', {'a': str(a)}) is not None:
            continue
        tmp = State(start.eq, tuple(sorted(set(start.restr) | {F(a)})))
        naive = op_divide_restricted(tmp, str(a))
        if naive is None:
            continue
        naive_state = State(naive.eq, tuple(sorted(set(naive.restr) - ({F(a)} - extract_state(start)))))
        if equivalent(start, naive_state)[0]:
            continue
        goal = rng.choice(['SOLVE', 'SOLVE', 'EXPANDED_POLY', 'ONE_FRACTION_ZERO', 'SOLVE'])
        r0 = layered(start, set(BFS_OPS) - {'divide-restricted-factor'}, goal, node_cap=6000, depth_cap=8)
        if not r0['found']:
            continue
        has_restr = bool(extract_state(start))
        allowed = pick_allowed(rng, r0['witness'], has_restr)
        if 'divide-restricted-factor' not in allowed:
            allowed = sorted(set(allowed) | {'divide-restricted-factor'}, key=OPS.index)
        r = layered(start, set(allowed), goal, node_cap=NODE_CAP, depth_cap=8)
        if not r['found'] or any(w['op'] == 'divide-restricted-factor' for w in r['witness']):
            continue
        sk = (canon(text), goal)
        if sk in seen:
            continue
        seen.add(sk)
        c = dict(text=text, trace=trace, ctx={}, start=start, allowed=allowed, r=r, goal=goal)
        props = {'gate': {'tempting_op': 'divide-restricted-factor', 'tempting_params': {'a': str(a)},
                          'legal': False, 'naive_result': naive.eq,
                          'naive_result_equivalent': False}}
        notes = (f"dividing both sides by (x-({a})) is structurally possible but (x-({a})) is not provably non-zero "
                 f"(not a restricted value); the naive result changes the solution set")
        out.append(finalize(5, c, props, notes))
    return out, {'attempts': attempts}


def gen_solve_mixed(rng, n_target, max_attempts, seen=None):
    out = []
    seen = set() if seen is None else seen
    attempts = 0
    all_ops = list(OPS)
    while len(out) < n_target and attempts < max_attempts:
        attempts += 1
        r_ = rng.random()
        kind = 'root' if r_ < 0.7 else ('nosol' if r_ < 0.86 else 'identity')
        profile = rng.choice(['generic', 'frac', 'generic', 'cancel'])
        c = candidate(rng, 'SOLVE', profile, 3, 6, kind, minL=3, cap0=5000, allowed_fixed=all_ops)
        if c is None:
            continue
        sk = canon(c['text'])
        if sk in seen:
            continue
        seen.add(sk)
        # verify the final state kind
        props = {'base_kind': kind}
        notes = f'SOLVE from a scrambled start ({kind}), unrestricted allowed operations'
        out.append(finalize(7, c, props, notes))
    return out, {'attempts': attempts}


def gen_variety(rng, n_starts, max_attempts, seen=None, group_offset=0):
    """family 6: the same start with 3+ different goals."""
    out = []
    groups = 0
    seen = set() if seen is None else seen
    attempts = 0
    while groups < n_starts and attempts < max_attempts:
        attempts += 1
        R.clear_caches()
        g0 = rng.choice(['SOLVE', 'ONE_FRACTION_ZERO', 'REDUCED'])
        d = draw_start(rng, g0, rng.choice(['frac', 'cancel', 'generic']), 3, 6)
        if not d:
            continue
        text, trace, ctx = d
        if canon(text) in seen:
            continue
        start = initial_state(text)
        has_restr = bool(extract_state(start))
        items = []
        for goal in GOALS:
            if goal_holds(goal, start, start):
                continue
            r0 = layered(start, set(BFS_OPS), goal, node_cap=4000, depth_cap=8)
            if not r0['found']:
                continue
            allowed = pick_allowed(rng, r0['witness'], has_restr)
            r = layered(start, set(allowed), goal, node_cap=NODE_CAP, depth_cap=8)
            if not r['found']:
                continue
            items.append((goal, allowed, r))
        if len(items) < 3:
            continue
        seqs = [tuple((w['op'], tuple(sorted(w['params'].items()))) for w in r['witness']) for _, _, r in items]
        diverge = any(not (a[:len(b)] == b or b[:len(a)] == a) for i, a in enumerate(seqs) for b in seqs[i + 1:])
        if not diverge:
            continue
        seen.add(canon(text))
        groups += 1
        gid = f'G{group_offset + groups:02d}'
        goals_here = [g for g, _, _ in items]
        p1 = {}
        for goal, allowed, r in items:
            try:
                ok, _, _ = run_P1(text, set(allowed), goal)
            except (ZeroDivisionError, RefError):
                ok = False
            p1[goal] = bool(ok)
        for goal, allowed, r in items:
            c = dict(text=text, trace=trace, ctx=ctx, start=start, allowed=allowed, r=r, goal=goal)
            props = {'variety_group': gid, 'group_goals': goals_here, 'witnesses_diverge': True,
                     'P1_on_group': p1}
            notes = (f"start shared by goals {','.join(goals_here)}; shortest witnesses diverge, so no single "
                     f"fixed operation order serves all goals")
            out.append(finalize(6, c, props, notes))
    return out, {'attempts': attempts, 'groups': groups}


def make_unreachable(rng, t, fam):
    """Exclude one operation the shortest witness needs; return (task|None, status)."""
    R.clear_caches()
    start = initial_state(t['start'])
    goal = t['goal']
    has_restr = bool(extract_state(start))
    W = t['witness']
    needed = [o for o in ops_of(W) if o != 'restrict']
    rng.shuffle(needed)
    if fam == 7:
        base_allowed = pick_allowed(rng, [w for w in W], has_restr, n_extra=rng.choice([0, 1, 2]))
    else:
        base_allowed = list(t['allowed'])
    unproven = None
    for o in needed:
        allowed2 = [a for a in base_allowed if a != o]
        r = layered(start, set(a for a in allowed2 if a in BFS_OPS), goal, node_cap=NODE_CAP, depth_cap=8)
        if r['found']:
            continue
        status = None
        if r['capped']:
            if unproven is None:
                unproven = (o, allowed2, 'unreachable-unproven', r['nodes'])
            continue
        status = 'proven-closed' if r.get('closed') else 'proven-depth8'
        props = {'excluded_op': o, 'status': status, 'bfs_nodes': r['nodes'], 'derived_from_witness_len': len(W)}
        notes = (f"goal unreachable: operation {o} is excluded from allowed; exhaustive search "
                 f"(depth <= 8, node cap {NODE_CAP}) finds no state satisfying {goal}")
        task = make_task_dict(fam, t['start'], goal, allowed2, None, t['props'].get('scramble', []), props, notes,
                              reachable=False)
        task['status'] = status
        task['excluded_op'] = o
        return task, status
    if unproven:
        o, allowed2, status, nodes = unproven
        props = {'excluded_op': o, 'status': status, 'bfs_nodes': nodes, 'derived_from_witness_len': len(W)}
        task = make_task_dict(fam, t['start'], goal, allowed2, None, t['props'].get('scramble', []), props,
                              f"excluded {o}; node cap hit before exhaustion, NOT claimed unreachable", reachable=False)
        task['status'] = status
        task['excluded_op'] = o
        return task, status
    return None, 'reachable-anyway'


def gen_tuning(rng, n_total, forbidden, max_attempts):
    quota = {'SOLVE': 24, 'ONE_FRACTION_ZERO': 10, 'EXPANDED_POLY': 10, 'CLEARED': 8, 'REDUCED': 8}
    scale = n_total / 60.0
    quota = {k: round(v * scale) for k, v in quota.items()}
    out = []
    seen = set(forbidden)
    attempts = 0
    have = {k: 0 for k in quota}
    while len(out) < n_total and attempts < max_attempts:
        attempts += 1
        goal = rng.choice([g for g in quota if have[g] < quota[g]])
        profile = rng.choice(['generic', 'frac', 'cancel'])
        base_kind = 'root'
        if goal == 'SOLVE' and rng.random() < 0.15:
            base_kind = rng.choice(['nosol', 'identity'])
        c = candidate(rng, goal, profile, 2, 6, base_kind, minL=1, cap0=4000)
        if c is None:
            continue
        sk = canon(c['text'])
        if sk in seen or c['text'] in seen:
            continue
        seen.add(sk)
        have[goal] += 1
        W = with_restrict(c['start'], c['r']['witness'], c['allowed'])
        ok, rep = verify_trace(c['text'], W, goal)
        assert ok, rep
        out.append({'family': 'tuning', 'start': c['text'], 'goal': goal, 'allowed': c['allowed'],
                    'reachable': True, 'witness': W, 'notes': 'tuning task (used only to choose P2 orders)',
                    'props': {'scramble': c['trace'], 'shortest_len': c['r']['L']}})
    return out, {'attempts': attempts}


# ----------------------------------------------------------------------------
# jobs (one per family; deterministic given SEED), reuse set, limits set, main
# ----------------------------------------------------------------------------
N_REACH = {1: 36, 2: 36, 3: 36, 4: 36, 5: 36, 6: 12, 7: 36}   # family 6: number of start groups
N_UNREACH = 30
LOG = None


def log(msg):
    sys.stderr.write(msg + '\n')
    sys.stderr.flush()


def run_family_job(fam):
    rng = random.Random(SEED + 1000 * fam)
    t0 = time.time()
    reach, unreach = [], []
    seen = set()
    proven = 0
    unproven_extra = []
    rounds = 0
    target = N_REACH[fam]
    derived_from = set()
    while rounds < 14:
        rounds += 1
        if fam in (1, 2, 3, 4):
            new, st = gen_basic_family(fam, rng, 12, 4000, seen)
        elif fam == 5:
            new, st = gen_gate_family(rng, 12, 3000, seen)
        elif fam == 6:
            new, st = gen_variety(rng, 4, 2500, seen, group_offset=len({t['props']['variety_group'] for t in reach}) + 1)
        else:
            new, st = gen_solve_mixed(rng, 12, 3000, seen)
        reach.extend(new)
        log(f'[fam {fam}] round {rounds}: +{len(new)} reachable (total {len(reach)}), {time.time()-t0:.0f}s')
        for t in new:
            if proven >= N_UNREACH + 4:
                break
            task, status = make_unreachable(rng, t, fam)
            if task is None:
                continue
            if status.startswith('proven'):
                unreach.append(task)
                proven += 1
            else:
                unproven_extra.append(task)
        enough_reach = len(reach) >= (target if fam != 6 else 36)
        if enough_reach and proven >= N_UNREACH:
            break
    unreach = unreach[:max(N_UNREACH, 0)] if len(unreach) > N_UNREACH + 4 else unreach
    log(f'[fam {fam}] done: reachable {len(reach)}, unreachable proven {len(unreach)}, '
        f'unproven {len(unproven_extra)}, {time.time()-t0:.0f}s')
    return fam, reach, unreach, unproven_extra


def run_tuning_job(forbidden):
    rng = random.Random(SEED + 9000)
    out, st = gen_tuning(rng, 60, forbidden, 4000)
    return out


def _task_sort_key(t):
    return (GOALS.index(t['goal']) if t['goal'] in GOALS else 9, t['start'])


def build_reuse(rng):
    """60 pairs: (K05.1 style linear step, K05.2 style rational step) for the same rule."""
    plan = [('mul-div-const', 12), ('add-sub-both-sides', 12), ('collect-terms', 12), ('expand', 12),
            ('move-to-left', 12)]
    pairs = []
    attempts = 0
    for rule, n in plan:
        got = 0
        seen = set()
        while got < n and attempts < 20000:
            attempts += 1
            goal = 'SOLVE'
            d = draw_start(rng, goal, rng.choice(['frac', 'cancel', 'generic']), 3, 6)
            if not d:
                continue
            text, trace, ctx = d
            start = initial_state(text)
            if not extract_state(start):
                continue  # need a genuinely rational equation
            st = start
            prefix = []
            ok = True

            def step(name, params=None):
                nonlocal st
                ns = apply_op(st, name, params or {})
                if ns is None:
                    return False
                prefix.append({'op': name, 'params': params or {}})
                st = ns
                return True

            if not step('restrict'):
                continue
            if rule in ('move-to-left', 'expand', 'collect-terms', 'add-sub-both-sides', 'mul-div-const'):
                if not step('clear-denominators'):
                    continue
            if rule in ('collect-terms', 'add-sub-both-sides', 'mul-div-const'):
                step('expand')
            if rule in ('add-sub-both-sides', 'mul-div-const'):
                step('collect-terms')
            if rule == 'mul-div-const':
                allowed = {'collect-terms', 'add-sub-both-sides', 'expand'}
                st2, tr = linear_delegate(st, allowed)
                for t_ in tr:
                    prefix.append(t_)
                st = st2
            # choose parameters for the rule on the state before the step
            params = None
            L_, R_ = parse_eq(st.eq)
            if rule == 'mul-div-const':
                if not (len(terms_of(L_)) == 1 and mono_of(L_) is not None and mono_of(L_)[1] == 1
                        and mono_of(L_)[0] not in (0, 1) and x_free(R_)):
                    continue
                params = {'c': R._fstr(1 / mono_of(L_)[0])}
            elif rule == 'add-sub-both-sides':
                cs = [(s, t) for s, t in terms_of(L_) if x_free(t) and t != ZERO]
                if not cs or not any(not x_free(t) for s, t in terms_of(L_)):
                    continue
                s_, t_ = cs[0]
                params = {'term': pr(t_ if -s_ > 0 else ('neg', t_))}
            else:
                params = {}
            new = apply_op(st, rule, params)
            if new is None:
                continue
            # K05.1 style: the same polynomial equation as a plain linear task (no restrictions)
            lin = initial_state(st.eq)
            new1 = apply_op(lin, rule, params)
            if new1 is None or new1.eq != new.eq:
                continue
            if lin.eq in seen:
                continue
            seen.add(lin.eq)
            got += 1
            r1 = layered(lin, set(BFS_OPS), 'SOLVE', node_cap=3000, depth_cap=8)
            r2 = layered(start, set(BFS_OPS), 'SOLVE', node_cap=3000, depth_cap=8)
            pairs.append({
                'rule': rule,
                'k051': {'start': lin.eq, 'restrictions': [], 'op': rule, 'params': params,
                         'expected_eq': new1.eq, 'expected_restrictions': [R._fstr(r) for r in new1.restr],
                         'task': {'start': lin.eq, 'goal': 'SOLVE',
                                  'witness': r1['witness'] if r1['found'] else None}},
                'k052': {'start': start.eq, 'prefix': prefix, 'state_before': {'eq': st.eq, 'restrictions': [R._fstr(r) for r in st.restr]},
                         'op': rule, 'params': params, 'expected_eq': new.eq,
                         'expected_restrictions': [R._fstr(r) for r in new.restr],
                         'task': {'start': start.eq, 'goal': 'SOLVE',
                                  'witness': r2['witness'] if r2['found'] else None}},
                'notes': f'the rule {rule} must be served by one implementation in both settings',
            })
    return pairs


def build_limits(rng):
    items = []

    def add(cat, text, expect=None, either=False, refusals=None, note=''):
        verdict = classify_limits(text)
        if verdict[0] == 'refuse':
            exp = {'kind': 'refuse', 'codes': [verdict[1]]}
            if refusals:
                exp['codes'] = sorted(set(exp['codes'] + refusals))
        elif verdict[0] == 'answer':
            exp = {'kind': 'either' if either else 'answer', 'solution': verdict[1]}
            if either:
                exp['acceptable_refusals'] = refusals or ['SEARCH_LIMIT', 'UNSUPPORTED_EXPRESSION']
        else:  # out-of-scope but answerable
            exp = {'kind': 'either', 'solution': verdict[1],
                   'acceptable_refusals': refusals or ['UNSUPPORTED_EXPRESSION']}
        if expect:
            assert exp['kind'] == expect or exp['kind'] == 'either', (text, exp, expect)
        items.append({'category': cat, 'text': text, 'goal': 'SOLVE', 'expected': exp,
                      'node_limit': NODE_CAP, 'time_limit_s': 5, 'notes': note})

    # malformed
    for t in ['2*x + 3 = ', '= 5', '2*x + 3', '(x + 1 = 4', 'x + 1) = 4', '2x + 1 = 5', '3(x + 1) = 9',
              'x = = 2', '2*x + * 3 = 7', 'x^ = 4', '1..5*x = 3', 'x 2 = 4', 'x(x + 1) = 0', '2*x + 3 = 7 = 7']:
        add('malformed', t, 'refuse')
    # unsupported operators / expressions
    for t in ['sqrt(x) = 2', 'abs(x) = 3', 'x**2 = 4', 'x != 3', 'x % 2 = 1', 'sin(x) = 0', 'log(x) = 1',
              'x < 3', 'x >= 2', '|x| = 2', '2^x = 8', 'x^0.5 = 2', 'x^(1/2) = 3', 'y + x = 3',
              'x^x = 4']:
        add('unsupported', t, 'refuse')
    # domain unresolved
    for t in ['1/(x - x) = 1', '0^0 + x = 1', 'x/(x - x) = 2', '1/0 = x', '1/(x^2 - 2) = 1', '1/(x^2 - 3*x + 1) = 2',
              'x/(x^3 - 2) = 1', '2/(x - 1) + 1/(x^2 - 5) = 0', '(x + 1)^(-1) + 1/(0*x) = 2', 'x^(-1) = 1/(x - x)']:
        add('domain-unresolved', t, 'refuse')
    # large coefficients
    for t in ['123456789*x = 987654321*x + 55555', '1000000000000*x + 1 = 3', '0.000001*x = 3',
              '1/(1000000007*x - 1) = 1', '999999999999*x/(x - 1) = 999999999999',
              '12345678901234567890*x = 1', 'x/(100000*x - 3) + 7 = 8', '98765432109876543210/(x + 1) = 2',
              '3*x - 123456789012 = 7*x + 987654321098', '(2*x + 1)/(1000003*x + 7) = 0']:
        add('large-coefficients', t, either=True, refusals=['SEARCH_LIMIT', 'UNSUPPORTED_EXPRESSION'])
    # deep nesting
    for depth in (10, 25, 50, 100):
        t = '(' * depth + 'x' + ')' * depth + ' + 1 = 4'
        add('deep-nesting', t, either=True, refusals=['SEARCH_LIMIT', 'UNSUPPORTED_EXPRESSION'])
    for depth in (130, 400):
        t = '(' * depth + 'x' + ')' * depth + ' + 1 = 4'
        add('deep-nesting', t, 'refuse', refusals=['SEARCH_LIMIT'])
    t = '1/(1 + 1/(1 + 1/(x + 1))) = 2'
    add('deep-nesting', t, either=True, refusals=['UNSUPPORTED_EXPRESSION', 'DOMAIN_UNRESOLVED', 'SEARCH_LIMIT'])
    add('deep-nesting', '-' * 60 + 'x = 3', either=True, refusals=['UNSUPPORTED_EXPRESSION', 'SEARCH_LIMIT'])
    # near-boundary
    for t, note in [
        ('1/(x - 1) - 3/(x - 2) + 2/(x - 3) = 0', 'three distinct denominator factors, reduced numerator degree 1 (in scope)'),
        ('1/(x - 1) - 2/(x - 2) + 2/(x - 3) - 1/(x - 4) = 0', 'four distinct denominator factors (outside the boundary)'),
        ('1/(x - 1)^2 + 1/(x - 1) = 2', 'repeated factor'),
        ('1/(x - 1)^3 = 2/(x - 1)', 'multiplicity three'),
        ('(x^2 - 1)/(x - 1) = 3', 'removable singularity, reduced degree 1'),
        ('(x^2 - 1)/(x - 1) = 2', 'removable singularity whose cancelled solution is restricted'),
        ('(x - 2)*(x + 1) = (x - 2)*3', 'common factor, reduced degree 2 with double root'),
        ('x^2 = 4', 'degree 2, two rational roots (outside)'),
        ('x^2 = 2', 'degree 2, irrational roots'),
        ('x^2 + 1 = 0', 'degree 2, no real roots'),
        ('x^3 = 8', 'cubic'),
        ('(x + 1)/(x + 1) = 1', 'identity on the domain'),
        ('x/(x - 1) = 1 + 1/(x - 1)', 'extraneous root equals restriction (no solution)'),
        ('x/(x - 1) - 1/(x - 1) = 1', 'identity except x = 1'),
        ('2*x + 1 = 2*x + 3', 'no solution'),
        ('x = x', 'identity'),
        ('1/x = 1/x', 'identity with restriction'),
        ('1/(2*x - 4) = 3/(x - 2)', 'proportional denominators'),
        ('0*x = 0', 'zero coefficient identity'),
        ('x^0 = 1', 'zero power base restricted'),
        ('(x - 3)^0 * x = 3', 'zero-power base x - 3'),
        ('1/(x + 1/2) = 2', 'fractional root'),
        ('x/(x - 0.5) = 3', 'decimal restriction'),
    ]:
        add('near-boundary', t, note=note)
    assert len(items) == 80, len(items)
    for i, it in enumerate(items):
        it['id'] = f'C-{i + 1:03d}'
    return items


def _dump(path, obj):
    with open(path, 'w') as fh:
        json.dump(obj, fh, indent=1, sort_keys=True, ensure_ascii=False, default=str)
        fh.write('\n')


def _code_hash():
    import hashlib
    h = hashlib.sha256()
    h.update(open(os.path.join(HERE, 'refimpl.py'), 'rb').read())
    src = open(os.path.join(HERE, 'gen_r2_sets.py')).read()
    h.update(src.split('def _dump(path, obj):')[0].encode())   # job code only (not assembly / main)
    return h.hexdigest()[:12]


def _job(spec):
    import pickle
    cdir = os.environ.get('R2_JOB_CACHE')
    path = None
    if cdir:
        os.makedirs(cdir, exist_ok=True)
        path = os.path.join(cdir, f'job_{spec}_{SEED}_{_code_hash()}.pkl')
        if os.path.exists(path):
            with open(path, 'rb') as fh:
                return pickle.load(fh)
    res = ('T', run_tuning_job(set())) if spec == 'T' else ('F', run_family_job(spec))
    if path:
        with open(path, 'wb') as fh:
            pickle.dump(res, fh)
    log(f'[job {spec}] exceptions skipped: {EXC_COUNT}')
    return res


def main(out_dir=HERE, procs=2, stage='all'):
    t0 = time.time()
    if stage == 'aux':
        return main_aux(out_dir, t0)
    specs = [3, 4, 5, 2, 1, 7, 6, 'T']
    results = {}
    if procs > 1:
        import multiprocessing as mp
        with mp.Pool(procs) as pool:
            for tag, res in pool.imap_unordered(_job, specs):
                key_ = res[0] if tag == 'F' else 'T'
                results[key_] = res
                log(f'finished job {key_} at {time.time()-t0:.0f}s')
    else:
        for sp in specs:
            tag, res = _job(sp)
            results[res[0] if tag == 'F' else 'T'] = res
    tasks = []
    counters = {}
    for fam in range(1, 8):
        _, reach, unreach, unproven = results[fam]
        for t in reach:
            counters[fam] = counters.get(fam, 0) + 1
            t = dict(t)
            t['id'] = f'A-{fam}-{counters[fam]:03d}'
            tasks.append(t)
        # an unproven task that an independent search (refimpl.bfs) does reach is dropped, not claimed
        kept_unproven = []
        for t in unproven:
            R.clear_caches()
            st0 = initial_state(t['start'])
            rr = R.bfs(st0, {o for o in t['allowed'] if o != 'restrict'}, t['goal'], NODE_CAP, 8, orig=st0)
            if not rr['found']:
                kept_unproven.append(t)
        for j, t in enumerate(unreach + kept_unproven):
            t = dict(t)
            t['id'] = f'A-{fam}-U{j + 1:03d}'
            tasks.append(t)
    comp_starts = {canon(t['start']) for t in tasks} | {t['start'] for t in tasks}
    tuning = [t for t in results['T'] if canon(t['start']) not in comp_starts and t['start'] not in comp_starts]
    k = 0
    while len(tuning) < 60 and k < 6:
        k += 1
        rng = random.Random(SEED + 9100 + k)
        extra, _ = gen_tuning(rng, 60 - len(tuning), comp_starts | {canon(t['start']) for t in tuning}, 3000)
        tuning.extend(extra)
    tuning = tuning[:60]
    for i, t in enumerate(tuning):
        t['id'] = f'T-{i + 1:03d}'
    meta = {'seed': SEED, 'generator': 'tools/mathematics/r2/gen_r2_sets.py', 'node_cap': NODE_CAP,
            'spec': 'docs/milestones/R2_ACCEPTANCE_SPEC.md'}
    _dump(os.path.join(out_dir, 'composition.json'), {'meta': meta, 'tasks': tasks})
    _dump(os.path.join(out_dir, 'tuning.json'), {'meta': meta, 'tasks': tuning})
    log(f'generated: {len(tasks)} composition tasks, {len(tuning)} tuning in {time.time()-t0:.0f}s')
    if stage == 'all':
        main_aux(out_dir, t0)


def main_aux(out_dir, t0):
    meta = {'seed': SEED, 'generator': 'tools/mathematics/r2/gen_r2_sets.py', 'node_cap': NODE_CAP,
            'spec': 'docs/milestones/R2_ACCEPTANCE_SPEC.md'}
    rng = random.Random(SEED + 7000)
    pairs = build_reuse(rng)
    for i, p in enumerate(pairs):
        p['id'] = f'B-{i + 1:03d}'
    _dump(os.path.join(out_dir, 'reuse.json'), {'meta': meta, 'pairs': pairs})
    limits = build_limits(random.Random(SEED + 8000))
    _dump(os.path.join(out_dir, 'limits.json'), {'meta': meta, 'tasks': limits})
    log(f'generated: {len(pairs)} reuse, {len(limits)} limits in {time.time()-t0:.0f}s')


if __name__ == '__main__':
    main(procs=int(os.environ.get('R2_PROCS', '2')), stage=os.environ.get('R2_STAGE', 'all'))
