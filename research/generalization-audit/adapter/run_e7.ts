// Evaluation adapter, step 2: run the unchanged E7 engine on every channel and record raw output (no scoring here).
// Usage (repo root): bun research/generalization-audit/adapter/run_e7.ts research/generalization-audit/results/adapter-inputs.json research/generalization-audit/results/e7-raw.json
import { readFileSync, writeFileSync } from "node:fs";
const L = "../../../packages/learning/src/";
const { assessMathematicalWorking } = await import(L + "unified-math-engine.ts");
const { assessAnswerFirst } = await import(L + "answer-first.ts");
const { parseNaturalWorking } = await import(L + "natural-working.ts");
const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const cut = (s: unknown, n = 300) => (typeof s === "string" ? s : JSON.stringify(s ?? null) ?? "").slice(0, n);
const out: any[] = [];
for (const r of rows) {
  const res: any = { id: r.id, primary: r.primary, channels: {} };
  for (const [name, ch] of Object.entries<any>(r.channels)) {
    if (ch.unavailable) { res.channels[name] = { unavailable: ch.unavailable }; continue; }
    const t0 = performance.now(); let rec: any = {};
    try {
      if (name === "answer-first-transition" || name === "answer-first") {
        const a: any = assessAnswerFirst(ch.problem, ch.working, { diagnose: "always" });
        const t = a.diagnosis?.transitions?.[0];
        rec = { raw: name === "answer-first" ? a.answer?.status : (t?.status ?? `answer:${a.answer?.status}`), credit: a.answer?.credit ?? null,
                detail: cut(name === "answer-first" ? a.answer : t?.detail ?? a.answer, 300), transitions: (a.diagnosis?.transitions ?? []).map((x: any) => x.status) };
      } else {
        const m: any = await assessMathematicalWorking(ch.problem, ch.working, {});
        rec = { raw: m.classification, rule: m.certification?.rule ?? null, detail: cut(m.justification, 300),
                steps: (m.steps ?? []).slice(0, 12).map((s: any) => `${s.classification}:${cut(s.justification, 110)}`),
                restrictions: (m.domainRestrictions ?? []).slice(0, 6), outstanding: (m.outstandingObligations ?? []).slice(0, 4).map((o: any) => cut(o, 140)) };
      }
    } catch (e) { rec = { raw: "error", detail: cut(String(e), 300) }; }
    rec.ms = +(performance.now() - t0).toFixed(3);
    if (ch.working && typeof ch.working === "object" && "text" in ch.working) {
      try { const p: any = parseNaturalWorking(ch.working); rec.parse = { classification: p.classification, message: cut(p.message, 160), lines: (p.lines ?? []).slice(0, 10).map((l: any) => cut(l.relation?.kind ?? l.kind ?? l, 40)) }; }
      catch (e) { rec.parse = { classification: "error", message: cut(String(e), 160) }; }
    }
    res.channels[name] = rec;
  }
  out.push(res);
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log(out.length, "cases run"); process.exit(0);
