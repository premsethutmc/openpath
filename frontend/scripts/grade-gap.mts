/**
 * grade-gap@1: a gap report for one grade and board, the same check grade7-coverage.test.ts makes for Grade 7, but
 * reported (never asserted) so every grade can be measured. A synthetic learner works each competency of the release
 * through the engine: two early mistakes, then right answers, then a later session after the delay.
 * Behaviour only (is anything unavailable, stalled or untaught?), never whether the teaching works.
 * Synthetic learners and a test-only review fixture; no stored record changes; no language model is called.
 *
 * usage: GRADE=8 BOARD=tn OUT=gap-tn-8.json node --import tsx scripts/grade-gap.mts   (LIMIT=n: first n competencies)
 */
import { writeFileSync } from "node:fs";
import { Driver, right, type Answerer } from "../src/learning/driver";
import { boardFor } from "../../packages/learning/src/curricula";
import { allOutcomesOf } from "../../packages/learning/src/curriculum";
import { graph } from "../../packages/learning/src/graph";
import { question, questions } from "../../packages/learning/src/content";
import { useReviewFixture } from "../../packages/learning/src/evidence";
import { checkCompetency } from "../../packages/learning/src/compiler";

const grade = Number(process.env.GRADE);
const board = process.env.BOARD as "cbse" | "tn";
const out = process.env.OUT ?? `gap-${board}-${grade}.json`;
const limit = Number(process.env.LIMIT ?? 0);

const wrong = (q: string) => {
  const p = question(q);
  const opt = (p.options ?? []).find((o: string) => o !== p.answer);
  return opt ?? (p.answer === "0" ? "1" : "0");
};
const wrongFirst = (): Answerer => {
  let n = 0;
  return (q) => (n++ < 2 ? wrong(q) : right(q, ""));
};

const release = boardFor(board, grade);
const report: Record<string, unknown> = { grade, board, release: release ? `${release.id}@${release.version}` : null };
if (!release) {
  report.error = "no release for this grade and board";
} else {
  const outcomes = allOutcomesOf(release);
  const verdicts: Record<string, number> = {};
  const unmapped: string[] = [];
  for (const { outcome } of outcomes) {
    const v = outcome.mapping.verdict ?? "unset";
    verdicts[v] = (verdicts[v] ?? 0) + 1;
    if (!outcome.mapping.competencies.some((m) => m.status === "accepted")) unmapped.push(outcome.text.slice(0, 120));
  }
  const ids = [...new Set(outcomes.flatMap(({ outcome }) => outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id))))].sort();
  const run = limit ? ids.slice(0, limit) : ids;
  const verified: string[] = [], awaitingMark: string[] = [], untaught: string[] = [], failed: string[] = [];
  useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  const t0 = Date.now();
  try {
    for (const skill of run) {
      try {
        const d = new Driver(`synthetic-gap-${board}-${grade}-${skill}`, Date.parse("2026-11-06T09:00:00Z"));
        d.enrol(grade, "2026-27", release);
        const first = d.work(skill, wrongFirst(), { max: 80 });
        if (!first.some((ms) => ms.phase === "chapter" || ms.phase === "strategy" || ms.phase === "guided")) untaught.push(skill);
        if (first[first.length - 1].phase === "unavailable") {
          failed.push(`${skill}: unavailable`);
          continue;
        }
        for (let k = 0; k < 3 && d.state().evidence(skill).status !== "verified"; k++) {
          d.newSession(9);
          d.work(skill, right, { max: 80 });
        }
        const status = d.state().evidence(skill).status;
        if (checkCompetency(skill).mode === "educator-marked") {
          if (status === "verified") failed.push(`${skill}: educator-marked but verified without a mark`);
          else if (status === "not_started") failed.push(`${skill}: educator-marked and never started`);
          else awaitingMark.push(skill);
        } else if (status === "verified") verified.push(skill);
        else failed.push(`${skill}: ended ${status} (${d.trace.slice(-2).join(" | ").slice(0, 160)})`);
      } catch (e) {
        failed.push(`${skill}: error ${String((e as Error)?.message ?? e).slice(0, 160)}`);
      }
    }
  } finally {
    useReviewFixture(null);
  }
  Object.assign(report, {
    outcomes: outcomes.length,
    outcome_verdicts: verdicts,
    outcomes_unmapped: unmapped.length,
    unmapped_examples: unmapped.slice(0, 10),
    competencies: ids.length,
    checked: run.length,
    verified: verified.length,
    awaiting_mark: awaitingMark.length,
    failed: failed.length,
    untaught_after_mistakes: untaught.length,
    failures: failed.slice(0, 40),
    untaught: untaught.slice(0, 40),
    seconds: Math.round((Date.now() - t0) / 1000),
  });
}
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report, unmapped_examples: undefined, failures: (report.failures as string[] | undefined)?.length, untaught: undefined }));
