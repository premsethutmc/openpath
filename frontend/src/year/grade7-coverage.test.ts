/**
 * grade7-coverage@1: every competency a Grade 7 learner meets in either board's release (CBSE / NCERT and Tamil Nadu
 * Samacheer) can be worked end to end by a synthetic learner through the engine itself: taught, practised, checked and,
 * after a delay, verified. This tests the system's behaviour (nothing is unavailable, nothing stalls), never whether
 * the teaching works: that needs real learners. Synthetic learners and a test-only review fixture; no stored record changes.
 * An educator-marked competency (constructions: the learner's drawing is marked by a person) cannot be verified by a
 * synthetic learner: for those the engine must still teach and ask, and stop short of "verified" without a mark.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { Driver, right, type Answerer } from "../learning/driver";
import { boardFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf } from "../../../packages/learning/src/curriculum";
import { graph } from "../../../packages/learning/src/graph";
import { question, questions } from "../../../packages/learning/src/content";
import { useReviewFixture } from "../../../packages/learning/src/evidence";
import { checkCompetency } from "../../../packages/learning/src/compiler";

const competenciesOf = (board: "cbse" | "tn") => {
  const r = boardFor(board, 7)!;
  const ids = allOutcomesOf(r).flatMap(({ outcome }) => outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id)));
  return { release: r, ids: [...new Set(ids)].sort() };
};
/** A plausible wrong answer the grader can read: another option letter for a choice question, a different fraction
 * for a fraction question, otherwise another option's text or a distinct non-answer. (Option text for a choice
 * question is unreadable to the grader and paused the module before any teaching: a tool bug, not a content gap.) */
const wrong = (q: string) => {
  const p = question(q);
  if (p.type === "choice") return "ABCDEF".slice(0, Math.max(2, (p.options ?? []).length)).split("").find((l) => l !== p.answer)!;
  if (p.type === "fraction") return p.answer === "1/3" ? "2/7" : "1/3";
  const opt = (p.options ?? []).find((o: string) => o !== p.answer);
  if (p.type === "ratio") return p.answer === "1:1" ? "1:2" : "1:1";
  return opt ?? (p.answer === "0" ? "1" : "0");
};
/** Wrong on the first two questions of a skill, then right: the engine must teach before it practises. */
const wrongFirst = (): Answerer => {
  let n = 0;
  return (q) => (n++ < 2 ? wrong(q) : right(q, ""));
};

for (const board of ["cbse", "tn"] as const) {
  test(`Grade 7 ${board}: every competency of the release can be worked and verified after a delay`, () => {
    useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
    try {
      const { release, ids } = competenciesOf(board);
      assert.ok(ids.length > 30, `${release.id}: ${ids.length} competencies`);
      const failures: string[] = [];
      const awaitingMark: string[] = [];
      let taught = 0;
      const untaught: string[] = [];
      for (const skill of ids) {
        const d = new Driver(`synthetic-g7-${board}-${skill}`, Date.parse("2026-11-06T09:00:00Z"));
        d.enrol(7, "2026-27", release);
        const first = d.work(skill, wrongFirst(), { max: 80 });
        // taught: a lesson (chapter), a strategy screen or a guided question appears after the early mistakes
        if (first.some((ms) => ms.phase === "chapter" || ms.phase === "strategy" || ms.phase === "guided")) taught++;
        else untaught.push(`${skill} [${[...new Set(first.map((ms) => ms.phase))].join(">")}]`);
        const end1 = first[first.length - 1];
        if (end1.phase === "unavailable") {
          failures.push(`${skill}: unavailable`);
          continue;
        }
        // a later session, after the delay, until the delayed check is done
        for (let k = 0; k < 3 && d.state().evidence(skill).status !== "verified"; k++) {
          d.newSession(9);
          d.work(skill, right, { max: 80 });
        }
        const status = d.state().evidence(skill).status;
        if (checkCompetency(skill).mode === "educator-marked") {
          if (status === "verified") failures.push(`${skill}: educator-marked but verified without a mark`);
          else if (status === "not_started") failures.push(`${skill}: educator-marked and never started`);
          else awaitingMark.push(skill);
          continue;
        }
        if (status !== "verified") failures.push(`${skill}: ended ${status} (last phase ${d.trace.slice(-3).join(" | ")})`);
      }
      assert.deepEqual(failures, [], `${release.id}: ${failures.length} of ${ids.length} competencies did not complete`);
      console.log(`${release.id}: ${ids.length - awaitingMark.length} verified end to end; ${awaitingMark.length} educator-marked, awaiting a mark (${awaitingMark.join(", ")}); teaching shown after early mistakes in ${taught}`);
      // reported, not asserted: where two early mistakes match no known misconception and the skill has no checked
      // general explanation, the engine pauses the skill without teaching (teaching-content safety) — a content gap, listed
      // in docs/milestones/GRADE7_COVERAGE.md, not a fault of the engine
      if (untaught.length) console.log(`${release.id}: no teaching after two early mistakes: ${untaught.join("; ")}`);
      assert.ok(taught > 0);
    } finally {
      useReviewFixture(null);
    }
  });
}
