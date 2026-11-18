#!/usr/bin/env python3
"""
Build the word lookup: a short meaning, an example sentence and a syllable count for common English words.

    python3 tools/english/dictionary/build_lookup.py --oewn /path/to/english-wordnet --cmudict /path/to/cmudict

Nothing is downloaded. The two sources are local git checkouts at the commits pinned below (the script refuses
any other), so the file can always be rebuilt exactly.

  Open English WordNet (CC BY 4.0)   meanings and example sentences, used as they appear
  CMUdict (BSD 2-clause)             which words are in everyday spoken use, and their syllable count

A word is kept only if a meaning fit for a child aged about 10 can be found for it by rule: the first sense whose
definition is short, plain and free of blocklisted words. Words with no such meaning are left out; the app then
shows no meaning, which is better than a wrong or adult one. Nothing here is reviewed by a person.

Output: content/english/dictionary/lookup.json.gz, written deterministically (sorted keys, no timestamps).
"""
import argparse
import gzip
import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
PINS = {"oewn": "9b6aca7", "cmudict": "7479086"}
WORD = re.compile(r"^[a-z]{3,14}$")
MAX_WORDS, MAX_CHARS, MAX_EXAMPLE = 14, 90, 110
# definitions that explain nothing to a child: cross-references, grammar notes, taxonomy
SKIP = re.compile(r"\b(genus|family|order|species|taxonomic|phylum|variant of|plural of|past tense|used with|informal terms?|slang|archaic|obsolete|vulgar|genitals?|sexual|intercourse)\b|[()\[\]]", re.I)


def pin(path: Path, want: str):
    got = subprocess.run(["git", "-C", str(path), "rev-parse", "--short=7", "HEAD"], capture_output=True, text=True).stdout.strip()
    if got != want:
        sys.exit(f"{path} is at {got}, not the pinned {want}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--oewn", type=Path, required=True)
    ap.add_argument("--cmudict", type=Path, required=True)
    a = ap.parse_args()
    pin(a.oewn, PINS["oewn"])
    pin(a.cmudict, PINS["cmudict"])
    block = {w.strip().lower() for w in (ROOT / "content/english/spelling/blocklist.txt").read_text().splitlines() if w.strip() and not w.startswith("#")}

    syllables = {}
    for line in (a.cmudict / "cmudict.dict").read_text(encoding="latin-1").splitlines():
        parts = line.split("#")[0].split()
        if len(parts) > 1 and WORD.match(parts[0]) and parts[0] not in syllables:
            syllables[parts[0]] = sum(1 for p in parts[1:] if p[-1].isdigit())

    synsets = {}
    src = a.oewn / "src" / "yaml"
    for f in sorted(src.glob("*.yaml")):
        if f.name.startswith("entries-") or f.name == "frames.yaml":
            continue
        for sid, s in (yaml.safe_load(f.read_text(encoding="utf-8")) or {}).items():
            synsets[sid] = s

    def clean(defn: str):
        d = defn.split(";")[0].strip()
        if not d or len(d) > MAX_CHARS or len(d.split()) > MAX_WORDS or SKIP.search(d):
            return None
        if any(w in block for w in re.findall(r"[a-z]+", d.lower())):
            return None
        return d

    out = {}
    for f in sorted(src.glob("entries-*.yaml")):
        for lemma, by_pos in (yaml.safe_load(f.read_text(encoding="utf-8")) or {}).items():
            if not isinstance(lemma, str) or not WORD.match(lemma) or lemma in block or lemma not in syllables:
                continue
            for pos in ("n", "v", "a", "s", "r"):
                if lemma in out or pos not in by_pos:
                    continue
                for sense in by_pos[pos].get("sense", [])[:1]:  # the first sense only: later ones are rarer and misled in testing
                    s = synsets.get(sense.get("synset"))
                    if not s:
                        continue
                    meaning = next((m for m in (clean(d) for d in s.get("definition", [])) if m), None)
                    if not meaning or re.search(rf"\b{lemma}", meaning, re.I):
                        continue
                    entry = {"m": meaning, "s": syllables[lemma]}
                    for ex in s.get("example", []):
                        text = ex if isinstance(ex, str) else ex.get("text", "")
                        text = text.strip().strip('"')
                        if re.search(rf"\b{lemma}\b", text, re.I) and 12 <= len(text) <= MAX_EXAMPLE and not SKIP.search(text) and not any(w in block for w in re.findall(r"[a-z]+", text.lower())):
                            entry["e"] = text[0].upper() + text[1:] + ("" if text[-1] in ".!?" else ".")
                            break
                    out[lemma] = entry
                    break
    meta = {"id": "openpath-word-lookup", "version": 1, "status": "candidate: made by rule from Open English WordNet and CMUdict; not reviewed by a person", "sources": {"Open English WordNet": PINS["oewn"], "CMUdict": PINS["cmudict"]}, "fields": {"m": "meaning", "e": "example sentence (optional)", "s": "syllables"}, "words": len(out)}
    target = ROOT / "content/english/dictionary/lookup.json.gz"
    target.parent.mkdir(parents=True, exist_ok=True)
    with gzip.GzipFile(target, "wb", mtime=0) as g:
        g.write(json.dumps({"meta": meta, "entries": dict(sorted(out.items()))}, ensure_ascii=False, separators=(",", ":")).encode())
    print(json.dumps(meta))
    print("with example:", sum(1 for e in out.values() if "e" in e), "bytes:", target.stat().st_size)


if __name__ == "__main__":
    main()
