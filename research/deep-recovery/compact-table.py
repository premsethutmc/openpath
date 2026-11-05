import json,glob,collections,sys
rows=[json.loads(l) for f in sorted(glob.glob('heldout-*.jsonl')) for l in open(f) if l.startswith('{')]
g=collections.defaultdict(list)
for r in rows:
  if r['status']!='n/a': g[(r['orig'],r['type'],r['engine'])].append(r)
E=['p3-selective','p3-two-fresh','p3-current','p2','app']
for k in sorted(set((o,t) for o,t,e in g)):
  out=[]
  for e in E:
    rs=g.get((k[0],k[1],e))
    if not rs: continue
    n=len(rs); fr=sum(r['falseReassurance'] for r in rs); q=sum(r['questions'] for r in rs)/n
    roots=sum(len(r['roots']) for r in rs)
    if roots: m="id%d tg%d rp%d/%d"%(sum(len(r['identified']) for r in rs),sum(len(r['taught']) for r in rs),sum(len(r['repaired']) for r in rs),roots)
    else: m="rec%d unq%.1f"%(sum(r.get('strongRecognised',0) for r in rs),sum(r.get('unnecessaryQuestions',0) for r in rs)/n)
    sol=sum(1 for r in rs if r['claimsSolved'])
    out.append("%s n%d FR%d sol%d q%.1f %s"%(e.replace('p3-',''),n,fr,sol,q,m))
  print(k[0],k[1],' | '.join(out))
