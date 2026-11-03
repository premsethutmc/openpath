/**
 * Authoring source for the unit-value teaching blueprints (pictographs, scaled bar charts, place value: tens) and the
 * unit-conversion blueprints (money in rupees and paise, length conversion, scale drawings; subskill-config-conversion.ts) in
 * content/learning/blueprints.v1.json. One general, skill-scoped explanation per configured sub-skill
 * (packages/learning/src/subskill-config-scale.ts), plus the misconception fix whose evidence needs no contrast.
 * Text reuses the teaching candidates on feat/math-teaching-content@4e655e73 (TP2-SCL-PICT, TP2-SCL-BAR, TP2-PV-DIGIT)
 * and the families' own teaching hints; every worked line comes from the generator's own steps for the screen's instance.
 * The template modules' prerequisite pointer (check_what_it_uses) is not carried over: it has no skill scope, so its drawn
 * guided and check questions could fall in any skill and be counted as that skill's teaching.
 * Every explanation is a candidate: the review registry records it as pending review; nothing here approves anything.
 *   cd frontend && node --import tsx ../content/learning/src/scale-blueprints.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { explainStep, exposureKey, FAMILIES, phasePool, problemOf, type Problem } from "../../../packages/learning/src/families";
import { selectable } from "../../../packages/learning/src/question-status";
import { connectedSkill } from "../../../packages/learning/src/skill-connections";
import { SCALE_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-scale";
import { CONVERSION_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-conversion";
import { INVERSE_PATTERN_CONFIGS } from "../../../packages/learning/src/subskill-config-inverse";

const file = new URL("../blueprints.v1.json", import.meta.url);
const AUTHOR = "OpenPath (written with AI assistance; not educator-reviewed)";
const worked = (p: Problem) => [p.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...p.steps.map((s) => explainStep(p, s))];
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const fig = (p: Problem) => (p.figure ? { widget: p.figure as Record<string, unknown> } : {});
const configOf = (c: string) => [...SCALE_PATTERN_CONFIGS, ...CONVERSION_PATTERN_CONFIGS, ...INVERSE_PATTERN_CONFIGS].find((x) => x.competency === c)!;

interface Spec { id: string; title: string; kind: "conceptual" | "procedural"; family: string; subSkill: string; text: string[]; extra?: (p: Problem) => boolean; example?: (p: Problem) => boolean; addresses?: string; misconception?: (p: Problem) => string[]; regroup?: boolean; conclude?: boolean; math?: (p: Problem) => string[]; distinct?: boolean; withheld?: string }
interface ModuleSpec { competency: string; family: string; title: string; chapter: string[]; seed: (p: Problem) => boolean; strategies: Spec[] }

/** a worked example with several pictures in the row, so the multiplication by the key is visible */
const several = (p: Problem) => !worked(p).some((l) => /\b[01] pictures?\b/.test(l));
/** the asked row(s) hold a half picture: the generator's own count of halves is odd */
const oddHalves = (p: Problem) => worked(p).some((l) => { const m = /: (\d+) halves/.exec(l); return !!m && Number(m[1]) % 2 === 1; });
/** blocks with ten or more loose cubes: tie ten of them into another ten, then read the tens and ones */
const regrouped = (p: Problem) => { const [t, o] = p.params; return [worked(p)[0], `${t} tens and ${o} ones`, `${o} ones = 1 ten and ${o - 10} ones`, `${t} tens and 1 ten = ${t + 1} tens`, `${t + 1} tens and ${o - 10} ones = ${10 * (t + 1) + o - 10}`]; };
const PICT = "MATH.statistics.pictographs", BARS = "MATH.statistics.scaled-bars", PV = "MATH.number.place-value-tens";
const MODULES: ModuleSpec[] = [
  {
    competency: PICT, family: "acpict", title: "Reading a pictograph with a key",
    chapter: ["In a pictograph every picture stands for the same number of things: the number in the key.", "One picture does not always stand for one thing. Count the pictures, then use the key."],
    seed: (p) => p.params[0] !== 0,
    strategies: [
      { id: "read_with_key", title: "Read a row with the key", kind: "procedural", family: "acpict", subSkill: "pictographs.read-with-key@1", example: several, text: ["Every picture in the row stands for the key's number, not for one.", "Count the pictures in the row, then multiply by the key."] },
      { id: "table", title: "Turn it into a table", kind: "procedural", family: "acpict", subSkill: "pictographs.read-with-key@1", example: several, text: ["Write each label with its number of pictures.", "Multiply each by the key and write the real number beside it."] },
      // only rows that really contain a half picture (an odd number of halves): the generator may ask about a whole-picture row
      { id: "half_pictures", title: "Half pictures", kind: "conceptual", family: "acpicthalf", subSkill: "pictographs.half-symbol@1", extra: (p) => oddHalves(p), text: ["A whole picture stands for the key; a half picture stands for half the key.", "Count the row in halves: a whole picture is two halves and a half picture is one. Then multiply the number of halves by half the key."] },
      { id: "half_pictures_total", title: "The total with half pictures", kind: "procedural", family: "acpicthalf", subSkill: "pictographs.half-symbol-total@1", text: ["Count every row in halves: a whole picture is two halves and a half picture is one.", "Add the halves of all the rows, then multiply by half the key."] },
      { id: "compare_rows", title: "How many more, with the key", kind: "procedural", family: "acpictmore", subSkill: "pictographs.compare-rows@1", text: ["\"How many more\" compares two amounts: it is the bigger amount minus the smaller one.", "Read both rows using the key, then take the smaller number from the bigger one."] },
      { id: "draw_from_table", title: "Draw a row from a table", kind: "conceptual", family: "acpicttab", subSkill: "pictographs.draw-from-table@1", text: ["The key says how many each picture stands for.", "To draw a row, share the number into groups of the key: one picture for each group, not one for each thing."] },
      { id: "pictograph_total", title: "The total of a pictograph", kind: "procedural", family: "acpicttab", subSkill: "pictographs.total@1", text: ["Add the pictures in all the rows first.", "Then multiply the number of pictures by the key."] },
      { id: "largest_group", title: "The largest group", kind: "procedural", family: "acpicttab", subSkill: "pictographs.largest-group@1", text: ["The row with the most pictures is the largest group.", "Count its pictures and multiply by the key: the answer is the number of things, not the number of pictures."] },
    ],
  },
  {
    competency: BARS, family: "afbar", title: "Reading a bar chart with a scale",
    chapter: ["On a scaled bar chart each line on the side stands for more than one. The height of a bar is read off the scale, not by counting the lines as ones."],
    seed: (p) => p.params[1] === 0,
    strategies: [
      { id: "skip_count", title: "Skip-count up the scale", kind: "procedural", family: "afbar", subSkill: "scaled-bars.read@1", text: ["Find how much one line stands for from two numbers next to each other on the scale.", "Put a finger at the bottom of the bar and count up the lines in steps of the scale; stop at the top of the bar."] },
      { id: "bars_difference", title: "How many more, read against the scale", kind: "procedural", family: "afbar", subSkill: "scaled-bars.difference@1", text: ["Read both bars against the scale.", "\"How many more\" is the bigger value minus the smaller one."] },
      { id: "bars_total", title: "Two bars together", kind: "procedural", family: "afbar", subSkill: "scaled-bars.total@1", text: ["Read both bars against the scale.", "\"Together\" means add the two values."] },
      { id: "fix_assume_tens_read", title: "Read the scale; do not assume ten", kind: "procedural", family: "afbar", subSkill: "scaled-bars.read@1", addresses: "assume-tens", text: [],
        misconception: (p) => ["Each line was taken as ten. Read the numbers on the scale: they tell how much each line stands for.", "Do not assume ten: two numbers next to each other on the scale differ by the size of one line."] },
    ],
  },
  {
    competency: PV, family: "aatens", title: "Tens and ones: what number do the blocks show",
    chapter: ["A long block is a ten and a small cube is a one. The number is the tens and the ones together."],
    seed: (p) => p.params[1] < 10,
    strategies: [
      // revisions of the existing blocks-to-number explanations, answering their recorded review notes (blocks shown; an
      // example where ten or more loose ones are first tied into another ten)
      { id: "bundles", title: "Bundle the loose ones", kind: "conceptual", family: "aatens", subSkill: "place-value.blocks-to-number@1", extra: (p) => p.params[1] >= 10 && p.params[1] < 20, regroup: true, text: ["Each long block is a bundle of ten; each small cube is a one.", "When there are ten or more loose cubes, tie ten of them into another ten first. Then count the tens in tens and count on the ones."] },
      { id: "count_on", title: "Count the tens, then the ones", kind: "procedural", family: "aatens", subSkill: "place-value.blocks-to-number@1", extra: (p) => p.params[1] < 10, example: (p) => p.params[0] > 1 && p.params[1] > 2, text: ["Touch each long block in the picture and count in tens.", "Then count on the small cubes one by one."] },
      { id: "tens_digit_value", title: "The value of the tens digit", kind: "conceptual", family: "aadigit", subSkill: "place-value.tens-digit-value@1", text: ["In a two-digit number the first digit counts tens and the second counts ones.", "The value of the tens digit is that many tens."] },
      { id: "count_tens", title: "How many tens", kind: "conceptual", family: "aadigit", subSkill: "place-value.count-tens@1", text: ["\"How many tens\" asks for a count of bundles of ten, not for their value.", "In a two-digit number it is the first digit."] },
      { id: "ones_digit_value", title: "The value of the ones digit", kind: "conceptual", family: "aadigit", subSkill: "place-value.ones-digit-value@1", text: ["The second digit of a two-digit number counts ones.", "So the ones digit is worth just that many ones."] },
      { id: "full_tens", title: "Make full tens", kind: "procedural", family: "aabund", subSkill: "place-value.full-tens@1", text: ["Rows of different lengths are not tens: count the objects, not the rows.", "Put them into groups of ten; each full group is one ten. Count the full groups."] },
      { id: "left_over_ones", title: "The ones left over", kind: "procedural", family: "aabund", subSkill: "place-value.left-over-ones@1", text: ["Make as many full tens as you can.", "The objects that are not in a full ten are the ones left over."] },
      { id: "grouped_total", title: "Tens and ones together", kind: "procedural", family: "aabund", subSkill: "place-value.grouped-total@1", text: ["Make full tens and count them in tens.", "Then count on the ones left over: that is how many there are in all."] },
    ],
  },
];

// Preserve the integrated total-skill intervention and its saved identity. The read-bar candidate has a distinct ID.
const retainedTotal = {
  "id": "fix_assume_tens",
  "title": "Read the scale; do not assume 10",
  "kind": "procedural",
  "needs": [],
  "screens": [
    {
      "title": "Read the scale; do not assume 10: what went wrong",
      "text": [
        "Each line was taken as 10. Read the numbers on the scale: they tell how much each line stands for.",
        "Do not assume 10: read the numbers on the scale to see what one line stands for."
      ],
      "math": [
        "Not 80, but 16",
        "Check: two numbers next to each other on the scale differ by the size of one line."
      ],
      "role": "misconception",
      "instance": "gen:afbar:0,2,5"
    },
    {
      "title": "Read the scale; do not assume 10: solved correctly",
      "text": [
        "Each step, then the answer."
      ],
      "math": [
        "Thu: 2; Fri: 14 (scale 2 per line)",
        "2 + 14 = 16"
      ],
      "role": "strategy",
      "instance": "gen:afbar:0,2,5"
    }
  ],
  "guided": "gen:afbar:0,2,2",
  "check": "gen:afbar:0,2,7",
  "scope": {
    "family": "afbar",
    "subSkill": "scaled-bars.total@1",
    "parameters": [
      {
        "index": 1,
        "values": [
          2
        ]
      }
    ]
  },
  "addresses": "assume-tens"
};

// ---- "change between units by a fixed factor" (subskill-config-conversion.ts). Text reuses the template modules' own
// family ideas and methods (worked_steps, drop_dot, place_value, ratio_table) and TP2-REG-MONEY's unit idea, without numbers.
const MONEY = "MATH.measurement.money-decimals", LEN = "MATH.measurement.length-conversion", SCALE = "MATH.geometry.scale-drawings";
/** ratio scales: teach with 1 : 200, 500, 1000 (metres) and 1 : 25000, 50000 (km). At 1 : 100 to metres and 1 : 100000 to km the
 * multiplication and the unit change cancel, which hides the method (those scales are still assessed). */
/** a worked example that shows the change, not a trivial one (a zero part, a whole unit, or one map centimetre) */
const notTrivial = (p: Problem) => Number(p.answer) !== 0 && Number(p.answer) !== 1 && !/\b0 (paise|cm|mm|m)\b/.test(p.prompt);
/** a native-choice task: the generator's lines, then the chosen option itself (the answer is a letter) */
const concluded = (p: Problem) => [...worked(p), `So: ${(p as Problem & { options: string[] }).options["ABCDEFGH".indexOf(String(p.answer))]}`];
const UNIT = "A bigger unit is made of a fixed number of smaller units.";
MODULES.push(
  {
    competency: MONEY, family: "acpaise", title: "Changing between rupees and paise",
    chapter: [UNIT, "One rupee is a hundred paise. In an amount written with a dot, the digits before the dot are rupees and the two digits after it are paise."],
    seed: (p) => p.params[2] === 1 && notTrivial(p),
    strategies: [
      { id: "paise_to_rupees", title: "Paise into rupees", kind: "procedural", family: "acp2r", subSkill: "money.paise-to-rupees@1", example: notTrivial, text: ["A hundred paise make one rupee, so every hundred paise is a rupee.", "Divide the paise by a hundred: the number of whole hundreds is the rupees, and the last two digits are the paise, written after the dot."] },
      { id: "rupees_and_paise_to_paise", title: "Rupees and paise into paise", kind: "procedural", family: "acpaise", subSkill: "money.rupees-and-paise-to-paise@1", example: notTrivial, text: ["One rupee is a hundred paise.", "Multiply the rupees by a hundred to get paise, then add the paise."] },
      { id: "decimal_rupees_to_paise", title: "Rupees written with a dot, into paise", kind: "procedural", family: "acpaise", subSkill: "money.decimal-rupees-to-paise@1", example: notTrivial, text: ["The digits before the dot are rupees and the two digits after it are paise.", "Multiply the rupees by a hundred to get paise, then add the paise after the dot. That is the same as reading all the digits without the dot."] },
    ],
  },
  {
    competency: LEN, family: "acmcm", title: "Changing between units of length",
    chapter: [UNIT, "Ten millimetres make a centimetre, a hundred centimetres make a metre and a thousand metres make a kilometre. Going to a smaller unit gives a bigger number; going to a bigger unit gives a smaller number, as whole units and some left over, or as a decimal."],
    seed: (p) => p.params[2] === 0 && notTrivial(p),
    strategies: [
      { id: "cm_to_decimal_m", title: "Centimetres as a decimal of a metre", kind: "conceptual", family: "acdecu", subSkill: "length.cm-to-decimal-m@1", example: notTrivial, text: ["A hundred centimetres make a metre, so one centimetre is one hundredth of a metre.", "To write centimetres in metres, divide by a hundred: the point moves two places to the left."] },
      { id: "mm_to_decimal_cm", title: "Millimetres as a decimal of a centimetre", kind: "conceptual", family: "acdecu", subSkill: "length.mm-to-decimal-cm@1", example: notTrivial, text: ["Ten millimetres make a centimetre, so one millimetre is one tenth of a centimetre.", "To write millimetres in centimetres, divide by ten: the point moves one place to the left."] },
      { id: "m_to_decimal_km", title: "Metres as a decimal of a kilometre", kind: "conceptual", family: "acdecu", subSkill: "length.m-to-decimal-km@1", example: notTrivial, text: ["A thousand metres make a kilometre, so one metre is one thousandth of a kilometre.", "To write metres in kilometres, divide by a thousand: the point moves three places to the left."] },
      { id: "decimal_m_to_cm", title: "Metres written as a decimal, into centimetres", kind: "procedural", family: "acdecu", subSkill: "length.decimal-m-to-cm@1", example: notTrivial, text: ["One metre is a hundred centimetres.", "Multiply the metres by a hundred: the point moves two places to the right."] },
      { id: "m_cm_to_cm", title: "Metres and centimetres into centimetres", kind: "procedural", family: "acmcm", subSkill: "length.m-cm-to-cm@1", example: notTrivial, text: ["Metres and centimetres are different sizes, so change the metres first: one metre is a hundred centimetres.", "Multiply the metres by a hundred, then add the extra centimetres."] },
      { id: "cm_to_m_cm", title: "Centimetres into metres and centimetres", kind: "procedural", family: "acmcm", subSkill: "length.cm-to-m-cm@1", example: notTrivial, text: ["Every hundred centimetres make one metre.", "Take away the whole metres as hundreds of centimetres; the centimetres left are the answer."] },
      { id: "cm_mm_to_mm", title: "Centimetres and millimetres into millimetres", kind: "procedural", family: "acmmkm", subSkill: "length.cm-mm-to-mm@1", example: notTrivial, text: ["One centimetre is ten millimetres.", "Multiply the centimetres by ten, then add the extra millimetres."] },
      { id: "mm_to_cm_mm", title: "Millimetres into centimetres and millimetres", kind: "procedural", family: "acmmkm", subSkill: "length.mm-to-cm-mm@1", example: notTrivial, text: ["Every ten millimetres make one centimetre.", "Take away the whole centimetres as tens of millimetres; the millimetres left are the answer."] },
      { id: "m_to_km_m", title: "Metres into kilometres and metres", kind: "procedural", family: "acmmkm", subSkill: "length.m-to-km-m@1", example: notTrivial, text: ["Every thousand metres make one kilometre.", "Take away the whole kilometres as thousands of metres; the metres left are the answer."] },
      { id: "m_to_whole_km", title: "Thousands of metres into kilometres", kind: "procedural", family: "acmmkm", subSkill: "length.m-to-whole-km@1", example: notTrivial, text: ["A thousand metres make one kilometre.", "Divide the metres by a thousand to count the kilometres."] },
      { id: "compare_m_cm", title: "Which is longer: change to one unit first", kind: "procedural", family: "acmcmp", subSkill: "length.compare-m-cm@1", example: (p) => p.params[2] !== 0, conclude: true, text: ["Metres and centimetres are different sizes, so the two lengths cannot be compared digit by digit.", "Change the length in metres and centimetres into centimetres (one metre is a hundred centimetres), then compare the two numbers of centimetres. If they are equal, the lengths are the same."] },
      { id: "mm_to_whole_cm", title: "Tens of millimetres into centimetres", kind: "procedural", family: "acmmkm", subSkill: "length.mm-to-whole-cm@1", example: notTrivial, text: ["Ten millimetres make one centimetre.", "Divide the millimetres by ten to count the centimetres."] },
    ],
  },
  {
    competency: SCALE, family: "aiscale", title: "Using a map or plan scale",
    chapter: ["A scale says how much real length each length on the map or plan stands for. Map lengths and real lengths are in the same proportion."],
    seed: (p) => p.params[2] === 0 && notTrivial(p),
    strategies: [
      { id: "map_to_real", title: "From the map to the real distance", kind: "procedural", family: "aiscale", subSkill: "scale.map-to-real@1", example: notTrivial, text: ["The scale says how many real kilometres one centimetre on the map stands for.", "Map to real: multiply the map length by the scale. The real distance is the bigger number."] },
      { id: "real_to_map", title: "From the real distance to the map", kind: "procedural", family: "aiscale", subSkill: "scale.real-to-map@1", example: notTrivial, text: ["The map is smaller than the real world, so the map distance is the smaller number.", "Real to map: divide the real distance by the scale."] },
      { id: "ratio_plan_to_metres", title: "A plan scale written as a ratio", kind: "procedural", family: "airatio", subSkill: "scale.ratio-plan-to-metres@1", extra: (p) => p.params[0] !== 0, example: notTrivial, text: ["A scale of one to n means every real length is n times the length on the plan, in the same unit.", "Multiply the plan length by n to get real centimetres, then divide by a hundred to get metres."] },
      { id: "ratio_map_to_km", title: "A map scale written as a ratio", kind: "procedural", family: "airatio", subSkill: "scale.ratio-map-to-km@1", extra: (p) => p.params[0] !== 6, example: notTrivial, text: ["A scale of one to n means every real length is n times the length on the map, in the same unit.", "Multiply the map length by n to get real centimetres, then divide by a hundred thousand to get kilometres."] },
    ],
  },
);

// Misconception evidence is keyed by the mistake's id within a competency, not by skill. Where the same id is modelled for
// several skills (added-both: □ + k and n − □; same-operation: all four one-step forms), an answer on one skill could select
// the fix written for another, presenting one skill's mistake as proof of a mistake in another. Those fixes are WITHHELD
// from publication (authored here, kept for when evidence is keyed by skill); a fix is published only when its mistake is
// modelled by its own skill alone in the competency (took-away-again, subtract-coefficient, add-for-multiply).
const CROSS_SKILL = "its mistake id is modelled by more than one skill of the competency, and misconception evidence is not yet keyed by skill";
// ---- "inverse operations undo each other" (subskill-config-inverse.ts). Text reuses the template modules' rule ("ask what
// was done to the box, then work backwards"; "do the opposite to both sides, then check"; "a missing part is total − other
// part") split so that each explanation shows its own form, and answers their review notes: every worked example states the
// numbers it undoes and ends with the substitution check.
const MISSN = "MATH.algebra.missing-number", LINI = "MATH.algebra.linear-intro", PZ = "MATH.reasoning.puzzle-strategy";
/** acmissing [f, u, k] (the box is u): undo, then put the answer in the box and check */
const missingMath = (p: Problem) => {
  const [f, u, k] = p.params;
  const q = p.prompt.replace(/^What number goes in the box\? /, "");
  if (f === 0) return [q, `${k} was added to the box: undo it by taking ${k} away`, `${u + k} − ${k} = ${u}`, `Check: ${u} + ${k} = ${u + k}`];
  if (f === 1) return [q, `The box was taken away from ${u + k} and ${k} is left, so the box is ${u + k} − ${k}`, `${u + k} − ${k} = ${u}`, `Check: ${u + k} − ${u} = ${k}`];
  if (f === 2) return [q, `${k} was taken away from the box: undo it by adding ${k} back`, `${u - k} + ${k} = ${u}`, `Check: ${u} − ${k} = ${u - k}`];
  return [q, `The box was multiplied by ${k}: undo it by dividing by ${k}`, `${k * u} ÷ ${k} = ${u}`, `Check: ${k} × ${u} = ${k * u}`];
};
/** ahone [f, a, t]: the generator's own step, then the check of the answer in the equation */
const oneStepMath = (p: Problem) => {
  const [f, a] = p.params, x = Number(p.answer);
  const check = f === 0 ? `Check: ${x} + ${a} = ${x + a}` : f === 1 ? `Check: ${x} − ${a} = ${x - a}` : f === 2 ? `Check: ${a} × ${x} = ${a * x}` : `Check: ${x} ÷ ${a} = ${x / a}`;
  return [...worked(p), check];
};
/** afmissd, hidden in the first number: undo the operation to find that number, then read the digit */
const digitMath = (p: Problem) => {
  const m = /: (\S+) ([+−]) (\S+) = (\S+)\./.exec(p.prompt);
  if (!m) throw new Error(`afmissd prompt not read: ${p.prompt}`);
  const [, first, op, other, result] = m, r = Number(result), o = Number(other);
  const whole = op === "+" ? r - o : r + o;
  const at = first.indexOf("□"), digit = String(whole).padStart(first.length, "0")[at];
  if (digit !== String(p.answer) || String(whole).length !== first.length || [...first].some((c, i) => c !== "□" && c !== String(whole)[i])) throw new Error(`afmissd undo disagrees: ${p.id}`);
  return [p.prompt.replace(/^Find the missing digit: /, "").replace(/ Which digit goes in the box □\?$/, ""),
    op === "+" ? `The first number is the total take away the other part: ${r} − ${o} = ${whole}` : `The first number is the answer add the number taken away: ${r} + ${o} = ${whole}`,
    `${first} = ${whole}, so the missing digit is ${digit}`, op === "+" ? `Check: ${whole} + ${o} = ${r}` : `Check: ${whole} − ${o} = ${r}`];
};
/** acfacts (native choice): the asked fact, then a check that the chosen fact is true, read from the option itself */
const factsMath = (p: Problem) => {
  const opt = (p as Problem & { options: string[] }).options["ABCD".indexOf(String(p.answer))];
  const m = /^(\S+) = (\S+) × (\S+)$/.exec(opt);
  return [p.prompt, m ? `Check: ${m[2]} × ${m[3]} = ${m[1]}, so the sentence is true` : `Check: ${opt} is true`, `So: ${opt}`];
};
MODULES.push(
  {
    competency: MISSN, family: "acmissing", title: "Missing numbers and related facts",
    chapter: ["Adding and taking away undo each other, and so do multiplying and dividing. To find a missing number, ask what was done to it, then work backwards; put your answer back in to check."],
    seed: (p) => p.params[0] === 0,
    strategies: [
      { id: "box_plus_k", title: "A number was added to the box", kind: "procedural", family: "acmissing", subSkill: "missing.box-plus-k@1", math: missingMath, text: ["Ask what was done to the box: a number was added to it, and the total is on the other side.", "Undo the adding: take that number away from the total. Then put your answer in the box and check that the sentence is true."] },
      { id: "n_minus_box", title: "The box is the number taken away", kind: "procedural", family: "acmissing", subSkill: "missing.n-minus-box@1", math: missingMath, text: ["Here the box is taken away from the first number, and the number on the right is what is left.", "So the box is the first number take away what is left. Check by taking your answer away from the first number."] },
      { id: "box_minus_k", title: "A number was taken away from the box", kind: "procedural", family: "acmissing", subSkill: "missing.box-minus-k@1", math: missingMath, text: ["A number was taken away from the box, and the number on the right is what is left.", "Undo the taking away: add that number back to what is left. Check by taking it away again."] },
      { id: "k_times_box", title: "The box was multiplied", kind: "procedural", family: "acmissing", subSkill: "missing.k-times-box@1", math: missingMath, text: ["The box was multiplied by a number, and the product is on the other side.", "Undo the multiplying: divide the product by that number, using the times table. Check by multiplying."] },
      { id: "subtraction_fact", title: "The subtraction fact of an addition", kind: "conceptual", family: "acfacts", subSkill: "facts.subtraction-from-addition@1", math: factsMath, text: ["An addition fact and its subtraction facts are one family: a total and its two parts.", "A subtraction fact starts with the total and takes away one part; what is left is the other part."] },
      { id: "check_by_addition", title: "Check a subtraction by adding", kind: "conceptual", family: "acfacts", subSkill: "facts.check-subtraction-by-addition@1", math: factsMath, text: ["Adding undoes taking away.", "To check a subtraction, add the answer to the number taken away: you should get the number you started with."] },
      { id: "division_fact", title: "The division fact of a multiplication", kind: "conceptual", family: "acfacts", subSkill: "facts.division-from-multiplication@1", math: factsMath, text: ["Multiplying and dividing undo each other: a product and its two factors are one family.", "A division fact starts with the product and divides it by one factor; the answer is the other factor."] },
      { id: "dividend_divisor_quotient", title: "Dividend = divisor × quotient", kind: "conceptual", family: "acfacts", subSkill: "facts.dividend-is-divisor-times-quotient@1", math: factsMath, text: ["In a division the dividend is the number being divided, the divisor divides it and the quotient is the answer.", "Multiplying undoes dividing, so the dividend equals the divisor times the quotient."] },
      { id: "fix_added_both", withheld: CROSS_SKILL, title: "Not both numbers added", kind: "procedural", family: "acmissing", subSkill: "missing.box-plus-k@1", addresses: "added-both", distinct: true, math: missingMath, text: [],
        misconception: () => ["Both numbers you can see were added. Adding them never undoes what was done to the box.", "Ask what was done to the box, then undo it: the missing number is found by taking away, not by adding the two numbers."] },
      { id: "fix_added_both_taken", withheld: CROSS_SKILL, title: "Not both numbers added", kind: "procedural", family: "acmissing", subSkill: "missing.n-minus-box@1", addresses: "added-both", distinct: true, math: missingMath, text: [],
        misconception: () => ["Both numbers you can see were added. Adding them never undoes what was done to the box.", "Ask what was done to the box, then undo it: the missing number is found by taking away, not by adding the two numbers."] },
      { id: "fix_took_away_again", title: "Add it back, do not take it away again", kind: "procedural", family: "acmissing", subSkill: "missing.box-minus-k@1", addresses: "took-away-again", distinct: true, math: missingMath, text: [],
        misconception: () => ["The number was taken away a second time.", "The box is the number before anything was taken away, so add the number back to what is left."] },
    ],
  },
  {
    competency: LINI, family: "ahone", title: "Solving a one-step equation",
    chapter: ["An equation is a balance: both sides have the same value. Doing the opposite operation to both sides keeps it balanced and leaves x alone; put your answer back in to check."],
    seed: (p) => p.params[0] === 2,
    strategies: [
      { id: "x_plus_a", title: "A number is added to x", kind: "procedural", family: "ahone", subSkill: "one-step.x-plus-a@1", math: oneStepMath, text: ["A number is added to x.", "Take that number away from both sides, so x is alone. Then put your answer back into the equation to check it."] },
      { id: "x_minus_a", title: "A number is taken away from x", kind: "procedural", family: "ahone", subSkill: "one-step.x-minus-a@1", math: oneStepMath, text: ["A number is taken away from x.", "Add that number to both sides, so x is alone. Then put your answer back into the equation to check it."] },
      { id: "a_times_x", title: "x is multiplied by a number", kind: "procedural", family: "ahone", subSkill: "one-step.a-times-x@1", math: oneStepMath, text: ["The number written next to x multiplies it.", "Divide both sides by that number, so x is alone. Check by multiplying."] },
      { id: "x_divided_by_a", title: "x is divided by a number", kind: "procedural", family: "ahone", subSkill: "one-step.x-divided-by-a@1", math: oneStepMath, text: ["x is divided by a number.", "Multiply both sides by that number, so x is alone. Check by dividing."] },
      { id: "fix_same_operation_add", withheld: CROSS_SKILL, title: "Do the opposite, not the same again", kind: "procedural", family: "ahone", subSkill: "one-step.x-plus-a@1", addresses: "same-operation", distinct: true, math: oneStepMath, text: [],
        misconception: () => ["The same operation was done again instead of its opposite.", "To leave x alone, undo what was done to x: take away a number that was added, add back a number that was taken away, divide by a number that multiplies x, multiply by a number that divides x."] },
      { id: "fix_same_operation_take", withheld: CROSS_SKILL, title: "Do the opposite, not the same again", kind: "procedural", family: "ahone", subSkill: "one-step.x-minus-a@1", addresses: "same-operation", distinct: true, math: oneStepMath, text: [],
        misconception: () => ["The same operation was done again instead of its opposite.", "To leave x alone, undo what was done to x: take away a number that was added, add back a number that was taken away, divide by a number that multiplies x, multiply by a number that divides x."] },
      { id: "fix_subtract_coefficient", title: "Divide by the number next to x", kind: "procedural", family: "ahone", subSkill: "one-step.a-times-x@1", addresses: "subtract-coefficient", distinct: true, math: oneStepMath, text: [],
        misconception: () => ["The number next to x was taken away.", "That number multiplies x, so undo it by dividing both sides by it."] },
      { id: "fix_add_for_multiply", title: "Multiply, do not add", kind: "procedural", family: "ahone", subSkill: "one-step.x-divided-by-a@1", addresses: "add-for-multiply", distinct: true, math: oneStepMath, text: [],
        misconception: () => ["The number was added instead of multiplied.", "x was divided by the number, so undo it by multiplying both sides by it."] },
    ],
  },
  {
    competency: PZ, family: "afmissd", title: "Finding a missing digit by undoing",
    chapter: ["A sum or difference is a true sentence. When the hidden digit is in the first number, undo the operation to find the whole first number, then read the digit."],
    seed: (p) => p.params[2] === 0 && p.params[3] === 0,
    strategies: [
      { id: "addend_digit", title: "A digit hidden in a number being added", kind: "procedural", family: "afmissd", subSkill: "digit.missing-in-addend@1", math: digitMath, text: ["The two numbers being added make the total, so the number with the hidden digit is a part.", "A missing part is the total take away the other part. Work that out, read the digit in the box's place, and check by doing the whole addition."] },
      { id: "first_number_digit", title: "A digit hidden in the first number of a subtraction", kind: "procedural", family: "afmissd", subSkill: "digit.missing-in-first-number@1", math: digitMath, text: ["The first number of a subtraction is what you started with.", "Undo the taking away: add the answer to the number taken away, read the digit in the box's place, and check by doing the subtraction."] },
    ],
  },
);

const bps = JSON.parse(readFileSync(file, "utf8"));
const out: unknown[] = [];
for (const M of MODULES) {
  const config = configOf(M.competency);
  // items the synthesised module itself will draw (diagnostics, practice, transfer, retention, sub-chapters) come from the
  // START of each partition; candidates are taken from the END, and no exposure is used twice
  const used = new Set<string>();
  if (M.competency === BARS) for (const id of [retainedTotal.guided, retainedTotal.check, ...retainedTotal.screens.map(s => s.instance)]) used.add(exposureKey(id));
  // `distinct`: the addressed mistake's predicted answer is one number, different from the right answer and from every other
  // modelled mistake's prediction, so an answer matching it is evidence of that mistake and of no other (the contrast)
  const distinctBug = (p: Problem, bug: string) => { const b = p.bugs.find((x) => x.id === bug); if (!b || typeof b.predict !== "number" || b.predict === Number(p.answer)) return false; return p.bugs.every((x) => x.id === bug || ![x.predict].flat().includes(b.predict)); };
  const inSkill = (s: Spec, id: string) => connectedSkill(config, id) === s.subSkill && (!s.extra || s.extra(P(id))) && (!s.addresses || P(id).bugs.some((b) => b.id === s.addresses && b.predict !== null)) && (!s.distinct || !s.addresses || distinctBug(P(id), s.addresses));
  const pick = (family: string, phase: "practice" | "check", ok: (id: string) => boolean, form: "typed" | "any") => {
    const id = [...phasePool(family, phase)].reverse().filter(selectable).find((x) => (form === "any" || !x.endsWith(":mc")) && ok(x) && !used.has(exposureKey(x)));
    if (!id) throw new Error(`no ${phase} item for ${family}`);
    used.add(exposureKey(id));
    return id;
  };
  const seed = phasePool(M.family, "practice").map((x) => x.replace(/:mc$/, "")).find((x) => M.seed(P(x)) && connectedSkill(config, x))!;
  used.add(exposureKey(seed));
  // a fix whose mistake can be evidenced by another skill's answers is authored here but not published (see WITHHELD below)
  const strategies = M.strategies.filter((s) => !s.withheld).map((s) => {
    const inst = P(pick(s.family, "practice", (x) => inSkill(s, x) && (!s.example || s.example(P(x))), "typed"));
    const guided = pick(s.family, "practice", (x) => inSkill(s, x), "any");
    const check = pick(s.family, "check", (x) => inSkill(s, x), "any");
    const screens = s.misconception
      ? (() => { const b = inst.bugs.find((x) => x.id === s.addresses)!; return [
          { title: `${s.title}: what went wrong`, text: s.misconception(inst), math: [`Not ${b.predict}, but ${inst.answer}`], role: "misconception", instance: inst.id, ...fig(inst) },
          { title: `${s.title}: solved correctly`, text: ["Each step, then the answer."], math: s.math ? s.math(inst) : worked(inst), role: "strategy", instance: inst.id },
        ]; })()
              : [{ title: s.title, text: s.text, math: s.math ? s.math(inst) : s.regroup ? regrouped(inst) : s.conclude ? concluded(inst) : worked(inst), role: "strategy", instance: inst.id, ...fig(inst) }];
    return { id: s.id, title: s.title, kind: s.kind, screens, guided, check, scope: { family: s.family, subSkill: s.subSkill }, ...(s.addresses ? { addresses: s.addresses } : {}) };
  });
  if (M.competency === BARS) strategies.push(retainedTotal);
  out.push({ competency: M.competency, title: M.title, family: M.family, seed: P(seed).params, author: AUTHOR, aiAssisted: true, licence: "CC0", chapter: [{ title: M.title, text: M.chapter, worked: true, ...fig(P(seed)) }], strategies });
}
bps.blueprints = [...bps.blueprints.filter((b: { competency: string }) => !MODULES.some((m) => m.competency === b.competency)), ...out];
writeFileSync(file, JSON.stringify(bps, null, 1) + "\n");
console.log(`wrote ${out.length} blueprints`);
process.exit(0);
