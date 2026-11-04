// Prompt-level matching of generated questions to the task catalogue of the EXISTING kernels (not by topic name). A match means "a kernel task of this kind exists"; it is
// a CANDIDATE until a probe (probe-statement / probe-kernels) has verified real samples of that family. Rules are deliberately conservative (word-level cues on the prompt).
export type Task = { kernel: string; task: string };
const n = (s: string) => s.replace(/\s+/g, " ");
const RULES: [RegExp, Task][] = [
  // linear algebra B2
  [/\[\[/, { kernel: "B2 linear-algebra", task: "matrix/determinant" }],
  [/(î|ĵ|k̂|vector)/i, { kernel: "B2 linear-algebra", task: "vector" }],
  [/(simultaneous|system of|pair of linear equations|solve the equations)/i, { kernel: "B2 linear-algebra", task: "system" }],
  // probability / statistics B1
  [/[ⁿ⁰-⁹]*[PC][₀-₉]|factorial|\bn!|arrang|permutation|combination|in how many ways|number of ways/i, { kernel: "B1 probability-statistics", task: "combinatorics" }],
  [/\b(mean|median|mode|variance|standard deviation|mean deviation)\b/i, { kernel: "B1 probability-statistics", task: "statistics" }],
  [/probability|P\([A-Z]/i, { kernel: "B1 probability-statistics", task: "probability" }],
  // calculus
  [/∫|integrat|antiderivative/i, { kernel: "calculus-core/methods", task: "integral" }],
  [/\blim\b|limit/i, { kernel: "calculus-core/methods", task: "limit" }],
  [/Differentiate|derivative|dy\/dx|f′|gradient function/i, { kernel: "calculus-core/methods", task: "derivative" }],
  // M2 exact
  [/(sin|cos|tan|sec|cosec|cot)\s*[\d(θ]|trigonometric|exact value of (sin|cos|tan)/i, { kernel: "M2 trig-explog-sequence-radical", task: "trigonometry" }],
  [/\blog|\bln\b|logarithm|exponential equation|2\^x|e\^x/i, { kernel: "M2 trig-explog-sequence-radical", task: "exponential-log" }],
  [/(arithmetic|geometric) (progression|sequence)|\bAP\b|\bGP\b|term number|(\d+)(st|nd|rd|th) term|sum of the first|infinite/i, { kernel: "M2 trig-explog-sequence-radical", task: "sequence-series" }],
  [/surd|rationalis|nested radical|nth root|√\(?\d.*√/i, { kernel: "M2 trig-explog-sequence-radical", task: "radical" }],
  // M1 / exact checker
  [/distance between|midpoint|mid-point|slope|gradient|equation of the (straight )?line|circle/i, { kernel: "M1 coordinate", task: "coordinate" }],
  [/domain of|f ∘ g|composite|inverse function|f\(x\) =.*find f\(|evaluate f/i, { kernel: "M1 function", task: "function" }],
  [/Solve [^.]*[<>≤≥]/i, { kernel: "M1 inequality / exact checker", task: "inequality" }],
  [/Solve [^.]*x²|quadratic|roots of/i, { kernel: "M1 quadratic / exact checker", task: "quadratic" }],
  [/Solve [^.]*=/i, { kernel: "exact checker", task: "equation" }],
  [/\bcomplex\b|\bmodulus\b|\bargument\b|\bi\)|\(.*\bi\b.*\)|\+ \d*i\b|− \d*i\b/i, { kernel: "complex-polynomial/complex-kernel", task: "complex" }],
];
export function taskOf(prompt: string): Task | null { const p = n(prompt); for (const [re, t] of RULES) if (re.test(p)) return t; return null; }
/** closed numeric expression (exact numeric-expression checker) */
export const CLOSED_EXPR = /^(?:Work out|Calculate|Evaluate|Simplify|What is|Find the value of|Compute|Write as one number)?\s*:?\s*[-−(\d][\d\s+\-−×÷*\/^().,%²³]*(?:=\s*\?)?\.?\s*(?:\(.*\))?$/i;
