"""Groups the gap map's untaught modelled misconceptions by REUSABLE INSTRUCTIONAL PATTERN (one teaching strategy each) and ranks the
patterns by learner impact, breadth and ease of integration. Reads inventory.json only (read-only).
  python3 tools/patterns.py docs/math-teaching-content  > (prints the Markdown table rows)
Grouping is by misconception id keywords; a group is a CANDIDATE until its families are read (batch 2 read the five it took)."""
import json, re, sys
root = sys.argv[1]
inv = json.load(open(f"{root}/inventory.json"))
M = {m["competency"]: m for m in inv["modules"]}
PATTERNS = [
    ("PAT-REGROUP", "Regroup at a unit boundary (60 min, 24 h, 100 paise)", r"(hour|minute)-as-100|paise-over-100|^no-carry$|past-24|decimal-hours"),
    ("PAT-CONVERT", "Convert units in the right direction (× or ÷ by the factor)", r"not-converted|factor-upside-down|unit-slip|zero-lost|wrong-unit|inches-as-cm|units-not-matched"),
    ("PAT-PLACE", "A digit's value depends on its place (whole numbers and decimals)", r"face-value|value-not-count|zero-place|digit-by-digit|place-wrong|next-place|zero-dropped|ones-first|times-ten|longer-is-larger|shorter-is-larger"),
    ("PAT-SCALE", "One symbol or line stands for the key/scale", r"no-key|counted-lines|count-lines|assume-tens|one-each|bundle-as"),
    ("PAT-PARTS", "The bottom number counts all the equal parts of one whole", r"count-only|shaded-to-unshaded|add-bottoms|top-number|bottom-number|counted-pieces|counted-strips|bigger-bottom-bigger"),
    ("PAT-LIKE", "Combine only like units or terms (same-size pieces, like terms)", r"unlike-combined|add-denominators|denominators-combined|like-terms"),
    ("PAT-INSIDE", "Inside or boundary (area/perimeter, volume/surface, circle area/circumference)", r"perimeter-for-area|area-for-perimeter|circumference-for-area|arc-for-area|surface-for-volume|total-surface"),
    ("PAT-CHANCE", "Count equally likely outcomes, not categories or totals", r"equally-likely|order-ignored|^odds$|colours-equal|two-outcomes-even"),
    ("PAT-ANGLES", "Angle totals: 180° on a line and in a triangle, 360° round a point", r"opposite-as-linear|straight-only|full-turn|used-360|always-360|exterior-for-interior|exterior-as-interior|supplementary-for-equal|equal-for-supplementary"),
    ("PAT-INVERSE", "Undo with the inverse operation; choose the operation from the situation", r"kept-order|added-given|added-not-subtracted|divisor-as-dividend|took-away|direct-for-inverse"),
    ("PAT-DISTRIBUTE", "Multiply every term (brackets, identities)", r"first-term-only|middle-not-doubled|bracket-sign|not-distributed|squared-separately"),
    ("PAT-ORDER", "Put data in order before locating (median, ordering)", r"not-ordered|one-middle|mean-for-median|descending"),
]
COVERED = {"batch-1": {"adfcmp", "fadd", "aedecc", "aeperar", "ahext", "afcross", "akmed", "ahid", "akdice"},
           "batch-2": {"addur", "acmoneyadd", "acpicttab", "afbar", "adfname", "adshade", "aadigit", "akchance", "anbag"}}
done = COVERED["batch-1"] | COVERED["batch-2"]
rows = []
for pid, title, rx in PATTERNS:
    fams = [f for f in inv["families"] if f["competency"] in M and any(re.search(rx, b) for b in f["bugKinds"])]
    comps = {f["competency"] for f in fams}
    strands = {M[c]["strand"] for c in comps}
    grades = [f["grade"][0] for f in fams if f["grade"]]
    untaught = [f for f in fams if M[f["competency"]]["seedFamily"] != f["id"]]
    word = sum(1 for f in fams if f["word"])
    alts = sum(1 for f in fams if f["alternatives"] > 0)
    gmin = min(grades) if grades else 12
    ease = round((word + alts) / (2 * len(fams)), 2) if fams else 0
    score = round(len(comps) + 2 * len(strands) + max(0, 9 - gmin) / 2 + 3 * ease, 1)
    covered = sorted(f["id"] for f in fams if f["id"] in done)
    rows.append((score, pid, title, len(fams), len(comps), sorted(strands), gmin, max(grades) if grades else None, len(untaught), ease, covered))
rows.sort(reverse=True)
for r in rows:
    score, pid, title, nf, nc, st, g0, g1, un, ease, cov = r
    print(f"| {pid} | {title} | {nf} | {nc} | {', '.join(st)} | {g0}–{g1} | {un} | {ease} | **{score}** | {', '.join(f'`{c}`' for c in cov) or '—'} |")
