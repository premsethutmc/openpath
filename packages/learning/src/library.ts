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
import type { Module, Screen, Strategy } from "./content";
import { explainStep, problemOf, variantsOf, type Problem } from "./families";

export const LIBRARY_POLICY = "library@1";

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

/** A stable order of a family's variants (FNV-1a of the id), so the choice does not follow parameter order. */
const h = (s: string) => {
  let x = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return x;
};
const predicted = (p: Problem) => new Set(p.bugs.filter((b) => b.predict !== null).map((b) => b.id));

export function synthesise(bp: Blueprint, blueprintVersion: string): SynthesisedModule {
  const seed = problemOf(`gen:${bp.family}:${bp.seed.join(",")}`);
  if (!seed) throw new Error(`${LIBRARY_POLICY}: ${bp.competency}: the seed is not a supported ${bp.family} problem`);
  if (seed.competency !== bp.competency) throw new Error(`${LIBRARY_POLICY}: ${bp.competency}: family ${bp.family} is about ${seed.competency}`);
  const pool = variantsOf(seed).sort((a, b) => h(a.id) - h(b.id) || a.id.localeCompare(b.id));
  const used = new Set<string>([seed.id]);
  const take = (form: "typed" | "mc" = "typed"): string => {
    const p = pool.find((x) => !used.has(x.id) && (form === "typed" || problemOf(`${x.id}:mc`)));
    if (!p) throw new Error(`${LIBRARY_POLICY}: ${bp.competency}: the ${bp.family} family has too few variants for a module`);
    used.add(p.id);
    return form === "mc" ? `${p.id}:mc` : p.id;
  };
  // worked examples: the seed for the chapter, one further variant for each strategy that shows one
  const examples = [seed.id];
  const example = () => {
    const id = take();
    examples.push(id);
    return problemOf(id)!;
  };
  const screen = (s: BlueprintScreen, ex: Problem): Screen => {
    const { worked, ...rest } = s;
    return worked ? { ...rest, math: [...(rest.math ?? []), ex.prompt.replace(/ \(.*\)$/, "").replace(/ Choose one\.$/, ""), ...ex.steps.map((st) => explainStep(ex, st))] } : rest;
  };
  // Explore: up to three questions that together let the written explanations be told apart
  const diagnostics: string[] = [];
  const covered = new Set<string>();
  for (let k = 0; k < 3; k++) {
    const best = pool.filter((p) => !used.has(p.id)).map((p) => ({ p, gain: [...predicted(p)].filter((b) => !covered.has(b)).length })).sort((a, b) => b.gain - a.gain)[0];
    if (!best) break;
    used.add(best.p.id);
    diagnostics.push(best.p.id);
    for (const b of predicted(best.p)) covered.add(b);
  }
  // the facts the explanations rest on (7 × 8, 2⁴ …): probe questions a strategy can build on
  const probes = [...new Set(seed.bugs.flatMap((b) => (b.probe && b.probe !== seed.id && !b.probe.startsWith(`gen:${bp.family}:`) && problemOf(b.probe) ? [b.probe] : [])))].slice(0, 2);
  const chapter = bp.chapter.map((s) => screen(s, seed));
  const strategies: Strategy[] = bp.strategies.map((st, k) => {
    const ex = st.screens.some((s) => s.worked) ? example() : seed;
    return { id: st.id, title: st.title, kind: st.kind, needs: st.buildsOnPrerequisites ? probes : [], screens: st.screens.map((s) => screen(s, ex)), guided: take(), check: take(k % 2 ? "mc" : "typed") };
  });
  const practice = [take(), take("mc"), take()];
  const transfer = [take("mc")];
  const retention = [take(), take("mc")];
  return {
    competency: bp.competency,
    title: bp.title,
    chapter,
    diagnostics,
    strategies,
    practice,
    transfer,
    retention,
    probes,
    provenance: { origin: "synthesised", policy: LIBRARY_POLICY, family: bp.family, seed: bp.seed, blueprintVersion, author: bp.author, aiAssisted: bp.aiAssisted, licence: bp.licence, examples },
  };
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
