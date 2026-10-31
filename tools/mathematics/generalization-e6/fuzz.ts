// E6 fuzz partition: deterministic structure-aware mutations of dev working. Properties: (1) never throws, (2) a mutation that changes any digit/operator
// of a dev case labelled non-verified never becomes verified, (3) bounded time. Mutations of verified cases are only checked for (1)/(3) and for
// agreement with an independent exact re-derivation is NOT claimed (no oracle).
import { readFileSync, writeFileSync } from "node:fs";
const ENG = new URL("../../../packages/learning/src/", import.meta.url).pathname;
const { assessMathematicalWorking } = await import(ENG + "unified-math-engine.ts");
const cases = JSON.parse(readFileSync(new URL("dev-cases.v1.json", import.meta.url), "utf8")).cases;
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const junk = ["±", "∞", "(((", ")))", "^^", "÷0", "/0", "d/dx", "∫", "lim", "i^999999999", "9".repeat(60), "√-1", "!"];
let n = 0, thrown = 0, fa = 0, slow = 0, maxMs = 0; const out: unknown[] = [];
for (const c of cases) for (let k = 0; k < 20; k++) {
  const t0 = c.studentWorking.text as string; const ls = t0.split("\n"); const li = Math.floor(rnd() * ls.length);
  const mode = Math.floor(rnd() * 4); let L = ls[li];
  if (mode === 0) L = L.replace(/\d/, (d: string) => String((Number(d) + 1 + Math.floor(rnd() * 8)) % 10));
  else if (mode === 1) L = L.replace(/[+\-*]/, (o: string) => pick(["+", "-", "*"].filter((x) => x !== o)));
  else if (mode === 2) L = L.slice(0, Math.floor(rnd() * L.length)) + pick(junk) + L.slice(Math.floor(rnd() * L.length));
  else ls.splice(li, 1);
  if (mode !== 3) ls[li] = L; const text = ls.join("\n"); n++;
  const s = performance.now();
  try {
    const a = await assessMathematicalWorking(c.problem, { format: "natural", text });
    const ms = performance.now() - s; maxMs = Math.max(maxMs, ms); if (ms > 2000) slow++;
    const changed = text !== t0;
    if (changed && c.reference.classification !== "verified" && a.classification === "verified") { fa++; out.push({ id: c.caseId, text, got: a.classification }); }
  } catch (e) { thrown++; out.push({ id: c.caseId, text, error: String(e).slice(0, 120) }); }
}
const res = { mutants: n, thrown, nonVerifiedBecameVerified: fa, slowOver2s: slow, maxMs: Math.round(maxMs), details: out.slice(0, 20) };
writeFileSync(new URL("results/fuzz-e6.json", import.meta.url), JSON.stringify(res, null, 1)); console.log(JSON.stringify({ ...res, details: res.details.length }));
