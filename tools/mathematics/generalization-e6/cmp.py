import json,sys
part=sys.argv[1]; which=sys.argv[2] if len(sys.argv)>2 else 'diff'
a=json.load(open(f'results/{part}-reg-e6.json'))['cases']; b={c['id']:c for c in json.load(open(f'results/{part}-reg-e5.json'))['cases']}
for c in a:
    o=b[c['id']]; ce=c['engine']['classification']; oe=o['engine']['classification']; ref=c['reference']['classification']
    fa=c['metrics'].get('falseAcceptance'); fr=c['metrics'].get('falseRejection')
    if which=='diff' and ce==oe and not fa and not fr: continue
    print(c['id'][-4:],str(c['family'])[:34],'ref=',ref,'e6=',ce,'e5=',oe,'FA' if fa else '','FR' if fr else '','|',(c['engine'].get('justification') or '')[:120])
