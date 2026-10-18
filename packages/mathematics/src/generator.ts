import { type AnswerSpec, checkAnswer, rational, show } from "./answers";
export const families = {
  arithmetic: {
    competency: "MATH.number.addition",
    band: [1, 2],
    format: "numerical",
  },
  fractions: {
    competency: "MATH.number.equivalent-fractions",
    band: [4, 5],
    format: "numerical",
  },
  percent: {
    competency: "MATH.number.percentage",
    band: [7, 8],
    format: "numerical",
  },
  linear: {
    competency: "MATH.algebra.linear-equations",
    band: [7, 8],
    format: "numerical",
  },
  polynomial: {
    competency: "MATH.algebra.algebra-simplify",
    band: [7, 9],
    format: "symbolic",
  },
  "quadratic-numerical": {
    competency: "MATH.algebra.quadratics",
    band: [10, 11],
    format: "numerical",
  },
  quadratic: {
    competency: "MATH.algebra.quadratics",
    band: [10, 11],
    format: "multiple-select",
  },
  geometry: {
    competency: "MATH.measurement.rectangle-area",
    band: [5, 6],
    format: "numerical",
  },
  trigonometry: {
    competency: "MATH.trigonometry.ratios",
    band: [10, 11],
    format: "numerical",
  },
  coordinate: {
    competency: "MATH.coordinate.distance",
    band: [10, 11],
    format: "single-choice",
  },
  probability: {
    competency: "MATH.probability.classical",
    band: [9, 10],
    format: "numerical",
  },
  "calculus-numerical": {
    competency: "MATH.calculus.derivative-rules",
    band: [12, 12],
    format: "numerical",
  },
  calculus: {
    competency: "MATH.calculus.derivative-rules",
    band: [12, 12],
    format: "symbolic",
  },
  comparison: {
    competency: "MATH.number.fraction-comparison",
    band: [3, 7],
    format: "quantitative-comparison",
  },
} as const;
export type Family = keyof typeof families;
export interface GeneratedItem {
  id: string;
  familyId: Family;
  competencyId: string;
  version: "1.0.0";
  seed: number;
  difficulty: {
    parameters: Record<string, number>;
    source: "author-estimate";
    gradeBand: readonly number[];
  };
  statement: string;
  answer: AnswerSpec;
  workedSolution: string;
  format: string;
  options?: string[];
  validation: {
    mathematical: "deterministic-construction";
    educational: "provisional";
    reviewer: null;
  };
  evidenceRole: "practice";
  provenance: {
    kind: "original-generated";
    assistance: "AI-assisted";
    generatorVersion: "1.0.0";
    official: false;
  };
  fingerprint: string;
}
/** xorshift32 is used for replay, never for security. No wall clock/random hidden inputs. */
function random(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return (lo: number, hi: number) => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return lo + ((s >>> 0) % (hi - lo + 1));
  };
}
export function generate(familyId: Family, seed: number): GeneratedItem {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    throw new Error("Seed must be uint32");
  if (!Object.hasOwn(families, familyId)) throw new Error("Unknown family");
  const rng = random(seed),
    a = rng(2, 40),
    b = rng(2, 20),
    c = rng(1, 12);
  let statement = "",
    value = "",
    kind: AnswerSpec["kind"] = "number",
    workedSolution = "",
    options: string[] | undefined;
  let params: Record<string, number> = { a, b, c };
  switch (familyId) {
    case "arithmetic": {
      const x = a % 10,
        y = b % 10;
      params = { x, y };
      statement = `What is ${x} + ${y}?`;
      value = `${x + y}`;
      workedSolution = `Start at ${x} and count on ${y}: ${x + y}.`;
      break;
    }
    case "fractions":
      statement = `Complete the equivalent fraction: ${c}/${b} = ?/${b * a}. Enter the missing numerator.`;
      value = `${c * a}`;
      workedSolution = `Multiply numerator and denominator by ${a}: ${c * a}/${b * a}.`;
      break;
    case "percent":
      statement = `Find ${b}% of ${a * 100}.`;
      value = `${a * b}`;
      workedSolution = `${b}/100 × ${a * 100} = ${a * b}.`;
      break;
    case "linear":
      statement = `Solve for x: ${b}x + ${c} = ${b * a + c}.`;
      value = `${a}`;
      workedSolution = `Subtract ${c}, then divide both sides by ${b}: x = ${a}.`;
      break;
    case "polynomial":
      statement = `Expand and simplify ${b}(x + ${c}) + ${a}x.`;
      kind = "polynomial";
      value = `${a + b}*x+${b * c}`;
      workedSolution = `Distribute ${b} to both terms, then combine like terms: ${a + b}x + ${b * c}.`;
      break;
    case "quadratic-numerical":
    case "quadratic": {
      const r = c,
        s = c + b;
      params = { r, s };
      statement = `Select ALL roots of x² − ${r + s}x + ${r * s} = 0. Enter selected values separated by a comma.`;
      kind = "set";
      value = `${r},${s}`;
      options = [`${r}`, `${s}`, `${-r}`, `${-s}`];
      if (familyId === "quadratic-numerical") {
        statement = `Find the larger real root of x² − ${r + s}x + ${r * s} = 0.`;
        kind = "number";
        value = String(s);
        options = undefined;
      }
      workedSolution = `Factor as (x − ${r})(x − ${s}) = 0. Thus x = ${r} or ${s}.`;
      break;
    }
    case "geometry":
      statement = `A rectangle is ${a} cm long and ${b} cm wide. Find its area in cm².`;
      value = `${a * b}`;
      workedSolution = `Area = length × width = ${a} × ${b} = ${a * b} cm².`;
      break;
    case "trigonometry": {
      const k = c;
      params = { scale: k };
      statement = `In a right triangle, opposite side = ${3 * k}, adjacent side = ${4 * k}, hypotenuse = ${5 * k}. Find sin θ for that angle.`;
      value = "3/5";
      workedSolution = `sin θ = opposite / hypotenuse = ${3 * k}/${5 * k} = 3/5.`;
      break;
    }
    case "coordinate": {
      const k = c,
        x = a,
        y = b;
      params = { k, x, y };
      const correct = 5 * k;
      options = [
        `${correct}`,
        `${correct + 1}`,
        `${correct + 2}`,
        `${correct + 3}`,
      ];
      const index = rng(0, 3);
      [options[0], options[index]] = [options[index], options[0]];
      statement = `Find the distance between (${x}, ${y}) and (${x + 3 * k}, ${y + 4 * k}). Choose A, B, C or D.`;
      kind = "choice";
      value = "ABCD"[index];
      workedSolution = `Distance = √((${3 * k})² + (${4 * k})²) = ${correct}.`;
      break;
    }
    case "probability":
      statement = `A bag has ${a} red and ${b} blue counters. One is drawn uniformly at random. What is the probability it is red?`;
      value = show(rational(BigInt(a), BigInt(a + b)));
      workedSolution = `There are ${a + b} equally likely counters; ${a} are red. Probability = ${value}.`;
      break;
    case "calculus-numerical":
    case "calculus": {
      const power = 2 + (c % 4);
      params = { coefficient: b, power };
      statement = `Differentiate ${b}x^${power} with respect to x.`;
      kind = "polynomial";
      value = `${b * power}*x^${power - 1}`;
      workedSolution = `Use d(kx^n)/dx = knx^(n−1): ${value}.`;
      if (familyId === "calculus-numerical") {
        params = { coefficient: b, power, at: c };
        statement = `If f(x) = ${b}x^${power}, find f′(${c}).`;
        kind = "number";
        value = String(b * power * c ** (power - 1));
        workedSolution += ` At x = ${c}, the derivative is ${value}.`;
      }
      break;
    }
    case "comparison": {
      const d = b + c;
      params = { a, b, c, d };
      statement = `Quantity A: ${a}/${b}. Quantity B: ${c}/${d}. Choose A (A greater), B (B greater), C (equal), or D (cannot determine).`;
      kind = "choice";
      value = a * d === c * b ? "C" : a * d > c * b ? "A" : "B";
      options = [
        "A: Quantity A is greater",
        "B: Quantity B is greater",
        "C: Equal",
        "D: Cannot determine",
      ];
      workedSolution = `Cross-multiply positive denominators: ${a} × ${d} = ${a * d}; ${c} × ${b} = ${c * b}. Thus ${a}/${b} ${a * d === c * b ? "=" : a * d > c * b ? ">" : "<"} ${c}/${d}.`;
      break;
    }
  }
  const fingerprint = `${familyId}|${JSON.stringify(params)}`;
  return {
    id: `math:${familyId}:1:${seed}`,
    familyId,
    competencyId: families[familyId].competency,
    version: "1.0.0",
    seed,
    difficulty: {
      parameters: params,
      source: "author-estimate",
      gradeBand: families[familyId].band,
    },
    statement,
    answer: { kind, value },
    workedSolution,
    format: families[familyId].format,
    options,
    validation: {
      mathematical: "deterministic-construction",
      educational: "provisional",
      reviewer: null,
    },
    evidenceRole: "practice",
    provenance: {
      kind: "original-generated",
      assistance: "AI-assisted",
      generatorVersion: "1.0.0",
      official: false,
    },
    fingerprint,
  };
}
/** Fingerprints exclude seeds: seed changes alone are not novel educational evidence. */
export function generateBatch(
  family: Family,
  startSeed: number,
  count: number,
  seen: ReadonlySet<string> = new Set(),
): GeneratedItem[] {
  if (!Number.isInteger(count) || count < 0 || count > 1000)
    throw new Error("Batch count 0..1000");
  const found: GeneratedItem[] = [],
    fingerprints = new Set(seen);
  for (let offset = 0; found.length < count && offset < 100000; offset++) {
    const item = generate(family, (startSeed + offset) >>> 0);
    if (!fingerprints.has(item.fingerprint)) {
      fingerprints.add(item.fingerprint);
      found.push(item);
    }
  }
  if (found.length !== count)
    throw new Error("Unique item space exhausted; no duplicates returned");
  return found;
}
export function evaluate(item: GeneratedItem, response: string) {
  return {
    ...checkAnswer(item.answer, response),
    feedback: item.workedSolution,
    evidenceEligible: false as const,
  };
}
