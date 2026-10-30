import json,sys,collections
O={x['id']:x for x in json.load(open('../independent-audit/results-old-bare.json'))}
N={x['id']:x for x in json.load(open('../independent-audit/results-new-bare.json'))}
def cell(x):
    e,g=x['expect'],x['got']
    if e=='debatable': return 'debatable'
    if e==g: return 'match'
    if g=='verified': return 'FALSE-ACCEPT'
    if e=='verified': return 'legit-unsupported'
    return 'other'
for P in ('P1','P2'):
    S=json.load(open(f'/tmp/sim-{P}.json'))
    print('=====',P,collections.Counter(cell(x) for x in S))
    print(' false accepts of invalid-labelled / mathematically false:',sum(1 for x in S if x['expect']=='invalid' and x['got']=='verified'))
    print(' invalid index agreement:',sum(1 for x in S if x['expect']=='invalid' and x['got']=='invalid' and x['gotInvalid']==x['firstInvalid']),'/',sum(1 for x in S if x['expect']=='invalid'))
    for x in S:
        if cell(x)=='FALSE-ACCEPT': print('  FA',x['id'],'|',x['statement'][:24],'|',' ; '.join(x['lines'])[:80])
    reg=[x for x in S if x['expect']=='verified' and O[x['id']]['got']=='verified' and x['got']!='verified']
    print(' REGRESSIONS vs old (legit old-verified now not):',len(reg))
    for x in reg: print('  RG',x['id'][-18:],x['why'],'|',x['lines'][0][:50])
    gain=[x for x in S if x['expect']=='verified' and x['got']=='verified' and O[x['id']]['got']!='verified']
    print(' legit gains over old:',len(gain))
    lu=collections.Counter(x['why'] for x in S if cell(x)=='legit-unsupported'); print(' legit-unsupported reasons:',dict(lu))
    print(' by category:',{k:dict(v) for k,v in sorted({c:collections.Counter(cell(x) for x in S if x['category']==c) for c in set(x['category'] for x in S)}.items())})
