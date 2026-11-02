/**
 * Builds and CHECKS batch-1 teaching packages from packages.mts. Read-only against the runtime (no registry, module or content file
 * is written); output goes to docs/math-teaching-content/batch-1/.
 *   cd frontend && node --import tsx ../docs/math-teaching-content/tools/build.mts ../docs/math-teaching-content
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { FAMILIES, exposureKey, phasePool, pool, problemOf, type Problem } from "../../../packages/learning/src/families.ts";
import { selectable } from "../../../packages/learning/src/question-status.ts";
import { isQuestion, question } from "../../../packages/learning/src/content.ts";
import { gradeRequest } from "../../../packages/learning/src/server-grader.ts";
import { graph, relations } from "../../../packages/learning/src/graph.ts";
import { PACKAGES, dec, q, qeq, qs, type Package, type Q } from "./packages.mts";

const out = `${process.argv[2]}/batch-1`;
mkdirSync(out, { recursive: true });
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
  try { const o = pk.oracle(P(typedId).prompt); oracle = { ok: same(o.value, p.answer), lines: o.lines }; } catch (e) { oracle = { ok: false, lines: [], error: String(e) }; }
  const alts = pk.alternatives.map((a) => { try { const r = a.run(P(typedId).prompt); return { name: a.name, ok: same(r.value, p.answer), lines: r.lines }; } catch (e) { return { name: a.name, ok: false, lines: [String(e)] }; } });
  const forms = (b: { id: string; predict: unknown }) => [...typedForm(b.predict), ...(pk.display?.[b.id] && !mc ? [pk.display[b.id](p)] : [])];
  const bugs = (p.bugs ?? []).filter((b) => b.predict !== null && b.predict !== undefined).map((b) => ({ id: b.id, kind: b.kind, predicts: forms(b), graded: forms(b).map((r) => { const l = letter(r); return l === null ? "not-an-option" : grade(id, l).verdict; }) }));
  const wordSameAnswer = id.endsWith(":w") ? P(typedId).answer === p.answer : null;
  const ok = g.verdict === "correct" && oracle.ok && alts.every((a) => a.ok) && bugs.every((b) => b.graded.every((v) => v === "incorrect" || v === "not-an-option")) && mcConsistent && wordSameAnswer !== false && selectable(id) && p.family === pk.family;
  if (!ok) fail(pk.id, `${role} ${id}: grader ${g.verdict}, oracle ${oracle.ok}${oracle.error ? ` (${oracle.error})` : ""}, alternatives ${alts.map((a) => a.ok).join("/")}, bugs ${JSON.stringify(bugs.map((b) => b.graded))}, selectable ${selectable(id)}`);
  return { id, role, prompt: mc ? (question(id) as unknown as { prompt: string }).prompt : p.prompt, answer: p.answer, ...(mc ? { options: mc.options, correctOption: mc.answer } : {}), grader: g, oracle, alternatives: alts, bugs, ok };
}

const report: Record<string, unknown>[] = [];
for (const pk of PACKAGES) {
  const def = FAMILIES.get(pk.family)!;
  const used = new Set<string>();
  const gaps: string[] = [];
  const sig = (id: string) => [exposureKey(id), ...(pk.signature?.(P(id)) ?? [])];
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
  const diagnostics = pk.diagnosticCases.map((c) => { const id = (c.contrast ? phasePool(pk.family, "diagnostic") : list("diagnostic")).filter(typed).find((x) => free(x) && c.pick(P(x)) && (c.contrast ? distinct(P(x)) : discriminating(P(x)))); if (!id) { const alt = list("check").filter(typed).find((x) => free(x) && c.pick(P(x)) && discriminating(P(x))); if (alt) { gaps.push(`diagnostic case "${c.label}": the family's diagnostic partition has no usable item (only ambiguous ones); candidate ${alt} is taken from the CHECK partition and must be re-partitioned or replaced at integration`); return { case: c.label, why: c.why, id: take(alt), fromPhase: "check" }; } fail(pk.id, `no discriminating diagnostic for case "${c.label}"`); return null; } return { case: c.label, why: c.why, id: take(id), fromPhase: "diagnostic" }; }).filter(Boolean) as { case: string; why: string; id: string }[];
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
    const check = list("check").find((x) => free(x) && has(x) && discriminating(P(x))); if (check) take(check);
    if (!guided || !check) fail(pk.id, `bug ${t.bug}: guided ${guided ?? "none"}, check ${check ?? "none"}`);
    const wrong = pk.display?.[t.bug] ? [pk.display[t.bug](p)] : shown(b.predict, p.answer);
    return { bug: t.bug, kind: b.kind, status: "modelled (a single matching answer is a SUSPECTED error; established only under misconception-evidence@1: two matching answers)", note: t.note, example: ex, screens: { whatWentWrong: [`In "${p.prompt}", one wrong answer is ${wrong.join(" or ")}.`, pk.says?.[t.bug]?.(p.prompt) ?? b.says, pk.fixes[t.bug]?.fix ?? "(no authored fix: general teaching)", `Not ${wrong.join(" or ")}, but ${p.answer}.`], counterCheck: pk.fixes[t.bug]?.counter(p.prompt) ?? null, solvedCorrectly: pk.oracle(p.prompt).lines }, guided: guided ?? null, check: check ?? null };
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

  // whole-pool agreement: the oracle and every alternative method against every applicable generated item
  let agree = 0, total = 0; const disagreements: string[] = [];
  for (const it of pool(pk.family).items) { if (!pk.applies(it) || !typed(it.id)) continue; total++; try { const o = pk.oracle(it.prompt); const ok = same(o.value, it.answer) && pk.alternatives.every((a) => same(a.run(it.prompt).value, it.answer)); if (ok) agree++; else disagreements.push(it.id); } catch (e) { disagreements.push(`${it.id} (${String(e).slice(0, 60)})`); } }
  if (agree !== total) fail(pk.id, `pool agreement ${agree}/${total}: ${disagreements.slice(0, 5).join(", ")}`);

  const comp = graph.get(pk.competency);
  const pkg = {
    schema: "teaching-package@0", status: "review-candidate (not approved, not registered, not served)", id: pk.id, title: pk.title,
    competency: pk.competency, competencyName: comp.name, grades: comp.gradeRange, strand: pk.strand, family: pk.family, familyTitle: def.title, skill: pk.skill,
    prerequisites: { graph: (relations().get(pk.competency) ?? []).map((r) => ({ from: r.from, type: r.type })), knowledge: pk.prerequisites.knowledge, note: pk.prerequisites.graphNote ?? null },
    explanation: { concept: pk.concept, visual: worked[0] ? pk.visual(P(worked[0])) : null, visualNote: pk.visualNote },
    workedExamples: worked.map((id) => ({ id, prompt: P(id).prompt, lines: pk.oracle(P(id).prompt).lines, familyExplainSteps: pk.quoteFamilySteps === false ? null : P(id).steps.map((s) => (def.explain(s))), answer: P(id).answer })),
    hints: worked.map((id) => ({ for: id, hints: pk.hints(P(id).prompt) })),
    alternativeExplanation: { ...pk.alternativeExplanation, visual: pk.alternativeExplanation.visual && worked[0] ? pk.alternativeExplanation.visual(P(worked[0])) : null },
    alternativeMethods: pk.alternatives.map((a) => ({ name: a.name, valid: a.valid, example: worked[0] ? a.run(P(worked[0]).prompt).lines : [] })),
    methodCredit: `A correct final answer earns ANSWER credit only. Method credit needs a server-recorded verified working assessment. Checker status: ${pk.workingChecker}.`,
    diagnosticRule: pk.diagnosticRule ?? "A single matching answer is a SUSPECTED error. misconception-evidence@1 establishes a misconception from two matching answers.",
    diagnostic: diagnostics.map((d) => ({ ...d, prompt: P(d.id).prompt, answer: P(d.id).answer, readings: [{ response: P(d.id).answer, reading: "correct" }, ...P(d.id).bugs.filter((b) => b.predict !== null).map((b) => ({ response: (pk.display?.[b.id] ? [pk.display[b.id](P(d.id))] : shown(b.predict, P(d.id).answer)).join(" | "), reading: `${pk.targets.some((t) => t.bug === b.id) ? "TARGET" : "other"} modelled error ${b.id} (${b.kind}): suspected on one answer` })), { response: "anything else", reading: "unexplained (no diagnosis; policy A: a single slip is kept, not acted on)" }] })),
    misconceptions,
    authoredTransfer: (pk.authoredTransfer ?? []).map((t) => { const r = t.check(); if (r.expected !== r.computed) fail(pk.id, `authored transfer: ${r.expected} ≠ ${r.computed}`); return { text: t.text, answer: r.expected, arithmeticChecked: r.expected === r.computed, graderVerified: false }; }),
    practice: { guided, rechecks, transfer, delayedChecks: delayed, note: "all drawn from the family's own phase pools (quarantine-filtered), distinct exposure keys, never the worked or diagnostic items; rechecks and delayed checks are items on which a target error is still possible" },
    integration: {
      strategyProposals: misconceptions.map((m) => ({ id: `fix_${(m.bug as string).replace(/-/g, "_")}`, title: pk.fixes[m.bug]?.fix.split(":")[0].slice(0, 60) ?? m.bug, kind: "conceptual|procedural (from bug kind)", needs: [], screens: [{ role: "misconception", instance: m.example }, { role: "worked-example", instance: m.example }, { role: "practice", instance: m.guided }], guided: m.guided, check: m.check })),
      registryProposal: misconceptions.map((m) => ({ competency: pk.competency, strategy: `fix_${(m.bug as string).replace(/-/g, "_")}`, misconceptionSpecific: true, addresses: m.bug, status: "pending_review", scope: ["demonstration"] })),
      generalStrategyProposal: { id: `${pk.family}_concept`, screens: ["concept + visual", "worked example(s)", "alternative explanation"], note: "for modules where this family has only a chapter screen" },
      target: "module strategies of the competency's served module (content.ts modules) + explanation-review.v1.json entries; NOT written here (Codex owns integration)",
    },
    sources: pk.sources, uncertainties: [...pk.uncertainties, ...gaps],
    validation: { items: checks.length, itemsOk: checks.filter((c) => c.ok).length, poolAgreement: `${agree}/${total}`, disagreements: disagreements.slice(0, 10), checks },
  };
  writeFileSync(`${out}/${pk.id}.json`, JSON.stringify(pkg, null, 1) + "\n");
  writeFileSync(`${out}/${pk.id}.md`, md(pkg));
  report.push({ id: pk.id, family: pk.family, competency: pk.competency, items: checks.length, itemsOk: checks.filter((c) => c.ok).length, poolAgreement: `${agree}/${total}`, transfer: transfer.length, diagnostics: diagnostics.length, misconceptionScreens: misconceptions.length });
}
writeFileSync(`${out}/validation.json`, JSON.stringify({ checks: "server grader (answer correct; every modelled wrong answer incorrect) + prompt-text oracle + every alternative method + quarantine + whole-pool oracle agreement", packages: report, failures }, null, 1) + "\n");
console.log(JSON.stringify(report)); console.log(failures.length ? `FAILURES:\n${failures.join("\n")}` : "no failures");
process.exit(0);

function md(p: any): string {
  const L: string[] = [`# ${p.id}: ${p.title}`, "", `**Status:** ${p.status}. Competency \`${p.competency}\` (${p.competencyName}, grade${p.grades[0] === p.grades[1] ? ` ${p.grades[0]}` : `s ${p.grades.join("–")}`}), family \`${p.family}\` (${p.familyTitle}).`, "", `**Skill.** ${p.skill}`, "", "## Prerequisites", "", ...p.prerequisites.knowledge.map((k: string) => `- ${k}`), `- Graph: ${p.prerequisites.graph.map((r: any) => `${r.from} (${r.type})`).join(", ") || "none recorded"}`, ...(p.prerequisites.note ? [`- ${p.prerequisites.note}`] : []), "", "## Explanation", "", ...p.explanation.concept, "", `Visual: \`${JSON.stringify(p.explanation.visual)}\`. ${p.explanation.visualNote}`, "", "## Worked examples (instances from the generator; lines from the independent oracle; checked)", ""];
  for (const w of p.workedExamples) L.push(`**\`${w.id}\`** — ${w.prompt}`, "", ...w.lines.map((l: string) => `1. ${l}`), "", `Answer **${w.answer}**.${w.familyExplainSteps ? ` (The family's own step text: ${w.familyExplainSteps.join("; ")}.)` : " (The family's own step text is not quoted: it has a recorded defect.)"}`, "");
  L.push("## Hints (graded, per worked example)", "", ...p.hints.flatMap((h: any) => [`For \`${h.for}\`:`, "", ...h.hints.map((x: string, i: number) => `${i + 1}. ${x}`), ""]), `## Alternative explanation: ${p.alternativeExplanation.title}`, "", ...p.alternativeExplanation.text, "", "## Valid alternative methods (each checked to reach the same answer on every applicable generated item)", "");
  for (const a of p.alternativeMethods) L.push(`- **${a.name}**: ${a.example.join(" → ")}`);
  L.push("", `**Method credit.** ${p.methodCredit}`, "", "## Diagnostic (distinguishes the difficulties)", "", `Interpretation rule: ${p.diagnosticRule}`, "", "| Item | Case | Correct | Readings of other answers |", "|---|---|---|---|");
  for (const d of p.diagnostic) L.push(`| \`${d.id}\`: ${d.prompt} | ${d.case} — ${d.why} | ${d.answer} | ${d.readings.slice(1).map((r: any) => `${r.response} → ${r.reading}`).join("; ")} |`);
  L.push("", "## Misconception-specific teaching (only after the misconception is ESTABLISHED)", "");
  for (const m of p.misconceptions) L.push(`### \`${m.bug}\` (${m.kind}) — ${m.note}`, "", `Status: ${m.status}.`, "", ...m.screens.whatWentWrong.map((x: string) => `> ${x}`), "", `${m.screens.counterCheck}`, "", "Solved correctly:", "", ...m.screens.solvedCorrectly.map((x: string) => `1. ${x}`), "", `Example \`${m.example}\`; guided \`${m.guided}\`; fresh check \`${m.check}\`.`, "");
  L.push("## Practice, transfer and delayed checks (fresh; same skill)", "", `- Guided practice: ${p.practice.guided.map((x: string) => `\`${x}\``).join(", ")}`, `- Rechecks after teaching: ${p.practice.rechecks.map((x: string) => `\`${x}\``).join(", ")}`, `- Transfer (everyday form): ${p.practice.transfer.map((x: string) => `\`${x}\``).join(", ") || "**none: the family has no word form (content gap)**"}`, ...p.authoredTransfer.map((t: any) => `  - authored candidate (text only, arithmetic checked, NOT grader-verified): ${t.text} → ${t.answer}`), `- Delayed checks: ${p.practice.delayedChecks.map((x: string) => `\`${x}\``).join(", ")}`, "", "## Integration mapping (proposal for Codex; nothing written)", "", "```json", JSON.stringify(p.integration, null, 1), "```", "", "## Sources", "", ...p.sources.map((s: string) => `- ${s}`), "", "## Uncertainties", "", ...p.uncertainties.map((s: string) => `- ${s}`), "", `## Validation: ${p.validation.itemsOk}/${p.validation.items} items pass; whole-pool oracle + alternatives agreement ${p.validation.poolAgreement}`, "");
  return L.join("\n");
}
