"""Per-task evidence for planner-only / baseline-only successes (judge-verified). Writes results/PLANNER-VS-BASELINES.md."""
import json, collections
J = json.load(open('results/judged-final.json')); T = {t['id']: t for t in json.load(open('/home/claude/r2/tools/mathematics/r2/composition.json'))['tasks']}
R = {}
for l in open('results/composition.final.jsonl'):
    r = json.loads(l); R[(r['id'], r['contender'])] = r
S = collections.defaultdict(dict)
for x in J: S[x['id']][x['contender']] = x
ok = lambda i, c: S[i][c]['judged'] == 'success'
def comp(i, c):
    r = R[(i, c)]; return ' → '.join(s['op'] + (str(list(s['params'].values())) if s['params'] else '') for s in r['trace']) or '(none)'
def row(i, c):
    r = R[(i, c)]; return f"{comp(i,c)} | final `{r['states'][-1]['eq']}` | exp {r['visited']} | {r['ms']:.0f} ms"
out = ['# Planner vs baselines: per-task evidence', '', 'Every row below was independently judged by the reference implementation (goal holds, every state equivalent to the start over the original domain).', '']
base = ['P1', 'P2', 'P4']
po = [i for i, t in T.items() if t['reachable'] and ok(i, 'planner') and not any(ok(i, c) for c in base)]
out += [f'## A. Planner solved, none of P1/P2/P4 solved: {len(po)} tasks', '', '| task | family | goal | equation | reference shortest witness | planner trace | verified final state | expansions | ms |', '|---|---|---|---|---|---|---|---|---|']
for i in po:
    t = T[i]; r = R[(i, 'planner')]; w = ' → '.join(s['op'] for s in t['witness'])
    out.append(f"| {i} | {t['family']} | {t['goal']} | `{t['start']}` | {w} | {comp(i,'planner')} | `{r['states'][-1]['eq']}` | {r['visited']} | {r['ms']:.0f} |")
bo = [(i, [c for c in base if ok(i, c)]) for i, t in T.items() if t['reachable'] and not ok(i, 'planner') and any(ok(i, c) for c in base)]
out += ['', f'## B. Some of P1/P2/P4 solved, planner did not: {len(bo)} tasks', '', '| task | family | goal | equation | planner outcome | baseline that solved | its trace and verified final state |', '|---|---|---|---|---|---|---|']
for i, cs in bo:
    t = T[i]; pr = S[i]['planner']; why = 'node cap (20000)' if R[(i, 'planner')]['capped'] else (R[(i, 'planner')].get('why') or pr['judged'])
    out.append(f"| {i} | {t['family']} | {t['goal']} | `{t['start']}` | {pr['judged']} ({why}), exp {R[(i,'planner')]['visited']} | {', '.join(cs)} | " + '; '.join(f"{c}: {row(i,c)}" for c in cs) + ' |')
out += ['', '## C. Planner (best-first) vs breadth-first (bfs): differences', '']
for a, b in (('planner', 'bfs'), ('bfs', 'planner')):
    ids = [i for i in T if ok(i, a) and not ok(i, b)]
    out.append(f'**{a} solved, {b} did not: {len(ids)}**'); 
    for i in ids: out.append(f"- {i} ({T[i]['family']}, {T[i]['goal']}, reachable={T[i]['reachable']}) `{T[i]['start']}`: {a}: {row(i,a)}; {b}: {S[i][b]['judged']} {('(node cap)' if R[(i,b)]['capped'] else '')}")
    out.append('')
# effort on commonly solved tasks
both = [i for i in T if ok(i, 'planner') and ok(i, 'bfs')]
import statistics
ratio = [R[(i, 'planner')]['visited'] / max(1, R[(i, 'bfs')]['visited']) for i in both]
out += [f'## D. Search effort on the {len(both)} tasks both solved', '', f"median planner/bfs expansion ratio {statistics.median(ratio):.2f}; planner fewer expansions on {sum(r<1 for r in ratio)}, equal on {sum(r==1 for r in ratio)}, more on {sum(r>1 for r in ratio)}.", '']
out += ['## E. Tasks labelled unreachable by the reference but solved (judge-verified) by our rule semantics', '']
for i, t in T.items():
    if not t['reachable']:
        who = [c for c in ['planner', 'bfs', 'P1', 'P2', 'P4'] if ok(i, c)]
        if who: out.append(f"- {i} ({t['family']}, {t['goal']}, ref status {t.get('status')}, excluded op {t.get('excluded_op')}) `{t['start']}` solved by {who}: {row(i, who[0])}")
open('results/PLANNER-VS-BASELINES.md', 'w').write('\n'.join(out) + '\n'); print(len(out), 'lines'); print('\n'.join(out[-12:])[:1800])
