/**
 * Builds and CHECKS batch-1 teaching packages from packages.mts. Read-only against the runtime (no registry, module or content file
 * is written); output goes to docs/math-teaching-content/batch-1/.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/build.mts ../docs/math-teaching-content
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { FAMILIES, exposureKey, phasePool, phaseOf, pool, problemOf, type Problem } from "../../../packages/learning/src/families.ts";
import { selectable } from "../../../packages/learning/src/question-status.ts";
import { isQuestion, question, moduleFor, type Module, type Strategy, type Screen } from "../../../packages/learning/src/content.ts";
import { contentEligibility, contentHash, explanationId, explanationRegistry, validateRegistry, addressedMisconception, isMisconceptionSpecific, type ExplanationRecord, type ExplanationRegistry } from "../../../packages/learning/src/explanation-review.ts";
import { teachingEligibility, lessonBlocks } from "../../../packages/learning/src/teaching-contract.ts";
import { probeReading } from "../../../packages/learning/src/reasoning.ts";
import { PACKAGES_B2, PATTERNS, setFigure } from "./packages-b2.mts";
import { gradeRequest } from "../../../packages/learning/src/server-grader.ts";
import { graph, relations } from "../../../packages/learning/src/graph.ts";
import { PACKAGES, dec, q, qeq, qs, type Package, type Q } from "./packages.mts";

const root = process.argv[2];
for (const b of ["batch-1", "batch-2"]) mkdirSync(`${root}/${b}`, { recursive: true });
const ALL = [...PACKAGES.map((x) => ({ ...x, batch: x.batch ?? "batch-1" as const })), ...PACKAGES_B2];
const figOf = (p: Problem) => (FAMILIES.get(p.family) as unknown as { figure?: (x: number[]) => unknown }).figure?.(p.params) ?? null;
setFigure(figOf);
const REG = explanationRegistry();
const typed = (id: string) => !/:(mc|w)$/.test(id);
const P = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
const toQ = (s: string): Q | null => { const t = s.trim().replace(/−/g, "-"); if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split("/"); return q(BigInt(a), BigInt(b)); } if (/^-?\d+(\.\d+)?$/.test(t)) return dec(t); return null; };
const same = (a: Q | string, b: string) => { const B = toQ(b); if (typeof a === "string") { const A = toQ(a); return A && B ? qeq(A, B) : a.replace(/\s/g, "") === b.replace(/\s/g, ""); } return !!B && qeq(a, B); };
/** a bug's predicted value as a learner would type it */
/** a wrong value in the style the learner would write for this question (fraction if the answer is a fraction, else decimal) */
function shown(v: unknown, answer: string): string[] {
  if (typeof v === "number" && !Number.isInteger(v) && answer.includes("/")) { for (let d = 2; d <= 2000; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < 1e-9) return [qs(q(n, d))]; } }
  return typedForm(v);
}
function typedForm(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) return v.flatMap(typedForm);
  if (typeof v === "string") return [v];
  const x = v as number;
  if (Number.isInteger(x)) return [String(x)];
  if (Math.abs(Math.round(x * 1000) - x * 1000) < 1e-9) return [String(Math.round(x * 1000) / 1000)];
  for (let d = 2; d <= 2000; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return [qs(q(n, d))]; }
  return [String(x)];
}
const grade = (id: string, response: string) => { const r = gradeRequest({ id, response }); return { verdict: r.verdict, reason: r.reason, source: r.source }; };

const failures: string[] = [];
const fail = (pk: string, m: string) => failures.push(`${pk}: ${m}`);

function checkItem(pk: Package, id: string, role: string) {
  const p = P(id);
  const mc = id.endsWith(":mc") ? (question(id) as unknown as { answer: string; options: string[] }) : null;
  const letter = (v: string) => { if (!mc) return v; const i = mc.options.findIndex((o) => { const A = toQ(o), B = toQ(v); return A && B ? qeq(A, B) : o === v; }); return i < 0 ? null : String.fromCharCode(65 + i); };
  const g = grade(id, mc ? mc.answer : p.answer);
  const mcConsistent = mc ? letter(p.answer) === mc.answer : true;
  const typedId = id.replace(/:(mc|w)$/, "");
  let oracle: { ok: boolean; lines: string[]; error?: string };
  try { const o = pk.oracle(P(typedId).prompt, figOf(P(typedId))); oracle = { ok: same(o.value, p.answer), lines: o.lines }; } catch (e) { oracle = { ok: false, lines: [], error: String(e) }; }
  const alts = pk.alternatives.map((a) => { try { const r = a.run(P(typedId).prompt, figOf(P(typedId))); return { name: a.name, ok: same(r.value, p.answer), lines: r.lines }; } catch (e) { return { name: a.name, ok: false, lines: [String(e)] }; } });
  const forms = (b: { id: string; predict: unknown }) => [...typedForm(b.predict), ...(pk.display?.[b.id] && !mc ? [pk.display[b.id](p)] : [])];
  const bugs = (p.bugs ?? []).filter((b) => b.predict !== null && b.predict !== undefined).map((b) => ({ id: b.id, kind: b.kind, predicts: forms(b), graded: forms(b).map((r) => { const l = letter(r); return l === null ? "not-an-option" : grade(id, l).verdict; }) }));
  const wordSameAnswer = id.endsWith(":w") ? P(typedId).answer === p.answer : null;
  const ok = g.verdict === "correct" && oracle.ok && alts.every((a) => a.ok) && bugs.every((b) => b.graded.every((v) => v === "incorrect" || v === "not-an-option")) && mcConsistent && wordSameAnswer !== false && selectable(id) && p.family === pk.family;
  if (!ok) fail(pk.id, `${role} ${id}: grader ${g.verdict}, oracle ${oracle.ok}${oracle.error ? ` (${oracle.error})` : ""}, alternatives ${alts.map((a) => a.ok).join("/")}, bugs ${JSON.stringify(bugs.map((b) => b.graded))}, selectable ${selectable(id)}`);
  return { id, role, prompt: mc ? (question(id) as unknown as { prompt: string }).prompt : p.prompt, answer: p.answer, ...(mc ? { options: mc.options, correctOption: mc.answer } : {}), grader: g, oracle, alternatives: alts, bugs, ok };
}

const report: Record<string, unknown>[] = [];
const built = new Map<string, any>();
for (const pk of ALL) {
  const out = `${root}/${pk.batch}`;
  const def = FAMILIES.get(pk.family)!;
  // questions already SHOWN (solved, or as guided/check) by the module's existing explanations are exposed: never used again here
  const used = new Set<string>();
  { const m0 = moduleFor(pk.competency)!; const shownIds: string[] = []; for (const st of m0.strategies) { for (const sc of st.screens) if (sc.instance) shownIds.push(sc.instance); if (st.guided) shownIds.push(st.guided); if (st.check) shownIds.push(st.check); } for (const sc of (Array.isArray(m0.chapter) ? m0.chapter : []) as { instance?: string }[]) if (sc.instance) shownIds.push(sc.instance);
    // excluded by exposure key AND by this package's own number signatures (same bag, table or numbers under other labels) and answers
    for (const id of shownIds) { used.add(exposureKey(id)); const pr = problemOf(id.replace(/:(mc|w)$/, "")); if (pr && pr.family === pk.family) { try { for (const k of [...(pk.answerDistinct ? [`answer:${pr.answer}`] : []), ...(pk.signature?.(pr) ?? [])]) used.add(k); } catch { /* not a signature-bearing item */ } } } }
  const gaps: string[] = [];
  const sig = (id: string) => [exposureKey(id), ...(pk.answerDistinct ? [`answer:${P(id).answer}`] : []), ...(pk.signature?.(P(id)) ?? [])];
  const take = (id: string) => { for (const k of sig(id)) used.add(k); return id; };
  const free = (id: string) => sig(id).every((k) => !used.has(k)) && selectable(id) && isQuestion(id);
  const promptNums = (p: Problem) => new Set([...p.prompt.replace(/−/g, "-").matchAll(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)].map((m) => { const Q = toQ(m[0]); return Q ? qs(Q) : m[0]; }));
  const fits = (id: string) => pk.applies(P(id));
  const targetBugs = (p: Problem) => (p.bugs ?? []).filter((b) => pk.targets.some((t) => t.bug === b.id) && b.predict !== null);
  const discriminating = (p: Problem) => { const vals = (p.bugs ?? []).filter((b) => b.predict !== null).flatMap((b) => typedForm(b.predict).map((v) => toQ(v) ? qs(toQ(v)!) : v)); const ans = toQ(p.answer) ? qs(toQ(p.answer)!) : p.answer; const inPrompt = promptNums(p); const tv = targetBugs(p).filter((b) => !(pk.inherentInPrompt ?? []).includes(b.id)).flatMap((b) => typedForm(b.predict).map((v) => toQ(v) ? qs(toQ(v)!) : v)); return new Set(vals).size === vals.length && !vals.includes(ans) && targetBugs(p).length > 0 && tv.every((v) => !inPrompt.has(v)) && (pk.exampleOk?.(p) ?? true); };
  const nice = (x: string) => (def.difficulty?.(P(x).params) ?? 2) <= 2 && (pk.exampleOk?.(P(x)) ?? true);
  const prefer = (l: string[]) => [...l.filter(nice), ...l.filter((x) => !nice(x))];
  const list = (phase: "diagnostic" | "practice" | "check" | "retention") => phasePool(pk.family, phase).filter((id) => fits(id));

  // diagnostics: one per case, discriminating
  const distinct = (p: Problem) => { const vals = (p.bugs ?? []).filter((b) => b.predict !== null).flatMap((b) => typedForm(b.predict).map((v) => toQ(v) ? qs(toQ(v)!) : v)); const ans = toQ(p.answer) ? qs(toQ(p.answer)!) : p.answer; return new Set(vals).size === vals.length && !vals.includes(ans); };
  const diagnostics = pk.diagnosticCases.map((c) => { const id = (c.contrast ? phasePool(pk.family, "diagnostic") : list("diagnostic")).filter(typed).find((x) => free(x) && c.pick(P(x)) && (c.contrast ? distinct(P(x)) : discriminating(P(x)))); if (!id) { const alt = (c.contrast ? [...phasePool(pk.family, "check"), ...phasePool(pk.family, "practice")] : list("check")).filter(typed).find((x) => free(x) && c.pick(P(x)) && (c.contrast ? distinct(P(x)) : discriminating(P(x)))); if (alt) { gaps.push(`diagnostic case "${c.label}": the family's diagnostic partition has no usable item (only ambiguous ones); candidate ${alt} is taken from the ${phaseOf(alt).toUpperCase()} partition and must be re-partitioned or replaced at integration`); return { case: c.label, why: c.why, id: take(alt), fromPhase: phaseOf(alt) }; } fail(pk.id, `no discriminating diagnostic for case "${c.label}"`); return null; } return { case: c.label, why: c.why, id: take(id), fromPhase: "diagnostic" }; }).filter(Boolean) as { case: string; why: string; id: string }[];
  // worked examples: one per case where possible
  const worked = pk.diagnosticCases.filter((c) => !c.contrast).slice(0, 2).map((c) => prefer(list("practice").filter(typed)).find((x) => free(x) && c.pick(P(x)))).filter((x): x is string => !!x).map(take);
  // misconception screens: one example per target bug, plus guided and check items on which that bug is still applicable
  const misconceptions = pk.targets.map((t) => {
    const has = (x: string) => P(x).bugs.some((b) => b.id === t.bug && b.predict !== null) && (pk.bugExampleOk?.[t.bug]?.(P(x)) ?? true);
    const ex = prefer(list("practice").filter(typed)).find((x) => free(x) && has(x) && discriminating(P(x)));
    if (!ex) { fail(pk.id, `no example for bug ${t.bug}`); return null; }
    take(ex);
    const p = P(ex), b = p.bugs.find((y) => y.id === t.bug)!;
    const guided = list("practice").find((x) => free(x) && has(x) && discriminating(P(x))); if (guided) take(guided);
    // the fresh check must not predict the same target wrong value as the guided item (a repeated error would repeat the same number)
    const tval = (x: string) => JSON.stringify(P(x).bugs.find((y) => y.id === t.bug)?.predict ?? null);
    const check = list("check").find((x) => free(x) && has(x) && discriminating(P(x)) && (!guided || tval(x) !== tval(guided))); if (check) take(check);
    if (!guided || !check) fail(pk.id, `bug ${t.bug}: guided ${guided ?? "none"}, check ${check ?? "none"}`);
    const wrong = pk.display?.[t.bug] ? [pk.display[t.bug](p)] : shown(b.predict, p.answer);
    const probe = probeReading(ex, t.bug, wrong[0]);
    if (probe.reading !== "predicted") gaps.push(`${t.bug}: the platform's diagnosis reader (reasoning.ts probeReading) reads the predicted wrong answer "${wrong[0]}" on ${ex} as "${probe.reading}", so this misconception can NEVER be established and fix_${t.bug.replace(/-/g, "_")} can never be triggered until the reader handles this answer type (Codex)`);
    return { bug: t.bug, kind: b.kind, platformCanDiagnose: probe.reading === "predicted", platformReading: probe.reading, status: "modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers)", note: t.note, example: ex, screens: { whatWentWrong: [`In "${p.prompt}", one wrong answer is ${wrong.join(" or ")}.`, pk.says?.[t.bug]?.(p.prompt) ?? b.says, pk.fixes[t.bug]?.fix ?? "(no authored fix: general teaching)", `Not ${wrong.join(" or ")}, but ${p.answer}.`], counterCheck: pk.fixes[t.bug]?.counter(p.prompt, figOf(p)) ?? null, solvedCorrectly: pk.oracle(p.prompt, figOf(p)).lines }, guided: guided ?? null, check: check ?? null };
  }).filter(Boolean) as { bug: string; example: string; guided: string | null; check: string | null }[];
  const pickN = (l: string[], n: number, ok: (x: string) => boolean) => { const got: string[] = []; for (const x of l) { if (got.length >= n) break; if (free(x) && ok(x)) got.push(take(x)); } return got; };
  const guided = pickN(prefer(list("practice")), 3, (x) => discriminating(P(x)));
  const perCase = (phase: "check" | "retention") => { const cs = pk.diagnosticCases.filter((c) => !c.contrast); const got: string[] = []; for (const c of cs) { const id = list(phase).find((x) => free(x) && c.pick(P(x)) && discriminating(P(x))); if (id) got.push(take(id)); else gaps.push(`${phase === "check" ? "rechecks" : "delayed checks"}: no usable ${phase} item for case "${c.label}" (another case's item stands in)`); } while (got.length < 2) { const id = list(phase).find((x) => free(x) && discriminating(P(x))); if (!id) break; got.push(take(id)); } if (got.length < cs.length) fail(pk.id, `${phase}: only ${got.length} discriminating item(s) for ${cs.length} case(s)`); return got.slice(0, Math.max(2, cs.length)); };
  const rechecks = perCase("check");
  const transfer = def.word ? pickN(list("practice").filter(typed).filter((x) => discriminating(P(x))).map((x) => `${x}:w`), 2, () => true) : [];
  if (!def.word) fail(pk.id, "family has no word form: transfer candidates MISSING (content gap, recorded)");
  const delayed = perCase("retention");

  const roles: [string, string][] = [...diagnostics.map((d) => ["diagnostic", d.id] as [string, string]), ...worked.map((x) => ["worked-example", x] as [string, string]), ...misconceptions.flatMap((m) => [["misconception-example", m.example], ...(m.guided ? [["misconception-guided", m.guided]] : []), ...(m.check ? [["misconception-check", m.check]] : [])] as [string, string][]), ...guided.map((x) => ["guided-practice", x] as [string, string]), ...rechecks.map((x) => ["recheck", x] as [string, string]), ...transfer.map((x) => ["transfer", x] as [string, string]), ...delayed.map((x) => ["delayed-check", x] as [string, string])];
  const checks = roles.map(([r, id]) => checkItem(pk, id, r));
  // reuse audit: every pair of chosen items, and each chosen item against the module's already-shown items, must share no key
  const keyOwners = new Map<string, string[]>();
  for (const [r, id] of roles) for (const k of sig(id)) keyOwners.set(k, [...(keyOwners.get(k) ?? []), `${r} ${id}`]);
  const reuseCollisions = [...keyOwners.entries()].filter(([, v]) => v.length > 1).map(([k, v]) => `${k}: ${v.join(" / ")}`);
  if (reuseCollisions.length) fail(pk.id, `reuse collisions: ${reuseCollisions.join("; ")}`);

  // whole-pool agreement: the oracle and every alternative method against every applicable generated item
  let agree = 0, total = 0; const disagreements: string[] = [];
  for (const it of pool(pk.family).items) { if (!pk.applies(it) || !typed(it.id)) continue; total++; try { const fg = figOf(it); const o = pk.oracle(it.prompt, fg); const ok = same(o.value, it.answer) && pk.alternatives.every((a) => same(a.run(it.prompt, fg).value, it.answer)); if (ok) agree++; else disagreements.push(it.id); } catch (e) { disagreements.push(`${it.id} (${String(e).slice(0, 60)})`); } }
  if (agree !== total) fail(pk.id, `pool agreement ${agree}/${total}: ${disagreements.slice(0, 5).join(", ")}`);

  // ---- response patterns: what each combination of diagnostic answers supports (rendered on the real items, each answer graded)
  const respond = (id: string, key: string): { response: string | null; verdict: string | null } => {
    if (!id) return { response: null, verdict: null };
    const p = P(id);
    if (key === "correct") return { response: p.answer, verdict: grade(id, p.answer).verdict };
    if (key === "other") return { response: "(any other answer)", verdict: null };
    const b = p.bugs.find((x) => x.id === key.slice(4) && x.predict !== null);
    if (!b) return { response: null, verdict: null };
    const r = pk.display?.[b.id] ? pk.display[b.id](p) : shown(b.predict, p.answer)[0];
    return { response: r, verdict: grade(id, r).verdict };
  };
  const patterns = (pk.responsePatterns ?? []).map((rp) => {
    if (rp.answers.length !== diagnostics.length) fail(pk.id, `response pattern has ${rp.answers.length} answers for ${diagnostics.length} items`);
    const cells = rp.answers.map((k, i) => ({ item: diagnostics[i]?.id, key: k, ...respond(diagnostics[i]?.id, k) }));
    for (const c of cells) if (!c.item) fail(pk.id, `pattern refers to a missing diagnostic item`); else if (c.key.startsWith("bug:") && (c.response === null || c.verdict !== "incorrect")) fail(pk.id, `pattern cell ${c.key} on ${c.item}: ${c.response === null ? "not modelled on this item" : c.verdict}`);
    for (const c of cells) if (c.key === "correct" && c.verdict !== "correct") fail(pk.id, `pattern cell correct on ${c.item}: ${c.verdict}`);
    return { ...rp, cells };
  });

  // ---- integration objects in the EXISTING content shapes (Strategy, Screen, ExplanationRecord), checked by the platform's own gates
  const mod = moduleFor(pk.competency)!;
  const existing = REG.entries.filter((e) => e.competency === pk.competency && e.misconceptionSpecific);
  const familyTaught = mod.strategies.some((st) => st.screens.some((sc) => sc.instance && P(sc.instance)?.family === pk.family));
  const widget = (id: string) => { const v = pk.visual(P(id)); return (Array.isArray(v) ? v[0] : v) as Screen["widget"] | undefined; };
  const kindOf = (k: string): Strategy["kind"] => (["conceptual", "procedural", "recall", "prerequisite"].includes(k) ? k : "conceptual") as Strategy["kind"];
  const proposals: { strategy: Strategy; purpose: string; addresses: string | null; reuse?: string }[] = [];
  const reused: { bug: string; strategy: string }[] = [];
  if (!familyTaught && worked[0]) proposals.push({ purpose: "general (concept) explanation for a family that has no selectable teaching", addresses: null, strategy: {
    id: `${pk.family}_concept`, title: pk.title, kind: "conceptual", needs: [],
    screens: [
      { title: "The idea", text: pk.concept, math: pk.oracle(P(worked[0]).prompt, figOf(P(worked[0]))).lines, ...(widget(worked[0]) ? { widget: widget(worked[0]) } : {}), role: "concept", instance: worked[0] },
      ...worked.slice(1).map((id) => ({ title: "Another example", text: ["The same idea on a different question."], math: pk.oracle(P(id).prompt, figOf(P(id))).lines, role: "strategy" as const, instance: id })),
      { title: pk.alternativeExplanation.title, text: pk.alternativeExplanation.text, ...(pk.alternativeExplanation.math === "oracle" ? { math: pk.oracle(P(worked[0]).prompt, figOf(P(worked[0]))).lines } : {}), role: "strategy", instance: worked[0] },
      ...pk.alternatives.map((a) => ({ title: `Another way: ${a.name}`, text: ["The same answer by another valid method."], math: a.run(P(worked[0]).prompt, figOf(P(worked[0]))).lines, role: "strategy" as const, instance: worked[0] })),
    ], guided: guided[0] ?? "", check: rechecks[0] ?? "" } });
  for (const m of misconceptions as any[]) {
    const ex = existing.find((e) => e.addresses === m.bug);
    if (ex) { reused.push({ bug: m.bug, strategy: ex.strategy }); continue; }
    const p = P(m.example), b = p.bugs.find((x) => x.id === m.bug)!;
    const wrong = pk.display?.[m.bug] ? pk.display[m.bug](p) : shown(b.predict, p.answer)[0];
    const u = pk.unit ?? "";
    const ftitle = pk.fixes[m.bug]?.title ?? m.bug;
    proposals.push({ purpose: `misconception-specific: ${m.bug}`, addresses: m.bug, strategy: {
      id: `fix_${m.bug.replace(/-/g, "_")}`, title: ftitle, kind: kindOf(b.kind), needs: [],
      screens: [
        { title: `${ftitle}: what went wrong`, text: [pk.says?.[m.bug]?.(p.prompt) ?? b.says, pk.fixes[m.bug]?.fix ?? ""].filter(Boolean), math: [`Not ${wrong}${u}, but ${p.answer}${u}`, ...(pk.fixes[m.bug] ? [pk.fixes[m.bug].counter(p.prompt, figOf(p))] : [])], role: "misconception", instance: m.example },
        { title: `${ftitle}: solved correctly`, text: ["Each step, then the answer."], math: pk.oracle(p.prompt, figOf(p)).lines, role: "strategy", instance: m.example },
      ], guided: m.guided ?? "", check: m.check ?? "" } });
  }
  const mod2: Module = { ...mod, strategies: [...mod.strategies, ...proposals.map((x) => x.strategy)] };
  const records: ExplanationRecord[] = proposals.map(({ strategy: st }) => ({ id: explanationId(pk.competency, st.id), subject: "mathematics", competency: pk.competency, strategy: st.id, intervention: st.kind, misconceptionSpecific: isMisconceptionSpecific(st), addresses: addressedMisconception(st),
    revisions: [{ contentHash: contentHash(pk.competency, st), status: "pending_review", provenance: { source: "engineering", by: "docs/math-teaching-content (review candidate)", at: "2026-11-02T00:00:00.000Z", note: "proposed, not registered; not educator-reviewed" }, reviewerRole: "none", knownIssues: [], scope: ["demonstration"] }] }));
  const reg2: ExplanationRegistry = { ...REG, entries: [...REG.entries, ...records] };
  const regProblems = validateRegistry(reg2, [mod2]).filter((x) => records.some((r) => x.startsWith(r.id)));
  const gates = proposals.map(({ strategy: st, addresses }) => {
    const te = teachingEligibility(mod2, st);
    // the same contract rules applied with this family as the lesson's scope (what the check WOULD say if the selector's teaching scope
    // accepted the family): lessonBlocks is the function teachingEligibility uses
    const scoped: Module = { ...mod2, pool: { family: pk.family, version: "1.0.0" } as Module["pool"], pools: [{ family: pk.family, version: "1.0.0" }, ...(mod2.pools ?? []).filter((x) => x.family !== pk.family)] as Module["pools"] };
    const blocks = lessonBlocks({ ...scoped, strategies: [st] }).slice(1).filter((b) => st.screens.some((sc) => sc.title === b.title));
    const familyScoped = { checked: blocks.length > 0, sections: blocks.length, of: st.screens.length, violations: [...new Set(blocks.flatMap((b) => b.violations.map((v) => `${b.title}: ${v}`)))] };
    const none = contentEligibility(mod2, st, { competency: pk.competency, mode: "demonstration", usage: "intervention", misconceptionEvidence: [] }, reg2);
    const own = contentEligibility(mod2, st, { competency: pk.competency, mode: "demonstration", usage: "intervention", misconceptionEvidence: addresses ? [addresses] : [] }, reg2);
    const readAddress = addressedMisconception(st);
    if (addresses && readAddress !== addresses) gaps.push(`${st.id}: the platform reads the addressed misconception from the family's verbatim 'says' text; it reads ${readAddress ?? "nothing"} here (the package overrides a defective family sentence), so the registry cannot record 'addresses: ${addresses}' until the family text is fixed (05)`);
    return { strategy: st.id, teachingContract: te, familyScopedContract: familyScoped, withoutEvidence: { eligible: none.eligible, failed: none.failed }, withEvidence: { eligible: own.eligible, failed: own.failed }, addressesReadByPlatform: readAddress };
  });
  const spec = {
    skill: pk.skill, competency: pk.competency, generator: { family: pk.family, restriction: pk.restriction },
    existingMisconceptionExplanations: existing.map((e) => ({ strategy: e.strategy, addresses: e.addresses })),
    triggers: [
      ...proposals.filter((x) => !x.addresses).map((x) => ({ strategy: x.strategy.id, when: "general need: repeated difficulty, hint dependence or no established misconception (misconception-evidence@1 general-need / repeated-difficulty), or the lesson page" })),
      ...proposals.filter((x) => x.addresses).map((x) => { const mm = (misconceptions as any[]).find((y) => y.bug === x.addresses); return { strategy: x.strategy.id, when: `verified-misconception '${x.addresses}' (two matching answers, misconception-evidence@1)${pk.responsePatterns?.length ? " AND a response pattern below with establishes = true; patterns with competing explanations must not establish it" : ""}${pk.triggerCondition?.[x.addresses!] ? ` AND ${pk.triggerCondition[x.addresses!]}` : ""}`, reachable: mm?.platformCanDiagnose !== false, ...(mm?.platformCanDiagnose === false ? { blockedBy: `the diagnosis reader reads this wrong answer as "${mm.platformReading}": unreachable until fixed (05)` } : {}) }; }),
      ...reused.map((r) => ({ strategy: r.strategy, when: `already exists for '${r.bug}': reuse, do not add` })),
      ...(pk.reuses ?? []).map((r) => ({ strategy: r.strategy, when: `existing explanation reused: ${r.covers}` })),
    ],
    allowedMethods: [{ name: "the oracle's method (worked lines)", valid: true }, ...pk.alternatives.map((a) => ({ name: a.name, valid: a.valid }))],
    freshCheckSelection: { family: pk.family, partition: "check", restriction: pk.restriction, require: "a target error still possible on the item and its wrong value distinct from the answer and from numbers printed in the question", exclude: "the exposure keys and number signatures of every item already shown in this teaching", candidates: rechecks },
    retentionTarget: { competency: pk.competency, family: pk.family, partition: "retention", cases: pk.diagnosticCases.filter((c) => !c.contrast).map((c) => c.label), candidates: delayed },
    evidence: { answer: "grading-decision@1 correctness from the trusted server grader (every item here is gradable)", method: pk.workingChecker.startsWith("none") ? "none: no method evidence can be recorded; a correct answer never implies the method" : pk.workingChecker },
    ungradable: (pk.authoredTransfer ?? []).map((t) => ({ text: t.text, why: "text only: no generator form, not gradable by the trusted grader" })),
  };

  // ---- binomial: which delayed items genuinely test the cross term
  const delayedAudit = pk.family === "ahid" ? phasePool("ahid", "retention").map((id) => { const p = P(id); const [form, pp, qq, ask] = p.params; const nd = p.bugs.find((b) => b.id === "middle-not-doubled"); return { id, form: ["(px + q)²", "(px − q)²", "(px + q)(px − q)"][form], asks: ["x² coefficient", "x coefficient (cross term)", "constant"][ask], testsCrossTerm: ask === 1 && form !== 2, notDoubledDistinct: !!nd && nd.predict !== null && String(nd.predict) !== p.answer, copiedNumberRisk: ask === 1 && !(pk.exampleOk?.(p) ?? true) }; }) : null;
  if (delayedAudit) { const plus = delayedAudit.filter((d) => d.testsCrossTerm && d.form === "(px + q)²"); gaps.push(`binomial delayed checks: ${delayedAudit.filter((d) => d.testsCrossTerm).length} of ${delayedAudit.length} retention items ask the cross term; ${plus.length} of them are (px + q)² and ${plus.filter((d) => !d.copiedNumberRisk).length} of those avoid a copied-number reading. The positive-square delayed check is ${plus.some((d) => !d.copiedNumberRisk) ? "available" : "MISSING: the retention partition has no unambiguous (px + q)² cross-term item, so the delayed check of the title skill is not covered (generator partition change: Codex)"}.`); }

  const comp = graph.get(pk.competency);
  const pkg = {
    schema: "teaching-package@0", status: "review-candidate (not approved, not registered, not served)", id: pk.id, batch: pk.batch, pattern: pk.pattern ?? null, title: pk.title,
    competency: pk.competency, competencyName: comp.name, grades: comp.gradeRange, strand: pk.strand, family: pk.family, familyTitle: def.title, skill: pk.skill,
    prerequisites: { graph: (relations().get(pk.competency) ?? []).map((r) => ({ from: r.from, type: r.type })), knowledge: pk.prerequisites.knowledge, note: pk.prerequisites.graphNote ?? null },
    explanation: { concept: pk.concept, visual: worked[0] ? pk.visual(P(worked[0])) : null, visualNote: pk.visualNote },
    workedExamples: worked.map((id) => ({ id, prompt: P(id).prompt, lines: pk.oracle(P(id).prompt, figOf(P(id))).lines, familyExplainSteps: pk.quoteFamilySteps === false ? null : P(id).steps.map((s) => (def.explain(s))), answer: P(id).answer })),
    hints: worked.map((id) => ({ for: id, hints: pk.hints(P(id).prompt) })),
    alternativeExplanation: { ...pk.alternativeExplanation, visual: pk.alternativeExplanation.visual && worked[0] ? pk.alternativeExplanation.visual(P(worked[0])) : null },
    alternativeMethods: pk.alternatives.map((a) => ({ name: a.name, valid: a.valid, example: worked[0] ? a.run(P(worked[0]).prompt, figOf(P(worked[0]))).lines : [] })),
    methodCredit: `A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: ${pk.workingChecker}.`,
    diagnosticRule: pk.diagnosticRule ?? "A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.",
    diagnostic: diagnostics.map((d) => ({ ...d, prompt: P(d.id).prompt, answer: P(d.id).answer, readings: [{ response: P(d.id).answer, reading: "correct" }, ...P(d.id).bugs.filter((b) => b.predict !== null).map((b) => ({ response: (pk.display?.[b.id] ? [pk.display[b.id](P(d.id))] : shown(b.predict, P(d.id).answer)).join(" | "), reading: `${pk.targets.some((t) => t.bug === b.id) ? "TARGET" : "other"} modelled error ${b.id} (${b.kind}): suspected on one answer${pk.triggerCondition?.[b.id] ? ` (competing explanation: see the trigger condition; answers alone may not establish it)` : ""}` })), { response: "anything else", reading: "unexplained (no diagnosis; policy A: a single slip is kept, not acted on)" }] })),
    misconceptions,
    authoredTransfer: (pk.authoredTransfer ?? []).map((t) => { const r = t.check(); if (r.expected !== r.computed) fail(pk.id, `authored transfer: ${r.expected} ≠ ${r.computed}`); return { text: t.text, answer: r.expected, arithmeticChecked: r.expected === r.computed, graderVerified: false }; }),
    practice: { guided, rechecks, transfer, delayedChecks: delayed, note: "all drawn from the family's own phase pools (quarantine-filtered), distinct exposure keys, never the worked or diagnostic items; rechecks and delayed checks are items on which a target error is still possible" },
    responsePatterns: patterns,
    delayedAudit,
    integration: {
      spec,
      strategies: proposals.map((x) => ({ purpose: x.purpose, strategy: x.strategy })),
      registryRecords: records,
      reusedExisting: [...reused.map((r) => ({ strategy: r.strategy, covers: r.bug })), ...(pk.reuses ?? [])],
      familyAlreadyTaughtByModule: familyTaught,
      platformChecks: { gates, registryProblems: regProblems },
      target: "append `strategies[].strategy` to the served module's strategies (content.ts modules; library.ts for synthesised modules, content/learning/modules.v1.json for authored) and `registryRecords` to content/learning/explanation-review.v1.json, recomputing contentHash on the integrated revision. NOT written here (Codex owns integration).",
    },
    sources: pk.sources, uncertainties: [...pk.uncertainties, ...gaps],
    validation: { items: checks.length, itemsOk: checks.filter((c) => c.ok).length, poolAgreement: `${agree}/${total}`, disagreements: disagreements.slice(0, 10), checks },
  };
  writeFileSync(`${out}/${pk.id}.json`, JSON.stringify(pkg, null, 1) + "\n");
  writeFileSync(`${out}/${pk.id}.md`, md(pkg));
  built.set(pk.id, pkg);
  report.push({ id: pk.id, batch: pk.batch, reuseCollisions, scopedViolations: gates.flatMap((g) => g.familyScopedContract.violations), scopedUnchecked: gates.filter((g) => g.familyScopedContract.sections < g.familyScopedContract.of).map((g) => `${g.strategy} ${g.familyScopedContract.sections}/${g.familyScopedContract.of}`), undiagnosable: (misconceptions as any[]).filter((m) => !m.platformCanDiagnose).map((m) => m.bug), notChecked: gates.filter((g) => !g.teachingContract.checked).map((g) => g.strategy), pattern: pk.pattern ?? null, newStrategies: proposals.length, reused: reused.length, contractViolations: gates.flatMap((g) => g.teachingContract.violations), gatesNoEvidenceEligible: gates.filter((g) => g.withoutEvidence.eligible).map((g) => g.strategy), gatesWithEvidenceEligible: gates.filter((g) => g.withEvidence.eligible).map((g) => g.strategy), registryProblems: regProblems.length, family: pk.family, competency: pk.competency, items: checks.length, itemsOk: checks.filter((c) => c.ok).length, poolAgreement: `${agree}/${total}`, transfer: transfer.length, diagnostics: diagnostics.length, misconceptionScreens: misconceptions.length });
}
// ---- pattern packages (batch 2): the shared strategy, its reuse map and the cross-family contrast diagnostic
const patOut: any[] = [];
for (const pat of PATTERNS) {
  const items = pat.crossDiagnostic.map((c) => { const b = built.get(c.pkg); const d = b?.diagnostic.find((x: any) => x.case === c.case); if (!d) failures.push(`${pat.id}: no diagnostic item for ${c.pkg} / ${c.case}`); return { pkg: c.pkg, case: c.case, id: d?.id as string }; });
  const rows = pat.responsePatterns.map((rp) => ({ ...rp, cells: rp.answers.map((k, i) => { const id = items[i]?.id; if (!id) return { item: null, key: k, response: null, verdict: null }; const p = P(id); if (k === "correct") return { item: id, key: k, response: p.answer, verdict: grade(id, p.answer).verdict }; const b = p.bugs.find((x) => x.id === k.slice(4) && x.predict !== null); if (!b) { failures.push(`${pat.id}: ${k} not modelled on ${id}`); return { item: id, key: k, response: null, verdict: null }; } const r = shown(b.predict, p.answer)[0]; const v = grade(id, r).verdict; if (v !== "incorrect") failures.push(`${pat.id}: ${k} on ${id} graded ${v}`); return { item: id, key: k, response: r, verdict: v }; }) }));
  const o = { ...pat, crossDiagnostic: items, responsePatterns: rows, members: pat.members.map((m) => ({ id: m, title: built.get(m)?.title, family: built.get(m)?.family, competency: built.get(m)?.competency })) };
  patOut.push(o);
  writeFileSync(`${root}/batch-2/${pat.id}.json`, JSON.stringify(o, null, 1) + "\n");
  writeFileSync(`${root}/batch-2/${pat.id}.md`, patMd(o));
}
for (const b of ["batch-1", "batch-2"]) writeFileSync(`${root}/${b}/validation.json`, JSON.stringify({ checks: "server grader (answer correct; every modelled wrong answer incorrect) + prompt/figure oracle + every alternative method + quarantine + whole-pool oracle agreement + response patterns graded + proposed strategies through teachingEligibility, contentEligibility (in-memory registry) and validateRegistry", packages: report.filter((r: any) => r.batch === b), failures: failures.filter((f) => ALL.some((x) => x.batch === b && f.startsWith(x.id)) || (b === "batch-2" && f.startsWith("PAT-"))) }, null, 1) + "\n");
if (false) writeFileSync(`${root}/validation.json`, JSON.stringify({ checks: "server grader (answer correct; every modelled wrong answer incorrect) + prompt-text oracle + every alternative method + quarantine + whole-pool oracle agreement", packages: report, failures }, null, 1) + "\n");
console.log(JSON.stringify(report)); console.log(failures.length ? `FAILURES:\n${failures.join("\n")}` : "no failures");
process.exit(0);

function patMd(o: any): string {
  const L = [`# ${o.id}: ${o.title}`, "", `**Status:** review candidate (not approved, not registered, not served). Strands: ${o.strands.join(", ")}.`, "", `**Why this pattern.** ${o.whyThisPattern}`, "", "## The one shared strategy", "", ...o.concept, "", `Alternative: **${o.alternative.title}** — ${o.alternative.text.join(" ")}`, "", "## Existing material reused (not rewritten)", "", "| Competency | Existing explanation | Covers |", "|---|---|---|", ...o.reuses.map((r: any) => `| \`${r.competency}\` | \`${r.strategy}\` | ${r.covers} |`), "", "## Member packages (family-specific parts only)", "", ...o.members.map((m: any) => `- [${m.id}](${m.id}.md): ${m.title} (\`${m.family}\`, \`${m.competency}\`)`), ""];
  if (o.crossDiagnostic.length) { L.push("## Cross-family contrast diagnostic", "", ...o.crossDiagnostic.map((c: any, i: number) => `${i + 1}. \`${c.id}\` (${c.pkg}, ${c.case}): ${c.id ? P(c.id).prompt : "MISSING"}`), "", "| Answers | Supports | Leaves uncertain | Establishes? |", "|---|---|---|---|"); for (const r of o.responsePatterns) L.push(`| ${r.cells.map((c: any) => `${c.response ?? "?"} (${c.key})`).join("; ")} | ${r.supports} | ${r.uncertain} | ${r.establishes ? "yes" : "**no**"} |`); }
  return L.join("\n") + "\n";
}
function md(p: any): string {
  const L: string[] = [`# ${p.id}: ${p.title}`, "", `**Status:** ${p.status}. Competency \`${p.competency}\` (${p.competencyName}, grade${p.grades[0] === p.grades[1] ? ` ${p.grades[0]}` : `s ${p.grades.join("–")}`}), family \`${p.family}\` (${p.familyTitle}).`, "", `**Skill.** ${p.skill}`, "", "## Prerequisites", "", ...p.prerequisites.knowledge.map((k: string) => `- ${k}`), `- Graph: ${p.prerequisites.graph.map((r: any) => `${r.from} (${r.type})`).join(", ") || "none recorded"}`, ...(p.prerequisites.note ? [`- ${p.prerequisites.note}`] : []), "", "## Explanation", "", ...p.explanation.concept, "", `Visual: \`${JSON.stringify(p.explanation.visual)}\`. ${p.explanation.visualNote}`, "", "## Worked examples (instances from the generator; lines from the independent oracle; checked)", ""];
  for (const w of p.workedExamples) L.push(`**\`${w.id}\`** — ${w.prompt}`, "", ...w.lines.map((l: string) => `1. ${l}`), "", `Answer **${w.answer}**.${w.familyExplainSteps ? ` (The family's own step text: ${w.familyExplainSteps.join("; ")}.)` : " (The family's own step text is not quoted: it has a recorded defect.)"}`, "");
  L.push("## Hints (graded, per worked example)", "", ...p.hints.flatMap((h: any) => [`For \`${h.for}\`:`, "", ...h.hints.map((x: string, i: number) => `${i + 1}. ${x}`), ""]), `## Alternative explanation: ${p.alternativeExplanation.title}`, "", ...p.alternativeExplanation.text, "", "## Valid alternative methods (each checked to reach the same answer on every applicable generated item)", "");
  for (const a of p.alternativeMethods) L.push(`- **${a.name}**: ${a.example.join(" → ")}`);
  L.push("", `**Method credit.** ${p.methodCredit}`, "", "## Diagnostic (distinguishes the difficulties)", "", `Interpretation rule: ${p.diagnosticRule}`, "", "| Item | Case | Correct | Readings of other answers |", "|---|---|---|---|");
  for (const d of p.diagnostic) L.push(`| \`${d.id}\`: ${d.prompt} | ${d.case} — ${d.why} | ${d.answer} | ${d.readings.slice(1).map((r: any) => `${r.response} → ${r.reading}`).join("; ")} |`);
  if (p.responsePatterns?.length) { L.push("", "### What each response pattern supports", "", "| Answers on the diagnostic items (in order) | Supports | Leaves uncertain | Establishes? |", "|---|---|---|---|"); for (const r of p.responsePatterns) L.push(`| ${r.cells.map((c: any) => `${c.response} (${c.key})`).join("; ")} | ${r.supports} | ${r.uncertain} | ${r.establishes ? "yes" : "**no**"} |`); }
  L.push("", "## Misconception-specific teaching (only after the misconception is ESTABLISHED)", "");
  for (const m of p.misconceptions) L.push(`### \`${m.bug}\` (${m.kind}) — ${m.note}`, "", `Status: ${m.status}.`, "", ...m.screens.whatWentWrong.map((x: string) => `> ${x}`), "", `${m.screens.counterCheck}`, "", "Solved correctly:", "", ...m.screens.solvedCorrectly.map((x: string) => `1. ${x}`), "", `Example \`${m.example}\`; guided \`${m.guided}\`; fresh check \`${m.check}\`.`, "");
  L.push("## Practice, transfer and delayed checks (fresh; same skill)", "", `- Guided practice: ${p.practice.guided.map((x: string) => `\`${x}\``).join(", ")}`, `- Rechecks after teaching: ${p.practice.rechecks.map((x: string) => `\`${x}\``).join(", ")}`, `- Transfer (everyday form): ${p.practice.transfer.map((x: string) => `\`${x}\``).join(", ") || "**none: the family has no word form (content gap)**"}`, ...p.authoredTransfer.map((t: any) => `  - authored candidate (text only, arithmetic checked, NOT grader-verified): ${t.text} → ${t.answer}`), `- Delayed checks: ${p.practice.delayedChecks.map((x: string) => `\`${x}\``).join(", ")}`, "", "## Integration specification (for the shared teaching selector; nothing written)", "", `- **Skill:** ${p.integration.spec.skill}`, `- **Generator:** \`${p.integration.spec.generator.family}\` — ${p.integration.spec.generator.restriction}`, ...p.integration.spec.triggers.map((t: any) => `- **Trigger** \`${t.strategy}\`: ${t.when}${t.reachable === false ? ` — **UNREACHABLE today**: ${t.blockedBy}` : ""}`), `- **Allowed methods:** ${p.integration.spec.allowedMethods.map((m: any) => m.name).join("; ")}`, `- **Fresh check:** partition \`${p.integration.spec.freshCheckSelection.partition}\`; ${p.integration.spec.freshCheckSelection.require}; exclude ${p.integration.spec.freshCheckSelection.exclude}. Candidates: ${p.integration.spec.freshCheckSelection.candidates.map((x: string) => `\`${x}\``).join(", ")}`, `- **Retention target:** ${p.integration.spec.retentionTarget.competency} / \`${p.integration.spec.retentionTarget.family}\`, cases: ${p.integration.spec.retentionTarget.cases.join("; ")}. Candidates: ${p.integration.spec.retentionTarget.candidates.map((x: string) => `\`${x}\``).join(", ")}`, `- **Answer evidence:** ${p.integration.spec.evidence.answer}`, `- **Method evidence:** ${p.integration.spec.evidence.method}`, `- **Ungradable / text-only:** ${p.integration.spec.ungradable.length ? p.integration.spec.ungradable.map((u: any) => `"${u.text}" (${u.why})`).join("; ") : "none"}`, `- **Reused existing explanations:** ${p.integration.reusedExisting.length ? p.integration.reusedExisting.map((r: any) => `\`${r.strategy}\` (${r.covers})`).join("; ") : "none"}`, "", "Platform checks of the proposed objects (in memory):", "", "| Strategy | teaching contract (as integrated today) | contract with this family as the lesson scope | eligible without evidence | eligible with the misconception established | addresses (read by platform) |", "|---|---|---|---|---|---|", ...p.integration.platformChecks.gates.map((g: any) => `| \`${g.strategy}\` | ${g.teachingContract.eligible ? "pass" : !g.teachingContract.checked ? "**not checked**: outside the module's teaching scope (ineligible today)" : `violations: ${g.teachingContract.violations.join("; ")}`} | ${g.familyScopedContract.violations.length ? `violations: ${g.familyScopedContract.violations.join("; ")}` : `${g.familyScopedContract.sections}/${g.familyScopedContract.of} sections checked, no violations`} | ${g.withoutEvidence.eligible ? "yes" : `no (${g.withoutEvidence.failed.join(", ")})`} | ${g.withEvidence.eligible ? "yes" : `no (${g.withEvidence.failed.join(", ")})`} | ${g.addressesReadByPlatform ?? "—"} |`), "", `Registry validation problems for the new records: ${p.integration.platformChecks.registryProblems.length ? p.integration.platformChecks.registryProblems.join("; ") : "none"}.`, "", "The objects themselves (existing `Strategy` / `ExplanationRecord` shapes) are in the package JSON (`integration.strategies`, `integration.registryRecords`).", "", ...(p.delayedAudit ? ["## Delayed-check audit (cross term)", "", "| Retention item | Form | Asks | Tests the cross term | not-doubled distinct | copied-number risk |", "|---|---|---|---|---|---|", ...p.delayedAudit.map((d: any) => `| \`${d.id}\` | ${d.form} | ${d.asks} | ${d.testsCrossTerm ? "yes" : "no"} | ${d.notDoubledDistinct ? "yes" : "no"} | ${d.copiedNumberRisk ? "yes" : "no"} |`), ""] : []), "## Sources", "", ...p.sources.map((s: string) => `- ${s}`), "", "## Uncertainties", "", ...p.uncertainties.map((s: string) => `- ${s}`), "", `## Validation: ${p.validation.itemsOk}/${p.validation.items} items pass; whole-pool oracle + alternatives agreement ${p.validation.poolAgreement}`, "");
  return L.join("\n");
}
