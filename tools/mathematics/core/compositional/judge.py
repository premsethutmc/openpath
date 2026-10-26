"""Independent judge for the compositional challenge. Re-checks every run of every contender with the reference implementation (refimpl): the final state must satisfy
the task's goal predicate AND every state on the way must be equivalent to the start over the original domain (restrictions retained). Nothing the contenders report about
their own success is used. Also reports whether the operation trace replays EXACTLY in the reference (strict conformance, informational).
Usage: judge.py <runs.jsonl> <tasks-file> <out.json>"""
import json, sys, collections, statistics
sys.path.insert(0, '/home/claude/r2/tools/mathematics/r2')
import refimpl as R
from fractions import Fraction as F
D = '/home/claude/r2/tools/mathematics/r2/'
runs_f, tasks_f, out_f = sys.argv[1:4]
tasks = {t['id']: t for t in json.load(open(D + tasks_f))['tasks']}
rows = [json.loads(l) for l in open(runs_f) if l.strip()]
def mk(s): return R.State(s['eq'], tuple(sorted(F(r) for r in s['restr'])))
res = []
for r in rows:
    t = tasks[r['id']]
    base = {'id': r['id'], 'contender': r['contender'], 'family': t['family'], 'goal': t['goal'], 'reachable': t['reachable'], 'depth': (t.get('props') or {}).get('shortest_len') if t['reachable'] else None, 'ms': r.get('ms'), 'visited': r.get('visited'), 'generated': r.get('generated')}
    if 'error' in r: res.append({**base, 'judged': 'error', 'detail': r['error']}); continue
    if not r['trace'] and not r['self_ok']:
        res.append({**base, 'judged': 'refused', 'why': r.get('why'), 'capped': r.get('capped')}); continue
    orig = R.initial_state(t['start']); detail = ''; ok = True
    try:
        sts = [mk(s) for s in r['states']]
        if R.canon(sts[0].eq) != R.canon(orig.eq): ok = False; detail = 'start differs'
        for i, st in enumerate(sts):
            e, why = R.equivalent(orig, st)
            if not e: ok = False; detail = f'state {i} not equivalent: {why}'; break
        if ok and not R.goal_holds(t['goal'], sts[-1], orig): ok = False; detail = 'goal not satisfied'
    except Exception as ex:
        ok = False; detail = 'judge error ' + str(ex)[:120]
    strict = None
    if ok:
        try: strict = bool(R.verify_trace(t['start'], r['trace'], t['goal'])[0])
        except Exception: strict = False
    res.append({**base, 'judged': 'success' if ok else 'wrong', 'detail': detail, 'steps': len(r['trace']), 'strict_replay': strict, 'self_ok': r['self_ok']})
json.dump(res, open(out_f, 'w'))
# ---- summary
def summ(sel):
    c = collections.Counter(x['judged'] for x in sel); return {'n': len(sel), **dict(c)}
by = collections.defaultdict(list)
for x in res: by[x['contender']].append(x)
print('contender      reachable: success/n     unreachable: refused/n (wrong answers)   judge-vs-self disagreements')
for c, xs in sorted(by.items()):
    re_ = [x for x in xs if x['reachable']]; un = [x for x in xs if not x['reachable']]
    s = sum(x['judged'] == 'success' for x in re_); ref = sum(x['judged'] == 'refused' for x in un); wr = sum(x['judged'] == 'wrong' for x in xs)
    dis = sum(1 for x in xs if x['judged'] in ('success', 'wrong') and x.get('self_ok') != (x['judged'] == 'success'))
    print(f'{c:12s} {s:4d}/{len(re_):<4d} {100*s/max(1,len(re_)):5.1f}%      {ref}/{len(un)}   wrong={wr}   disagree={dis}')
