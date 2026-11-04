// usage: ROOT=<repo root> bun engine-trace.ts <corpus.json> <out.json>
// Per item: the engine verdict, where the statement-text route stopped, and the P2 authority verdict on the same text (read-only trace; changes nothing).
import { readFileSync, writeFileSync } from "node:fs";
const root = process.env.ROOT ?? process.cwd();
const { assessMathematicalWorking } = await import(`${root}/packages/learning/src/unified-math-engine.ts`);
const { assessChain, replayDerivationChain } = await import(`${root}/packages/learning/src/derivation-authority.ts`);
const { parseNaturalWorking } = await import(`${root}/packages/learning/src/natural-working.ts`);
const { checkAlgebraSubmission } = await import(`${root}/packages/learning/src/independent-checker.ts`);
const { assessWorking } = await import(`${root}/packages/learning/src/core/working-assessment.ts`);
const raw = JSON.parse(readFileSync(process.argv[2], "utf8")); const corpus: any[] = Array.isArray(raw) ? raw : raw.items;
const out: any[] = [];
for (const c of corpus) {
  const lines: string[] = c.lines ?? String(c.working ?? "").split("\n"); const text = lines.join("\n");
  const row: any = { id: c.id, category: c.category ?? c.family, expect: c.expect, firstInvalid: c.firstInvalid ?? null, finalAnswerCorrect: c.finalAnswerCorrect ?? null };
  try {
    const r: any = await assessMathematicalWorking({ domain: c.domain ?? "algebra", statement: c.statement } as never, { format: "natural", text } as never);
    const pl = r.domainPayload ?? {}, ic = pl.independentCheck ?? pl.assessment?.independentCheck;
    Object.assign(row, { got: r.classification, gotInvalid: r.firstInvalidStep ?? null, justification: String(r.justification ?? "").slice(0, 200),
      gate: r.acceptanceGate ? { source: r.acceptanceGate.source, verdict: r.acceptanceGate.verdict, level: r.acceptanceGate.level, why: String(r.acceptanceGate.reconciliation ?? "").slice(0, 160) } : null,
      grounded: (pl.groundedLines ?? []).map((g: any) => ({ line: g.line, relevant: g.grounding?.relevant, why: String(g.grounding?.reason ?? "").slice(0, 120) })) });
  } catch (e) { row.got = "error:" + String(e).slice(0, 100); }
  try { const p = parseNaturalWorking({ format: "natural", text } as never); row.parse = p.classification;
    if (p.classification === "parsed") { const ck = checkAlgebraSubmission(c.statement, p); row.checker = { first: ck.firstInvalidStep, lines: ck.lines.map((l: any) => ({ s: l.status, d: String(l.detail ?? "").slice(0, 110) })), just: String(ck.justification ?? "").slice(0, 160) }; }
    else row.parseMsg = String(p.message ?? "").slice(0, 160);
  } catch (e) { row.checker = "error:" + String(e).slice(0, 100); }
  try { const n = assessWorking(c.statement, lines, {}); row.core = { outcome: n.outcome, first: n.firstInvalidStep, steps: n.steps.map((s: any) => s.status), why: String(n.steps.find((s: any) => s.status !== "valid" && s.status !== "verified")?.explanation ?? "").slice(0, 120) }; } catch (e) { row.core = "error:" + String(e).slice(0, 100); }
  try { const v = assessChain(c.statement, lines); row.p2 = { status: v.status, at: v.at, reason: String(v.reason).slice(0, 140), completeness: v.evidence?.completeness, final: v.evidence?.finalAnswer?.correct ?? null, replay: v.status === "verified" ? replayDerivationChain(c.statement, lines, v.chain).ok : null }; } catch (e) { row.p2 = "error:" + String(e).slice(0, 100); }
  out.push(row);
}
writeFileSync(process.argv[3], JSON.stringify(out, null, 0));
console.log(out.length, "cases");
