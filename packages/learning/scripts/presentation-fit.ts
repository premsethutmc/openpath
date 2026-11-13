/**
 * presentation-fit@1: does each question read and answer in a way that suits the grade it is served to?
 * Rules only (no educator, no model): they judge wording and layout, never whether a child finds the question clear.
 *
 *   node --import tsx packages/learning/scripts/presentation-fit.ts [grade=5] [--json out.json]
 */
import { writeFileSync } from "node:fs";
import { moduleFor, poolFamilies, question, type Question } from "../src/content";
import { BOARD_STEM, boardFor, type BoardId } from "../src/curricula";
import { FAMILIES, pool } from "../src/families";

/** What a grade band can be expected to read. Sentence limits in words. */
export const profileFor = (grade: number) => (grade <= 2 ? { sentence: 12, prompt: 25 } : grade <= 5 ? { sentence: 20, prompt: 45 } : grade <= 8 ? { sentence: 26, prompt: 60 } : { sentence: 32, prompt: 80 });

export type Flag = "long-sentence" | "long-prompt" | "data-twice" | "shape-without-picture" | "pick-but-typed" | "several-asks";
const SHAPE = /\b(angle|triangle|quadrilateral|rectangle|square|circle|polygon|parallel|perpendicular|cuboid|cube|cylinder|cone|net of|line segment|symmetr)/i;
const NOT_SHAPE = /perfect squares?|square (numbers?|roots?|cent\w+|met\w+|kilo\w+|units?)|squared|cube (numbers?|roots?)|cubed|\bcubic\b/gi;
const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
const sentences = (s: string) => s.split(/(?<=[.?!])\s+(?=[A-Z])/).filter((x) => x.trim());
const numbersIn = (s: string) => [...s.matchAll(/\d+(?:\.\d+)?/g)].map((m) => m[0]);

export function fit(q: Pick<Question, "prompt" | "type" | "answer" | "figure" | "options" | "competency" | "picks">, grade: number): Flag[] {
  const p = profileFor(grade);
  const out: Flag[] = [];
  const ss = sentences(q.prompt);
  if (ss.some((s) => words(s).length > p.sentence)) out.push("long-sentence");
  if (words(q.prompt).length > p.prompt) out.push("long-prompt");
  // the same values written in the sentence and again in a table shown beside it
  const fig = q.figure ? JSON.stringify(q.figure) : "";
  const inPrompt = numbersIn(q.prompt);
  if (q.figure?.type === "table") {
    const inFig = new Set(numbersIn(fig));
    const shared = new Set(inPrompt.filter((n) => inFig.has(n)));
    if (shared.size >= 3) out.push("data-twice");
  }
  if (!q.figure && SHAPE.test(q.prompt.replace(NOT_SHAPE, ""))) out.push("shape-without-picture");
  const labelled = [...q.prompt.matchAll(/\b[A-Z] = (\d+(?:\.\d+)?)/g)].map((m) => m[1]);
  // the answer is one of several values the question itself lists: tapping it tests the same thing without typing
  if (q.type !== "choice" && !q.options?.length && !q.picks?.length && /^\d+(\.\d+)?$/.test(q.answer) && /\b(which|pick|choose)\b/i.test(q.prompt) && labelled.length >= 3 && labelled.includes(q.answer)) out.push("pick-but-typed");
  if ((q.prompt.match(/[A-Za-z0-9)]\?(?=\s+[A-Z(]|\s*$)/g) ?? []).length > 1) out.push("several-asks");
  return out;
}

// several-asks counts real questions only: a "?" standing for a missing value is not one
if (process.argv[1]?.endsWith("presentation-fit.ts")) {
  const grade = Number(process.argv[2] ?? 5);
  const jsonAt = process.argv.indexOf("--json");
  const report: Record<string, unknown> = { policy: "presentation-fit@1", grade, profile: profileFor(grade), boards: {} };
  for (const board of Object.keys(BOARD_STEM) as BoardId[]) {
    const rel = boardFor(board, grade);
    if (!rel) continue;
    const comps = new Set<string>();
    for (const s of (rel as unknown as { subjects: { chapters: { outcomes: { mapping?: { competencies?: { id: string; status: string }[] } }[] }[] }[] }).subjects) for (const c of s.chapters) for (const o of c.outcomes) for (const m of o.mapping?.competencies ?? []) if (m.status === "accepted") comps.add(m.id);
    const fams = new Set<string>();
    for (const c of comps) {
      const m = moduleFor(c);
      if (m) for (const f of poolFamilies(m)) if (FAMILIES.has(f)) fams.add(f);
    }
    const counts: Record<string, number> = {};
    const byFamily: Record<string, { title: string; total: number; flagged: number; flags: Record<string, number>; example: string }> = {};
    let total = 0, flagged = 0;
    for (const f of fams) {
      const row = { title: FAMILIES.get(f)!.title, total: 0, flagged: 0, flags: {} as Record<string, number>, example: "" };
      for (const it of pool(f).items) {
        const q = question(it.id);
        const fl = fit(q, grade);
        row.total++; total++;
        if (fl.length) { row.flagged++; flagged++; if (!row.example) row.example = q.prompt; }
        for (const x of fl) { row.flags[x] = (row.flags[x] ?? 0) + 1; counts[x] = (counts[x] ?? 0) + 1; }
      }
      byFamily[f] = row;
    }
    const famFlagged = Object.values(byFamily).filter((r) => r.flagged > 0).length;
    (report.boards as Record<string, unknown>)[board] = { release: `${rel.id}@${rel.version}`, skills: comps.size, families: fams.size, familiesFlagged: famFlagged, questions: total, flagged, counts, byFamily };
    console.log(`${board} g${grade}: ${fams.size} families (${famFlagged} flagged), ${total} questions, ${flagged} flagged (${((100 * flagged) / Math.max(1, total)).toFixed(1)}%)`, counts);
  }
  if (jsonAt > 0) writeFileSync(process.argv[jsonAt + 1], JSON.stringify(report, null, 1) + "\n");
}
