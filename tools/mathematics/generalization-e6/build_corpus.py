"""Assemble, partition, audit, and freeze the independent E6 corpus (300 cases)."""
import json, hashlib, re, sys, os, glob, random, collections
import kit, auth_diff, auth_int, auth_lim, auth_prob, auth_cx, auth_mixed
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
DROP = {"alt-negative-exponent", "sum-split"}      # near-duplicates of retained diff families (dropped to reach exactly 60)
QUOTA = {"differentiation": 60, "integration": 60, "limits-continuity": 40, "probability-combinatorics": 45, "complex-polynomial": 45, "mixed-domain": 50}
SPLIT = {"differentiation": (20, 20, 20), "integration": (20, 20, 20), "limits-continuity": (13, 14, 13),
         "probability-combinatorics": (15, 15, 15), "complex-polynomial": (15, 15, 15), "mixed-domain": (17, 16, 17)}
PARTS = ["dev", "validation", "sealed"]

def collect():
    out = []
    for mod in (auth_diff, auth_int, auth_lim, auth_prob, auth_cx, auth_mixed):
        kit.CASES.clear(); mod.build(); out += [c for c in kit.CASES]
    out = [c for c in out if not (c["category"] == "differentiation" and c["family"] in DROP)]
    return out

def norm(t): return re.sub(r"\d+", "#", re.sub(r"\s+", " ", t.lower()))
def shingles(t, n=3):
    w = re.findall(r"[a-z#]+|[^\sa-z#]", norm(t)); return {tuple(w[i:i + n]) for i in range(max(1, len(w) - n + 1))}
def jac(a, b): return len(a & b) / max(1, len(a | b))

def historical():
    texts = []
    for p in ["../end-to-end-e1/frozen-corpus.v1.json", "../proof-integrity-e2/dev-cases.v1.json", "../proof-integrity-e2/sealed-cases.v1.json",
              "../verification-closure-e3/dev-cases.v1.json", "../verification-closure-e3/sealed-cases.v1.json",
              "../coverage-e4/dev-cases.v1.json", "../coverage-e4/sealed-cases.v1.json", "../geocalc-e5/dev-cases.v1.json", "../geocalc-e5/sealed-cases.v1.json"]:
        f = os.path.join(HERE, p)
        if not os.path.exists(f): continue
        d = json.load(open(f)); d = d.get("cases", d) if isinstance(d, dict) else d
        for c in d:
            t = (c.get("studentWorking") or {}).get("text") or c.get("working") or ""
            if t: texts.append(shingles(t))
    return texts

def main():
    cs = collect()
    cnt = collections.Counter(c["category"] for c in cs); assert dict(cnt) == QUOTA, cnt
    for i, c in enumerate(cs): c["caseId"] = f"e6-{i:03d}"
    # near-duplicate audit (within corpus) and similarity to E1-E5
    sh = [shingles(c["studentWorking"]["text"]) for c in cs]
    dup = [(cs[i]["caseId"], cs[j]["caseId"], round(jac(sh[i], sh[j]), 2)) for i in range(len(cs)) for j in range(i) if jac(sh[i], sh[j]) > 0.75]
    hist = historical(); hs = {}
    for i, s in enumerate(sh):
        m = max((jac(s, h) for h in hist), default=0)
        if m > 0.6: hs[cs[i]["caseId"]] = round(m, 2)
    # group by base problem, deal by category quota keeping class balance
    groups = collections.defaultdict(list)
    for c in cs: groups[(c["category"], json.dumps(c["problem"], sort_keys=True))].append(c)
    rnd = random.Random(20260628)
    assign = {}
    for cat, q in SPLIT.items():
        gs = [g for k, g in groups.items() if k[0] == cat]; rnd.shuffle(gs); gs.sort(key=lambda g: -len(g))
        fill = [0, 0, 0]; byclass = [collections.Counter() for _ in range(3)]
        for g in gs:
            best = None
            for p in range(3):
                if fill[p] + len(g) > q[p]: continue
                score = sum(byclass[p][x["reference"]["classification"]] for x in g) + fill[p] / q[p] * 2
                if best is None or score < best[0]: best = (score, p)
            if best is None: raise SystemExit(f"cannot place group in {cat}: fill {fill} quota {q}")
            p = best[1]
            for x in g: assign[x["caseId"]] = p; byclass[p][x["reference"]["classification"]] += 1
            fill[p] += len(g)
        assert fill == list(q), (cat, fill, q)
    parts = {n: [] for n in PARTS}
    for c in cs: parts[PARTS[assign[c["caseId"]]]].append(c)
    for n in PARTS: assert len(parts[n]) == 100
    # label/audit stats
    stats = {n: dict(by_class=dict(collections.Counter(c["reference"]["classification"] for c in parts[n])),
                     by_category=dict(collections.Counter(c["category"] for c in parts[n])),
                     alternative=sum(1 for c in parts[n] if c["reference"]["alternativeMethodValid"])) for n in PARTS}
    for n in PARTS:
        fn = os.path.join(HERE, f"{n}-cases.v1.json")
        json.dump(dict(partition=n, count=100, cases=parts[n]), open(fn, "w"), indent=1, ensure_ascii=False, sort_keys=True)
    hashes = {n: hashlib.sha256(open(os.path.join(HERE, f"{n}-cases.v1.json"), "rb").read()).hexdigest() for n in PARTS}
    json.dump(dict(near_duplicates=dup, historical_similarity_over_0_6=hs, stats=stats, dropped_families=sorted(DROP)), open(os.path.join(HERE, "results", "corpus-audit.v1.json"), "w"), indent=1)
    print(json.dumps(stats, indent=0)[:1500]); print("dups", dup, "hist", hs); print(hashes)
    if "--freeze" in sys.argv:
        for n in PARTS: open(os.path.join(HERE, f"FROZEN_SHA256.{n}"), "w").write(hashes[n] + "\n")
        import datetime; open(os.path.join(HERE, "FROZEN_AT"), "w").write(datetime.datetime.utcnow().isoformat() + "Z\n")
        print("frozen")
if __name__ == "__main__": main()
