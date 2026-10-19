/**
 * Family specifications (spec@1): what an educator approves when they approve a question FAMILY rather than single
 * questions. A specification is version-locked by a FINGERPRINT of the family's behaviour over its whole release pool:
 *
 *   generation constraints   the domain ranges, `keep` and `reject` (which parameter choices are released)
 *   answer validator         every released item's answer, which passed the family's independent check
 *   misconception options    every item's written explanations and their predicted answers, and the multiple-choice
 *                            options built from them
 *   difficulty               every item's difficulty class
 *   wording                  every item's prompt; the teaching hints
 *
 * Any change to any of these changes the fingerprint, and an approval of the old fingerprint no longer applies: the
 * family must be approved again (review.ts). Items that fail validation are excluded from the pool automatically.
 *
 * validateFamily runs three kinds of checks, all deterministic (seeded):
 *   deterministic   every pool item: builds, passes its independent check, rebuilds identically from its id, has a
 *                   readable prompt, an answer in its own format, explanations that predict wrong answers only, and
 *                   (multiple choice) distinct options with the right answer exactly once
 *   property-based  random parameter choices across and beyond the domain: the pool contains exactly those the
 *                   specification allows, and every allowed one validates
 *   boundary        every domain edge and one step outside it, holding the other parameters at a valid choice
 */
import { canonical, isCorrect, question } from "./content";
import { numericValue, sameAnswer, NEW_TYPES } from "./answer-types";
import { hashOf } from "./curriculum";
import { candidates, difficultyOf, explainStep, FAMILIES, inPool, pool, problemOf, rangeOf, show, type Problem } from "./families";

export const SPEC_POLICY = "spec@1";
/** Versions of each family specification; bump when the generator is changed on purpose (the fingerprint changes
 * anyway: the version says it was intended). */
export const FAMILY_VERSION: Record<string, string> = Object.fromEntries([...FAMILIES.keys()].map((k) => [k, "1.0.0"]));

export interface FamilySpec {
  id: string;
  version: string;
  title: string;
  competency: string;
  skill: string;
  type: Problem["type"];
  multipleChoice: boolean;
  domain: [number, number][];
  poolSize: number;
  excluded: { params: number[]; reason: string }[];
  difficulty: Record<"1" | "2" | "3", number>;
  /** Representative items: two of each difficulty, in both formats where there are two. */
  examples: string[];
  explanations: string[];
  teach: { idea: string; method: string } | null;
  fingerprint: string;
}

/**
 * Everything about one question that a reviewer approves: wording, answer, options, every explanation (its id, kind,
 * the skill it points to, its wording, its prediction and its probe question), the worked steps as written, the
 * difficulty class, and how the answer checker behaves (the right answer and nearby wrong values), so a change to
 * the validator is a change of specification too.
 */
const itemSignature = (p: Problem) => {
  const def = FAMILIES.get(p.family)!;
  const typed = problemOf(p.id.replace(/:(mc|w)$/, ""))!;
  const v = def.solve(typed.params).answer;
  const probes = typeof v === "number" ? [v, v + 1, v - 1, 2 * v + 1, v + 0.5].map((x) => (def.validate(typed.params, x) ? "1" : "0")).join("") : def.validate(typed.params, v) ? "1" : "0";

  return [p.id, p.prompt, p.answer, (p.options ?? []).join("|"), p.bugs.map((b) => `${b.id}:${b.kind}:${b.competency}:${b.says}:${JSON.stringify(b.predict)}:${b.probe ?? ""}`).join(";"), p.steps.map((st) => `${st.competency}=${explainStep(p, st)}`).join("|"), difficultyOf(p), probes, ...(p.figure ? [JSON.stringify(p.figure)] : []), ...(NEW_TYPES.has(p.type) ? [p.type] : [])].join("¦");
};

export function familySpec(fam: string): FamilySpec | null {
  const def = FAMILIES.get(fam);
  if (!def?.domain) return null;
  const { items, excluded } = pool(fam);
  const mc = items.map((p) => (def.mc && p.type !== "set" && p.type !== "choice" ? problemOf(`${p.id}:mc`) : null)).filter((x): x is Problem => !!x);
  const word = items.map((p) => (def.word ? problemOf(`${p.id}:w`) : null)).filter((x): x is Problem => !!x);
  const byLevel = (l: number) => items.filter((p) => difficultyOf(p) === l);
  const examples = [1, 2, 3].flatMap((l) => {
    const xs = byLevel(l);
    const a = xs[Math.floor(xs.length / 3)];
    const b = xs[Math.floor((2 * xs.length) / 3)];
    return [a?.id, b && (def.mc && b.type !== "set" && b.type !== "choice" ? `${b.id}:mc` : b.id)].filter((x): x is string => !!x);
  });
  const fingerprint = hashOf({
    policy: SPEC_POLICY,
    id: fam,
    version: FAMILY_VERSION[fam],
    domain: def.domain,
    competency: def.competency,
    skill: def.skill ?? def.competency,
    type: def.type,
    teach: def.teach ?? null,
    items: items.map(itemSignature),
    mc: mc.map(itemSignature),
    ...(word.length ? { word: word.map(itemSignature) } : {}),
    ...(def.cap ? { cap: def.cap } : {}),
    ...(def.teach?.alternatives ? { alternatives: def.teach.alternatives.map((a) => [a.id, a.title, a.kind, ...a.text]) } : {}),
  });
  return {
    id: fam,
    version: FAMILY_VERSION[fam],
    title: def.title,
    competency: def.competency,
    skill: def.skill ?? def.competency,
    type: def.type,
    multipleChoice: !!def.mc,
    domain: def.domain,
    poolSize: items.length,
    excluded,
    difficulty: { "1": byLevel(1).length, "2": byLevel(2).length, "3": byLevel(3).length },
    examples,
    // one line per kind of explanation (a fact slip is one kind, whatever the fact), with an example of its wording
    explanations: [...new Map<string, string>(items.flatMap((p) => p.bugs.map((b) => [b.id.replace(/:.*$/, ""), `${b.id.replace(/:.*$/, "")} (${b.kind}): ${b.says}`] as const))).values()],
    teach: def.teach ?? null,
    fingerprint,
  };
}

export interface ValidationReport {
  family: string;
  deterministic: { checked: number; failures: string[] };
  property: { cases: number; failures: string[] };
  boundary: { cases: number; failures: string[] };
  excluded: number;
  ok: boolean;
}
const rng = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

/** A shown rational number ("3/4", "-0.5", "2"), or null for anything else. */
function numeric(s: string): number | null {
  const m = /^(-?\d+(?:\.\d+)?)(?:\/(\d+))?$/.exec(String(s).trim());
  return m ? Number(m[1]) / (m[2] ? Number(m[2]) : 1) : null;
}

function checkItem(p: Problem, out: string[]) {
  const rebuilt = problemOf(p.id);
  if (!rebuilt || itemSignature(rebuilt) !== itemSignature(p)) out.push(`${p.id}: does not rebuild identically from its id`);
  if (!p.prompt || /NaN|undefined|Infinity|\[object/.test(p.prompt)) out.push(`${p.id}: unreadable prompt`);
  const q = question(p.id);
  if (canonical(q, q.answer) === null || !isCorrect(q, q.answer)) out.push(`${p.id}: its answer is not in its own format`);
  for (const b of p.bugs) {
    const vals = b.predict === null ? [] : p.type !== "set" && Array.isArray(b.predict) ? b.predict : [b.predict];
    if (p.type !== "choice") for (const v of vals) if (show(v as number) === p.answer || (NEW_TYPES.has(p.type) && sameAnswer(p.type, show(v as number), p.answer))) out.push(`${p.id}: explanation ${b.id} predicts the right answer`);
  }
  if (p.type === "choice" && p.options) {
    if (new Set(p.options).size !== p.options.length) out.push(`${p.id}: repeated options`);
    if (p.options.length < 2 || !"ABCD".slice(0, p.options.length).includes(p.answer)) out.push(`${p.id}: the answer is not one of the options`);
  }
}

export function validateFamily(fam: string, seed = 20261019): ValidationReport {
  const def = FAMILIES.get(fam)!;
  const det: string[] = [];
  const { items, excluded } = pool(fam);
  // range@1: a family whose every answer is a probability declares it, so its options stay meaningful
  if (def.mc && !def.range && def.competency.startsWith("MATH.probability.") && items.length && items.every((p) => { const v = numeric(p.answer); return v !== null && v >= 0 && v <= 1; }))
    det.push(`${fam}: every answer is a probability; declare range: [0, 1] so no option above 1 or below 0 is offered`);
  for (const e of excluded) if (e.reason.startsWith("AMBIGUOUS")) det.push(`gen:${fam}:${e.params.join(",")}: ${e.reason}`);
  for (const p of items) {
    checkItem(p, det);
    // the independent check must refuse every wrong answer an explanation predicts (otherwise it is not a check)
    for (const b of p.bugs) {
      const vals = b.predict === null ? [] : p.type !== "set" && Array.isArray(b.predict) ? b.predict : [b.predict];
      for (const v of vals) if (p.type !== "choice" && def.validate(p.params, v as never)) det.push(`${p.id}: the independent check accepts ${show(v as never)}, which explanation ${b.id} predicts as wrong`);
    }
    // range@1: the answer lies in the declared range, and so does every option
    const rg = rangeOf(def, p.params);
    const inR = (s: string) => { const v = numeric(s) ?? numericValue(s); return v === null || !rg || (v >= rg[0] - 1e-12 && v <= rg[1] + 1e-12); };
    if (rg && !inR(p.answer)) det.push(`${p.id}: the answer ${p.answer} is outside the family's range [${rg}]`);
    if (def.mc && p.type !== "set" && p.type !== "choice") {
      const m = problemOf(`${p.id}:mc`);
      if (!m) det.push(`${p.id}:mc does not build`);
      else {
        checkItem(m, det);
        for (const o of m.options ?? []) if (!inR(o)) det.push(`${p.id}:mc: option ${o} is outside the family's range [${rg}]`);
        if (m.options && m.options.length < 3) det.push(`${p.id}:mc: only ${m.options.length} options`);
        if (m.options![("ABCD").indexOf(m.answer)] !== p.answer) det.push(`${p.id}:mc: the right letter is not the typed answer`);
        if (NEW_TYPES.has(p.type)) m.options!.forEach((o, i) => { if (i !== "ABCD".indexOf(m.answer) && sameAnswer(p.type, o, p.answer)) det.push(`${p.id}:mc: option ${"ABCD"[i]} is also right`); });
      }
    }
    if (def.word) {
      const w = problemOf(`${p.id}:w`);
      if (!w) det.push(`${p.id}:w does not build`);
      else {
        checkItem(w, det);
        if (w.answer !== p.answer) det.push(`${p.id}:w: the everyday form has a different answer`);
        if (w.prompt === p.prompt) det.push(`${p.id}:w: the everyday form is worded the same as the typed form`);
      }
    }
  }
  // property-based: random choices in a box one wider than the domain on every side
  const allowed = new Set(candidates(fam).map((p) => p.join(",")));
  const prop: string[] = [];
  const r = rng(seed ^ fam.length);
  const cases = 400;
  for (let k = 0; k < cases; k++) {
    const p = def.domain!.map(([lo, hi]) => lo - 1 + Math.floor(r() * (hi - lo + 3)));
    const id = `gen:${fam}:${p.join(",")}`;
    const shouldBe = allowed.has(p.join(",")) && !excluded.some((e) => e.params.join(",") === p.join(","));
    if (inPool(id) !== shouldBe) prop.push(`${id}: in the pool is ${inPool(id)}, the specification says ${shouldBe}`);
    if (shouldBe) {
      const pr = problemOf(id);
      if (!pr || !def.validate(p, def.solve(p).answer)) prop.push(`${id}: allowed but does not validate`);
    }
  }
  // boundaries: each edge and one step outside, around a valid centre choice
  const bnd: string[] = [];
  const centre = items[Math.floor(items.length / 2)]?.params;
  let bcases = 0;
  if (centre)
    def.domain!.forEach(([lo, hi], i) => {
      for (const v of [lo - 1, lo, hi, hi + 1]) {
        const p = [...centre];
        p[i] = v;
        const id = `gen:${fam}:${p.join(",")}`;
        bcases++;
        const outside = v < lo || v > hi;
        if (outside && inPool(id)) bnd.push(`${id}: outside the domain but in the pool`);
        if (!outside && allowed.has(p.join(",")) && !inPool(id) && !excluded.some((e) => e.params.join(",") === p.join(","))) bnd.push(`${id}: an allowed edge is missing from the pool`);
      }
    });
  return { family: fam, deterministic: { checked: items.length, failures: det }, property: { cases, failures: prop }, boundary: { cases: bcases, failures: bnd }, excluded: excluded.length, ok: !det.length && !prop.length && !bnd.length };
}
