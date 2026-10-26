// Student evaluator vs the independent frozen student-working corpus (labels produced by SymPy, never by this code).
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateWorking } from "../../../packages/learning/src/core/student.ts";
const tasks = JSON.parse(readFileSync(new URL("./student/student.json", import.meta.url), "utf8")).tasks ?? JSON.parse(readFileSync(new URL("./student/student.json", import.meta.url), "utf8"));
const list: any[] = Array.isArray(tasks) ? tasks : Object.values(tasks);
const C = (o: Record<string, number>, k: string) => { o[k] = (o[k] ?? 0) + 1; };
const stat: Record<string, number> = {}, byFam: Record<string, { n: number; status: number; first: number }> = {}, conf: Record<string, number> = {}, mis: Record<string, Record<string, number>> = {};
const bad: any[] = []; let unsafe = 0, crashes = 0;
for (const t of list) {
  let r: any; try { r = evaluateWorking(t.problem, t.lines, { route: false, engine: false }); } catch (e) { crashes++; bad.push({ id: t.id, crash: String(e).slice(0, 100) }); continue; }
  const e = t.expected; const f = (byFam[t.family] ??= { n: 0, status: 0, first: 0 }); f.n++;
  const statusOk = r.status === e.status || (e.status === "valid-incomplete" && r.status === "valid-incomplete");
  C(conf, `${e.status} -> ${r.status}`);
  if (statusOk) f.status++;
  const firstOk = (e.first_invalid ?? null) === (r.firstInvalid ?? null);
  if (firstOk) f.first++;
  // unsafe = the evaluator certifies correct work that the oracle says is wrong (or unsupported)
  if ((e.status === "invalid" || e.status === "unsupported") && (r.status === "valid-complete" || r.status === "valid-incomplete")) unsafe++;
  if (e.error_class && r.steps) { const st = r.steps.find((s: any) => s.index === e.first_invalid) ?? r.steps.find((s: any) => s.misconceptions?.length); const ids = (st?.misconceptions ?? []).map((m: any) => m.id); (mis[e.error_class] ??= {}); C(mis[e.error_class], ids.length ? ids.join("+") : "(none)"); }
  if (!statusOk || !firstOk) bad.push({ id: t.id, family: t.family, expected: [e.status, e.first_invalid, e.invalid_at], got: [r.status, r.firstInvalid, r.invalidAt] });
}
const n = list.length, ok = list.filter((_, i) => true).length;
const summary = { tasks: n, crashes, unsafeCertifications: unsafe, statusAgree: Object.values(byFam).reduce((a, b) => a + b.status, 0), firstInvalidAgree: Object.values(byFam).reduce((a, b) => a + b.first, 0), byFamily: byFam, confusion: conf };
writeFileSync(new URL("./results/student-corpus.json", import.meta.url), JSON.stringify({ summary, misconceptionByClass: mis, mismatches: bad }, null, 1));
console.log(JSON.stringify(summary, null, 1)); console.log(bad.slice(0, 6));
