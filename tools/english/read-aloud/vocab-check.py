"""
Lists the dictation bank's words that Read aloud's model has no entry for (they are dropped from its grammar, so a
sentence holding one could never be read cleanly), and rewrites content/english/read-aloud/unknown-words.json.

  pip install vosk
  python vocab-check.py <model-folder>
"""
import json, os, re, sys

from vosk import Model, SetLogLevel

ROOT = os.path.join(os.path.dirname(__file__), "../../../content/english")
core = lambda t: re.sub(r"^[^A-Za-z0-9']+|[^A-Za-z0-9']+$", "", t).strip("'").lower()
bank = sorted({core(w) for x in json.load(open(f"{ROOT}/dictation/sentences.json"))["sentences"] for w in x[2].replace("’", "'").split()} - {""})
SetLogLevel(-1)
model = Model(sys.argv[1])
unknown = [w for w in bank if model.vosk_model_find_word(w) < 0]
path = f"{ROOT}/read-aloud/unknown-words.json"
doc = json.load(open(path))
doc["words"] = unknown
json.dump(doc, open(path, "w"), indent=2)
open(path, "a").write("\n")
print(f"{len(bank)} words, {len(unknown)} unknown: {', '.join(unknown)}")
