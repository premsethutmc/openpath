"""Static 'no hidden shortcuts' audit of the planner sources.
Fails if the planner (planner.ts, expr-text.ts) reads files/JSON, shells out, imports the generator/SymPy/frozen data,
or contains any frozen equation text or frozen solution table. Also confirms the generator never imports the planner,
and that plan() receives only the equation text (no solution argument)."""
import json, re, sys, glob, os
SRC = sys.argv[1]; out = sys.argv[2]
read = lambda n: open(os.path.join(SRC, n)).read()
planner, text = read('planner.ts'), read('expr-text.ts')
checks = []
def chk(name, ok, detail=''): checks.append({'check': name, 'ok': bool(ok), 'detail': detail})
imports = lambda s: re.findall(r'from\s+"([^"]+)"', s)
chk('planner imports only the kernel and expr-text', set(imports(planner)) <= {'../math-kernel.ts', './expr-text.ts'}, str(imports(planner)))
chk('expr-text imports only the kernel', set(imports(text)) <= {'../math-kernel.ts'}, str(imports(text)))
bad = r'readFileSync|writeFile|node:fs|child_process|spawn|(?<![.\w])exec\(|fetch\(|require\(|import\(|sympy|\.json|JSON\.parse'
chk('no file/JSON/process/network/SymPy use in planner sources', not re.search(bad, planner + text))
chk('generator does not import the planner', 'planner' not in ''.join(imports(read('construct.ts'))))
chk('plan() takes the equation text only', re.search(r'export function plan\(text: string, opts', planner) is not None)
frozen_dir = os.path.join(SRC, '../../../../tools/mathematics/reasoner/frozen')
files = [f for f in glob.glob(frozen_dir + '/**/*.json', recursive=True) if not f.endswith('manifest.json')]
src = planner + text
texts, n = set(), 0
for f in files:
    for it in json.load(open(f)): texts.add(it['text'])
hits = [t for t in texts if t in src]
chk(f'no frozen equation text appears in planner sources ({len(texts)} equations)', not hits, str(hits[:3]))
sols = [re.escape(str(k)) for k in range(-200, 201)]
chk('no table of answers (no long numeric literal lists)', not re.search(r'\[(\s*-?\d+\s*,){12,}', src))
json.dump({'checks': checks, 'allOk': all(c['ok'] for c in checks)}, open(out, 'w'), indent=1)
for c in checks: print(('PASS ' if c['ok'] else 'FAIL ') + c['check'])
sys.exit(0 if all(c['ok'] for c in checks) else 1)
