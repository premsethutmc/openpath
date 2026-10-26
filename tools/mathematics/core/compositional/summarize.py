"""Summaries of judged compositional runs. Input: judged.json (judge.py output) + the raw runs (for traces). Prints/writes SUMMARY.md-ready tables.
Definitions (denominators stated in the table headers):
  verified success   judge: final state satisfies the goal AND every state on the path is equivalent to the start (reference implementation)
  incorrect result   judge says 'wrong': the contender returned a path that fails the judge (never counted as success)
  correct refusal    task is unreachable (reference) and the contender returned no path
  false refusal      task is reachable and the contender returned no path
  node-cap failure   the search stopped because it generated more than the node cap (20,000) without a goal
  expansions         number of states expanded (visited) -- for walkers (P1, P2, P4) the number of moves taken
"""
import json, sys, statistics, collections
J = json.load(open(sys.argv[1]))
def q(xs, p):
    xs = sorted(xs); 
    if not xs: return float('nan')
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))]
by = collections.defaultdict(list)
for x in J: by[x['contender']].append(x)
names = ['planner', 'bfs', 'P1', 'P2', 'P4']
print('| contender | reachable solved (verified) | incorrect results (claimed success, judge fails) | ended without goal, no claim (reachable / unreachable) | unreachable correctly refused | reachable falsely refused | node-cap stops | median / p95 expansions | median / p95 ms |')
print('|---|---|---|---|---|---|---|---|---|')
for c in names:
    xs = by[c]; re_ = [x for x in xs if x['reachable']]; un = [x for x in xs if not x['reachable']]
    s = sum(x['judged'] == 'success' for x in re_); wr = sum(x['judged'] == 'wrong' for x in xs)
    fre = sum(x['judged'] == 'failed' for x in re_); fun = sum(x['judged'] == 'failed' for x in un)
    cr = sum(x['judged'] == 'refused' for x in un); fr = sum(x['judged'] == 'refused' for x in re_)
    capd = sum(1 for x in xs if x.get('capped'))
    ex = [x['visited'] for x in xs if x.get('visited') is not None]; ms = [x['ms'] for x in xs if x.get('ms') is not None]
    print(f"| {c} | {s}/{len(re_)} ({100*s/len(re_):.1f}%) | {wr} | {fre} / {fun} | {cr}/{len(un)} | {fr} | {capd} | {q(ex,.5):.0f} / {q(ex,.95):.0f} | {q(ms,.5):.1f} / {q(ms,.95):.0f} |")
def table(key, title, keyf):
    print(f'\n**{title}** (reachable tasks solved / reachable tasks)\n'); ks = sorted({keyf(x) for x in J}, key=str)
    print('| ' + key + ' | n | ' + ' | '.join(names) + ' |'); print('|---|---|' + '---|' * len(names))
    for k in ks:
        row = []; n = None
        for c in names:
            xs = [x for x in by[c] if keyf(x) == k and x['reachable']]; n = len(xs); row.append(f"{sum(x['judged']=='success' for x in xs)}")
        print(f'| {k} | {n} | ' + ' | '.join(row) + ' |')
table('family', 'By family', lambda x: x['family'])
table('goal', 'By goal', lambda x: x['goal'])

def dep(x):
    d = x.get('depth'); return 'unreachable' if d is None else (str(d) if d <= 5 else '6+')
table('compositional depth (shortest witness length)', 'By compositional depth', dep)
