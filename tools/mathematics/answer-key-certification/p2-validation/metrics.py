# usage (from this directory): python3 metrics.py   -- re-computes every table in P2_DERIVATION_CONTRACT_IMPLEMENTATION_REPORT.md from the stored results
import json,collections,sys
def metrics(corpus_path, prefix, label):
    corp=json.load(open(corpus_path))
    print('\n#####',label,len(corp))
    R={n:json.load(open(f'results-{prefix}-{n}.json')) for n in ['b5d','b32','cert']}
    for n,t in [('b5d','5d6003e pre-registry'),('b32','32c7f2c registry'),('cert','P2 (working tree)')]:
        fa=un=0; dom=0; inv=0; ntot=0; legit=0; lv=0; ms=[]; fiw=0
        for c,r in zip(corp,R[n]):
            e=c['expect']; g=r['got']; ms.append(r['ms'])
            if e=='debatable': continue
            if g=='verified' and e=='invalid': fa+=1
            if g=='verified' and e=='unsupported': un+=1
            if e=='verified': legit+=1; lv+= g=='verified'
            if g=='verified' and e!='verified' and c['category'].startswith('domain'): dom+=1
            if e=='invalid': ntot+=1; inv+= g=='invalid'; fiw+= g=='invalid' and r.get('gotInvalid')!=c.get('firstInvalid')
        ms.sort(); q=lambda p: round(ms[int(p*(len(ms)-1))],2)
        print(f'{t:22s} false-verified={fa} unjustified-verified={un} legit-verified={lv}/{legit} domain-wrong={dom} invalid-detected={inv}/{ntot} wrong-firstInvalid={fiw} ms p50={q(.5)} p95={q(.95)} p99={q(.99)} max={ms[-1]:.1f}')
    reg5=[c['id'] for k,c in enumerate(corp) if c['expect']=='verified' and R['b5d'][k]['got']=='verified' and R['cert'][k]['got']!='verified']
    reg32=[c['id'] for k,c in enumerate(corp) if c['expect']=='verified' and R['b32'][k]['got']=='verified' and R['cert'][k]['got']!='verified']
    gain5=sum(1 for k,c in enumerate(corp) if c['expect']=='verified' and R['b5d'][k]['got']!='verified' and R['cert'][k]['got']=='verified')
    gain32=sum(1 for k,c in enumerate(corp) if c['expect']=='verified' and R['b32'][k]['got']!='verified' and R['cert'][k]['got']=='verified')
    print(f'legit regressions vs 5d6: {len(reg5)} {reg5}; gains {gain5}\nlegit regressions vs 32c: {len(reg32)} {reg32}; gains {gain32}')
    # category x: any item where P2 differs from labels in the unsafe direction
metrics('HELDOUT2-corpus.json','heldout2','NEW held-out (as authored)')
metrics('bare-corpus.json','heldout2bare','NEW held-out, bare statements')
metrics('../architecture-repair/FROZEN-heldout-corpus.json','frozen','FROZEN corpus')
