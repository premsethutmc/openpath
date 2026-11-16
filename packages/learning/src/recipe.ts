/**
 * recipe@1: the lesson recipe. One fixed sequence that every concept's opening lesson follows, filled in from data.
 *
 *   1. the question   something worth asking, before any rule or name
 *   2. predict        the learner guesses first; each guess gets its own reply
 *   3. missions       the learner finds it out by moving something (scenes, one goal each, in order)
 *   4. name it        only now: what it is called and the short way of doing it
 *   5. how to solve it one worked example, a step at a time (the lesson's own example, with the family's verified steps)
 *   6. try one        one choice: a first go at it, or a question to think about
 *
 * After the recipe the module carries on as before: worked examples, guided practice and the checks that count. Those are
 * the "do one with help", "do one alone" and "come back later" parts, and they already keep the evidence. Nothing in a
 * recipe is evidence: a guess, a mission or a choice writes nothing to the learner's record.
 *
 * A recipe is data. `checkRecipe` must find no problem with it, or it is not shown. No model or network is involved.
 */
import { check, type Scene } from "./scene";
import { moduleFor } from "./content";
import { explainStep, problemOf } from "./families";

/** One choice the learner can tap, with what is said back. Exactly one choice of a set is `right`. */
export interface Choice { label: string; reply: string; right?: true }
export interface Recipe {
  competency: string;
  /** What kind of skill the lesson is for: a new idea, a method with many steps, or a fact or definition. The layout and
   *  the weight of each part follow from it (see `layoutFor`). */
  type: "idea" | "method" | "fact";
  /** A short title for the top of every step. */
  title: string;
  /** Step 1: the question, in one to three short paragraphs. No rule, no name of the idea. */
  question: string[];
  /** Step 2: the guess. */
  predict: { ask: string; choices: Choice[] };
  /** Step 3: one to four missions, each a scene with its own goal. */
  missions: Scene[];
  /** Step 4: the name and the short way, in one to three short paragraphs. */
  name: string[];
  /** The words that name the idea. None may appear before step 4 (checked), and step 4 must use at least one. */
  names: string[];
  /** The last step: "try" is a first go at the method (headed "Try one"); "think" is a question about the idea (headed
   *  "Think about it"). */
  choose: { kind: "try" | "think"; ask: string; choices: Choice[] };
}

const text = (t: unknown, max: number) => typeof t === "string" && t.trim().length > 0 && t.length <= max;
const paragraphs = (v: unknown) => Array.isArray(v) && v.length >= 1 && v.length <= 3 && v.every((t) => text(t, 220));
function choices(v: unknown, name: string): string[] {
  const c = v as { ask?: unknown; choices?: unknown };
  if (!c || !text(c.ask, 160) || !Array.isArray(c.choices) || c.choices.length < 2 || c.choices.length > 4) return [`${name} needs a question and two to four choices`];
  const list = c.choices as Choice[];
  if (!list.every((o) => o && text(o.label, 60) && text(o.reply, 200) && (o.right === undefined || o.right === true))) return [`${name}: every choice needs a short label and a reply`];
  if (list.filter((o) => o.right).length !== 1) return [`${name} needs exactly one right choice`];
  if (new Set(list.map((o) => o.label)).size !== list.length) return [`${name}: two choices read the same`];
  return [];
}
/** The problems with a recipe; an empty list means it may be shown. */
export function checkRecipe(v: unknown): string[] {
  const r = v as Recipe, bad: string[] = [];
  if (!r || typeof r !== "object") return ["not a recipe"];
  if (!text(r.competency, 80) || !text(r.title, 60)) bad.push("a recipe needs a competency and a short title");
  if (r.type !== "idea" && r.type !== "method" && r.type !== "fact") bad.push("a recipe needs a type: idea, method or fact");
  if (!paragraphs(r.question)) bad.push("the question is one to three short paragraphs");
  if (!paragraphs(r.name)) bad.push("the name step is one to three short paragraphs");
  bad.push(...choices(r.predict, "predict"), ...choices(r.choose, "choose"));
  if (r.choose && r.choose.kind !== "try" && r.choose.kind !== "think") bad.push("choose needs a kind: try or think");
  if (!Array.isArray(r.missions) || r.missions.length < 1 || r.missions.length > 4) bad.push("one to four missions");
  else r.missions.forEach((m, i) => { const p = check(m); if (p.length) bad.push(`mission ${i + 1}: ${p[0]}`); });
  if (!Array.isArray(r.names) || r.names.length < 1 || r.names.length > 5 || !r.names.every((n) => text(n, 30) && n.trim().length >= 3)) bad.push("names: one to five words that name the idea");
  if (bad.length) return bad;
  // the idea is found before it is named: none of its names in the question, the guess or the missions
  const early = [...r.question, r.predict.ask, ...r.predict.choices.flatMap((c) => [c.label, c.reply]), ...r.missions.flatMap((m) => [m.prompt, m.success])].join(" ").toLowerCase();
  const said = r.names.filter((n) => early.includes(n.toLowerCase()));
  if (said.length) bad.push(`named before the name step: ${said.join(", ")}`);
  if (!r.names.some((n) => r.name.join(" ").toLowerCase().includes(n.toLowerCase()))) bad.push("the name step does not use any of the names");
  return bad;
}

/** The steps of a recipe, in order: what the player walks through. */
export type RecipeStep = { kind: "question" } | { kind: "predict" } | { kind: "mission"; index: number } | { kind: "name" } | { kind: "solve" } | { kind: "choose" };
/** The steps in order. `solve` is included when the lesson has a worked example to show (see `workedFor`). */
export const stepsOf = (r: Recipe, solve = false): RecipeStep[] => [{ kind: "question" }, { kind: "predict" }, ...r.missions.map((_, index) => ({ kind: "mission" as const, index })), { kind: "name" }, ...(solve ? [{ kind: "solve" as const }] : []), { kind: "choose" }];

/**
 * layout@1: how a recipe is laid out, decided by rule and not written for each lesson.
 *   "steps"  one thing on the screen at a time, with Next. For Classes 1 to 5: a young child loses their place on a page
 *            that scrolls.
 *   "flow"   one page that grows: each part appears under the last once that one is done, and what is done stays in view
 *            (a finished mission shrinks to one line). A new screen is only needed where showing the next thing would spoil
 *            the present one, and a part that waits its turn does that without one.
 * The class is the learner's (null when it is not known: then the page that grows).
 */
export type RecipeLayout = "steps" | "flow";
export const layoutFor = (_r: Recipe, grade: number | null): RecipeLayout => (grade !== null && grade <= 5 ? "steps" : "flow");

/** The worked example for "how to solve it": the question the skill's lesson already opens on, with the steps and answer
 *  its family verifies. It is the lesson's own example on purpose: showing it is already counted as shown when the
 *  teaching is recorded, so it cannot later be taken as an answer given unaided. Null when the lesson has none. */
export function workedFor(competency: string): { prompt: string; steps: string[]; answer: string; figure?: { type: string; [k: string]: unknown } } | null {
  const id = moduleFor(competency)?.chapter.find((s) => s.instance)?.instance;
  const p = id ? problemOf(id) : null;
  if (!p || !p.steps.length) return null;
  return { prompt: p.prompt, steps: p.steps.map((s) => explainStep(p, s)), answer: p.answer, ...(p.figure ? { figure: p.figure } : {}) };
}

const RECIPES: Recipe[] = [
  // Integrals, as a learner first meets them (the skill that integrates powers of x). The opening lesson of this skill
  // exists and records its teaching, so the recipe opens it.
  {
    competency: "MATH.calculus.indefinite-integrals",
    type: "idea",
    title: "Adding up something that changes",
    question: [
      "A tap opens slowly. After t minutes it is pouring 2t litres a minute: nothing at first, 2 after one minute, 6 after three.",
      "How much water is in the tank after 3 minutes?",
    ],
    predict: {
      ask: "Before working anything out, what is your guess?",
      choices: [
        { label: "6 litres", reply: "6 is how fast it pours at the end, not how much has poured. Let's find out." },
        { label: "9 litres", reply: "Good instinct. Let's see why.", right: true },
        { label: "18 litres", reply: "18 would be right if it poured 6 a minute the whole time. It started from nothing. Let's find out." },
      ],
    },
    missions: [
      { type: "scene", kind: "accumulate", variable: "t", poly: [2], from: 0, to: 3, step: 0.05, prompt: "First a steady tap: 2 litres a minute. Drag the edge to t = 3.", success: "A steady rate is easy: 2 × 3 = 6 litres. The water is the area under the line.", goal: { measure: "x", equals: 3 } },
      { type: "scene", kind: "strips", variable: "t", poly: [0, 2], from: 0, to: 3, max: 100, prompt: "Now the slow tap. Pretend it holds steady for a slice of time. Add slices until under 2% is missing.", success: "Thinner slices, and the total settles on 9 litres: the area under the sloping line.", goal: { measure: "gapPercent", below: 2 } },
      { type: "scene", kind: "accumulate", variable: "t", poly: [0, 2], from: 0, to: 3, step: 0.05, prompt: "Slices are slow. Drag the edge to t = 3 and watch the total at t = 1, 2 and 3.", success: "Totals 1, 4, 9 at t = 1, 2, 3. The total so far is always t².", goal: { measure: "x", equals: 3 } },
      { type: "scene", kind: "slope", variable: "t", poly: [0, 0, 1], from: 0, to: 3, step: 0.05, prompt: "This curve is t², the total so far. Slide to where its slope is 4.", success: "At t = 2 the slope of t² is 4, which is 2t: the slope of the total is the pouring rate.", goal: { measure: "slope", equals: 4 } },
    ],
    names: ["integra", "antiderivative"],
    name: [
      "Adding up something that keeps changing is called integrating. The total is the area under the graph, written ∫ from 0 to 3 of 2t dt = 9.",
      "t² is an antiderivative of 2t: the curve whose slope is 2t. The short way is to find it, put in the end, put in the start, and subtract: 3² − 0² = 9.",
      "For a power: raise the power by one, then divide by the new power. xⁿ becomes xⁿ⁺¹ ⁄ (n + 1).",
    ],
    choose: {
      kind: "try",
      ask: "A different tap pours 3t² litres a minute. Which gives the total after t minutes?",
      choices: [
        { label: "6t", reply: "6t is how fast the pouring rate itself changes, one step the wrong way. We want the curve whose slope is 3t²." },
        { label: "t³", reply: "Yes. Raise the power to 3, divide by 3: 3t³ ⁄ 3 = t³. Its slope is 3t².", right: true },
        { label: "3t³", reply: "Raise the power, then also divide by the new power: 3t³ ⁄ 3 = t³." },
      ],
    },
  },
  // Differentiation, as first met: how fast, at one instant.
  {
    competency: "MATH.calculus.derivative-rules",
    type: "idea",
    title: "How fast, right now?",
    question: [
      "A ball rolls down a ramp, faster and faster. After t seconds it has rolled t² metres: 1 after one second, 4 after two, 9 after three.",
      "How fast is it going at exactly t = 3?",
    ],
    predict: {
      ask: "Before working anything out, what is your guess?",
      choices: [
        { label: "3 metres a second", reply: "3 is its average over the whole 3 seconds. It started slow, so by now it is faster than that. Let's find out." },
        { label: "6 metres a second", reply: "Good instinct. Let's see why.", right: true },
        { label: "9 metres a second", reply: "9 is how far it has rolled, not how fast it is going. Let's find out." },
      ],
    },
    missions: [
      { type: "scene", kind: "slope", variable: "t", poly: [0, 0, 1], from: 0, to: 4, step: 0.05, prompt: "This curve is the distance, t². Its steepness is the speed. Slide the point to t = 3.", success: "At t = 3 the slope is 6: the ball is doing 6 metres a second at that instant.", goal: { measure: "x", equals: 3 } },
      { type: "scene", kind: "slope", variable: "t", poly: [0, 0, 1], from: 0, to: 4, step: 0.05, prompt: "Now find the moment when the speed is exactly 2.", success: "Speed 2 at t = 1, and it was 6 at t = 3. The slope of t² is always 2t.", goal: { measure: "slope", equals: 2 } },
      { type: "scene", kind: "slope", variable: "t", poly: [0, 0, 0, 1], from: 0, to: 3, step: 0.05, prompt: "A steeper ramp: distance t³. Slide to t = 2 and read the speed.", success: "At t = 2 the slope of t³ is 12, which is 3 × 2². The power came down in front and dropped by one.", goal: { measure: "x", equals: 2 } },
    ],
    names: ["derivative", "differentiat"],
    name: [
      "The slope of a curve at one point is called its derivative there. Finding it is called differentiating.",
      "The short way for a power: bring the power down in front, then lower the power by one. t² gives 2t, and t³ gives 3t².",
    ],
    choose: {
      kind: "try",
      ask: "Another ramp: the ball has rolled t⁴ metres after t seconds. How fast is it going at time t?",
      choices: [
        { label: "4t³", reply: "Yes. The 4 comes down in front and the power drops to 3.", right: true },
        { label: "t³", reply: "The power dropped by one, but the old power must also come down in front: 4t³." },
        { label: "4t⁴", reply: "The 4 came down, but the power must also drop by one: 4t³." },
      ],
    },
  },
  // What a matrix does, before multiplying two of them.
  {
    competency: "MATH.algebra.matrices",
    type: "idea",
    title: "Four numbers that move a shape",
    question: [
      "A drawing app can stretch a picture, flip it like a mirror, or turn it. Inside, each of these moves is stored as just four numbers.",
      "How can four numbers say where every point of the picture should go?",
    ],
    predict: {
      ask: "Two arrows start as one step right and one step up. To make the picture twice as wide, what would you change?",
      choices: [
        { label: "Make the right arrow twice as long", reply: "Good instinct. Let's try it.", right: true },
        { label: "Make the up arrow twice as long", reply: "That makes it twice as tall, not twice as wide. Let's try both." },
        { label: "Make both arrows twice as long", reply: "That makes it bigger in both directions. Let's try it and see." },
      ],
    },
    missions: [
      { type: "scene", kind: "transform", target: [2, 0, 0, 1], prompt: "Drag the arrows. Make the shape twice as wide.", success: "The first arrow now lands at (2, 0), and everything followed it: twice as wide.", goal: { measure: "miss", equals: 0 } },
      { type: "scene", kind: "transform", target: [-1, 0, 0, 1], prompt: "Flip the shape left to right, like a mirror.", success: "The first arrow points backwards, at (−1, 0), and the shape is its own mirror image.", goal: { measure: "miss", equals: 0 } },
      { type: "scene", kind: "transform", target: [0, 1, -1, 0], prompt: "Turn the shape a quarter turn to the left.", success: "Both arrows turned together: the first to (0, 1), the second to (−1, 0).", goal: { measure: "miss", equals: 0 } },
    ],
    names: ["matrix", "matrices"],
    name: [
      "Those four numbers are a matrix. Its first column is where the first arrow lands, and its second column is where the second arrow lands.",
      "Multiplying two matrices means doing one move and then the other. That is why each entry comes from a row of one and a column of the other.",
    ],
    choose: {
      kind: "think",
      ask: "Turn then stretch, or stretch then turn: do the two orders always give the same picture?",
      choices: [
        { label: "Yes, always", reply: "Try it in your head: widen then turn makes it tall; turn then widen makes it wide. The order matters." },
        { label: "No, the order can matter", reply: "Yes. That is why AB and BA can be different matrices.", right: true },
      ],
    },
  },
  // The determinant as what the move does to area.
  {
    competency: "MATH.algebra.determinants",
    type: "idea",
    title: "How much bigger did it get?",
    question: [
      "Four numbers move a picture: the first pair says where a one-step-right arrow lands, the second pair where a one-step-up arrow lands.",
      "Can you tell from the four numbers alone how much bigger the picture gets?",
    ],
    predict: {
      ask: "The arrows land at (2, 0) and (0, 3). The picture's area is multiplied by what?",
      choices: [
        { label: "5", reply: "5 is 2 + 3. Twice as wide and three times as tall multiplies the area. Let's check." },
        { label: "6", reply: "Good instinct. Let's check it, and then try stranger moves.", right: true },
        { label: "3", reply: "3 is only the taller direction. It also got twice as wide. Let's check." },
      ],
    },
    missions: [
      { type: "scene", kind: "transform", target: [2, 0, 0, 3], prompt: "Set the arrows to (2, 0) and (0, 3), and read the area.", success: "Area × 6: twice as wide times three times as tall.", goal: { measure: "miss", equals: 0 } },
      { type: "scene", kind: "transform", prompt: "Now flip the shape over without changing its size. Watch the area number.", success: "Area × −1. Same size, but turned over: a negative sign means the picture was flipped.", goal: { measure: "det", equals: -1 } },
      { type: "scene", kind: "transform", prompt: "Squash the shape completely flat, onto one line.", success: "Area × 0. Everything is crushed onto a line, and there is no way back from that.", goal: { measure: "det", equals: 0 } },
    ],
    names: ["determinant"],
    name: [
      "That area number is the determinant. For arrows landing at (a, b) and (c, d) it is ad − bc.",
      "Negative means flipped. Zero means squashed flat, and then the move cannot be undone: the matrix has no inverse.",
    ],
    choose: {
      kind: "try",
      ask: "The arrows land at (2, 1) and (4, 2). What does ad − bc tell you?",
      choices: [
        { label: "2 × 2 − 1 × 4 = 0: squashed flat", reply: "Yes. Both arrows point along the same line, so the picture is crushed onto it.", right: true },
        { label: "2 × 2 + 1 × 4 = 8: eight times bigger", reply: "The two products are subtracted, not added: 4 − 4 = 0." },
        { label: "2 × 4 − 1 × 2 = 6: six times bigger", reply: "Multiply across the corners: a with d, and b with c. That gives 4 − 4 = 0." },
      ],
    },
  },
  // The slope of a line through two points.
  {
    competency: "MATH.coordinate.straight-lines",
    type: "idea",
    title: "How steep is the road?",
    question: [
      "A straight road runs from A(−2, −1) to B(3, 2) on a map.",
      "How would you tell someone exactly how steep it is, with one number?",
    ],
    predict: {
      ask: "From A to B the road goes 5 across and 3 up. Which number says how steep it is?",
      choices: [
        { label: "3 ÷ 5", reply: "Good instinct. Let's check it.", right: true },
        { label: "5 ÷ 3", reply: "That grows when the road gets flatter. Steeper should mean a bigger number. Let's check." },
        { label: "5 + 3", reply: "8 is how far you travel across and up together, not how steep it is. Let's check." },
      ],
    },
    missions: [
      { type: "scene", kind: "line", mLabel: "Tilt", through: [-2, -1], targets: [[3, 2]], window: [-7, 7, -7, 7], m: [-3, 3, 0.2], prompt: "Turn the line about A(−2, −1) until it passes through B(3, 2).", success: "It passes through B at 0.6, which is 3 ÷ 5: up 3 for every 5 across.", goal: { measure: "miss", below: 1e-4 } },
      { type: "scene", kind: "line", mLabel: "Tilt", through: [-2, 3], targets: [[2, -1]], window: [-7, 7, -7, 7], m: [-3, 3, 0.5], prompt: "A road going downhill: turn the line about A(−2, 3) until it passes through B(2, −1).", success: "It passes through B at −1: down 4 for every 4 across. Downhill is a negative number.", goal: { measure: "miss", below: 1e-4 } },
    ],
    names: ["slope", "gradient"],
    name: [
      "That number is the slope of the line: the change in y divided by the change in x between any two of its points.",
      "With the slope m and one point, the whole line is fixed: y = mx + c, where c is where it crosses the y-axis.",
    ],
    choose: {
      kind: "try",
      ask: "A line passes through (1, 2) and (3, 10). What is its slope?",
      choices: [
        { label: "4", reply: "Yes. Up 8 for 2 across: 8 ÷ 2 = 4.", right: true },
        { label: "8", reply: "8 is the change in y. Divide it by the change in x, which is 2." },
        { label: "1/4", reply: "That is across divided by up. The slope is up divided by across: 8 ÷ 2." },
      ],
    },
  },
  // The angles of a triangle.
  {
    competency: "MATH.geometry.triangle-properties",
    type: "idea",
    title: "The three corners",
    question: [
      "Draw any triangle on paper: tall, flat, lopsided. Tear off its three corners and put them side by side, point to point.",
      "What do the three corners make together?",
    ],
    predict: {
      ask: "What is your guess?",
      choices: [
        { label: "A square corner", reply: "A square corner is 90°. Three corners make more than that. Let's find out." },
        { label: "A straight line", reply: "Good instinct. Let's see if it is true for every triangle.", right: true },
        { label: "It depends on the triangle", reply: "It feels that way, because the corners change. Let's see what happens to all three together." },
      ],
    },
    missions: [
      { type: "scene", kind: "triangle", angles: [40, 75], prompt: "Set angle A to 40° and angle B to 75°. Watch the third corner.", success: "The third corner is 65°, and 40 + 75 + 65 = 180: a straight line.", goal: { measure: "miss", equals: 0 } },
      { type: "scene", kind: "triangle", angles: [90, 30], prompt: "A very different triangle: set A to 90° and B to 30°.", success: "The third corner is 60°, and 90 + 30 + 60 = 180 again.", goal: { measure: "miss", equals: 0 } },
      { type: "scene", kind: "triangle", angles: [20, 20], prompt: "A flat one: set A to 20° and B to 20°.", success: "The third corner opens to 140°, and the three still make 180.", goal: { measure: "miss", equals: 0 } },
    ],
    names: ["angle sum"],
    name: [
      "This is the angle sum of a triangle: its three angles always add up to 180°, a straight line.",
      "So when you know two angles you know the third: take both away from 180°.",
    ],
    choose: {
      kind: "think",
      ask: "Someone says a triangle has angles of 100° and 90°. Can it?",
      choices: [
        { label: "Yes, the third is small", reply: "100 + 90 is already 190, more than 180. There is nothing left for a third corner." },
        { label: "No", reply: "Yes: 100 + 90 is already more than 180, so no triangle has both.", right: true },
      ],
    },
  },
];

/** Every recipe (for tests and review). */
export const ALL_RECIPES: readonly Recipe[] = RECIPES;
/** The recipe for a competency, or null: none written, or one with any problem. */
export function recipeFor(competency: string): Recipe | null {
  const r = RECIPES.find((x) => x.competency === competency);
  return r && checkRecipe(r).length === 0 ? r : null;
}
