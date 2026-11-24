/**
 * placements@1: real sittings of the word check and Find my level, as the server lists them (backend/family/placements.py),
 * put into lines a person can compare with what they know about the learner. Nothing is judged here.
 */
export type Answer = { level: number | null; right?: boolean | number; asked?: string | number; kind?: "know" | "pick"; outcome?: "right" | "wrong" | "unknown" | "yes" | "no" };
export type Sitting = { part: "words" | "reading" | "listening" | "spelling" | "grammar" | "gaps"; at: string; mode?: string | null; start?: number; level: number | null; low?: number | null; high?: number | null; finished?: boolean; answers: Answer[] };
export type LearnerPlacements = { learner: string; mine: boolean; shared: boolean; sittings: Sitting[] };
export type Placements = { placements: LearnerPlacements[]; days: number; everyone: boolean };

export const PART: Record<Sitting["part"], string> = { words: "Word check", gaps: "Quick check (gaps)", reading: "Reading", listening: "Listening", spelling: "Spelling", grammar: "Grammar" };
const OF: Partial<Record<Sitting["part"], number>> = { words: 8, gaps: 8 };

/** Was the answer right? An invented word (level 0) is right when the learner said they do not know it. */
export function ok(a: Answer): boolean {
  if (a.outcome) return a.level === 0 ? a.outcome === "no" : a.outcome === "yes" || a.outcome === "right";
  return a.right === true;
}

/** "Level 5 of 8, could be 4 to 6", or that the sitting was not finished. */
export function resultLine(s: Sitting): string {
  if (s.level === null || s.level === undefined) return "not finished";
  const of = OF[s.part] ? ` of ${OF[s.part]}` : "";
  const range = typeof s.low === "number" && typeof s.high === "number" && s.low !== s.high ? `, could be ${s.low} to ${s.high}` : "";
  return `level ${s.level}${of}${range}`;
}

/** The answers by level, lowest first: "L2 ✓✓ · L4 ✓✗ · L6 ✗". Invented words are counted apart. A reading text is "L3 5/6". */
export function byLevel(s: Sitting): string {
  const real = s.answers.filter((a) => a.level !== 0 && a.level !== null);
  const levels = [...new Set(real.map((a) => a.level as number))].sort((x, y) => x - y);
  return levels
    .map((l) => {
      const at = real.filter((a) => a.level === l);
      const marks = at.map((a) => (typeof a.right === "number" ? ` ${a.right}/${a.asked}` : ok(a) ? "✓" : "✗")).join("");
      return `L${l} ${marks.trim()}`;
    })
    .join(" · ");
}

/** Invented words in a word check: how many were asked, and how many the learner said they knew. */
export function invented(s: Sitting): { asked: number; claimed: number } {
  const fake = s.answers.filter((a) => a.level === 0);
  return { asked: fake.length, claimed: fake.filter((a) => a.outcome === "yes").length };
}

/** Every word asked with its outcome, for a learner shown in full: "glad (1) knew · abhor (6) wrong". */
export function wordsLine(s: Sitting): string {
  const say = (a: Answer) => (a.outcome === "yes" ? "said knows" : a.outcome === "no" ? "said does not know" : a.outcome === "unknown" ? "not sure" : ok(a) ? "right" : "wrong");
  return s.answers.filter((a) => typeof a.asked === "string").map((a) => `${a.asked} (${a.level === 0 ? "invented" : a.level}) ${say(a)}`).join(" · ");
}

const when = (iso: string) => iso.slice(0, 16).replace("T", " ");

/** The whole list as plain text, to copy and send. */
export function summaryText(d: Placements): string {
  const out: string[] = [`Placements, last ${d.days} days (times in UTC)`];
  for (const l of d.placements) {
    out.push("", `${l.learner}${l.mine ? "" : l.shared ? " (shared)" : " (no name)"}`);
    for (const s of l.sittings) {
      const fake = invented(s);
      out.push(`- ${PART[s.part]}, ${when(s.at)}: ${resultLine(s)}${s.part === "words" && typeof s.start === "number" ? `, started at ${s.start}` : ""}, ${s.answers.length} answers`);
      if (s.answers.length) out.push(`  ${byLevel(s)}${fake.asked ? ` · invented words claimed ${fake.claimed} of ${fake.asked}` : ""}`);
      const words = wordsLine(s);
      if (words) out.push(`  ${words}`);
    }
  }
  return out.join("\n");
}
