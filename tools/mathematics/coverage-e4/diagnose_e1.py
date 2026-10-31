#!/usr/bin/env python3
"""E4 step 1: classify why each of the 500 E1 cases did or did not reach a mathematical verdict (inputs: E3 case-level run on the E3 code, E1 corpus under the E3 adjudication overlay)."""
import json,collections,re,os
H=os.path.dirname(os.path.abspath(__file__))+"/../"
res=json.load(open(H+"verification-closure-e3/results/e1adj-final-after.json"))["cases"]
corp=json.load(open(H+"end-to-end-e1/frozen-corpus.v1.json"));corp=corp["cases"] if isinstance(corp,dict) else corp
by={c["id"]:c for c in corp}
DEF=("verified","invalid","incomplete","missing-assumption")
def cause(c,p):
    e=c["engine"];cl=e["classification"];j=(e.get("justification") or "");dom=p["problem"].get("domain")
    if cl in DEF:return "assessed",None
    if "implicit multiplication" in j:return "Ambiguous input","ambiguous-notation"
    if "°" in j:return "Unsupported notation","degree-symbol (geometry)"
    if "±" in j:return "Unsupported notation","plus-minus in solution lines"
    if "unsupported character" in j:return "Unsupported notation","other symbol"
    m=re.search(r"no lossless natural adapter for ([\w-]+)",j)
    if m:
        d=m.group(1);return ("Unsupported calculus reasoning" if d=="calculus" else "Missing natural-working adapter"),f"natural adapter: {d}"
    if "can verify only part" in j:return "Incomplete proof evidence",f"typed adapter partial coverage ({dom})"
    if "could not be analysed exactly" in j:return "Unsupported mathematical operation","algebra lines outside the exact checker (prose / functions / multi-variable)"
    if "problem itself cannot be analysed" in j:return "Unsupported mathematical operation","problem statement outside exact scope"
    if "does not match the typed problem" in j:return "Multivariable binding failure" if False else "Incomplete proof evidence","typed binding mismatch"
    if cl=="malformed":return "Ambiguous input","malformed/unparseable working"
    return "Unsupported mathematical operation",j[:60]
rows=[];mat=collections.defaultdict(lambda:collections.Counter())
for c in res:
    p=by[c["id"]];ref=p["reference"]["classification"];k,sub=cause(c,p)
    definite_ref=ref in DEF
    rec="assessed" if k=="assessed" else ("genuinely-ambiguous-or-out-of-scope" if not definite_ref else ("ambiguous-input-keep-abstaining" if k=="Ambiguous input" else "recoverable-with-capability"))
    rows.append({"id":c["id"],"area":c["area"],"domain":p["problem"].get("domain"),"reference":ref,"engine":c["engine"]["classification"],"cause":k,"capability":sub,"recoverability":rec})
    if rec=="recoverable-with-capability":mat[(k,sub)][ref]+=1
matrix=sorted(({"cause":k,"capability":s,"cases":sum(v.values()),"byReference":dict(v)} for (k,s),v in mat.items()),key=lambda r:-r["cases"])
tot=collections.Counter(r["recoverability"] for r in rows)
out={"baseline":{"cases":len(rows),"definiteVerdicts":tot["assessed"],"coverage":tot["assessed"]/len(rows),"definiteReferenceCeiling":sum(1 for r in rows if r["reference"] in DEF)},"recoverability":dict(tot),"causeCounts":dict(collections.Counter(r["cause"] for r in rows)),"rankedRecoveryMatrix":matrix,"cases":rows}
json.dump(out,open(H+"coverage-e4/results/e1-coverage-diagnosis.json","w") if os.path.isdir(H+"coverage-e4/results") else open("/dev/stdout","w"),indent=1)
print(json.dumps({k:out[k] for k in("baseline","recoverability","causeCounts")}));[print(m["cases"],m["cause"],"|",m["capability"],m["byReference"]) for m in matrix]
