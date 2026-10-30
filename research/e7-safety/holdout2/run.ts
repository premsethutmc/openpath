// Fresh holdout (labels frozen in commit d113436 before any E7 run). Usage (repo root): bun research/e7-safety/holdout2/run.ts <out.json>
// The harness only translates each case into E7's own inputs; a bare "log" in a typed start expression is read both ways, like the engine does for text.
import { readFileSync, writeFileSync } from "node:fs";
const L = "../../../packages/learning/src/";
const { assessMathematicalWorking } = await import(L + "unified-math-engine.ts");
const { assessAnswerFirst } = await import(L + "answer-first.ts");
const { parseNaturalWorking } = await import(L + "natural-working.ts");
const { assessWithPolicy } = await import(L + "assessment-policy.ts");
const cases = JSON.parse(readFileSync(new URL("./cases.json", import.meta.url), "utf8"));
const nat = (text: string) => ({ format: "natural" as const, text });
const ABSTAIN = new Set(["unsupported", "malformed", "ambiguous", "unresolved", "resource-exhausted", "contradictory", "error", "harness-unreadable"]);
const ACCEPT = new Set(["verified", "correct", "parsed", "full"]), REJECT = new Set(["invalid", "incorrect", "none"]);
function expr(text: string, conventions?: object): { e?: any; cls?: string } {
  const p: any = parseNaturalWorking({ format: "natural", text, ...(conventions ? { conventions } : {}) } as any);
  if (p.classification !== "parsed") return { cls: p.classification };
  const r = p.lines[0]?.relation; return r?.kind === "expression" && p.lines.length === 1 ? { e: r.expression } : { cls: "harness-unreadable" };
}
function assumption(text: string): any { const m = /^(.+?)\s*(>=|<=|!=|>|<)\s*(.+)$/.exec(text.replace("≠", "!=").replace("≥", ">=").replace("≤", "<=")); if (!m) return null; const d = expr(`(${m[1]}) - (${m[3]})`).e; if (!d) return null; const neg = m[2] === "<" || m[2] === "<="; return { kind: m[2] === "!=" ? "nonzero" : m[2].includes("=") ? "nonnegative" : "positive", expression: neg ? { kind: "multiply", factors: [{ kind: "constant", value: "-1" }, d] } : d }; }
async function identity(c: any, conv?: any): Promise<string> {
  const s = expr(c.start, conv); if (!s.e) return s.cls!;
  const asm = (c.assumptions ?? []).map(assumption); if (asm.some((a: any) => !a)) return "harness-unreadable";
  const m: any = await assessMathematicalWorking({ domain: "symbolic", start: s.e, ...(asm.length ? { assumptions: asm } : {}) } as any, nat(c.next), conv ? { conventions: conv } : {});
  return m.classification;
}
async function run(c: any): Promise<{ got: string; ms: number }> {
  const t0 = performance.now(); const conv = c.convention; let got = "error";
  try {
    switch (c.channel) {
      case "parser": got = parseNaturalWorking({ format: "natural", text: c.text, ...(conv ? { conventions: conv } : {}) } as any).classification; break;
      case "identity": {
        if (!conv?.log && /(?:^|[^A-Za-z_])log(?![_\d])\s*(?:\(|[A-Za-z0-9])/.test(c.start)) { const a = await identity(c, { log: "natural" }), b = await identity(c, { log: "base10" }); got = a === b ? a : "ambiguous"; }
        else got = await identity(c, conv); break;
      }
      case "algebra": got = (await assessMathematicalWorking({ domain: "algebra", statement: c.statement } as any, nat(c.working.join("\n")), conv ? { conventions: conv } : {})).classification; break;
      case "answer-first": got = (assessAnswerFirst({ domain: "algebra", statement: c.statement }, nat(c.working.join("\n")), conv ? { conventions: conv } : {}) as any).answer.status; break;
      case "derivative": { const e = expr(c.expression).e; got = e ? (await assessMathematicalWorking({ domain: "calculus", task: "derivative", expression: e, variable: "x" } as any, nat(c.working), {})).classification : "harness-unreadable"; break; }
      case "limit": { const e = expr(c.expression).e; got = e ? (await assessMathematicalWorking({ domain: "calculus", task: "limit", expression: e, variable: "x", approach: c.approach, side: c.side } as any, nat(c.working), {})).classification : "harness-unreadable"; break; }
      case "policy": got = (await assessWithPolicy({ domain: "algebra", statement: c.statement }, nat(c.working.join("\n")), { mode: c.mode, ...(c.rubric ?? {}) })).grade.credit; break;
    }
  } catch (e) { got = "error"; }
  return { got, ms: performance.now() - t0 };
}
const out: any[] = [];
for (const c of cases) {
  const { got, ms } = await run(c), exp: string[] = c.expected;
  const outcome = exp.includes(got) ? "agree" : ACCEPT.has(got) && !exp.some((e) => ACCEPT.has(e)) ? (c.channel === "policy" ? "POLICY-FALSE-ACCEPT" : "FALSE-ACCEPT")
    : REJECT.has(got) && exp.every((e) => ACCEPT.has(e) || ABSTAIN.has(e)) ? "FALSE-REJECT" : ABSTAIN.has(got) ? "abstain" : "misgrade";
  out.push({ id: c.id, feature: c.feature, channel: c.channel, kind: c.kind, expected: exp, got, outcome, ms: Math.round(ms * 10) / 10 });
}
writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
const tally = (f: (x: any) => string) => out.reduce((m: Record<string, number>, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
console.log(JSON.stringify(tally((x) => x.outcome)));
console.log(JSON.stringify(tally((x) => `${x.feature}:${x.outcome}`)));
const ms = out.map((x) => x.ms).sort((a, b) => a - b); console.log("latency ms median", ms[Math.floor(ms.length / 2)], "p95", ms[Math.floor(ms.length * 0.95)], "max", ms[ms.length - 1]);
for (const x of out) if (x.outcome !== "agree") console.log(` ${x.outcome.padEnd(19)} ${x.id} ${x.feature} ${x.channel} expected ${x.expected.join("|")} got ${x.got}`);
process.exit(0);
