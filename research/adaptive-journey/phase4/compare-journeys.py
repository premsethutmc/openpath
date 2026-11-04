import json,difflib,sys
A,B=sys.argv[1],sys.argv[2]
def summ(t):
    out=[]
    for s in t['steps']:
        if s['stage'] in('module','topic-check','recovery') and (s.get('question') or s.get('phase') in ('chapter','pause','done')):
            st=(s.get('intervention') or {}).get('strategy') or {}
            out.append(f"{s['stage'][0]}:{s.get('phase')}:{s.get('question') or st.get('id','')}:{(s.get('authoritative') or {}).get('verdict','')}{':'+s['context'] if s.get('context') else ''}")
        if s['stage']=='plan': out.append("P"+str([x['competency'].split('.')[-1] for x in s['planItems']]))
    return out
for f in sys.argv[3:]:
    b=json.load(open(f'{A}/{f}.json')); a=json.load(open(f'{B}/{f}.json'))
    sb,sa=summ(b),summ(a); fb,fa=b['final']['target'],a['final']['target']
    print(f, "SAME" if sb==sa else "CHANGED", "|", fb['status'], fb['independent'], fb.get('retention'), "->", fa['status'], fa['independent'], fa.get('retention'))
    if sb!=sa:
        for l in list(difflib.unified_diff(sb,sa,lineterm='',n=0))[2:]: print("   ",l[:160])
    print("   hyps:", [(h['id'],h['status'],h.get('uncertainty',{}).get('note')) for h in a['final'].get('hypotheses',[])])
