import json,os,sys
S=sys.argv[1]
names=[f[:-5] for f in sorted(os.listdir(f'{S}/sc-new'))]
def analyse(r):
    hs=r['final'].get('hypotheses',[]) or []
    mis=r['truth']['misconception']
    inv=[s for s in r['steps'] if (s.get('context') or '').startswith('investigate:')]
    inv_mod=[s for s in inv if s['stage']=='module']
    est=[h for h in hs if h.get('claim')]
    match=[h for h in est if h['claim']['explanation']==mis] if mis else []
    statuses=sorted(set(h['status'] for h in hs))
    resolved=[h for h in est if h['status']=='resolved']
    snap=r['final'].get('snap') or {}
    return dict(inv_total=len(inv), inv_module=len(inv_mod), hyps=[(h['claim']['explanation'] if h.get('claim') else '?', h['status']) for h in hs],
        established_any=len(est)>0, matches_truth=len(match)>0, resolved=[h['claim']['explanation'] for h in resolved],
        unresolved=len([h for h in hs if h['status'] in ('established','contested','insufficient','unsupported')]),
        status=snap.get('status'), retention=snap.get('retention'))
rows=[]; totals={'base':{}, 'new':{}}
for n in names:
    b=json.load(open(f'{S}/sc-base/{n}.json')); a=json.load(open(f'{S}/sc-new/{n}.json'))
    e=a['expect']; t=a['truth']
    for tag,r in (('base',b),('new',a)):
        x=analyse(r)
        fr = bool(x['resolved']) and (t['heldAtEnd'] or e['resolution']=='must-not-resolve')
        ui = e['investigation']=='should-not' and x['inv_total']>0
        mi = e['investigation']=='should' and x['inv_total']==0
        fe = e['establish']=='must-not-establish' and x['established_any'] and any(s in ('established','contested') for _,s in x['hyps'])
        me = e['establish']=='should-establish' and not x['established_any']
        T=totals[tag]
        for k,v in (('false_resolution',fr),('unnecessary_investigation',ui),('missed_investigation',mi),('false_establish',fe),('missed_establish',me)): T[k]=T.get(k,0)+int(v)
        T['unresolved_hypotheses']=T.get('unresolved_hypotheses',0)+x['unresolved']
        T['investigation_steps']=T.get('investigation_steps',0)+x['inv_total']
        rows.append((n,tag,x,fr,ui,mi,fe,me))
for n,tag,x,fr,ui,mi,fe,me in rows:
    flags=[k for k,v in (('FALSE-RESOLVE',fr),('UNNEEDED-INV',ui),('MISSED-INV',mi),('FALSE-EST',fe),('MISSED-EST',me)) if v]
    print(f"{n[:30]:30} {tag:4} inv={x['inv_total']}(mod {x['inv_module']}) hyps={x['hyps']} status={x['status']}/{x['retention']} {' '.join(flags)}")
print(json.dumps(totals))
