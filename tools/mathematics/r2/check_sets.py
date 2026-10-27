#!/usr/bin/env python3
"""Independent self-check of the frozen R2 acceptance datasets.

(a) replay every witness with refimpl: each step legal, solution set over the original domain
    preserved, restrictions never shrink and contain the originals, goal holds at the end.
(b) exhaustive BFS (depth <= 8, node cap 20000) for every claimed-unreachable task.
(c) families 3 and 4 (and the other family properties) are re-established by computation.
(d) baselines P1, P2 (tuned on tuning.json only), P3, P4 on composition.json.
Usage: python3 check_sets.py [--write-frozen]
"""
from __future__ import annotations

import hashlib
import json
import os
import random
import statistics
import sys
import time
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import refimpl as R  # noqa: E402
from refimpl import (OPS, GOALS, apply_op, bfs, canon, equivalent, extract_state, goal_holds,  # noqa: E402
                     initial_state, in_scope, key, size, size_parts, successors)

NODE_LIMIT = 20000
FILES = ['composition.json', 'reuse.json', 'limits.json', 'tuning.json']
FAMS = ['order', 'shortest-not-obvious', 'local-trap', 'complexity-up', 'restriction-gate', 'goal-variety',
        'solve-mixed']
P2_ORDERS = None


def load(name):
    with open(os.path.join(HERE, name)) as fh:
        return json.load(fh)


def sha(name):
    return hashlib.sha256(open(os.path.join(HERE, name), 'rb').read()).hexdigest()


# ----------------------------------------------------------------------------
# independent numeric evaluator (does not use refimpl's rational-function code)
# ----------------------------------------------------------------------------
class Undefined(Exception):
    pass


def ev(t, x):
    k = t[0]
    if k == 'n':
        return t[1]
    if k == 'x':
        return x
    if k == 'neg':
        return -ev(t[1], x)
    if k == '+':
        return ev(t[1], x) + ev(t[2], x)
    if k == '-':
        return ev(t[1], x) - ev(t[2], x)
    if k == '*':
        return ev(t[1], x) * ev(t[2], x)
    if k == '/':
        d = ev(t[2], x)
        if d == 0:
            raise Undefined
        return ev(t[1], x) / d
    if k == '^':
        b = ev(t[1], x)
        e = t[2]
        if b == 0 and e <= 0:
            raise Undefined
        return b ** e
    raise ValueError(k)


def truth(eq, p):
    L, Rr = R.parse_eq(eq)
    try:
        return ev(L, p) == ev(Rr, p)
    except Undefined:
        return None


def numeric_check(orig, new, extra_points):
    """for points defined in the original: truth of the equation must agree with the new state's."""
    F = R.F
    pts = {F(n, d) for n in range(-14, 15) for d in (1, 2, 3)} | set(extra_points)
    bad = []
    for p in sorted(pts):
        a = truth(orig.eq, p)
        if a is None or p in orig.restr and False:
            continue
        b = truth(new.eq, p)
        if b is None:
            b = False   # undefined in the new state: only legal if excluded by an (original) restriction
            if p not in R.known(new):
                bad.append(p)
                continue
        if a != b:
            bad.append(p)
            if len(bad) > 3:
                break
    return bad


# ----------------------------------------------------------------------------
# (a) replay
# ----------------------------------------------------------------------------
def replay_check(t):
    """returns list of problems (empty = ok)"""
    probs = []
    st = initial_state(t['start'])
    orig = st
    R0 = extract_state(orig)
    allowed = set(t['allowed'])
    for i, w in enumerate(t['witness']):
        if w['op'] not in allowed:
            probs.append(f'step {i}: {w["op"]} not in allowed')
        new = apply_op(st, w['op'], w['params'])
        if new is None:
            probs.append(f'step {i}: {w["op"]} illegal or inapplicable')
            return probs
        if not set(st.restr) <= set(new.restr):
            probs.append(f'step {i}: restrictions shrank')
        if not R0 <= set(new.restr):
            probs.append(f'step {i}: original restrictions not retained')
        ok, why = equivalent(orig, new)
        if not ok:
            probs.append(f'step {i}: solution set not preserved ({why})')
        extra = set()
        for s_ in (orig, new):
            extra |= set(R.solset(s_)[1])
        bad = numeric_check(orig, new, extra)
        if bad:
            probs.append(f'step {i}: numeric cross-check disagrees at x={[str(b) for b in bad]}')
        st = new
    if not goal_holds(t['goal'], st, orig):
        probs.append('goal predicate does not hold at the end')
    return probs


# ----------------------------------------------------------------------------
# (c) family properties, recomputed from the stored witness with refimpl's own bfs
# ----------------------------------------------------------------------------
def bfs_ops(t):
    return {o for o in t['allowed'] if o != 'restrict'}


def witness_states(t):
    sts = [initial_state(t['start'])]
    for w in t['witness']:
        sts.append(apply_op(sts[-1], w['op'], w['params']))
    return sts


def prop_order(t):
    W = [w for w in t['witness'] if w['op'] != 'restrict']
    start = initial_state(t['start'])
    sts = [start]
    for w in W:
        sts.append(apply_op(sts[-1], w['op'], w['params']))
    for i in range(len(W) - 1):
        a, b = W[i], W[i + 1]
        s1 = apply_op(sts[i], b['op'], b['params'])
        if s1 is None:
            continue
        s2 = apply_op(s1, a['op'], a['params'])
        if s2 is not None and key(s2) == key(sts[i + 2]):
            continue
        cur = s2
        for w in W[i + 2:]:
            if cur is None:
                break
            cur = apply_op(cur, w['op'], w['params'])
        if cur is not None and goal_holds(t['goal'], cur, start):
            continue
        return True
    return False


def prop_shortest(t):
    start = initial_state(t['start'])
    ops = bfs_ops(t)
    L = t['props']['shortest_len']
    shorter = bfs(start, ops, t['goal'], NODE_LIMIT, L - 1, orig=start)
    if shorter['found'] or shorter['capped']:
        return False
    s0 = size_parts(start)
    first = []
    for name, p, ns in successors(start, ops):
        r = bfs(ns, ops, t['goal'], NODE_LIMIT, L - 1, orig=start)
        if r['found'] and r['depth'] <= L - 1:
            first.append(ns)
    if not first:
        return False
    for ns in first:
        sp = size_parts(ns)
        if any(sp[i] < s0[i] for i in range(3)) or sum(sp) < sum(s0):
            return False
    return any(size(ns) < size(start) for _, _, ns in successors(start, ops))


def prop_trap(t):
    start = initial_state(t['start'])
    ops = bfs_ops(t)
    L = t['props']['shortest_len']
    best = None
    for name, p, ns in successors(start, ops):
        if best is None or size(ns) < size(best):
            best = ns
    if best is None or size(best) >= size(start):
        return False
    r = bfs(best, ops, t['goal'], NODE_LIMIT, L, orig=start)
    return (not r['found']) and (not r['capped'])


def prop_complexity(t):
    start = initial_state(t['start'])
    ops = bfs_ops(t)
    t0, d0 = size_parts(start)[:2]
    flt = lambda st: size_parts(st)[0] <= t0 and size_parts(st)[1] <= d0
    r = bfs(start, ops, t['goal'], NODE_LIMIT, 8, state_filter=flt, orig=start)
    if r['found'] or r['capped']:
        return False
    sts = witness_states(t)
    return any(size_parts(s)[0] > t0 or size_parts(s)[1] > d0 for s in sts)


def prop_gate(t):
    start = initial_state(t['start'])
    g = t['props']['gate']
    a = g['tempting_params']['a']
    if apply_op(start, 'divide-restricted-factor', {'a': a}) is not None:
        return False
    if R.F(a) in R.known(start):
        return False
    if not R.divide_factor_structural(start, a):
        return False
    tmp = R.State(start.eq, tuple(sorted(set(start.restr) | {R.F(a)})))
    naive = R.op_divide_restricted(tmp, a)
    ns = R.State(naive.eq, tuple(sorted(set(naive.restr) - {R.F(a)})))
    if equivalent(start, ns)[0]:
        return False
    return not any(w['op'] == 'divide-restricted-factor' for w in t['witness'])


def prop_solve(t):
    return t['goal'] == 'SOLVE' and set(t['allowed']) == set(OPS)


FAM_PROP = {'order': prop_order, 'shortest-not-obvious': prop_shortest, 'local-trap': prop_trap,
            'complexity-up': prop_complexity, 'restriction-gate': prop_gate, 'solve-mixed': prop_solve}


# ----------------------------------------------------------------------------
# per-task worker
# ----------------------------------------------------------------------------
def init_worker(p2):
    global P2_ORDERS
    P2_ORDERS = p2


def task_worker(t):
    R.clear_caches()
    out = {'id': t['id'], 'family': t['family'], 'goal': t['goal'], 'reachable': t['reachable']}
    t_start = time.time()
    allowed = set(t['allowed'])
    if t['reachable']:
        out['replay_problems'] = replay_check(t)
        out['in_scope'] = in_scope(t['start'])
        out['witness_len'] = len(t['witness'])
        fp = FAM_PROP.get(t['family'])
        out['family_property'] = bool(fp(t)) if fp else None
        ok1, _, _ = R.run_P1(t['start'], allowed, t['goal'])
        ok4, _, _ = R.run_P4(t['start'], allowed, t['goal'])
        order = P2_ORDERS[t['goal']]
        ok2, _, _ = R.run_priority(t['start'], allowed, t['goal'], order)
        ok3, r3 = R.run_P3(t['start'], allowed, t['goal'], NODE_LIMIT)
        out.update(P1=bool(ok1), P2=bool(ok2), P3=bool(ok3), P4=bool(ok4), P3_nodes=r3['nodes'],
                   P3_capped=bool(r3['capped']))
        if t['family'] == 'local-trap':
            out['P4_fails'] = not ok4
    else:
        start = initial_state(t['start'])
        ops = {o for o in allowed if o != 'restrict'}
        r = bfs(start, ops, t['goal'], NODE_LIMIT, 8, orig=start)
        out['bfs_reached'] = bool(r['found'])
        out['bfs_capped'] = bool(r['capped'])
        out['bfs_nodes'] = r['nodes']
        out['claimed_status'] = t.get('status')
        out['in_scope'] = in_scope(t['start'])
        # baselines must not "succeed" on a task that is unreachable
        out['baseline_false_success'] = [name for name, f in
                                         (('P1', lambda: R.run_P1(t['start'], allowed, t['goal'])[0]),
                                          ('P4', lambda: R.run_P4(t['start'], allowed, t['goal'])[0]),
                                          ('P2', lambda: R.run_priority(t['start'], allowed, t['goal'],
                                                                         P2_ORDERS[t['goal']])[0]))
                                         if f()]
    out['secs'] = round(time.time() - t_start, 2)
    return out


# ----------------------------------------------------------------------------
# P2 tuning (only tuning.json)
# ----------------------------------------------------------------------------
_POOL = None


def _p2_scores(t):
    R.clear_caches()
    return [int(R.run_priority(t['start'], set(t['allowed']), t['goal'], order)[0]) for order in _POOL]


def _p2_init(pool):
    global _POOL
    _POOL = pool


def tune_p2(tuning, rng_seed=4242, pool_size=90):
    rng = random.Random(rng_seed)
    base = ['restrict', 'cancel-common-factor', 'clear-denominators', 'expand', 'collect-terms', 'move-to-left',
            'divide-restricted-factor', 'add-sub-both-sides', 'mul-div-const', 'accept-candidate', 'combine-terms']
    pool = [tuple(base)]
    while len(pool) < pool_size:
        o = list(OPS)
        rng.shuffle(o)
        if tuple(o) not in pool:
            pool.append(tuple(o))
    import multiprocessing as mp
    with mp.Pool(2, initializer=_p2_init, initargs=(pool,)) as mpool:
        rows = mpool.map(_p2_scores, tuning, chunksize=2)
    score = {g: [0] * len(pool) for g in GOALS}
    count = Counter()
    for t, row in zip(tuning, rows):
        count[t['goal']] += 1
        for i, v in enumerate(row):
            score[t['goal']][i] += v
    best = {}
    for g in GOALS:
        if count[g] == 0:
            best[g] = pool[0]
            continue
        i = max(range(len(pool)), key=lambda j: (score[g][j], -j))
        best[g] = pool[i]
    info = {g: {'tuning_tasks': count[g], 'tuning_successes': max(score[g]) if count[g] else 0,
                'order': list(best[g])} for g in GOALS}
    return best, info


def pct(a, b):
    return f'{100.0 * a / b:.1f}%' if b else 'n/a'


def main():
    write_frozen = '--write-frozen' in sys.argv
    t0 = time.time()
    comp = load('composition.json')
    tuning = load('tuning.json')['tasks']
    reuse = load('reuse.json')['pairs']
    limits = load('limits.json')['tasks']
    tasks = comp['tasks']
    report = {}
    lines = []

    def out(s=''):
        print(s, flush=True)
        lines.append(s)

    # ---- structural checks
    reach = [t for t in tasks if t['reachable']]
    unreach = [t for t in tasks if not t['reachable']]
    out(f'composition: {len(tasks)} tasks, reachable {len(reach)}, unreachable {len(unreach)}; '
        f'tuning {len(tuning)}; reuse pairs {len(reuse)}; limits {len(limits)}')
    comp_texts = {canon(t['start']) for t in tasks} | {t['start'] for t in tasks}
    overlap = [t['id'] for t in tuning if canon(t['start']) in comp_texts or t['start'] in comp_texts]
    out(f'tuning/composition overlap by start text: {len(overlap)}')
    fam_counts = Counter(t['family'] for t in reach)
    unfam_counts = Counter(t['family'] for t in unreach)
    # ---- P2 tuning
    out('tuning P2 on tuning.json only ...')
    P2, p2info = tune_p2(tuning)
    for g in GOALS:
        out(f'  P2[{g}]: tuned on {p2info[g]["tuning_tasks"]} tasks, best order solves '
            f'{p2info[g]["tuning_successes"]} of them')
    # ---- per-task checks in parallel
    import multiprocessing as mp
    with mp.Pool(2, initializer=init_worker, initargs=(P2,)) as pool:
        res = pool.map(task_worker, tasks, chunksize=2)
    byid = {r['id']: r for r in res}
    # (a)
    bad_replay = [r for r in res if r['reachable'] and r['replay_problems']]
    out(f'(a) witnesses replayed: {len(reach)}; failing replay/solution-set/restriction/goal checks: {len(bad_replay)}')
    for r in bad_replay[:10]:
        out(f'    {r["id"]}: {r["replay_problems"][:2]}')
    notscope = [r['id'] for r in res if not r['in_scope']]
    out(f'    starts outside the scope boundary: {len(notscope)}')
    # (b)
    reached = [r for r in res if not r['reachable'] and r['bfs_reached']]
    capped = [r for r in res if not r['reachable'] and r['bfs_capped'] and not r['bfs_reached']]
    unproven_claim = [r for r in res if not r['reachable'] and r.get('claimed_status') == 'unreachable-unproven']
    proven = [r for r in res if not r['reachable'] and not r['bfs_reached'] and not r['bfs_capped']]
    out(f'(b) claimed-unreachable tasks: {len(unreach)}; BFS reaches the goal: {len(reached)}; '
        f'cap hit (unreachable-unproven): {len(capped)}; proven unreachable within depth 8: {len(proven)}')
    fs = [r for r in res if not r['reachable'] and r['baseline_false_success']]
    out(f'    baselines claiming success on an unreachable task: {len(fs)}')
    per_u = Counter(t['family'] for t in unreach if byid[t['id']]['bfs_reached'] is False
                    and not byid[t['id']]['bfs_capped'])
    out('    proven-unreachable per family: ' + ', '.join(f'{f}={per_u[f]}' for f in FAMS))
    # (c)
    out('(c) family properties recomputed from the stored witnesses (independent code path):')
    fam_prop = {}
    for f in FAMS:
        ts = [r for r in res if r['reachable'] and r['family'] == f]
        if f == 'goal-variety':
            groups = defaultdict(list)
            for t in reach:
                if t['family'] == f:
                    groups[t['start']].append(t)
            okg = 0
            for s, ts_ in groups.items():
                goals = {t['goal'] for t in ts_}
                seqs = [tuple((w['op'], tuple(sorted(w['params'].items()))) for w in t['witness']) for t in ts_]
                div = any(not (a[:len(b)] == b or b[:len(a)] == a) for i, a in enumerate(seqs) for b in seqs[i + 1:])
                okg += int(len(goals) >= 3 and div)
            fam_prop[f] = (okg, len(groups))
            out(f'    {f}: {okg}/{len(groups)} start-groups have >= 3 goals with diverging witnesses '
                f'({len(ts)} tasks)')
        else:
            n_ok = sum(1 for r in ts if r['family_property'])
            fam_prop[f] = (n_ok, len(ts))
            out(f'    {f}: {n_ok}/{len(ts)} tasks satisfy the family property')
    lt = [r for r in res if r['reachable'] and r['family'] == 'local-trap']
    cu = [t for t in reach if t['family'] == 'complexity-up']
    out(f'    local-trap: greedy P4 fails on {sum(1 for r in lt if r.get("P4_fails"))}/{len(lt)} tasks '
        f'(local move leads to a state needing >= 2 extra steps or unreachable on '
        f'{fam_prop["local-trap"][0]}/{fam_prop["local-trap"][1]})')
    out(f'    complexity-up: witness passes through a state with more terms or higher degree than the start on '
        f'{fam_prop["complexity-up"][0]}/{fam_prop["complexity-up"][1]} tasks')
    # (d)
    out('(d) baselines on reachable composition tasks (success = goal predicate holds and the final state is '
        'equivalent to the start over the original domain):')
    rows = []
    hdr = f'    {"family":22s} {"n":>4s} {"P1":>8s} {"P2":>8s} {"P3":>8s} {"P4":>8s}'
    out(hdr)
    totals = Counter()
    base_res = {}
    for f in FAMS + ['ALL']:
        ts = [r for r in res if r['reachable'] and (f == 'ALL' or r['family'] == f)]
        n = len(ts)
        c = {p: sum(1 for r in ts if r[p]) for p in ('P1', 'P2', 'P3', 'P4')}
        base_res[f] = {'n': n, **c}
        out(f'    {f:22s} {n:4d} ' + ' '.join(f'{pct(c[p], n):>8s}' for p in ('P1', 'P2', 'P3', 'P4')))
    out('    by goal (ALL families):')
    for g in GOALS:
        ts = [r for r in res if r['reachable'] and r['goal'] == g]
        n = len(ts)
        c = {p: sum(1 for r in ts if r[p]) for p in ('P1', 'P2', 'P3', 'P4')}
        base_res['goal:' + g] = {'n': n, **c}
        out(f'    {g:22s} {n:4d} ' + ' '.join(f'{pct(c[p], n):>8s}' for p in ('P1', 'P2', 'P3', 'P4')))
    best = max(base_res['ALL'][p] for p in ('P1', 'P2', 'P4'))
    out(f'    best of P1/P2/P4 on ALL reachable: {pct(best, base_res["ALL"]["n"])}; '
        f'P3 hit the {NODE_LIMIT}-node limit on {sum(1 for r in res if r["reachable"] and r["P3_capped"])} tasks')
    n3 = [r['P3_nodes'] for r in res if r['reachable']]
    out(f'    P3 nodes visited: median {statistics.median(n3):.0f}, p95 {sorted(n3)[int(0.95 * len(n3)) - 1]}, '
        f'max {max(n3)}')
    gl = Counter(t['goal'] for t in reach)
    out('goal counts (reachable): ' + ', '.join(f'{g}={gl[g]}' for g in GOALS))
    # reuse and limits shape checks
    bad_reuse = 0
    for p in reuse:
        for side in ('k051', 'k052'):
            s = p[side]
            if side == 'k051':
                st = initial_state(s['start'])
            else:
                st = initial_state(s['start'])
                for stp in s['prefix']:
                    st = apply_op(st, stp['op'], stp['params'])
                    if st is None:
                        break
            nw = apply_op(st, s['op'], s['params']) if st is not None else None
            if nw is None or nw.eq != s['expected_eq']:
                bad_reuse += 1
    out(f'reuse pairs replayed with the shared rule: failing sides {bad_reuse} of {2 * len(reuse)}')
    bad_lim = 0
    slow = 0
    for it in limits:
        t1 = time.time()
        try:
            v = R.classify_limits(it['text'])
        except Exception:  # a crash would be a bug in refimpl
            bad_lim += 1
            continue
        if time.time() - t1 > 5:
            slow += 1
    out(f'limits: reference classification crashed on {bad_lim} of {len(limits)}, slower than 5 s on {slow}')
    out(f'total check time {time.time()-t0:.0f}s')
    report = dict(base_res=base_res, fam_prop=fam_prop, p2info=p2info,
                  counts=dict(reach=len(reach), unreach=len(unreach)),
                  fails=dict(replay=len(bad_replay), reached=len(reached), capped=len(capped),
                             overlap=len(overlap), outofscope=len(notscope), reuse=bad_reuse, limits=bad_lim))
    if write_frozen:
        write_frozen_md(tasks, tuning, reuse, limits, lines, report, fam_counts, unfam_counts, per_u, capped)
    return report


def write_frozen_md(tasks, tuning, reuse, limits, lines, report, fam_counts, unfam_counts, per_u, capped):
    sys.path.insert(0, HERE)
    import gen_r2_sets as G
    L = ['# R2 frozen acceptance datasets', '',
         'Generated once by `tools/mathematics/r2/gen_r2_sets.py` (seeded) and checked by `check_sets.py`.',
         'Any change is an amendment recorded in the milestone document, never an edit of these files.', '',
         f'Generator seed: `{G.SEED}` (family jobs use seed + 1000*family; tuning seed + 9000; reuse seed + 7000; '
         f'limits seed + 8000)', '', '## SHA-256', '', '| file | sha256 |', '|---|---|']
    for f in FILES:
        L.append(f'| {f} | `{sha(f)}` |')
    L += ['', 'Source files at freeze time:', '', '| file | sha256 |', '|---|---|']
    for f in ['refimpl.py', 'gen_r2_sets.py', 'check_sets.py', 'README.md']:
        L.append(f'| {f} | `{sha(f)}` |')
    L += ['', '## Counts', '', '| family | reachable | unreachable (proven, depth<=8) |', '|---|---|---|']
    for f in FAMS:
        L.append(f'| {f} | {fam_counts[f]} | {per_u[f]} |')
    L.append(f'| total | {sum(fam_counts.values())} | {sum(per_u.values())} |')
    unp = sum(1 for t in tasks if (not t['reachable']) and t.get('status') == 'unreachable-unproven')
    L.append('')
    L.append(f'Tasks marked `unreachable-unproven` (node cap hit before exhaustion, NOT claimed unreachable): {unp}; '
             f're-check cap hits: {len(capped)}.')
    L += ['', '### Reachable tasks per family and goal', '', '| family | ' + ' | '.join(GOALS) + ' |',
          '|---|' + '---|' * len(GOALS)]
    for f in FAMS:
        c = Counter(t['goal'] for t in tasks if t['reachable'] and t['family'] == f)
        L.append(f'| {f} | ' + ' | '.join(str(c[g]) for g in GOALS) + ' |')
    c = Counter(t['goal'] for t in tasks if t['reachable'])
    L.append('| all | ' + ' | '.join(str(c[g]) for g in GOALS) + ' |')
    ct = Counter(t['goal'] for t in tuning)
    L += ['', f'tuning.json: {len(tuning)} tasks (' + ', '.join(f'{g}={ct[g]}' for g in GOALS) +
          f'); reuse.json: {len(reuse)} pairs ('
          + ', '.join(f'{r}={n}' for r, n in sorted(Counter(p["rule"] for p in reuse).items())) + '); '
          f'limits.json: {len(limits)} tasks (' +
          ', '.join(f'{r}={n}' for r, n in sorted(Counter(i["category"] for i in limits).items())) + ').',
          '', '## Self-check and baseline results (output of `check_sets.py`)', '', '```']
    L += lines
    L += ['```', '',
          'Baselines are reported as measured; the datasets were not tuned to push any baseline to zero. '
          'P2 orders were selected on tuning.json only. P3 uses the same operations with the 20000-node limit.']
    with open(os.path.join(HERE, 'FROZEN.md'), 'w') as fh:
        fh.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
