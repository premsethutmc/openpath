/** Item 1: every ordinary question is grounded; fiction checks include interpretation, not merely recall. */
import test from "node:test";
import assert from "node:assert/strict";
import { assessSentences, supportingSets } from "./check-evidence.ts";
import { COURSE, LEVELS, SKILL_IDS, questionsFor } from "./course.ts";
import { evidenceKey, sentenceChoices } from "./sentences.ts";

test("all 144 ordinary check questions have uniquely anchored accepted sets in all 36 units", () => {
  let total = 0;
  for (const level of LEVELS) for (const skill of SKILL_IDS) {
    const qs = questionsFor(COURSE, {level, skill}, "check");
    assert.equal(qs.length, 4);
    for (const q of qs) {
      total++;
      const text = COURSE.passages.get(q.passage)!.text;
      const spans = [q.evidence, ...(q.evidenceAlternatives ?? []).flat()];
      for (const span of spans) {
        assert.ok(span.trim(), q.id);
        assert.ok(text.includes(span), `${q.id}: ${span}`);
        assert.equal(text.indexOf(span), text.lastIndexOf(span), `${q.id}: ambiguous span ${span}`);
      }
      const sets = supportingSets(COURSE, q);
      const primary = evidenceKey(COURSE, q);
      assert.ok(sets.some(set => primary.every(i => set.includes(i))), `${q.id}: primary not represented`);
      assert.equal(new Set(sets.map(set => set.join(","))).size, sets.length, `${q.id}: duplicate supporting set`);
      for (const set of sets) {
        assert.ok(set.every(i => sentenceChoices(text)[i]?.length), q.id);
        assert.equal(assessSentences(COURSE, q, [...set].reverse()), "complete", q.id);
      }
    }
  }
  assert.equal(total, 144);
});

test("fiction checks select evidence for character and for a nonliteral view of the plot", () => {
  const character = COURSE.questions.find(q => q.id === "N4.C3.feelings")!;
  assert.match(character.prompt, /view of Joel's character/);
  assert.equal(character.options[character.answer], "honest");
  const [honesty] = supportingSets(COURSE, character);
  assert.equal(assessSentences(COURSE, character, honesty), "complete");

  const plot = COURSE.questions.find(q => q.id === "N4.C3.main_idea")!;
  assert.match(plot.prompt, /view of the plot/);
  assert.equal(plot.options[plot.answer], "Honesty can cost a little and repay a lot.");
  const [support] = supportingSets(COURSE, plot);
  const lines = sentenceChoices(COURSE.passages.get(plot.passage)!.text);
  assert.deepEqual(support.map(i => lines[i]), [
    "Some customers walked away.",
    "Joel found the tourist near the ferry and handed her the change.",
    "The next Saturday, the tourist came back with six friends, and they bought every fish on the table.",
  ]);
  assert.equal(assessSentences(COURSE, plot, evidenceKey(COURSE, plot)), "partial");
  assert.equal(assessSentences(COURSE, plot, support), "complete");

  const credit = COURSE.questions.find(q => q.id === "N4.C4.feelings")!;
  const sets = supportingSets(COURSE, credit);
  assert.equal(sets.length, 2);
  for (const key of sets) assert.equal(assessSentences(COURSE, credit, key), "complete");
});
