import { Rational, rat } from "../claim-kit";
import type { ClaimTable, Problem, Step } from "../claim-kit";

/** Phase 3 claims: j-clocks-time-volume. Each value is recomputed from the prompt / the picture's data and the step
 *  inputs by plain arithmetic, never from the family's solver. */

const int = (x: unknown): bigint | null => (typeof x === "number" && Number.isInteger(x) ? BigInt(x) : typeof x === "string" && /^-?\d+$/.test(x.trim()) ? BigInt(x.trim()) : null);
const pad2 = (n: number) => String(n).padStart(2, "0");

/* ------------------------------------------------------------------ clock figure */
const clockFig = (p: Problem): { h: number; m: number } | null => {
  const f = p.figure as { type?: string; h?: unknown; m?: unknown } | undefined;
  if (!f || f.type !== "clock" || !Number.isInteger(f.h) || !Number.isInteger(f.m)) return null;
  const h = f.h as number, m = f.m as number;
  return h >= 1 && h <= 12 && m >= 0 && m < 60 ? { h, m } : null;
};
/** "h:mm" on a 12-hour clock -> minutes after 12:00 (12 counts as 0), or null. */
const clockMinutes = (t: unknown): number | null => {
  if (typeof t !== "string") return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), mm = Number(m[2]);
  return h >= 1 && h <= 12 && mm < 60 ? (h % 12) * 60 + mm : null;
};

/* ------------------------------------------------------------------ acelapsed */
/** inputs [h, m]: the clock picture shows h:m; the step states the time as "h:mm". */
const acelapsedRead = (s: Step, p: Problem): boolean | null => {
  const fig = clockFig(p);
  if (!fig || s.inputs.length !== 2 || int(s.inputs[0]) !== BigInt(fig.h) || int(s.inputs[1]) !== BigInt(fig.m)) return null;
  return s.value === `${fig.h}:${pad2(fig.m)}`;
};
/** inputs [from, to] (times "h:mm"): minutes counted on from `from` to `to` on a 12-hour clock. Each end must be tied to
 *  the facts: the start is the picture's time (or the next o'clock after it), the end is the time the prompt says the
 *  play ends (or that next o'clock). */
const acelapsedCount = (s: Step, p: Problem): Rational | null => {
  const fig = clockFig(p);
  const end = p.prompt.match(/^A school play starts at the time shown on the clock\. It ends at (\d{1,2}:\d{2})\. How many minutes does the play last\?$/);
  if (!fig || !end || s.inputs.length !== 2) return null;
  const start = (fig.h % 12) * 60 + fig.m;
  const nextHour = (Math.floor(start / 60) + 1) * 60 % 720;
  const endAt = clockMinutes(end[1]);
  const a = clockMinutes(s.inputs[0]), b = clockMinutes(s.inputs[1]);
  if (endAt === null || a === null || b === null) return null;
  const okFrom = a === start || a === nextHour;
  const okTo = b === endAt || b === nextHour;
  if (!okFrom || !okTo || a === b || (a === nextHour && b === nextHour)) return null;
  if (a === nextHour && b !== endAt) return null;
  if (a === start && b === start) return null;
  const d = (b - a + 720) % 720;
  return d === 0 ? null : rat(BigInt(d));
};

/* ------------------------------------------------------------------ accal */
const HAND = /^The hour hand of a clock points to (\d+)\. Where will it point (\d+) hours later\?$/;
const SUM9 = /^On a calendar, the nine dates of a 3 × 3 block add up to (\d+)\. What is the date in the middle of the block\?$/;
const handFacts = (p: Problem): { x: bigint; y: bigint } | null => {
  const m = p.prompt.match(HAND);
  if (!m) return null;
  const x = BigInt(m[1]), y = BigInt(m[2]);
  if (x < 1n || x > 12n) return null;
  const fig = p.figure as { type?: string; h?: unknown } | undefined;
  if (fig && fig.type === "clock" && fig.h !== Number(x)) return null;
  return { x, y };
};
/** Two prompts use "divide". Calendar block: nine dates add up to S; the middle date is S / 9 (inputs [S, 9]).
 *  Hour hand: only the part of the y hours beyond whole 12-hour turns matters; inputs [y, 12], value y mod 12. */
const accalDivide = (s: Step, p: Problem): Rational | null => {
  const hand = handFacts(p);
  if (hand) return s.inputs.length === 2 && int(s.inputs[0]) === hand.y && int(s.inputs[1]) === 12n ? rat(hand.y % 12n) : null;
  const sum = p.prompt.match(SUM9);
  if (!sum) return null;
  return s.inputs.length === 2 && int(s.inputs[0]) === BigInt(sum[1]) && int(s.inputs[1]) === 9n ? new Rational(BigInt(sum[1]), 9n) : null;
};
/** Hour hand at x, y hours later; inputs [x, y mod 12]. Step the hand round one hour at a time (12 -> 1). */
const accalCountOn = (s: Step, p: Problem): Rational | null => {
  const hand = handFacts(p);
  if (!hand || s.inputs.length !== 2 || int(s.inputs[0]) !== hand.x || int(s.inputs[1]) !== hand.y % 12n) return null;
  let h = Number(hand.x);
  for (let i = 0n; i < hand.y % 12n; i++) h = h === 12 ? 1 : h + 1;
  return rat(BigInt(h));
};

/* ------------------------------------------------------------------ abdisp */
/** The water level and the object's volume add up to the new reading (1 ml = 1 cm³). The final answer step has no inputs. */
const abdispVolume = (s: Step, p: Problem): Rational | null => {
  if (s.inputs.length !== 0) return null;
  const t = p.prompt;
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^A measuring jar has water up to the (\d+) ml mark\. A stone is dropped in and sinks; the water rises to the (\d+) ml mark\. What is the volume of the stone, in cm³\? \(1 ml = 1 cm³\)$/))) {
    const a = BigInt(m[1]), b = BigInt(m[2]);
    return b > a ? rat(b - a) : null; // volume = new reading - old reading
  }
  if ((m = t.match(/^A measuring jar has water up to the (\d+) ml mark\. A metal block of volume (\d+) cm³ is dropped in and sinks\. To which mark \(in ml\) does the water rise\? \(1 ml = 1 cm³\)$/))) {
    return rat(BigInt(m[1]) + BigInt(m[2])); // new reading = old reading + volume
  }
  if ((m = t.match(/^A measuring jar has water up to the (\d+) ml mark\. (\d+) equal glass marbles are dropped in; the water rises to the (\d+) ml mark\. What is the volume of one marble, in cm³\? \(1 ml = 1 cm³\)$/))) {
    const a = BigInt(m[1]), n = BigInt(m[2]), b = BigInt(m[3]);
    return n >= 1n && b > a ? new Rational(b - a, n) : null; // rise shared among the marbles
  }
  return null;
};

export const CLAIMS: ClaimTable = {
  "acelapsed/read clock": { check: acelapsedRead },
  "acelapsed/count on": acelapsedCount,
  "accal/divide": accalDivide,
  "accal/count on": accalCountOn,
  "abdisp/volume": abdispVolume,
};
/** For each key: "prompt-independent" (facts come from the prompt text or params) or "figure-consistent" (the only source is the data of the picture the family emitted). */
export const BASIS: Record<string, "prompt-independent" | "figure-consistent"> = {
  "acelapsed/read clock": "figure-consistent", // the start time exists only in the clock picture
  "acelapsed/count on": "figure-consistent", // end time is in the prompt, but the start time is only in the clock picture
  "accal/divide": "prompt-independent",
  "accal/count on": "prompt-independent",
  "abdisp/volume": "prompt-independent",
};
