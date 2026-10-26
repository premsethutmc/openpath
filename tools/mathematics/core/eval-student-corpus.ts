// Student evaluator vs the independent frozen student-working corpus (labels produced by SymPy, never by this code).
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateWorking } from "../../../packages/learning/src/core/student.ts";
const tasks = JSON.parse(readFileSync(new URL(process.argv[2] ?? "./student/student.json", import.meta.url), "utf8")).tasks ?? JSON.parse(readFileSync(new URL(process.argv[2] ?? "./student/student.json", import.meta.url), "utf8"));
const list: any[] = Array.isArray(tasks) ? tasks : Object.values(tasks);
const C = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };
const byCat: Record<string, any> = {};
const stat: Record<string, number> = {}, byFam: Record<string, { n: number; status: number; first: number }> = {}, conf: Record<string, number> = {}, mis: Record<string, Record<string, number>> = {};
const bad: any[] = []; let unsafe = 0, crashes = 0;
const M = { exp_validish: 0, falseRejection: 0, exp_nonvalid: 0, falseAcceptance: 0, exp_decidable: 0, overRefusal: 0, exp_unsupportedOrAmbiguous: 0, underRefusal: 0, exp_stepInvalid: 0, firstOk: 0, exp_finalClaim: 0, finalOk: 0, wrongVerdict: 0 };
const validish = (x: string) => x === "valid-complete" || x === "valid-incomplete";
for (const t of list) {
  let r: any; try { r = evaluateWorking(t.problem, t.lines, { route: false, engine: false }); } catch (e) { crashes++; bad.push({ id: t.id, crash: String(e).slice(0, 100) }); continue; }
  const e = t.expected; const cat = t.category ?? t.family; const bc = (byCat[cat] ??= { n: 0, statusAgree: 0, falseAccept: 0, falseReject: 0, overRefuse: 0, underRefuse: 0, firstOk: 0 }); bc.n++;
  const f = (byFam[t.family] ??= { n: 0, status: 0, first: 0 }); f.n++;
  const statusOk = r.status === e.status || (e.status === "valid-incomplete" && r.status === "valid-incomplete");
  C(conf, `${e.status} -> ${r.status}`);
  if (statusOk) f.status++;
  const firstOk = (e.first_invalid ?? null) === (r.firstInvalid ?? null);
  if (firstOk) f.first++;
  // unsafe = the evaluator certifies correct work that the oracle says is wrong (or unsupported)
  if ((e.status === "invalid" || e.status === "unsupported") && (r.status === "valid-complete" || r.status === "valid-incomplete")) unsafe++;
  if (e.error_class && r.steps) { const st = r.steps.find((s: any) => s.index === e.first_invalid) ?? r.steps.find((s: any) => s.misconceptions?.length); const ids = (st?.misconceptions ?? []).map((m: any) => m.id); (mis[e.error_class] ??= {}); C(mis[e.error_class], ids.length ? ids.join("+") : "(none)"); }
  if (validish(e.status)) { M.exp_validish++; if (r.status === "invalid") M.falseRejection++; }
  if (!validish(e.status)) { M.exp_nonvalid++; if (validish(r.status)) M.falseAcceptance++; }
  if (e.status === "valid-complete" || e.status === "valid-incomplete" || e.status === "invalid") { M.exp_decidable++; if (r.status === "unsupported" || r.status === "ambiguous") M.overRefusal++; }
  if (e.status === "unsupported" || e.status === "ambiguous") { M.exp_unsupportedOrAmbiguous++; if (r.status === "invalid" || validish(r.status)) M.underRefusal++; }
  if (e.status === "invalid" && e.invalid_at === "step") { M.exp_stepInvalid++; if (r.firstInvalid === e.first_invalid && r.invalidAt === "step") M.firstOk++; }
  if (e.status === "invalid" && e.invalid_at === "final-claim") { M.exp_finalClaim++; if (r.status === "invalid" && r.invalidAt === "final-claim") M.finalOk++; }
  if (!statusOk && !(r.status === "unsupported" || r.status === "ambiguous") && !(e.status === "unsupported" || e.status === "ambiguous")) M.wrongVerdict++;
  if (statusOk) bc.statusAgree++; if (firstOk) bc.firstOk++;
  if (!validish(e.status) && validish(r.status)) bc.falseAccept++; if (validish(e.status) && r.status === "invalid") bc.falseReject++;
  if ((validish(e.status) || e.status === "invalid") && (r.status === "unsupported" || r.status === "ambiguous")) bc.overRefuse++; if ((e.status === "unsupported" || e.status === "ambiguous") && (r.status === "invalid" || validish(r.status))) bc.underRefuse++;
  if (!statusOk || !firstOk) bad.push({ id: t.id, family: t.family, category: t.category, lines: t.lines, problem: t.problem, expected: [e.status, e.first_invalid, e.invalid_at], got: [r.status, r.firstInvalid, r.invalidAt] });
}
const n = list.length, ok = list.filter((_, i) => true).length;
const summary = { byCategory: byCat, definitions: { verdictAccuracy: "status equals oracle status / all tasks", falseAcceptance: "evaluator says valid-complete|valid-incomplete where oracle says invalid|unsupported|ambiguous / oracle non-valid tasks", falseRejection: "evaluator says invalid where oracle says valid-* / oracle valid tasks", overRefusal: "evaluator says unsupported|ambiguous where oracle gives a definite verdict / oracle definite tasks", underRefusal: "evaluator gives a definite verdict where oracle says unsupported|ambiguous / those tasks", firstErrorLocalization: "first invalid line equal and invalid_at=step / oracle step-invalid tasks" }, metrics: M, tasks: n, crashes, unsafeCertifications: unsafe, statusAgree: Object.values(byFam).reduce((a, b) => a + b.status, 0), firstInvalidAgree: Object.values(byFam).reduce((a, b) => a + b.first, 0), byFamily: byFam, confusion: conf };
writeFileSync(new URL(process.argv[3] ?? "./results/student-corpus.json", import.meta.url), JSON.stringify({ summary, misconceptionByClass: mis, mismatches: bad }, null, 1));
console.log(JSON.stringify(summary, null, 1)); console.log(bad.slice(0, 6));
