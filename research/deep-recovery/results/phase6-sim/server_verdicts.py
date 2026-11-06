"""Phase 6 (worker A): the SERVER's verdict on simulated answers, through its own decision function.

Reads a JSON list [{"id": question id, "response": text}] on stdin; prints a JSON list of
{"id", "response", "shadow": verdict, "unified": verdict} where each verdict is what family.learning._decide records
(grading-decision@1 verdict: correct | incorrect | unresolved | pending-educator) in the deployed default mode ("shadow":
the earlier policy authoritative, OPENPATH_GRADING default) and in "unified" mode. Research helper only; changes nothing.
A batch is graded by ONE run of the grader bundle (kernel_grader.run), then each reply goes through the server's parity check and
_decide unchanged. Run from backend/: PYTHONPATH=<vendor> python3 ../research/deep-recovery/results/phase6-sim/server_verdicts.py < requests.json
"""
import json
import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django  # noqa: E402

django.setup()
import family.learning as learning  # noqa: E402
from family import kernel_grader  # noqa: E402
from family.learning import _decide, content, generated  # noqa: E402

qs = content()['questions']
reqs = json.load(sys.stdin)
# One grader run for the whole batch (the server spawns one per answer; same bundle, same replies), then the server's own
# kernel_decision contract (_reply_ok parity check) over each reply, exactly as grader_decision does.
# the server allows 8 s per (single-answer) run; a batch of hundreds needs longer: the timeout only, nothing else, is raised
os.environ['OPENPATH_GRADER_TIMEOUT'] = '900'
def _run(rs):
    out = kernel_grader.run([{'id': r['id'], 'response': r['response'], 'working': []} for r in rs])
    if out is not None or len(rs) == 1:
        return out or [None]
    half = len(rs) // 2  # a batch failed: split it (a reply of None is then that one answer's own failure, reported as such)
    return _run(rs[:half]) + _run(rs[half:])
replies = []
for i in range(0, len(reqs), 40):
    replies += _run(reqs[i:i + 40])
by, failed = {}, []
for r, rep in zip(reqs, replies):
    q = qs.get(r['id']) or generated(r['id'])
    ok = q is not None and rep is not None and kernel_grader._reply_ok(rep, r['id'], q['answer'])
    if rep is None:
        failed.append(r)
    by[(r['id'], r['response'])] = ({**{k: rep[k] for k in ('credit', 'source', 'reason', 'verdict')}, 'decision': rep['decision']} if ok else None)
learning.kernel_decision = lambda qid, response, stored, working=None, geometry=False: by.get((qid, response))
out = []
for r in reqs:
    q = qs.get(r['id']) or generated(r['id'])
    if not q:
        out.append({**r, 'shadow': 'unknown-question', 'unified': 'unknown-question'})
        continue
    ev = {'kind': 'learning_record', 'record': 'attempt', 'id': 'sim', 'at': '2026-11-06T09:00:00Z', 'learnerId': 'sim', 'sessionId': 's1',
          'questionId': r['id'], 'response': r['response'], 'activity': 'diagnostic', 'hints': 0, 'solution': False, 'competency': q.get('competency', '')}
    res = {}
    for mode in ('shadow', 'unified'):
        _, d = _decide(ev, q, mode=mode)
        res[mode] = d.get('verdict')
    out.append({**r, **res})
if failed:
    sys.stderr.write('grader could not run for %d answer(s): %s\n' % (len(failed), json.dumps(failed[:5])))
print(json.dumps(out))
