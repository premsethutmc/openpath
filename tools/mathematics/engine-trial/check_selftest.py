"""Proves check.py can fail: corrupt known-good benchmark output in controlled ways and require every
corruption to be caught. A checker that has never been seen to reject anything is not evidence.

    python3 check_selftest.py out/k02.json out/k04.json
"""
import copy
import json
import random
import sys

from check import check_k02, check_k04


def main(k02_path, k04_path):
    rnd = random.Random(7)
    ok = True

    k02 = json.load(open(k02_path))
    bad = copy.deepcopy(k02)
    picks = rnd.sample([c for c in bad["cases"] if c["op"] != "lt" and not c.get("refused")], 200)
    for i, c in enumerate(picks):
        n, _, d = c["result"].partition("/")
        if i % 2:  # off by one in the numerator
            c["result"] = f"{int(n) + 1}" + (f"/{d}" if d else "")
        else:      # off in the last digit of the denominator (or a wrong integer)
            c["result"] = f"{n}/{int(d) + 1}" if d else f"{int(n) - 1}"
    caught = check_k02(bad)["total"].get("wrong", 0)
    print(f"K02: {caught}/200 corrupted results caught")
    ok &= caught == 200

    k04 = json.load(open(k04_path))
    eqs = [q for q in k04["equations"] if q.get("solutions")]
    expect = {"incorrect": 0, "incomplete": 0, "misread": 0}
    bad = copy.deepcopy(k04)
    byid = {q["id"]: q for q in bad["equations"]}
    for q in rnd.sample(eqs, 90):
        t = byid[q["id"]]
        mode = rnd.choice(["shift", "drop", "misread"])
        if mode == "shift" and t["solutions"] != ["t"]:
            t["solutions"][0] = ["Add", t["solutions"][0], ["Rational", 1, 7]]
            expect["incorrect"] += 1
        elif mode == "drop" and len(t["solutions"]) == 2:
            t["solutions"] = t["solutions"][:1]
            expect["incomplete"] += 1
        elif mode == "misread":
            t["parsed"] = ["Equal", t["parsed"][1], ["Add", t["parsed"][2], 1]]
            expect["misread"] += 1
    total = check_k04(bad)["total"]
    for outcome, n in expect.items():
        print(f"K04 {outcome}: {total.get(outcome, 0)} caught of {n} injected")
        ok &= total.get(outcome, 0) == n
    print("SELF-TEST", "PASSED" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:3]))
