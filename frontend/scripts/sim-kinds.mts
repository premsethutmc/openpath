/**
 * Simulated readers on Poems and everyday texts (logic/reading/kinds): each reader has a hidden reading ability on
 * the 1–7 scale, starts at the reading level Find my level would give (ability rounded down, 1 to 6), and reads one
 * text every other day for 70 days. A question is answered right with the same chance curve as the main simulation
 * (three choices, so a lucky guess is possible). Reports how often a text was too hard (under half right), too easy
 * (all right), the level reached, and whether the reader ran out of texts.
 *   node --import tsx scripts/sim-kinds.mts [--runs 20] [--md ../docs/english/SIM_KINDS.md]
 */
import { writeFileSync } from "node:fs";
import { KINDS, nextKind, type KindRecord } from "../src/english/logic/reading/kinds.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const RUNS = Number(opt("--runs", "20"));
const READERS = [
  { name: "early", ability: 1.6, slip: 0.03 },
  { name: "average", ability: 3.5, slip: 0.03 },
  { name: "strong", ability: 5.6, slip: 0.02 },
  { name: "very strong (Class 8)", ability: 7.2, slip: 0.02 },
  { name: "careless", ability: 3.5, slip: 0.2 },
];
const rng = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rows: string[] = [];
for (const p of READERS) {
  let hard = 0, easy = 0, texts = 0, ran = 0, top = 0, gap = 0;
  for (let run = 0; run < RUNS; run++) {
    const r = rng(`${p.name}|${run}`);
    let ability = p.ability;
    const start = Math.max(1, Math.min(6, Math.floor(ability)));
    const recs: KindRecord[] = [];
    for (let day = 0; day < 70; day += 2) {
      const t = nextKind(KINDS, recs, start);
      if (!t) {
        ran++;
        break;
      }
      const answers = t.questions.map((q) => {
        const know = 1 / (1 + Math.exp(-2 * (ability - t.level + 0.5)));
        const correct = r() < know * (1 - p.slip) || r() < 1 / 3;
        return { skill: q.skill, correct };
      });
      const right = answers.filter((a) => a.correct).length;
      texts++;
      if (right / answers.length < 0.5) hard++;
      if (right === answers.length) easy++;
      gap += Math.abs(t.level - ability);
      if (t.level >= ability - 0.5) ability = Math.min(7.5, ability + 0.02);
      recs.push({ type: "text", text: t.id, answers });
    }
    top += Math.max(...recs.map((x) => KINDS.texts.find((t) => t.id === x.text)!.level));
  }
  const pct = (x: number) => `${Math.round((100 * x) / texts)}%`;
  rows.push(`| ${p.name} | ${(texts / RUNS).toFixed(1)} | ${pct(hard)} | ${pct(easy)} | ${(gap / texts).toFixed(1)} | ${(top / RUNS).toFixed(1)} | ${Math.round((100 * ran) / RUNS)}% |`);
}
const md = [
  "# Simulated readers: Poems and everyday texts",
  "",
  `${KINDS.texts.length} texts, levels 1 to 7. ${RUNS} runs per reader; one text every other day for 70 days.`,
  "",
  "| Reader | Texts read | Too hard | All right | Distance from ability | Highest level | Ran out of texts |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...rows,
  "",
].join("\n");
console.log(md);
const out = opt("--md", "");
if (out) writeFileSync(out, md);
