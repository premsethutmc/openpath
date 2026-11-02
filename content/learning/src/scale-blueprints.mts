/**
 * Authoring source for the unit-value teaching blueprints (pictographs, scaled bar charts, place value: tens) in
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

const file = new URL("../blueprints.v1.json", import.meta.url);
const AUTHOR = "OpenPath (written with AI assistance; not educator-reviewed)";
const worked = (p: Problem) => [p.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...p.steps.map((s) => explainStep(p, s))];
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const fig = (p: Problem) => (p.figure ? { widget: p.figure as Record<string, unknown> } : {});
const configOf = (c: string) => SCALE_PATTERN_CONFIGS.find((x) => x.competency === c)!;

interface Spec { id: string; title: string; kind: "conceptual" | "procedural"; family: string; subSkill: string; text: string[]; extra?: (p: Problem) => boolean; example?: (p: Problem) => boolean; addresses?: string; misconception?: (p: Problem) => string[]; regroup?: boolean; withheld?: string }
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
      { id: "half_pictures", title: "Half pictures", kind: "conceptual", family: "acpicthalf", subSkill: "pictographs.half-symbol@1", withheld: "the half-symbol row skill is unmapped in pictographs-subskills@2 until the mapping contract can express the asked-row condition", extra: (p) => oddHalves(p), text: ["A whole picture stands for the key; a half picture stands for half the key.", "Count the row in halves: a whole picture is two halves and a half picture is one. Then multiply the number of halves by half the key."] },
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
      { id: "fix_assume_tens", title: "Read the scale; do not assume ten", kind: "procedural", family: "afbar", subSkill: "scaled-bars.read@1", addresses: "assume-tens", text: [],
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

const bps = JSON.parse(readFileSync(file, "utf8"));
const out: unknown[] = [];
for (const M of MODULES) {
  const config = configOf(M.competency);
  // items the synthesised module itself will draw (diagnostics, practice, transfer, retention, sub-chapters) come from the
  // START of each partition; candidates are taken from the END, and no exposure is used twice
  const used = new Set<string>();
  const inSkill = (s: Spec, id: string) => connectedSkill(config, id) === s.subSkill && (!s.extra || s.extra(P(id))) && (!s.addresses || P(id).bugs.some((b) => b.id === s.addresses && b.predict !== null));
  const pick = (family: string, phase: "practice" | "check", ok: (id: string) => boolean, form: "typed" | "any") => {
    const id = [...phasePool(family, phase)].reverse().filter(selectable).find((x) => (form === "any" || !x.endsWith(":mc")) && ok(x) && !used.has(exposureKey(x)));
    if (!id) throw new Error(`no ${phase} item for ${family}`);
    used.add(exposureKey(id));
    return id;
  };
  const seed = phasePool(M.family, "practice").map((x) => x.replace(/:mc$/, "")).find((x) => M.seed(P(x)) && connectedSkill(config, x))!;
  used.add(exposureKey(seed));
  // a strategy whose skill is withdrawn from the mapping is kept here, ready, but not published
  const strategies = M.strategies.filter((s) => !s.withheld).map((s) => {
    const inst = P(pick(s.family, "practice", (x) => inSkill(s, x) && (!s.example || s.example(P(x))), "typed"));
    const guided = pick(s.family, "practice", (x) => inSkill(s, x), "any");
    const check = pick(s.family, "check", (x) => inSkill(s, x), "any");
    const screens = s.misconception
      ? (() => { const b = inst.bugs.find((x) => x.id === s.addresses)!; return [
          { title: `${s.title}: what went wrong`, text: s.misconception(inst), math: [`Not ${b.predict}, but ${inst.answer}`], role: "misconception", instance: inst.id, ...fig(inst) },
          { title: `${s.title}: solved correctly`, text: ["Each step, then the answer."], math: worked(inst), role: "strategy", instance: inst.id },
        ]; })()
              : [{ title: s.title, text: s.text, math: s.regroup ? regrouped(inst) : worked(inst), role: "strategy", instance: inst.id, ...fig(inst) }];
    return { id: s.id, title: s.title, kind: s.kind, screens, guided, check, scope: { family: s.family, subSkill: s.subSkill }, ...(s.addresses ? { addresses: s.addresses } : {}) };
  });
  out.push({ competency: M.competency, title: M.title, family: M.family, seed: P(seed).params, author: AUTHOR, aiAssisted: true, licence: "CC0", chapter: [{ title: M.title, text: M.chapter, worked: true, ...fig(P(seed)) }], strategies });
}
bps.blueprints = [...bps.blueprints.filter((b: { competency: string }) => !MODULES.some((m) => m.competency === b.competency)), ...out];
writeFileSync(file, JSON.stringify(bps, null, 1) + "\n");
console.log(`wrote ${out.length} blueprints`);
process.exit(0);
