"""python3 tools/english/research/summarise.py — prints the experiment grid as averages over seeds."""
import json, statistics as st, sys
from collections import defaultdict
d = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "tools/english/out/research/experiments.json"))["rows"]
g = defaultdict(list)
for r in d:
    g[(r["simulator"], r["bank"], r["model"])].append(r)
print(f"{'simulator':34}{'bank':8}{'model':18}{'M1':>6}{'M2':>6}{'M3':>6}{'M4%':>6}{'M5':>6}{'gErr':>6} M6pass gBias  bias gapB  highB forgF")
for k, v in sorted(g.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2])):
    m = [st.mean(x["M"][i] for x in v) for i in range(6)]
    print(f"{k[0]:34}{k[1]:8}{k[2]:18}" + "".join(f"{x:6.2f}" for x in m) +
          f" {sum(x['passes'][5] for x in v):>2}/{len(v)} {st.mean(x['guesserBias'] for x in v):6.2f} {st.mean(x['bias'] for x in v):5.2f} {st.mean(x['gapBias'] for x in v):5.2f} {st.mean(x['highBias'] for x in v):6.2f} {st.mean(x['forgetterFlagged'] for x in v):4.1f}")
