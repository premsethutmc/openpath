/** Exact-number expression syntax shared by the parser, evaluator, error finder and skill detectors. */
import type { Q } from "../../exact/rational.ts";
export type Node =
  | { t: "num"; q: Q; dec: boolean; raw: string }
  | { t: "pct"; e: Node }
  | { t: "unit"; e: Node; u: string }
  | { t: "bin"; op: "+" | "-" | "*" | "/" | "^"; l: Node; r: Node; paren?: boolean }
  | { t: "neg"; e: Node; paren?: boolean }
  | { t: "call"; f: "hcf" | "lcm" | "sqrt"; args: Node[] }
  | { t: "ratio"; parts: Node[] }
  | { t: "mixed"; w: Node; f: Node }
  | { t: "var" };
export const isNum = (n: Node): n is Extract<Node, { t: "num" }> => n.t === "num";
export function show(n: Node): string {
  switch (n.t) {
    case "num": return n.raw;
    case "pct": return `${show(n.e)}%`;
    case "unit": return `${show(n.e)} ${n.u}`;
    case "neg": return `${n.paren ? "(" : ""}-${show(n.e)}${n.paren ? ")" : ""}`;
    case "var": return "x";
    case "call": return `${n.f}(${n.args.map(show).join(", ")})`;
    case "ratio": return n.parts.map(show).join(" : ");
    case "mixed": return `${show(n.w)} ${show(n.f)}`;
    case "bin": { if (n.op === "/" && n.l.t === "num" && n.r.t === "num") return `${n.l.raw}/${n.r.raw}`; const s = `${show(n.l)} ${n.op === "*" ? "×" : n.op === "-" ? "−" : n.op === "/" ? "/" : n.op} ${show(n.r)}`; return n.paren ? `(${s})` : s; }
  }
}
/** every node, with a function to rebuild the tree with that node replaced */
export function* positions(root: Node): Generator<{ node: Node; replace: (x: Node) => Node }> {
  const go = function* (n: Node, wrap: (x: Node) => Node): Generator<{ node: Node; replace: (x: Node) => Node }> {
    yield { node: n, replace: wrap };
    switch (n.t) {
      case "pct": case "unit": case "neg": yield* go(n.e, (x) => wrap({ ...n, e: x } as Node)); break;
      case "bin": yield* go(n.l, (x) => wrap({ ...n, l: x })); yield* go(n.r, (x) => wrap({ ...n, r: x })); break;
      case "call": for (let i = 0; i < n.args.length; i++) yield* go(n.args[i], (x) => wrap({ ...n, args: n.args.map((a, j) => (j === i ? x : a)) })); break;
      case "ratio": for (let i = 0; i < n.parts.length; i++) yield* go(n.parts[i], (x) => wrap({ ...n, parts: n.parts.map((a, j) => (j === i ? x : a)) })); break;
      case "mixed": yield* go(n.w, (x) => wrap({ ...n, w: x })); yield* go(n.f, (x) => wrap({ ...n, f: x })); break;
      default: break;
    }
  };
  yield* go(root, (x) => x);
}
