"""Planner and BFS with the text key vs the canonical key, same frozen 533 tasks, judged by the reference implementation.
Usage: compare-keys.py <judged-text.json> <judged-canonical.json> <out.md>"""
import json, sys, statistics as st, collections
def load(f):
    d = collections.defaultdict(dict)
    for r in json.load(open(f)): d[r['contender']][r['id']] = r
    return d
T, C = load(sys.argv[1]), load(sys.argv[2])
def pct(xs, p):
    xs = sorted(x for x in xs if x is not None)
    return xs[min(len(xs) - 1, int(round(p * (len(xs) - 1))))] if xs else None
def row(name, rs):
    reach = [r for r in rs if r['reachable']]; un = [r for r in rs if not r['reachable']]
    ok = sum(r['judged'] == 'success' for r in reach); wrong = sum(r['judged'] == 'wrong' for r in rs)
    refused_un = sum(r['judged'] == 'refused' for r in un); false_ref = sum(r['judged'] == 'refused' for r in reach)
    caps = sum(bool(r.get('capped')) for r in rs if r['judged'] == 'refused')
    un_ok = sum(r['judged'] == 'success' for r in un)
    uq = [r.get('unique') for r in rs]; ex = [r['visited'] for r in rs]; ms = [r['ms'] for r in rs]
    f = lambda v: 'n/a' if v is None else (f'{v:.0f}' if isinstance(v, float) else str(v))
    return f"| {name} | {ok}/{len(reach)} | {un_ok} | {wrong} | {refused_un}/{len(un)} | {false_ref} | {caps} | {f(st.median([u for u in uq if u is not None]) if any(u is not None for u in uq) else None)} / {f(pct(uq,.95))} / {sum(u for u in uq if u is not None)} | {f(st.median(ex))} / {f(pct(ex,.95))} / {sum(ex)} | {f(st.median(ms))} / {f(pct(ms,.95))} / {f(sum(ms)/1000)} s |"
out = ["| configuration | reachable solved (verified) | unreachable-by-reference but solved (verified) | incorrect results | unreachable correctly refused | reachable falsely refused | node-cap stops | unique states median / p95 / total | expansions median / p95 / total | runtime ms median / p95 / total |", "|---|---|---|---|---|---|---|---|---|---|"]
for c in ('planner', 'bfs'):
    out.append(row(f'{c} (text key)', list(T[c].values()))); out.append(row(f'{c} (canonical key)', list(C[c].values())))
out.append("")
for c in ('planner', 'bfs'):
    a, b = T[c], C[c]; ids = sorted(set(a) & set(b))
    gained = [i for i in ids if a[i]['judged'] != 'success' and b[i]['judged'] == 'success']; lost = [i for i in ids if a[i]['judged'] == 'success' and b[i]['judged'] != 'success']
    out.append(f"**{c}**: solved with canonical key but not text key: {gained or 'none'}; solved with text key but not canonical key: {lost or 'none'}")
    both = [i for i in ids if a[i]['judged'] == b[i]['judged'] == 'success' and a[i]['unique'] and b[i]['unique']]
    red = [1 - b[i]['unique'] / a[i]['unique'] for i in both]
    if red: out.append(f"  on the {len(both)} tasks solved by both, unique states are reduced by a median of {st.median(red)*100:.1f}% (max {max(red)*100:.1f}%)")
    out.append("")
open(sys.argv[3], 'w').write("\n".join(out))
print("\n".join(out))
