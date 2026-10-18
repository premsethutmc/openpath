/**
 * Read and answer: the rule-based evaluator against its deterministic fixture (content/english/reading/fixture.json),
 * understanding kept apart from writing, abstention, and the revision history in the learner's record.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { loadContent } from "./content.ts";
import { Learner } from "./learner.ts";
import { MemoryRepo } from "./store.ts";
import { testClock } from "./journey-sim.ts";
import { READING_EVALUATORS, READING_TASKS, editDistance, rulesEvaluator } from "./reading.ts";
import { eventProblem } from "./events.ts";

const content = loadContent();
const fixture = JSON.parse(readFileSync(new URL("../../../../content/english/reading/fixture.json", import.meta.url), "utf8")) as {
  cases: { id: string; task: string; kind: string; text: string; level: string; writing: boolean }[];
  known_limits: { cases: { id: string; task: string; text: string; current_level: string; truth: string }[] };
};
const evaluate = (taskId: string, text: string) => {
  const t = READING_TASKS.find((x) => x.id === taskId)!;
  return rulesEvaluator.evaluate(t, content.ctx.content.passages.get(t.passage)!, text);
};

test("every task names a known passage and capability, with a required key point and a model answer the evaluator credits", () => {
  for (const t of READING_TASKS) {
    assert.ok(content.ctx.content.passages.get(t.passage), t.passage);
    assert.ok(content.index.leaves.has(t.capability), t.capability);
    assert.ok(t.key_points.some((k) => k.required));
    const e = evaluate(t.id, t.model_answer);
    assert.equal(e.comprehension.level, "understood", `${t.id}: the model answer`);
    assert.equal(e.mechanics.spelling.length + e.mechanics.grammar.length + e.mechanics.punctuation.length, 0, `${t.id}: the model answer has no writing flags`);
  }
});

test("the fixture: correct with poor grammar, fluent but wrong, off topic, partial and ambiguous are kept apart", () => {
  const kinds = new Set(fixture.cases.map((c) => c.kind));
  for (const k of ["correct_poor_grammar", "fluent_incorrect", "off_topic", "partial", "ambiguous"]) assert.ok(kinds.has(k), k);
  for (const c of fixture.cases) {
    const e = evaluate(c.task, c.text);
    assert.equal(e.comprehension.level, c.level, `${c.id}: "${c.text}"`);
    const flags = e.mechanics.spelling.length + e.mechanics.grammar.length + e.mechanics.punctuation.length;
    assert.equal(flags > 0, c.writing, `${c.id}: writing flags ${JSON.stringify(e.mechanics)}`);
  }
});

test("key words without a sentence, and negations anywhere, make it abstain instead of crediting understanding", () => {
  for (const [task, text] of [["rd.kite.motive", "sad cheer kite"], ["rd.bees.main", "scouts dance"], ["rd.bees.main", "The scouts never dance and nobody agrees."], ["rd.bees.main", "The scouts fight, there is no dancing."]]) {
    const e = evaluate(task, text);
    assert.equal(e.comprehension.level, "cant_tell", text);
    assert.ok(e.comprehension.abstained && e.comprehension.why, text);
  }
});

test("known limits: wrong answers that still match key words are labelled as a keyword match, never as verified understanding", () => {
  assert.ok(fixture.known_limits.cases.length >= 5);
  for (const k of fixture.known_limits.cases) {
    const e = evaluate(k.task, k.text);
    assert.equal(e.comprehension.level, k.current_level, `${k.id}: behaviour changed; update the fixture deliberately`);
    assert.equal(e.comprehension.basis, "keyword_match");
    const obs = e.evidence.find((x) => x.capability === READING_TASKS.find((t) => t.id === k.task)!.capability)!.observation;
    assert.match(obs, /keyword match, not verified understanding/, k.id);
    assert.doesNotMatch(e.feedback.understanding, /understood/i, `${k.id}: the child is not told they understood`);
  }
});

test("understanding is independent of writing: the same answer with and without slips gets the same understanding", () => {
  const clean = evaluate("rd.bees.main", "The scout bees choose by doing a waggle dance.");
  const messy = evaluate("rd.bees.main", "the scout bees chose by doin a wagle danse");
  assert.equal(clean.comprehension.level, messy.comprehension.level);
  assert.ok(messy.mechanics.spelling.length > 0 && clean.mechanics.spelling.length === 0);
  // a fluent wrong answer gets no understanding credit and no writing flags
  const fluent = evaluate("rd.city.cause", "Cities are hotter because they are closer to the sun.");
  assert.equal(fluent.comprehension.level, "not_yet");
  assert.equal(fluent.mechanics.spelling.length + fluent.mechanics.grammar.length + fluent.mechanics.punctuation.length, 0);
});

test("abstains rather than guessing, and every observation is provisional", () => {
  for (const text of ["He did not get a bucket.", "Because it is like that.", "ok"]) {
    const e = evaluate("rd.storm.detail", text);
    assert.ok(e.comprehension.abstained, `${text}: ${e.comprehension.level}`);
    assert.ok(e.evidence.find((x) => x.capability === "EN.RDG.LIT.locate_detail")!.observation.startsWith("not judged"));
  }
  const e = evaluate("rd.storm.detail", "He put buckets under the leaks.");
  assert.ok(e.evidence.every((x) => x.provisional === true));
  assert.deepEqual(e.evidence.map((x) => x.capability).sort(), ["EN.RDG.LIT.locate_detail", "EN.WRT.ACC.grammar", "EN.WRT.ACC.punctuation", "EN.WRT.ACC.spelling", "EN.WRT.TSK.task_response"]);
});

test("grammar checks are high-precision: definite errors only", () => {
  const g = (t: string) => evaluate("rd.city.cause", t).mechanics.grammar.map((f) => f.rule);
  assert.deepEqual(g("They was hot because the roads absorb heat."), ["plural_was"]);
  assert.deepEqual(g("It could of been the dark roofs."), ["could_of"]);
  assert.deepEqual(g("The the roads are dark."), ["repeated_word"]);
  assert.deepEqual(g("The roads were dark, and they absorb heat."), []);
  assert.deepEqual(g("I think the dark roads absorb the heat."), []);
  assert.equal(editDistance("bukets", "buckets"), 1);
  assert.equal(editDistance("recieve", "receive"), 1);
});

test("the evaluator is replaceable and free: only the on-device rules provider is registered", () => {
  assert.deepEqual(Object.keys(READING_EVALUATORS), ["rules@1"]);
});

test("revision history: the original and each improved answer are separate events in the record, and survive a reload", async () => {
  const repo = new MemoryRepo();
  const l = await Learner.create(content, repo, "R", "guardian", testClock(), "p-R");
  const first = l.nextReading()!;
  const a = await l.answerReading(first.task.id, "becuse meena was sad", false);
  const b = await l.answerReading(first.task.id, "Meena was sad because her kite flew away, so Arjun wanted to cheer her up.", true);
  assert.equal(a.revision, 0);
  assert.equal(b.revision, 1);
  assert.equal(a.text, "becuse meena was sad", "kept exactly as written");
  assert.equal(a.evaluation.comprehension.level, "partly");
  assert.equal(b.evaluation.comprehension.level, "understood");
  assert.match(b.evaluation.evidence.find((x) => x.capability === "EN.WRT.PRC.revising")!.observation, /more understanding/);
  for (const e of [a, b]) assert.equal(eventProblem(e), null);
  const reopened = await Learner.open(content, repo, l.profileId, l.clock);
  assert.deepEqual(reopened.readingAnswers(first.task.id).map((x) => x.text), [a.text, b.text]);
  assert.notEqual(reopened.nextReading()!.task.id, first.task.id, "the next passage is a new one");
  // the written answers never enter the engine's ledger or change an estimate
  const fresh = await Learner.create(content, new MemoryRepo(), "S", "guardian", testClock(), "p-S");
  assert.equal(JSON.stringify(reopened.state.ledger.composite.nodes), JSON.stringify(fresh.state.ledger.composite.nodes));
});

test("a pilot build refuses written answers (the pilot records nothing a child writes in their own words)", async () => {
  const pilot = loadContent({ mode: "pilot", approved: [] });
  const l = await Learner.create(pilot, new MemoryRepo(), "P", "guardian", testClock(), "p-P");
  await assert.rejects(() => l.answerReading(READING_TASKS[0].id, "anything", false), /pilot/i);
  await assert.rejects(() => l.startSpellingJourney(), /pilot/i);
});
