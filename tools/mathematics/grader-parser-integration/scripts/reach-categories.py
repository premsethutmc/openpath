"""Stage 2/7: for every item the P2 authority decides on its own (certified chain or exact refutation), where did the ENGINE stop?
usage: python3 reach-categories.py <trace.json> [...]   (traces from engine-trace.ts; categories are kept separate, never summed into one failure count)
"""
import json,sys,collections
def category(r):
    p2=r.get('p2') or {}; got=r.get('got','')
    if got=='verified' and p2.get('status')=='verified': return 'reached-P2: certified'
    if got=='invalid' and p2.get('status')=='invalid': return 'reached-P2: invalid reasoning (agrees)'
    if got=='incomplete': return 'final-answer: incomplete / no final answer'
    if got=='invalid': return 'invalid reasoning (engine, P2 disagrees)'
    if r.get('parse')!='parsed': return 'parser rejection: working line unreadable'
    if got=='ambiguous': return 'parser rejection: notation refused as ambiguous'
    ck=r.get('checker') or {}; just=(ck.get('just','') if isinstance(ck,dict) else '')
    core=r.get('core') or {}
    if isinstance(core,dict) and not core.get('steps') and any(k in just for k in ('not a single parseable','more than one variable','parse fidelity','given values must be','solution branches')): return 'task-normalization failure: statement unreadable by the established route'
    da=r.get('p2') or {}
    if da.get('status')=='verified' and da.get('replay') is False: return 'certificate/replay failure'
    if da.get('status')=='verified' and da.get('completeness')!='complete': return 'final-answer: incomplete / no final answer'
    if da.get('status')=='verified' and da.get('final') is not True: return 'final-answer mismatch / undecided'
    return 'unsupported operation (established route abstained on a line)'
for path in sys.argv[1:]:
    d=json.load(open(path)); dec=[r for r in d if (r.get('p2') or {}).get('status') in('verified','invalid')]
    c=collections.Counter(category(r) for r in dec)
    print(f'== {path.split("/")[-2]}/{path.split("/")[-1]}: {len(d)} items, {len(dec)} decided by P2 (certified {sum((r.get("p2") or {}).get("status")=="verified" for r in d)}, refuted {sum((r.get("p2") or {}).get("status")=="invalid" for r in d)})')
    for k,v in sorted(c.items()): print(f'   {v:4}  {k}')
    print(f'   reach (engine verdict = P2 verdict): {c["reached-P2: certified"]+c["reached-P2: invalid reasoning (agrees)"]}/{len(dec)}')
