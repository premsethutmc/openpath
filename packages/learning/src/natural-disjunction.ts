/**
 * B2: zero-product and square-root branch lines on the statement-text route ("x - 2 = 0 or x - 3 = 0", "2x + 1 = 7 or 2x + 1 = -7").
 *
 * The shared line parser (natural-working.ts, also inside the server grader bundle) reads "x = a or x = b" as a solution set and refuses any other
 * disjunction ("solution branches must name one variable"). This module does not change that parser: when the whole working is refused, every
 * refused line that is a disjunction of 2 to 8 equations, each read by the SAME parser as exactly one equation, becomes a `disjunction` relation and
 * the rest of the working is parsed unchanged. Nothing here derives anything from the relation; only the P2 derivation authority judges such a line.
 */
import { parseNaturalWorking, type NaturalParseResult, type NaturalRelation, type NaturalWorkingInput } from "./natural-working.ts";

export type EquationRelation = Extract<NaturalRelation, { kind: "equation" }>;
export interface DisjunctionRelation { kind: "disjunction"; parts: EquationRelation[] }

const OR = /\s+(?:or|∨)\s+/i;
function branches(row: string, input: NaturalWorkingInput): EquationRelation[] | null {
  const bs = row.trim().split(OR);
  if (bs.length < 2 || bs.length > 8 || bs.every((b) => /^\s*[A-Za-z]\w*\s*=/.test(b))) return null;   // all "x = a": the shared parser's solution set
  const parts: EquationRelation[] = [];
  for (const b of bs) {
    if ((b.match(/=/g) ?? []).length !== 1 || /[<>≤≥≠⇔]|!=|\\/.test(b)) return null;
    const p = parseNaturalWorking({ ...input, text: b });
    if (p.classification !== "parsed" || p.lines.length !== 1 || p.lines[0].relation.kind !== "equation" || p.lines[0].restrictions?.length) return null;
    parts.push(p.lines[0].relation as EquationRelation);
  }
  return parts;
}
export function parseWorkingWithDisjunctions(input: NaturalWorkingInput): NaturalParseResult {
  const first = parseNaturalWorking(input);
  if (first.classification === "parsed" || !input || typeof input.text !== "string") return first;
  const rows = input.text.split("\n"), found = new Map<number, EquationRelation[]>();
  const patched = rows.map((row, i) => {
    if (/^\s*(?:\d+\)|\d+\.)\s/.test(row)) return row;                          // numbered rows keep the shared parser's verdict
    const parts = branches(row, input); if (!parts) return row;
    found.set(i, parts);
    return row.replace(/\S(?:[\s\S]*\S)?/, (m) => "0 = 0".padEnd(m.length, " "));   // same length: every later source offset is unchanged
  });
  if (!found.size) return first;
  const second = parseNaturalWorking({ ...input, text: patched.join("\n") });
  if (second.classification !== "parsed") return first;
  const lines = second.lines.map((l) => {
    const parts = found.get(l.source.line - 1); if (!parts) return l;
    const text = rows[l.source.line - 1].trim();
    return { ...l, relation: { kind: "disjunction", parts } as unknown as NaturalRelation, source: { ...l.source, text, end: l.source.start + text.length } };
  });
  if (lines.filter((l) => (l.relation as { kind: string }).kind === "disjunction").length !== found.size) return first;
  return { ...second, lines };
}
