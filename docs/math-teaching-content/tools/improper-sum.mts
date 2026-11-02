/**
 * TP-NUM-02 improper-sum diagnostic (read-only): fadd releases no addition with a + b > n (keep: a + b < n), and no other
 * like-fraction-addition family produces one. This finds the item the smallest change would serve, verifies it with the
 * generator (problemOf builds it: keep is a release filter, not a validity rule), the family's independent validate, this
 * branch's prompt-text oracle and the number-line method, and simulates the change's effect on served forms.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/improper-sum.mts ../docs/math-teaching-content
 */
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES, exposureKey, phaseOf, phasePool, pool, problemOf, type Problem } from "../../../packages/learning/src/families.ts";
import { selectable } from "../../../packages/learning/src/question-status.ts";
import { PACKAGES, q, qs, qeq } from "./packages.mts";

const root = process.argv[2];
const pk = PACKAGES.find((x) => x.id === "TP-NUM-02")!;
const def: any = FAMILIES.get("fadd");
const j = JSON.parse(readFileSync(`${root}/batch-1/TP-NUM-02.json`, "utf8"));
const ROLE_KEYS = ["explanation", "workedExamples", "hints", "diagnostic", "misconceptions", "practice", "responsePatterns", "integration"];
const used = [...new Set<string>([...JSON.stringify(Object.fromEntries(Object.entries(j).filter(([k]) => ROLE_KEYS.includes(k)))).matchAll(/gen:fadd:\d+(?:,-?\d+)*(?::(?:mc|w))?/g)].map((m) => m[0]))];
const usedSig = new Set(used.flatMap((id) => pk.signature!(problemOf(id.replace(/:(mc|w)$/, ""))!)));
const usedAns = new Set(used.map((id) => problemOf(id.replace(/:(mc|w)$/, ""))!.answer));
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const F = (v: number) => { for (let d = 1; d <= 1000; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return qs(q(BigInt(Math.round(v * d)), BigInt(d))); return String(v); };
// the change: keep for addition becomes a < n && b < n && a + b !== n (sums above one whole, each addend a proper fraction)
const keepNew = ([a, b, n, s]: number[]) => s !== 0 && (s > 0 ? a < n && b < n && a + b !== n : b < a);
const added: Problem[] = [];
for (let a = 1; a <= 11; a++) for (let b = 1; b <= 11; b++) for (let n = 2; n <= 12; n++) { const p = [a, b, n, 1]; if (!def.reject(p) && keepNew(p) && !(a + b < n)) added.push(problemOf(`gen:fadd:${p.join(",")}`)!); }
const cands = added.filter((p) => { const [a, b, n] = p.params; return phaseOf(p.id) === "diagnostic" && a !== b && a > 1 && b > 1 && gcd(a + b, n) === 1 && n <= 9; }).map((p) => {
  const [a, b, n] = p.params; const vals = p.bugs.filter((x) => x.predict !== null).map((x) => F(x.predict as number));
  const printed = new Set([String(a), String(b), String(n), `${a}/${n}`, `${b}/${n}`]);
  const extra = { "whole-dropped": qs(q(BigInt(a + b - n), BigInt(n))), "capped-at-one": "1" };
  const o = pk.oracle(p.prompt); const alt = pk.alternatives[0].run(p.prompt);
  const ok = { validate: def.validate(p.params, (a + b) / n), oracle: qeq(o.value as any, q(BigInt(a + b), BigInt(n))), numberLine: qeq(alt.value as any, q(BigInt(a + b), BigInt(n))), handAnswer: `${a + b}/${n}` === p.answer };
  const issues = [...(new Set([...vals, ...Object.values(extra)]).size !== vals.length + 2 ? ["two wrong readings give the same value"] : []), ...([...vals, ...Object.values(extra)].some((v) => v === p.answer) ? ["a wrong reading equals the answer"] : []), ...([...vals, ...Object.values(extra)].some((v) => printed.has(v)) ? ["a wrong value is printed in the question"] : []), ...(pk.signature!(p).some((k) => usedSig.has(k)) ? ["same numbers as a package item"] : []), ...(usedAns.has(p.answer) ? ["answer repeats a package item (allowed for a diagnostic: it reveals no answer)"] : [])];
  return { id: p.id, prompt: p.prompt, answer: p.answer, modelled: Object.fromEntries(p.bugs.filter((x) => x.predict !== null).map((x) => [x.id, F(x.predict as number)])), unmodelled: extra, checks: ok, issues };
}).sort((x, y) => x.issues.length - y.issues.length || x.id.localeCompare(y.id));
// served-form side effect of releasing the added items: phasePool alternates typed / :mc by sorted index
const fnv = (str: string) => { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0; return x; };
const PH = ["diagnostic", "check", "retention", "practice"] as const;
const lists = (items: Problem[]) => Object.fromEntries(PH.map((ph) => [ph, items.filter((x) => phaseOf(x.id) === ph).sort((a, b) => fnv(a.id) - fnv(b.id) || a.id.localeCompare(b.id)).map((x, i) => (i % 2 === 1 ? `${x.id}:mc` : x.id)).filter(selectable)]));
const now = Object.fromEntries(PH.map((ph) => [ph, phasePool("fadd", ph)]));
const simSame = JSON.stringify(lists(pool("fadd").items)) === JSON.stringify(now);
const after = lists([...pool("fadd").items, ...added]);
const servedAs = (L: Record<string, string[]>, id: string) => { const b = id.replace(/:(mc|w)$/, ""); for (const ph of PH) for (const x of L[ph]) if (x === b || x === `${b}:mc`) return `${ph} ${x}`; return "not served"; };
const refs = used.filter((id) => !id.endsWith(":w"));
const flips = refs.filter((id) => servedAs(now, id) !== servedAs(after, id)).map((id) => `${id}: ${servedAs(now, id)} -> ${servedAs(after, id)}`);
const out = { sourceCommit: "637938c7da0416b03595fae60a80607e60aa84c0", status: "PROPOSED (not served)", existing: { faddAdditionReleased: pool("fadd").items.filter((p) => p.params[3] === 1).length, faddImproperSumsReleased: pool("fadd").items.filter((p) => p.params[3] === 1 && p.params[0] + p.params[1] > p.params[2]).length, keepToday: "s > 0 ? a + b < n : b < a (families.ts:1192)" },
  change: "families.ts:1192 fadd keep: for addition `a + b < n` → `a < n && b < n && a + b !== n` (each addend a proper fraction; the sum may exceed one whole but not equal it)", addedItems: added.length, addedInDiagnostic: added.filter((p) => phaseOf(p.id) === "diagnostic").length,
  simulatorMatchesPhasePool: simSame, packageReferencesChecked: refs.length, servedFormFlipsForPackageReferences: flips, candidates: cands.slice(0, 8) };
writeFileSync(`${root}/improper-sum.json`, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ ...out, candidates: out.candidates.slice(0, 4) }, null, 1).slice(0, 4000));
process.exit(0);
