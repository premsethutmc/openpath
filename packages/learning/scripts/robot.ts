/**
 * robot@1: a learner that takes every question the product has, start to right answer, and says where the product
 * breaks. For each question (every form of every type):
 *   answer   the stored answer, entered as a learner would, is marked correct; a wrong one is not
 *   help     "I'm stuck" opens, in every way it offers; every box accepts the number it expects and refuses another
 *   arrive   the last step of the first way reaches the answer
 *   early    no step before the last says the answer; no cue says it
 * It runs the product's own logic (the same grader, the same step help), not a screen. It judges behaviour only: never
 * whether an explanation is the method a school teaches, or whether a child follows it.
 *   node --import tsx ../packages/learning/scripts/robot.ts --shard 0/8 --out robot-0.json   (from frontend/)
 *   node --import tsx ../packages/learning/scripts/robot.ts --merge robot-*.json             prints the report
 * Report only: a failing question does not fail the job; a crash does.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { question } from "../src/content.ts";
import { FAMILIES, pool } from "../src/families.ts";
import { grade } from "../src/grading/decision.ts";
import { askOf, judge } from "../src/step-ask.ts";
import { helpMethods, stepsHelp } from "../src/step-help.ts";

type Kind = "answer-not-accepted" | "wrong-answer-accepted" | "no-help" | "box-refuses-right" | "box-accepts-wrong" | "does-not-arrive" | "answer-said-early" | "answer-in-cue" | "crash";
const HARD: Kind[] = ["answer-not-accepted", "wrong-answer-accepted", "no-help", "box-refuses-right", "box-accepts-wrong", "crash"];
interface Fam { questions: number; clean: number; steps: number; boxes: number; fails: Partial<Record<Kind, number>>; eg: Partial<Record<Kind, string>> }
interface Report { schema: "robot@1"; shard: string; families: Record<string, Fam> }

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const flat = (t: string) => t.replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/-(?=\d)/g, "−");
const says = (text: string, answer: string) => { const a = flat(answer).trim(); if (a.length < 3 || !/\d/.test(a)) return false; return new RegExp(`(^|[^\\d./−])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d./]|$)`).test(flat(text)); };
const numeric = (v: string) => /^[−-]?\d+(?:\.\d+)?$/.test(v.replace(/,/g, ""));
const bump = (v: string) => String(Number(v.replace(/,/g, "").replace("−", "-")) + 1);

function take(id: string, f: Fam) {
  const note = (k: Kind, what: string) => { f.fails[k] = (f.fails[k] ?? 0) + 1; f.eg[k] ??= `${id}: ${what}`.slice(0, 220); return HARD.includes(k); };
  let hard = false;
  try {
    const q = question(id) as { type: string; answer: string; prompt: string; options?: string[] };
    f.questions++;
    // the answer
    if (q.type !== "written") {
      if (grade(id, q.answer).decision.verdict !== "correct") hard = note("answer-not-accepted", `"${q.answer}" for ${q.prompt.slice(0, 80)}`) || hard;
      const wrong = q.options?.find((o) => o !== q.answer) ?? (numeric(q.answer) ? bump(q.answer) : null);
      if (wrong !== null && grade(id, wrong).decision.verdict === "correct") hard = note("wrong-answer-accepted", `"${wrong}" (the answer is "${q.answer}")`) || hard;
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
        if (i < steps.length - 1 && !s.finer && says(s.shown, q.answer) && !says(q.prompt, q.answer)) note("answer-said-early", `${name}, step ${i + 1} of ${steps.length}: ${s.shown}`);
      });
      if (k === 0 && q.type !== "written" && flat(q.answer).trim().length >= 1 && /\d/.test(q.answer)) {
        const end = steps[steps.length - 1], a = flat(q.answer).trim();
        if (!new RegExp(`(^|[^\\d./−])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d/]|$)`).test(flat(`${end.shown} ${(end.board ?? []).join(" ")}`))) note("does-not-arrive", `last step "${end.shown}" for answer ${q.answer}`);
      }
    });
  } catch (e) { hard = note("crash", String((e as Error).message ?? e)) || hard; }
  if (!hard) f.clean++;
}

if (process.argv.includes("--merge")) {
  const rest = process.argv.slice(process.argv.indexOf("--merge") + 1), stop = rest.findIndex((x) => x.startsWith("--")), files = stop < 0 ? rest : rest.slice(0, stop);
  const all: Record<string, Fam> = {};
  for (const file of files) Object.assign(all, (JSON.parse(readFileSync(file, "utf8")) as Report).families);
  const fams = Object.entries(all), sum = (g: (f: Fam) => number) => fams.reduce((t, [, f]) => t + g(f), 0);
  const kinds = [...new Set(fams.flatMap(([, f]) => Object.keys(f.fails)))] as Kind[];
  const questions = sum((f) => f.questions), clean = sum((f) => f.clean);
  const lines = [`# Robot learner (robot@1)`, ``, `**${clean.toLocaleString("en-IN")} of ${questions.toLocaleString("en-IN")} questions** (${((100 * clean) / Math.max(1, questions)).toFixed(2)}%) go from start to right answer with nothing broken: the answer is accepted, a wrong one is refused, help opens in every way, and every box takes the right number and refuses a wrong one.`, ``,
    `${fams.length} question types · ${sum((f) => f.steps).toLocaleString("en-IN")} help steps walked · ${sum((f) => f.boxes).toLocaleString("en-IN")} boxes typed into`, ``,
    `| What went wrong | Questions | Types | Breaks the product |`, `|---|---:|---:|---|`,
    ...kinds.sort((a, b) => sum((f) => f.fails[b] ?? 0) - sum((f) => f.fails[a] ?? 0)).map((k) => `| ${k} | ${sum((f) => f.fails[k] ?? 0).toLocaleString("en-IN")} | ${fams.filter(([, f]) => f.fails[k]).length} | ${HARD.includes(k) ? "yes" : "no (quality)"} |`), ``,
    `## One example of each, by type`, ``,
    ...kinds.flatMap((k) => [`### ${k}`, ...fams.filter(([, f]) => f.fails[k]).sort((a, b) => (b[1].fails[k] ?? 0) - (a[1].fails[k] ?? 0)).slice(0, 40).map(([id, f]) => `- \`${id}\` (${f.fails[k]} of ${f.questions}): ${f.eg[k]}`), ``])];
  const out = lines.join("\n") + "\n";
  writeFileSync(arg("--report") ?? "robot-report.md", out);
  writeFileSync(arg("--json") ?? "robot-report.json", JSON.stringify({ schema: "robot@1", questions, clean, types: fams.length, kinds: Object.fromEntries(kinds.map((k) => [k, { questions: sum((f) => f.fails[k] ?? 0), types: fams.filter(([, f]) => f.fails[k]).length }])) }, null, 1) + "\n");
  console.log(out.split("\n").slice(0, 16).join("\n"));
} else {
  const [part, of] = (arg("--shard") ?? "0/1").split("/").map(Number), every = Number(arg("--every") ?? 1);
  const families: Record<string, Fam> = {};
  const ids = [...FAMILIES.keys()].sort().filter((_, i) => i % of === part);
  const t0 = Date.now();
  for (const fam of ids) {
    const f: Fam = { questions: 0, clean: 0, steps: 0, boxes: 0, fails: {}, eg: {} };
    let items: { id: string }[] = [];
    try { items = pool(fam).items; } catch (e) { f.fails.crash = 1; f.eg.crash = `${fam}: ${String((e as Error).message ?? e)}`.slice(0, 220); }
    for (let i = 0; i < items.length; i += every) take(items[i].id, f);
    families[fam] = f;
  }
  writeFileSync(arg("--out") ?? `robot-${part}.json`, JSON.stringify({ schema: "robot@1", shard: `${part}/${of}`, families } satisfies Report) + "\n");
  const q = Object.values(families).reduce((t, f) => t + f.questions, 0);
  console.log(`robot@1 shard ${part}/${of}: ${ids.length} types, ${q} questions, ${Math.round((Date.now() - t0) / 1000)} s`);
}
