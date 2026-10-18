#!/usr/bin/env python3
"""
Build the word list the reading activity uses to spot possible spelling mistakes in a child's written answer.

    python3 tools/english/spelling/build_dictionary.py --scowl /path/to/en-wl/wordlist [--check]

Every lower-case a-z word in SCOWL's lists up to size 50, British and American spellings (both are accepted in an
answer), minus the blocklist. Pinned to the same SCOWL commit as the word bank; SCOWL's notice is kept in
content/english/spelling/licences/. Output: content/english/spelling/common-words.json (deterministic, sorted).

A word missing from this list is only ever reported as a POSSIBLE spelling mistake, never as wrong: names, new words
and the passage's own words are skipped by the activity.
"""
import argparse
import importlib.util
import json
import re
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("build_wordbank", HERE / "build_wordbank.py")
wb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wb)

MAX_SIZE = 50


def build(scowl: Path) -> str:
    block = wb.load_blocklist()
    c = sqlite3.connect(str(scowl / "scowl.db"))
    words = sorted({w for (w,) in c.execute("select distinct word from scowl_v0 where size <= ?", (MAX_SIZE,)) if re.fullmatch(r"[a-z]+", w) and w not in block})
    src = next(s for s in wb.SOURCES if s["id"] == "scowl")
    doc = {
        "id": "openpath-common-words",
        "source": {"id": "scowl", "name": src["name"], "url": src["url"], "commit": wb.PINS["scowl"], "licence": src["licence"], "notice": src["notice"]},
        "filters": {"scowl_max_size": MAX_SIZE, "spellings": "British and American", "blocklist": "content/english/spelling/blocklist.txt"},
        "built_by": "tools/english/spelling/build_dictionary.py",
        "count": len(words),
        "words": " ".join(words),
    }
    return json.dumps(doc, ensure_ascii=False, indent=0) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scowl", type=Path, required=True)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    head = wb.git_head(a.scowl)
    if head != wb.PINS["scowl"]:
        sys.exit(f"scowl checkout is at {head}, but the list is pinned to {wb.PINS['scowl']}")
    text = build(a.scowl)
    out = wb.OUT / "common-words.json"
    if a.check:
        if not out.exists() or out.read_text() != text:
            sys.exit("common-words.json differs from a fresh build")
        print("common-words.json matches a fresh build")
        return
    out.write_text(text)
    print(f"wrote common-words.json")


if __name__ == "__main__":
    main()
