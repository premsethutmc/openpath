/**
 * robot@1: a learner that takes every question the product has, start to right answer, and says where the product
 * breaks. For each question (every form of every type):
 *   answer   the stored answer, entered as a learner would, is marked correct; a wrong one is not; of a choice's
 *            options exactly one is marked correct
 *   help     "I'm stuck" opens, in every way it offers; every box accepts the number it expects and refuses another
 *   arrive   the first way states the answer somewhere in its steps (each part of it, for an answer in parts)
 *   age      in Classes 1 to 5, the help is written for its class (packages/learning/src/age.ts)
 *   thin     how many helps are one step, or cued mostly by single words
 *   early    a help of three steps or more does not say a numeric answer in its first step; no cue says it
 * It runs the product's own logic (the same grader, the same step help), not a screen. It judges behaviour only: never
 * whether an explanation is the method a school teaches, or whether a child follows it.
 *   node --import tsx ../packages/learning/scripts/robot.ts --shard 0/8 --out robot-0.json   (from frontend/)
 *   node --import tsx ../packages/learning/scripts/robot.ts --merge robot-*.json             prints the report
 * With --gate (the nightly job and every change to this script) a question that breaks the product fails the job.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { ageFindings, type AgeKind } from "../src/age.ts";
import { question } from "../src/content.ts";
import { allReleases } from "../src/curricula.ts";
import { assigned } from "../src/curriculum.ts";
import { FAMILIES, gradeOfQuestion, pool } from "../src/families.ts";
import { grade } from "../src/grading/decision.ts";
import { askOf, judge } from "../src/step-ask.ts";
import { selectable } from "../src/question-status.ts";
import { helpMethods, statesAnswer, stepsHelp } from "../src/step-help.ts";

type Kind = "no-option-is-right" | "several-options-right" | "answer-not-accepted" | "wrong-answer-accepted" | "no-help" | "box-refuses-right" | "box-accepts-wrong" | "help-never-states-answer" | "answer-in-first-step" | "help-is-one-step" | "mostly-one-word-cues" | `age: ${AgeKind}` | "answer-in-cue" | "crash";
const HARD: Kind[] = ["no-option-is-right", "several-options-right", "answer-not-accepted", "wrong-answer-accepted", "no-help", "box-refuses-right", "box-accepts-wrong", "crash"];
interface Fam { questions: number; /** quarantined: never served to a learner, so not taken */ held: number; clean: number; steps: number; boxes: number; fails: Partial<Record<Kind, number>>; eg: Partial<Record<Kind, string>> }
interface Report { schema: "robot@1"; shard: string; families: Record<string, Fam> }

// the first class in which any board's book teaches a skill
const FIRST = new Map<string, number>();
for (const r of allReleases) if (/^(icse|cbse|tn)-/.test(r.id)) for (const a of assigned(r)) if ((FIRST.get(a.competency) ?? 99) > r.grade) FIRST.set(a.competency, r.grade);
const classOf = (skill: string) => FIRST.get(skill) ?? null;
const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const flat = (t: string) => t.replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/-(?=\d)/g, "−");
const says = (text: string, answer: string) => { const a = flat(answer).trim(); if (a.length < 3 || !/\d/.test(a)) return false; return new RegExp(`(^|[^\\d./−])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d./]|$)`).test(flat(text)); };
const numeric = (v: string) => /^[−-]?\d+(?:\.\d+)?$/.test(v.replace(/,/g, ""));
const s0 = (x: { next: string; shown: string }) => `"${x.next}" — ${x.shown}`.slice(0, 160);
const bump = (v: string) => String(Number(v.replace(/,/g, "").replace("−", "-")) + 1);

function take(id: string, f: Fam, fam: string, light: boolean) {
  const note = (k: Kind, what: string) => { f.fails[k] = (f.fails[k] ?? 0) + 1; f.eg[k] ??= `${id}: ${what}`.slice(0, 220); return HARD.includes(k); };
  let hard = false;
  try {
    // a quarantined question is never served (question-status.ts): it is counted, not taken
    if (!selectable(id)) { f.held++; return; }
    const q = question(id) as { type: string; answer: string; prompt: string; options?: string[] };
    f.questions++;
    // the answer
    if (q.type !== "written" && !light) {
      if (grade(id, q.answer).decision.verdict !== "correct") hard = note("answer-not-accepted", `"${q.answer}" for ${q.prompt.slice(0, 80)}`) || hard;
      if (q.options) {
        // a choice: the app sends the letter of the option tapped (A, B, C…); exactly one letter is marked correct
        const right = q.options.map((_, i) => "ABCDEFGH"[i]).filter((l) => grade(id, l).decision.verdict === "correct");
        if (right.length === 0) hard = note("no-option-is-right", `${JSON.stringify(q.options)} (stored answer "${q.answer}")`) || hard;
        else if (right.length > 1) hard = note("several-options-right", `${JSON.stringify(right)} of ${JSON.stringify(q.options)}`) || hard;
      } else {
        const wrong = numeric(q.answer) ? bump(q.answer) : null;
        if (wrong !== null && grade(id, wrong).decision.verdict === "correct") hard = note("wrong-answer-accepted", `"${wrong}" (the answer is "${q.answer}")`) || hard;
      }
    }
    // the help
    const base = id.replace(/:(mc|w)$/, ""), ways = helpMethods(base);
    if (!ways.length) hard = note("no-help", q.prompt.slice(0, 80)) || hard;
    ways.forEach((name, k) => {
      const steps = stepsHelp(base, k) ?? [];
      if (!steps.length) { hard = note("no-help", `way "${name}" has no steps`) || hard; return; }
      steps.forEach((s, i) => {
        f.steps++;
        const box = s.ask ? { lead: s.ask.lead, lhs: s.ask.value, value: s.ask.value } : askOf(s.shown);
        if (box) {
          f.boxes++;
          if (!judge(box, box.value)) hard = note("box-refuses-right", `${name}: "${s.next}" expects ${box.value}`) || hard;
          else if (numeric(box.value) && judge(box, bump(box.value))) hard = note("box-accepts-wrong", `${name}: "${s.next}" takes ${bump(box.value)} for ${box.value}`) || hard;
        }
        if (says(s.next, q.answer) && !says(q.prompt, q.answer)) note("answer-in-cue", `${name}: ${s.next}`);
        if (i === 0 && steps.length >= 3 && numeric(q.answer) && !/(\d+,\s*){3}/.test(s.shown) && says(s.shown, q.answer) && !says(q.prompt, q.answer)) note("answer-in-first-step", `${name}, step 1 of ${steps.length}: ${s.shown}`);
      });
      // age@1: is the first way written for the class the question is taught in? (Classes 1 to 5 so far)
      if (k === 0) { const cls = gradeOfQuestion(base) ?? classOf(FAMILIES.get(fam)!.competency); if (cls !== null && cls <= 5) for (const a of ageFindings(cls, q.prompt, steps, classOf)) note(`age: ${a.kind}`, `Class ${cls}: ${a.what}`); }
      // thin@1: how thin the first way is. One step with no working behind it; or cues that are mostly a single word
      if (k === 0) {
        if (steps.length === 1 && !steps[0].how) note("help-is-one-step", `${s0(steps[0])}`);
        const bare = steps.filter((x) => /^(First|Next|Last|Now): [a-z-]+\.$/.test(x.next)).length;
        if (bare / steps.length >= 0.6) note("mostly-one-word-cues", `${bare} of ${steps.length} cues, e.g. "${steps.find((x) => /^(First|Next|Last|Now): [a-z-]+\.$/.test(x.next))!.next}" for "${steps[0].shown.slice(0, 60)}"`);
      }
      if (q.type !== "written" && !q.options && !statesAnswer(steps, q.answer)) note("help-never-states-answer", `${name}: answer ${q.answer}; last step "${steps[steps.length - 1].shown}"`);
    });
  } catch (e) { hard = note("crash", String((e as Error).message ?? e)) || hard; }
  if (!hard) f.clean++;
}

if (process.argv.includes("--samples")) {
  // one question of each type (the middle one that is served), for the screen check (frontend/e2e/screen-robot.mjs)
  const out: { family: string; id: string }[] = [];
  for (const fam of [...FAMILIES.keys()].sort()) {
    let ids: string[] = [];
    try { ids = pool(fam).items.map((x) => x.id).filter((id) => !/:(mc|w)$/.test(id) && selectable(id)); } catch { /* reported by the main run */ }
    if (ids.length) out.push({ family: fam, id: ids[Math.floor(ids.length / 2)] });
  }
  writeFileSync(arg("--samples")!, JSON.stringify(out) + "\n");
  console.log(`robot@1: ${out.length} sample questions`);
} else if (process.argv.includes("--merge")) {
  const rest = process.argv.slice(process.argv.indexOf("--merge") + 1), stop = rest.findIndex((x) => x.startsWith("--")), files = stop < 0 ? rest : rest.slice(0, stop);
  const all: Record<string, Fam> = {};
  for (const file of files) Object.assign(all, (JSON.parse(readFileSync(file, "utf8")) as Report).families);
  const fams = Object.entries(all), sum = (g: (f: Fam) => number) => fams.reduce((t, [, f]) => t + g(f), 0);
  const kinds = [...new Set(fams.flatMap(([, f]) => Object.keys(f.fails)))] as Kind[];
  const questions = sum((f) => f.questions), clean = sum((f) => f.clean), held = sum((f) => f.held ?? 0);
  const lines = [`# Robot learner (robot@1)`, ``, `**${clean.toLocaleString("en-IN")} of ${questions.toLocaleString("en-IN")} questions** (${((100 * clean) / Math.max(1, questions)).toFixed(2)}%) go from start to right answer with nothing broken: the answer is accepted, a wrong one is refused, help opens in every way, and every box takes the right number and refuses a wrong one.`, ``,
    `${held.toLocaleString("en-IN")} more questions in ${fams.filter(([, f]) => f.held).length} types are held back (quarantined): they are never served, so they were not taken.`, ``,
    `${fams.length} question types · ${sum((f) => f.steps).toLocaleString("en-IN")} help steps walked · ${sum((f) => f.boxes).toLocaleString("en-IN")} boxes typed into`, ``,
    `| What went wrong | Questions | Types | Breaks the product |`, `|---|---:|---:|---|`,
    ...kinds.sort((a, b) => sum((f) => f.fails[b] ?? 0) - sum((f) => f.fails[a] ?? 0)).map((k) => `| ${k} | ${sum((f) => f.fails[k] ?? 0).toLocaleString("en-IN")} | ${fams.filter(([, f]) => f.fails[k]).length} | ${HARD.includes(k) ? "yes" : "no (quality)"} |`), ``,
    `## One example of each, by type`, ``,
    ...kinds.flatMap((k) => [`### ${k}`, ...fams.filter(([, f]) => f.fails[k]).sort((a, b) => (b[1].fails[k] ?? 0) - (a[1].fails[k] ?? 0)).slice(0, 40).map(([id, f]) => `- \`${id}\` (${f.fails[k]} of ${f.questions}): ${f.eg[k]}`), ``])];
  const out = lines.join("\n") + "\n";
  writeFileSync(arg("--report") ?? "robot-report.md", out);
  writeFileSync(arg("--json") ?? "robot-report.json", JSON.stringify({ schema: "robot@1", questions, clean, held, types: fams.length, kinds: Object.fromEntries(kinds.map((k) => [k, { questions: sum((f) => f.fails[k] ?? 0), types: fams.filter(([, f]) => f.fails[k]).length }])) }, null, 1) + "\n");
  console.log(out.split("\n").slice(0, 16).join("\n"));
  // gate@1: with --gate the job fails when a question breaks the product, when a quality count rises above the
  // number it stood at, or when questions went missing from the run. A count that falls should be lowered here.
  if (process.argv.includes("--gate")) {
    const CEILING: Partial<Record<Kind, number>> = { "answer-in-first-step": 257, "answer-in-cue": 5, "help-never-states-answer": 0, "age: maths-not-yet-taught": 1264, "age: term-not-yet-taught": 687, "age: long-sentence": 645, "age: number-too-big": 583, "age: long-word": 200, "age: too-many-steps": 0 };
    const FLOOR = 350_000;
    const count = (k: Kind) => sum((f) => f.fails[k] ?? 0);
    const broken = [...HARD.filter((k) => count(k) > 0).map((k) => `${k}: ${count(k)} questions break the product`), ...(Object.entries(CEILING) as [Kind, number][]).filter(([k, n]) => count(k) > n).map(([k, n]) => `${k}: ${count(k)}, up from ${n}`), ...(questions < FLOOR ? [`only ${questions} questions were taken (at least ${FLOOR} expected): a part of the run is missing`] : [])];
    if (broken.length) { console.error(`robot@1 gate: FAILED\n${broken.map((b) => `  ${b}`).join("\n")}`); process.exit(1); }
    console.log("robot@1 gate: passed");
  }
} else {
  const [part, of] = (arg("--shard") ?? "0/1").split("/").map(Number), every = Number(arg("--every") ?? 1);
  const families: Record<string, Fam> = {};
  const only = arg("--only")?.split(",") ?? null;
  // --light: the help only (no grading): for a quick count of the quality findings
  const light = process.argv.includes("--light"), upTo = Number(arg("--classes-up-to") ?? 99);
  const ids = [...FAMILIES.keys()].sort().filter((id, i) => (only ? only.includes(id) : i % of === part));
  const t0 = Date.now();
  for (const fam of ids) {
    if ((classOf(FAMILIES.get(fam)!.competency) ?? 99) > upTo && upTo < 99) continue;
    const f: Fam = { questions: 0, held: 0, clean: 0, steps: 0, boxes: 0, fails: {}, eg: {} };
    let items: { id: string }[] = [];
    try { items = pool(fam).items; } catch (e) { f.fails.crash = 1; f.eg.crash = `${fam}: ${String((e as Error).message ?? e)}`.slice(0, 220); }
    for (let i = 0; i < items.length; i += every) take(items[i].id, f, fam, light);
    families[fam] = f;
  }
  writeFileSync(arg("--out") ?? `robot-${part}.json`, JSON.stringify({ schema: "robot@1", shard: `${part}/${of}`, families } satisfies Report) + "\n");
  const q = Object.values(families).reduce((t, f) => t + f.questions, 0);
  console.log(`robot@1 shard ${part}/${of}: ${ids.length} types, ${q} questions, ${Math.round((Date.now() - t0) / 1000)} s`);
}
