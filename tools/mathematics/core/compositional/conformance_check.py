"""Compare the core's states along every frozen witness with the reference implementation's states (text normalised by the reference parser/printer)."""
import json, sys, collections
sys.path.insert(0, '/home/claude/r2/tools/mathematics/r2')
import refimpl as R
D = '/home/claude/r2/tools/mathematics/r2/'
tasks = {t['id']: t for f in ('composition.json', 'tuning.json') for t in json.load(open(D + f))['tasks']}
mine = json.load(open(sys.argv[1]))
def norm(text):
    L, Rr = R.parse_eq(text); return R.eq_text(L, Rr)
stat = collections.Counter(); bad = []
for m in mine:
    t = tasks[m['id']]; st = R.initial_state(t['start']); refs = [st]
    for s in t['witness']:
        st = R.apply_op(st, s['op'], s.get('params', {})); refs.append(st)
    if not m['ok']: stat['not-replayed'] += 1; bad.append((m['id'], 'NR', m['error'])); continue
    ok = True
    for i, (a, b) in enumerate(zip(m['states'], refs)):
        try: na = norm(a['eq'])
        except Exception as e: na = 'PARSEFAIL ' + a['eq']
        if na != b.eq:
            ok = False; bad.append((m['id'], f'step{i}:{t["witness"][i-1]["op"] if i else "init"}', na, b.eq)); break
    stat['same' if ok else 'diverged'] += 1
print(dict(stat))
c = collections.Counter(b[1].split(':')[-1] if b[1] != 'NR' else 'NR:' + b[2].split(':')[1].split()[0] for b in bad); print(c)
for b in bad[:int(sys.argv[2]) if len(sys.argv) > 2 else 12]: print(b)
