/**
 * Curriculum interpretation by mathematical meaning (mapping@2; meaning@3 adds secondary-school concepts and the
 * competency concept annotations of content/learning/competency-concepts.v1.json).
 *
 * An outcome and a competency are each read into CONCEPTS: the mathematical objects, operations and relations they
 * talk about (fraction, equivalence, comparison, addition, area, perimeter, remainder, …), recognised through
 * synonyms, symbols and typical school phrasings ("the same amount", "which is bigger", "the distance around",
 * "left over"). Two outcomes that say the same mathematics in different words get the same concepts, and so the same
 * competency, whatever the board or the textbook's wording.
 *
 * Score = coverage of the outcome's concepts (weighted by how rare each concept is across the competency map) and
 * precision against the competency's concepts, minus a grade-distance penalty. Each mapping says whether it is
 * clear, UNCERTAIN (two competencies close, or a weak match: a reviewer must choose) or MISSING (no competency carries
 * the outcome's concepts: a provisional proposal with its source reference). Nothing is authoritative until reviewed.
 */
import annotations from "../../../content/learning/competency-concepts.v1.json";
import { graph, type Competency } from "./graph";

export const MEANING_VERSION = "meaning@3";

/** Concept → phrasings (regular expressions on lower-case text). Order does not matter. */
const LEXICON: Record<string, RegExp[]> = {
  fraction: [/fraction/, /numerator/, /denominator/, /\b\d+\/\d+\b/, /[½⅓¼¾⅔]/, /\bhalf\b(?![- ]hours?)|\bhalves\b|quarter(?![- ]hour| past| to\b)|third|eighth|fifths?\b|sixths?\b|tenths?\b(?! place)/, /part of (a|the|one) (whole|shape)|parts of a whole|equal (parts|pieces)/],
  ofQuantity: [/(fraction|half|quarter|third)s? of (a |an |the )?(collection|set|group|number|quantity|amount)|of a collection|of \d+ (objects|things|items|sweets|people)/],
  equivalence: [/equivalent/, /same (amount|value|size|number)\b(?! of)/, /name the same/, /equal fractions/, /simplest form|lowest terms|simplif/],
  comparison: [/compar/, /\border\b|\bordering\b/, /bigger|larger|greater|smaller|less than|more than|which is more|which .* (more|less)/],
  likeDenominators: [/\blike (fractions|denominators)/, /same (denominator|bottom number)/],
  unlikeDenominators: [/unlike (fractions|denominators)/, /different (denominators|bottom numbers)/],
  addition: [/\badd/, /\bsum\b/, /total/, /altogether/, /plus\b/, /combine/],
  subtraction: [/subtract/, /take away/, /difference/, /minus\b/],
  multiplication: [/multipl/, /times\b/, /\bproduct/, /×/],
  facts: [/facts?\b/, /times ?tables?/, /recall/, /\btables\b/],
  multiDigit: [/multi-?digit/, /\b\d-digit/, /three-digit|two-digit|four-digit/, /in columns|long multiplication/],
  division: [/divi/, /\bshare/, /sharing/, /quotient/, /÷/, /equal groups/],
  remainder: [/remainder/, /left over/, /leftover/],
  largeNumbers: [/large numbers/, /\b100 ?000\b|\b10 ?000\b|lakh|crore|millions?|thousands/, /place value/],
  rounding: [/\bround(ing|ed|s)?\b/, /nearest (ten|hundred|thousand|10|100|1000)/],
  estimation: [/estimat/, /reasonable|check (the |an )?answer/],
  area: [/\barea/, /space (covered|inside)/, /square units|unit squares|cm²|m²|square (cm|centimetres|metres)/],
  perimeter: [/perimeter/, /distance around/, /around the (edge|outside)/, /fenc/, /boundary/],
  rectangle: [/rectang/, /\boblong/],
  volume: [/volume/, /unit cubes|cubic/],
  angle: [/\bangles?\b/, /\bturns?\b|quarter turn/],
  circle: [/circle/, /radi(us|i)/, /diameter/, /centre|center/],
  decimals: [/decimal/, /tenths place|hundredths/],
  percent: [/percent/, /%/, /per cent/],
  primes: [/prime/, /composite/],
  factorsMultiples: [/factors?\b(?! the)/, /multiples?\b/, /common multiple|lcm|hcf|gcd/],
  expressions: [/expression/, /symbol/, /variable/, /letter for/, /rule with/],
  patterns: [/pattern/, /rule in words|number rule/],
  equations: [/equation/, /solve for/, /unknown/],
  linear: [/linear/, /one-step|two-step|simple equations/],
  oneVariable: [/one variable|single variable|one unknown/],
  twoVariables: [/two variables|two unknowns|pairs? of (linear )?equations|simultaneous/],
  quadratic: [/quadratic/, /x²|x\^2|second degree/],
  discriminant: [/discriminant/, /nature of (the )?roots/],
  progression: [/progression/, /arithmetic sequence|\bsequence/, /nth term|common difference/],
  geometric: [/geometric (progression|sequence|series)|common ratio/],
  inverse: [/\binverse\b|inversely/],
  applications: [/\bapplications?\b/],
  coordinates: [/coordinate/, /quadrant/, /plot(ting)? points/, /\bx-axis|\by-axis|ordered pairs?/],
  distance: [/distance (formula|between)/, /section formula/],
  straightLine: [/straight[- ]line|slope|gradient|y = mx/],
  sets: [/\bsets?\b/, /union|intersection|venn/],
  functions: [/function/, /domain|range/],
  inequalities: [/inequalit/],
  limits: [/limit/],
  derivatives: [/derivative|differentiat/],
  integrals: [/integra/, /area under/],
  mean: [/\bmean\b|average/],
  data: [/bar (chart|graph)|pictograph|tally|data/],
  ratio: [/ratio|proportion/, /unit rate|per unit/],
  rationalNumbers: [/rational numbers?/, /negative fractions/],
  squareRoots: [/square roots?|√/, /perfect squares?/],
  identities: [/identit/, /\(a ?\+ ?b\)²|\(a\+b\)\^2/],
  factorise: [/factoris|factoriz|factor (the )?(expression|quadratic)/],
  reasoning: [/counterexample|counter-example|test a (claim|generalisation)|show .* (is )?wrong/],
  clock: [/clock|tell(ing)? the time|o.clock|minutes past/],
  elapsedTime: [/elapsed|how long|time taken|duration/],
  timetable: [/timetable|schedule/],
  calendar: [/calendar|days of the week|months/],
  money: [/money|rupees|coins|change\b/],
  conversion: [/convert|conversion/],
  wholePart: [/of a whole|parts of|part of/],
  // meaning@3: secondary-school concepts
  powers: [/\bpowers? of\b|\bpowers\b|exponent|\bindices\b|index laws|squared|cubed|[²³⁴⁵]/],
  expansion: [/\bexpand|expansion|multiply out|remove the brackets/],
  distributive: [/distributive/, /a\(x ?\+ ?b\)|a\(b ?\+ ?c\)/],
  binomialProduct: [/\bbinomials\b|products? of (two )?binomials/, /\(x ?\+ ?a\) ?\(x ?\+ ?b\)|two brackets/],
  binomialTheorem: [/binomial (theorem|expansion|coefficients?)|pascal/],
  polynomials: [/polynomial/],
  continuity: [/continu(ity|ous)/],
  differentiability: [/differentiab/],
  differentiationRules: [/(power|product|quotient|chain) rule|rules of differentiation|differentiation rules/],
  firstPrinciples: [/first principles/],
  extrema: [/maxim|minim|extrem|rates? of change/],
  antiderivative: [/anti-?derivative|indefinite integral|primitive/],
  substitution: [/substitution/],
  byParts: [/by parts/],
  definite: [/definite integral|between (two )?limits|limits of integration/],
  matrices: [/matri(x|ces)/],
  determinants: [/determinant/],
  probability: [/probab/, /\bchance\b|likelihood/],
  conditional: [/conditional|given that/],
  bayes: [/bayes/],
  vectors: [/vector|dot product|cross product/],
  complexNumbers: [/complex (numbers?|roots?)/, /\bimaginary\b/],
  solids: [/solids?\b|cylinder|cone|sphere|cuboid|prism/],
  construction: [/\bconstruct(ion|ions|ing|s)?\b(?! (a|an) (mathematical )?(argument|proof))/, /ruler and compass|compass(es)? and (a )?(ruler|straightedge)/],
  bisector: [/bisect/],
  trigonometry: [/trigonometr|\bsine\b|cosine|\btangent ratio|\bsin\b|\bcos\b|\btan\b/],
};
const CONCEPTS = Object.keys(LEXICON);
export function concepts(text: string): Set<string> {
  const t = ` ${text.toLowerCase().replace(/[“”"’]/g, "").replace(/\s+/g, " ")} `;
  return new Set(CONCEPTS.filter((c) => LEXICON[c].some((r) => r.test(t))));
}

const mapped = graph.competencies.filter((c) => !c.partOf);
const notes = (annotations as { annotations: Record<string, string[]> }).annotations;
for (const [id, ks] of Object.entries(notes)) {
  if (!graph.byId.has(id)) throw new Error(`competency-concepts: unknown competency ${id}`);
  for (const k of ks) if (!(k in LEXICON)) throw new Error(`competency-concepts: unknown concept ${k} for ${id}`);
}
const signature = new Map<string, Set<string>>(mapped.map((c) => [c.id, new Set([...concepts([c.name, c.description ?? ""].join(" ")), ...(notes[c.id] ?? [])])]));
/** Rarer concepts carry more meaning (inverse document frequency over the competency map). */
const idf = new Map(CONCEPTS.map((k) => [k, Math.log((mapped.length + 1) / (1 + mapped.filter((c) => signature.get(c.id)!.has(k)).length))]));

export interface MeaningMatch {
  id: string;
  score: number;
  shared: string[];
}
export interface MeaningMapping {
  method: "meaning@2" | "meaning@3";
  concepts: string[];
  candidates: MeaningMatch[];
  /** clear: one competency stands out; uncertain: a reviewer must choose; missing: no competency carries it. */
  verdict: "clear" | "uncertain" | "missing";
  why: string;
}
export const MEANING_POLICY = { accept: 0.5, clearAt: 0.62, margin: 0.12, gradePenalty: 0.06, contradiction: 0.5 } as const;
/** Qualifiers: a competency that carries one the outcome does not mention is a different, narrower skill. */
const QUALIFIERS = ["geometric", "inverse", "applications", "unlikeDenominators", "twoVariables", "vectors", "complexNumbers", "solids", "matrices", "byParts", "substitution", "firstPrinciples", "extrema", "binomialTheorem"];
/** Concepts that cannot both describe one outcome: a competency carrying the other one is penalised. */
const CONTRADICTIONS: [string, string][] = [["likeDenominators", "unlikeDenominators"], ["area", "perimeter"], ["multiDigit", "facts"], ["rounding", "estimation"], ["oneVariable", "twoVariables"]];

function scoreOf(o: Set<string>, c: Competency, grade: number) {
  const s = signature.get(c.id)!;
  const shared = [...o].filter((k) => s.has(k));
  const w = (ks: Iterable<string>) => [...ks].reduce((a, k) => a + (idf.get(k) ?? 0), 0);
  if (!shared.length || !s.size) return { score: 0, shared };
  const coverage = w(shared) / w(o);
  const precision = w(shared) / w(s);
  const [lo, hi] = c.gradeRange;
  const distance = grade < lo ? lo - grade : grade > hi ? grade - hi : 0;
  const qualifierMismatch = QUALIFIERS.some((q) => s.has(q) && !o.has(q));
  const contradicts = qualifierMismatch || CONTRADICTIONS.some(([x, y]) => (o.has(x) && s.has(y) && !s.has(x)) || (o.has(y) && s.has(x) && !s.has(y)));
  return { score: Math.round(Math.max(0, 0.6 * coverage + 0.4 * precision - MEANING_POLICY.gradePenalty * distance - (contradicts ? MEANING_POLICY.contradiction : 0)) * 1000) / 1000, shared };
}

export function interpret(outcome: string, grade: number, limit = 3): MeaningMapping {
  const o = concepts(outcome);
  if (!o.size) return { method: "meaning@3", concepts: [], candidates: [], verdict: "missing", why: "No mathematical concept was recognised in this outcome." };
  const candidates = mapped
    .map((c) => ({ id: c.id, ...scoreOf(o, c, grade) }))
    .filter((m) => m.score >= MEANING_POLICY.accept)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
  if (!candidates.length) return { method: "meaning@3", concepts: [...o], candidates: [], verdict: "missing", why: `No competency covers ${[...o].join(", ")}.` };
  const [a, b] = candidates;
  const clear = a.score >= MEANING_POLICY.clearAt && (!b || a.score - b.score >= MEANING_POLICY.margin);
  return {
    method: "meaning@3",
    concepts: [...o],
    candidates,
    verdict: clear ? "clear" : "uncertain",
    why: clear ? `Matches on ${a.shared.join(", ")}.` : b && a.score - b.score < MEANING_POLICY.margin ? `Two skills are close (${graph.get(a.id).name}; ${graph.get(b.id).name}): a reviewer should choose.` : `A weak match (${graph.get(a.id).name}): a reviewer should confirm.`,
  };
}
