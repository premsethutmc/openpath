#!/usr/bin/env python3
"""python3 decision-diff.py old.json new.json  -> side-by-side summary, transitions, and agreement with the design's expected labels"""
import json, sys, collections
o, n = (json.load(open(p))['results'] for p in sys.argv[1:3])
tr = collections.Counter(); changed = []
for k in o:
    a, b = o[k]['classification'], n[k]['classification']; tr[(a, b)] += 1
    if a != b: changed.append((k, o[k]['group'], o[k]['label'], a, b, o[k]['expect']))
print('transitions old -> new:'); [print(f'  {a:12} -> {b:12} {c}') for (a, b), c in sorted(tr.items())]
def acc(r):
    c = collections.Counter()
    for v in r.values():
        if v['expect'] is None: continue
        c['match' if v['classification'] == v['expect'] else ('false-accept' if v['classification'] == 'verified' else 'false-reject' if v['expect'] == 'verified' else 'other-mismatch')] += 1
    return dict(c)
print('vs design labels   old:', acc(o)); print('                   new:', acc(n))
print(f'changed decisions: {len(changed)}')
for k, g, l, a, b, e in changed[:40]: print(f'  {k:18} [{g}] {l!r}: {a} -> {b} (design expects {e})')
if len(sys.argv) > 3: json.dump({'changed': changed}, open(sys.argv[3], 'w'), indent=1)
