"""Reproduces the aofclass quarantine set from the exported questions. Parameters [h, c, d, s]: f(x) = (x-h)^2 + c on [d, oo) into
R (s=0), [c, oo) (s=1) or [f(d), oo) (s=2). The stated codomain of s=2 contains the range only if the minimum of f on [d, oo) is f(d), i.e. d >= h.
Usage: python3 handoff/verify_aofclass.py /tmp/certdata/q/aofclass.jsonl"""
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1])]
bad = []
for r in rows:
    h, c, d, s = r['params']
    f = lambda x: (x - h) ** 2 + c
    if s == 2 and d < h:   # vertex h is inside the domain; f(h) = c < f(d) lies outside the stated codomain [f(d), oo)
        assert f(h) == c < f(d) and h >= d
        bad.append(r['id'])
print(json.dumps({'family': 'aofclass', 'questions': len(rows), 'affected': len(bad), 'ids': bad}))
