import json,sys,collections
V='/home/claude/p2g/tools/mathematics/answer-key-certification/p2-validation/'
CORP={'HELDOUT3-corpus':'heldout3','HELDOUT3-corpus-bare':'heldout3bare','HELDOUT2-corpus':'heldout2','bare-corpus':'heldout2bare'}
def stats(corp,res):
    s=collections.Counter(); bad=[]
    for c,r in zip(corp,res):
        e=c['expect']; g=r['got']
        if e=='debatable': s['debatable_'+g]+=1; continue
        if g=='verified' and e=='invalid': s['false_math_accept']+=1; bad.append(c['id'])
        if g=='verified' and e=='unsupported': s['unjustified_authorized']+=1; bad.append(c['id'])
        if e=='verified': s['legit_total']+=1; s['legit_verified']+= g=='verified'
        if e=='invalid':
            s['invalid_total']+=1; s['invalid_detected']+= g=='invalid'
            if g=='invalid': s['firstInvalid_exact']+= r.get('gotInvalid')==c.get('firstInvalid')
        if e=='unsupported': s['unsupported_total']+=1; s['unsupported_reported_unsupported']+= g not in('verified','invalid')
        if e=='verified' and g=='invalid': s['false_reject_invalid']+=1
    return s,bad
for name,short in CORP.items():
    corp=json.load(open(V+name+'.json'))
    cols={}
    for tag,path in [('stored-P2FINAL',V+f'results-{short}-cert.json')]+[(a,f'{d}/{name}.json') for a,d in zip(sys.argv[1::2],sys.argv[2::2])]:
        try: cols[tag]=stats(corp,json.load(open(path)))
        except FileNotFoundError: pass
    keys=sorted(set(k for s,_ in cols.values() for k in s))
    print(f'== {name} ({len(corp)})'); print('  '+' '.join(f'{t:>16}' for t in cols))
    for k in keys: print(f'  {k:34}'+''.join(f'{cols[t][0].get(k,0):>16}' for t in cols))
    for t,(s,b) in cols.items():
        if b: print('   unsafe',t,b)
