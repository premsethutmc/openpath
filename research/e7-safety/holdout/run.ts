// Usage (repo root): bun research/e7-safety/holdout/run.ts <inputs.json> <cases.json> <out.json> [incomplete|invalid]
import { readFileSync, writeFileSync } from "node:fs";
const L = "../../../packages/learning/src/";
const { assessMathematicalWorking } = await import(L + "unified-math-engine.ts");
const { assessAnswerFirst } = await import(L + "answer-first.ts");
const { parseNaturalWorking } = await import(L + "natural-working.ts");
const ic: any = await import(L + "independent-checker.ts"), withSolutionLossPolicyAsync = ic.withSolutionLossPolicyAsync ?? (async (_p: string, f: () => Promise<void>) => f()); // baseline engine has no policy switch
const rows = JSON.parse(readFileSync(process.argv[2], "utf8")), cases = new Map(JSON.parse(readFileSync(process.argv[3], "utf8")).map((c: any) => [c.id, c]));
const policy = (process.argv[5] ?? "incomplete") as "incomplete" | "invalid";
const out: any[] = [];
await withSolutionLossPolicyAsync(policy, async () => {
  for (const r of rows) {
    const c: any = cases.get(r.id); let got = "adapter-unavailable", detail = r.unavailable ?? "";
    try {
      if (r.unavailable) {} else if (r.channel === "parser") { const p: any = parseNaturalWorking({ format: "natural", text: r.text }); got = p.classification; detail = p.message ?? ""; }
      else if (r.channel === "answer-first") { const a: any = assessAnswerFirst(r.problem, r.working, { diagnose: "always" } as any); got = a.answer?.status ?? "unresolved"; detail = a.answer?.reason ?? ""; }
      else { const m: any = await assessMathematicalWorking(r.problem, r.working, {}); got = m.classification; detail = m.justification ?? ""; }
    } catch (e) { got = "error"; detail = String(e).slice(0, 200); }
    const ok = c.expected.includes(got), accept = ["verified", "correct", "parsed"].includes(got), shouldAccept = c.expected.some((e: string) => ["verified", "correct", "parsed"].includes(e)), shouldReject = !shouldAccept;
    const outcome = ok ? "agree" : accept && shouldReject ? "FALSE-ACCEPT" : ["invalid", "incorrect"].includes(got) && shouldAccept ? "FALSE-REJECT" : ["unsupported", "malformed", "ambiguous", "unresolved", "resource-exhausted", "adapter-unavailable"].includes(got) ? "abstain" : "misgrade";
    out.push({ id: r.id, invariant: c.invariant, kind: c.kind, channel: r.channel, expected: c.expected, got, outcome, detail: String(detail).slice(0, 200) });
  }
});
writeFileSync(process.argv[4], JSON.stringify(out, null, 1));
const tally = (k: (x: any) => string) => { const m: Record<string, number> = {}; for (const x of out) m[k(x)] = (m[k(x)] ?? 0) + 1; return m; };
console.log(policy, JSON.stringify(tally((x) => x.outcome)));
for (const x of out) if (x.outcome !== "agree") console.log(` ${x.outcome.padEnd(13)} ${x.id} ${x.invariant} ${x.channel} expected ${x.expected.join("|")} got ${x.got} | ${x.detail.slice(0, 110)}`);
process.exit(0);
