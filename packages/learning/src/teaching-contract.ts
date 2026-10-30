/**
 * teaching-contract@1: how a lesson is assembled from its sections, and what is checked about each section.
 *
 * A lesson is a sequence of sections, each with a pedagogical role:
 *   concept          what the idea is, for the section's own question
 *   worked-example   a complete solution of one concrete question: its steps, why each step holds, and its result
 *   strategy         another way of thinking about a question it applies to
 *   misconception    a common wrong answer to a concrete question, and why it is wrong
 *   prerequisite     what the skill builds on
 * Only a worked-example section whose solution is complete and checked is labelled "Worked example".
 *
 * What is checked here is mechanical: the section's text, solution and picture refer to the same question (its
 * `instance`); every arithmetic claim in a solution evaluates to the value it states; the result is the question's
 * checked answer; a picture's data are those of the question. None of this establishes that the teaching is good:
 * explanations, the choice of representation and the order of ideas still need an educator's approval, and every
 * section lists which of its parts are mechanically verified and which await review.
 */
import { moduleFor, question, type Module, type Screen, type Strategy } from "./content";
import { FAMILIES, parseProblem, problemOf, type Problem } from "./families";
import type { Representation, TeachRole } from "./family-kit";
import { teachingPresentationFrom, teachingScopeFor, type TeachingVisual } from "./teaching-presentation";

export const TEACHING_CONTRACT = "teaching-contract@1" as const;

export const ROLE_LABEL: Record<TeachRole, string> = {
  concept: "The idea",
  "worked-example": "Worked example",
  strategy: "Another way",
  misconception: "Common mistake",
  prerequisite: "It builds on",
};

export type Violation =
  | "worked-unverified" //       a section meant as a worked example whose solution is not complete and checked
  | "claim-false" //             an arithmetic claim in a solution does not hold
  | "result-mismatch" //         the solution's result is not the question's checked answer
  | "no-instance" //             a teaching section that is not tied to a concrete question
  | "text-not-instance" //       the text quotes numbers that are not in its question, solution or picture
  | "decorative-visual" //       a picture that does not show the mathematics (dots to look at), presented as teaching
  | "representation-mismatch"; // the picture's data are not those of the question

export interface LessonBlock {
  role: TeachRole;
  /** What the learner reads above the section: "Worked example" only when the solution is complete and checked. */
  label: string;
  title: string;
  text: string[];
  instance: string | null;
  worked: { question: string; steps: { expression: string; explanation: string }[]; verified: boolean; source: "contract" | "kernel" | "compatibility" } | null;
  /** A picture of the question's own mathematical object (teaching-contract@1 families). */
  representation: Representation | null;
  /** A typed picture from the teaching presentation (kernel and adapter families). */
  visual: TeachingVisual | null;
  /** The legacy picture, only when it is not decorative. */
  widget: Screen["widget"] | null;
  /** Which parts are mechanically verified, and which are explanations that still need educator review. */
  claims: { verified: string[]; review: string[] };
  violations: Violation[];
}

// ---------------------------------------------------------------- arithmetic claims

/** Evaluates a plain arithmetic expression (numbers, + − × ÷ ^ and brackets). Throws on anything else. */
export function evalArithmetic(expr: string): number {
  const src = expr.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  let i = 0;
  const peek = () => src[i];
  const num = (): number => {
    const m = /^\d+(?:\.\d+)?/.exec(src.slice(i));
    if (!m) throw new Error(`not arithmetic: ${expr}`);
    i += m[0].length;
    return Number(m[0]);
  };
  const atom = (): number => {
    if (peek() === "(") { i++; const v = sum(); if (peek() !== ")") throw new Error(`unbalanced: ${expr}`); i++; return v; }
    if (peek() === "-") { i++; return -atom(); }
    return num();
  };
  const power = (): number => { const b = atom(); if (peek() === "^") { i++; return b ** power(); } return b; };
  const product = (): number => {
    let v = power();
    for (;;) {
      if (peek() === "*") { i++; v *= power(); } else if (peek() === "/") { i++; const d = power(); if (d === 0) throw new Error("division by zero"); v /= d; } else return v;
    }
  };
  const sum = (): number => {
    let v = product();
    for (;;) {
      if (peek() === "+") { i++; v += product(); } else if (peek() === "-") { i++; v -= product(); } else return v;
    }
  };
  const v = sum();
  if (i !== src.length) throw new Error(`not arithmetic: ${expr}`);
  return v;
}
const holds = (expr: string, value: number) => {
  try { return Math.abs(evalArithmetic(expr) - value) < 1e-9; } catch { return false; }
};

// ---------------------------------------------------------------- assembly

const numbersIn = (text: string) => (text.replace(/−/g, "-").match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const numericAnswer = (answer: string) => {
  const f = /^(-?\d+)\/(-?\d+)$/.exec(answer);
  return f ? Number(f[1]) / Number(f[2]) : Number(answer);
};
const decorative = (w: Screen["widget"] | undefined) => !!w && w.type === "dots";

/** The sections a learner's lesson shows: the idea, then the ways of explaining that are about this lesson's questions. */
export function lessonScreens(module: Module): { screen: Screen; strategy: Strategy | null }[] {
  const scope = teachingScopeFor(module);
  const scoped = module.strategies.filter((s) => {
    const p = problemOf(s.guided);
    return !!p && scope.accepts(p);
  });
  const seen = new Set<string>();
  return [{ screen: module.chapter[0], strategy: null as Strategy | null }, ...scoped.flatMap((s) => s.screens.map((screen) => ({ screen, strategy: s })))].filter(({ screen }) => {
    if (!screen) return false;
    const key = JSON.stringify([screen.title, screen.text, screen.math, screen.widget]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A section's role: as assembled (teaching-contract@1), or for a hand-written module, from where the section sits. */
export function roleOf(screen: Screen, strategy: Strategy | null): TeachRole {
  if (screen.role) return screen.role;
  if (!strategy) return "concept";
  if (strategy.kind === "prerequisite") return "prerequisite";
  if (strategy.id === "spot_the_mistake") return "misconception";
  return "strategy";
}

/** Every number a section may quote: those of its question, its solution, its picture and its question's diagnosed answers. */
function instanceNumbers(p: Problem, extra: string[]): Set<number> {
  const values = [
    ...numbersIn(p.prompt), ...p.params.map((x) => Math.abs(x)), ...numbersIn(p.answer),
    ...p.steps.flatMap((st) => [...st.inputs, st.value].flatMap((v) => numbersIn(String(v)))),
    // the family's diagnoses are computed from the same parameters, so the numbers they quote belong to this question
    ...p.bugs.flatMap((b) => [...(b.predict === null ? [] : numbersIn(String(b.predict))), ...numbersIn(b.says)]),
    ...extra.flatMap(numbersIn),
    0, 1, 2,
  ];
  return new Set(values);
}

function checkRepresentation(r: Representation, p: Problem): boolean {
  const given = new Set(numbersIn(p.prompt));
  const howHolds = (how: string | undefined, value: number) => !how || !/^[\d\s()+\-−×÷^.]+$/.test(how) || holds(how, value);
  if (r.kind === "dot-array") return r.rows * r.cols === r.value && given.has(r.value);
  if (r.kind === "dot-triangle") return (r.rows * (r.rows + 1)) / 2 === r.value && given.has(r.value);
  return r.rows.length > 1 && r.rows.every((row, k) => row.n === (r.rows[0].n + k) && given.has(row.value) && howHolds(row.how, row.value));
}

/** The lesson as the learner sees it, with each section's role, label, checked parts and contract violations. */
export function lessonBlocks(module: Module, practiceIds: string[] = []): LessonBlock[] {
  const scope = teachingScopeFor(module);
  const exampleId = scope.strategyId ? module.strategies.find((s) => s.id === scope.strategyId)?.guided : undefined;
  const exampleProblem = exampleId ? problemOf(exampleId) : null;
  const primaryId = exampleId && exampleProblem && scope.accepts(exampleProblem) ? exampleId : practiceIds[0] ?? module.practice[0];
  return lessonScreens(module).map(({ screen, strategy }, index) => {
    const role = roleOf(screen, strategy);
    const violations: Violation[] = [];
    const verified: string[] = [];
    const review: string[] = [...screen.text];
    // the first section of a lesson not yet taught instance by instance keeps the teaching-first page's example (the scope's
    // own strategy example), as before; a teaching-contract@1 lesson uses each section's own question
    const contractLesson = !!(scope.family && FAMILIES.get(scope.family)?.teach?.instance);
    const instanceId = index === 0 && !contractLesson && primaryId ? primaryId.replace(/:mc$/, "") : screen.instance ?? (index === 0 && primaryId ? primaryId.replace(/:mc$/, "") : null);
    const p = instanceId ? problemOf(instanceId) : null;
    const family = p ? FAMILIES.get(p.family) : undefined;
    const own = p && family?.teach?.instance ? family.teach.instance(p.params) : null;
    let worked: LessonBlock["worked"] = null;
    let visual: TeachingVisual | null = null;
    let representation: Representation | null = null;
    const answer = p ? numericAnswer(p.answer) : NaN;
    const answerChecks = !!p && !!family && Number.isFinite(answer) && family.validate(p.params, answer);

    if (own && p) {
      // teaching-contract@1 family: the section's question supplies its concept, solution and picture
      // the concept shows the question's own object; a strategy shows its own picture (made from the same question) when it has one
      if (role === "concept" || role === "worked-example" || (role === "strategy" && !screen.widget)) representation = own.representation ?? null;
      if (role === "worked-example") {
        const steps = own.worked.steps;
        const claims = steps.flatMap((s) => s.claims ?? []);
        const claimsHold = claims.every((c) => holds(c.expr, c.value));
        if (!claimsHold) violations.push("claim-false");
        const resultHolds = own.worked.result === answer && answerChecks;
        if (!resultHolds) violations.push("result-mismatch");
        const complete = steps.length > 0 && steps.every((s) => s.expression && s.explanation);
        worked = { question: question(p.id).prompt, steps: steps.map(({ expression, explanation }) => ({ expression, explanation })), verified: complete && claimsHold && resultHolds && claims.length > 0, source: "contract" };
        verified.push(...claims.map((c) => `${c.expr} = ${c.value}`), `result ${own.worked.result} is the checked answer`);
        review.push(...steps.map((s) => s.explanation));
      }
      if (representation) {
        if (checkRepresentation(representation, p)) verified.push(`picture: ${representation.kind} of the question's own values`);
        else violations.push("representation-mismatch");
      }
    } else if (p) {
      // kernel or adapter family (unchanged from the teaching-first page): the first section's example, or the question a
      // section's own working shows, carries the presentation's checked worked example and typed picture
      const parsed = screen.math?.[0] ? parseProblem(screen.math[0]) : null;
      const shown = index === 0 ? p : parsed?.supported ? parsed.problem : null;
      const pres = shown ? teachingPresentationFrom({ module, screen, problem: shown, question: question(shown.id), practiceIds }) : null;
      if (pres) {
      visual = pres.visual ?? null;
      if (pres.workedExample) {
        const last = pres.workedExample.steps.at(-1)?.expression ?? "";
        const shownAnswer = numericAnswer(shown!.answer), shownFamily = FAMILIES.get(shown!.family);
        const shownChecks = !!shownFamily && Number.isFinite(shownAnswer) && shownFamily.validate(shown!.params, shownAnswer);
        // the solution is complete only when its last step states the result
        const showsResult = last.replace(/−/g, "-").includes(shown!.answer.replace(/−/g, "-")) || numbersIn(last).some((v) => Math.abs(v - Math.abs(shownAnswer)) < 1e-9);
        worked = { question: pres.workedExample.question, steps: pres.workedExample.steps.map(({ expression, explanation }) => ({ expression, explanation })), verified: pres.status === "supported" && shownChecks && showsResult, source: pres.teachingSource === "kernel" ? "kernel" : "compatibility" };
        if (worked.verified) verified.push(`worked steps checked by the ${worked.source === "kernel" ? "maths kernel" : "family adapter"}; result is the checked answer`);
        review.push(...worked.steps.map((s) => s.explanation));
      }
      }
    }
    if (role === "worked-example" && !worked?.verified) violations.push("worked-unverified");
    if (role !== "prerequisite" && !p) violations.push("no-instance");
    const widget = screen.widget && !decorative(screen.widget) ? screen.widget : null;
    if (decorative(screen.widget)) violations.push("decorative-visual");
    if (p && role !== "prerequisite") {
      const allowed = instanceNumbers(p, [
        ...(worked?.steps.map((s) => s.expression) ?? []),
        ...(screen.math ?? []),
        JSON.stringify(representation ?? {}), JSON.stringify(visual ?? {}), JSON.stringify(widget ?? {}),
      ]);
      if (screen.text.some((t) => numbersIn(t).some((v) => !allowed.has(Math.abs(v))))) violations.push("text-not-instance");
    }
    const label = role === "worked-example" ? (worked?.verified ? ROLE_LABEL["worked-example"] : "Method") : ROLE_LABEL[role];
    return { role, label, title: screen.title, text: screen.text, instance: p?.id ?? null, worked, representation, visual, widget, claims: { verified, review }, violations };
  });
}

/** Platform-wide violation counts (the ratchet baseline): by rule, and by module. */
export function contractReport(modules: Module[]) {
  const byRule: Record<string, number> = {};
  const byModule: Record<string, Partial<Record<Violation, number>>> = {};
  let sections = 0, workedVerified = 0, workedLabelled = 0;
  for (const m of modules) {
    for (const b of lessonBlocks(m)) {
      sections++;
      if (b.worked?.verified) workedVerified++;
      if (b.label === ROLE_LABEL["worked-example"]) workedLabelled++;
      for (const v of b.violations) {
        byRule[v] = (byRule[v] ?? 0) + 1;
        (byModule[m.competency] ??= {})[v] = (byModule[m.competency][v] ?? 0) + 1;
      }
    }
  }
  return { contract: TEACHING_CONTRACT, modules: modules.length, sections, workedVerified, workedLabelled, byRule, byModule };
}

export const lessonFor = (competency: string) => moduleFor(competency);
