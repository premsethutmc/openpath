import json, subprocess, hashlib, glob, os, sys, platform
root, out = sys.argv[1], sys.argv[2]
sh = lambda *a: subprocess.run(a, cwd=root, capture_output=True, text=True).stdout.strip()
dirty = sh('git', 'status', '--porcelain', '--', 'packages/learning/src', 'tools/mathematics/reasoner/check.py', 'tools/mathematics/reasoner/reject_test.py', 'tools/mathematics/reasoner/domain_test.py', 'tools/mathematics/reasoner/no_shortcuts.py', 'tools/mathematics/reasoner/gen_sets.py')
h = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
fz = os.path.join(root, 'tools/mathematics/reasoner/frozen')
files = {os.path.relpath(p, fz): h(p) for p in sorted(glob.glob(fz + '/**/*.json', recursive=True))}
code = {os.path.relpath(p, root): h(p) for p in sorted(glob.glob(root + '/packages/learning/src/reasoner/*.ts') + glob.glob(root + '/tools/mathematics/reasoner/*.py') + glob.glob(root + '/tools/mathematics/reasoner/*.sh'))}
sys.path.insert(0, '/home/claude/vendor/sympy'); sys.path.insert(0, '/home/claude/vendor/mpmath')
import sympy
json.dump({'codeCommit': sh('git', 'rev-parse', 'HEAD'), 'branch': sh('git', 'rev-parse', '--abbrev-ref', 'HEAD'),
           'sourceTreeCleanAtRun': dirty == '', 'uncommittedSourceChanges': dirty.splitlines(),
           'seeds': {'gen_sets frozen (smoke20/seeded500/edge50)': 20261025, 'holdout-b': 20261026, 'constructed generator': 20261027, 'rejection mutations': 20261029, 'planner': 'none (deterministic BFS, no randomness)'},
           'frozenSha256': files, 'codeSha256': code,
           'node': sh('node', '--version'), 'python': platform.python_version(), 'sympy': sympy.__version__,
           'command': 'tools/mathematics/reasoner/run-e3.sh', 'baseBranch': 'spike/oss-math-engine (PR #69)'}, open(out, 'w'), indent=1)
print('wrote', out)
