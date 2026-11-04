"""Freeze independently labelled U3 audit selections and composed journeys."""
import json
from pathlib import Path
ROOT=Path(__file__).parents[3]
def load(p): return json.loads((ROOT/p).read_text())["cases"]
m1=load("tools/mathematics/m1/independent-cases.v1.json")
m2=load("tools/mathematics/m2/independent-cases.v1.json")
calc=load("tools/mathematics/calculus/independent-cases.v1.json")
c3=load("tools/mathematics/calculus-c3/independent-cases.v1.json")
sym=load("tools/mathematics/symbolic-m3/independent-cases.v1.json")
held=load("tools/mathematics/symbolic-m3/heldout-cases.v1.json")
u2=load("tools/mathematics/unified-u2/independent-cases.v2.json")
def pick(xs,status,n,offset=0):
 ys=[x for x in xs if x["expected"]["classification"]==status]
 return [ys[(i+offset)%len(ys)] for i in range(n)]
def journey(i,items):
 stages=[]; work=[]; expected="verified"; first=None; offset=0
 for j,c in enumerate(items):
  sid=f"stage-{j}"; stages.append({"id":sid,"problem":c["problem"],"dependsOn":[] if j==0 else [f"stage-{j-1}"]}); work.append({"id":sid,"working":c["working"]})
  if expected=="verified" and c["expected"]["classification"]!="verified":
   expected=c["expected"]["classification"]
   local=c["expected"].get("firstInvalidStep")
   first=None if local is None else offset+local
  offset+=len(c["working"]) if isinstance(c["working"],list) else 0
 return {"id":f"cross-{i:03}","area":"cross-domain","problem":{"domain":"m2-cross-domain","stages":stages},"working":{"stages":work},"expected":{"classification":expected,"firstInvalidStep":first},"oracle":"composition of independently labelled domain steps; earliest non-verified stage is authoritative"}
cases=[]
# 100 all-valid routes across distinct domains.
families=[(m1,m2),(m2,calc),(m2,c3),(held,calc),(m1,held)]
for i in range(100):
 a,b=families[i%len(families)]; cases.append(journey(i,[pick(a,"verified",1,i)[0],pick(b,"verified",1,i*3)[0]]))
# 50 routes with an independently labelled early error followed by otherwise valid mathematics.
for i in range(50): cases.append(journey(100+i,[pick([m1,m2,calc,c3,sym][i%5],"invalid",1,i)[0],pick(held,"verified",1,i)[0]]))
# 100 certificate cases: 50 accepted exact proofs and 50 rejected/missing/unsupported transformations.
cert_source=pick(held,"verified",50)+pick(sym,"invalid",20)+pick(sym,"missing-assumption",15)+pick(sym,"unsupported",15)
for i,c in enumerate(cert_source): cases.append({**c,"id":f"certificate-{i:03}","area":"certificate-adversarial"})
# 100 domain/assumption cases selected from independently authored native corpora.
domain_source=pick(m1,"verified",25,10)+pick(m2,"verified",25,20)+pick(calc,"verified",20,30)+pick(sym,"missing-assumption",20)+pick(sym,"invalid",10,20)
for i,c in enumerate(domain_source): cases.append({**c,"id":f"domain-{i:03}","area":"domain-assumption"})
# 50 explicit fail-closed/resource cases.
boundary=pick(m2,"unsupported",15)+pick(calc,"unsupported",10)+pick(sym,"unsupported",10)+pick(m2,"resource-exhausted",5)+pick(calc,"resource-exhausted",5)+pick(sym,"resource-exhausted",5)
for i,c in enumerate(boundary): cases.append({**c,"id":f"boundary-{i:03}","area":"resource-unsupported"})
assert len(cases)==400
out={"version":"unified-math-u3-audit@1","frozenBeforeEvaluation":True,"labelPolicy":"existing independently authored labels plus deterministic earliest-stage composition","cases":cases}
Path(__file__).with_name("independent-audit-cases.v1.json").write_text(json.dumps(out,separators=(",",":"))+"\n")
print(len(cases))
