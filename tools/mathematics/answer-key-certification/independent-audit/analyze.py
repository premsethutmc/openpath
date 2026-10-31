import json,collections,statistics as S,sys
N=json.load(open('results-new.json'));O={x['id']:x for x in json.load(open('results-old.json'))}
def cell(x):
    e,g=x['expect'],x['got']
    if e=='debatable': return 'debatable'
    if e==g: return 'match'
    if g=='verified': return 'FALSE-ACCEPT'          # expected unsupported/invalid, got verified
    if e=='verified': return 'false-reject'
    return 'other-mismatch'                            # e.g. expected unsupported got invalid/incomplete
for name,R in (('NEW',N),('OLD',list(O.values()))):
    print(name,collections.Counter(cell(x) for x in R))
print('\nNEW by category x cell')
t=collections.defaultdict(collections.Counter)
for x in N: t[x['category']][cell(x)]+=1
for k,v in sorted(t.items()): print(' ',k.ljust(34),dict(v))
print('\ntransitions old->new got:',collections.Counter((O[x['id']]['got'],x['got']) for x in N))
ms=sorted(x['ms'] for x in N);mo=sorted(x['ms'] for x in O.values())
f=lambda m:(round(sum(m),1),S.median(m),m[int(.9*len(m))],m[int(.99*len(m))],m[-1])
print('perf new (total,med,p90,p99,max)',f(ms),'old',f(mo))
json.dump([x for x in N if cell(x) in('FALSE-ACCEPT','false-reject','other-mismatch')],open('mismatches.json','w'),indent=0)
