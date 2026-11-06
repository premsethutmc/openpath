/**
 * Authoring source for five geometry skills taught inside their existing TEMPLATE modules (Blueprint.extendsTemplate):
 *   MATH.geometry.angle-pairs
 *     angle-pairs.complement@2  (afpair kind 0)  -> complementary_angles
 *     angle-pairs.supplement@2  (afpair kind 1)  -> supplementary_angles
 *     angle-pairs.adjacent@2    (afcross rel 1)  -> adjacent_linear_pair
 *     angle-pairs.other-three@2 (afcross rel 2)  -> other_three_angles
 *   MATH.geometry.triangle-properties
 *     triangle-properties.isosceles-angles@1 (ahiso) -> isosceles_base, isosceles_vertex
 *
 * These strategies are MERGED into the existing template-extension blueprints created by geometry-two-skills.mts.
 * The reserved set is built using fromTemplate() (the same function synthesise() uses) plus existing strategy items.
 *   cd frontend && node --import tsx ../content/learning/src/geometry-angle-pairs-iso.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { exposureKey, FAMILIES, phasePool, problemOf } from "../../../packages/learning/src/families";
import { selectable } from "../../../packages/learning/src/question-status";
import { connectedSkill, ANGLE_PAIRS_PRECISE_CONFIG } from "../../../packages/learning/src/skill-connections";
import { TRIANGLE_PROPERTIES_CONFIG } from "../../../packages/learning/src/subskill-config-geometry";
import { fromTemplate } from "../../../packages/learning/src/library";
import type { SubSkillConfig } from "../../../packages/learning/src/subskill-projection";

const file = new URL("../blueprints.v1.json", import.meta.url);
const PAIRS = "MATH.geometry.angle-pairs", TRI = "MATH.geometry.triangle-properties";

// ── reserved exposure tracking ──────────────────────────────────────────
// Build from fromTemplate (same as synthesise does) plus existing strategy items
function buildReserved(family: string, competency: string, existingStrategies: { guided: string; check: string; screens: { instance?: string }[] }[]) {
  const base = fromTemplate(family, competency, "reserved-check");
  const reserved = new Set<string>();
  // Everything the base template allocates
  for (const sc of [...base.chapter, ...base.strategies.flatMap(s => s.screens)]) {
    if (sc.instance) reserved.add(exposureKey(sc.instance));
  }
  for (const id of [...base.diagnostics, ...base.practice, ...base.transfer, ...base.retention,
    ...base.strategies.flatMap(s => [s.guided, s.check])]) {
    reserved.add(exposureKey(id));
  }
  // Everything the existing strategies use
  for (const s of existingStrategies) {
    reserved.add(exposureKey(s.guided));
    reserved.add(exposureKey(s.check));
    for (const sc of s.screens) if (sc.instance) reserved.add(exposureKey(sc.instance));
  }
  return reserved;
}

/** Pick an item from a family's phase pool that is in-skill, selectable, and not reserved */
function pick(reserved: Set<string>, family: string, phase: "practice" | "check", skill: string, config: SubSkillConfig, preferMc: boolean): string {
  const pool = phasePool(family, phase).filter((q) => selectable(q) && !reserved.has(exposureKey(q)) && connectedSkill(config, q) === skill);
  const preferred = pool.filter((q) => preferMc ? q.endsWith(":mc") : !q.endsWith(":mc"));
  const item = preferred[0] ?? pool[0];
  if (!item) throw new Error(`no ${phase} item for ${family} skill ${skill}`);
  reserved.add(exposureKey(item));
  return item;
}

/** Reserve a specific instance id and return it */
function inst(reserved: Set<string>, family: string, params: number[]): string {
  const id = `gen:${family}:${params.join(",")}`;
  const key = exposureKey(id);
  if (reserved.has(key)) throw new Error(`${id} already reserved`);
  const p = problemOf(id);
  if (!p) throw new Error(`${id} does not exist`);
  reserved.add(key);
  return id;
}

// ── afpair helpers ──────────────────────────────────────────────
const pairPrompt = (p: number[]) => FAMILIES.get("afpair")!.prompt!(p);
const pairFigure = (kind: number, a: number) => ({ type: "angle", deg: a, note: kind === 0 ? "with a right angle" : "on a straight line" });
const compLines = (a: number) => [`Complementary angles add up to 90deg`, `90deg - ${a}deg = ${90 - a}deg`, `Check: ${a}deg + ${90 - a}deg = 90deg`];
const suppLines = (a: number) => [`Supplementary angles add up to 180deg`, `180deg - ${a}deg = ${180 - a}deg`, `Check: ${a}deg + ${180 - a}deg = 180deg`];
const pairScreen = (title: string, text: string[], kind: number, a: number, instanceId: string) => ({
  title, text, math: [pairPrompt([kind, a]), ...(kind === 0 ? compLines(a) : suppLines(a))],
  role: "strategy", instance: instanceId, widget: pairFigure(kind, a),
});

// ── afcross helpers (adjacent, other-three) ─────────────────────
const crossPrompt = (p: number[]) => FAMILIES.get("afcross")!.prompt!(p);
const crossingAdj = (a: number) => ({ type: "angle", deg: a, cross: true, labels: [`${a}deg`, "?", "", ""] });
const crossingThree = (a: number) => ({ type: "angle", deg: a, cross: true, labels: [`${a}deg`, "?", "?", "?"] });
const adjLines = (a: number) => [`Angles on a straight line add up to 180deg`, `180deg - ${a}deg = ${180 - a}deg`, `The angle next to ${a}deg is ${180 - a}deg`];
const threeLines = (a: number) => [
  `The angle next to ${a}deg is 180deg - ${a}deg = ${180 - a}deg`,
  `Opposite ${a}deg is another ${a}deg; opposite ${180 - a}deg is another ${180 - a}deg`,
  `Other three: ${180 - a}deg + ${a}deg + ${180 - a}deg = ${360 - a}deg`,
];
const adjScreen = (title: string, text: string[], a: number, instanceId: string) => ({
  title, text, math: [crossPrompt([a, 1]), ...adjLines(a)],
  role: "strategy", instance: instanceId, widget: crossingAdj(a),
});
const threeScreen = (title: string, text: string[], a: number, instanceId: string) => ({
  title, text, math: [crossPrompt([a, 2]), ...threeLines(a)],
  role: "strategy", instance: instanceId, widget: crossingThree(a),
});

// ── ahiso helpers (isosceles) ───────────────────────────────────
const isoPrompt = (p: number[]) => FAMILIES.get("ahiso")!.prompt!(p);
const isoFigure = (v: number, f: number) => ({ type: "triangle", angles: f === 0 ? ["?", "?", `${v}deg`] : [`${v}deg`, `${v}deg`, "?"] });
const isoBaseLines = (v: number) => [`Angle sum: 180deg`, `Two equal base angles share 180deg - ${v}deg = ${180 - v}deg`, `Each base angle: ${180 - v}deg / 2 = ${(180 - v) / 2}deg`];
const isoVertexLines = (v: number) => [`Both base angles are ${v}deg`, `Together: 2 x ${v}deg = ${2 * v}deg`, `Vertex angle: 180deg - ${2 * v}deg = ${180 - 2 * v}deg`];
const isoScreen = (title: string, text: string[], v: number, f: number, instanceId: string) => ({
  title, text, math: [isoPrompt([v, f]), ...(f === 0 ? isoBaseLines(v) : isoVertexLines(v))],
  role: "strategy", instance: instanceId, widget: isoFigure(v, f),
});

const COMP = "angle-pairs.complement@2", SUPP = "angle-pairs.supplement@2";
const ADJ = "angle-pairs.adjacent@2", THREE = "angle-pairs.other-three@2";
const ISO = "triangle-properties.isosceles-angles@1";

// Read existing blueprints to find existing strategies
const bps = JSON.parse(readFileSync(file, "utf8"));
const existingPairs = bps.blueprints.find((b: any) => b.extendsTemplate && b.competency === PAIRS);
const existingTri = bps.blueprints.find((b: any) => b.extendsTemplate && b.competency === TRI);
if (!existingPairs) throw new Error("No existing PAIRS template extension blueprint found");
if (!existingTri) throw new Error("No existing TRI template extension blueprint found");

// Build reserved sets from fromTemplate + existing strategy items
const pairsReserved = buildReserved("afpair", PAIRS, existingPairs.strategies);
const triReserved = buildReserved("ahtri", TRI, existingTri.strategies);

// Pick screen instances that avoid collisions, then pick guided/check from pools
const compScreen1 = inst(pairsReserved, "afpair", [0, 35]);
const compScreen2 = inst(pairsReserved, "afpair", [0, 72]);
const compGuided = pick(pairsReserved, "afpair", "practice", COMP, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, true);
const compCheck = pick(pairsReserved, "afpair", "check", COMP, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, false);

const suppScreen1 = inst(pairsReserved, "afpair", [1, 55]);
const suppScreen2 = inst(pairsReserved, "afpair", [1, 125]);
const suppGuided = pick(pairsReserved, "afpair", "practice", SUPP, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, true);
const suppCheck = pick(pairsReserved, "afpair", "check", SUPP, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, false);

const adjScreen1 = inst(pairsReserved, "afcross", [52, 1]);
const adjScreen2 = inst(pairsReserved, "afcross", [138, 1]);
const adjGuided = pick(pairsReserved, "afcross", "practice", ADJ, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, true);
const adjCheck = pick(pairsReserved, "afcross", "check", ADJ, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, false);

const threeScreen1 = inst(pairsReserved, "afcross", [47, 2]);
const threeScreen2 = inst(pairsReserved, "afcross", [131, 2]);
const threeGuided = pick(pairsReserved, "afcross", "practice", THREE, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, true);
const threeCheck = pick(pairsReserved, "afcross", "check", THREE, ANGLE_PAIRS_PRECISE_CONFIG as SubSkillConfig, false);

const isoBaseScreen1 = inst(triReserved, "ahiso", [50, 0]);
const isoBaseScreen2 = inst(triReserved, "ahiso", [100, 0]);
const isoBaseGuided = pick(triReserved, "ahiso", "practice", ISO, TRIANGLE_PROPERTIES_CONFIG as SubSkillConfig, true);
const isoBaseCheck = pick(triReserved, "ahiso", "check", ISO, TRIANGLE_PROPERTIES_CONFIG as SubSkillConfig, false);

const isoVertexScreen1 = inst(triReserved, "ahiso", [35, 1]);
const isoVertexScreen2 = inst(triReserved, "ahiso", [75, 1]);
const isoVertexGuided = pick(triReserved, "ahiso", "practice", ISO, TRIANGLE_PROPERTIES_CONFIG as SubSkillConfig, true);
const isoVertexCheck = pick(triReserved, "ahiso", "check", ISO, TRIANGLE_PROPERTIES_CONFIG as SubSkillConfig, false);

// New strategies to MERGE into existing blueprints
const newPairsStrategies = [
  { id: "complementary_angles", title: "Complementary angles add up to 90deg", kind: "conceptual", needs: [], scope: { family: "afpair", subSkill: COMP },
    screens: [
      pairScreen("Complementary angles add up to 90deg", [
        "Two angles are complementary when they together make a right angle: 90deg.",
        "To find the missing complement, take the given angle away from 90deg.",
      ], 0, 35, compScreen1),
      pairScreen("Complement of a larger angle", [
        "The closer the given angle is to 90deg, the smaller its complement.",
        "Take the given angle from 90deg. Check that the two angles add up to 90deg.",
      ], 0, 72, compScreen2),
    ],
    guided: compGuided, check: compCheck },
  { id: "supplementary_angles", title: "Supplementary angles add up to 180deg", kind: "conceptual", needs: [], scope: { family: "afpair", subSkill: SUPP },
    screens: [
      pairScreen("Supplementary angles add up to 180deg", [
        "Two angles are supplementary when they together make a straight angle: 180deg.",
        "To find the missing supplement, take the given angle away from 180deg.",
      ], 1, 55, suppScreen1),
      pairScreen("Supplement of an obtuse angle", [
        "When the given angle is obtuse (more than 90deg), its supplement is acute (less than 90deg).",
        "Take the given angle from 180deg. Check that the two add to 180deg.",
      ], 1, 125, suppScreen2),
    ],
    guided: suppGuided, check: suppCheck },
  { id: "adjacent_linear_pair", title: "Adjacent angles on a straight line", kind: "conceptual", needs: [], scope: { family: "afcross", subSkill: ADJ },
    screens: [
      adjScreen("Adjacent angles on a straight line", [
        "Where two straight lines cross, each pair of neighbouring angles lies on a straight line.",
        "Angles on a straight line add up to 180deg. Take the known angle from 180deg to find the one next to it.",
      ], 52, adjScreen1),
      adjScreen("Larger adjacent angle", [
        "If the known angle is acute, the adjacent angle is obtuse, and the other way round.",
        "Take the known angle from 180deg. The two together always make exactly 180deg.",
      ], 138, adjScreen2),
    ],
    guided: adjGuided, check: adjCheck },
  { id: "other_three_angles", title: "The other three angles at a crossing", kind: "procedural", needs: [], scope: { family: "afcross", subSkill: THREE },
    screens: [
      threeScreen("The other three angles at a crossing", [
        "All four angles at a crossing add up to 360deg (a full turn).",
        "Find the other three by going round: opposite is equal, neighbours add to 180deg. Then add all three.",
      ], 47, threeScreen1),
      threeScreen("When the angle is obtuse", [
        "Even with an obtuse angle, the rule is the same: go round the crossing.",
        "The four angles are the given angle, 180deg minus it, the given angle again, and 180deg minus it again. The other three add to 360deg minus the given.",
      ], 131, threeScreen2),
    ],
    guided: threeGuided, check: threeCheck },
];

const newTriStrategies = [
  { id: "isosceles_base", title: "Base angles of an isosceles triangle", kind: "conceptual", needs: [], scope: { family: "ahiso", subSkill: ISO },
    screens: [
      isoScreen("Base angles of an isosceles triangle", [
        "In an isosceles triangle the two sides that are equal face two equal angles (the base angles).",
        "Take the vertex angle (the one between the equal sides) from 180deg, then halve what is left: each base angle is half of the remainder.",
      ], 50, 0, isoBaseScreen1),
      isoScreen("A wider vertex angle", [
        "The bigger the vertex angle, the smaller each base angle.",
        "Always start with 180deg minus the vertex angle, then divide by 2.",
      ], 100, 0, isoBaseScreen2),
    ],
    guided: isoBaseGuided, check: isoBaseCheck },
  { id: "isosceles_vertex", title: "Vertex angle from a base angle", kind: "procedural", needs: [], scope: { family: "ahiso", subSkill: ISO },
    screens: [
      isoScreen("Find the vertex angle from a base angle", [
        "If you know one base angle, you know both (they are equal). Double the base angle and take it from 180deg.",
        "Check: the vertex angle plus both base angles should add to 180deg.",
      ], 35, 1, isoVertexScreen1),
      isoScreen("A larger base angle", [
        "Larger base angles leave less room for the vertex angle.",
        "Double the base angle first, then subtract from 180deg.",
      ], 75, 1, isoVertexScreen2),
    ],
    guided: isoVertexGuided, check: isoVertexCheck },
];

// Remove any old copies of my strategies, then MERGE into existing blueprints
const myIds = new Set([...newPairsStrategies, ...newTriStrategies].map(s => s.id));
// Remove my strategies from any blueprint that has them
for (const b of bps.blueprints) {
  if (b.strategies) b.strategies = b.strategies.filter((s: any) => !myIds.has(s.id));
}
// Also remove any standalone blueprints I created previously that are now empty or duplicate
bps.blueprints = bps.blueprints.filter((b: any) => !b.strategies || b.strategies.length > 0);

// Append new strategies to the existing blueprints
existingPairs.strategies.push(...newPairsStrategies);
existingTri.strategies.push(...newTriStrategies);

writeFileSync(file, JSON.stringify(bps, null, 1) + "\n");
console.log(`Merged ${newPairsStrategies.length} strategies into PAIRS blueprint, ${newTriStrategies.length} into TRI blueprint`);
console.log("complement guided:", compGuided, "check:", compCheck);
console.log("supplement guided:", suppGuided, "check:", suppCheck);
console.log("adjacent guided:", adjGuided, "check:", adjCheck);
console.log("other-three guided:", threeGuided, "check:", threeCheck);
console.log("iso-base guided:", isoBaseGuided, "check:", isoBaseCheck);
console.log("iso-vertex guided:", isoVertexGuided, "check:", isoVertexCheck);
process.exit(0);
