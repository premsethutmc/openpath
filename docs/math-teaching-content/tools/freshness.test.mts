/**
 * freshness@2 tests (read-only): a recheck may repeat an ANSWER of a genuinely different question, but a repeated or relabelled
 * PROBLEM stays excluded; and a recheck's target wrong value may not equal an answer the learner has been shown.
 * Runs against the built TP-PRO-01 and TP2-PV-DIGIT packages and the runtime pools at the source commit.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/freshness.test.mts ../docs/math-teaching-content
 */
import { readFileSync } from "node:fs";
import { FAMILIES, exposureKey, pool, problemOf, type Problem } from "../../../packages/learning/src/families.ts";
import { moduleFor } from "../../../packages/learning/src/content.ts";
import { PACKAGES, q, qs } from "./packages.mts";
import { PACKAGES_B2 } from "./packages-b2.mts";

const root = process.argv[2];
const ALL = [...PACKAGES, ...PACKAGES_B2];
let pass = 0, failN = 0;
const t = (name: string, ok: boolean, detail = "") => { if (ok) pass++; else failN++; console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const norm = (v: unknown) => { const s = String(v).replace(/−/g, "-"); if (/^-?\d+\/\d+$/.test(s)) { const [a, b] = s.split("/"); return qs(q(BigInt(a), BigInt(b))); } if (typeof v === "number" && !Number.isInteger(v)) { for (let d = 2; d <= 1000; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return qs(q(BigInt(Math.round(v * d)), BigInt(d))); } return s; };

function context(pkgId: string) {
  const pk = ALL.find((x) => x.id === pkgId)!;
  const j = JSON.parse(readFileSync(`${root}/${pkgId.startsWith("TP2") ? "batch-2" : "batch-1"}/${pkgId}.json`, "utf8"));
  const m = moduleFor(pk.competency)!; const moduleShown: string[] = [];
  for (const st of m.strategies) { for (const sc of st.screens) if (sc.instance) moduleShown.push(sc.instance); if (st.guided) moduleShown.push(st.guided); if (st.check) moduleShown.push(st.check); }
  const rechecks: string[] = j.practice.rechecks;
  const others: string[] = [...j.diagnostic.map((d: any) => d.id), ...j.workedExamples.map((w: any) => w.id), ...j.misconceptions.flatMap((x: any) => [x.example, x.guided, x.check].filter(Boolean)), ...j.practice.guided, ...j.practice.delayedChecks];
  const shownBeforeRecheck = [...j.workedExamples.map((w: any) => w.id), ...j.misconceptions.flatMap((x: any) => [x.example, x.guided, x.check].filter(Boolean)), ...j.practice.guided, ...moduleShown].filter((id) => P(id)?.family === pk.family);
  const keys = (id: string) => [exposureKey(id), ...(pk.recheckProblem?.(P(id)) ?? [])];
  const used = new Set([...others, ...moduleShown.filter((id) => P(id)?.family === pk.family)].flatMap(keys));
  const shownAnswers = new Set(shownBeforeRecheck.map((id) => norm(P(id).answer)));
  const targets = (p: Problem) => p.bugs.filter((b) => (pk as any).targets.some((x: any) => x.bug === b.id) && b.predict !== null);
  const blocked = (id: string) => keys(id).filter((k) => used.has(k));
  const copyRisk = (id: string) => targets(P(id)).filter((b) => shownAnswers.has(norm(b.predict))).map((b) => `${b.id}=${norm(b.predict)}`);
  const oldBlocked = (id: string) => [...((pk as any).answerDistinct ? [`answer:${P(id).answer}`] : []), ...(pk.signature?.(P(id)) ?? [])].filter((k) => new Set([...others, ...moduleShown.filter((x) => P(x)?.family === pk.family)].flatMap((x) => [...((pk as any).answerDistinct ? [`answer:${P(x).answer}`] : []), ...(pk.signature?.(P(x)) ?? [])])).has(k));
  return { pk, j, rechecks, blocked, copyRisk, oldBlocked, others };
}

// ---- TP-PRO-01 (spinners) ----
{
  const c = context("TP-PRO-01");
  t("PRO-01: the diagnostic question itself is excluded", c.blocked("gen:akdice:4,5,0,7").length > 0, c.blocked("gen:akdice:4,5,0,7").join(", "));
  t("PRO-01: its multiple-choice form is the same exposure and is excluded", c.blocked("gen:akdice:4,5,0,7:mc").length > 0);
  t("PRO-01: the mirror total (4 on 1–4 × 1–5 = 7 renumbered) is a relabelled problem and is excluded", c.blocked("gen:akdice:4,5,0,4").includes("problem:dice:4,5,4"));
  t("PRO-01: the worked example's mirror (total 8 ↔ 3) is excluded", c.blocked("gen:akdice:4,5,0,8").length > 0);
  t("PRO-01: a different problem with a repeated answer is allowed (4,5,0,5 → 1/5, as 3,5,0,6)", c.blocked("gen:akdice:4,5,0,5").length === 0 && P("gen:akdice:4,5,0,5").answer === P("gen:akdice:3,5,0,6").answer, `old rule blocked it on: ${c.oldBlocked("gen:akdice:4,5,0,5").join(", ")}`);
  t("PRO-01: a recheck whose target wrong value equals a shown answer is rejected (5,6,0,3: 1/10 = worked example 4,5,0,3)", c.copyRisk("gen:akdice:5,6,0,3").length > 0, c.copyRisk("gen:akdice:5,6,0,3").join(", "));
  t("PRO-01: built rechecks have no exposure or problem collision and no copy risk", c.rechecks.every((r) => c.blocked(r).length === 0 && c.copyRisk(r).length === 0), c.rechecks.join(", "));
  t("PRO-01: a different-size multi-pair recheck now exists", c.rechecks.some((r) => { const [m, n, , k] = P(r).params; return m !== n && k > 2 && k < m + n; }), c.rechecks.join(", "));
}
// ---- TP2-PV-DIGIT ("how many tens") ----
{
  const c = context("TP2-PV-DIGIT");
  t("PV-DIGIT: the diagnostic 'how many tens in 34' is excluded", c.blocked("gen:aadigit:34,1").length > 0);
  t("PV-DIGIT: the same number asked another way (value of the tens digit in 34) is excluded", c.blocked("gen:aadigit:34,0").includes("problem:digit:34"));
  t("PV-DIGIT: a different number with a repeated tens count is allowed (28 → 2, as guided 26)", c.blocked("gen:aadigit:28,1").length === 0, `old rule blocked it on: ${c.oldBlocked("gen:aadigit:28,1").join(", ")}`);
  t("PV-DIGIT: a recheck whose target wrong value equals a shown answer is rejected (50,0: face-value 5 = worked example 56,1)", c.copyRisk("gen:aadigit:50,0").length > 0, c.copyRisk("gen:aadigit:50,0").join(", "));
  t("PV-DIGIT: built rechecks have no exposure or problem collision and no copy risk", c.rechecks.every((r) => c.blocked(r).length === 0 && c.copyRisk(r).length === 0), c.rechecks.join(", "));
  t("PV-DIGIT: a 'how many tens' recheck now exists", c.rechecks.some((r) => P(r).params[1] === 1), c.rechecks.join(", "));
}
// ---- duplicates in the pools: no two served questions show the same thing (distinct@1), so a repeat can only arrive under the same exposure key ----
for (const f of ["akdice", "aadigit"]) {
  const items = pool(f).items; const shown = new Set(items.map((p) => `${p.prompt}\u0000${JSON.stringify(p.figure ?? null)}\u0000${JSON.stringify(p.options ?? null)}`));
  t(`distinct@1: every served ${f} question is shown differently (${items.length} items, ${shown.size} distinct)`, shown.size === items.length);
  t(`distinct@1: ${f} has no released duplicate parameter choice`, [...pool(f).same.keys()].every((d) => !pool(f).ids.has(d)));
}
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
