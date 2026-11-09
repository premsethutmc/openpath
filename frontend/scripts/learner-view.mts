// learner-view@1: what a learner of a given grade sees for one competency, as text, for content review. Read-only: synthetic
// learners in memory, a test-only review fixture, no stored record changes.
//
//   node --import tsx scripts/learner-view.mts <competency> [--board cbse|tn] [--grade 8] [--steps 14] [--out file]   (from frontend/)
//   e.g. node --import tsx scripts/learner-view.mts MATH.number.exponents --board tn --grade 8
//
// Prints: the lesson page (each section's role, question and its grade, the picture it draws, its text, worked steps, working
// lines and tip), the lesson's practice queue in order, the engine's question sequence for a synthetic learner who answers
// everything right and for one who is wrong twice first, and the lesson-checks@1 findings for this lesson. Answer keys are
// shown, so a reviewer can check every one. Used for the independent sample review (docs/runbooks/GRADE_BUILD.md §3).
import { writeFileSync } from "node:fs";
import { moduleFor, question, questions } from "../../packages/learning/src/content";
import { boardFor } from "../../packages/learning/src/curricula";
import { useReviewFixture } from "../../packages/learning/src/evidence";
import { gradeOfQuestion } from "../../packages/learning/src/families";
import { lessonChecks, pageCandidates } from "../../packages/learning/src/lesson-checks";
import { teachingLesson } from "../../packages/learning/src/teaching-contract";
import { writtenTask } from "../../packages/learning/src/written";
import { Driver, right, type Answerer } from "../src/learning/driver";

const argv = process.argv.slice(2);
const val = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const competency = argv.find((a) => a.startsWith("MATH.") || (!a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--")));
if (!competency) { console.error("usage: learner-view.mts <competency> [--board cbse|tn] [--grade N] [--steps N] [--out file]"); process.exit(2); }
const board = (val("board", "cbse") as "cbse" | "tn"), grade = Number(val("grade", "8")), steps = Number(val("steps", "14"));
const m = moduleFor(competency);
if (!m) { console.error(`no module for ${competency}`); process.exit(1); }
const release = boardFor(board, grade);
if (!release) { console.error(`no ${board} Grade ${grade} release`); process.exit(1); }

const strip = (id: string) => id.replace(/:(mc|w)$/, "");
const gradeOf = (id: string) => gradeOfQuestion(strip(id)) ?? writtenTask(id)?.grade ?? null;
const q = (id: string) => {
  const p = question(id);
  const fig = (p as { figure?: { type: string } }).figure;
  return `[${id} | Grade ${gradeOf(id) ?? "—"}${fig ? ` | picture: ${fig.type}` : ""}] ${p.prompt}${p.options ? `\n      options: ${p.options.map((o: string, i: number) => `${"ABCDEF"[i]}) ${o}`).join("  ")}` : ""}\n      answer: ${p.answer}`;
};
useReviewFixture({ items: questions.map((x) => x.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
const out: string[] = [];
try {
  const L = teachingLesson(m, pageCandidates(m), grade);
  out.push(`=== ${competency}: a Grade ${grade} learner (${release.id}) ===`, L.contentLabel, "", "--- LESSON PAGE ---");
  L.blocks.forEach((b, i) => {
    const pic = b.representation ? `representation ${b.representation.kind}` : b.visual ? `visual ${(b.visual as { kind?: string }).kind ?? ""}` : b.widget ? `widget ${(b.widget as { type?: string }).type ?? ""}` : b.figure ? `the question's ${b.figure.type}` : "none";
    out.push("", `#${i + 1} [${b.role}] ${b.label} — ${b.title}${b.instance ? `  (question ${b.instance}, Grade ${gradeOf(b.instance) ?? "—"})` : ""}  · picture: ${pic}`);
    for (const t of b.text) out.push(`   ${t}`);
    if (b.worked) {
      out.push(`   WORKED (${b.worked.verified ? "checked" : "not checked"}): ${b.worked.question}`);
      if (b.worked.options?.length) out.push(`   options: ${b.worked.options.map((o, k) => `${"ABCDEF"[k]}) ${o}`).join("  ")}`);
      for (const s of b.worked.steps) out.push(`     ${s.expression}   — ${s.explanation}`);
    }
    for (const l of b.lines ?? []) out.push(`   | ${l}`);
    if (b.tip) out.push(`   tip: ${b.tip}`);
    if (b.violations.length) out.push(`   contract: ${b.violations.join(", ")}`);
  });
  out.push("", "--- LESSON PRACTICE (first 8, in order) ---", ...L.practice.slice(0, 8).map((id, i) => `${i + 1}. ${q(id)}`));
  const wrongTwice = (): Answerer => {
    let n = 0;
    return (id, ph) => (n++ < 2 ? (question(id).type === "choice" ? (question(id).answer === "A" ? "B" : "A") : "0") : right(id, ph));
  };
  for (const [label, ans] of [["answers everything right", right], ["wrong twice, then right", wrongTwice()]] as const) {
    const d = new Driver(`learner-view-${board}-${competency}-${label}`, Date.parse("2026-11-06T09:00:00Z"));
    d.enrol(grade, "2026-27", release);
    out.push("", `--- ENGINE (the module's assessment): a learner who ${label} ---`);
    for (const ms of d.work(competency, ans, { max: steps })) {
      out.push(`${ms.phase}: ${ms.reason}`);
      if (ms.question) out.push(`   ${q(ms.question)}`);
      if (ms.strategy) { out.push(`   EXPLANATION: ${ms.strategy.title}`); for (const s of ms.strategy.screens) out.push(`     · ${s.title}: ${s.text.join(" ")} ${(s.math ?? []).join(" ; ")}`); }
    }
  }
  const fs = lessonChecks(m, grade);
  out.push("", `--- LESSON CHECKS (lesson-checks@1): ${fs.length} ---`, ...fs.map((f) => `${f.check}${f.section ? ` · ${f.section}` : ""}: ${f.detail}`));
} finally {
  useReviewFixture(null);
}
const file = val("out");
if (file) { writeFileSync(file, out.join("\n") + "\n"); console.log(`wrote ${file} (${out.length} lines)`); } else console.log(out.join("\n"));
