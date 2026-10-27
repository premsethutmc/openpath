"""Import the 173 distinct LeanEuclid proofs with source and licence metadata.

Usage: python3 benchmark/import_leaneuclid.py /path/to/LeanEuclid
Upstream: https://github.com/loganrjmurphy/LeanEuclid (MIT), pinned below.
No expected result is obtained from OpenPath's geometry reasoner.
"""
from __future__ import annotations
import hashlib,json,subprocess,sys
from pathlib import Path

PIN="33a72c0fa83914202532998a2e7b8771295c3cc7"
root=Path(sys.argv[1]).resolve(); actual=subprocess.check_output(["git","-C",str(root),"rev-parse","HEAD"],text=True).strip()
if actual!=PIN: raise SystemExit(f"expected LeanEuclid {PIN}, got {actual}")
lic=(root/"LICENSE").read_text(); items=[]
def add(identifier,kind,path,statement,proof):
    raw=(statement+"\n"+"\n".join(proof)).encode()
    items.append({"id":identifier,"source_kind":kind,"source_path":path,"source_commit":PIN,"license":"MIT","source_sha256":hashlib.sha256(raw).hexdigest(),"statement":statement,"proof_steps":proof,"oracle":{"valid":True,"complete":True,"basis":"source contains a formal Lean proof; OpenPath did not generate this label"}})
for p in sorted((root/"Book").glob("Prop*.lean")):
    text=p.read_text(); lines=[x.rstrip() for x in text.splitlines() if x.strip()]
    add(f"leaneuclid-book-{p.stem.lower()}","Euclid Elements formalization",str(p.relative_to(root)),next((x for x in lines if x.strip().startswith("theorem ")),lines[0]),lines)
for proof in sorted((root/"UniGeo").glob("*/proofs/*.txt")):
    text=proof.parents[1]/"texts"/proof.name
    add(f"leaneuclid-unigeo-{proof.parents[1].name.lower()}-{proof.stem.zfill(2)}","UniGeo held-out proof",str(proof.relative_to(root)),text.read_text().strip(),[x.strip() for x in proof.read_text().splitlines() if x.strip()])
for p in sorted((root/"AutoFormalization/example/UniGeo").glob("*/formalizations/*.lean")):
    lines=[x.rstrip() for x in p.read_text().splitlines() if x.strip()]
    add(f"leaneuclid-example-{p.parents[1].name.lower()}-{p.stem.zfill(2)}","UniGeo few-shot formalization",str(p.relative_to(root)),next((x for x in lines if x.strip().startswith("theorem ")),lines[0]),lines)
if len(items)!=173 or len({x["source_path"] for x in items})!=173: raise SystemExit(f"expected 173 distinct proofs, got {len(items)}")
out={"version":"external-geometry-proofs@1","source":{"repository":"https://github.com/loganrjmurphy/LeanEuclid","commit":PIN,"license":"MIT","copyright":"Copyright (c) 2024 Logan Murphy","license_text":lic},"cases":items}
Path(__file__).with_name("external_geometry_proofs_v1.json").write_text(json.dumps(out,indent=2)+"\n")
print(f"imported {len(items)} distinct external proof sequences")
