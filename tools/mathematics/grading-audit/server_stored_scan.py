"""Every released question: the server's own stored-answer route must read and credit the stored answer (real learning.py `_answer_ok` + `right`; Django imports stubbed only so the module loads).
Usage: python3 server_stored_scan.py [out.json]"""
import json, os, sys, importlib, collections
from unittest.mock import MagicMock
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')); sys.path.insert(0, os.path.join(ROOT, 'backend'))
for m in ['django', 'django.conf', 'django.utils', 'django.utils.timezone', 'rest_framework', 'rest_framework.exceptions', 'family.models']: sys.modules[m] = MagicMock()
sys.modules['rest_framework.exceptions'].ValidationError = Exception
L = importlib.import_module('family.learning')
T = json.load(open(os.path.join(ROOT, 'content/learning/generated.v1.json')))['families']
n = 0; bad = collections.Counter(); ex = {}
for fam, f in T.items():
    for key, ans in f['items'].items():
        n += 1; kind = 'choice' if key.endswith(':mc') else f['type']
        q = {'type': kind, 'answer': ans, **({'expanded': True} if f.get('expanded') else {})}
        if not L._answer_ok(kind, ans) or not L.right(q, ans):
            bad[fam] += 1; ex.setdefault(fam, f'{fam}:{key} {kind} {ans!r}')
print(json.dumps({'checked': n, 'unreadableOrNotCreditedStoredAnswers': sum(bad.values()), 'families': dict(bad), 'examples': list(ex.values())[:8]}))
if len(sys.argv) > 1: json.dump({'checked': n, 'bad': dict(bad), 'examples': ex}, open(sys.argv[1], 'w'))
