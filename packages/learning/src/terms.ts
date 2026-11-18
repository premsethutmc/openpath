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
  ["quadratics?|quadratic equations?", "MATH.algebra.quadratics"],
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

export interface Piece { text: string; /** the earlier skill this word belongs to */ skill?: string }
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
    out.push({ text: m[0], skill });
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
