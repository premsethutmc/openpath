"""Server legacy stored-answer route: _answer_ok (is it an answer) and right (is it correct). Usage: python3 server.py <backend dir> <out>"""
import json, sys, importlib
from unittest.mock import MagicMock
sys.path.insert(0, sys.argv[1])
for m in ['django', 'django.conf', 'django.utils', 'django.utils.timezone', 'rest_framework', 'rest_framework.exceptions', 'family.models']: sys.modules[m] = MagicMock()
try: L = importlib.import_module('family.legacy_grading')
except ModuleNotFoundError: L = importlib.import_module('family.learning')
out = []
for c in json.load(open('cases.json')):
    ok = bool(L._answer_ok(c['type'], c['response']))
    out.append({**c, 'readable': ok, 'credit': bool(L.right({'type': c['type'], 'answer': c['stored']}, c['response'])) if ok else None})
json.dump(out, open(sys.argv[2], 'w'))
