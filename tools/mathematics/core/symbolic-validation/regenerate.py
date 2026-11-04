"""Regenerate the bulk validation data from generators + fixed seeds and verify it against MANIFEST.sha256.json.

The bulk files (cases.s{1,2,3}.json, engine.s{1,2,3}.json, deriv.s{1,2,3}.json) are not stored in Git: they are exact functions of
(gen.py, seed) and of the engine under test. Their SHA-256 are in MANIFEST.sha256.json. Per-case timings ('ms') are stripped and the
JSON is written compactly, so a re-run on the same engine is byte-identical.

  python3 regenerate.py            # regenerate into data/ (git-ignored) and verify every file against the manifest
  python3 regenerate.py --seed 2   # one seed

Requires: SymPy (gen.py only; labels never come from SymPy: oracle.py labels every case), Node >= 22.6 (type stripping), the repo's
tools/mathematics/reasoner/ts-resolve.mjs loader. A MISMATCH in engine/deriv files means the engine's output changed: that is a finding
to investigate (git log the engine), not a reason to update the manifest.
"""
import hashlib, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, "data"); ROOT = os.path.abspath(os.path.join(HERE, "../../../.."))
MAN = json.load(open(os.path.join(HERE, "MANIFEST.sha256.json")))
def run_ts(script, *args):
    subprocess.check_call(["node", "--experimental-strip-types", "--no-warnings", "--import", os.path.join(ROOT, "tools/mathematics/reasoner/ts-resolve.mjs"), os.path.join(HERE, script), *args], cwd=ROOT, stdout=subprocess.DEVNULL)
def strip_ms(path):
    def s(d):
        if isinstance(d, list): return [s(x) for x in d]
        if isinstance(d, dict): return {k: s(v) for k, v in d.items() if k != "ms"}
        return d
    d = s(json.load(open(path))); open(path, "w").write(json.dumps(d, separators=(",", ":")))
def sha(path): return hashlib.sha256(open(path, "rb").read()).hexdigest()
def main():
    seeds = [int(sys.argv[sys.argv.index("--seed") + 1])] if "--seed" in sys.argv else [1, 2, 3]
    os.makedirs(DATA, exist_ok=True); bad = 0
    for sd in seeds:
        cases = os.path.join(DATA, f"cases.s{sd}.json"); eng = os.path.join(DATA, f"engine.s{sd}.json"); der = os.path.join(DATA, f"deriv.s{sd}.json")
        subprocess.check_call([sys.executable, os.path.join(HERE, "gen.py"), str(sd), cases], cwd=HERE, stdout=subprocess.DEVNULL)
        run_ts("run_engine.ts", cases, eng); strip_ms(eng)
        run_ts("run_derivation.ts", cases, der); strip_ms(der)
        for p in (cases, eng, der):
            name = os.path.basename(p); ok = sha(p) == MAN["files"][name]["sha256"]; bad += not ok
            print(("OK       " if ok else "MISMATCH ") + name)
    sys.exit(1 if bad else 0)
main()
