"""Grading audit, step 4: the backend's authoritative decision for every oracle candidate, from the real Django code.

For each candidate it runs what checked_learning does for an attempt: the request checks on the response, `_answer_ok`, then
`_authoritative` (trusted Node grader for verified questions, the Python stored-answer mirror otherwise) and `credited` (the value
mastery and replay use). The Node grader is the real bundle (backend/family/grader/grader.mjs, integrity-checked), called in batches
through kernel_grader.run; each reply is accepted only through kernel_grader's own reply check, exactly as kernel_decision does.

Usage (from backend/): python ../tools/mathematics/grading-audit/run-backend.py <oracle dir> <out dir> <samples.jsonl>
Resumable: a family whose output exists is skipped.
"""
import json
import os
import sys

sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('OPENPATH_GRADER_TIMEOUT', '120')
import django  # noqa: E402

django.setup()
from family import kernel_grader, learning  # noqa: E402
from family.learning_families import generated  # noqa: E402

src, dst, samples = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(dst, exist_ok=True)
verified = {json.loads(l)['qid'] for l in open(samples) if json.loads(l).get('verification') == 'verified'}
OFF = os.environ.get('OPENPATH_GRADER') == 'off'  # measure the fallback: the trusted grader unavailable
assert OFF or kernel_grader.enabled(), 'the trusted grader bundle is not runnable (node, manifest or integrity)'
NEUTRAL = {'policy': 'assessment@1', 'answerCorrect': None, 'methodExamined': False, 'derivationVerified': False, 'firstError': None,
           'clarificationRequired': False, 'aiFallbackUsed': False, 'unresolved': False, 'source': 'legacy'}

cache = {}


def batch_kernel(reqs):
    todo = [r for r in reqs if (r['id'], r['response'], tuple(r['working'])) not in cache]
    for i in range(0, len(todo), 400):
        chunk = todo[i:i + 400]
        out = kernel_grader.run(chunk)
        if out is None:
            raise SystemExit('trusted grader failed on a batch')
        for r, o in zip(chunk, out):
            cache[(r['id'], r['response'], tuple(r['working']))] = o


def fake_kernel_decision(question_id, response, stored_answer, working=None):
    """kernel_grader.grader_decision with the reply taken from the batch (same id regex, same reply check)"""
    if not isinstance(question_id, str) or not kernel_grader.QUESTION_ID.match(question_id) or not isinstance(response, str):
        return None
    w = [x for x in (working or []) if isinstance(x, str)][:8]
    o = cache.get((question_id, response, tuple(w)))
    if o is None or not kernel_grader._reply_ok(o, question_id, stored_answer):
        return None
    return {k: o[k] for k in ('credit', 'source', 'reason', 'verdict')}


if not OFF:
    learning.kernel_decision = fake_kernel_decision
LIMIT = {'set': 300}

for f in sorted(os.listdir(src)):
    out = os.path.join(dst, f)
    if not f.endswith('.json') or os.path.exists(out):
        continue
    fam = json.load(open(os.path.join(src, f)))
    reqs = [{'id': q['qid'], 'response': c['response'], 'working': c['working']} for q in fam['questions'] for c in q['candidates']]
    if not OFF:
        batch_kernel(reqs)
    rows = []
    for q in fam['questions']:
        g = generated(q['qid'])
        for c in q['candidates']:
            r = c['response']
            if g is None:
                rows.append({'qid': q['qid'], 'response': r, 'working': c['working'], 'backend': {'error': 'unknown question id on the server'}})
                continue
            limit = learning.WRITTEN_LIMIT if g['type'] in learning.HUMAN else 300 if g['type'] in learning.NEW_TYPES or g['type'] == 'set' else 80
            if not r.strip() or len(r) > limit:
                rows.append({'qid': q['qid'], 'response': r, 'working': c['working'], 'backend': {'request': 'refused (400)', 'credit': None}})
                continue
            readable = learning._answer_ok(g['type'], r)
            event = {'questionId': q['qid'], 'response': r, 'working': c['working'], 'assessment': dict(NEUTRAL)}
            decided = learning._authoritative(event, g, readable)
            stored = {**event, 'assessment': decided} if decided is not None else event
            credit = learning.credited(g, stored)
            a = decided or {}
            rows.append({'qid': q['qid'], 'response': r, 'working': c['working'], 'backend': {
                'readable': readable, 'source': a.get('source'), 'answerCorrect': a.get('answerCorrect'), 'unresolved': a.get('unresolved'),
                'credited': credit, 'storedAnswer': g['answer'], 'storedParity': g['answer'] == q['answer'] if g['type'] != 'choice' or q['type'] == 'choice' else None}})
    tmp = out + '.tmp'
    json.dump({'family': fam['family'], 'rows': rows}, open(tmp, 'w'))
    os.replace(tmp, out)
print('backend verdicts done; kernel replies', len(cache))
