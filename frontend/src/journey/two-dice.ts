/**
 * Two-dice probability candidate (TP-PRO-01): composition and test-only installation.
 *
 * The library builder (packages/learning/src/library.ts) accepts pool families for template extensions via
 * `poolFamilies(base).includes(family)`. The dice strategies are now registered in blueprints.v1.json and synthesised
 * into the library. This fixture remains useful for tests that need a controlled module without regenerating the library.
 * `composeTwoDice` applies the same append-only rules as `synthesise` (unchanged module, unique ids, explicit scoped instances,
 * no reserved exposure, guided from practice and check from the check partition of the SCOPED family, declared scope valid),
 * plus freshness@2 (no recheck that is the same or a relabelled problem). `installForTest` swaps the composed module into the
 * loaded module list and registers pending-review records in a test registry, so the real session, engine and replay can be
 * exercised. It is a test fixture: nothing in the app reads this file.
 */
import { moduleFor, modules, poolFamilies, type Module, type Strategy } from "../../../packages/learning/src/content";
import { exposureKey, FAMILIES, problemOf, type Phase } from "../../../packages/learning/src/families";
import { selectable } from "../../../packages/learning/src/question-status";
import { strategyScopeProblems } from "../../../packages/learning/src/teaching-presentation";
import { contentHash, explanationRegistry, setExplanationRegistry, addressedMisconception, isMisconceptionSpecific, type ExplanationRegistry } from "../../../packages/learning/src/explanation-review";
import { candidateStrategies, COMPETENCY, diceProblemKey, type CandidateStrategy } from "../../../content/learning/src/two-dice-candidate.mts";

export { COMPETENCY };
const shownOf = (s: { guided: string; screens: readonly { instance?: string }[] }) => [s.guided, ...s.screens.flatMap((sc) => (sc.instance ? [sc.instance] : []))];

/** `phasePool` is supplied by the caller (a test or script), so this fixture is not a question selector of its own */
export type PhasePool = (fam: string, phase: Phase) => string[];
export function composeTwoDice(phasePool: PhasePool, base: Module, add: CandidateStrategy[] = candidateStrategies()): Module {
  const fail = (m: string) => { throw new Error(`two-dice candidate: ${m}`); };
  const ids = new Set(base.strategies.map((s) => s.id));
  const reserved = new Set([...base.chapter.flatMap((sc) => (sc.instance ? [sc.instance] : [])), ...base.diagnostics, ...base.practice, ...base.transfer, ...base.retention,
    ...base.strategies.flatMap((s) => [...shownOf(s), s.check])].map(exposureKey));
  const pools = poolFamilies(base);
  const out: Strategy[] = add.map((st) => {
    if (ids.has(st.id)) fail(`duplicate strategy ${st.id}`);
    ids.add(st.id);
    const fam = st.scope.family;
    if (!pools.includes(fam) || FAMILIES.get(fam)?.competency !== base.competency) fail(`${st.id}: scope family ${fam} is not a pool family of ${base.competency}`);
    for (const key of new Set(st.screens.map((sc) => exposureKey(sc.instance)))) { if (reserved.has(key)) fail(`${st.id}: shown example repeats a reserved exposure`); reserved.add(key); }
    for (const [id, phase] of [[st.guided, "practice"], [st.check, "check"]] as const) {
      if (!selectable(id) || reserved.has(exposureKey(id)) || !phasePool(fam, phase).some((q) => exposureKey(q) === exposureKey(id))) fail(`${st.id}: ${phase} item unavailable, reused or outside partition`);
      reserved.add(exposureKey(id));
    }
    // freshness@2: the recheck is not the same, or a relabelled, problem as anything this explanation shows
    const ck = diceProblemKey(st.check);
    if (shownOf(st).some((id) => diceProblemKey(id) === ck)) fail(`${st.id}: check is the same problem as a shown example (freshness@2)`);
    const s: Strategy = { id: st.id, title: st.title, kind: st.kind, needs: [], scope: st.scope, addresses: st.addresses, screens: st.screens as Strategy["screens"], guided: st.guided, check: st.check };
    const problems = strategyScopeProblems(base, s);
    if (problems.length) fail(`${st.id}: ${problems.join("; ")}`);
    return s;
  });
  return { ...base, strategies: [...base.strategies, ...out] };
}

/** pending-review records (demonstration mode only), exactly as the registry sync writes them for a new candidate */
export function pendingRecords(m: Module, ids: string[], at = "2026-11-04T00:00:00.000Z") {
  return ids.map((id) => { const s = m.strategies.find((x) => x.id === id)!; return {
    id: `${m.competency}#${s.id}`, subject: "mathematics", competency: m.competency, strategy: s.id, intervention: s.kind, misconceptionSpecific: isMisconceptionSpecific(s),
    addresses: addressedMisconception(s), revisions: [{ contentHash: contentHash(m.competency, s), status: "pending_review", provenance: { source: "registry", by: "explanation-review sync", at, note: "registered: not yet screened or reviewed" }, reviewerRole: "none", knownIssues: [], scope: ["demonstration"] }] };
  });
}

/** test only: install the composed module and its pending records; returns the restore function.
 * When the loaded module already contains the dice strategies (i.e. the library was regenerated from blueprints),
 * only the explanation registry records are added — no module swap needed. */
export function installForTest(phasePool: PhasePool): { module: Module; restore: () => void } {
  const i = modules.findIndex((m) => m.competency === COMPETENCY), before = modules[i], regBefore = explanationRegistry();
  const alreadySynthesised = before.strategies.some((s) => s.id.startsWith("akdice_"));
  const m = alreadySynthesised ? before : composeTwoDice(phasePool, before);
  if (!alreadySynthesised) modules[i] = m;
  const reg = structuredClone(regBefore) as ExplanationRegistry;
  (reg.entries as unknown[]).push(...pendingRecords(m, candidateStrategies().map((s) => s.id)));
  setExplanationRegistry(reg);
  if (moduleFor(COMPETENCY) !== m) throw new Error("module not installed");
  return { module: m, restore: () => { if (!alreadySynthesised) modules[i] = before; setExplanationRegistry(regBefore); } };
}
export const problemKey = diceProblemKey;
export const problem = (id: string) => problemOf(id.replace(/:(mc|w)$/, ""))!;
