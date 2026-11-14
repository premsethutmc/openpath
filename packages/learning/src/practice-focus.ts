/**
 * practice-focus@1: two things a learner's own answers can show that one skill at a time does not.
 *
 *   fluency       right, but slow: on a skill where speed matters (facts and written methods a child uses inside other work),
 *                 her first-try right answers usually take well over the time they should (expected-time@1). Being right is
 *                 what counts; this only says that more short practice would make the skill quick enough to lean on.
 *   slip pattern  the SAME kind of slip in DIFFERENT skills: forgetting to carry in adding and in long multiplication, a
 *                 digit in the wrong place in several topics. Each slip is a written mix-up the wrong answer matches exactly
 *                 (answer-feedback@1); a pattern needs at least two such answers in at least two different skills. One slip
 *                 says nothing; two in one skill are that skill's business (misconception-evidence@1).
 *
 * Only first, unaided answers count (evidence.ts independentAttempt). Read-only: nothing here marks, credits or changes a
 * record; it suggests what to practise next and tells a parent why. The thresholds are first settings, to be checked against
 * real answers.
 */
import { misconceptionOf, question, type Question } from "./content";
import { independentAttempt } from "./evidence";
import type { Attempt } from "./records";

export const PRACTICE_FOCUS = "practice-focus@1" as const;

/** skills where a child needs speed, not only accuracy (facts and methods used inside other work) */
export const FLUENCY_SKILLS = new Set([
  "MATH.number.multiplication-tables", "MATH.number.addition", "MATH.number.addition-regroup", "MATH.number.mental-arithmetic",
  "MATH.number.multi-digit-add-subtract", "MATH.number.multi-multiplication", "MATH.number.long-division", "MATH.number.division-remainders",
]);
export const FLUENCY = { recent: 10, minTimed: 2, slowRatio: 1.75 } as const; // a skill is often passed after two right answers: two is all there may be

export interface FluencyNeed { competency: string; timed: number; ratio: number }
/** right but slow, skill by skill: the median of time taken ÷ time expected over the latest first-try right answers */
export function fluencyNeeds(attempts: readonly Attempt[], right: (a: Attempt) => boolean, expected: (a: Attempt) => number | null, skills = FLUENCY_SKILLS): FluencyNeed[] {
  const by = new Map<string, number[]>();
  for (const a of [...attempts].sort((x, y) => (y.at < x.at ? -1 : 1))) {
    if (!skills.has(a.competency) || !independentAttempt(a) || a.n !== 1 || !right(a) || !a.ms || a.ms < 1500) continue;
    const e = expected(a); if (!e) continue;
    const list = by.get(a.competency) ?? []; if (list.length >= FLUENCY.recent) continue;
    list.push(a.ms / 1000 / e); by.set(a.competency, list);
  }
  const out: FluencyNeed[] = [];
  for (const [competency, rs] of by) {
    if (rs.length < FLUENCY.minTimed) continue;
    const s = [...rs].sort((x, y) => x - y), m = s[Math.floor(s.length / 2)];
    if (m > FLUENCY.slowRatio) out.push({ competency, timed: rs.length, ratio: Math.round(m * 10) / 10 });
  }
  return out.sort((a, b) => b.ratio - a.ratio);
}

/** kinds of slip that cross topics, each with the skill to practise it in */
export const SLIP_KINDS: { id: string; name: string; practise: string; ids: RegExp; says: RegExp }[] = [
  { id: "carrying", name: "carrying and borrowing", practise: "MATH.number.multi-digit-add-subtract", ids: /^(no-carry|no-regroup|carry|regroup|no-borrow|borrow)/, says: /\bcarr(y|ied)|regroup|borrow/i },
  { id: "place-value", name: "place value (which column a digit is in)", practise: "MATH.number.large-numbers", ids: /^(wrong-place|zeros-extra|zeros-short|zero-lost|place)/, says: /place value|wrong column|\bcolumn\b.*\b(wrong|shifted)|zeros? (was|were) (dropped|added|lost)/i },
  { id: "facts", name: "times-table facts", practise: "MATH.number.multiplication-tables", ids: /^(fact|table)/, says: /multiplication fact|times[- ]table/i },
  { id: "operation", name: "choosing the operation", practise: "MATH.reasoning.operation-choice", ids: /^(added|multiplied|subtracted|same-operation|took-away|wrong-operation|divided)$/, says: /instead of (adding|subtracting|multiplying|dividing)/i },
  { id: "subtraction-order", name: "taking the smaller digit from the larger", practise: "MATH.number.multi-digit-add-subtract", ids: /^smaller-from-larger/, says: /smaller .* from the larger|larger digit/i },
  { id: "decimal-point", name: "where the decimal point goes", practise: "MATH.number.decimal-operations", ids: /^(decimal|point)/, says: /decimal point/i },
];
export interface SlipPattern { id: string; name: string; practise: string; skills: string[]; count: number }
const kindOf = (m: { id?: string; says: string; hypothesis: string }) => SLIP_KINDS.find((k) => (m.id && k.ids.test(m.id)) || k.says.test(m.says) || (k.id === "facts" && m.hypothesis === "recall"));
/** the same kind of slip in two or more different skills */
export function slipPatterns(attempts: readonly Attempt[], q: (id: string) => Question | null = (id) => { try { return question(id); } catch { return null; } }): SlipPattern[] {
  const seen = new Map<string, { skills: Set<string>; count: number }>();
  for (const a of attempts) {
    if (!independentAttempt(a) || a.n !== 1) continue;
    const qq = q(a.questionId); if (!qq) continue;
    const m = misconceptionOf(qq, a.response); if (!m) continue;
    const k = kindOf(m); if (!k) continue;
    const s = seen.get(k.id) ?? { skills: new Set<string>(), count: 0 };
    s.skills.add(a.competency); s.count++; seen.set(k.id, s);
  }
  return SLIP_KINDS.flatMap((k) => { const s = seen.get(k.id); return s && s.count >= 2 && s.skills.size >= 2 ? [{ id: k.id, name: k.name, practise: k.practise, skills: [...s.skills], count: s.count }] : []; });
}
