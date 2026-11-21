"""tamil-help@2: a one-off Tamil translation of the grammar explanations children meet first (levels 1-4: each
sentence's one-line rule, and the learn cards' rule and "why"), for the Tamil help lines.

Runs once on the server while OPENPATH_TRANSLATE_HELP=1 (deploy/pilot/start.sh, in the background; turned off after).
Uses the writing-feedback model and key. Only the app's own content is sent. Prints one line per batch:
"TAH <json list of [english, tamil]>", collected into content/english/help/tamil-ui.json by hand and spot-checked.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from evaluation import llm
from family import writing_feedback as wf

ROOT = Path(__file__).resolve().parents[4] / "content" / "english"
SYSTEM = (
    "Translate each English line into simple, natural Tamil for a child aged 7 to 11 in Tamil Nadu. Keep every "
    "English example word, phrase or sentence (anything after a colon, in quotes, or naming an English word or "
    "letter, such as 'was built', 'an', '-ing') exactly in English, inside the Tamil sentence. Use Tamil script, "
    "everyday words, no Sanskrit-heavy terms. Reply with JSON only: a list of Tamil strings, one per input, same order."
)


def strings():
    g = json.loads((ROOT / "grammar/in-use.json").read_text("utf-8"))
    cards = json.loads((ROOT / "grammar/learn.json").read_text("utf-8"))["cards"]
    done = json.loads((ROOT / "help/tamil-ui.json").read_text("utf-8"))["strings"]
    done = {**done, **json.loads((ROOT / "help/tamil-explain.json").read_text("utf-8"))["strings"]}
    level = {}
    for i in g["items"]:
        level[i["topic"]] = min(level.get(i["topic"], 9), i["level"])
    out = ["Write this sentence again, with its mistakes put right.", "Another way to see it"]
    # grammar-simple@1: the plainer way of every card, at every level
    out += [c["simple"]["say"] for c in cards if c.get("simple")]
    for i in g["items"]:
        if i["level"] <= 4:
            out.append(i["rule"])
    for c in cards:
        if level.get(c["topic"], 9) <= 4:
            out += [c["rule"], c["mistake"]["why"]]
    seen, uniq = set(done), []
    for s in out:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


class Command(BaseCommand):
    help = "Translate the first grammar explanations into Tamil and print them in batches."

    def handle(self, *args, **opts):
        from dataclasses import replace
        config = replace(wf._config(), max_output_tokens=3000, timeout_s=90.0, retries=1)
        if config.problems():
            self.stdout.write(f"translate-help: not run ({'; '.join(config.problems())})")
            return
        todo = strings()
        self.stdout.write(f"translate-help: model={config.model} lines={len(todo)}")
        tin = tout = bad = 0
        for k in range(0, len(todo), 15):
            batch = todo[k : k + 15]
            try:
                done = llm.complete(config, SYSTEM, json.dumps(batch, ensure_ascii=False))
                t = done.text
                out = json.loads(t[t.index('[') : t.rindex(']') + 1])
                tin, tout = tin + done.input_tokens, tout + done.output_tokens
                if not isinstance(out, list) or len(out) != len(batch):
                    raise ValueError("wrong length")
                self.stdout.write("TAH " + json.dumps([[e, str(t)] for e, t in zip(batch, out)], ensure_ascii=False))
                self.stdout.flush()
            except Exception as e:  # noqa: BLE001 - reported, never fatal
                bad += 1
                self.stdout.write(f"translate-help: batch {k} failed ({type(e).__name__})")
        self.stdout.write(f"translate-help: done; failed batches {bad}; tokens in {tin} out {tout}")
