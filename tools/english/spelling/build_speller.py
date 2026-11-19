"""Build the word list the writing check uses to spot misspellings (content/english/spelling/speller-words.txt).

    python tools/english/spelling/build_speller.py --scowl /path/to/en-wl/wordlist   (with scowl.db built by its `make`)

Source: SCOWL / ESDB (en-wl/wordlist), the same pinned checkout the spelling word bank is built from; size 60 and
below is the list ordinary spell checkers use. British, American, Canadian and Australian spellings are all kept
(colour and color, organise and organize), since learners meet both. Only lower-case words: a word written with a
capital in the middle of a sentence is taken as a name and never checked. speller-extra.txt adds words common in
Indian English writing that SCOWL lacks (amma, dosa, lakh).

The file has one section per SCOWL size ("#10" the commonest words, up to "#60"), so that a suggestion can prefer a
common word.
Words on blocklist.txt are kept as correct (a learner may write them) but listed under "#no-suggest": the check never
offers one of them as a correction. Nothing is downloaded here.
"""

import argparse
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPELL = ROOT / "content" / "english" / "spelling"
WORD = re.compile(r"[a-z]+(?:'[a-z]+)?")


def words_of(path: Path) -> set:
    return {w for line in path.read_text(encoding="utf-8").splitlines() if not line.startswith("#") for w in line.split()}


def build(scowl: Path) -> str:
    c = sqlite3.connect(scowl / "scowl.db")
    rows = c.execute(
        "select word, min(size) from scowl_v0 where size <= 60 and category = '' and region in ('', 'US', 'GB', 'CA', 'AU')"
        " and variant_level <= 2 group by word"
    )
    size = {w: s for w, s in rows if WORD.fullmatch(w)}
    for w in words_of(SPELL / "speller-extra.txt"):
        size.setdefault(w, 35)
    blocked = words_of(SPELL / "blocklist.txt") & set(size)
    out = []
    for band in sorted(set(size.values())):
        out.append(f"#{band}")
        out += sorted(w for w, s in size.items() if s == band)
    out.append("#no-suggest")
    out += sorted(blocked)
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--scowl", type=Path, required=True)
    a = ap.parse_args()
    text = build(a.scowl)
    (SPELL / "speller-words.txt").write_text(text, encoding="utf-8")
    print(f"wrote speller-words.txt: {text.count(chr(10))} lines, {len(text.encode())} bytes")
