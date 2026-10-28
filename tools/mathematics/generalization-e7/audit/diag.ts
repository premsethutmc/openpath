// DIAGNOSTIC trace of the frozen cases (not a scored run, no label use): per-step reasons.
import { readFileSync, writeFileSync } from "node:fs";
const { assessMathematicalWorking } = await import("/home/claude/e7/packages/learning/src/unified-math-engine.ts");
const H = "/home/claude/e7/tools/mathematics/generalization-e7/holdout/";
const cases = JSON.parse(readFileSync(H + "cases.json", "utf8")); const out: any = {};
for (const c of cases) { try { const m: any = await assessMathematicalWorking(c.problem, c.studentWorking, {});
  out[c.id] = { final: m.classification, domain: m.domain, steps: (m.steps ?? []).map((s: any) => [s.classification, s.reasoner, String(s.justification).slice(0, 120)]), routes: (m.certification?.routes ?? []).map((r: any) => `${r.route}:${r.reported}`).join(","), outst: (m.outstandingObligations ?? []).slice(0, 3).map((x: any) => String(x).slice(0, 100)), restr: m.domainRestrictions ?? [] };
 } catch (e) { out[c.id] = { err: String(e).slice(0, 100) }; } }
writeFileSync("/tmp/claude-0/-home-claude/dcd703c5-a0d8-5873-97a2-d0f01459e277/scratchpad/audit8/diag-steps.json", JSON.stringify(out)); process.exit(0);
