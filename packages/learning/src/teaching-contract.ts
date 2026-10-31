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
import { explainStep, exposureKey, FAMILIES, parseProblem, problemOf, show, type Problem } from "./families";
import scopeData from "../../../content/learning/showcase-grade10.v1.json";
import exemptionData from "../../../content/learning/teaching-contract-exemptions.v1.json";
import type { Representation, TeachRole } from "./family-kit";
import { chapterExplanation, contentEligibility } from "./explanation-review";
import { familyStepExplanation, teachingPresentationFrom, teachingScopeFor, type TeachingVisual } from "./teaching-presentation";

/** The Grade 10 showcase scope (CBSE and Tamil Nadu lessons) and its curated lessons (stage 2). */
export const SHOWCASE = scopeData as { competencies: string[]; curated: string[] };
const SCOPE = new Set(SHOWCASE.competencies);
/** Reviewed decisions that a flagged section is not a defect (each with its reason), e.g. a general fact, not an example. */
export const EXEMPTIONS = exemptionData as { entries: { competency: string; title: string; rule: Violation; reason: string }[] };

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
  worked: { question: string; steps: { expression: string; explanation: string }[]; verified: boolean; source: "contract" | "kernel" | "compatibility" | "family-steps" } | null;
  /** A picture of the question's own mathematical object (teaching-contract@1 families). */
  representation: Representation | null;
  /** A typed picture from the teaching presentation (kernel and adapter families). */
  visual: TeachingVisual | null;
  /** The legacy picture, only when it is not decorative. */
  widget: Screen["widget"] | null;
  /** Which parts are mechanically verified, and which are explanations that still need educator review. */
  claims: { verified: string[]; review: string[] };
  violations: Violation[];
  /** Flags a reviewed exemption settles (not counted as violations; listed with their reasons). */
  exempt: { rule: Violation; reason: string }[];
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
    ...p.bugs.flatMap((b) => [...(b.predict === null ? [] : [...numbersIn(String(b.predict)), ...numbersIn(show(b.predict))]), ...numbersIn(b.says)]),
    ...extra.flatMap(numbersIn),
    0, 1, 2,
  ];
  return new Set(values);
}

export function checkRepresentation(r: Representation, p: Problem): boolean {
  const given = new Set(numbersIn(p.prompt));
  const howHolds = (how: string | undefined, value: number) => !how || !/^[\d\s()+\-−×÷^.]+$/.test(how) || holds(how, value);
  if (r.kind === "dot-array") return r.rows * r.cols === r.value && given.has(r.value);
  if (r.kind === "dot-triangle") return (r.rows * (r.rows + 1)) / 2 === r.value && given.has(r.value);
  if (r.kind === "right-triangle") {
    // the sides shown are the question's, exactly one is asked for, and with the checked answer in its place they satisfy a² + b² = c²
    const shown = [r.a, r.b, r.c].filter((x): x is number => x !== null);
    if (shown.length !== 2 || !shown.every((x) => given.has(x))) return false;
    const ans = numericAnswer(p.answer), [a, b, c] = [r.a ?? ans, r.b ?? ans, r.c ?? ans];
    return a * a + b * b === c * c;
  }
  if (r.kind === "counts") return r.items.every((it) => given.has(it.count)) && r.items.filter((it) => it.asked).length === 1;
  if (r.kind === "division-chain") {
    // each row is a true division, each divisor and remainder move down a row, it starts from the question's numbers and ends at 0
    const ok = r.rows.every((row, k) => row.dividend === row.quotient * row.divisor + row.remainder && row.remainder < row.divisor && (k === 0 || (row.dividend === r.rows[k - 1].divisor && row.divisor === r.rows[k - 1].remainder)));
    return ok && given.has(r.rows[0].dividend) && given.has(r.rows[0].divisor) && r.rows.at(-1)!.remainder === 0 && r.rows.at(-1)!.divisor === numericAnswer(p.answer);
  }
  return r.rows.length > 1 && r.rows.every((row, k) => row.n === (r.rows[0].n + k) && given.has(row.value) && howHolds(row.how, row.value));
}

/** The lesson as the learner sees it, with each section's role, label, checked parts and contract violations. */
export function lessonBlocks(module: Module, practiceIds: string[] = []): LessonBlock[] {
  const scope = teachingScopeFor(module);
  const exampleId = scope.strategyId ? module.strategies.find((s) => s.id === scope.strategyId)?.guided : undefined;
  const exampleProblem = exampleId ? problemOf(exampleId) : null;
  const primaryId = exampleId && exampleProblem && scope.accepts(exampleProblem) ? exampleId : practiceIds[0] ?? module.practice[0];
  const blocks = lessonScreens(module).map(({ screen, strategy }, index): LessonBlock => {
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
    // stage 2 (Grade 10 scope): a worked-example section with no checked presentation shows its question's own solution,
    // the family's solver steps, when that solution is complete and its result is the checked answer
    if (role === "worked-example" && !worked?.verified && !own && p && family && SCOPE.has(module.competency)) {
      const fs = familySteps(p);
      if (fs) {
        worked = fs.worked;
        verified.push(...fs.claims, `result ${p.answer} is the checked answer`);
        review.push(...fs.worked.steps.map((x) => x.explanation));
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
      // text the family's code writes for this question is aligned by construction (its wording still needs review);
      // family-level text must quote only this question's numbers
      if (screen.textFrom === "instance") review.push("(text written for this question by the family's code: aligned by construction, wording to review)");
      else if (screen.text.some((t) => numbersIn(t).some((v) => !allowed.has(Math.abs(v))))) violations.push("text-not-instance");
    }
    const label = role === "worked-example" ? (worked?.verified ? ROLE_LABEL["worked-example"] : "Method") : ROLE_LABEL[role];
    const exempt = EXEMPTIONS.entries.filter((e) => e.competency === module.competency && e.title === screen.title && violations.includes(e.rule)).map(({ rule, reason }) => ({ rule, reason }));
    return { role, label, title: screen.title, text: screen.text, instance: p?.id ?? null, worked, representation, visual, widget, claims: { verified, review }, violations: violations.filter((v) => !exempt.some((e) => e.rule === v)), exempt };
  });
  return SCOPE.has(module.competency) ? withoutRepetition(blocks) : blocks;
}

/** Stage 2 showcase scope: a lesson says each thing once. Applied after the checks, so it never hides a violation.
 *  - a sentence already said in an earlier section (the same wording with other numbers or names) is not said again;
 *  - each kind of picture is drawn once, on the checked worked example when it has one, otherwise where it first appears;
 *  - unchecked steps are not shown beside a checked worked example (only a Method section keeps its unchecked steps). */
const PICTURE_ALIAS: Record<string, string> = { triangle: "right-triangle" };
function pictureKind(b: LessonBlock) {
  const k = b.representation?.kind ?? (b.visual as { kind?: string } | null)?.kind ?? (b.widget as { type?: string } | null)?.type;
  return k ? PICTURE_ALIAS[k] ?? k : null;
}
function caseKey(id: string | null) {
  const p = id ? problemOf(id) : null;
  const caseOf = p ? FAMILIES.get(p.family)?.teach?.caseOf : undefined;
  // without the family's own cases, two questions are not known to be the same kind: nothing is treated as a repeat
  return p ? (caseOf ? `${p.family}:${caseOf(p.params)}` : p.id) : null;
}
export function withoutRepetition(blocks: LessonBlock[]): LessonBlock[] {
  const template = (line: string) => line.replace(/“[^”]*”|"[^"]*"/g, "#").replace(/[−-]?\d+(?:\.\d+)?/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
  const said = new Set<string>();
  const keepPicture = new Map<string, number>();
  blocks.forEach((b, i) => {
    const k = pictureKind(b);
    if (!k) return;
    if (!keepPicture.has(k) || (b.role === "worked-example" && b.worked?.verified && blocks[keepPicture.get(k)!].role !== "worked-example")) keepPicture.set(k, i);
  });
  const checkedCases = new Set(blocks.flatMap((b) => (b.worked?.verified ? [caseKey(b.instance)] : [])));
  // one checked solution per kind of question: a later, shorter one of the same kind is a repeat (its section keeps its words, as a Method)
  const solved = new Map<string, number>();
  const out = blocks.map((b, i) => {
    const text = b.text.filter((line) => { const t = template(line); if (said.has(t)) return false; said.add(t); return true; });
    const k = pictureKind(b);
    const picture = !k || keepPicture.get(k) === i;
    // unchecked steps are shown only as a lesson's labelled Method, never beside a checked worked example
    let worked = b.worked && !b.worked.verified && (checkedCases.has(caseKey(b.instance)) || (checkedCases.size > 0 && b.role !== "worked-example")) ? null : b.worked;
    let label = b.label;
    if (worked?.verified) {
      const key = caseKey(b.instance)!, before = solved.get(key);
      if (before !== undefined && before >= worked.steps.length) { worked = null; if (b.role === "worked-example") label = "Method"; }
      else solved.set(key, Math.max(before ?? 0, worked.steps.length));
    }
    // a quoted question that refers to a picture the section does not draw
    const hasPicture = picture && !!k;
    return { ...b, label, text: hasPicture ? text : text.map((line) => line.replace(/, as in the picture(?=[.?])/g, "")), worked, ...(picture ? {} : { representation: null, visual: null, widget: null }) };
  });
  // the journey is concept, then worked example: a checked worked example comes straight after the concept sections
  const w = out.findIndex((b) => b.role === "worked-example" && b.worked?.verified);
  const lastConcept = out.reduce((n, b, i) => (b.role === "concept" ? i : n), -1);
  if (w > lastConcept + 1) out.splice(lastConcept + 1, 0, ...out.splice(w, 1));
  return out;
}

/** The question's own solution from the family's solver: steps, explanations, the arithmetic claims that hold, and whether the
 *  solution is complete (its last step's value is the checked answer, which the family's independent check accepts). */
export function familySteps(p: Problem): { worked: NonNullable<LessonBlock["worked"]>; claims: string[] } | null {
  const family = FAMILIES.get(p.family);
  if (!family || !p.steps.length) return null;
  const answer = numericAnswer(p.answer);
  const last = p.steps.at(-1)!;
  const lastValue = typeof last.value === "number" ? last.value : Array.isArray(last.value) ? NaN : numericAnswer(String(last.value));
  // the last step's value is the answer (as a number, or exactly as the answer is written), and the family's independent check accepts it
  const sameValue = (Number.isFinite(answer) && Math.abs(lastValue - answer) < 1e-9) || squash(show(last.value)) === squash(p.answer) || reachesComposite(p);
  // the family's independent check accepts the stored answer (families take a number, the written answer, a list, or an option index)
  const forms: unknown[] = [p.answer, signedNumbers(p.answer), ...(Number.isFinite(answer) ? [answer] : []), ...(/^[A-D]$/.test(p.answer) ? ["ABCD".indexOf(p.answer)] : [])];
  const checked = forms.some((v) => { try { return family.validate(p.params, v as never); } catch { return false; } });
  const complete = sameValue && checked;
  const OPS: Record<string, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };
  const claims = p.steps.flatMap((st) => {
    const [a, b] = st.inputs;
    if (!OPS[st.op] || typeof a !== "number" || typeof b !== "number" || typeof st.value !== "number") return [];
    const expr = `${a < 0 ? `(${a})` : a} ${OPS[st.op]} ${b < 0 ? `(${b})` : b}`;
    return holds(expr, st.value) ? [`${expr} = ${st.value}`] : [];
  });
  // a step's explanation is shown only when the family states why the step holds (its justification); the generic fallback is a
  // trace of the solver's operation ("subtract: 2 and −4 → −2"), not an explanation, so the step's own sentence stands alone
  const steps = p.steps.map((st) => ({ expression: displayStep(p, st), explanation: st.justification ? familyStepExplanation(p, st) : "" }));
  if (steps.some((x) => !x.expression)) return null;
  return { worked: { question: question(p.id).prompt, steps, verified: complete, source: "family-steps" }, claims };
}
const squash = (x: string) => x.replace(/\s+/g, "").replace(/−/g, "-");
/** Signed numbers as written: "(x − 1)" gives −1, "(−3, 4)" gives −3 and 4. */
const signedNumbers = (x: string) => [...x.replace(/−/g, "-").matchAll(/([+-])?\s*(\d+(?:\.\d+)?)/g)].map((m) => (m[1] === "-" ? -1 : 1) * Number(m[2]));
/** Steps that reach an answer that is not one number: an option (the last step picks it), a matrix (its rows, in order), or a
 *  tuple (every component is the result of a step). Only step results count, never the question's data. */
function reachesComposite(p: Problem) {
  const last = p.steps.at(-1)!;
  if (/^[A-D]$/.test(p.answer)) return typeof last.value === "number" && "ABCD"[last.value] === p.answer;
  const values = p.steps.map((st) => st.value);
  if (p.answer.startsWith("[[")) {
    const rows = values.filter((v): v is string => typeof v === "string" && v.startsWith("["));
    return rows.length > 0 && JSON.stringify(rows.flatMap(signedNumbers)) === JSON.stringify(signedNumbers(p.answer));
  }
  if (p.answer.startsWith("(")) {
    const got = values.flatMap((v) => (typeof v === "number" ? [v] : typeof v === "string" && v.startsWith("(") ? signedNumbers(v) : Array.isArray(v) ? v.filter((x): x is number => typeof x === "number") : []));
    const want = signedNumbers(p.answer);
    return want.length > 1 && want.every((w) => got.some((g) => Math.abs(g - w) < 1e-9));
  }
  return false;
}
const displayStep = (p: Problem, st: Problem["steps"][number]) => {
  try { return explainStep(p, st); } catch { return ""; }
};

/** Practice after a lesson starts with questions of the same kind as the one it worked through (a family that mixes kinds
 *  gives `teach.caseOf`); the other kinds follow, so practice tests what was just taught. Written answers come before multiple choice
 *  within each group, and questions already solved on the page come last. */
export function alignedPractice(module: Module, ids: string[]): string[] {
  const scope = teachingScopeFor(module);
  const family = scope.family ? FAMILIES.get(scope.family) : undefined;
  const caseOf = family?.teach?.caseOf;
  // the lesson is assembled from the candidate list as given (not from the reordered one), so the order never changes what is taught
  const blocks = lessonBlocks(module, ids);
  // a question the lesson has already used (its answer or its common wrong answer is on the page) is not practice: it goes last
  // any question the lesson itself uses (solved, or quoted with its common wrong answer) is not fresh practice
  const shown = new Set(blocks.flatMap((b) => (b.instance ? [exposureKey(b.instance)] : [])));
  const isShown = (id: string) => shown.has(exposureKey(id));
  const taught = blocks.find((b) => b.worked?.verified && b.instance) ?? blocks.find((b) => b.instance);
  const tp = caseOf && taught?.instance ? problemOf(taught.instance) : null;
  const kind = tp && tp.family === scope.family ? caseOf!(tp.params) : null;
  const same = (id: string) => { if (kind === null) return false; const q = problemOf(id.replace(/:mc$/, "")); return !!q && q.family === tp!.family && caseOf!(q.params) === kind; };
  // within each group a written answer comes before a multiple-choice one: the first attempt after a worked example is the learner's own
  const rank = (id: string) => (isShown(id) ? 4 : same(id) ? 0 : 2) + (question(id).type === "choice" ? 1 : 0);
  return ids.map((id, i) => [rank(id), i, id] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((x) => x[2]);
}

/** The teaching page's lesson and its practice queue, from one candidate list (already filtered by the caller's selector):
 *  the sections are built from the candidates in their given order, and practice is the same candidates aligned to what those
 *  sections taught, so reordering practice never changes what is taught. */
export function teachingLesson(module: Module, candidates: string[]) {
  // explanation-review@1: a lesson page shows only the concept section and explanations cleared for the current teaching mode (a
  // general lesson: no misconception is claimed about the reader); blocked, unregistered or changed-since-review content is left out
  const req = { competency: module.competency, usage: "lesson" as const };
  const chapter = contentEligibility(module, chapterExplanation(module), req);
  const kept = module.strategies.map((s) => ({ s, e: contentEligibility(module, s, req) })).filter((x) => x.e.eligible);
  const shown = { ...module, chapter: chapter.eligible ? module.chapter : [], strategies: kept.map((x) => x.s) };
  const all = [...(chapter.eligible ? [chapter] : []), ...kept.map((x) => x.e)];
  const contentLabel = all.length && all.every((e) => e.educatorApproved) ? "Approved by an educator for supervised evaluation." : "Demonstration: these explanations have not been approved by an educator.";
  return { blocks: lessonBlocks(shown, candidates), practice: alignedPractice(shown, candidates), candidates, contentLabel };
}

/** Platform-wide violation counts (the ratchet baseline): by rule, and by module. */
export function contractReport(modules: Module[]) {
  const byRule: Record<string, number> = {};
  const byModule: Record<string, Partial<Record<Violation, number>>> = {};
  let sections = 0, workedVerified = 0, workedLabelled = 0;
  const exempted: Record<string, number> = {};
  for (const m of modules) {
    for (const b of lessonBlocks(m)) {
      sections++;
      if (b.worked?.verified) workedVerified++;
      if (b.label === ROLE_LABEL["worked-example"]) workedLabelled++;
      for (const e of b.exempt) exempted[e.rule] = (exempted[e.rule] ?? 0) + 1;
      for (const v of b.violations) {
        byRule[v] = (byRule[v] ?? 0) + 1;
        (byModule[m.competency] ??= {})[v] = (byModule[m.competency][v] ?? 0) + 1;
      }
    }
  }
  return { contract: TEACHING_CONTRACT, modules: modules.length, sections, workedVerified, workedLabelled, byRule, exempted, byModule };
}

export const lessonFor = (competency: string) => moduleFor(competency);

/** Teaching eligibility (adaptive-loop repair): whether a module's strategy may be used as an intervention. Eligible only when
 *  every one of its sections was checked against the contract and none has an outstanding violation (a reviewed exemption
 *  is not a violation). This is a machine check: "eligible" never means educator-approved. */
export interface TeachingEligibility { eligible: boolean; checked: boolean; violations: string[]; review: "machine-checked" | "not-checked" }
const eligibilityCache = new Map<string, Map<string, TeachingEligibility>>();
export function teachingEligibility(module: Module, strategy: Strategy): TeachingEligibility {
  let byStrategy = eligibilityCache.get(module.competency);
  if (!byStrategy) eligibilityCache.set(module.competency, (byStrategy = new Map()));
  const hit = byStrategy.get(strategy.id);
  if (hit) return hit;
  // the strategy's own sections, assembled exactly as a lesson assembles them (the module's idea first, then this strategy)
  const blocks = lessonBlocks({ ...module, strategies: [strategy] }).slice(1).filter((b) => strategy.screens.some((s) => s.title === b.title));
  const checked = blocks.length > 0;
  const violations = [...new Set(blocks.flatMap((b) => b.violations.map((v) => `${b.title}: ${v}`)))];
  const out: TeachingEligibility = { eligible: checked && !violations.length, checked, violations, review: checked ? "machine-checked" : "not-checked" };
  byStrategy.set(strategy.id, out);
  return out;
}
