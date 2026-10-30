"""Server-side verdicts for every audited submission, compared with the application's decision (decide()).
Real server code is used: backend/family/learning.py `_answer_ok` + `right` (the stored-answer route; Django/DRF are replaced by import stubs ONLY so the
module loads: none of those names is used by these pure functions) and backend/family/kernel_grader.py (the trusted Node grader, run for real).
This is NOT a Django endpoint test: the HTTP view, serializers, database and authentication are not exercised.
Usage: python3 server_compare.py <auditDir> [legacySampleEvery=20]"""
import glob, json, os, sys, collections, importlib
from unittest.mock import MagicMock
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'backend'))
for m in ['django', 'django.conf', 'django.utils', 'django.utils.timezone', 'rest_framework', 'rest_framework.exceptions', 'family.models']:
    sys.modules[m] = MagicMock()
sys.modules['rest_framework.exceptions'].ValidationError = Exception
os.environ.setdefault('OPENPATH_GRADER_TIMEOUT', '120')
L = importlib.import_module('family.learning'); K = importlib.import_module('family.kernel_grader')
D = sys.argv[1]; EVERY = int(sys.argv[2]) if len(sys.argv) > 2 else 20
def legacy(kind, stored, resp, expanded):
    return None if not L._answer_ok(kind, resp) else bool(L.right({'type': kind, 'answer': stored, **({'expanded': True} if expanded else {})}, resp))
rows = []
for f in sorted(glob.glob(f'{D}/subs/*.jsonl')):
    fam = os.path.basename(f)[:-6]
    for i, line in enumerate(open(f).read().split('\n')):
        if line: rows.append((fam, i, json.loads(line)))
kern = [r for r in rows if r[2][7] not in ('legacy',)]
sample = [r for k, r in enumerate(r for r in rows if r[2][7] == 'legacy') if k % EVERY == 0]
todo = kern + sample; replies = {}
for s in range(0, len(todo), 400):
    chunk = todo[s:s + 400]; req = [{'id': r[2][0], 'response': r[2][4], 'working': (['1 + 1 = 3', 'so I get something else'] if r[2][3] == 'working-ok' else ['x = 1', 'x + 0 = 1'] if r[2][3] == 'working-wrong' else [])} for r in chunk]
    out = K.run(req)
    for r, q, o in zip(chunk, req, out or [None] * len(chunk)): replies[(r[0], r[1])] = (o, K._reply_ok(o, r[2][0], r[2][2]) if o else False)
stat = collections.Counter(); bad = []; byfam = collections.defaultdict(collections.Counter)
for fam, i, r in rows:
    key = (fam, i)
    if key not in replies and r[7] != 'legacy': continue
    if key not in replies: continue
    qid, kind, stored, cat, resp, want, ts, src, exp, hasw = r
    o, ok = replies[key]
    if ok: server, route = o['credit'], 'kernel'
    else: server, route = legacy(kind, stored, resp, exp), 'legacy'
    # the application's own decision: kernel verdict or the legacy comparison; the server must reach the same one
    agree = server == ts; stat[(('ts-kernel' if src != 'legacy' else 'ts-legacy'), route, 'agree' if agree else 'DISAGREE')] += 1
    byfam[fam]['n'] += 1
    if not agree:
        byfam[fam]['disagree'] += 1
        if len(bad) < 200: bad.append({'family': fam, 'id': qid, 'type': kind, 'stored': stored, 'cat': cat, 'resp': resp, 'client': ts, 'clientSource': src, 'server': server, 'serverRoute': route})
    # a server credit the oracle forbids is a server-side false acceptance (checked independently of the client)
    if want == 'no-credit' and server is True: byfam[fam]['serverFalseAcceptance'] += 1
    if want == 'credit' and server is not True and cat != 'equiv-policy': byfam[fam]['serverFalseRejectOrUnresolved'] += 1
    if want == 'unresolved' and server is not None: byfam[fam]['serverUnreadableDecided'] += 1
json.dump({'summary': {f'{a}|{b}|{c}': v for (a, b, c), v in stat.items()}, 'comparedSubmissions': sum(stat.values()), 'disagreements': sum(v for (a, b, c), v in stat.items() if c == 'DISAGREE'), 'families': {k: dict(v) for k, v in byfam.items()}, 'examples': bad}, open(f'{D}/server-compare.json', 'w'), ensure_ascii=False)
print(json.dumps({'summary': {f'{a}|{b}|{c}': v for (a, b, c), v in stat.items()}, 'disagreements': sum(v for (a, b, c), v in stat.items() if c == 'DISAGREE'), 'serverFA': sum(v.get('serverFalseAcceptance', 0) for v in byfam.values()), 'examples': bad[:8]}, ensure_ascii=False, indent=1))
