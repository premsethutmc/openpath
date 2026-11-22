/**
 * term-links@1: a word in a lesson that names an earlier skill ("sin", "prime", "denominator") can be tapped to open
 * that skill's own rule and example, right there, without leaving the lesson. This file is the list: the words, and the
 * skill each one belongs to. A word is linked only outside its own skill and only when that skill is taught no later
 * than the one being read (the player decides that; here is only the vocabulary).
 *
 * Kept to words that are terms. Everyday words that are also terms ("mean", "mode", "power", "limit", "area of") are
 * left out: a link on "what does this mean" would be noise.
 */
const T: [string, string][] = [
  ["sin|cos|tan|sine|cosine|tangent", "MATH.trigonometry.ratios"],
  ["radians?", "MATH.trigonometry.radians"],
  ["prime numbers?|primes?|composite numbers?", "MATH.number.primes"],
  ["factors?|multiples?", "MATH.number.factors-multiples"],
  ["HCF|LCM|highest common factor|lowest common multiple", "MATH.number.hcf-lcm"],
  ["numerators?|denominators?", "MATH.number.fraction-models"],
  ["equivalent fractions?", "MATH.number.equivalent-fractions"],
  ["mixed numbers?|improper fractions?", "MATH.number.mixed-fractions"],
  ["percentages?|per cent", "MATH.number.percent-intro"],
  ["ratios?", "MATH.number.ratio"],
  ["proportions?", "MATH.number.proportion"],
  ["integers?|negative numbers?", "MATH.number.integers"],
  ["remainders?", "MATH.number.division-remainders"],
  ["perimeter", "MATH.measurement.perimeter-intro"],
  ["square roots?", "MATH.number.square-roots"],
  ["exponents?|indices", "MATH.number.exponents"],
  ["logarithms?", "MATH.algebra.logarithms"],
  ["derivatives?|differentiat(?:e|ing|ion)", "MATH.calculus.derivatives"],
  ["integrals?|integrat(?:e|ing|ion)", "MATH.calculus.indefinite-integrals"],
  ["matrix|matrices", "MATH.algebra.matrices"],
  ["determinants?", "MATH.algebra.determinants"],
  ["vectors?", "MATH.vectors.algebra"],
  ["quadratic equations?|quadratics?", "MATH.algebra.quadratics"],
  ["polynomials?", "MATH.algebra.polynomials"],
  ["linear equations?", "MATH.algebra.linear-equations"],
  ["Pythagoras", "MATH.geometry.pythagoras"],
  ["congruent", "MATH.geometry.congruence"],
  ["similar triangles?", "MATH.geometry.similarity"],
  ["probability", "MATH.probability.classical"],
  ["median", "MATH.statistics.median-mode"],
  ["lines? of symmetry", "MATH.geometry.symmetry-lines"],
  ["acute|obtuse|right angles?", "MATH.geometry.angles-intro"],
  ["arithmetic (?:sequence|progression)s?", "MATH.algebra.arithmetic-sequences"],
  ["geometric (?:sequence|progression)s?", "MATH.algebra.geometric-sequences"],
  ["complex numbers?", "MATH.number.complex"],
];
export const TERM_SKILLS: readonly string[] = [...new Set(T.map(([, c]) => c))];
const FIND = new RegExp(`(?<![A-Za-z])(?:${T.map(([w]) => `(${w})`).join("|")})(?![A-Za-z])`, "gi");

/**
 * term-meaning@1: what the tapped word itself means, in one line. The earlier skill's card says how to do that skill,
 * which is not what a learner asks by tapping "sin" ("Write down each value…" answers a different question). So each
 * word carries its own meaning; the card shows it first and the earlier lesson's example under it. Keyed by the word
 * in lower case, plural dropped. One line per term of the vocabulary above, not per lesson.
 */
const MEANING: Record<string, string> = {
  sin: "In a right triangle, sin of an angle = opposite side ÷ hypotenuse.",
  sine: "In a right triangle, sin of an angle = opposite side ÷ hypotenuse.",
  cos: "In a right triangle, cos of an angle = adjacent side ÷ hypotenuse.",
  cosine: "In a right triangle, cos of an angle = adjacent side ÷ hypotenuse.",
  tan: "In a right triangle, tan of an angle = opposite side ÷ adjacent side (also sin ÷ cos).",
  tangent: "In a right triangle, tan of an angle = opposite side ÷ adjacent side (also sin ÷ cos).",
  radian: "A way to measure angles: one radian is the angle where the arc equals the radius; 180° = π radians.",
  "prime number": "A number greater than 1 whose only factors are 1 and itself, like 2, 3, 5, 7, 11.",
  prime: "A number greater than 1 whose only factors are 1 and itself, like 2, 3, 5, 7, 11.",
  "composite number": "A number greater than 1 with more factors than 1 and itself, like 4, 6, 9.",
  factor: "A number that divides another exactly: 3 is a factor of 12 because 12 ÷ 3 = 4.",
  multiple: "What you get by multiplying a number by 1, 2, 3, …: the multiples of 4 are 4, 8, 12, …",
  hcf: "Highest common factor: the biggest number that divides all the given numbers exactly.",
  "highest common factor": "The biggest number that divides all the given numbers exactly.",
  lcm: "Lowest common multiple: the smallest number that all the given numbers divide into exactly.",
  "lowest common multiple": "The smallest number that all the given numbers divide into exactly.",
  numerator: "The top number of a fraction: how many parts are taken. In 3/4 it is 3.",
  denominator: "The bottom number of a fraction: how many equal parts the whole is cut into. In 3/4 it is 4.",
  "equivalent fraction": "Fractions that name the same amount, like 1/2 = 2/4 = 4/8.",
  "mixed number": "A whole number and a fraction together, like 2 1/3.",
  "improper fraction": "A fraction whose top is as big as or bigger than its bottom, like 7/3.",
  percentage: "Out of 100: 25% means 25 out of every 100.",
  "per cent": "Out of 100: 25 per cent means 25 out of every 100.",
  ratio: "A comparison of two amounts by division, written a : b (3 : 2 means 3 of one for every 2 of the other).",
  proportion: "Two ratios that are equal, like 2 : 3 = 4 : 6.",
  integer: "A whole number that can be positive, negative or zero: … −2, −1, 0, 1, 2 …",
  "negative number": "A number less than zero, written with a minus sign, like −5.",
  remainder: "What is left over when a number does not divide exactly: 17 ÷ 5 = 3, remainder 2.",
  perimeter: "The total length all the way around the edge of a shape.",
  "square root": "The number that multiplied by itself gives the number: √25 = 5 because 5 × 5 = 25.",
  exponent: "The small raised number saying how many times to multiply the base: 2³ = 2 × 2 × 2.",
  indices: "The small raised numbers saying how many times to multiply the base: 2³ = 2 × 2 × 2.",
  logarithm: "The power a base must be raised to: log₂ 8 = 3 because 2³ = 8.",
  derivative: "How fast a function changes: the slope of its graph at a point.",
  differentiate: "Find the derivative: how fast a function changes, the slope of its graph at a point.",
  differentiating: "Finding the derivative: how fast a function changes, the slope of its graph at a point.",
  differentiation: "Finding the derivative: how fast a function changes, the slope of its graph at a point.",
  integral: "The reverse of differentiating; a definite integral adds up the area under a graph.",
  integrate: "Find the integral: undo differentiation, or add up the area under a graph.",
  integrating: "Finding the integral: undoing differentiation, or adding up the area under a graph.",
  integration: "Finding the integral: undoing differentiation, or adding up the area under a graph.",
  matrix: "A rectangle of numbers in rows and columns, used and combined as one object.",
  matrices: "Rectangles of numbers in rows and columns, used and combined as one object.",
  determinant: "A single number worked out from a square matrix; for [a b; c d] it is ad − bc.",
  vector: "A quantity with both a size and a direction, drawn as an arrow.",
  quadratic: "An expression or equation whose highest power of x is 2, like x² + 3x + 2.",
  "quadratic equation": "An equation whose highest power of x is 2, like x² − 5x + 6 = 0.",
  polynomial: "A sum of terms made of numbers and whole-number powers of x, like 3x² − x + 4.",
  "linear equation": "An equation whose highest power of x is 1, like 2x + 3 = 11; its graph is a straight line.",
  pythagoras: "In a right triangle, the square on the longest side equals the sum of the squares on the other two: a² + b² = c².",
  congruent: "Exactly the same shape and size.",
  "similar triangle": "Triangles with the same angles: the same shape, possibly a different size.",
  probability: "How likely something is, from 0 (impossible) to 1 (certain): favourable outcomes ÷ all outcomes.",
  median: "The middle value when the data is put in order.",
  "line of symmetry": "A line that folds a shape into two matching halves.",
  "lines of symmetry": "Lines that fold a shape into two matching halves.",
  acute: "An angle smaller than 90°.",
  obtuse: "An angle bigger than 90° but smaller than 180°.",
  "right angle": "An angle of exactly 90°, like the corner of a square.",
  "arithmetic sequence": "A list of numbers that goes up or down by the same amount each time: 3, 7, 11, 15, …",
  "arithmetic progression": "A list of numbers that goes up or down by the same amount each time: 3, 7, 11, 15, …",
  "geometric sequence": "A list of numbers where each is the one before times the same number: 2, 6, 18, 54, …",
  "geometric progression": "A list of numbers where each is the one before times the same number: 2, 6, 18, 54, …",
  "complex number": "A number a + bi, where i is the number whose square is −1.",
};
/** The one-line meaning of a linked word ("Sines" → the sine line), or null when it has none. */
export function meaningOf(word: string): string | null {
  const w = word.toLowerCase().replace(/\s+/g, " ").trim();
  return MEANING[w] ?? MEANING[w.replace(/(?<=[a-z])s$/, "")] ?? MEANING[w.replace(/s(?= )/, "")] ?? null;
}
export const TERM_WORDS: readonly string[] = T.map(([w]) => w);

export interface Piece { text: string; /** the earlier skill this word belongs to */ skill?: string; /** what the word itself means */ meaning?: string }
/**
 * A paragraph cut into plain text and linked words. Each skill is linked once (its first word in the paragraph), and
 * only when `allow(skill)` says so.
 */
export function linkTerms(text: string, allow: (skill: string) => boolean): Piece[] {
  const out: Piece[] = [], used = new Set<string>();
  let at = 0;
  for (const m of text.matchAll(FIND)) {
    const skill = T[m.slice(1).findIndex((g) => g !== undefined)][1];
    if (used.has(skill) || !allow(skill)) continue;
    used.add(skill);
    if (m.index! > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[0], skill, ...(meaningOf(m[0]) ? { meaning: meaningOf(m[0])! } : {}) });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
