"""Unit tests for the spelling-journey bank's classifiers (no sources needed).

    python3 -m unittest tools/english/spelling/test_build_journey_bank.py -v
"""
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("build_journey_bank", HERE / "build_journey_bank.py")
jb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(jb)
wb = jb.wb

# CMUdict pronunciations, enough for the cases below
P = {"hop": "HH AA1 P", "jump": "JH AH1 M P", "rain": "R EY1 N", "begin": "B IH0 G IH1 N", "visit": "V IH1 Z AH0 T",
     "agree": "AH0 G R IY1", "make": "M EY1 K", "play": "P L EY1", "cry": "K R AY1", "box": "B AA1 K S", "book": "B UH1 K",
     "travel": "T R AE1 V AH0 L", "panic": "P AE1 N IH0 K", "tie": "T AY1", "happy": "HH AE1 P IY0"}


def classify(base, infl, suffix):
    return wb.classify_inflection(base, infl, suffix, P[base])


def contrast(base, infl, suffix):
    return jb.contrast_of(base, infl, suffix, wb.syllables(P[base]))


class Patterns(unittest.TestCase):
    def test_apply_rules(self):
        self.assertEqual(classify("hop", "hopping", "ing")[0], "double_short")
        self.assertEqual(classify("begin", "beginning", "ing")[0], "stress_doubling")
        self.assertEqual(classify("visit", "visited", "ed")[0], "no_double_unstressed")
        self.assertEqual(classify("make", "making", "ing")[0], "drop_e")
        self.assertEqual(classify("cry", "cried", "ed")[0], "y_to_i")
        self.assertEqual(classify("happy", "happier", "er")[0], "y_to_i")
        self.assertEqual(classify("box", "boxes", "s")[0], "es_plural")
        self.assertEqual(classify("travel", "travelled", "ed")[0], "exceptions")
        self.assertEqual(classify("panic", "panicked", "ed")[0], "exceptions")
        self.assertEqual(classify("tie", "tying", "ing")[0], "exceptions")
        self.assertEqual(classify("jump", "jumping", "ing")[0], "plain")

    def test_misspellings_name_the_mistake(self):
        self.assertEqual(classify("hop", "hopping", "ing")[1], {"hoping": "no_doubling"})
        self.assertEqual(classify("visit", "visited", "ed")[1], {"visitted": "over_doubling"})
        self.assertEqual(classify("make", "making", "ing")[1], {"makeing": "kept_silent_e"})

    def test_contrasts_are_words_that_must_not_change(self):
        self.assertEqual(contrast("jump", "jumping", "ing"), ("double_short", "jumpping"))
        self.assertEqual(contrast("rain", "rained", "ed"), ("double_short", "rainned"))  # two vowel letters: no doubling
        self.assertEqual(contrast("agree", "agreeing", "ing"), ("drop_e", "agreing"))
        self.assertEqual(contrast("play", "played", "ed"), ("y_to_i", "plaied"))
        self.assertEqual(contrast("cry", "crying", "ing"), ("y_to_i", "criing"))
        self.assertEqual(contrast("book", "books", "s"), ("es_plural", "bookes"))

    def test_not_contrasts(self):
        self.assertIsNone(contrast("hop", "hopping", "ing"))  # changes: an apply word, not a contrast
        self.assertIsNone(contrast("hop", "hoped", "ed"))  # not base + suffix
        self.assertIsNone(contrast("box", "boxes", "s"))
        self.assertIsNone(contrast("make", "makes", "s"))  # ends in a vowel: no -es contrast


class CommittedBank(unittest.TestCase):
    """The committed bank (no rebuild): filters, roles and licensing hold."""

    @classmethod
    def setUpClass(cls):
        cls.bank = json.loads((wb.OUT / "journey-bank.json").read_text())
        cls.block = wb.load_blocklist() | wb.load_blocklist("exclusions.txt") | wb.load_blocklist("journey-exclusions.txt")

    def test_sources_and_licences(self):
        self.assertEqual({s["id"] for s in self.bank["sources"]}, {"scowl", "cmudict", "oewn"})
        for s in self.bank["sources"]:
            self.assertEqual(s["commit"], wb.PINS[s["id"]])
            self.assertTrue((wb.REPO / s["notice"]).exists(), s["notice"])

    def test_no_duplicates_or_unsuitable_words(self):
        keys = [(e["rule"], e["kind"], e["w"]) for e in self.bank["entries"]]
        self.assertEqual(len(keys), len(set(keys)))
        for e in self.bank["entries"]:
            self.assertNotIn(e["w"], self.block)
            self.assertNotIn(e["base"], self.block)
            self.assertRegex(e["w"], r"^[a-z]{3,14}$")

    def test_only_high_confidence_words_are_evidence(self):
        for e in self.bank["entries"]:
            if e["role"] in ("assess", "retention", "contrast"):
                self.assertEqual(e["conf"], "high", e["w"])
            if e["conf"] != "high":
                self.assertIn("why", e)

    def test_assessment_words_are_never_taught_or_practised(self):
        for rule in jb.RULES:
            roles = {}
            for e in self.bank["entries"]:
                if e["rule"] == rule:
                    roles.setdefault(e["w"], set()).add(e["role"])
            for w, rs in roles.items():
                if rs & {"assess", "retention"}:
                    self.assertFalse(rs & {"teach", "practice"}, (rule, w))


if __name__ == "__main__":
    unittest.main()
