/**
 * The content-production pipeline's synthesis step (library@1): a module BLUEPRINT (a competency, a problem family, a
 * seed, and the teaching text a person wrote) → a complete learning module (Explore → Strategy → Chapter → Practise →
 * Verify), with every question generated from the family and checked by the family's independent check.
 *
 * What a blueprint author writes:   the chapter text, the strategies' text, and which strategy builds on what.
 * What synthesis adds:              the questions (diagnostic, guided, check, practice, transfer, retention, probes),
 *                                   chosen deterministically from the family's variants, in two answer formats (typed
 *                                   and multiple choice with mal-rule options), never reusing a question across phases;
 *                                   worked examples from the family's solution steps.
 * What it never does:               invent mathematics (every answer comes from a family's solver and passes its
 *                                   independent check), publish anything (the module starts as a draft in the review
 *                                   registry, review.ts), or call a language model.
 *
 * The output is written to content/learning/library.v1.json by scripts/library.ts, so the app and the server read the
 * same modules; a test checks that the file is exactly what the blueprints synthesise.
 */
import { poolFamilies, type Module, type Screen, type Strategy } from "./content";
import { difficultyOf, explainStep, exposureKey, FAMILIES, phasePool, pool, problemOf, show, type Phase, type Problem } from "./families";
import { graph } from "./graph";
import { FAMILY_VERSION } from "./spec";

export const LIBRARY_POLICY = "library@2";

export interface BlueprintScreen extends Screen {
  /** Add the worked steps of an example problem from the family as this screen's mathematics. */
  worked?: boolean;
}
export interface BlueprintStrategy {
  id: string;
  title: string;
  kind: Strategy["kind"];
  /** This way of explaining builds on the prerequisite facts the family's explanations name (their probe questions). */
  buildsOnPrerequisites?: boolean;
  screens: BlueprintScreen[];
}
export interface Blueprint {
  competency: string;
  title: string;
  family: string;
  seed: number[];
  author: string;
  aiAssisted: boolean;
  licence: string;
  chapter: BlueprintScreen[];
  strategies: BlueprintStrategy[];
}
export interface SynthesisedModule extends Module {
  provenance: { origin: "synthesised"; policy: string; family: string; seed: number[]; blueprintVersion: string; author: string; aiAssisted: boolean; licence: string; examples: string[] };
}

/** pools@1: the families a competency's module draws from — the main one first, then every other family of the
 * competency that can serve a module (a competency is broader than one family). */
export function poolsFor(competency: string, main: string) {
  const others = [...FAMILIES.values()].filter((f) => f.id !== main && f.competency === competency && f.domain && f.teach && !NOT_A_MODULE.has(f.id) && pool(f.id).items.length >= 10).map((f) => f.id);
  return [main, ...others].map((f) => ({ family: f, version: FAMILY_VERSION[f] }));
}
/** The questions of a phase across a module's families, taken in turn (one from each family, then the next round). */
export function modulePhasePool(m: Module, phase: Phase): string[] {
  const lists = poolFamilies(m).map((f) => phasePool(f, phase));
  const out: string[] = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}
const predicted = (p: Problem) => new Set(p.bugs.filter((b) => b.predict !== null).map((b) => b.id));
const minus = (t: string) => t.replace(/^-/, "−");
const typedOf = (id: string) => problemOf(id.replace(/:mc$/, ""))!;

/**
 * Draws questions from a family's release pool by phase (families.ts phaseOf): diagnostic questions only from the
 * diagnostic part, checks from the check part, practice and guided practice from the practice part, the delayed
 * check from the retention part; never the same problem twice (in either answer format).
 */
function drawer(family: string, used: Set<string>) {
  const take = (phase: Phase, form: "typed" | "mc" | "word" | "any" = "any"): string => {
    const id = phasePool(family, phase).map((x) => (form === "typed" ? x.replace(/:mc$/, "") : form === "mc" && !x.endsWith(":mc") && problemOf(`${x}:mc`) ? `${x}:mc` : form === "word" ? `${x.replace(/:mc$/, "")}:w` : x)).find((x) => !used.has(exposureKey(x)) && (form !== "word" || problemOf(x) !== null));
    if (!id) throw new Error(`${LIBRARY_POLICY}: family ${family} has too few ${phase} questions for a module`);
    used.add(exposureKey(id));
    return id;
  };
  return take;
}
function explore(family: string, used: Set<string>): string[] {
  const out: string[] = [];
  const covered = new Set<string>();
  const pool = phasePool(family, "diagnostic").map((x) => x.replace(/:mc$/, ""));
  for (let k = 0; k < 3; k++) {
    // new explanations covered first, then how many explanations the question can show at all
    const best = pool.filter((x) => !used.has(x)).map((x) => ({ x, p: typedOf(x) })).map(({ x, p }) => ({ x, gain: [...predicted(p)].filter((b) => !covered.has(b)).length, all: predicted(p).size })).sort((a, b) => b.gain - a.gain || b.all - a.all)[0];
    if (!best) break;
    used.add(best.x);
    out.push(best.x);
    for (const b of predicted(typedOf(best.x))) covered.add(b);
  }
  return out;
}
/** pools@1: the competency's other families are its other sub-skills. Each gets a chapter screen (its idea, its method
 * and a worked example), a practice question and, when it has one, its everyday question; one of them shares the
 * delayed check. */
function subSkills(competency: string, family: string, used: Set<string>) {
  const pools = poolsFor(competency, family);
  const others = pools.slice(1).map((p) => p.family);
  const tryTake = (f: string, phase: Phase, form: "typed" | "mc" | "word" | "any") => {
    try {
      return drawer(f, used)(phase, form);
    } catch {
      return null;
    }
  };
  const chapter: Screen[] = [];
  for (const f of others) {
    const d = FAMILIES.get(f)!;
    const list = phasePool(f, "practice").map((x) => x.replace(/:mc$/, "")).filter((x) => !used.has(x));
    const id = list.find((x) => difficultyOf(typedOf(x)) <= 2) ?? list[0];
    if (!id) continue;
    used.add(id);
    const e = typedOf(id);
    const w = d.teach!.visual?.(e.params);
    chapter.push({ title: d.title, text: [d.teach!.idea, d.teach!.method], math: worked(e), ...(w ? { widget: w as Screen["widget"] } : {}) });
  }
  const practice = others.flatMap((f) => [tryTake(f, "practice", "typed")].filter((x): x is string => !!x));
  const transfer = others.filter((f) => FAMILIES.get(f)!.word).slice(0, 2).flatMap((f) => [tryTake(f, "practice", "word")].filter((x): x is string => !!x));
  const retention = others.map((f) => tryTake(f, "retention", "mc")).find((x) => !!x) ?? null;
  return { pools, chapter, practice, transfer, retention };
}
const worked = (ex: Problem) => [ex.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...ex.steps.map((st) => explainStep(ex, st))];

export function synthesise(bp: Blueprint, blueprintVersion: string): SynthesisedModule {
  const seed = problemOf(`gen:${bp.family}:${bp.seed.join(",")}`);
  if (!seed) throw new Error(`${LIBRARY_POLICY}: ${bp.competency}: the seed is not a supported ${bp.family} problem`);
  if (seed.competency !== bp.competency) throw new Error(`${LIBRARY_POLICY}: ${bp.competency}: family ${bp.family} is about ${seed.competency}`);
  const used = new Set<string>([seed.id]);
  const take = drawer(bp.family, used);
  // worked examples: the seed for the chapter, one practice item for each strategy that shows one
  const examples = [seed.id];
  const example = () => {
    const id = take("practice", "typed");
    examples.push(id);
    return problemOf(id)!;
  };
  const screen = (s: BlueprintScreen, ex: Problem): Screen => {
    const { worked: w, ...rest } = s;
    return w ? { ...rest, math: [...(rest.math ?? []), ...worked(ex)] } : rest;
  };
  const diagnostics = explore(bp.family, used);
  // the facts the explanations rest on (7 × 8, 2⁴ …): probe questions a strategy can build on
  const probes = [...new Set(seed.bugs.flatMap((b) => (b.probe && b.probe !== seed.id && !b.probe.startsWith(`gen:${bp.family}:`) && problemOf(b.probe) ? [b.probe] : [])))].slice(0, 2);
  const chapter = bp.chapter.map((s) => screen(s, seed));
  const sub = subSkills(bp.competency, bp.family, used);
  const strategies: Strategy[] = bp.strategies.map((st, k) => {
    const ex = st.screens.some((s) => s.worked) ? example() : seed;
    return { id: st.id, title: st.title, kind: st.kind, needs: st.buildsOnPrerequisites ? probes : [], screens: st.screens.map((s) => screen(s, ex)), guided: take("practice", "typed"), check: take("check", k % 2 ? "mc" : "typed") };
  });
  return {
    competency: bp.competency,
    title: bp.title,
    chapter: [...chapter, ...sub.chapter],
    diagnostics,
    strategies,
    practice: [take("practice", "typed"), take("practice", "mc"), take("practice", "typed"), ...sub.practice],
    transfer: [take("practice", "mc"), ...sub.transfer],
    retention: [take("retention", "typed"), sub.retention ?? take("retention", "mc")],
    probes,
    pool: { family: bp.family, version: FAMILY_VERSION[bp.family] },
    ...(sub.pools.length > 1 ? { pools: sub.pools } : {}),
    provenance: { origin: "synthesised", policy: LIBRARY_POLICY, family: bp.family, seed: bp.seed, blueprintVersion, author: bp.author, aiAssisted: bp.aiAssisted, licence: bp.licence, examples },
  };
}

/**
 * A module from a family alone (template@1): no hand-written text. The chapter and strategies come from the family's
 * teaching hints (its idea and method), its worked solution steps and its written explanations of mistakes:
 *   worked_steps        procedural: the method, then a worked example step by step
 *   spot_the_mistake    conceptual: a common wrong answer, why it is wrong, and the right one
 *   check_what_it_uses  prerequisite: the skills its steps use, with their probe questions (when there are any)
 * It is reviewed like any module: an educator approves the teaching; the family approval covers the questions.
 */
export function fromTemplate(family: string, competency: string, version: string): SynthesisedModule {
  const def = FAMILIES.get(family);
  if (!def?.teach) throw new Error(`${LIBRARY_POLICY}: family ${family} has no teaching hints`);
  if (def.competency !== competency) throw new Error(`${LIBRARY_POLICY}: family ${family} is about ${def.competency}`);
  const used = new Set<string>();
  const take = drawer(family, used);
  const ex = (pred: (p: Problem) => boolean = () => true) => {
    const id = phasePool(family, "practice").map((x) => x.replace(/:mc$/, "")).find((x) => !used.has(x) && pred(typedOf(x)));
    if (!id) return null;
    used.add(id);
    return typedOf(id);
  };
  const first = ex((p) => difficultyOf(p) <= 2) ?? ex()!;
  const conceptual = (p: Problem) => p.bugs.find((b) => b.kind === "conceptual" && b.predict !== null && !Array.isArray(b.predict)) ?? p.bugs.find((b) => b.predict !== null && !Array.isArray(b.predict));
  const mistakeEx = ex((p) => !!conceptual(p));
  const stepsEx = ex()!;
  const diagnostics = explore(family, used);
  const probes = [...new Set(first.bugs.flatMap((b) => (b.probe && !b.probe.startsWith(`gen:${family}:`) && problemOf(b.probe) ? [b.probe] : [])))].slice(0, 2);
  const uses = [...new Set(first.steps.map((s) => s.competency).filter((c) => c !== competency))].map((c) => graph.get(c).name);
  const vis = (f: ((p: number[]) => unknown) | undefined, p: Problem) => {
    const w = f?.(p.params);
    return w ? { widget: w as Screen["widget"] } : {};
  };
  const strategies: Strategy[] = [
    { id: "worked_steps", title: "Step by step", kind: "procedural", needs: probes, screens: [{ title: "The method", text: [def.teach.method], math: worked(stepsEx), ...vis(def.teach.visual, stepsEx) }], guided: take("practice", "typed"), check: take("check", "typed") },
  ];
  // template@2: the family's further ways of explaining, each with its own example (and picture)
  for (const alt of def.teach.alternatives ?? []) {
    const e = ex() ?? stepsEx;
    strategies.push({ id: alt.id, title: alt.title, kind: alt.kind, needs: [], screens: [{ title: alt.title, text: alt.text, math: worked(e), ...vis(alt.visual, e) }], guided: take("practice", "typed"), check: take("check", strategies.length % 2 ? "mc" : "typed") });
  }
  if (mistakeEx) {
    const b = conceptual(mistakeEx)!;
    strategies.push({ id: "spot_the_mistake", title: "Spot the mistake", kind: b.kind === "conceptual" ? "conceptual" : "procedural", needs: [], screens: [{ title: "A common wrong answer", text: [`A question: “${mistakeEx.prompt.replace(/ \(.*\)$/, "")}” A common wrong answer is ${minus(show(b.predict as number))}.`, b.says, def.teach.idea], math: [`Not ${minus(show(b.predict as number))}, but ${minus(mistakeEx.answer)}`] }], guided: take("practice", "typed"), check: take("check", "mc") });
  }
  if (uses.length)
    strategies.push({ id: "check_what_it_uses", title: "Check what it builds on", kind: "prerequisite", needs: [], screens: [{ title: "What it uses", text: [`Each step builds on another skill: ${uses.join("; ")}. If a step is slow, practise that skill first.`, `Then the method is: ${def.teach.method}`] }], guided: take("practice", "typed"), check: take("check", "typed") });
  const sub = subSkills(competency, family, used);
  const own = [take("practice", "typed"), take("practice", "mc"), take("practice", "typed")];
  return {
    competency,
    title: def.title,
    chapter: [{ title: def.title, text: [def.teach.idea], math: worked(first), ...vis(def.teach.visual, first), ...(conceptual(first) ? { tip: conceptual(first)!.says } : {}) }, ...sub.chapter],
    diagnostics,
    strategies,
    practice: [...own, ...sub.practice],
    transfer: [def.word ? take("practice", "word") : take("practice", "mc"), ...sub.transfer],
    retention: [take("retention", "typed"), sub.retention ?? take("retention", "mc")],
    probes,
    pool: { family, version: FAMILY_VERSION[family] },
    ...(sub.pools.length > 1 ? { pools: sub.pools } : {}),
    provenance: { origin: "synthesised", policy: `${LIBRARY_POLICY}+${def.teach.alternatives?.length || def.teach.visual ? "template@2" : "template@1"}`, family, seed: first.params, blueprintVersion: version, author: "OpenPath template (generated from the family's teaching hints; not educator-reviewed)", aiAssisted: true, licence: "CC0", examples: [first.id, ...(mistakeEx ? [mistakeEx.id] : []), stepsEx.id] },
  };
}

/** What a module's pool can still provide, phase by phase (depth@1): enough for diagnosis, practice, reassessment and
 * the delayed check, or a stated limitation. */
export const DEPTH_POLICY = { version: "depth@1", minimum: { diagnostic: 3, check: 6, practice: 15, retention: 6 } } as const;
export function poolDepth(m: Module) {
  if (!m.pool) return null;
  const counts = Object.fromEntries((["diagnostic", "check", "practice", "retention"] as Phase[]).map((ph) => [ph, new Set(modulePhasePool(m, ph).map(exposureKey)).size])) as Record<Phase, number>;
  const short = (Object.keys(DEPTH_POLICY.minimum) as Phase[]).filter((ph) => counts[ph] < DEPTH_POLICY.minimum[ph]);
  return { family: m.pool.family, families: poolFamilies(m), counts, short, sufficient: short.length === 0 };
}

/** Every question a module uses, by phase (for validation, coverage and review). */
export function moduleQuestions(m: Module) {
  return {
    diagnostic: m.diagnostics,
    probe: m.probes,
    guided: m.strategies.map((s) => s.guided),
    check: m.strategies.map((s) => s.check),
    practice: m.practice,
    transfer: m.transfer,
    retention: m.retention,
  };
}

/** The whole library, as scripts/library.ts writes it (and tests rebuild it): blueprints, then templates for every
 * family whose competency has no module yet, then pools for hand-written modules. */
export const NOT_A_MODULE = new Set(["meet", "above"]);
export function buildLibrary(bps: { version: string; blueprints: Blueprint[] }, authored: Module[]) {
  const fromBlueprints = bps.blueprints.map((b) => synthesise(b, bps.version));
  const taken = new Set([...authored.map((m) => m.competency), ...fromBlueprints.map((m) => m.competency)]);
  // a family too small to fill every phase gives no module: the limitation is recorded, never papered over
  const notBuilt: { family: string; competency: string; reason: string }[] = [];
  // a competency's module pool: the first family listed for it whose pool is deep enough for every phase (depth@1),
  // otherwise the first one (its module then states the limitation)
  const deepEnough = (f: string) => {
    const n = (ph: Phase) => new Set(phasePool(f, ph).map(exposureKey)).size;
    return (Object.keys(DEPTH_POLICY.minimum) as Phase[]).every((ph) => n(ph) >= DEPTH_POLICY.minimum[ph]);
  };
  const candidatesFor = (c: string) => [...FAMILIES.values()].filter((f) => f.competency === c && f.teach && f.domain && !NOT_A_MODULE.has(f.id));
  const mainFamily = (c: string) => candidatesFor(c).find((f) => deepEnough(f.id)) ?? candidatesFor(c)[0];
  const fromTemplates = [...new Set([...FAMILIES.values()].filter((f) => f.teach && f.domain && !NOT_A_MODULE.has(f.id) && !taken.has(f.competency)).map((f) => f.competency))].map((c) => mainFamily(c)!).flatMap((f) => {
    try {
      const m = fromTemplate(f.id, f.competency, bps.version);
      taken.add(f.competency);
      return [m];
    } catch (e) {
      notBuilt.push({ family: f.id, competency: f.competency, reason: String((e as Error).message) });
      return [];
    }
  });
  const authoredPools = Object.fromEntries(authored.flatMap((m) => {
    const f = [...FAMILIES.values()].filter((x) => x.competency === m.competency && x.domain && !NOT_A_MODULE.has(x.id)).find((x) => deepEnough(x.id)) ?? [...FAMILIES.values()].find((x) => x.competency === m.competency && x.domain && !NOT_A_MODULE.has(x.id));
    if (!f) return [];
    const pools = poolsFor(m.competency, f.id);
    return [[m.competency, { family: f.id, version: FAMILY_VERSION[f.id], ...(pools.length > 1 ? { pools } : {}) }]];
  }));
  return { modules: [...fromBlueprints, ...fromTemplates], fromBlueprints, fromTemplates, authoredPools, notBuilt };
}
