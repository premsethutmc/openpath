import json, random, sys
S=sys.argv[1]
b=json.load(open(f"{S}/d_before/benchmark.json"))['episodes']; a=json.load(open(f"{S}/d_after/benchmark.json"))['episodes']
assert len(a)==len(b)
def key(e): return (e['variant'],e['sim'],e['type'])
groups={}
for i,(x,y) in enumerate(zip(b,a)):
    assert key(x)==key(y)
    groups.setdefault((x['variant'],x['sim']),[]).append((x['result'],y['result']))
M=[('gain30','learning gain (bands)',1,2),('questions','questions',1,1),('diagnostics','diagnostics',1,1),('lessons','lesson events',1,1),('unnecessaryLessons','lessons to learners already at target',1,2),('repeatedLessons','repeated lessons',1,2),('repeatDiagnostics','repeat diagnostics',1,2),
   ('trueClaim','learners reaching a true engine claim (pp)',100,1),('engineFalseClaim','engine claim ever false (pp)',100,1),('prematureAdvance','premature advance (pp)',100,1),('atTarget30','at target day 30 (pp)',100,1),('engineClaim30','engine shows target day 30 (pp)',100,1)]
def val(r,m):
    if m=='trueClaim': return 1 if r['activitiesToTrueEngineClaim'] is not None else 0
    v=r[m]; return (1 if v else 0) if isinstance(v,bool) else v
rng=random.Random(20261018)
print("| Variant / simulator | Measure | Before | After | Δ (95% CI) |\n|---|---|---:|---:|---|")
for g,pairs in groups.items():
    for m,label,sc,dp in M:
        bb=[val(x,m) for x,_ in pairs]; aa=[val(y,m) for _,y in pairs]
        d=[y-x for x,y in zip(bb,aa)]; n=len(d); mean=sum(d)/n
        bs=sorted(sum(d[rng.randrange(n)] for _ in range(n))/n for _ in range(1000))
        f=lambda v: f"{v*sc:.{dp}f}"
        print(f"| {g[0]} / {g[1]} | {label} | {f(sum(bb)/n)} | {f(sum(aa)/n)} | {'+' if mean>=0 else ''}{f(mean)} [{f(bs[25])}, {f(bs[974])}] |")
