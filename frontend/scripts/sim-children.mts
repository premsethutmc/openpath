/**
 * sim@1: simulated children take whole skills through the real engine, the way real children would: some know the
 * work, some half know it, some have a gap, one carries a misconception, one mistypes, one guesses, one leans on
 * help. Each has a hidden amount they truly know of each skill, which rises when the product teaches them (a lesson,
 * a strategy, a guided question) and not otherwise. What is reported is how the product reacts:
 *   mastered            skills the product marks verified
 *   mastered-unknowing  marked verified while the child truly knows under half of it (the product was fooled)
 *   never-taught        the child got two or more wrong and was never shown a lesson, a strategy or a guided question
 *   stuck               ended a session unfinished with nothing left to do (not done, not waiting, not paused for a person)
 *   loops               the same question asked three times or more inside one skill
 *   questions           how many questions it took to master a skill (median and worst)
 * Behaviour only: a simulated child is a model, and says nothing about whether a real child follows an explanation.
 * Synthetic learners and a test-only review fixture; no stored record changes; no language model is called.
 *
 * usage: GRADE=5 BOARD=icse OUT=sim-icse-5.json node --import tsx scripts/sim-children.mts   (LIMIT=n: first n skills;
 *        PERSONA=name: one persona);  node --import tsx scripts/sim-children.mts --merge sim-*.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Driver } from "../src/learning/driver";
import { boardFor } from "../../packages/learning/src/curricula";
import { allOutcomesOf } from "../../packages/learning/src/curriculum";
import { graph } from "../../packages/learning/src/graph";
import { question, questions } from "../../packages/learning/src/content";
import { useReviewFixture } from "../../packages/learning/src/evidence";
import { checkCompetency } from "../../packages/learning/src/compiler";

interface Persona { name: string; about: string; know: (skill: string) => number; gain: number; slip: number; guess?: boolean; hints?: boolean; misconception?: boolean }
const WEAK = /multiplication|times-table|division/; // the gap child's missing ground
const PERSONAS: Persona[] = [
  { name: "strong", about: "knows nearly all of it", know: () => 0.93, gain: 0.6, slip: 0.02 },
  { name: "average", about: "knows a bit over half; learns when taught", know: () => 0.6, gain: 0.4, slip: 0.05 },
  { name: "weak", about: "knows little; learns slowly when taught", know: () => 0.25, gain: 0.25, slip: 0.05 },
  { name: "gap", about: "average, but multiplication and division were never learned", know: (s) => (WEAK.test(s) ? 0.1 : 0.6), gain: 0.4, slip: 0.05 },
  { name: "misconception", about: "average, but adds tops and bottoms of fractions until taught", know: () => 0.6, gain: 0.4, slip: 0.05, misconception: true },
  { name: "careless", about: "knows it, mistypes one answer in five", know: () => 0.92, gain: 0.5, slip: 0.2 },
  { name: "guesser", about: "does not work anything out; taps or types something", know: () => 0.05, gain: 0, slip: 0, guess: true },
  { name: "leans-on-help", about: "half knows it; opens help on every guided question", know: () => 0.5, gain: 0.3, slip: 0.05, hints: true },
];
// a small seeded generator: the same run gives the same children
const rng = (seed: string) => { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
/** A wrong answer the grader can read (as grade-gap.mts): another option's letter, another fraction, another number. */
const wrong = (q: string, pick: number) => {
  const p = question(q) as { type: string; answer: string; options?: string[]; prompt: string };
  if (p.type === "choice") { const letters = "ABCDEF".slice(0, Math.max(2, (p.options ?? []).length)).split("").filter((l) => l !== p.answer); return letters[Math.floor(pick * letters.length)] ?? "A"; }
  if (p.type === "fraction") return p.answer === "1/3" ? "2/7" : "1/3";
  if (p.type === "ratio") return p.answer === "1:1" ? "1:2" : "1:1";
  const n = Number(p.answer.replace(/,/g, ""));
  return Number.isFinite(n) && p.answer.trim() !== "" ? String(n + (pick < 0.5 ? 1 : 10)) : p.answer === "0" ? "1" : "0";
};
/** The classic slip: add the tops and add the bottoms. Null when the question is not adding two fractions. */
const topsAndBottoms = (q: string) => { const m = /^(\d+)\/(\d+) \+ (\d+)\/(\d+) = \?/.exec((question(q) as { prompt: string }).prompt); return m ? `${Number(m[1]) + Number(m[3])}/${Number(m[2]) + Number(m[4])}` : null; };
/** How many sittings a child gets (a child who is always right needs four: mastery waits for a delayed check). */
const SITTINGS = 8;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

if (process.argv.includes("--merge")) {
  const rest = process.argv.slice(process.argv.indexOf("--merge") + 1), stop = rest.findIndex((x) => x.startsWith("--")), files = stop < 0 ? rest : rest.slice(0, stop);
  const runs = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as { board: string; grade: number; skills: number; personas: Record<string, { about: string; skills: number; mastered: number; unknowing: string[]; neverTaught: string[]; stuck: string[]; loops: string[]; errors: string[]; ended: Record<string, number>; questions: number[]; taught: number }> });
  // parts of one class (a persona each, run side by side) are put back together
  for (let i = runs.length - 1; i > 0; i--) { const first = runs.findIndex((x) => x.board === runs[i].board && x.grade === runs[i].grade); if (first < i) { Object.assign(runs[first].personas, runs[i].personas); runs.splice(i, 1); } }
  const lines = [`# Simulated children (sim@1)`, ``];
  for (const r of runs) {
    lines.push(`## ${r.board.toUpperCase()} Class ${r.grade}: ${r.skills} skills, each taken by ${Object.keys(r.personas).length} simulated children`, ``, `| Child | Mastered in 8 sittings | Sittings to master (median / most) | Questions to master (median / most) | Marked mastered without knowing it | Wrong twice, never taught | Stuck | Same question 3+ times |`, `|---|---:|---:|---:|---:|---:|---:|---:|`);
    for (const [name, p] of Object.entries(r.personas)) { const sit = (p as unknown as { sittings?: number[] }).sittings ?? []; lines.push(`| ${name} | ${p.mastered} of ${p.skills} | ${median(sit)} / ${Math.max(0, ...sit)} | ${median(p.questions)} / ${Math.max(0, ...p.questions)} | ${p.unknowing.length} | ${p.neverTaught.length} | ${p.stuck.length} | ${p.loops.length} |`); }
    lines.push(``);
    for (const [name, p] of Object.entries(r.personas)) {
      lines.push(`### ${name}: ${p.about}`, `Where each skill ended: ${Object.entries(p.ended).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ")}. Skills in which the product taught something: ${p.taught}.`);
      for (const [label, list] of [["Not mastered after eight sittings", (p as unknown as { unfinished?: string[] }).unfinished ?? []], ["Marked mastered without knowing it", p.unknowing], ["Wrong twice, never taught", p.neverTaught], ["Stuck", p.stuck], ["Same question 3+ times", p.loops], ["Errors", p.errors]] as const) if (list.length) lines.push(`- ${label}: ${list.slice(0, 12).join("; ")}${list.length > 12 ? `; and ${list.length - 12} more` : ""}`);
      lines.push(``);
    }
  }
  const out = lines.join("\n") + "\n";
  writeFileSync(process.argv.includes("--report") ? process.argv[process.argv.indexOf("--report") + 1] : "sim-report.md", out);
  console.log(out.split("\n").slice(0, 16).join("\n"));
} else {
  const grade = Number(process.env.GRADE), board = process.env.BOARD as "cbse" | "tn" | "icse", limit = Number(process.env.LIMIT ?? 0);
  const release = boardFor(board, grade);
  if (!release) throw new Error(`no release for ${board} ${grade}`);
  const ids = [...new Set(allOutcomesOf(release).flatMap(({ outcome }) => outcome.mapping.competencies.filter((m) => m.status === "accepted").map((m) => (graph.byId.has(m.id) ? graph.evidenceTarget(m.id) : m.id))))].sort().filter((s) => checkCompetency(s).mode !== "educator-marked");
  const only = process.env.SKILLS?.split(","); // SKILLS=a,b: just these skills
  const skills = only ? ids.filter((s) => only.includes(s)) : limit ? ids.slice(0, limit) : ids;
  const personas: Record<string, unknown> = {};
  useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true });
  const t0 = Date.now();
  try {
    for (const P of PERSONAS.filter((p) => !process.env.PERSONA || p.name === process.env.PERSONA)) {
      const r = { about: P.about, skills: skills.length, unfinished: [] as string[], sittings: [] as number[], mastered: 0, unknowing: [] as string[], neverTaught: [] as string[], stuck: [] as string[], loops: [] as string[], errors: [] as string[], ended: {} as Record<string, number>, questions: [] as number[], taught: 0, pausedBy: {} as Record<string, number> };
      for (const skill of skills) {
        try {
          const rand = rng(`${P.name}:${skill}`);
          let know = P.know(skill), asked = 0, wrongs = 0, taught = false, fooled = P.misconception === true;
          const seen: Record<string, number> = {};
          const d = new Driver(`sim-${P.name}-${board}-${grade}-${skill}`, Date.parse("2026-11-06T09:00:00Z"));
          d.enrol(grade, "2026-27", release);
          const answerer = (q: string) => {
            asked++; seen[q] = (seen[q] ?? 0) + 1;
            const p = question(q) as { type: string; answer: string; options?: string[] };
            if (P.guess) { const ok = p.type === "choice" && rand() < 1 / Math.max(2, (p.options ?? []).length); if (!ok) wrongs++; return ok ? p.answer : wrong(q, rand()); }
            const slipAnswer = fooled ? topsAndBottoms(q) : null;
            if (slipAnswer && slipAnswer !== p.answer) { wrongs++; return slipAnswer; }
            if (rand() < know * (1 - P.slip)) return p.answer;
            wrongs++; return wrong(q, rand());
          };
          let last = "not_started", lastPhase = "", lastWhy = "", sittings = 0;
          for (let session = 0; session < SITTINGS && last !== "verified"; session++) {
            sittings = session + 1;
            if (session) d.newSession([0, 1, 3, 9][session] ?? 9);
            for (let i = 0; i < 60; i++) {
              const st = d.state(), before = d.trace.length;
              const ms = d.step(skill, answerer, { hintOnGuided: P.hints });
              lastPhase = ms.phase; lastWhy = String((ms as { why?: string }).why ?? (ms as { reason?: string }).reason ?? "").slice(0, 70);
              // the product taught something: the child now knows more of it (and the misconception is corrected by a lesson)
              if (ms.phase === "chapter" || ms.phase === "strategy" || ms.phase === "guided") { taught = true; know += P.gain * (1 - know); if (ms.phase !== "guided") fooled = false; }
              if (d.trace.length === before || ms.phase === "done" || ms.phase === "pause" || ms.phase === "unavailable" || ms.phase === "waiting") break;
              void st;
            }
            last = d.state().evidence(skill).status;
          }
          r.ended[last] = (r.ended[last] ?? 0) + 1;
          if (taught) r.taught++;
          if (last === "verified") { r.mastered++; r.questions.push(asked); r.sittings.push(sittings); if (know < 0.5) r.unknowing.push(`${skill} (truly knows ${Math.round(know * 100)}%, ${asked} questions)`); }
          else { if (lastPhase === "pause") r.pausedBy[lastWhy] = (r.pausedBy[lastWhy] ?? 0) + 1; r.unfinished.push(`${skill} (${last}, at "${lastPhase}", ${asked} questions)`); }
          if (last !== "verified" && !["waiting", "pause", "done", "retention", "verify", "reentry"].includes(lastPhase)) r.stuck.push(`${skill} (ended ${last}, at "${lastPhase}", ${asked} questions)`);
          if (wrongs >= 2 && !taught) r.neverTaught.push(`${skill} (${wrongs} wrong of ${asked})`);
          const most = Object.entries(seen).sort((a, b) => b[1] - a[1])[0];
          if (most && most[1] >= 3) r.loops.push(`${skill} (${most[0]} asked ${most[1]} times)`);
        } catch (e) { r.errors.push(`${skill}: ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
      }
      personas[P.name] = r;
      console.log(`sim@1 ${board} ${grade} ${P.name}: mastered ${r.mastered} of ${skills.length}; fooled ${r.unknowing.length}; never taught ${r.neverTaught.length}; stuck ${r.stuck.length}; loops ${r.loops.length}; errors ${r.errors.length}; ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  } finally { useReviewFixture(null); }
  writeFileSync(process.env.OUT ?? `sim-${board}-${grade}.json`, JSON.stringify({ schema: "sim@1", board, grade, skills: skills.length, personas }) + "\n");
}
