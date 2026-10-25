"""R1: run the SymPy oracle (path given by ORACLE_DIR) over the D4 decimal cases of the independent suite; exact expectations come from the suite."""
import sys, os, json
d = os.environ.get('ORACLE_DIR', '/home/claude/r1/tools/mathematics/domain-reasoner'); sys.path.insert(0, d)
from domain_oracle import analyse
cases = [c for c in json.load(open('/home/claude/r1/tools/mathematics/r1/adversarial/suite.json')) if c['kind'] == 'oracle']
rows = []; ok = 0
for c in cases:
    try:
        a = analyse(c['text']); got = {'class': a.get('class'), 'solution': a.get('solution'), 'excluded': a.get('excluded')}
        e = c['expect']; norm = lambda v: sorted(map(str, v)) if v else []
        good = got['class'] == e['class'] and (e['class'] != 'unique' or norm(got['solution']) == norm(e['solution'])) and norm(got['excluded']) == norm(e['excluded'])
    except Exception as ex:
        got = {'error': str(ex)[:120]}; good = False
    ok += good; rows.append({'id': c['id'], 'text': c['text'], 'expect': c['expect'], 'got': got, 'pass': good})
out = os.environ.get('OUT', '/home/claude/r1/tools/mathematics/r1/results/oracle-after.json')
json.dump({'oracle_dir': d, 'cases': len(rows), 'passed': ok, 'rows': rows}, open(out, 'w'), indent=1); print(d, 'passed', ok, '/', len(rows))
