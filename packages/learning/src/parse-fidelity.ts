/**
 * E7 repair E: a parse that feeds a judgment must keep what the student wrote. `parseFidelityLoss` compares the numerals of the source text with the numeric content of
 * the parsed object; a numeral the parse dropped means the judgment would be about a different expression, so the caller must answer `unsupported`, never `invalid`.
 * The parsed object is read structurally (any {value|numerator,denominator|exponent|index} leaf), so one check serves every route that uses the shared natural parser.
 */
const numeralsOf = (text: string): number[] => (text.replace(/^\s*(?:\d+\)\s*|\d+\.(?:\s+|$))/, "").replace(/[A-Za-z_]+\d+/g, " ").match(/(?<![A-Za-z_\d.])\d+(?:\.\d+)?/g) ?? []).map(Number);
function leaves(node: unknown, out: Set<number>): void {
  if (node === null || node === undefined) return;
  if (typeof node === "number") { out.add(node); return; }
  if (typeof node === "string") { if (/^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(node)) { const [n, d] = node.split("/"); out.add(Math.abs(Number(n) / (d ? Number(d) : 1))); out.add(Math.abs(Number(n))); if (d) out.add(Number(d)); } return; }
  if (typeof node === "bigint") { out.add(Number(node)); return; }
  if (Array.isArray(node)) { node.forEach((x) => leaves(x, out)); return; }
  if (typeof node === "object") for (const [k, v] of Object.entries(node as Record<string, unknown>)) { if (k === "source" || k === "text" || k === "notation") continue; leaves(v, out); }
}
export function parseFidelityLoss(sourceText: string, parsed: unknown): string | null {
  const have = new Set<number>(); leaves(parsed, have);
  for (const v of numeralsOf(sourceText)) {
    if (have.has(v) || have.has(-v)) continue;
    // 0.5 written as .5, percentages and powers of ten are folded by the parser; a folded numeral is still present as a value of a larger constant
    if ([...have].some((h) => h !== 0 && Number.isFinite(h) && (Math.abs(h) % v === 0 && v > 1 && Number.isInteger(h / v) || Math.abs(h * 100 - v) < 1e-9))) continue;
    return `the numeral ${v} of "${sourceText.trim().slice(0, 40)}" does not survive parsing`;
  }
  return null;
}
