import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFixturePresenter,
  parseDemo,
  STORAGE_KEY,
  visibleStatus,
  wordCount,
} from "./presenter";
import { SAMPLE_ESSAY, SAMPLE_REWRITE } from "./fixtures";
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}
const signal = () => new AbortController().signal;
async function ready() {
  const store = storage();
  const p = createFixturePresenter(store, 0);
  p.edit("original", SAMPLE_ESSAY);
  await p.run({ type: "analyse" }, signal());
  return { store, p };
}
test("word counting supports empty, pasted whitespace and exactly fifty sample words without scoring", () => {
  assert.equal(wordCount(" \n\t"), 0);
  assert.equal(wordCount("one\ntwo   three"), 3);
  assert.equal(wordCount(SAMPLE_REWRITE), 50);
});
test("analysis uses explicit scripted sample projections and does not evaluate edited essays", async () => {
  const a = await ready();
  const b = createFixturePresenter(storage(), 0);
  b.edit("original", "Completely different fictional writing.");
  const result = await b.run({ type: "analyse" }, signal());
  assert.deepEqual(result.competencies, a.p.load().competencies);
  assert.equal(result.mode, "fixture");
  assert.ok(result.competencies.every((c) => c.status !== "verified"));
});
test("different diagnostic answers produce the same prewritten scene, not correctness decisions", async () => {
  const run = async (answer: string) => {
    const { p } = await ready();
    p.navigate("diagnostic", "grammar");
    return p.run({ type: "diagnostic", answer }, signal());
  };
  assert.deepEqual(
    (await run("The garden gives us shade.")).competencies,
    (await run("A different invented response")).competencies,
  );
});
test("complete storyboard opens rewrite but never verifies all competencies or updates a real learner", async () => {
  const { p } = await ready();
  assert.equal(p.load().finalChallenge.available, false);
  p.navigate("diagnostic", "grammar");
  await p.run({ type: "diagnostic", answer: "sample" }, signal());
  p.navigate("journey");
  p.lesson();
  await p.run({ type: "guided", answer: "sample" }, signal());
  p.independent();
  let view = await p.run({ type: "independent", answer: "sample" }, signal());
  assert.equal(view.finalChallenge.available, true);
  assert.equal(
    view.competencies.find((c) => c.id === "grammar")?.status,
    "independently-demonstrated",
  );
  p.navigate("rewrite");
  p.edit("rewrite", SAMPLE_REWRITE);
  view = await p.run({ type: "rewrite" }, signal());
  assert.equal(view.record.screen, "profile");
  assert.equal(view.record.rewritten, true);
  assert.ok(view.competencies.every((c) => c.status !== "verified"));
  assert.equal(
    view.competencies.filter((c) => c.status === "independently-demonstrated")
      .length,
    1,
  );
});
test("gates reject empty answers, premature independent work and a non-fifty-word rewrite", async () => {
  const { p } = await ready();
  assert.throws(() => p.navigate("rewrite"));
  await assert.rejects(
    p.run({ type: "diagnostic", answer: "sample" }, signal()),
  );
  p.navigate("diagnostic", "grammar");
  await assert.rejects(p.run({ type: "diagnostic", answer: "" }, signal()));
  p.navigate("journey");
  assert.throws(() => p.independent());
  await assert.rejects(
    p.run({ type: "independent", answer: "sample" }, signal()),
  );
});
test("unfinished guided response, expanded branch and exact screen survive reload", async () => {
  const { p, store } = await ready();
  p.navigate("diagnostic");
  await p.run({ type: "diagnostic", answer: "sample" }, signal());
  p.navigate("journey");
  p.lesson();
  p.answerDraft("My unfinished synthetic sentence");
  const resumed = createFixturePresenter(store, 0).load();
  assert.equal(resumed.record.screen, "journey");
  assert.equal(resumed.record.step, "guided");
  assert.equal(
    resumed.record.drafts["grammar.journey.guided"],
    "My unfinished synthetic sentence",
  );
  assert.ok(resumed.record.expanded.includes("grammar"));
});
test("interrupted async work does not complete the scene and can safely resume", async () => {
  const store = storage();
  const p = createFixturePresenter(store, 100);
  p.edit("original", SAMPLE_ESSAY);
  const controller = new AbortController();
  const pending = p.run({ type: "analyse" }, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  const view = createFixturePresenter(store, 0).load();
  assert.equal(view.interrupted, true);
  assert.equal(view.record.analysed, false);
  assert.equal(view.record.original, SAMPLE_ESSAY);
});
test("simulated loading failure preserves draft and permits retry", async () => {
  const store = storage();
  const p = createFixturePresenter(store, 0);
  p.edit("original", SAMPLE_ESSAY);
  p.simulateFailure();
  await assert.rejects(
    p.run({ type: "analyse" }, signal()),
    /sample feedback could not/,
  );
  assert.equal(p.load().record.pending, false);
  assert.equal(p.load().record.original, SAMPLE_ESSAY);
  assert.equal(
    (await p.run({ type: "analyse" }, signal())).record.screen,
    "dashboard",
  );
});
test("storage failure is reported and corrupt records are preserved", () => {
  const store = storage();
  store.data.set(STORAGE_KEY, "not-json");
  assert.throws(() => createFixturePresenter(store).load());
  assert.equal(store.data.get(STORAGE_KEY), "not-json");
  assert.throws(() => parseDemo("{}"));
  const p = createFixturePresenter({
    getItem: () => null,
    setItem: () => {
      throw Error("Storage denied");
    },
    removeItem: () => {},
  });
  assert.throws(() => p.edit("original", "sample"), /Storage denied/);
  assert.equal(p.load().record.original, "");
});
test("editing an essay invalidates only the fictional walkthrough; reset leaves English data alone", async () => {
  const { p, store } = await ready();
  store.data.set("openpath-english-last-profile", "existing-pupil");
  p.edit("original", "New fictional draft");
  assert.equal(p.load().record.analysed, false);
  assert.equal(p.load().record.screen, "submission");
  p.reset();
  assert.equal(
    store.data.get("openpath-english-last-profile"),
    "existing-pupil",
  );
});
test("verified styling requires a shared-contract policy, never a fixture or a completion click", () => {
  assert.equal(
    visibleStatus("verified", "fixture", "verified"),
    "needs-verification",
  );
  assert.equal(
    visibleStatus("verified", "shared-contract", "not_demonstrated"),
    "needs-verification",
  );
  assert.equal(
    visibleStatus("verified", "shared-contract", "verified"),
    "verified",
  );
  assert.equal(
    visibleStatus("independently-demonstrated", "fixture"),
    "independently-demonstrated",
  );
});

test("published essay-contract@1 types back the fixture profile, journey, evidence and rewrite", async () => {
  const { ESSAY_CONTRACT, REAL_LEARNER_ESSAYS_ENABLED } = await import(
    "../../../../../packages/english-core/src/essay/contract"
  );
  const { readFileSync } = await import("node:fs");
  const framework = JSON.parse(
    readFileSync(
      new URL(
        "../../../../../content/english/framework/en-0.1.0.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const ids = new Set<string>(
    framework.strands.flatMap(
      (s: { substrands: { capabilities: { id: string }[] }[] }) =>
        s.substrands.flatMap((ss) => ss.capabilities.map((c) => c.id)),
    ),
  );
  const { p } = await ready();
  const shared = p.load().shared;
  assert.equal(shared.contract, ESSAY_CONTRACT);
  assert.equal(shared.profile.contract, ESSAY_CONTRACT);
  assert.equal(shared.journey.contract, ESSAY_CONTRACT);
  assert.equal(REAL_LEARNER_ESSAYS_ENABLED, false);
  assert.equal(shared.submission.source.dataUse, "synthetic_test");
  for (const c of shared.profile.competencies)
    assert.ok(ids.has(c.competency), c.competency);
  for (const observation of shared.analysis.observations) {
    assert.ok(observation.span.start >= 0);
    assert.equal(
      shared.submission.text.slice(
        observation.span.start,
        observation.span.end,
      ),
      observation.span.quote,
    );
    assert.ok(observation.evaluator.id.startsWith("fixture:"));
  }
  assert.equal(
    shared.journey.finalRewrite.available,
    p.load().finalChallenge.available,
  );
  assert.ok(shared.journey.trees.every((t) => t.nodes.every((n) => !n.green)));
});
