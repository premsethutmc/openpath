import json
from pathlib import Path
cats=[("forged-digest","rejected"),("valid-digest-false-math","rejected"),("missing-assumption","unsupported"),("incorrect-rule","rejected"),("invalid-dependency","invalid"),("valid-or-unsupported-route","verified")]
cases=[]
for cat,expected in cats:
 for i in range(25):
  cases.append({"id":f"u4-{cat}-{i:02}","category":cat,"parameter":i+1,"expected":(("unsupported" if i>=20 else "verified") if cat=="valid-or-unsupported-route" else expected),"oracle":"independently specified certificate integrity, exact algebra, assumption, or dependency invariant"})
out={"version":"proof-kernel-u4-adversarial@1","frozenBeforeEvaluation":True,"cases":cases}
Path(__file__).with_name("adversarial-cases.v1.json").write_text(json.dumps(out,indent=2)+"\n")
print(len(cases))
