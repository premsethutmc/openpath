/**
 * Missing-question specifications for the existing generators (read-only). For each need it searches the generator's WHOLE
 * parameter domain (not only the released pool), and reports where qualifying questions sit:
 *   - served in the required partition, and not already used or shown (then nothing needs changing),
 *   - released but hashed into another partition (only pool selection needs changing),
 *   - valid in the domain but not released (cap, or distinct@1 de-duplication),
 *   - not producible (a generator change is needed).
 * Every proposed instance is checked twice: by the generator's own answer + independent validate(), and by this branch's
 * prompt-text oracle (packages.mts / packages-b2.mts). Writes missing-questions.json and prints a summary.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/question-specs.mts ../docs/math-teaching-content
 */
import { readFileSync, writeFileSync } from "node:fs";
import { FAMILIES, exposureKey, phaseOf, phasePool, pool, problemOf, type Problem } from "../../../packages/learning/src/families.ts";
import { selectable } from "../../../packages/learning/src/question-status.ts";
import { moduleFor } from "../../../packages/learning/src/content.ts";
import { gradeRequest } from "../../../packages/learning/src/server-grader.ts";
import { familyTeachingVisual } from "../../../packages/learning/src/teaching-presentation.ts";
import { PACKAGES, q, qeq, qs, dec } from "./packages.mts";
import { PACKAGES_B2, setFigure } from "./packages-b2.mts";

const root = process.argv[2];
const SOURCE = "637938c7da0416b03595fae60a80607e60aa84c0";
const ALL = [...PACKAGES, ...PACKAGES_B2];
const figOf = (p: Problem) => (FAMILIES.get(p.family) as unknown as { figure?: (x: number[]) => unknown }).figure?.(p.params) ?? null;
setFigure(figOf);
const toQ = (s: string) => { const t = s.trim().replace(/−/g, "-"); if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split("/"); return q(BigInt(a), BigInt(b)); } if (/^-?\d+(\.\d+)?$/.test(t)) return dec(t); return null; };
const same = (a: unknown, b: string) => { if (typeof a === "string") { const A = toQ(a), B = toQ(b); return A && B ? qeq(A, B) : a.replace(/\s/g, "") === b.replace(/\s/g, ""); } const B = toQ(b); return !!B && qeq(a as never, B); };
const pk = (id: string) => ALL.find((x) => x.id === id)!;
const pkgJson = (id: string) => JSON.parse(readFileSync(`${root}/${id.startsWith("TP2") ? "batch-2" : "batch-1"}/${id}.json`, "utf8"));
// items the package actually uses (its roles), not ids merely mentioned in uncertainties, sources, the delayed-check audit or validation
const ROLE_KEYS = ["explanation", "workedExamples", "hints", "diagnostic", "misconceptions", "practice", "responsePatterns", "integration"];
const pkgIds = (pkgId: string) => [...new Set<string>([...JSON.stringify(Object.fromEntries(Object.entries(pkgJson(pkgId)).filter(([k]) => ROLE_KEYS.includes(k)))).matchAll(/gen:[a-z0-9]+:-?\d+(?:,-?\d+)*(?::(?:mc|w))?/g)].map((m) => m[0]))];
const used = (pkgId: string) => new Set<string>(pkgIds(pkgId).map(exposureKey));
const shownIds = (competency: string) => { const m = moduleFor(competency)!; const s: string[] = []; for (const st of m.strategies) { for (const sc of st.screens) if (sc.instance) s.push(sc.instance); if (st.guided) s.push(st.guided); if (st.check) s.push(st.check); } for (const sc of (Array.isArray((m as any).chapter) ? (m as any).chapter : []) as { instance?: string }[]) if (sc.instance) s.push(sc.instance); return s; };
const promptNums = (p: Problem) => new Set([...p.prompt.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => m[0]));

/** all parameter vectors of the family's domain (uncapped) that the family itself accepts */
function domain(fam: string): number[][] {
  const d = FAMILIES.get(fam)!; const out: number[][] = [];
  const rec = (i: number, acc: number[]) => { if (i === d.domain!.length) { if ((!d.keep || d.keep(acc)) && !d.reject(acc)) out.push([...acc]); return; } for (let v = d.domain![i][0]; v <= d.domain![i][1]; v++) rec(i + 1, [...acc, v]); };
  rec(0, []); return out;
}

interface Need { id: string; title: string; package: string; family: string; roles: ("diagnostic" | "check" | "retention" | "practice")[]; form?: "typed" | "any"; constraint: string; accept: (p: Problem) => boolean; wrong: string[]; ambiguity: (p: Problem) => string[] }
const NEEDS: Need[] = [
  { id: "MQ1", title: "Unambiguous (px + q)² cross-term questions", package: "TP-ALG-01", family: "ahid", roles: ["diagnostic", "retention"],
    constraint: "params = [0, p, q, 1]: form (px + q)², the box is the x coefficient (answer 2pq); p ≥ 2, p ≠ q, q ≠ 2p, p ≠ 2q, and neither modelled wrong value (pq, −2pq) is a number printed in the question",
    accept: (p) => { const [f, a, b, box] = p.params; if (f !== 0 || box !== 1 || a < 2 || a === b || b === 2 * a || a === 2 * b) return false; const nums = promptNums(p); return p.bugs.filter((x) => x.predict !== null).every((x) => !nums.has(String(x.predict))); },
    wrong: ["middle-not-doubled", "middle-sign"],
    ambiguity: (p) => { const [, a, b] = p.params; return [...(a * b === a * a ? ["pq equals p²"] : []), ...(a * b === b * b ? ["pq equals q²"] : [])]; } },
  { id: "MQ2", title: "Equal-colour-count probability contrast", package: "TP2-CH-BAG", family: "akchance", roles: ["diagnostic"],
    constraint: "params = [r, b, g, 0] with every colour present in equal numbers (r = b and g ∈ {0, r}) and r ≥ 2: then 1/(number of colours) IS the right answer, so the contrast separates 'colours-equal' from understanding only together with an unequal item; odds (r : others) and count-only (r) give different values",
    accept: (p) => { const [r, b, g, k] = p.params; return k === 0 && r === b && (g === 0 || g === r) && r >= 2; },
    wrong: ["odds", "count-only"],
    ambiguity: (p) => { const vals = p.bugs.filter((x) => x.predict !== null).map((x) => String(x.predict)); return new Set(vals).size !== vals.length ? ["two modelled errors give the same value"] : []; } },
  { id: "MQ3", title: "Durations whose minutes total 100 or more", package: "TP2-REG-TIME", family: "addur", roles: ["check", "retention"],
    constraint: "params = [0, x] (two durations in h and min) where the two minute parts add to 100 or more: then no-carry keeps 100+ minutes and regrouping at 100 gives (h + 1, minutes − 100), which differ",
    accept: (p) => { if (p.params[0] !== 0) return false; const m = p.prompt.match(/(\d+) h (\d+) min[^\d]+(\d+) h (\d+) min/); return !!m && Number(m[2]) + Number(m[4]) >= 100; },
    wrong: ["no-carry", "carry-kept"],
    ambiguity: () => [] },
  { id: "MQ5", title: "Different-size-spinner multi-pair recheck", package: "TP-PRO-01", family: "akdice", roles: ["check"],
    constraint: "params = [m, n, 0, k] with m ≠ n (different sizes) and 2 < k < m + n (a total made by at least two pairs); not already used by TP-PRO-01 or shown by the module",
    accept: (p) => { const [m, n, mode, k] = p.params; return mode === 0 && m !== n && k > 2 && k < m + n; },
    wrong: ["totals-equally-likely", "added-sides"],
    ambiguity: () => [] },
  { id: "MQ6", title: "'How many tens' recheck", package: "TP2-PV-DIGIT", family: "aadigit", roles: ["check"],
    constraint: "params = [n, 1] with two different digits; not already used by TP2-PV-DIGIT (including its 'how many tens' tens-digit signature) or shown by the module",
    accept: (p) => p.params[1] === 1 && Math.floor(p.params[0] / 10) !== p.params[0] % 10,
    wrong: ["value-not-count"],
    ambiguity: () => [] },
];

const results: any[] = [];
// the recommendation per need (09-MISSING-QUESTIONS-AND-VISUALS.md), recorded with the evidence the tool computes
const RECOMMENDED: Record<string, string> = {
  MQ1: "diagnostic gen:ahid:0,3,7,1 (pin typed; already in diagnostic); retention gen:ahid:0,2,9,1 (override practice → retention after form assignment)",
  MQ2: "diagnostic gen:akchance:8,8,0,0 (override check → diagnostic, typed, after form assignment)",
  MQ3: "recheck gen:addur:0,7 in hours and minutes (override diagnostic → check); retention gen:addur:0,291 after the bounds change (mode 0, x ≤ 299). gen:addur:1,39 (minutes and seconds) is ADDITIONAL transfer practice only, never the recheck",
  MQ4: "add fadd.word(p); transfer gen:fadd:1,2,5,1:w (also 1,2,4,1 and 1,2,11,1)",
  MQ5: "RESOLVED in the package by freshness@2 (no pool change): recheck gen:akdice:4,5,0,5 (4,5,0,4 is the mirror of the diagnostic 4,5,0,7, a relabelled problem)",
  MQ6: "RESOLVED in the package by freshness@2 (no pool change): recheck gen:aadigit:28,1:mc",
};
for (const n of NEEDS) {
  const def: any = FAMILIES.get(n.family);
  const P0 = pk(n.package);
  const usedKeys = used(n.package), shownKeys = new Set(shownIds(P0.competency).map(exposureKey));
  const sigUsed = new Set<string>();
  for (const id of [...pkgIds(n.package), ...shownIds(P0.competency)]) { const pr = problemOf(id.replace(/:(mc|w)$/, "")); if (pr && pr.family === n.family) { try { for (const k of [...(P0.signature?.(pr) ?? []), ...(P0.recheckProblem?.(pr) ?? [])]) sigUsed.add(k); } catch { /* none */ } } }
  const usedAnswers = new Set<string>([...pkgIds(n.package), ...shownIds(P0.competency)].map((id) => problemOf(id.replace(/:(mc|w)$/, ""))).filter((pr) => pr && pr.family === n.family).map((pr) => pr!.answer));
  const released = new Map(pool(n.family).items.map((p) => [p.id, p]));
  const excluded = new Map(pool(n.family).excluded.map((e) => [`gen:${n.family}:${e.params.join(",")}`, e.reason]));
  const rows = domain(n.family).map((params) => {
    let p: Problem | null = null; try { p = problemOf(`gen:${n.family}:${params.join(",")}`); } catch { /* invalid */ }
    return { params, p };
  }).filter((x) => x.p && n.accept(x.p)).map(({ params, p }) => {
    const id = p!.id;
    const isReleased = released.has(id);
    const part = isReleased ? phaseOf(id) : null;
    const servedForms = isReleased ? (["diagnostic", "check", "retention", "practice"] as const).flatMap((ph) => phasePool(n.family, ph).filter((x) => x === id || x === `${id}:mc`)) : [];
    const k = exposureKey(id);
    // freshness@2: a recheck of a package with recheckProblem is blocked by the same problem only, not by a repeated answer
    const R = !!P0.recheckProblem && n.roles.length === 1 && n.roles[0] === "check";
    const sig = R ? P0.recheckProblem!(p!) : P0.signature?.(p!) ?? [];
    const ans = !R && (P0 as any).answerDistinct && usedAnswers.has(p!.answer);
    const reuse = usedKeys.has(k) ? "already used by the package" : shownKeys.has(k) ? "already shown by the module's existing explanations" : sig.some((s) => sigUsed.has(s)) ? `same numbers (${sig.filter((s) => sigUsed.has(s)).join(", ")}) as an item the package uses or the module shows` : ans ? `answer ${p!.answer} already used (the package requires distinct answers)` : null;
    const status = !isReleased ? (excluded.has(id) ? `not released: ${excluded.get(id)}` : `not released: outside the family's release cap (if released it would hash into ${phaseOf(id)})`) : !selectable(id) ? "released but quarantined" : reuse ? `${reuse} [${part}]` : n.roles.includes(part as never) && part === "diagnostic" && !servedForms.some((f) => !f.endsWith(":mc")) ? `FORM: in the diagnostic partition but served only as ${servedForms.join(", ")} (a diagnostic needs the typed form)` : n.roles.includes(part as never) ? `AVAILABLE: served in the ${part} partition as ${servedForms.join(", ")}` : `released, but hashed into the ${part} partition`;
    return { id, params, partition: part, servedAs: servedForms, status, prompt: p!.prompt, answer: p!.answer, p: p! };
  });
  const available = rows.filter((r) => r.status.startsWith("AVAILABLE"));
  const wrongPartition = rows.filter((r) => r.status.startsWith("released, but hashed"));
  const unreleased = rows.filter((r) => r.status.startsWith("not released"));
  // per role: what exists for it
  const perRole = n.roles.map((role) => ({ role, available: available.filter((r) => r.partition === role).map((r) => r.servedAs.join(" / ")), inOtherPartitions: wrongPartition.length, unreleased: unreleased.length }));
  // proposed instances: prefer released-in-another-partition (pool selection only), then unreleased (release change); verify each
  const blocked = rows.filter((r) => n.roles.includes(r.partition as never) && /already|same numbers|answer .* already/.test(r.status));
  const formOnly = rows.filter((r) => r.status.startsWith("FORM"));
  const proposals = [...available, ...formOnly, ...wrongPartition.slice(0, 4), ...unreleased.slice(0, 4), ...(available.length ? [] : blocked.slice(0, 6))].map((r) => {
    const o = P0.oracle(r.prompt, figOf(r.p));
    const g = gradeRequest({ id: r.id, response: r.answer });
    const validates = (() => { try { const v = r.p.type === "tuple" ? r.answer : Number.isFinite(Number(r.answer)) ? Number(r.answer) : (toQ(r.answer) ? Number(toQ(r.answer)!.n) / Number(toQ(r.answer)!.d) : r.answer); return def.validate(r.params, v); } catch { return false; } })();
    const wrong = r.p.bugs.filter((b) => b.predict !== null).map((b) => ({ id: b.id, kind: b.kind, value: b.predict, targeted: n.wrong.includes(b.id) }));
    return { id: r.id, status: r.status, partition: r.partition, prompt: r.prompt, answer: r.answer, independentOracle: { agrees: same(o.value as never, r.answer), lines: o.lines }, generatorValidate: validates, trustedGrader: r.status.startsWith("not released") ? "not gradable until released" : g.verdict, anticipatedWrong: wrong, ambiguity: n.ambiguity(r.p) };
  });
  const decision = Object.fromEntries(n.roles.map((role) => {
    const a = available.filter((r) => r.partition === role).length, b = blocked.filter((r) => r.partition === role).length;
    const fm = rows.filter((r) => r.partition === role && r.status.startsWith("FORM")).length;
    return [role, a ? `SERVED: ${a} qualifying item(s) already served in this partition and unused; only the package selection changes` : fm ? `FORM CHANGE ONLY: ${fm} qualifying item(s) sit in this partition but phasePool serves them as :mc; pin the typed form` : b ? `SERVED BUT BLOCKED BY THIS BRANCH'S REUSE RULE: ${b} item(s) in this partition repeat a number signature or answer the package already uses` : wrongPartition.length ? "PARTITION CHANGE: qualifying items are released but hashed into other partitions" : unreleased.some((r) => phaseOf(r.id) === role) ? "RELEASE CHANGE: qualifying items outside the released pool (cap or distinct@1) would hash into this partition" : rows.some((r) => r.status.startsWith("released") || /\[/.test(r.status)) ? "PARTITION CHANGE: only released items in other partitions (some blocked by this branch's reuse rule) qualify; no released or unreleased item hashes into this partition" : unreleased.length ? "RELEASE AND PARTITION CHANGE: qualifying items exist only outside the released pool, and none hashes into this partition" : "GENERATOR CHANGE: no parameter choice in the domain produces it"];
  }));
  results.push({ recommended: RECOMMENDED[n.id], need: n.id, title: n.title, package: n.package, family: n.family, source: srcOf(n.family), roles: n.roles, constraint: n.constraint, counts: { qualifyingInDomain: rows.length, released: rows.length - unreleased.length, availableInRequiredPartition: available.length, releasedOtherPartition: wrongPartition.length, notReleased: unreleased.length, alreadyUsedOrShown: rows.filter((r) => /already|same numbers/.test(r.status)).length }, reuseByPartition: Object.fromEntries(["diagnostic", "check", "retention", "practice"].map((ph) => [ph, rows.filter((r) => r.partition === ph && /already|same numbers/.test(r.status)).map((r) => `${r.id}: ${r.status}`)])), perRole, decision, proposals });
}

// MQ4: fadd has no word form at all (a generator change: a `word(p)` function on the existing family)
{
  const def: any = FAMILIES.get("fadd");
  const P0 = pk("TP-NUM-02");
  const word = ([a, b, n]: number[]) => `Meena cut a cake into ${n} equal pieces. She ate ${a} ${a === 1 ? "piece" : "pieces"} and her brother ate ${b} ${b === 1 ? "piece" : "pieces"}. What fraction of the cake did they eat altogether?`;
  const usedF = [...pkgIds("TP-NUM-02"), ...shownIds(P0.competency)].map((id) => problemOf(id.replace(/:(mc|w)$/, ""))).filter((pr) => pr && pr.family === "fadd") as Problem[];
  const sigF = new Set(usedF.flatMap((pr) => P0.signature?.(pr) ?? [])), ansF = new Set(usedF.map((pr) => pr.answer));
  const preds = (p: Problem) => p.bugs.filter((b) => b.predict !== null).map((b) => Number(b.predict).toFixed(6));
  const sample = pool("fadd").items.filter((p) => p.params[3] === 1 && p.params[0] + p.params[1] < p.params[2] && p.params[0] !== p.params[1] && phaseOf(p.id) === "practice" && !(P0.signature?.(p) ?? []).some((k) => sigF.has(k)) && !ansF.has(p.answer) && new Set(preds(p)).size === preds(p).length).slice(0, 6);
  const proposals = sample.map((p) => { const o = P0.oracle(p.prompt); const g = gradeRequest({ id: p.id, response: p.answer }); return { typedId: p.id, wouldBe: `${p.id}:w`, word: word(p.params), answer: p.answer, independentOracle: { agrees: same(o.value as never, p.answer), lines: o.lines }, trustedGraderOnTypedForm: g.verdict, anticipatedWrong: p.bugs.filter((b) => b.predict !== null).map((b) => ({ id: b.id, kind: b.kind, value: b.predict, targeted: true })), ambiguity: p.params[0] + p.params[1] === p.params[2] ? ["the sum is one whole: the word form must accept 1 as well as n/n"] : [] }; });
  results.push({ recommended: RECOMMENDED.MQ4, need: "MQ4", title: "Everyday transfer question for adding like fractions", package: "TP-NUM-02", family: "fadd", source: srcOf("fadd"), roles: ["practice (transfer, :w form)"],
    constraint: "params = [a, b, n, 1] (addition) with a + b < n, so the everyday situation (parts of ONE whole) makes sense; the word form keeps the same answer (family-kit contract: 'word(p): the same mathematics in an everyday situation … Same answer')",
    counts: { familyHasWordForm: !!def.word, eligibleReleasedItems: pool("fadd").items.filter((p) => p.params[3] === 1 && p.params[0] + p.params[1] <= p.params[2]).length },
    decision: "GENERATOR CHANGE NEEDED (small): add a `word(p)` function to the existing fadd definition, returning text only for addition with a + b < n (subtraction and sums of one whole or more keep no word form); no new family, no new solve/validate",
    proposedWordTemplate: "Meena cut a cake into {n} equal pieces. She ate {a} piece(s) and her brother ate {b} piece(s). What fraction of the cake did they eat altogether?",
    proposals });
}
// ---- side effect of a partition move on served forms: phasePool alternates typed / :mc by sorted index, so moving one item can flip
// the form of every later item in both partitions. Simulated with the same algorithm (asserted equal to phasePool with no change).
const fnv = (str: string) => { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 0x01000193) >>> 0; return x; };
const PH = ["diagnostic", "check", "retention", "practice"] as const;
function sim(fam: string, override: Record<string, (typeof PH)[number]>, pinTyped: string[], pinAfterParity: boolean) {
  const def: any = FAMILIES.get(fam);
  const ph = (id: string) => override[id] ?? phaseOf(id);
  const out: Record<string, string[]> = {};
  for (const phase of PH) {
    const base = pool(fam).items.filter((x) => (pinAfterParity ? phaseOf(x.id) : ph(x.id)) === phase).sort((a, b) => fnv(a.id) - fnv(b.id) || a.id.localeCompare(b.id)).map((x, i) => (def.mc && x.type !== "set" && x.type !== "choice" && i % 2 === 1 ? `${x.id}:mc` : x.id));
    out[phase] = base;
  }
  if (pinAfterParity) { // apply the move after forms are assigned: remove from the old list, append to the new one (in typed form if pinned)
    for (const [id, to] of Object.entries(override)) { for (const phase of PH) out[phase] = out[phase].filter((x) => x !== id && x !== `${id}:mc`); out[to].push(id); }
  }
  for (const phase of PH) out[phase] = out[phase].map((x) => (pinTyped.includes(x.replace(/:mc$/, "")) ? x.replace(/:mc$/, "") : x)).filter(selectable);
  return out;
}
const allRefs = (fam: string) => { const s = new Set<string>(); for (const pk0 of ALL) { try { for (const id of pkgIds(pk0.id)) if (id.split(":")[1] === fam && !id.endsWith(":w")) s.add(id); } catch { /* package without file */ } } return [...s]; };
const servedAs = (lists: Record<string, string[]>, id: string) => { const b = id.replace(/:mc$/, ""); for (const phase of PH) for (const x of lists[phase]) if (x === b || x === `${b}:mc`) return `${phase} ${x}`; return "not served"; };
const MOVES: { family: string; need: string; override: Record<string, (typeof PH)[number]>; pinTyped: string[] }[] = [
  { family: "ahid", need: "MQ1", override: { "gen:ahid:0,2,9,1": "retention" }, pinTyped: ["gen:ahid:0,3,7,1"] },
  { family: "akchance", need: "MQ2", override: { "gen:akchance:8,8,0,0": "diagnostic" }, pinTyped: ["gen:akchance:8,8,0,0"] },
  { family: "addur", need: "MQ3", override: { "gen:addur:0,7": "check" }, pinTyped: [] },
];
const sideEffects = MOVES.map((m) => {
  const now = Object.fromEntries(PH.map((ph) => [ph, phasePool(m.family, ph)]));
  const same = JSON.stringify(sim(m.family, {}, [], false)) === JSON.stringify(now);
  const refs = allRefs(m.family);
  const naive = sim(m.family, m.override, m.pinTyped, false), pinned = sim(m.family, m.override, m.pinTyped, true);
  const changed = (lists: Record<string, string[]>) => refs.filter((id) => servedAs(lists, id) !== servedAs(now, id)).map((id) => `${id}: ${servedAs(now, id)} -> ${servedAs(lists, id)}`);
  return { need: m.need, family: m.family, move: m.override, pinTyped: m.pinTyped, simulatorMatchesPhasePool: same, packageReferencesChecked: refs.length,
    ifPhaseOfIsChanged: { referencedItemsWhoseServedFormChanges: changed(naive) },
    ifOverrideIsAppliedAfterFormAssignment: { referencedItemsWhoseServedFormChanges: changed(pinned), movedItemNow: Object.keys(m.override).map((id) => `${id}: ${servedAs(pinned, id)}`) } };
});
for (const s0 of sideEffects) console.log("SIDE", s0.need, s0.family, "sim==phasePool", s0.simulatorMatchesPhasePool, "refs", s0.packageReferencesChecked, "naive flips", s0.ifPhaseOfIsChanged.referencedItemsWhoseServedFormChanges.length, "after-assignment flips", s0.ifOverrideIsAppliedAfterFormAssignment.referencedItemsWhoseServedFormChanges.length, s0.ifOverrideIsAppliedAfterFormAssignment.movedItemNow.join("; "));
// ---- visual specifications: data for each package's own worked-example and diagnostic instances, checked against the instance
const deg = (x: number | string) => `${x}°`;
const nums0 = (t: string) => [...t.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
interface VSpec { id: string; package: string; family: string; need: string; primitive: string; data: (p: Problem) => Record<string, unknown>; check: (p: Problem, v: any) => string[] }
const VSPECS: VSpec[] = [
  { id: "V1", package: "TP-NUM-01", family: "adfcmp", need: "paired fraction strips of equal length", primitive: "existing 'strips' widget (Learn.tsx Picture) + one field; the lesson-page path already has TeachingVisual 'fraction-strip' with 'comparison' (familyTeachingVisual adfcmp)",
    data: (p) => { const [mode, k, x, y] = p.params; const [f1, f2] = mode === 0 ? [[x, k], [y, k]] : [[k, x], [k, y]]; return { type: "strips", top: f1[1], shaded: f1[0], bottom: f2[1], bottomShaded: f2[0], labels: [`${f1[0]}/${f1[1]}`, `${f2[0]}/${f2[1]}`] }; },
    check: (p, v) => { const e: string[] = []; const m = p.prompt.match(/(\d+)\/(\d+)[^/]*? or (\d+)\/(\d+)/); if (!m) return ["prompt fractions not found"]; if (![v.shaded, v.top, v.bottomShaded, v.bottom].every((n: number, i: number) => n === Number(m[i + 1]))) e.push("strip parts/shading differ from the question's fractions"); const tv: any = familyTeachingVisual(p); if (!tv || tv.numerator !== v.shaded || tv.denominator !== v.top || tv.comparison?.numerator !== v.bottomShaded || tv.comparison?.denominator !== v.bottom) e.push("differs from the existing familyTeachingVisual(adfcmp) fraction-strip"); if (Math.round((v.shaded * v.bottom) / v.top) !== v.bottomShaded) e.push("NOTE: today's strips widget would shade the second row wrongly (it derives an equivalent shading); bottomShaded is required"); return e; } },
  { id: "V2", package: "TP-MEA-01", family: "aeperar", need: "perimeter outline", primitive: "existing Figure 'shape' kind 'rectangle' with four side labels + one optional field",
    data: (p) => { const [l, w] = nums0(p.prompt); const u = (p.prompt.match(/\d+ (m|cm)\b/) ?? [])[1] ?? ""; const L = `${l} ${u}`.trim(), W = `${w} ${u}`.trim(); return p.params[0] === 1 ? { type: "shape", kind: "rectangle", name: "rectangle", lengths: [L, W, L, W], outline: true } : { type: "grid", rows: w, cols: l, shaded: l * w }; },
    check: (p, v) => { const e: string[] = []; const [l, w] = nums0(p.prompt); if (v.type === "shape") { if (!(v.lengths[0].startsWith(`${l}`) && v.lengths[1].startsWith(`${w}`) && v.lengths[2] === v.lengths[0] && v.lengths[3] === v.lengths[1])) e.push("side labels differ from the question"); if (v.lengths.some((x: string) => x.startsWith(`${p.answer} `) || x === p.answer)) e.push("a label shows the answer"); } else if (v.shaded !== l * w) e.push("covering grid shading is not every square"); return e; } },
  { id: "V3", package: "TP-GEO-01", family: "ahext", need: "triangle with an extended side and its exterior angle", primitive: "existing Figure 'triangle' + one field 'exterior'",
    data: (p) => { const [a, b, f] = p.params; return f === 0 ? { type: "triangle", angles: [deg(a), "", deg(b)], exterior: { at: 1, label: "?" }, notToScale: true } : { type: "triangle", angles: [deg(a), "", "?"], exterior: { at: 1, label: deg(a + b) }, notToScale: true }; },
    check: (p, v) => { const e: string[] = []; const shown = [...v.angles, v.exterior.label].filter((x: string) => /\d/.test(x)).map((x: string) => Number(x.replace("°", ""))); const inPrompt = new Set(nums0(p.prompt)); if (!shown.every((n: number) => inPrompt.has(n))) e.push("a label is not a number of the question"); if (shown.includes(Number(p.answer))) e.push("a label shows the answer"); if (v.angles[1] !== "") e.push("the interior angle next to the exterior angle must stay unlabelled (it is not one of the two opposite angles)"); return e; } },
  { id: "V4", package: "TP-GEO-02", family: "afcross", need: "two crossing lines with four angles", primitive: "existing Figure 'angle' (drawn to scale from deg) + fields 'cross' and 'labels'",
    data: (p) => { const [a, rel] = p.params; return { type: "angle", deg: a, cross: true, labels: rel === 0 ? [deg(a), "", "?", ""] : rel === 1 ? [deg(a), "?", "", ""] : [deg(a), "?", "?", "?"] }; },
    check: (p, v) => { const e: string[] = []; if (v.deg !== nums0(p.prompt)[0]) e.push("deg differs from the given angle"); if (v.labels.slice(1).some((x: string) => x === deg(p.answer))) e.push("a label other than the given angle shows the answer"); if (v.labels.filter((x: string) => x === "?").length < 1) e.push("no angle is marked as asked"); return e; } },
  { id: "V5", package: "TP-ALG-01", family: "ahid", need: "labelled 2 × 2 area model", primitive: "existing Figure 'grid' (rows 2, cols 2: ahid's own 'area' visual) + fields 'labels', 'rowLabels', 'colLabels'",
    data: (p) => { const [form, a, b] = p.params; const s = form === 1 ? -1 : 1; const t = (n: number) => (n < 0 ? `−${-n}` : `${n}`); return { type: "grid", rows: 2, cols: 2, colLabels: [`${a}x`, t(s * b)], rowLabels: [`${a}x`, t(s * b)], labels: [`${a * a}x²`, `${t(s * a * b)}x`, `${t(s * a * b)}x`, `${b * b}`] }; },
    check: (p, v) => { const e: string[] = []; const [form, a, b, box] = p.params; if (form > 1) return ["only (px ± q)² forms"]; const cell = (i: number) => Number(String(v.labels[i]).replace("−", "-").replace(/x²?$/, "")); if (cell(0) !== a * a || cell(3) !== b * b) e.push("square cells differ from p² and q²"); if (box === 1 && cell(1) + cell(2) !== Number(p.answer.replace("−", "-"))) e.push("the two rectangles do not add to the checked middle coefficient"); return e; } },
];
const visuals = VSPECS.map((vs) => {
  const j = pkgJson(vs.package);
  const ids = [...new Set<string>([...(j.workedExamples ?? []).map((w: any) => w.id), ...(j.diagnostic ?? []).map((d: any) => d.id)].filter(Boolean))];
  const samples = ids.map((id) => { const p0 = problemOf(id.replace(/:(mc|w)$/, ""))!; if (p0.family !== vs.family) return null; const v = vs.data(p0); return { id, prompt: p0.prompt, answer: p0.answer, data: v, issues: vs.check(p0, v) }; }).filter(Boolean) as any[];
  return { id: vs.id, package: vs.package, family: vs.family, need: vs.need, primitive: vs.primitive, samples, allFamilyPoolChecked: pool(vs.family).items.filter((p0) => vs.family !== "ahid" || p0.params[0] < 2).map((p0) => vs.check(p0, vs.data(p0)).filter((x) => !x.startsWith("NOTE"))).filter((x) => x.length).length };
});
for (const v of visuals) console.log("VIS", v.id, v.family, "samples", v.samples.length, "sample issues", JSON.stringify(v.samples.flatMap((s0: any) => s0.issues)).slice(0, 300), "| pool items with issues", v.allFamilyPoolChecked, "of", pool(v.family).items.length);
writeFileSync(`${root}/missing-questions.json`, JSON.stringify({ sourceCommit: SOURCE, status: "PROPOSED questions (not served, not integrated). Verified-served questions are listed separately in integration-manifest.json.", needs: results.sort((a, b) => a.need.localeCompare(b.need)), partitionMoveSideEffects: sideEffects, visuals }, null, 1) + "\n");
for (const r of results.sort((a, b) => a.need.localeCompare(b.need))) console.log(r.need, r.family, JSON.stringify(r.counts), "|", JSON.stringify(r.decision), "|", (r.proposals ?? []).map((p: any) => `${p.id ?? p.wouldBe} ${p.partition ?? ""} oracle=${p.independentOracle.agrees} val=${p.generatorValidate ?? "-"} grader=${p.trustedGrader ?? p.trustedGraderOnTypedForm} amb=${p.ambiguity.length}`).join("; "));
process.exit(0);

function srcOf(fam: string) {
  for (const f of ["families.ts", ...Array.from({ length: 23 }, (_, i) => `fam/b${String(i + 1).padStart(2, "0")}.ts`)]) {
    try { const t = readFileSync(new URL(`../../../packages/learning/src/${f}`, import.meta.url), "utf8").split("\n"); const i = t.findIndex((l) => l.includes(`id: "${fam}"`)); if (i >= 0) return `packages/learning/src/${f}:${i + 1}`; } catch { /* missing file */ }
  }
  return null;
}
