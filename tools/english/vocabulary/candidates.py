#!/usr/bin/env python3
"""
Propose candidate words for New words (content/english/vocabulary/daily-words.json), and check its levels.

    python3 -I tools/english/vocabulary/candidates.py --scowl /path/to/en-wl/wordlist --ngrams /path/to/orgtre/google-books-ngram-frequency

Nothing is downloaded and nothing is written: the script prints. It proposes; a person chooses and writes.

  Google Books Ngram frequency list (orgtre/google-books-ngram-frequency, CC BY 3.0, commit pinned below)
      the 10,000 most frequent English words in books. Used for: an order of commonness for levels 1 to 5
      (rank windows below), and the check that the taught levels follow that order.
  SCOWL (en-wl/wordlist, commit pinned below; scowl.db built by its `make`)
      whether a candidate is a base-form noun, verb or adjective in British spelling. Its sizes are NOT used
      for levels: in this release every taught word falls in the one smallest list (size 35).
  content/english/spelling/blocklist.txt
      the house word screen.

What this showed on 19 November 2026 (see docs/english/WORD_LEVELS.md): the frequency list is a list of adult
book vocabulary. After the screen it still proposes legislation, membrane, theology, defendant and worse, so it
cannot choose words for children by itself; and it holds almost none of the words taught at levels 6 to 8.
"""
import argparse, csv, json, re, sqlite3, statistics, subprocess, sys
from pathlib import Path

PINS = {"scowl": "1e5b7d3", "ngrams": "e20471c"}
WINDOWS = {1: (900, 2500), 2: (2500, 4000), 3: (4000, 6000), 4: (6000, 8000), 5: (8000, 10000)}
ROOT = Path(__file__).resolve().parents[3]

def head(repo: Path) -> str:
    return subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--scowl", required=True, type=Path)
    ap.add_argument("--ngrams", required=True, type=Path)
    a = ap.parse_args()
    if not head(a.scowl).startswith(PINS["scowl"]):
        sys.exit(f"SCOWL is at {head(a.scowl)}, expected {PINS['scowl']}")
    if not head(a.ngrams).startswith(PINS["ngrams"]):
        sys.exit(f"the frequency list is at {head(a.ngrams)}, expected {PINS['ngrams']}")
    print(f"sources: scowl {head(a.scowl)}, ngrams {head(a.ngrams)}")
    db = sqlite3.connect(a.scowl / "scowl.db")
    blocked = {w for l in (ROOT / "content/english/spelling/blocklist.txt").read_text().splitlines() if not l.startswith("#") for w in l.split()}
    words = json.loads((ROOT / "content/english/vocabulary/daily-words.json").read_text())["words"]
    check = {w[1] for w in json.loads((ROOT / "content/english/vocabulary/size-check.json").read_text())["words"]}
    have = {w[2] for w in words} | check
    rows = [r["ngram"] for r in csv.DictReader(open(a.ngrams / "ngrams/1grams_english.csv"))]
    rank = {}
    for i, w in enumerate(rows):
        rank.setdefault(w.lower(), i + 1)

    def pos(w: str) -> str:
        r = db.execute("select distinct pos from scowl_v0 where word=? and size<=35 and spelling in ('B','_') and pos in ('n0','v0','aj0')", (w,)).fetchall()
        return "".join(sorted({p[0][0] for p in r}))

    print("\n# taught words by level: how many are in the top 10,000, and their median rank")
    for band in range(1, 9):
        ranks = [rank[w[2]] for w in words if w[0] == band and w[2] in rank]
        total = sum(1 for w in words if w[0] == band)
        print(f"level {band}: {len(ranks)} of {total} in the list, median rank {int(statistics.median(ranks)) if ranks else '-'}")

    print("\n# candidates by level (base-form nouns, verbs, adjectives; screened; not already taught or in the word check)")
    for band, (lo, hi) in WINDOWS.items():
        out = [f"{w}/{pos(w)}" for w in rows[lo:hi] if re.fullmatch(r"[a-z]{4,11}", w) and w not in have and w not in blocked and pos(w)]
        print(f"level {band} ({len(out)}): {' '.join(out)}")

if __name__ == "__main__":
    main()
