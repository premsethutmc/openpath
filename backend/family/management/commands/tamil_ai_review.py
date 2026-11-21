"""tamil-ai-review@1: an AI reader checks the Tamil course once (ICSE and Tamil Nadu boards), the way content_ai_review
checks English: it answers every question itself and says if another option could also be right, and it reads every
teaching card, passage and writing task for wrong Tamil or a wrong grammar statement. Flagged items are printed
("TAR | ...") for the developer to fix in tools/tamil/; nothing changes by itself.

Runs once on the server while OPENPATH_TAMIL_AI_REVIEW=1 (deploy/pilot/start.sh, in the background after start; the
setting is turned off after). Uses the writing-feedback model and key. Only the app's own content is sent; no learner data.
Questions shared by both boards are sent once.
"""

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from django.core.management.base import BaseCommand

from evaluation import llm
from family import writing_feedback as wf

ROOT = Path(__file__).resolve().parents[4] / "content" / "tamil"
ASK = (
    "You are a careful teacher of Tamil checking a children's Tamil course (school Classes 1-10). "
    "You get a question, its options and sometimes a passage. Answer it yourself. Then say whether any other option could also "
    "reasonably be judged right by a Tamil teacher, and list any mistake in the Tamil of the question or options "
    "(spelling, sandhi, grammar, a wrong grammatical term). "
    "The topic's own teaching note is given as 'rule': judge by standard Tamil school grammar. "
    'Reply with JSON only: {"answer": "A", "also": [], "tamil": "", "sure": true, "note": "at most 20 words, in English"}. '
    '"also": other option letters that could also be right; "tamil": the mistakes, or "" if none; '
    '"sure": false unless you are certain your answer, "also" and "tamil" are right by standard Tamil grammar.'
)
READ = (
    "You are a careful teacher of Tamil checking a children's Tamil course (school Classes 1-10). Read the text. "
    "List any wrong Tamil (spelling, sandhi, grammar) and any statement about Tamil grammar, literature or facts that is wrong. "
    'Reply with JSON only: {"ok": true, "problems": "", "fix": ""}. When something is wrong: ok false, problems in English '
    "(at most 40 words) and the corrected Tamil in fix. Flag only what you are certain is wrong by standard Tamil; style is not a mistake."
)


def _load(name):
    return json.loads((ROOT / name).read_text("utf-8"))


def items():
    qs, texts, seen = [], [], set()
    for name in ("icse.v1.json", "tn.v1.json"):
        for t in _load(name)["topics"]:
            teach = f"Topic: {t['title']} (Class {t['class']})\n{t['teach']['ta']}\nExamples: {t['teach']['examples']}"
            if teach not in seen:
                seen.add(teach)
                texts.append((t["id"] + "#teach", teach))
            if t.get("passage") and t["passage"] not in seen:
                seen.add(t["passage"])
                texts.append((t["id"] + "#passage", t["passage"]))
            for q in t["questions"]:
                if q.get("say"):
                    continue  # listening: the spoken word is one of the options by construction
                key = (t.get("passage") or "") + q["prompt"] + "|".join(sorted(q["options"])) + q["answer"]
                if key in seen:
                    continue
                seen.add(key)
                qs.append((q["id"], t.get("passage") or "", q["prompt"], q["options"], q["answer"], t["teach"]["ta"]))
    for w in _load("writing.v1.json")["tasks"]:
        text = f"{w['title']}\n{w['task']}\nLooks for: " + "; ".join(w["look"])
        if text not in seen:
            seen.add(text)
            texts.append((w["id"], text))
    return qs, texts


def lettered(qid, options, answer):
    opts = sorted(options, key=lambda o: hashlib.sha1(f"{qid}|{o}".encode()).hexdigest())
    return opts, "ABCDEF"[opts.index(answer)]


class Command(BaseCommand):
    help = "Check every Tamil question, teaching card, passage and writing task once with the AI; print the flagged ones."

    def handle(self, *args, **opts):
        from dataclasses import replace
        from django.conf import settings
        config = replace(wf._config(), max_output_tokens=200, timeout_s=45.0, retries=1)
        # a small model's Tamil grammar is unreliable (the first run with gpt-4.1-mini flagged half, mostly wrongly): a stronger one can be named
        if settings.OPENPATH_TAMIL_AI_REVIEW_MODEL:
            config = replace(config, model=settings.OPENPATH_TAMIL_AI_REVIEW_MODEL)
        problems = config.problems()
        if problems:
            self.stdout.write(f"tamil-ai-review: not run ({'; '.join(problems)})")
            return
        qs, texts = items()
        self.stdout.write(f"tamil-ai-review: model={config.model} questions={len(qs)} texts={len(texts)}")
        self.stdout.flush()

        def ask(q):
            qid, passage, prompt, options, answer, rule = q
            opts, key = lettered(qid, options, answer)
            user = json.dumps({"rule": rule, "passage": passage, "question": prompt, "options": {"ABCDEF"[i]: o for i, o in enumerate(opts)}}, ensure_ascii=False)
            try:
                done = llm.complete(config, ASK, user)
                d = llm.extract_json(done.text)
                ans = str(d.get("answer", "")).strip().upper()[:1]
                also = [str(a).strip().upper()[:1] for a in (d.get("also") or []) if str(a).strip().upper()[:1] not in ("", ans)]
                pick = lambda l: opts["ABCDEF".index(l)] if l and l in "ABCDEF"[: len(opts)] else l  # noqa: E731
                if d.get("sure") is not True:
                    ans, also, tamil = key, [], ""  # an unsure reader is not a finding
                else:
                    tamil = str(d.get("tamil", ""))[:200]
                return ("q", qid, prompt, pick(key), pick(ans), [pick(a) for a in also], tamil, str(d.get("note", ""))[:160], done.input_tokens, done.output_tokens, None)
            except Exception as e:  # noqa: BLE001 - reported, never fatal
                return ("q", qid, prompt, "", "", [], "", "", 0, 0, type(e).__name__)

        def read(t):
            tid, text = t
            try:
                done = llm.complete(config, READ, text)
                d = llm.extract_json(done.text)
                return ("t", tid, bool(d.get("ok", True)), str(d.get("problems", ""))[:300], str(d.get("fix", ""))[:400], done.input_tokens, done.output_tokens, None)
            except Exception as e:  # noqa: BLE001
                return ("t", tid, True, "", "", 0, 0, type(e).__name__)

        flagged, errors, tin, tout = 0, 0, 0, 0
        with ThreadPoolExecutor(max_workers=6) as pool:
            for r in pool.map(ask, qs):
                _, qid, prompt, key, ans, also, tamil, note, i, o, err = r
                tin, tout = tin + i, tout + o
                if err:
                    errors += 1
                    continue
                if ans != key or also or tamil.strip():
                    flagged += 1
                    why = "picked another" if ans != key else ("another also right" if also else "tamil")
                    self.stdout.write(f"TAR | q | {qid} | {why} | Q: {prompt} | key: {key} | ai: {ans} | also: {'; '.join(also)} | tamil: {tamil} | {note}")
                    self.stdout.flush()
            for r in pool.map(read, texts):
                _, tid, ok, probs, fix, i, o, err = r
                tin, tout = tin + i, tout + o
                if err:
                    errors += 1
                    continue
                if not ok:
                    flagged += 1
                    self.stdout.write(f"TAR | text | {tid} | {probs} | fix: {fix}")
                    self.stdout.flush()
        self.stdout.write(f"tamil-ai-review: flagged {flagged} of {len(qs) + len(texts)}; errors {errors}; tokens in {tin} out {tout}")
