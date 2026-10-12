#!/usr/bin/env python3
"""
Build OpenPath's spelling word bank from three openly licensed sources.

    python3 tools/english/spelling/build_wordbank.py \
        --scowl  /path/to/en-wl/wordlist   (with scowl.db built by its `make`)
        --cmudict /path/to/cmusphinx/cmudict
        --oewn   /path/to/globalwordnet/english-wordnet

Nothing is downloaded here. The three sources are local git checkouts; the script refuses to run
unless each is at the commit pinned below, so the bank can always be rebuilt exactly. To move to a
newer release, update the pins, rebuild, and review the diff and the licence files again.

What is taken from each source (and nothing else):

  SCOWL / ESDB (en-wl/wordlist)  which words exist, how common they are (size 10, 20 or 35, the three
                                 smallest lists), British spelling (with American and -ize spellings
                                 kept as accepted variants), part of speech, and inflected forms of a
                                 lemma (hope -> hoping). Words marked vulgar or offensive are excluded.
  CMUdict (cmusphinx/cmudict)    syllable count and stress (for doubling rules) and homophone groups.
                                 American pronunciations: groups whose shared pronunciation relies on
                                 American vowel mergers are dropped (see `british_safe`).
  Open English WordNet           a short meaning for clues, example sentences for homophones, and the
                                 relations used to confirm a prefix or suffix really joins to its
                                 base (unhappy <-> happy), so that "repeat" is never read as re + peat.

Word frequency lists (wordfreq) and example sentences from Tatoeba are deliberately not used: their
licences (share-alike, mixed) are under review (decision 4 of 12 October 2026).

Output: content/english/spelling/wordbank.json, written deterministically (sorted, no timestamps),
with the source commits and the licence of every field. All entries are candidate content.
"""
import argparse
import json
import re
import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "content" / "english" / "spelling"

PINS = {
    "scowl": "1e5b7d3a72f47a71da5d28686c1dd4b397178485",
    "cmudict": "74790861f652b15e4ac49015a90074ad62a27690",
    "oewn": "bff3181fe5c810dcd157cba0eed60322a6e0aaed",
}

SOURCES = [
    {
        "id": "scowl",
        "name": "English Speller Database (ESDB, formerly SCOWL), by Kevin Atkinson",
        "url": "https://github.com/en-wl/wordlist",
        "licence": "MIT-like permissive licence; notices kept verbatim (including the UKACD and WordNet notices)",
        "notice": "content/english/spelling/licences/SCOWL-Copyright.txt",
        "used_for": "words, commonness (size 10/20/35), British spelling and accepted variants, part of speech, inflected forms",
    },
    {
        "id": "cmudict",
        "name": "The CMU Pronouncing Dictionary, Carnegie Mellon University",
        "url": "https://github.com/cmusphinx/cmudict",
        "licence": "BSD 2-clause",
        "notice": "content/english/spelling/licences/CMUdict-LICENSE.txt",
        "used_for": "syllables and stress (doubling rules), homophone groups",
    },
    {
        "id": "oewn",
        "name": "Open English WordNet (derived from Princeton WordNet), by the Open English Wordnet team",
        "url": "https://github.com/globalwordnet/english-wordnet",
        "licence": "CC BY 4.0, plus the Princeton WordNet licence for the underlying data",
        "notice": "content/english/spelling/licences/OEWN-LICENSE.md",
        "used_for": "short meanings (clues), example sentences (homophones), relations confirming prefix and suffix joins",
    },
]

# Difficulty ladders (content/english/items/progressions.json): the band of each step.
LADDER = {
    "EN.FND.SPL.inflections": {"plain": 1.5, "es_plural": 2.5, "double_short": 3.0, "drop_e": 3.5, "y_to_i": 4.25, "stress_doubling": 5.75, "no_double_unstressed": 6.25, "exceptions": 7.5},
    "EN.FND.SPL.homophones": {"common_pairs": 2.0, "less_common": 5.25},
    "EN.FND.SPL.morphological": {"plain_affix": 2.0, "double_at_join": 3.5, "ful_ly_ment": 4.5, "able_ible": 5.5, "tion_sion": 6.0},
}
PER_STEP = 60  # at most this many words per step, the commonest first
SIZES = (10, 20, 35)
VOWELS = set("aeiou")

def git_head(path: Path) -> str:
    return subprocess.run(["git", "-C", str(path), "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()


def load_blocklist(name="blocklist.txt") -> set:
    words = set()
    for line in (OUT / name).read_text().splitlines():
        if line.strip() and not line.startswith("#"):
            words.update(line.split())
    return words


def fnv1a(text: str) -> int:
    h = 0x811C9DC5
    for ch in text.encode("utf-8"):
        h = ((h ^ ch) * 0x01000193) & 0xFFFFFFFF
    return h


def tokens(text: str) -> list:
    return re.findall(r"[a-z']+", text.lower())


# ------------------------------------------------------------------ SCOWL

def load_scowl(db: Path):
    """Common British words with their lemma, form and accepted variants."""
    c = sqlite3.connect(str(db))
    base = """
      select s.group_id, s.lemma_id, s.word_id, s.size, s.pos, s.base_pos, s.word, s.spelling, s.variant_level, g.usage_note
      from scowl_ s join groups g using (group_id)
      where s.category = '' and s.pos_category = '' and s.region in ('', {region}) and s.variant_level <= 1
    """
    gb = c.execute(base.format(region="'GB'") + " and s.spelling in ('B','_') and s.size <= 70").fetchall()
    us = c.execute(base.format(region="'US'") + " and s.spelling in ('A','Z','_') and s.size <= 70").fetchall()
    # every word in any list up to size 70, British or American: a misspelling must never be one of these
    known = {r[0] for r in c.execute("select distinct word from scowl_v0 where size <= 70")}
    lemma_word = dict(c.execute("select word_id, word from words where word_id = lemma_id"))
    bad_groups = {r[0] for r in gb if r[9]}  # vulgar, offensive, informal, nonstandard...
    forms = defaultdict(dict)  # group_id -> pos -> (word, size)
    for gid, lemma_id, _wid, size, pos, _bp, word, _sp, _vl, _note in gb:
        if gid in bad_groups:
            continue
        cur = forms[gid].get(pos)
        if cur is None or size < cur[1]:
            forms[gid][pos] = (word, size, lemma_word.get(lemma_id, word))
    variants = defaultdict(set)  # (group_id, pos) -> other accepted spellings
    for gid, _l, _w, size, pos, _bp, word, _sp, _vl, _note in us:
        if size <= 70:
            variants[(gid, pos)].add(word)
    return forms, variants, known


def load_ukfreq(pre: Path) -> set:
    """Lemmas SCOWL's source data tags [ukfreq] at size 35 (Brian Kelk's UK frequency classes 16-2,
    public domain): the only commonness signal finer than "in the size-35 list" that SCOWL keeps."""
    common = set()
    for line in pre.read_text(encoding="utf-8").splitlines():
        if ": " not in line:
            continue
        info, rest = line.split(": ", 1)
        first = re.match(r"35((?: \[[^\]]*\])*)", info)
        if not first or "[ukfreq]" not in first.group(1):
            continue
        lemma = rest.split(" <")[0].split(":")[0].strip()
        common.add(lemma)
    return common


# ------------------------------------------------------------------ CMUdict

def load_cmudict(path: Path):
    pron = defaultdict(list)
    for line in (path / "cmudict.dict").read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.split("#")[0].strip()
        if not line:
            continue
        head, *phones = line.split()
        word = re.sub(r"\(\d+\)$", "", head)
        pron[word].append(" ".join(phones))
    return pron


def syllables(p: str) -> int:
    return sum(1 for ph in p.split() if ph[-1].isdigit())


def final_stressed(p: str) -> bool:
    stresses = [ph[-1] for ph in p.split() if ph[-1].isdigit()]
    return bool(stresses) and stresses[-1] == "1"


def british_safe(p: str) -> bool:
    """Drop pronunciations whose homophony depends on American vowel mergers (cot/caught, marry/merry)."""
    ph = p.split()
    if any(x.startswith(("AA", "AO")) for x in ph):
        return False
    for i in range(len(ph) - 2):
        if ph[i].startswith(("EH", "AE", "AH", "ER")) and ph[i + 1] == "R" and ph[i + 2][-1].isdigit():
            return False
    return True


# ------------------------------------------------------------------ Open English WordNet

def load_oewn(path: Path):
    yd = path / "src" / "yaml"
    loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
    synsets = {}
    for f in sorted(yd.glob("*.yaml")):
        if f.name.startswith(("entries-", "frames")):
            continue
        synsets.update(yaml.load(f.read_text(encoding="utf-8"), Loader=loader) or {})
    senses = defaultdict(list)  # lemma -> [(pos, synset)] in the entry's own order
    related = defaultdict(set)  # lemma -> lemmas it is related to by sense relations
    for f in sorted(yd.glob("entries-*.yaml")):
        data = yaml.load(f.read_text(encoding="utf-8"), Loader=loader) or {}
        for lemma, by_pos in data.items():
            lemma = str(lemma)
            for pos, entry in (by_pos or {}).items():
                for s in entry.get("sense", []) or []:
                    senses[lemma].append((pos, s["synset"]))
                    for rel, targets in s.items():
                        if rel in ("id", "synset", "subcat", "adjposition", "sent", "exemplifies"):
                            continue
                        if isinstance(targets, list):
                            for t in targets:
                                other = str(t).split("%")[0].replace("_", " ")
                                related[lemma].add(other)
                                related[other].add(lemma)
    return synsets, senses, related


def gloss_for(word, synsets, senses, block, pos=None):
    """The first sense's definition, if short, plain and suitable; else None."""
    for p, sid in senses.get(word, []):
        if pos and p not in pos:
            continue
        d = synsets.get(sid, {}).get("definition", [""])[0]
        t = tokens(d)
        if 2 <= len(t) <= 14 and not (set(t) & block) and word not in t:
            return {"gloss": d, "synset": sid}
        return None
    return None


def example_for(word, synsets, senses, block):
    """An example sentence from any sense that uses exactly this word form, if short and suitable."""
    for _p, sid in senses.get(word, []):
        for ex in synsets.get(sid, {}).get("example", []) or []:
            ex = ex if isinstance(ex, str) else ex.get("text", "")
            t = tokens(ex)
            names = [x for x in re.findall(r"[A-Za-z']+", ex)[1:] if x[0].isupper() and x != "I"]
            if names:
                continue  # names of people, places or organisations
            if 4 <= len(t) <= 16 and word in t and not (set(t) & block) and '"' not in ex and t.count(word) == 1:
                return {"sentence": ex, "synset": sid}
    return None


# ------------------------------------------------------------------ patterns (by rule, no hand-made word list)

SUFFIX_OF = {"vg": "ing", "vd": "ed", "ns": "s", "ms": "s", "vs": "s", "aj1": "er", "aj2": "est"}
BASE_POS = ("v0", "m0", "n0", "aj0")


def classify_inflection(base, infl, suffix, pron):
    """(step, misspellings {text: misconception}) for base + suffix -> infl, or None if irregular."""
    syl = syllables(pron) if pron else None
    vowel_suffix = suffix[0] in "aeiy"
    if suffix == "s" and infl == base + "es" and re.search(r"(s|x|z|ch|sh)$", base):
        return "es_plural", {base + "s": None}
    if infl == base + suffix:
        if base.endswith("e") and suffix in ("ed", "er", "est"):
            return None  # bake + d: no rule to learn
        if suffix in ("ed", "ing") and syl and syl >= 2 and re.search(r"[^aeiou][aeiou][^aeiouwxy]$", base) and not final_stressed(pron):
            return "no_double_unstressed", {base + base[-1] + suffix: "over_doubling"}
        if suffix in ("s", "ing", "ed"):
            return "plain", {}
        return None
    if vowel_suffix and infl == base + base[-1] + suffix:
        if base.endswith("l") and syl and syl >= 2:
            return "exceptions", {base + suffix: "no_doubling"}  # British travelled, cancelled
        if syl == 1:
            return "double_short", {base + suffix: "no_doubling"}
        if syl and syl >= 2 and final_stressed(pron):
            return "stress_doubling", {base + suffix: "no_doubling"}
        return None
    if base.endswith("e") and not base.endswith(("ee", "ye", "oe")) and suffix == "ing" and infl == base[:-1] + suffix:
        return "drop_e", {base + suffix: "kept_silent_e"}
    if re.search(r"[^aeiou]y$", base) and suffix in ("ed", "er", "est", "s") and infl == base[:-1] + "i" + ("es" if suffix == "s" else suffix):
        return "y_to_i", {base + suffix: "y_not_changed"}
    if base.endswith("ie") and suffix == "ing" and infl == base[:-2] + "ying":
        return "exceptions", {base[:-1] + "ing": None, base + "ing": None}
    if base.endswith("c") and vowel_suffix and infl == base + "k" + suffix:
        return "exceptions", {base + suffix: None}
    return None


PREFIXES = ["un", "dis", "mis", "im", "in", "ir", "il", "re", "pre", "over"]
SUFFIXES = ["ful", "less", "ly", "ment", "ness"]


def classify_prefix(word, known_base):
    for p in PREFIXES:
        if word.startswith(p) and len(word) - len(p) >= 3:
            base = word[len(p):]
            if base in known_base:
                if base[0] == p[-1]:
                    return p, base, "double_at_join", {p + base[1:]: "dropped_double_at_join"}
                return p, base, "plain_affix", {}
    return None


def classify_suffix(word, known_base):
    for s in SUFFIXES:
        if not word.endswith(s):
            continue
        stem = word[: -len(s)]
        cands = []
        if stem in known_base:
            cands.append((stem, "plain"))
        if stem.endswith("i") and stem[:-1] + "y" in known_base:
            cands.append((stem[:-1] + "y", "y_to_i"))
        if s == "ly" and stem + "le" in known_base and word == stem + "ly":
            cands.append((stem + "le", "le"))
        for base, how in cands:
            wrong = {}
            if how == "y_to_i":
                step = "ful_ly_ment"
                wrong[base + s] = "full_suffix" if s == "ful" else None
            elif how == "le":
                step = "ful_ly_ment"
                wrong[base + "ly"] = None
            elif base[-1] == s[0]:
                step = "double_at_join"  # real+ly, careful+ly, sudden+ness
                wrong[base + s[1:]] = "dropped_double_at_join"
            elif s in ("ful", "ly", "ment"):
                step = "ful_ly_ment"
                if s == "ful":
                    wrong[base + "full"] = "full_suffix"
                if base.endswith("e") and s in ("ful", "ment"):
                    wrong[base[:-1] + s] = None
            else:
                step = "plain_affix"
            return s, base, step, wrong
    return None


def ending_swap(word, known_base, syllables_of):
    """able/ible and tion/sion/ssion: the same word with the other ending (a likely misspelling)."""
    if word.endswith("able") and (word[:-4] in known_base or word[:-4] + "e" in known_base or (word[:-5] + "y" in known_base and word[-5] == "i")):
        return "able_ible", {word[:-4] + "ible": "suffix_by_sound"}
    if word.endswith("ible") and syllables_of(word) >= 3:
        return "able_ible", {word[:-4] + "able": "suffix_by_sound"}
    if word.endswith("ssion"):
        return "tion_sion", {word[:-5] + "tion": "suffix_by_sound", word[:-5] + "sion": "suffix_by_sound"}
    if word.endswith("sion"):
        return "tion_sion", {word[:-4] + "tion": "suffix_by_sound", word[:-4] + "ssion": "suffix_by_sound"}
    if word.endswith("tion"):
        return "tion_sion", {word[:-4] + "sion": "suffix_by_sound", word[:-4] + "ssion": "suffix_by_sound"}
    return None


# ------------------------------------------------------------------ build

def build(scowl: Path, cmudict: Path, oewn: Path) -> dict:
    block = load_blocklist()
    excluded = load_blocklist("exclusions.txt")
    forms, variants, known = load_scowl(scowl / "scowl.db")
    pron = load_cmudict(cmudict)
    synsets, senses, related = load_oewn(oewn)
    uk = load_ukfreq(scowl / "data" / "scowl-pre.txt")

    def ok_word(w):
        return re.fullmatch(r"[a-z]{3,14}", w) is not None and w not in block and w not in excluded

    entries = []

    # Inflections: lemma + ending -> inflected form, both in the common lists.
    for gid, by_pos in forms.items():
        base_entry = next((by_pos[p] for p in BASE_POS if p in by_pos), None)
        if not base_entry:
            continue
        base = base_entry[2]
        if not ok_word(base) or base_entry[1] > 35 or base not in pron:
            continue
        for pos, suffix in SUFFIX_OF.items():
            if pos not in by_pos:
                continue
            infl, size, _ = by_pos[pos]
            if not ok_word(infl) or size > 35 or infl == base:
                continue
            got = classify_inflection(base, infl, suffix, pron[base][0])
            if not got:
                continue
            step, wrong = got
            wrong = {w: m for w, m in wrong.items() if w != infl and w not in known}
            entries.append({
                "word": infl, "cap": "EN.FND.SPL.inflections", "step": step, "size": size,
                "base": base, "join": "-" + suffix, "form": pos,
                "syllables": syllables(pron[infl][0]) if infl in pron else syllables(pron[base][0]),
                "variants": sorted(v for v in variants.get((gid, pos), set()) if v != infl and ok_word(v)),
                "misspellings": wrong,
                "sources": {"word": "scowl", "form": "scowl", "syllables": "cmudict"},
            })

    common = {}  # word -> (size, group_id, pos)
    for gid, by_pos in forms.items():
        for pos, (w, size, _l) in by_pos.items():
            if ok_word(w) and size <= 35 and (w not in common or size < common[w][0]):
                common[w] = (size, gid, pos)
    lemmas_common = {w for w, (s, g, p) in common.items() if p in BASE_POS or p in ("av0", "a0")}

    # Morphological: prefix + base and base + suffix, confirmed by a WordNet relation or the meaning.
    for w, (size, gid, pos) in sorted(common.items()):
        if pos not in BASE_POS + ("av0", "a0"):
            continue
        got = classify_prefix(w, lemmas_common)
        kind = "prefix"
        if not got:
            got = classify_suffix(w, lemmas_common)
            kind = "suffix"
        if not got:
            continue
        affix, base, step, wrong = got
        gl = gloss_for(w, synsets, senses, block)
        confirmed = base in related.get(w, set()) or (gl and base in tokens(gl["gloss"]))
        if not confirmed:
            continue
        wrong = {x: m for x, m in wrong.items() if x != w and x not in known}
        entries.append({
            "word": w, "cap": "EN.FND.SPL.morphological", "step": step, "size": size,
            "base": base, "join": (affix + "-") if kind == "prefix" else ("-" + affix),
            "syllables": syllables(pron[w][0]) if w in pron else None,
            "variants": sorted(v for v in variants.get((gid, pos), set()) if v != w and ok_word(v)),
            "misspellings": wrong, "gloss": gl,
            "sources": {"word": "scowl", "join": "oewn" if base in related.get(w, set()) else "oewn-gloss", "gloss": "oewn"},
        })

    # -able/-ible and -tion/-sion/-ssion: the other ending is a likely misspelling.
    for w, (size, gid, pos) in sorted(common.items()):
        if pos not in BASE_POS:
            continue
        got = ending_swap(w, lemmas_common, lambda x: syllables(pron[x][0]) if x in pron else 0)
        if not got:
            continue
        step, wrong = got
        wrong = {x: m for x, m in wrong.items() if x not in known}
        gl = gloss_for(w, synsets, senses, block)
        if not wrong or not gl:
            continue
        entries.append({
            "word": w, "cap": "EN.FND.SPL.morphological", "step": step, "size": size,
            "syllables": syllables(pron[w][0]) if w in pron else None,
            "variants": sorted(v for v in variants.get((gid, pos), set()) if v != w and ok_word(v)),
            "misspellings": wrong, "gloss": gl, "sources": {"word": "scowl", "gloss": "oewn"},
        })

    # Homophones: words with the same (British-safe) pronunciation, each common, each with a meaning.
    by_pron = defaultdict(set)
    for w in common:
        if w in pron and common[w][0] <= 35:
            for p in pron[w]:
                if british_safe(p):
                    by_pron[p].add(w)
    groups = []
    seen_groups = set()
    for p, ws in sorted(by_pron.items()):
        ws = sorted(w for w in ws if all(british_safe(q) for q in pron[w][:1]))
        if len(ws) < 2 or len(ws) > 3:
            continue
        key = tuple(ws)
        if key in seen_groups:
            continue
        # different words, not spellings of one word (colour/color never share a British list anyway)
        if len({common[w][1] for w in ws}) < len(ws):
            continue
        glosses = {w: gloss_for(w, synsets, senses, block) for w in ws}
        if not all(glosses.values()):
            continue
        examples = {w: example_for(w, synsets, senses, block) for w in ws}
        if not any(examples.values()):
            continue
        if not all(w in uk for w in ws):
            continue  # every word in the group must be common, so the item tests spelling, not vocabulary
        seen_groups.add(key)
        step = "common_pairs" if all(syllables(pron[w][0]) == 1 for w in ws) else "less_common"
        groups.append(ws)
        for w in ws:
            if not examples[w]:
                continue
            entries.append({
                "word": w, "cap": "EN.FND.SPL.homophones", "step": step, "size": 35,
                "homophones": [x for x in ws if x != w], "pronunciation": p,
                "syllables": syllables(p), "variants": [], "misspellings": {x: "familiar_spelling" for x in ws if x != w},
                "gloss": glosses[w], "example": examples[w],
                "sources": {"word": "scowl", "homophones": "cmudict", "gloss": "oewn", "example": "oewn"},
            })

    # Any other common word pronounced the same (any CMUdict pronunciation): such a word is never
    # dictated, because hearing it cannot tell the learner which spelling is meant (missed / mist).
    by_any = defaultdict(set)
    for w in common:
        for p in pron.get(w, []):
            by_any[p].add(w)
    for e in entries:
        same = set()
        for p in pron.get(e["word"], []):
            same |= by_any[p]
        e["sounds_like"] = sorted(same - {e["word"]} - set(e.get("variants", [])))

    # Commonness: 0 = the word itself is in SCOWL's UK frequency classes, 1 = only its base is, 2 = neither.
    def tier(e):
        if e["word"] in uk:
            return 0
        if e.get("base") in uk:
            return 1
        return 2

    for e in entries:
        e["common"] = ["ukfreq", "base-ukfreq", "size-35"][tier(e)]
        del e["size"]
    # Keep the commonest words per step, shorter words first; within that, a fixed pseudo-random order (FNV-1a of the
    # word) so the bank is not biased towards the start of the alphabet. Deterministic.
    out, per = [], defaultdict(int)
    seen = set()
    for e in sorted(entries, key=lambda e: (e["cap"], e["step"], tier(e), 0 if len(e["word"]) <= 7 else 1 if len(e["word"]) <= 9 else 2, fnv1a(e["word"]), e["word"])):
        k = (e["cap"], e["step"])
        if tier(e) > 1 or per[k] >= PER_STEP or (e["cap"], e["word"]) in seen:
            continue
        per[k] += 1
        seen.add((e["cap"], e["word"]))
        e["misspellings"] = dict(sorted(e["misspellings"].items()))
        out.append(e)

    return {
        "id": "openpath-spelling-wordbank",
        "version": 1,
        "status": "candidate: generated by rule from licensed lexical data; not reviewed by educators. Difficulty is a feature-based estimate, not calibrated.",
        "built_by": "tools/english/spelling/build_wordbank.py",
        "sources": [dict(s, commit=PINS[s["id"]]) for s in SOURCES],
        "ladder": LADDER,
        "counts": {f"{c}#{s}": n for (c, s), n in sorted(per.items())},
        "entries": out,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scowl", type=Path, required=True)
    ap.add_argument("--cmudict", type=Path, required=True)
    ap.add_argument("--oewn", type=Path, required=True)
    ap.add_argument("--check", action="store_true", help="rebuild and compare with the committed bank")
    a = ap.parse_args()
    for name, path in (("scowl", a.scowl), ("cmudict", a.cmudict), ("oewn", a.oewn)):
        head = git_head(path)
        if head != PINS[name]:
            sys.exit(f"{name} checkout is at {head}, but the bank is pinned to {PINS[name]}")
    if not (a.scowl / "scowl.db").exists():
        sys.exit("scowl.db not found: run `make` in the SCOWL checkout first")
    bank = build(a.scowl, a.cmudict, a.oewn)
    text = json.dumps(bank, ensure_ascii=False, indent=1) + "\n"
    target = OUT / "wordbank.json"
    if a.check:
        if target.read_text() != text:
            sys.exit("wordbank.json differs from a fresh build")
        print("wordbank.json matches a fresh build")
        return
    target.write_text(text)
    print(f"wrote {target.relative_to(REPO)}: {len(bank['entries'])} entries")
    for k, n in bank["counts"].items():
        print(f"  {k}: {n}")


if __name__ == "__main__":
    main()
