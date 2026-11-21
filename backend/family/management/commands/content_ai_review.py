"""An AI "reader" for the English questions: it answers every multiple-choice question from the passage alone, and
each question where it picks another option, or says a second option could also be right, is printed for review.

Runs once on the server while OPENPATH_CONTENT_AI_REVIEW=1 (deploy/pilot/start.sh runs it in the background after
start; the setting is turned off after). Uses the writing-feedback model and key. Only the app's own content is
sent: no learner's data. Prints the flagged questions and the tokens used.
"""

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from django.core.management.base import BaseCommand

from evaluation import llm
from family import writing_feedback as wf

ROOT = Path(__file__).resolve().parents[4] / "content" / "english"
SYSTEM = (
    "You are checking questions in a children's reading app. Answer the question using only the text given. "
    "Then say whether any other option could also reasonably be judged right by a careful teacher. "
    "Reply with JSON only: {\"answer\": \"A\", \"also\": [], \"note\": \"at most 15 words\"}. "
    "\"also\" lists other option letters that could also be right; leave it empty when only one is right."
)


def _load(rel):
    return json.loads((ROOT / rel).read_text("utf-8"))


def questions():
    out = []
    for n in range(1, 7):
        for p in _load(f"reading/level-{n}.json")["passages"]:
            for i, q in enumerate(p["questions"]):
                out.append(("reading", f"{p['id']}#{i}", p["text"], q["prompt"], q["right"], q["wrong"]))
    for lv in _load("reading/inference.json"):
        for p in lv["passages"]:
            for i, q in enumerate(p["questions"]):
                out.append(("inference", f"{p['id']}#{i}", p["text"], q["prompt"], q["right"], q["wrong"]))
    for t in _load("reading/long-reads.json")["texts"]:
        whole = "\n\n".join(p["text"] for p in t["parts"])
        for k, p in enumerate(t["parts"]):
            for i, q in enumerate(p["questions"]):
                out.append(("long", f"{t['id']}|{k}|{i}", p["text"], q["prompt"], q["right"], q["wrong"]))
        for i, q in enumerate(t["whole"]):
            out.append(("long", f"{t['id']}|whole|{i}", f"Title: {t['title']}\n\n{whole}", q["prompt"], q["right"], q["wrong"]))
    for t in _load("reading/kinds.json")["texts"]:
        for i, q in enumerate(t["questions"]):
            out.append(("kinds", f"{t['id']}|{i}", f"Title: {t['title']}\n\n{t['text']}", q["prompt"], q["right"], q["wrong"]))
    for p in _load("listening/passages.json")["passages"]:
        for q in p.get("questions", []):
            out.append(("listen", q["id"], p["text"], q["prompt"], q["right"], q["wrong"]))
    for it in _load("grammar/in-use.json")["items"]:
        if it["kind"] == "choose":
            out.append(("grammar", it["id"], it.get("sentence") or "", it["question"], it["right"][0], it["wrong"]))
    return out


def options(qid, right, wrong):
    opts = sorted([right, *wrong], key=lambda o: hashlib.sha1(f"{qid}|{o}".encode()).hexdigest())
    return opts, "ABCDEF"[opts.index(right)]


class Command(BaseCommand):
    help = "Answer every English multiple-choice question with the AI and print the ones it disagrees with."

    def handle(self, *args, **opts):
        from dataclasses import replace
        config = replace(wf._config(), max_output_tokens=120, timeout_s=40.0, retries=1)
        problems = config.problems()
        if problems:
            self.stdout.write(f"content-ai-review: not run ({'; '.join(problems)})")
            return
        qs = questions()
        self.stdout.write(f"content-ai-review: model={config.model} questions={len(qs)}", ending="\n")
        self.stdout.flush()

        def one(q):
            kind, qid, text, prompt, right, wrong = q
            opts, key = options(qid, right, wrong)
            user = json.dumps({"text": text, "question": prompt, "options": {"ABCDEF"[i]: o for i, o in enumerate(opts)}}, ensure_ascii=False)
            try:
                done = llm.complete(config, SYSTEM, user)
                data = llm.extract_json(done.text)
                ans = str(data.get("answer", "")).strip().upper()[:1]
                also = [str(a).strip().upper()[:1] for a in (data.get("also") or []) if str(a).strip().upper()[:1] != ans]
                return kind, qid, prompt, opts, key, ans, also, str(data.get("note", ""))[:120], done.input_tokens, done.output_tokens, None
            except Exception as e:  # noqa: BLE001 - reported, never fatal
                return kind, qid, prompt, opts, key, "", [], "", 0, 0, type(e).__name__

        flagged, errors, tin, tout = 0, 0, 0, 0
        by = {}
        with ThreadPoolExecutor(max_workers=6) as pool:
            for kind, qid, prompt, opts, key, ans, also, note, i, o, err in pool.map(one, qs):
                tin, tout = tin + i, tout + o
                s = by.setdefault(kind, [0, 0])
                s[0] += 1
                if err:
                    errors += 1
                    continue
                if ans != key or also:
                    flagged += 1
                    s[1] += 1
                    pick = lambda l: opts["ABCDEF".index(l)] if l and l in "ABCDEF"[: len(opts)] else l  # noqa: E731
                    why = "picked another" if ans != key else "another also right"
                    self.stdout.write(f"CAR | {kind} | {qid} | {why} | Q: {prompt} | key: {pick(key)} | ai: {pick(ans)} | also: {'; '.join(pick(a) for a in also)} | {note}")
                    self.stdout.flush()
        self.stdout.write("content-ai-review: " + ", ".join(f"{k} {v[1]} of {v[0]}" for k, v in by.items()) + f"; flagged {flagged} of {len(qs)}; errors {errors}; tokens in {tin} out {tout}")
