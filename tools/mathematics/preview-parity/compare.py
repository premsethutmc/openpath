# Preview-vs-server grading parity, step 2: the server decision (_decide, read-only, current OPENPATH_GRADING mode) for each response.
import json, collections
from django.conf import settings
from family import learning, kernel_grader
from family.learning import generated
rows = json.load(open(__import__('os').environ.get('PARITY', '/tmp/preview-parity.json')))
print('grader enabled', kernel_grader.enabled(), 'mode', learning.grading_mode())
# batch through the trusted grader once (the same call _decide makes), then apply _decide's policy per row
diff = collections.Counter(); ex = []
for r in rows:
    q = generated(r['id'])
    ev = {'questionId': r['id'], 'response': r['response'], 'working': []}
    legacy, d = learning._decide(ev, q)
    server = legacy['answerCorrect']; src = legacy['source']
    sh = d.get('shadow') or {}
    key = (r['preview'], server)
    if r['preview'] != server:
        diff[(r['competency'].split('.')[-1], r['type'], src)] += 1
        if len(ex) < 12: ex.append((r['id'], repr(r['response']), 'preview', r['preview'], 'server', server, src))
print('rows', len(rows), 'disagree', sum(diff.values()))
for k, v in diff.most_common(): print(' ', k, v)
for e in ex: print(' ', *e)
