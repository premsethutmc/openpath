# usage (from this directory): python3 metrics3.py  -- tables for the third (frozen) corpus
import json,collections
corp=json.load(open('HELDOUT3-corpus-bare.json'))
B=[('b5d','5d6003e'),('b32','32c7f2c'),('b99','99aea8e'),('cert','P2-FINAL')]
R={n:json.load(open(f'results-heldout3bare-{n}.json')) for n,_ in B}
for n,t in B:
    fa=un=0; inv=0; ni=0; legit=0; lv=0; ms=[]; fiw=0; deb=collections.Counter(); bad=[]
    for c,r in zip(corp,R[n]):
        e=c['expect']; g=r['got']; ms.append(r['ms'])
        if e=='debatable': deb[g]+=1; continue
        if g=='verified' and e=='invalid': fa+=1; bad.append(('FALSE',c['id']))
        if g=='verified' and e=='unsupported': un+=1; bad.append(('UNJUST',c['id']))
        if e=='verified': legit+=1; lv+= g=='verified'
        if e=='invalid': ni+=1; inv+= g=='invalid'; fiw+= g=='invalid' and r.get('gotInvalid')!=c.get('firstInvalid')
    ms.sort(); q=lambda p: round(ms[int(p*(len(ms)-1))],2)
    print(f'{t:9s} false-math-accept={fa} unjustified-authorized={un} legit-verified={lv}/{legit} invalid-detected={inv}/{ni} wrong-firstInvalid={fiw} debatable-verified={deb["verified"]}/{sum(deb.values())} ms p50={q(.5)} p95={q(.95)} p99={q(.99)} max={ms[-1]:.1f} total={sum(ms):.0f}')
    print('   unsafe ids:',bad)
def reg(a,b):
    r=[c['id'] for k,c in enumerate(corp) if c['expect']=='verified' and R[a][k]['got']=='verified' and R[b][k]['got']!='verified']
    g=[c['id'] for k,c in enumerate(corp) if c['expect']=='verified' and R[a][k]['got']!='verified' and R[b][k]['got']=='verified']
    return r,g
for a in ['b5d','b32','b99']:
    r,g=reg(a,'cert'); print(f'legit regressions {a}->P2-FINAL: {len(r)} {r}; gains {len(g)}')
print('\nper category (P2-FINAL): verified-labelled verified / invalid detected / unsupported-labelled verified')
cat=collections.defaultdict(lambda:[0,0,0,0,0,0])
for c,r in zip(corp,R['cert']):
    x=cat[c['category']]; e=c['expect']; g=r['got']
    if e=='verified': x[0]+=1; x[1]+= g=='verified'
    if e=='invalid': x[2]+=1; x[3]+= g=='invalid'
    if e=='unsupported': x[4]+=1; x[5]+= g=='verified'
for k,v in sorted(cat.items()): print(f'  {k:28s} legit {v[1]}/{v[0]}  invalid {v[3]}/{v[2]}  unsupported-verified {v[5]}/{v[4]}')
print('\nverdict distribution P2-FINAL by label:')
d=collections.defaultdict(collections.Counter)
for c,r in zip(corp,R['cert']): d[c['expect']][r['got']]+=1
for k,v in d.items(): print(' ',k,dict(v))
