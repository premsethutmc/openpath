/**
 * Stage 2 (Grade 10 showcase): semantic alignment of the curated lessons, the showcase scope's remaining violations and
 * exemptions, practice that tests what was taught, and a holdout over mixed-subtype families. Mechanical checks only:
 * they do not establish teaching quality, which needs educator review.
 */
import { describe, expect, test } from "bun:test";
import { modules, needsMarking, question, type Module } from "./content";
import { exposureKey, FAMILIES, pool, problemOf } from "./families";
import { checkRepresentation, teachingLesson, EXEMPTIONS, evalArithmetic, lessonBlocks, ROLE_LABEL, SHOWCASE } from "./teaching-contract";

import { teachingScopeFor } from "./teaching-presentation";
import { modulePhasePool } from "./library";

const LONG = 300_000;
const CURATED: Record<string, string> = { "MATH.number.euclid-algorithm": "hcf", "MATH.algebra.arithmetic-sequences": "apn", "MATH.geometry.pythagoras": "ahpyth", "MATH.probability.classical": "anbag" };
const nums = (s: string) => (s.replace(/−/g, "-").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const mod = (c: string) => modules.find((m) => m.competency === c)!;

describe("curated Grade 10 lessons: every question of the family is taught as itself", () => {
  for (const [competency, fam] of Object.entries(CURATED)) test(`${fam} (${competency})`, () => {
    const def = FAMILIES.get(fam)!;
    const items = pool(fam).items.filter((p) => p.form === "typed");
    expect(items.length).toBeGreaterThan(10);
    for (const p of items) {
      const t = def.teach!.instance!(p.params), answer = Number(p.answer.includes("/") ? eval(p.answer) : p.answer);
      // the solution: every claim holds, the result is the checked answer, the last step states it
      for (const s of t.worked.steps) for (const c of s.claims ?? []) expect(evalArithmetic(c.expr), `${p.id}: ${c.expr}`).toBeCloseTo(c.value, 9);
      expect(t.worked.result, p.id).toBeCloseTo(answer, 9);
      expect(def.validate(p.params, t.worked.result), p.id).toBe(true);
      expect(t.worked.steps.length, p.id).toBeGreaterThan(1);
      // the picture is of this question's own values
      expect(checkRepresentation(t.representation!, p), `${p.id}: ${JSON.stringify(t.representation)}`).toBe(true);
      // the concept quotes only this question's numbers (and numbers its own solution and picture establish)
      const allowed = new Set([...nums(p.prompt), ...nums(p.answer), ...p.params.map(Math.abs), ...t.worked.steps.flatMap((s) => nums(s.expression)), ...nums(JSON.stringify(t.representation)), 0, 1, 2]);
      for (const line of t.concept.text) for (const v of nums(line)) expect(allowed.has(v), `${p.id}: ${v} in "${line}"`).toBe(true);
    }
  }, LONG);

  test("solution shapes differ by concept (no universal template)", () => {
    const shapes = Object.values(CURATED).map((fam) => {
      const p = pool(fam).items[0];
      return FAMILIES.get(fam)!.teach!.instance!(p.params).worked.steps.map((s) => s.expression.replace(/\d+/g, "#")).join(" | ");
    });
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  test("Euclid: the division chain is the algorithm's own steps, ending at the HCF", () => {
    const t = FAMILIES.get("hcf")!.teach!.instance!([22, 72]);
    expect(t.representation).toMatchObject({ kind: "division-chain", rows: [{ dividend: 72, divisor: 22, quotient: 3, remainder: 6 }, { dividend: 22, divisor: 6, quotient: 3, remainder: 4 }, { dividend: 6, divisor: 4, quotient: 1, remainder: 2 }, { dividend: 4, divisor: 2, quotient: 2, remainder: 0 }] });
    expect(t.worked.result).toBe(2);
  });
});

describe("the Grade 10 showcase scope", () => {
  const scope = SHOWCASE.competencies.map(mod).filter(Boolean) as Module[];
  test("scope: 63 lessons; every remaining violation is an unchecked method, labelled Method, never Worked example", () => {
    expect(scope.length).toBe(63);
    for (const m of scope) for (const b of lessonBlocks(m)) {
      for (const v of b.violations) expect(v, `${m.competency} ${b.title}`).toBe("worked-unverified");
      if (b.violations.includes("worked-unverified")) expect(b.label).toBe("Method");
      if (b.label === ROLE_LABEL["worked-example"]) expect(b.worked?.verified).toBe(true);
    }
  }, LONG);

  test("curated lessons have no violations and no exemptions", () => {
    for (const c of SHOWCASE.curated) for (const b of lessonBlocks(mod(c))) {
      expect(b.violations, `${c} ${b.title}`).toEqual([]);
      expect(b.exempt, `${c} ${b.title}`).toEqual([]);
    }
  }, LONG);

  test("every exemption names a section that exists and is flagged, with a reason", () => {
    for (const e of EXEMPTIONS.entries) {
      expect(e.reason.length).toBeGreaterThan(20);
      const b = lessonBlocks(mod(e.competency)).find((x) => x.title === e.title);
      expect(b, `${e.competency} ${e.title}`).toBeDefined();
      expect(b!.exempt.map((x) => x.rule), `${e.competency} ${e.title}`).toContain(e.rule);
    }
  }, LONG);
});

describe("practice tests what was taught", () => {
  const MIXED = ["MATH.algebra.relations", "MATH.geometry.pythagoras", "MATH.probability.classical", "MATH.algebra.quadratic-discriminant", "MATH.algebra.figurate-numbers"];
  for (const c of MIXED) test(c, () => {
    const m = mod(c);
    const scope = teachingScopeFor(m);
    const ids = [...new Set([...modulePhasePool(m, "practice"), ...m.practice, ...m.transfer])].filter((id) => !needsMarking(question(id)) && !!problemOf(id) && scope.accepts(problemOf(id)!));
    const { blocks, practice: ordered } = teachingLesson(m, ids);
    const taught = blocks.find((b) => b.worked?.verified && b.instance) ?? blocks.find((b) => b.instance)!;
    const caseOf = FAMILIES.get(problemOf(taught.instance!)!.family)!.teach!.caseOf!;
    const first = problemOf(ordered[0].replace(/:mc$/, ""))!;
    expect(caseOf(first.params), `${c}: first practice ${ordered[0]}`).toBe(caseOf(problemOf(taught.instance!)!.params));
    const shown = new Set(blocks.flatMap((b) => (b.instance ? [exposureKey(b.instance)] : [])));
    expect(shown.has(exposureKey(ordered[0])), `${c}: practice starts with a question the lesson already used`).toBe(false);
    expect([...ordered].sort()).toEqual([...ids].sort());
  }, LONG);
});

describe("holdout: mixed-subtype families", () => {
  const HOLDOUT = ["affig", "ahpyth", "anbag"];
  test("questions the lessons never use, every case: taught as their own case", () => {
    const used = new Set(modules.flatMap((m) => [...m.chapter, ...m.strategies.flatMap((s) => s.screens)].flatMap((s) => (s.instance ? [s.instance] : []))));
    for (const fam of HOLDOUT) {
      const def = FAMILIES.get(fam)!, items = pool(fam).items.filter((p) => p.form === "typed" && !used.has(p.id));
      const byCase = new Map<string, typeof items>();
      for (const p of items) byCase.set(def.teach!.caseOf!(p.params), [...(byCase.get(def.teach!.caseOf!(p.params)) ?? []), p]);
      expect(byCase.size, fam).toBeGreaterThan(1);
      const titles = new Set<string>();
      for (const [kind, ps] of byCase) {
        for (const p of ps.slice(0, 40)) {
          const t = def.teach!.instance!(p.params);
          expect(checkRepresentation(t.representation!, p), `${p.id}`).toBe(true);
          expect(def.validate(p.params, t.worked.result), p.id).toBe(true);
        }
        const t0 = def.teach!.instance!(ps[0].params);
        titles.add(`${t0.concept.title}|${t0.representation?.kind}|${t0.worked.steps.length}|${JSON.stringify(t0.representation).match(/"label"/g)?.length ?? 0}`);
        expect(kind.length).toBeGreaterThan(2);
      }
      // the cases are not one template: their concept, picture or solution differ
      expect(titles.size, fam).toBeGreaterThan(1);
    }
  }, LONG);

  test("a mis-pairing across cases is caught: two-colour text on a three-colour bag", () => {
    const m = mod("MATH.probability.classical");
    const alt = FAMILIES.get("anbag")!.teach!.alternatives![0];
    const three = pool("anbag").items.find((p) => p.form === "typed" && p.params[2] > 0)!;
    const two = pool("anbag").items.find((p) => p.form === "typed" && p.params[2] === 0 && p.params[0] !== three.params[0])!;
    const wrong: Module = { ...m, strategies: [{ ...m.strategies[0], guided: three.id, screens: [{ title: "Out of how many?", role: "strategy", instance: three.id, text: alt.textFor!(two.params) }] }] };
    expect(lessonBlocks(wrong).find((b) => b.title === "Out of how many?")!.violations).toContain("text-not-instance");
  }, LONG);
});

describe("showcase readiness: each thing said once, solutions checked to the answer", () => {
  const CURATED6 = ["MATH.number.euclid-algorithm", "MATH.algebra.relations", "MATH.algebra.arithmetic-sequences", "MATH.algebra.quadratic-discriminant", "MATH.geometry.pythagoras", "MATH.probability.classical"];
  const pictureOf = (b: ReturnType<typeof lessonBlocks>[number]) => b.representation?.kind ?? (b.visual as { kind?: string } | null)?.kind ?? (b.widget as { type?: string } | null)?.type;
  for (const c of CURATED6) test(`${c}: no repeated sentence, picture or solution; the worked example follows the concept`, () => {
    const blocks = lessonBlocks(mod(c));
    const lines = blocks.flatMap((b) => b.text).map((t) => t.replace(/“[^”]*”|"[^"]*"/g, "#").replace(/[−-]?\d+/g, "#").trim());
    expect(new Set(lines).size, lines.join(" | ")).toBe(lines.length);
    const pics = blocks.flatMap((b) => (pictureOf(b) ? [pictureOf(b)!.replace(/^triangle$/, "right-triangle")] : []));
    expect(new Set(pics).size, pics.join(",")).toBe(pics.length);
    // the first checked solution is in the concept itself (relations) or the section straight after it
    const w = blocks.findIndex((b) => b.worked?.verified);
    expect(w, c).toBeGreaterThanOrEqual(0);
    expect(blocks.slice(0, w).every((b) => b.role === "concept")).toBe(true);
    // an unchecked solution is never shown beside the checked one
    expect(blocks.filter((b) => b.worked && !b.worked.verified)).toEqual([]);
    for (const b of blocks) if (b.label === ROLE_LABEL["worked-example"]) expect(b.worked?.verified).toBe(true);
  }, LONG);

  test("Euclid: the explanation is said once and the division table is drawn once, on the worked example", () => {
    const blocks = lessonBlocks(mod("MATH.number.euclid-algorithm"));
    expect(blocks.filter((b) => b.representation?.kind === "division-chain").map((b) => b.role)).toEqual(["worked-example"]);
    expect(blocks.flatMap((b) => b.text).filter((t) => t.startsWith("So the HCF does not change")).length).toBe(1);
  }, LONG);

  test("composite answers: a solution counts as complete only when its steps produce the answer", () => {
    const at = (c: string) => lessonBlocks(mod(c)).find((b) => b.title === "The method")!;
    // option, set, tuple, matrix, exact value: produced by the steps
    for (const c of ["MATH.algebra.quadratic-graphs", "MATH.algebra.sets", "MATH.algebra.linear-systems", "MATH.algebra.matrices", "MATH.trigonometry.ratios", "MATH.algebra.rational-expressions"]) expect(at(c).worked?.verified, c).toBe(true);
    // the primes of 255 are the divisors used, not results; the factorisation's last step is a check; the square root's last step multiplies back
    for (const c of ["MATH.number.prime-factorisation", "MATH.algebra.factorisation", "MATH.algebra.polynomial-square-root"]) {
      expect(at(c).label, c).toBe("Method");
      expect(at(c).violations, c).toEqual(["worked-unverified"]);
    }
    // explanations are the family's justifications, never a trace of the solver
    for (const b of lessonBlocks(mod("MATH.algebra.linear-systems"))) for (const s of b.worked?.steps ?? []) expect(s.explanation).not.toMatch(/→|: .* and /);
  }, LONG);

  test("sectors: 'fractions of a circle' is paired only with a plain sector, in its own angle and radius", () => {
    const b = lessonBlocks(mod("MATH.measurement.sectors")).find((x) => x.title === "Think in fractions of a circle")!;
    const p = problemOf(b.instance!)!;
    expect(p.params[0]).toBe(3);
    expect(b.violations).toEqual([]);
    expect(b.exempt).toEqual([]);
    expect(b.text.join(" ")).toContain(`${[60, 72, 90, 105, 115, 120, 135, 150][p.params[3]]}°`);
  }, LONG);
});
