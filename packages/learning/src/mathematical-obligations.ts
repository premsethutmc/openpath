export const MATHEMATICAL_OBLIGATION_CONTRACT = "openpath-mathematical-obligation@2" as const;
export type MathExpression =
  | { kind: "constant"; value: number }
  | { kind: "symbol"; name: string }
  | { kind: "add" | "multiply"; terms: MathExpression[] }
  | { kind: "subtract" | "divide"; left: MathExpression; right: MathExpression }
  | { kind: "power"; base: MathExpression; exponent: number };
export type MathematicalStatement =
  | { kind: "equality" | "inequality"; left: MathExpression; right: MathExpression; relation?: "<" | "<=" | ">" | ">=" }
  | { kind: "nonzero" | "positive" | "nonnegative"; expression: MathExpression }
  | { kind: "domain-membership"; expression: MathExpression; domain: "real" | "integer" | "positive-real" }
  | { kind: "angle-equality"; leftAngle: string; rightAngle: string }
  | { kind: "angle-sum"; angles: string[]; totalDegrees: number }
  | { kind: "segment-length-equality"; leftSegment: string; rightSegment: string }
  | { kind: "proportion"; leftNumerator: MathExpression; leftDenominator: MathExpression; rightNumerator: MathExpression; rightDenominator: MathExpression }
  | { kind: "polynomial-equation"; left: MathExpression; right: MathExpression }
  | { kind: "pythagorean"; legA: MathExpression; legB: MathExpression; hypotenuse: MathExpression };
export interface MathematicalObligation {
  contractVersion: typeof MATHEMATICAL_OBLIGATION_CONTRACT;
  id: string;
  statement: MathematicalStatement;
  originatingReasoner: string;
  sourceProofStepIds: string[];
  dependencyReferences: string[];
  assumptions: MathematicalStatement[];
  domainRestrictions: MathematicalStatement[];
  status: "asserted" | "derived" | "verified" | "discharged" | "unsupported";
  dischargeEvidence: { reasoner: string; detail: string; assessmentStepIndexes: number[] }[];
}
export const constant = (value: number): MathExpression => ({ kind: "constant", value });
export const symbol = (name: string): MathExpression => ({ kind: "symbol", name });

export function expressionText(value: MathExpression): string {
  switch (value.kind) {
    case "constant": if (!Number.isFinite(value.value)) throw new Error("non-finite constant"); return String(value.value);
    case "symbol": if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value.name)) throw new Error("invalid symbol"); return value.name;
    case "add": if (value.terms.length < 2) throw new Error("add needs terms"); return value.terms.map(expressionText).join("+");
    case "multiply": if (value.terms.length < 2) throw new Error("multiply needs terms"); return value.terms.map((x) => `(${expressionText(x)})`).join("*");
    case "subtract": return `(${expressionText(value.left)})-(${expressionText(value.right)})`;
    case "divide": return `(${expressionText(value.left)})/(${expressionText(value.right)})`;
    case "power": if (!Number.isInteger(value.exponent) || value.exponent < 0 || value.exponent > 8) throw new Error("unsupported exponent"); return `(${expressionText(value.base)})^${value.exponent}`;
  }
}
export function statementText(statement: MathematicalStatement): string {
  if (statement.kind === "equality" || statement.kind === "polynomial-equation") return `${expressionText(statement.left)}=${expressionText(statement.right)}`;
  if (statement.kind === "inequality") return `${expressionText(statement.left)}${statement.relation ?? "<"}${expressionText(statement.right)}`;
  if (statement.kind === "proportion") return `${expressionText(statement.leftNumerator)}/${expressionText(statement.leftDenominator)}=${expressionText(statement.rightNumerator)}/${expressionText(statement.rightDenominator)}`;
  if (statement.kind === "pythagorean") return `${expressionText({kind:"power",base:statement.legA,exponent:2})}+${expressionText({kind:"power",base:statement.legB,exponent:2})}=${expressionText({kind:"power",base:statement.hypotenuse,exponent:2})}`;
  throw new Error(`statement ${statement.kind} is not an algebra assessment problem`);
}
export function validateObligation(value: MathematicalObligation): string[] {
  const errors: string[] = [];
  if (value?.contractVersion !== MATHEMATICAL_OBLIGATION_CONTRACT) errors.push("obligation contract version");
  if (!value || typeof value.id !== "string" || !value.id) errors.push("obligation id");
  if (!Array.isArray(value.sourceProofStepIds) || !Array.isArray(value.dependencyReferences)) errors.push("obligation dependencies");
  try { const s = value.statement; if (["equality","inequality","polynomial-equation","proportion","pythagorean"].includes(s.kind)) statementText(s); } catch { errors.push("mathematical statement"); }
  return errors;
}
