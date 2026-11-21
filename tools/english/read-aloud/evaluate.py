"""
Offline check of Read aloud's recognition settings on synthetic recordings (synth.py), with the same model the phone
uses and the same grammar as logic/read-aloud grammarFor (the sentence as a phrase, then each word once).

  pip install vosk espeakng-loader
  python evaluate.py <model-folder> <out.json>     then, in frontend/: node --import tsx scripts/read-aloud-score.mts <out.json>

Twenty sentences from levels 1-5 of content/english/dictation/sentences.json, each read four ways by espeak-ng
voices: correctly, with a word skipped, with a word swapped for another, and with a false start ("mo. mother").
Robotic voices, not children: use it to compare settings, not to claim accuracy on children.
"""
import json, os, random, re, sys, tempfile, wave

from vosk import KaldiRecognizer, Model, SetLogLevel

from synth import say

ROOT = os.path.join(os.path.dirname(__file__), "../../../content/english")
words = lambda t: [w.strip("'") for w in re.sub(r"[^A-Za-z' ]", " ", t.replace("’", "'")).split() if w.strip("'")]


def jobs():
    random.seed(7)
    s = [dict(id=x[0], level=x[1], text=x[2]) for x in json.load(open(f"{ROOT}/dictation/sentences.json"))["sentences"]]
    swap = ["green", "table", "happy", "river", "jumped", "window", "pencil", "orange"]
    voices = [("en-us", 150), ("en", 140), ("en-us+f3", 130), ("en+m3", 165), ("en-us+f4", 120)]
    out = []
    for lv in (1, 2, 3, 4, 5):
        c = [x for x in s if x["level"] == lv]
        random.shuffle(c)
        for i, x in enumerate(c[:4]):
            w, (v, sp) = words(x["text"]), voices[(lv * 4 + i) % len(voices)]
            k = random.randrange(1, len(w)) if len(w) > 2 else len(w) - 1
            k2 = max(range(len(w)), key=lambda j: len(w[j]))
            sw = random.choice([y for y in swap if y != w[k2].lower()])
            base = dict(id=x["id"], text=x["text"], voice=v, speed=sp)
            out += [
                dict(base, kind="correct", say=" ".join(w), expect=["read"] * len(w)),
                dict(base, kind="skip", say=" ".join(w[:k] + w[k + 1:]), expect=["read"] * k + ["flag"] + ["read"] * (len(w) - k - 1)),
                dict(base, kind="swap", say=" ".join(w[:k2] + [sw] + w[k2 + 1:]), expect=["read"] * k2 + ["flag"] + ["read"] * (len(w) - k2 - 1)),
                dict(base, kind="restart", say=" ".join(w[:k2] + [w[k2][:2] + "."] + w[k2:]), expect=["read"] * len(w)),
            ]
    return out


if __name__ == "__main__":
    SetLogLevel(-1)
    model = Model(sys.argv[1])
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for n, j in enumerate(jobs()):
            path = f"{tmp}/{n}.wav"
            say(j["say"], j["voice"], j["speed"], path)
            w = [x.lower() for x in words(j["text"])]
            r = KaldiRecognizer(model, 16000, json.dumps([" ".join(w)] + sorted(set(w))))
            r.SetWords(True)
            heard, f = [], wave.open(path, "rb")
            while d := f.readframes(4000):
                if r.AcceptWaveform(d):
                    heard += json.loads(r.Result()).get("result", [])
            heard += json.loads(r.FinalResult()).get("result", [])
            results.append(dict(j, heard=[dict(word=x["word"], conf=round(x["conf"], 3)) for x in heard]))
    json.dump(results, open(sys.argv[2], "w"), indent=0)
    print(f"wrote {len(results)} results to {sys.argv[2]}")
