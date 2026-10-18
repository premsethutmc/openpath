#!/usr/bin/env python3
"""
Build the spelling-journey bank: thousands of words for the adaptive spelling journey, from the same three
openly licensed sources as the word bank (build_wordbank.py), with the same pinned commits and filters.

    python3 tools/english/spelling/build_journey_bank.py \
        --scowl /path/to/en-wl/wordlist --cmudict /path/to/cmusphinx/cmudict --oewn /path/to/globalwordnet/english-wordnet
    ... --check     rebuild and fail unless the committed files match

Nothing is downloaded. Output (deterministic, no timestamps):

  content/english/spelling/journey-bank.json   one record per word and rule (compact)
  content/english/spelling/JOURNEY_COVERAGE.md the coverage report by competency, rule, role and confidence

What it adds to the word bank (whose words and identifiers it reuses; it changes neither wordbank.json nor
generated-items.json):

  1. Every inflected form of a common lemma that follows one of the eight inflection rules, not only the 60
     commonest per rule: SCOWL lists up to size 50 (the word bank stops at 35), still filtered by the blocklist,
     the exclusions, SCOWL's usage notes (vulgar, offensive, informal...) and length.
  2. Contrast words for the rules where a similar-looking word must NOT change (jump -> jumping is a contrast for
     doubling; agree -> agreeing for dropping the e; play -> played for changing y to i; visit -> visited for
     stress doubling; begin -> beginning for "do not double when the stress is earlier"), each with the
     over-applied misspelling it guards against.
  3. A transparent difficulty estimate (the rule's ladder band, word length, syllables, commonness) and an
     automatic confidence level with its reasons (high / medium / low). No word needs a person's approval;
     only high-confidence words are ever used as independent evidence, and even then a demonstration on them
     is "provisional", never verified mastery (the app's content-validation gate).
  4. A role for every word, fixed by rule (so it never depends on who is learning): teach (lesson examples,
     never assessed), practice (guided practice, never evidence), assess (unfamiliar words held back for
     independent checks), retention (held back for the delayed check after a week), contrast (held back for
     the "must not change" check). Assessment and retention words never appear in lessons or practice.
  5. Whether the word can be dictated: not if another common word sounds the same (missed / mist), or if CMUdict
     has no pronunciation.
"""
import argparse
import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("build_wordbank", HERE / "build_wordbank.py")
wb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wb)

REPO = wb.REPO
OUT = wb.OUT
CAP = "EN.FND.SPL.inflections"
VERSION = 2  # 2: scarce rules keep every high-confidence word for checks; contrast words for the final-l rule
MAX_SIZE = 50  # SCOWL list size: 35 = common (the word bank), 50 = less common but still general vocabulary
TEACH_PER_RULE = 6
# share of the remaining high-confidence apply words held back for each use (by a fixed hash of the word)
SPLIT = (("assess", 0.50), ("retention", 0.20), ("practice", 0.30))
# a rule with fewer high-confidence words than this keeps them all for checks (assess / retention by this share)
SCARCE = 120
SCARCE_ASSESS_NUM, SCARCE_ASSESS_DEN = 7, 10  # 70% for checks, 30% for delayed checks
RULES = ("plain", "es_plural", "double_short", "drop_e", "y_to_i", "stress_doubling", "no_double_unstressed", "exceptions")
# the misconception an over-applied rule shows on a contrast word (where the rule must NOT change the word)
CONTRAST_TAG = {
    "double_short": "over_doubling",
    "stress_doubling": "over_doubling",
    "no_double_unstressed": "no_doubling",
    "drop_e": "dropped_needed_e",
    "y_to_i": "changed_y_wrongly",
    "es_plural": "es_after_other_ending",
    "exceptions": "over_doubling",
}
# misconceptions the journey adds beside the engine's (subject-english-inflections.ts); child-facing text for every tag
# is in content/english/web/spelling-journey.json
KEEP = {"apply": 500, "contrast": 250}  # per rule
CONF_RANK = {"high": 0, "medium": 1, "low": 2}
SUFFIX = {"vg": "ing", "vd": "ed", "ns": "s", "vs": "s", "aj1": "er", "aj2": "est"}


def fraction(word: str) -> float:
    return (wb.fnv1a("role|" + word) % 10_000) / 10_000


def contrast_of(base, infl, suffix, syl):
    """Every (rule, over-applied misspelling) for which base + suffix -> infl is a word where a similar-looking word
    changes but this one must not. Only regular, unchanged joins (infl == base + suffix) are contrasts."""
    out = []
    if infl != base + suffix:
        return out
    if suffix in ("ing", "ed", "er", "est") and syl == 1 and re.search(r"[^aeiouwxy]$", base) and not re.search(r"(^|[^aeiou])[aeiou][^aeiouwxy]$", base):
        # one syllable, NOT a single short vowel + single consonant (jump, rain, look, help): must not double
        out.append(("double_short", base + base[-1] + suffix))
    if suffix in ("ing", "ed", "er") and re.search(r"[aeiou][aeiou]l$", base):
        # the British final-l rule doubles after ONE vowel (travel -> travelled); after two it does not (reveal -> revealed)
        out.append(("exceptions", base + "l" + suffix))
    if suffix == "ing" and base.endswith(("ee", "ye", "oe")):
        out.append(("drop_e", base[:-1] + suffix))  # agree -> agreeing, never agreing
    if suffix in ("ed", "s", "er", "est") and re.search(r"[aeiou]y$", base):
        out.append(("y_to_i", base[:-1] + "i" + ("es" if suffix == "s" else suffix)))  # play -> played, never plaied
    if suffix == "ing" and re.search(r"[^aeiou]y$", base):
        out.append(("y_to_i", base[:-1] + "i" + suffix))  # cry -> crying: the y stays before -ing
    if suffix == "s" and re.search(r"[^aeiouy]$", base) and not re.search(r"(s|x|z|ch|sh)$", base):
        out.append(("es_plural", base + "es"))  # book -> books, never bookes
    return out


def build(scowl: Path, cmudict: Path, oewn: Path):
    block = wb.load_blocklist()
    excluded = wb.load_blocklist("exclusions.txt") | wb.load_blocklist("journey-exclusions.txt")
    forms, variants, known = wb.load_scowl(scowl / "scowl.db")
    pron = wb.load_cmudict(cmudict)
    uk = wb.load_ukfreq(scowl / "data" / "scowl-pre.txt")
    bank = json.loads((OUT / "wordbank.json").read_text())
    generated = json.loads((OUT / "generated-items.json").read_text())
    bank_items = defaultdict(list)
    for it in generated:
        bank_items[it["generated"]["word"]].append(it["id"])
    in_bank = {(e["cap"], e["step"], e["word"]) for e in bank["entries"]}
    ladder = wb.LADDER[CAP]

    def ok_word(w):
        return re.fullmatch(r"[a-z]{3,14}", w) is not None and w not in block and w not in excluded

    # every common word's pronunciations, to know which words cannot be dictated
    common_words = set()
    for gid, by_pos in forms.items():
        for pos, (w, size, _l) in by_pos.items():
            if size <= MAX_SIZE and ok_word(w):
                common_words.add(w)
    by_pron = defaultdict(set)
    for w in common_words:
        for p in pron.get(w, []):
            by_pron[p].add(w)

    rows, rejected = {}, Counter()
    for gid, by_pos in sorted(forms.items()):
        base_entry = next((by_pos[p] for p in wb.BASE_POS if p in by_pos), None)
        if not base_entry:
            continue
        base, bsize = base_entry[2], base_entry[1]
        if not ok_word(base):
            rejected["base unsuitable (names, abbreviations, hyphenated or capitalised words, blocklist, exclusions, length)"] += 1
            continue
        if bsize > MAX_SIZE:
            continue
        if base not in pron:
            rejected["base has no CMUdict pronunciation"] += 1
            continue
        for pos, suffix in SUFFIX.items():
            if pos not in by_pos:
                continue
            infl, size, _ = by_pos[pos]
            if infl == base or size > MAX_SIZE:
                continue
            if not ok_word(infl):
                rejected["form unsuitable (blocklist, exclusions, length or non-letters)"] += 1
                continue
            p0 = pron[base][0]
            syl = wb.syllables(p0)
            uses = []  # (rule, kind, {misspelling: misconception})
            got = wb.classify_inflection(base, infl, suffix, p0)
            if got:
                rule, wrong = got
                generic = {"es_plural": "s_not_es", "exceptions": "missing_k" if base.endswith("c") else "ie_not_changed"}
                # a rule-made misspelling that happens to be another word (hoping for hopping) is still that mistake when the
                # word was dictated, so it stays tagged; the journey only uses misspellings to explain a typed answer
                uses.append((rule, "apply", {w: m or generic.get(rule, "") for w, m in wrong.items() if w != infl}))
                # the stress rules are each other's contrasts: visit -> visited guards "do not double"; begin -> beginning the reverse
                if rule == "no_double_unstressed":
                    uses.append(("stress_doubling", "contrast", {w: "over_doubling" for w in wrong}))
                if rule == "stress_doubling":
                    uses.append(("no_double_unstressed", "contrast", {base + suffix: "no_doubling"}))
            for con in contrast_of(base, infl, suffix, syl):
                uses.append((con[0], "contrast", {con[1]: CONTRAST_TAG[con[0]]}))
            if any(u[0] == "exceptions" for u in uses) and pos in ("aj1", "aj2"):
                rejected["comparative of a -ful adjective (carefuller): avoided in teaching"] += 1
                continue
            if not uses:
                rejected["irregular or no rule (e.g. ran, went)"] += 1
                continue
            reasons, conf = [], "high"
            prons = pron[base]
            if size > 35 or bsize > 35:
                conf = "medium"
                reasons.append("less common word (SCOWL list 50)")
            tier = 0 if infl in uk else 1 if base in uk else 2
            if tier == 2 and conf == "high":
                conf = "medium"
                reasons.append("no UK frequency tag on the word or its base")
            if any(u[0] in ("stress_doubling", "no_double_unstressed", "double_short", "exceptions") for u in uses) and len({(wb.syllables(p), wb.final_stressed(p)) for p in prons}) > 1:
                conf = "low"
                reasons.append("CMUdict gives more than one syllable count or stress for the base (e.g. a noun/verb pair)")
            vs = sorted(v for v in variants.get((gid, pos), set()) if v != infl and ok_word(v))
            if vs:
                if conf == "high":
                    conf = "medium"
                reasons.append(f"American spelling also accepted ({', '.join(vs)})")
            same = set()
            for p in pron.get(infl, []):
                same |= by_pron[p]
            sounds_like = sorted(same - {infl} - set(vs))
            dictate = infl in pron and not sounds_like
            band = min(ladder[u[0]] for u in uses)
            length = max(-0.3, min(0.5, (len(infl) - 7) * 0.1))
            syll = wb.syllables(pron[infl][0]) if infl in pron else syl + (1 if suffix in ("ing", "ed", "er", "est") else 0)
            diff = max(1.0, min(8.0, round((band + length + 0.25 * (tier > 0) + 0.25 * (size > 35)) * 4) / 4))
            for r, k, w in uses:
                key = (r, k, infl)
                if key in rows:
                    continue
                c, why = conf, list(reasons)
                if k == "apply" and not w and r != "plain" and c == "high":
                    c, why = "medium", why + ["no rule-made misspelling that is not itself a word (feedback is less specific)"]
                if not dictate and c == "high" and any(x in known for x in w):
                    c, why = "medium", why + ["cannot be dictated, and a likely misspelling is itself a word"]
                rows[key] = {
                    "w": infl, "rule": r, "kind": k, "base": base, "join": "-" + suffix, "form": pos,
                    "conf": c, **({"why": why} if why else {}),
                    "diff": diff + (0.25 if k == "contrast" else 0), "feat": {"band": ladder[r], "len": len(infl), "syl": syll, "common": ["ukfreq", "base-ukfreq", "list"][tier], "size": max(size, bsize)},
                    "wrong": dict(sorted(w.items())), **({"variants": vs} if vs else {}),
                    "dictate": dictate, **({"sounds_like": sounds_like[:3]} if sounds_like else {}),
                    **({"bank": sorted(bank_items[infl])} if k == "apply" and (CAP, r, infl) in in_bank and bank_items.get(infl) else {}),
                }

    # keep the most useful words per rule and kind: high confidence first, then the commonest (a bank for children,
    # not a dictionary); the report says how many more were available
    grouped = defaultdict(list)
    for e in rows.values():
        grouped[(e["rule"], e["kind"])].append(e)
    available, out = {}, []
    for (rule, kind), es in grouped.items():
        available[f"{rule}|{kind}"] = len(es)
        es.sort(key=lambda e: (CONF_RANK[e["conf"]], e["feat"]["size"], e["feat"]["common"] != "ukfreq", e["feat"]["len"] > 10, not e["dictate"], wb.fnv1a(e["w"]), e["w"]))
        out += es[: KEEP[kind]]
    out.sort(key=lambda e: (RULES.index(e["rule"]), e["kind"], e["w"]))
    # roles (fixed by rule; never by learner): lesson examples first, then a hashed split of the rest
    by_rule = defaultdict(list)
    for e in out:
        by_rule[(e["rule"], e["kind"])].append(e)
    for (rule, kind), es in by_rule.items():
        if kind == "contrast":
            for e in es:
                e["role"] = "contrast" if e["conf"] == "high" else "practice"
            continue
        order = lambda e: (e["feat"]["size"], e["feat"]["common"] != "ukfreq", len(e["w"]), wb.fnv1a(e["w"]), e["w"])
        high = sorted((e for e in es if e["conf"] == "high"), key=order)
        if len(high) < SCARCE:
            # few high-confidence words: every one is held back for independent checks (the lessons use their own
            # hand-written examples, no bank words); medium and low confidence words are practice only. The split is
            # by count in a fixed hashed order, so the first checks get the larger share
            ranked = sorted(high, key=lambda e: (wb.fnv1a("role|" + e["w"]), e["w"]))
            n_assess = -(-len(ranked) * SCARCE_ASSESS_NUM // SCARCE_ASSESS_DEN)
            for i, e in enumerate(ranked):
                e["role"] = "assess" if i < n_assess else "retention"
        else:
            for e in high[:TEACH_PER_RULE]:
                e["role"] = "teach"
            for e in high[TEACH_PER_RULE:]:
                f, acc = fraction(e["w"]), 0.0
                for role, share in SPLIT:
                    acc += share
                    if f < acc:
                        e["role"] = role
                        break
        for e in es:
            e.setdefault("role", "practice")  # medium and low confidence: practice only, never evidence
    counts = Counter((e["rule"], e["kind"], e["role"], e["conf"]) for e in out)
    return {
        "id": "openpath-spelling-journey-bank",
        "version": VERSION,
        "status": "candidate: generated and validated by rule from licensed lexical data, without a person's approval of each word. Only high-confidence words are used as independent evidence, and a result on them is provisional, never verified mastery. Difficulty is a feature-based estimate, not calibrated.",
        "built_by": "tools/english/spelling/build_journey_bank.py",
        "capability": CAP,
        "sources": [dict(s, commit=wb.PINS[s["id"]]) for s in wb.SOURCES],
        "filters": {"scowl_max_size": MAX_SIZE, "blocklist": "content/english/spelling/blocklist.txt", "exclusions": ["content/english/spelling/exclusions.txt", "content/english/spelling/journey-exclusions.txt"],
                    "scowl_usage_notes": "groups marked vulgar, offensive, informal or nonstandard are excluded", "letters": "a-z only, 3-14 letters"},
        "policy": {"teach_per_rule": TEACH_PER_RULE, "split": dict(SPLIT), "scarce": {"below_high_confidence": SCARCE, "assess_share": f"{SCARCE_ASSESS_NUM}/{SCARCE_ASSESS_DEN}", "lessons": "hand-written lesson examples only", "practice": "medium and low confidence words"}, "evidence": "high-confidence assess, retention and contrast words only",
                   "confidence": {"high": "SCOWL list 35, UK frequency tag on the word or its base, unambiguous pronunciation, a rule-made misspelling exists",
                                  "medium": "less common (list 50), no frequency tag, an accepted American variant, or no specific misspelling",
                                  "low": "CMUdict pronunciations disagree on syllables or stress (e.g. record, present)"}},
        "rejected": dict(sorted(rejected.items())),
        "available_before_cap": dict(sorted(available.items())),
        "counts": {f"{r}|{k}|{role}|{c}": n for (r, k, role, c), n in sorted(counts.items())},
        "entries": out,
    }


def coverage_md(jb, bank) -> str:
    ent = jb["entries"]
    L = ["# Spelling content coverage", "",
         "*Generated by `tools/english/spelling/build_journey_bank.py`; do not edit by hand. Candidate content, validated by rule, not by a person.*", "",
         "## Inflections (the adaptive spelling journey): words by rule and role", "",
         "Evidence = independent checks (assess + retention + contrast, high confidence only). Teach = lesson examples. Practice = guided practice, never evidence.", "",
         "| Rule | Apply words (kept / found) | Contrast words (kept / found) | Teach | Practice | Assess | Retention | Contrast (evidence) | High | Medium | Low | Can be dictated | Already in the word bank |",
         "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    tot = Counter()
    for r in RULES:
        es = [e for e in ent if e["rule"] == r]
        c = Counter(e["role"] for e in es)
        av = jb["available_before_cap"]
        row = {"apply": f'{sum(1 for e in es if e["kind"] == "apply")} / {av.get(r + "|apply", 0)}', "contrast_all": f'{sum(1 for e in es if e["kind"] == "contrast")} / {av.get(r + "|contrast", 0)}',
               "teach": c["teach"], "practice": c["practice"], "assess": c["assess"], "retention": c["retention"], "contrast": c["contrast"],
               "high": sum(1 for e in es if e["conf"] == "high"), "medium": sum(1 for e in es if e["conf"] == "medium"), "low": sum(1 for e in es if e["conf"] == "low"),
               "dictate": sum(1 for e in es if e["dictate"]), "bank": sum(1 for e in es if e.get("bank"))}
        tot.update({k: v for k, v in row.items() if isinstance(v, int)})
        tot["apply"] += sum(1 for e in es if e["kind"] == "apply")
        tot["contrast_all"] += sum(1 for e in es if e["kind"] == "contrast")
        L.append(f"| {r} | " + " | ".join(str(row[k]) for k in ("apply", "contrast_all", "teach", "practice", "assess", "retention", "contrast", "high", "medium", "low", "dictate", "bank")) + " |")
    L.append("| **all** | " + " | ".join(str(tot[k]) for k in ("apply", "contrast_all", "teach", "practice", "assess", "retention", "contrast", "high", "medium", "low", "dictate", "bank")) + " |")
    by_cap = Counter(e["cap"] for e in bank["entries"])
    by_step = Counter((e["cap"], e["step"]) for e in bank["entries"])
    L += ["", "## All spelling competencies", "",
          "| Competency | Word bank (practice items, `wordbank.json`) | Journey bank (`journey-bank.json`) | Independent evidence words |", "|---|---:|---:|---:|",
          f"| EN.FND.SPL.inflections | {by_cap['EN.FND.SPL.inflections']} | {len(ent)} | {tot['assess'] + tot['retention'] + tot['contrast']} |",
          f"| EN.FND.SPL.morphological | {by_cap['EN.FND.SPL.morphological']} | — (not yet a journey) | 0 |",
          f"| EN.FND.SPL.homophones | {by_cap['EN.FND.SPL.homophones']} | — (not yet a journey) | 0 |", "",
          "Morphological and homophone words stay in the word bank as practice items (steps: " +
          ", ".join(f"{s} {n}" for (c, s), n in sorted(by_step.items()) if c != CAP) + "). They are not yet part of the adaptive journey: the engine's rule definitions cover inflections only.", "",
          "## Rejected while building", "", "| Reason | Count |", "|---|---:|"]
    for k, n in jb["rejected"].items():
        L.append(f"| {k} | {n} |")
    L += ["", "## Sources", ""]
    for s in jb["sources"]:
        L.append(f"- {s['name']} ({s['url']}), commit `{s['commit'][:8]}`: {s['licence']}. Notice: `{s['notice']}`.")
    return "\n".join(L) + "\n"


RUNTIME_FIELDS = ["w", "rule", "kind", "role", "base", "join", "diff", "dictate", "wrong", "variants"]


def runtime(jb) -> str:
    """The compact copy the web app bundles: what the journey needs at run time, nothing for auditing."""
    rows = [[e["w"], e["rule"], e["kind"], e["role"], e["base"], e["join"], e["diff"], 1 if e["dictate"] else 0, e["wrong"], e.get("variants", [])] for e in jb["entries"]]
    head = {"id": jb["id"] + ".runtime", "version": jb["version"], "full": "content/english/spelling/journey-bank.json",
            "sources": [{"id": s["id"], "commit": s["commit"], "notice": s["notice"]} for s in jb["sources"]], "fields": RUNTIME_FIELDS}
    return json.dumps({**head, "rows": rows}, ensure_ascii=False, separators=(",", ":")).replace('["', '\n["') + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scowl", type=Path, required=True)
    ap.add_argument("--cmudict", type=Path, required=True)
    ap.add_argument("--oewn", type=Path, required=True)
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    for name, path in (("scowl", a.scowl), ("cmudict", a.cmudict), ("oewn", a.oewn)):
        head = wb.git_head(path)
        if head != wb.PINS[name]:
            sys.exit(f"{name} checkout is at {head}, but the bank is pinned to {wb.PINS[name]}")
    jb = build(a.scowl, a.cmudict, a.oewn)
    text = json.dumps(jb, ensure_ascii=False, separators=(",", ":")).replace('{"w"', '\n{"w"') + "\n"
    md = coverage_md(jb, json.loads((OUT / "wordbank.json").read_text()))
    rt = runtime(jb)
    if a.check:
        bad = [f for f, t in (("journey-bank.json", text), ("JOURNEY_COVERAGE.md", md), ("journey-words.json", rt)) if not (OUT / f).exists() or (OUT / f).read_text() != t]
        if bad:
            sys.exit(f"{', '.join(bad)} differ from a fresh build")
        print("journey-bank.json, journey-words.json and JOURNEY_COVERAGE.md match a fresh build")
        return
    (OUT / "journey-bank.json").write_text(text)
    (OUT / "JOURNEY_COVERAGE.md").write_text(md)
    (OUT / "journey-words.json").write_text(rt)
    print(f"wrote journey-bank.json: {len(jb['entries'])} entries")


if __name__ == "__main__":
    main()
