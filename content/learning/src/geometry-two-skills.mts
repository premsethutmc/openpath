/**
 * Authoring source for two geometry skills taught inside the existing TEMPLATE modules (Blueprint.extendsTemplate: the
 * template module is unchanged; skill-scoped explanations are appended):
 *   MATH.geometry.triangle-properties  the exterior angle of a triangle   (ahext; triangle-properties.exterior-angle@1)
 *   MATH.geometry.angle-pairs          vertically opposite angles        (afcross mode 0; angle-pairs.opposite@2)
 * Text, worked lines and items are reused from the review candidates on feat/math-teaching-content@4e655e73
 * (docs/math-teaching-content/batch-1/TP-GEO-01 and TP-GEO-02: explanation, alternative explanation, worked examples,
 * guided practice and rechecks); pictures use the existing visuals@2 renderer (PR #99/#100: triangle `exterior`, angle
 * `cross`). Only GENERAL skill teaching is added: the packages' misconception fixes (third-interior, adjacent-interior,
 * exterior-as-interior, opposite-as-linear, neighbour-equal) are not published, because the families declare no contrast
 * evidence (bug.evidence.correctContrasts) that would separate those misconceptions from a slip; one wrong answer is never a
 * proven misconception. Every explanation is a candidate: the review registry records it as pending review.
 *   cd frontend && node --import tsx ../content/learning/src/geometry-two-skills.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES } from "../../../packages/learning/src/families";

const file = new URL("../blueprints.v1.json", import.meta.url);
const AUTHOR = "Claude candidate 4e655e73 (TP-GEO-01, TP-GEO-02); OpenPath integration (written with AI assistance; not educator-reviewed)";
const TRI = "MATH.geometry.triangle-properties", PAIRS = "MATH.geometry.angle-pairs";
const EXT = "triangle-properties.exterior-angle@1", OPP = "angle-pairs.opposite@2";
const id = (fam: string, p: number[]) => `gen:${fam}:${p.join(",")}`;

/** TP-GEO-01's worked lines (its independent oracle), for either form of ahext; vertex C carries the exterior angle */
const extLines = ([a, b, f]: number[]) => f === 0
  ? [`Third interior angle C = 180° − ${a}° − ${b}° = ${180 - a - b}° (angle sum)`, `Exterior angle = 180° − ${180 - a - b}° = ${a + b}° (straight line)`, `Check: ${a}° + ${b}° = ${a + b}° (exterior-angle theorem)`]
  : [`Interior angle next to the exterior angle C = 180° − ${a + b}° = ${180 - a - b}° (straight line)`, `Other opposite angle = 180° − ${a}° − ${180 - a - b}° = ${b}° (angle sum)`, `Check: ${a}° + ${b}° = ${a + b}° (exterior-angle theorem)`];
const extPrompt = (p: number[]) => FAMILIES.get("ahext")!.prompt!(p);
const extFigure = (p: number[]) => FAMILIES.get("ahext")!.teach!.visual!(p) as Record<string, unknown>;
/** TP-GEO-02's worked lines for the vertically opposite angle (go round the crossing) */
const oppLines = (a: number) => [`next angle round = 180° − ${a}° = ${180 - a}° (straight line)`, `the one after = 180° − ${180 - a}° = ${a}° (straight line): the opposite angle is ${a}°`];
const oppPrompt = (a: number) => FAMILIES.get("afcross")!.prompt!([a, 0]);
const crossing = (a: number) => ({ type: "angle", deg: a, cross: true, labels: [`${a}°`, "", "?", ""] });

const exteriorScreen = (title: string, text: string[], p: number[]) => ({ title, text, math: [extPrompt(p), ...extLines(p)], role: "strategy", instance: id("ahext", p), widget: extFigure(p) });
const oppositeScreen = (title: string, text: string[], a: number) => ({ title, text, math: [oppPrompt(a), ...oppLines(a)], role: "strategy", instance: id("afcross", [a, 0]), widget: crossing(a) });

const blueprints = [
  {
    extendsTemplate: true, competency: TRI, title: "The third angle of a triangle", family: "ahtri", seed: [35, 90], author: AUTHOR, aiAssisted: true, licence: "CC0", chapter: [],
    strategies: [
      { id: "exterior_angle", title: "The exterior angle of a triangle", kind: "conceptual", needs: [], scope: { family: "ahext", subSkill: EXT },
        // TP-GEO-01 "Explanation", shown on both of its question forms (find the exterior angle; find an interior opposite angle)
        screens: [
          exteriorScreen("The exterior angle of a triangle", [
            "At C the exterior angle and the interior angle next to it lie on a straight line, so together they make 180°.",
            "The three interior angles also make 180°. Both pairs make 180° and share the angle at C, so the exterior angle equals the other two interior angles together."], [39, 112, 0]),
          exteriorScreen("When the exterior angle is given", [
            "The exterior angle equals the two far interior angles together.",
            "So one far angle is the exterior angle minus the other far angle. Go through the angle next to the exterior angle to check."], [108, 27, 1]),
        ],
        guided: "gen:ahext:62,79,0:mc", check: "gen:ahext:86,70,0:mc" },
      { id: "exterior_via_third", title: "Go through the third angle", kind: "procedural", needs: [], scope: { family: "ahext", subSkill: EXT },
        // TP-GEO-01 "Alternative explanation: Go through the third angle"
        screens: [exteriorScreen("Go through the third angle", [
          "Find the third interior angle with the angle sum.",
          "The exterior angle and that angle lie on a straight line, so the exterior angle is a straight angle minus the third angle."], [34, 27, 0])],
        guided: "gen:ahext:34,63,0:mc", check: "gen:ahext:44,76,1" },
    ],
  },
  {
    extendsTemplate: true, competency: PAIRS, title: "Missing angle in a complementary or supplementary pair", family: "afpair", seed: [1, 130], author: AUTHOR, aiAssisted: true, licence: "CC0", chapter: [],
    strategies: [
      { id: "vertically_opposite", title: "Vertically opposite angles are equal", kind: "conceptual", needs: [], scope: { family: "afcross", subSkill: OPP },
        // TP-GEO-02 "Explanation"
        screens: [oppositeScreen("Vertically opposite angles are equal", [
          "Where two straight lines cross, angles next to each other lie on a straight line, so they add to 180°.",
          "Go round: x, then 180° − x, then 180° − (180° − x) = x again. So opposite angles are equal, and all four add to 360°."], 128)],
        guided: "gen:afcross:29,0:mc", check: "gen:afcross:158,0:mc" },
      { id: "crossed_pencils", title: "Two crossed pencils", kind: "conceptual", needs: [], scope: { family: "afcross", subSkill: OPP },
        // TP-GEO-02 "Alternative explanation: Two crossed pencils"
        screens: [oppositeScreen("Two crossed pencils", [
          "Hold two straight pencils crossed like an X.",
          "Open them wider: the top and bottom angles grow together while the two side angles shrink together. Opposite angles stay equal."], 104)],
        guided: "gen:afcross:152,0:mc", check: "gen:afcross:70,0" },
    ],
  },
];

const bps = JSON.parse(readFileSync(file, "utf8"));
const mine = (b: { competency: string; extendsTemplate?: boolean }) => !!b.extendsTemplate && [TRI, PAIRS].includes(b.competency);
if (bps.blueprints.some((b: { competency: string; extendsTemplate?: boolean }) => [TRI, PAIRS].includes(b.competency) && !mine(b))) throw new Error("a hand-written blueprint already exists for these competencies");
bps.blueprints = [...bps.blueprints.filter((b: { competency: string; extendsTemplate?: boolean }) => !mine(b)), ...blueprints];
writeFileSync(file, JSON.stringify(bps, null, 1) + "\n");
console.log(`wrote ${blueprints.length} template extensions`);
process.exit(0);
