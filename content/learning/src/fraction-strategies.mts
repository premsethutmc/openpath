/**
 * Authoring source for the skill-scoped fraction explanations added to the two hand-written fraction modules in
 * content/learning/modules.v1.json (MATH.number.equivalent-fractions, MATH.number.fraction-comparison). The hand-written
 * chapters and explanations are kept unchanged; these strategies are ADDED (replaced by id when re-run), each scoped to one
 * skill of packages/learning/src/subskill-config-fractions.ts, as the existing fraction-models module already does.
 * Text reuses the hand-written chapters ("same pieces"), the family teaching hints and the feat/math-teaching-content@4e655e73
 * candidate TP-NUM-01 (same top number); explanation text has no instance numbers; every worked line is the generator's own
 * step for the screen's instance, followed by the answer (or, for a choice, the chosen option) and, where it applies, a check.
 * No misconception-specific fix is added: the modelled fraction mistakes (bigger-bottom-bigger, as-given, ...) are shared by
 * several skills, and misconception evidence is not yet keyed by skill. Every explanation is a candidate pending review.
 *   cd frontend && node --import tsx ../content/learning/src/fraction-strategies.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { explainStep, exposureKey, FAMILIES, phasePool, problemOf, type Problem } from "../../../packages/learning/src/families";
import { selectable } from "../../../packages/learning/src/question-status";
import { connectedSkill } from "../../../packages/learning/src/skill-connections";
import { FRACTION_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-fractions";

const file = new URL("../modules.v1.json", import.meta.url);
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const worked = (p: Problem) => [p.prompt.replace(/ Write (that fraction|them in brackets, separated by commas)\.$/, "").replace(/ \(.*?\)/g, ""), ...p.steps.map((s) => explainStep(p, s))];
const answerLine = (p: Problem) => [...worked(p), `So the answer is ${p.answer}`];
const optionLine = (p: Problem) => [...worked(p), `So: ${(p as Problem & { options: string[] }).options["ABCDEFGH".indexOf(String(p.answer))]}`];
/** eqfrac [a, b, d]: the generator's lines, then an independent check by cross-multiplying */
const eqMath = (p: Problem) => { const [a, b, d] = p.params, x = Number(p.answer); return [...worked(p), `Check by cross-multiplying: ${a} × ${d} = ${a * d} and ${b} × ${x} = ${b * x}, so ${a}/${b} = ${x}/${d}`]; };
/** the question's own picture; for unlike comparison, the family's two-strip teaching picture (both fractions, each strip
 * shaded for its own fraction). The same-bottom/same-top teaching pictures show only the first fraction, so they are not used. */
const fig = (p: Problem) => {
  if (p.figure) return { widget: p.figure as Record<string, unknown> };
  const v = p.family === "adfcmpu" ? (FAMILIES.get(p.family) as unknown as { teach?: { visual?: (x: number[]) => Record<string, unknown> } }).teach?.visual?.(p.params) : undefined;
  return v ? { widget: v } : {};
};

interface Spec { id: string; title: string; kind: "conceptual" | "procedural"; family: string; subSkill: string; text: string[]; math: (p: Problem) => string[]; example?: (p: Problem) => boolean }
const FCMP = "MATH.number.fraction-comparison", EQF = "MATH.number.equivalent-fractions";
const SPECS: Record<string, Spec[]> = {
  [FCMP]: [
    { id: "compare_same_bottom", title: "Same bottom number: count the pieces", kind: "conceptual", family: "adfcmp", subSkill: "fraction.compare-same-bottom@1", math: answerLine, text: ["When the bottom numbers are the same, the pieces are the same size.", "Then compare the top numbers: the fraction with more pieces is greater, and the one with fewer pieces is smaller."] },
    { id: "compare_same_top", title: "Same top number: more parts are smaller parts", kind: "conceptual", family: "adfcmp", subSkill: "fraction.compare-same-top@1", math: answerLine, text: ["The bottom number says how many equal parts the whole is cut into. Cutting the same whole into more parts makes each part smaller.", "So with the same top number, the fraction with the smaller bottom number is greater."] },
    { id: "order_same_bottom", title: "Order fractions with the same bottom number", kind: "procedural", family: "adford", subSkill: "fraction.order-same-bottom@1", math: answerLine, text: ["With the same bottom number the pieces are the same size.", "Order the fractions by their top numbers, from the fewest pieces to the most."] },
    { id: "order_same_top", title: "Order fractions with the same top number", kind: "procedural", family: "adford", subSkill: "fraction.order-same-top@1", math: answerLine, text: ["With the same top number, more equal parts in the whole means smaller parts.", "So the fraction with the biggest bottom number is the smallest: order from the biggest bottom number to the smallest."] },
    { id: "compare_unlike", title: "Different tops and bottoms: use a common bottom number", kind: "procedural", family: "adfcmpu", subSkill: "fraction.compare-unlike@1", math: answerLine, text: ["When the bottom numbers are different, the pieces are different sizes, so the top numbers cannot be compared yet.", "Rewrite both fractions with a common bottom number, then compare the top numbers."] },
    { id: "order_unlike", title: "Order unlike fractions with a common bottom number", kind: "procedural", family: "adfordu", subSkill: "fraction.order-unlike@1", math: answerLine, text: ["Rewrite all three fractions with a common bottom number, so the pieces are the same size.", "Then order them by their top numbers, from the smallest to the largest."] },
  ],
  [EQF]: [
    { id: "equivalent_missing_part", title: "The missing part: the same multiplier top and bottom", kind: "procedural", family: "eqfrac", subSkill: "fraction.equivalent-missing-part@1", math: eqMath, example: (p) => p.params[2] / p.params[1] > 1, text: ["Equal fractions cover the same amount: cutting every piece into the same number of smaller pieces multiplies the top and the bottom by the same number.", "Find what the bottom was multiplied by, and multiply the top by the same number. Check that both were multiplied by the same number."] },
    { id: "lowest_terms", title: "Lowest terms: divide by the highest common factor", kind: "procedural", family: "avlow", subSkill: "fraction.lowest-terms@1", math: answerLine, example: (p) => p.params[2] > 2, text: ["A fraction is in its lowest terms when its top and bottom have no common factor other than one.", "Find the highest common factor of the top and the bottom, and divide both by it, so the fraction stays equal."] },
    { id: "equal_by_folding", title: "Folding makes an equal fraction", kind: "conceptual", family: "avfold", subSkill: "fraction.equal-by-folding@1", math: optionLine, text: ["Folding every strip into the same number of parts cuts each strip into smaller equal parts.", "The coloured parts and all the parts are both multiplied by the same number, so the same amount is coloured: an equal fraction."] },
  ],
};

const doc = JSON.parse(readFileSync(file, "utf8"));
for (const [competency, specs] of Object.entries(SPECS)) {
  const config = FRACTION_PATTERN_CONFIGS.find((c) => c.competency === competency)!;
  const m = doc.modules.find((x: { competency: string }) => x.competency === competency);
  const ours = new Set(specs.map((s) => s.id));
  const kept = m.strategies.filter((s: { id: string }) => !ours.has(s.id));
  // exposures the hand-written module already shows or asks (its own strategies may use generated ids too) are not reused
  const used = new Set<string>(kept.flatMap((s: { guided: string; check: string; screens: { instance?: string }[] }) => [s.guided, s.check, ...s.screens.map((x) => x.instance ?? "")]).filter((x: string) => x.startsWith("gen:")).map(exposureKey));
  const pick = (family: string, phase: "practice" | "check", ok: (id: string) => boolean, form: "typed" | "any") => {
    const id = [...phasePool(family, phase)].reverse().filter(selectable).find((x) => (form === "any" || !x.endsWith(":mc")) && ok(x) && !used.has(exposureKey(x)));
    if (!id) throw new Error(`no ${phase} item for ${family}`);
    used.add(exposureKey(id));
    return id;
  };
  const added = specs.map((s) => {
    const inSkill = (id: string) => connectedSkill(config, id) === s.subSkill;
    const inst = P(pick(s.family, "practice", (x) => inSkill(x) && (!s.example || s.example(P(x))), "typed"));
    const guided = pick(s.family, "practice", inSkill, "any");
    const check = pick(s.family, "check", inSkill, "any");
    return { id: s.id, title: s.title, kind: s.kind, needs: [], screens: [{ title: s.title, text: s.text, math: s.math(inst), role: "strategy", instance: inst.id, ...fig(inst) }], guided, check, scope: { family: s.family, subSkill: s.subSkill } };
  });
  m.strategies = [...kept, ...added];
}
writeFileSync(file, JSON.stringify(doc, null, 1) + "\n");
console.log("added", Object.values(SPECS).flat().length, "scoped fraction explanations");
process.exit(0);
