"""Five made-up typed reading answers marked by the AI, to measure accuracy and cost before deciding on AI marking.

Runs once on the server while OPENPATH_READING_AI_TRIAL=1 (deploy/pilot/start.sh; the setting is turned off after).
Uses the writing-feedback model and key from the server environment. Made-up answers only: no learner's writing is
sent. Prints, for each answer, what the fixed rules said, what the AI said, and the tokens used.
"""

import json
import time
from pathlib import Path

from django.core.management.base import BaseCommand

from evaluation import llm
from family import writing_feedback as wf

CONTENT = Path(__file__).resolve().parents[4] / "content" / "english" / "reading"

SYSTEM = (
    "You mark a child's short answer to a reading question. You are given the passage, the question, a model answer "
    "and the child's answer. Decide whether the child's answer means the same as the model answer and is supported "
    "by the passage. Ignore spelling and grammar. An answer that names a wrong fact, gives two choices, or denies the "
    "right fact is not right. Reply with JSON only: {\"right\": true or false, \"why\": \"one short sentence\"}."
)

# (item id, made-up answer, what a careful teacher would say)
CASES = [
    ("wa.L1.P1.1", "The wheel had no air in it.", True),
    ("wa.L1.P1.1", "The tyre was fine but the driver was flat out tired.", False),
    ("wa.L1.T.1", "It had turned red by Friday.", True),
    ("wa.N2.P1.1", "There was hardly any wind that day.", True),
    ("wa.N6.T.2", "They thought keeping the lights on late would cost too much power.", True),
]


class Command(BaseCommand):
    help = "Mark five made-up reading answers with the AI and print verdicts and tokens."

    def handle(self, *args, **opts):
        config = wf._config()
        problems = config.problems()
        if problems:
            self.stdout.write(f"reading-ai trial: not run ({'; '.join(problems)})")
            return
        items = {i["id"]: i for i in json.loads((CONTENT / "written-answers.json").read_text("utf-8"))["items"]}
        passages = {}
        for n in range(1, 7):
            for p in json.loads((CONTENT / f"level-{n}.json").read_text("utf-8"))["passages"]:
                passages[p["id"]] = p["text"]
        self.stdout.write(f"reading-ai trial: provider={config.provider} model={config.model} answers={len(CASES)}")
        total_in = total_out = agree = 0
        for item_id, answer, truth in CASES:
            it = items[item_id]
            user = json.dumps({"passage": passages[it["passage"]], "question": it["question"], "model_answer": it["model"], "child_answer": answer})
            started = time.monotonic()
            try:
                done = llm.complete(config, SYSTEM, user)
            except llm.LLMError as e:
                self.stdout.write(f"  {item_id}: provider error ({str(e)[:160]})")
                continue
            ms = int((time.monotonic() - started) * 1000)
            total_in += done.input_tokens
            total_out += done.output_tokens
            try:
                verdict = bool(llm.extract_json(done.text).get("right"))
                why = str(llm.extract_json(done.text).get("why", ""))[:160]
            except Exception:
                verdict, why = None, "reply not usable"
            agree += verdict == truth
            self.stdout.write(f"  {item_id} | {answer} | teacher={truth} ai={verdict} | tokens {done.input_tokens}/{done.output_tokens} | {ms} ms | {why}")
        self.stdout.write(f"reading-ai trial: AI agreed with the teacher on {agree} of {len(CASES)}; tokens in {total_in} out {total_out}")
