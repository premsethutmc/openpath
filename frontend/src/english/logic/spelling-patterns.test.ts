/** Mistake patterns: clear cases are named, unclear ones are not, each pattern can be taught, and a miss comes round again. */
import test from "node:test";
import assert from "node:assert/strict";
import { loadContent } from "./content.ts";
import { testClock } from "./journey-sim.ts";
import { Learner } from "./learner.ts";
import { childSummary } from "./parent-view.ts";
import { AGAIN_AFTER } from "./spelling.ts";
import { PATTERNS, diagnose, drillWords, patternCounts, type PatternId } from "./spelling-patterns.ts";
import { MemoryRepo } from "./store.ts";
import { parseWords } from "./wordlists.ts";

const CASES: [string, string, PatternId | null][] = [
  ["hopping", "hoping", "double_missing"], ["admitted", "admited", "double_missing"], ["rabbit", "rabit", "double_missing"], ["accommodate", "acommodate", "double_missing"],
  ["hoping", "hopping", "double_extra"], ["writing", "writting", "double_extra"],
  ["believe", "beleive", "ie_ei"], ["receive", "recieve", "ie_ei"], ["friend", "freind", "ie_ei"],
  ["making", "makeing", "silent_e_kept"], ["coming", "comeing", "silent_e_kept"], ["usable", "useable", "silent_e_kept"],
  ["happiness", "happyness", "y_to_i"], ["tried", "tryed", "y_to_i"], ["babies", "babys", "y_to_i"], ["carried", "carryed", "y_to_i"],
  ["beautiful", "beautifull", "full_suffix"], ["careful", "carefull", "full_suffix"],
  ["knife", "nife", "silent_letter"], ["write", "rite", "silent_letter"], ["lamb", "lam", "silent_letter"], ["listen", "lisen", "silent_letter"], ["castle", "casle", "silent_letter"], ["doubt", "dout", "silent_letter"], ["night", "nigt", "silent_letter"],
  ["station", "stasion", "shun_ending"], ["nation", "nashun", "shun_ending"], ["possible", "possable", "able_ible"],
  ["because", "becuase", "swapped"], ["quiet", "quite", "swapped"],
  // not clear enough to name
  ["cat", "dog", null], ["honest", "honesx", null], ["separate", "seperate", null], ["tree", "tre", null], ["garden", "", null], ["garden", "Garden ", null],
];

test("SP-1 clear mistakes are named and unclear ones are left alone", () => {
  for (const [right, typed, want] of CASES) assert.equal(diagnose(right, typed), want, `${right} written as "${typed}"`);
  assert.equal(diagnose("Believe", " BELEIVE "), "ie_ei", "case and spaces do not matter");
});

test("SP-2 every pattern can be taught: a rule, and practice words that follow it and are not given away", () => {
  for (const p of Object.values(PATTERNS)) {
    assert.ok(p.rule.length > 20 && p.rule.split(". ").length <= 3 && p.name, p.id);
    for (const w of p.drill) {
      assert.ok(!p.examples.join(" ").includes(w), `${p.id}: ${w} is asked, so it must not be shown as an example`);
      assert.ok(!p.rule.includes(w));
    }
    if (p.id !== "swapped") assert.ok(p.drill.length >= 3 && p.examples.length >= 3, p.id);
  }
  assert.deepEqual(drillWords("double_missing", "sitting"), ["dinner", "stopped"], "never the word just missed");
  assert.deepEqual(drillWords("swapped", "because"), []);
  // each practice word really is an instance of its pattern: the typical slip on it is diagnosed as that pattern
  const slip: Partial<Record<PatternId, (w: string) => string>> = {
    double_missing: (w) => w.replace(/([b-df-hj-np-tv-z])\1/, "$1"),
    full_suffix: (w) => w.replace(/ful$/, "full"),
    shun_ending: (w) => w.replace(/tion$/, "sion"),
    able_ible: (w) => (w.endsWith("able") ? w.replace(/able$/, "ible") : w.replace(/ible$/, "able")),
  };
  for (const [id, f] of Object.entries(slip)) for (const w of PATTERNS[id as PatternId].drill) assert.equal(diagnose(w, f!(w)), id, `${w} → ${f!(w)}`);
  assert.deepEqual(patternCounts(["ie_ei", undefined, "double_missing", "ie_ei", "not-a-pattern"]).map((x) => [x.id, x.times]), [["ie_ei", 2], ["double_missing", 1]]);
});

test("SP-3 a miss is recorded with its pattern, comes round again after three other words, and reaches the parent view", async () => {
  const c = loadContent({ mode: "development" });
  const clock = testClock();
  const l = await Learner.create(c, new MemoryRepo(), "Speller", "guardian", clock, "p-patterns");
  const list = await l.saveWordList("Week 13", parseWords("believe, hopping, making, garden, bridge, quiet").words, undefined, "practice");
  await l.startSpelling({ type: "list", id: list }, "device_voice", { again: true });
  const slips: Record<string, string> = { believe: "beleive", hopping: "hoping", making: "makeing" };
  const asked: string[] = [];
  const patterns: (string | null)[] = [];
  for (let s = l.spellingSession(); s?.word; s = l.spellingSession()) {
    const w = s.word.word;
    const first = !asked.includes(w);
    asked.push(w);
    patterns.push((await l.answerSpelling(first && slips[w] ? slips[w] : w, 1)).pattern);
  }
  const missed = asked.slice(0, 6).filter((w) => slips[w]);
  assert.equal(asked.length, 9, "six words and three repeats");
  for (const w of missed) {
    const at = asked.indexOf(w);
    const back = asked.indexOf(w, at + 1);
    assert.ok(back > at, `${w} is asked again`);
    assert.ok(back - at - 1 >= AGAIN_AFTER || back === asked.length - 1 || asked.slice(back).every((x) => missed.includes(x)), `${w}: ${back - at - 1} words in between`);
    assert.equal(asked.filter((x) => x === w).length, 2, "once more only");
  }
  assert.deepEqual(patterns.filter(Boolean).sort(), ["double_missing", "ie_ei", "silent_e_kept"]);
  const view = childSummary(l, clock());
  assert.deepEqual(view.patterns.map((p) => p.times), [1, 1, 1]);
  assert.ok(view.patterns.some((p) => p.name === "ie and ei"));
  // a test asks each word once, whatever happens
  const t = await l.saveWordList("Test", parseWords("believe, garden").words, undefined, "test");
  await l.startSpelling({ type: "list", id: t }, "device_voice", { again: true });
  await l.answerSpelling("zzz", 1);
  assert.equal(l.spellingSession()!.total, 2);
  await l.answerSpelling("zzz", 1);
  assert.equal(l.spellingSession(), null);
});
