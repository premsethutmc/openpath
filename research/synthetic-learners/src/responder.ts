/**
 * Synthetic response generation (synthetic-responder@1). The learner reads the visible question, carries out each step of its own method with
 * the chance its hidden state gives, makes its misconceptions' errors where they apply, slips in arithmetic, and writes working in its own
 * style. The answer comes out of these rules; no OpenPath verdict, answer key or estimate is consulted.
 */
import { ability, type HiddenState, type Misconception, type Profile } from "./model";
import { add, div, isZero, mul, q, show, sub, type Q } from "./rational";
import { readEquation, readTask, type Kind, type Linear, type Story, type Task } from "./reading";
import type { Rng } from "./rng";

/** what a learner can see of a question (no ids, no answer key, no estimate) */
export interface QuestionView { prompt: string; input: { type: "numeric" | "multiple-choice" | string; choices?: { id: string; label: string }[] }; hintAvailable: boolean; hintShown: boolean }
export type Response = { kind: "answer"; answer: string; working: string[] } | { kind: "hint" };
/** the simulator's own account of how it produced a response (hidden; never sent to OpenPath) */
export interface Reasoning { task: Task["kind"]; mode: "solved" | "guessed" | "not-understood"; steps: { step: string; outcome: string }[]; value: string | null; style: string; correctMethod: boolean }

type L = { A: Q; B: Q; C: Q; D: Q };
const fmtSide = (x: Q, c: Q) => {
  const xs = isZero(x) ? "" : x.d === 1 && x.n === 1 ? "x" : x.d === 1 && x.n === -1 ? "-x" : `${show(x)}x`;
  if (!xs) return show(c);
  if (isZero(c)) return xs;
  return c.n < 0 ? `${xs} - ${show(q(-c.n, c.d))}` : `${xs} + ${show(c)}`;
};
const line = (e: L) => `${fmtSide(e.A, e.B)} = ${fmtSide(e.C, e.D)}`;
/** the operation-on-both-sides notation is written only for a step the learner actually did right; an erroneous step is written as its plain
 *  result, so the error stays on the line where it was made */
const rightStep = (c: { steps: { outcome: string }[] }) => c.steps.at(-1)?.outcome === "correct";
const nudge = (x: Q, rng: Rng) => add(x, q(rng.chance(0.5) ? 1 : -1));
/** "… − b" / "… + b" written as the operation done to both sides ("unsupported notation": the operation shown on each side) */
const minus = (x: Q) => (x.n < 0 ? `+ ${show(q(-x.n, x.d))}` : `- ${show(x)}`);

const has = (c: { s: HiddenState }, m: Misconception) => (c.s.misconception[m] ?? 0) > 0;   // S2 patterns: drawn only when held (no extra draw otherwise)
interface Ctx { s: HiddenState; p: Profile; rng: Rng; help: number; steps: Reasoning["steps"]; forced?: Misconception }
/** one step: misconception opportunities first, then the skill, then an arithmetic slip */
function step<T>(c: Ctx, name: string, kind: Kind, bugs: { id: Misconception; apply: () => T }[], correct: () => T, conceptual: () => T, slip: (v: T) => T): T {
  // (the outcome of the last step is c.steps.at(-1).outcome: "correct" exactly when the step was done right, with no slip)
  let v: T | null = null, out = "";
  for (const b of bugs) if (c.forced === b.id || (!c.forced && c.rng.chance(c.s.misconception[b.id] ?? 0))) { v = b.apply(); out = `misconception:${b.id}`; break; }
  if (v === null) { if (c.forced || c.rng.chance(Math.min(1, ability(c.s, kind) + c.help))) { v = correct(); out = "correct"; } else { v = conceptual(); out = "conceptual-error"; } }
  if (!c.forced && c.rng.chance(c.p.slip)) { v = slip(v); out += "+slip"; }
  c.steps.push({ step: name, outcome: out });
  return v;
}

/** solve A x + B = C x + D (with a bracket k(x+s) on the left when present) by the learner's own method */
function solveLinear(eq: Linear, item: Kind, c: Ctx): { lines: string[]; value: Q | null; unsupported: string[] } {
  const lines: string[] = [], uns: string[] = [];
  const procKind: Kind = item === "one-step" ? "one-step" : "two-step";
  if (eq.op === "divide") {   // x ÷ n = d
    const n = q(eq.b), d = q(eq.d);
    const v = step(c, "undo-divide", "one-step", [{ id: "inverse-operation", apply: () => div(d, n) }], () => mul(d, n), () => add(mul(d, n), q(c.rng.int(1, 3))), (x) => nudge(x, c.rng));
    const inv = c.steps.at(-1)!.outcome.startsWith("misconception:");
    lines.push(inv ? `x = ${show(d)}/${show(n)}` : `x = ${show(d)}*${show(n)}`, `x = ${show(v)}`); uns.push(lines[0]);
    return { lines: lines.filter((x, i, a) => a.indexOf(x) === i), value: v, unsupported: [uns[0], `x = ${show(v)}`].filter((x, i, a) => a.indexOf(x) === i) };
  }
  let e: L = { A: q(eq.a), B: q(eq.b), C: q(eq.c), D: q(eq.d) };
  if (eq.bracket) {
    const { k, s } = eq.bracket;
    e = step<L>(c, "distribute", "brackets",
      [{ id: "first-term-only", apply: () => ({ ...e, A: q(k), B: q(s) }) }, ...(has(c, "bracket-add") ? [{ id: "bracket-add" as Misconception, apply: () => ({ ...e, A: q(k), B: q(k + s) }) }] : []), ...(s < 0 ? [{ id: "bracket-sign" as Misconception, apply: () => ({ ...e, A: q(k), B: q(k * -s) }) }] : [])],
      () => ({ ...e, A: q(k), B: q(k * s) }), () => ({ ...e, A: q(k), B: q(k * s + c.rng.pick([-2, -1, 1, 2])) }), (x) => ({ ...x, B: nudge(x.B, c.rng) }));
    lines.push(line(e)); uns.push(rightStep(c) ? `${k}*x + ${k}*${s < 0 ? `(${s})` : s} = ${fmtSide(e.C, e.D)}` : line(e));
  }
  if (!isZero(e.C)) {
    const C = e.C, pre = e;
    e = step<L>(c, "collect-x", "both-sides",
      [{ id: "only-one-side", apply: () => ({ ...e, C: q(0) }) }, ...(has(c, "coefficient-dropped") ? [{ id: "coefficient-dropped" as Misconception, apply: () => ({ ...e, A: q(1), C: q(0) }) }] : []), { id: "x-sign-kept", apply: () => ({ ...e, A: add(e.A, C), C: q(0) }) }],
      () => ({ ...e, A: sub(e.A, C), C: q(0) }), () => ({ ...e, A: add(sub(e.A, C), q(c.rng.pick([-1, 1]))), C: q(0) }), (x) => ({ ...x, A: nudge(x.A, c.rng) }));
    lines.push(line(e)); uns.push(rightStep(c) ? `${fmtSide(pre.A, pre.B)} ${minus(C)}x = ${fmtSide(C, pre.D)} ${minus(C)}x` : line(e));
  }
  if (isZero(e.A)) return { lines, value: null, unsupported: uns };
  if (!isZero(e.B)) {
    const B = e.B, pre = e;
    const both = item === "both-sides" || item === "brackets";
    const divFirst = item === "two-step" && !c.forced && c.rng.chance(c.s.misconception["divided-first"] ?? 0);
    if (divFirst) {   // divides only the right-hand side by A, then undoes B
      c.steps.push({ step: "divide-first", outcome: "misconception:divided-first" });
      const R = div(e.D, e.A); lines.push(`x + ${show(B)} = ${show(R)}`); const v = sub(R, B); lines.push(`x = ${show(v)}`);
      return { lines, value: v, unsupported: [...uns, `x + ${show(B)} = ${show(e.D)}/${show(e.A)}`, `x = ${show(v)}`] };
    }
    e = step<L>(c, "move-constant", procKind,
      [{ id: (both ? "number-sign-kept" : "added-not-subtracted") as Misconception, apply: () => ({ ...e, B: q(0), D: add(e.D, B) }) }, ...(has(c, "reversed-subtraction") ? [{ id: "reversed-subtraction" as Misconception, apply: () => ({ ...e, B: q(0), D: sub(B, e.D) }) }] : []), ...(item === "one-step" ? [{ id: "inverse-operation" as Misconception, apply: () => ({ ...e, B: q(0), D: add(e.D, B) }) }] : [])],
      () => ({ ...e, B: q(0), D: sub(e.D, B) }), () => ({ ...e, B: q(0), D: add(sub(e.D, B), q(c.rng.pick([-2, 2]))) }), (x) => ({ ...x, D: nudge(x.D, c.rng) }));
    const usedPlus = c.steps.at(-1)!.outcome.startsWith("misconception:");
    if (item === "one-step" && e.A.n === e.A.d) lines.push(`x = ${show(pre.D)} ${usedPlus ? (B.n < 0 ? `- ${show(q(-B.n, B.d))}` : `+ ${show(B)}`) : minus(B)}`);   // one step: the operation, then the result
    uns.push(rightStep(c) ? `${fmtSide(pre.A, B)} ${minus(B)} = ${show(pre.D)} ${minus(B)}` : line(e));
    lines.push(line(e));
  }
  if (e.A.n === e.A.d) { const v = e.D; if (lines.at(-1) !== `x = ${show(v)}`) lines.push(`x = ${show(v)}`); return { lines, value: v, unsupported: [...uns, `x = ${show(v)}`] }; }
  const A = e.A, D = e.D;
  const v = step<Q>(c, "divide", procKind,
    [{ id: "forgot-divide", apply: () => D }, { id: "divide-wrong-way", apply: () => div(A, D) }, ...(has(c, "negate-on-divide") ? [{ id: "negate-on-divide" as Misconception, apply: () => q(-1 * div(D, A).n, div(D, A).d) }] : []), ...(item === "one-step" ? [{ id: "inverse-operation" as Misconception, apply: () => sub(D, A) }] : [])],
    () => div(D, A), () => mul(D, A), (x) => nudge(x, c.rng));
  const how = c.steps.at(-1)!.outcome;
  if (item === "one-step") { const op = how.startsWith("misconception:inverse-operation") ? `x = ${show(D)} - ${show(A)}` : how.startsWith("misconception:divide-wrong-way") ? `x = ${show(A)}/${show(D)}` : how.startsWith("misconception:forgot-divide") ? null : `x = ${show(D)}/${show(A)}`; if (op && op !== `x = ${show(v)}`) lines.push(op); }
  lines.push(`x = ${show(v)}`); uns.push(rightStep(c) ? `${show(A)}x/${show(A)} = ${show(D)}/${show(A)}` : `x = ${show(v)}`, `x = ${show(v)}`);
  return { lines, value: v, unsupported: uns };
}

/** the learner's equation for a story (modelling), right or with a formation error */
function formEquation(st: Story, c: Ctx): { text: string; eq: Linear } {
  // misconception opportunities first (as in every step), then the modelling skill; a failure without a misconception is a formation error
  const ms = c.s.misconception;
  let ok = false, swap = false, out: string;
  if (!c.forced && c.rng.chance(ms["model-swap"] ?? 0)) { swap = true; out = "misconception:model-swap"; }
  else if (!c.forced && c.rng.chance(ms["model-sign"] ?? 0)) { out = "misconception:model-sign"; }
  else if (c.forced || c.rng.chance(Math.min(1, ability(c.s, "modelling") + c.help))) { ok = true; out = "correct"; }
  else { swap = c.rng.chance(0.5); out = `conceptual-error:${swap ? "swap" : "sign"}`; }
  c.steps.push({ step: "form-equation", outcome: out });
  const E = (a: number, b: number, d: number, br: Linear["bracket"] = null): Linear => ({ bracket: br, a, b, c: 0, d });
  const sign = (x: number) => (ok ? x : swap ? x : -x);
  switch (st.t) {
    case "think": return ok || !swap ? { text: `${st.m}x ${sign(st.p) < 0 ? "-" : "+"} ${st.p} = ${st.r}`, eq: E(st.m, sign(st.p), st.r) } : { text: `${st.p}x + ${st.m} = ${st.r}`, eq: E(st.p, st.m, st.r) };
    case "buy": return ok || !swap ? { text: `${st.n}x ${sign(st.p) < 0 ? "-" : "+"} ${st.p} = ${st.r}`, eq: E(st.n, sign(st.p), st.r) } : { text: `${st.p}x + ${st.n} = ${st.r}`, eq: E(st.p, st.n, st.r) };
    case "share": return ok || !swap ? { text: `${st.n}x ${ok ? "-" : "+"} ${st.g} = ${st.r}`, eq: E(st.n, ok ? -st.g : st.g, st.r) } : { text: `${st.g}x - ${st.n} = ${st.r}`, eq: E(st.g, -st.n, st.r) };
    case "consecutive": return ok ? { text: `x + (x + 1) + (x + 2) = ${st.s}`, eq: E(3, 3, st.s) } : { text: `3x + 2 = ${st.s}`, eq: E(3, 2, st.s) };
    case "times": return ok ? { text: `x + ${st.a} + ${st.m}x + ${st.a} = ${st.s}`, eq: E(st.m + 1, 2 * st.a, st.s) } : { text: `x + ${st.m}x + ${st.a} = ${st.s}`, eq: E(st.m + 1, st.a, st.s) };
    case "rectangle": return ok ? { text: `2(x + x + ${st.a}) = ${st.p}`, eq: E(4, 2 * st.a, st.p) } : { text: `x + x + ${st.a} = ${st.p}`, eq: E(2, st.a, st.p) };
    case "weighted": return ok ? { text: `${st.m}x + ${st.w}(x + ${st.r}) = ${st.s}`, eq: E(st.m + st.w, st.w * st.r, st.s) } : { text: `${st.m}x + ${st.w}x + ${st.r} = ${st.s}`, eq: E(st.m + st.w, st.r, st.s) };
  }
}

const sameEq = (a: string, b: string) => a.replace(/[−–]/g, "-").replace(/\s+/g, "") === b.replace(/[−–]/g, "-").replace(/\s+/g, "");
function guess(v: QuestionView, rng: Rng, why: Reasoning["mode"], task: Task["kind"]): { r: Response; why: Reasoning } {
  const ans = v.input.type === "multiple-choice" && v.input.choices?.length ? rng.pick(v.input.choices).id : String(rng.int(1, 20));
  return { r: { kind: "answer", answer: ans, working: [] }, why: { task, mode: why, steps: [], value: null, style: "none", correctMethod: false } };
}

/** one response to a visible question */
export function respond(v: QuestionView, s: HiddenState, p: Profile, rng: Rng): { r: Response; why: Reasoning } {
  const task = readTask(v.prompt);
  if (task.kind === "unknown" || (task.kind === "modelling" && !task.story)) return guess(v, rng, "not-understood", task.kind);
  if (rng.chance(p.guess)) return guess(v, rng, "guessed", task.kind);
  const main: Kind = task.kind === "modelling" ? "modelling" : task.kind;
  if (v.hintAvailable && !v.hintShown && rng.chance(p.hints.seek * (1 - ability(s, main)))) return { r: { kind: "hint" }, why: { task: task.kind, mode: "solved", steps: [{ step: "hint", outcome: "requested" }], value: null, style: "-", correctMethod: false } };
  const c: Ctx = { s, p, rng, help: v.hintShown ? p.hints.help : 0, steps: [] };
  let lines: string[] = [], value: Q | null = null, uns: string[] = [], formed: string | null = null;
  if (task.kind === "modelling") {
    const f = formEquation(task.story!, c); formed = f.text;
    if (task.mode === "choose") {
      const opt = v.input.choices?.find((o) => sameEq(o.label, f.text));
      const ans = opt ? opt.id : rng.pick(v.input.choices ?? [{ id: "A", label: "" }]).id;
      return { r: { kind: "answer", answer: ans, working: [] }, why: { task: "modelling", mode: opt ? "solved" : "guessed", steps: c.steps, value: f.text, style: opt ? "choice" : "choice+no-matching-option(guessed)", correctMethod: !!opt && c.steps.every((x) => x.outcome === "correct") } };
    }
    const sol = solveLinear(f.eq, "two-step", c); lines = [f.text, ...sol.lines]; value = sol.value; uns = [f.text, ...sol.unsupported];
  } else { const sol = solveLinear(task.eq, task.kind, c); lines = sol.lines; value = sol.value; uns = sol.unsupported; }
  if (value === null) return guess(v, rng, "guessed", task.kind);
  const correctMethod = c.steps.every((x) => x.outcome === "correct");
  // working style
  const w = p.working, r = rng.next();
  let style = r < w.full ? "full" : r < w.full + w.partial ? "partial" : r < w.full + w.partial + w.bare ? "bare" : "none";
  let working = style === "full" ? lines : style === "partial" ? [lines[0], `x = ${show(value)}`].filter((x, i, a) => a.indexOf(x) === i) : style === "bare" ? [`x = ${show(value)}`] : [];
  if (style !== "none" && style !== "bare" && rng.chance(w.unsupportedNotation)) { working = uns; style += "+unsupported-notation"; }
  // a learner who reaches the right answer but writes working that does not follow (copied answer, invented lines)
  if (correctMethod && working.length > 1 && rng.chance(p.invalidWorkingWithCorrectAnswer) && task.kind !== "modelling") {
    const bad: Ctx = { s, p, rng, help: 0, steps: [], forced: task.kind === "both-sides" || task.kind === "brackets" ? "only-one-side" : "added-not-subtracted" };
    const fake = solveLinear(task.eq, task.kind, bad).lines;
    working = [...fake.slice(0, -1), `x = ${show(value)}`]; style += "+invalid-working";
  }
  let answer = show(value);
  if (v.input.type === "multiple-choice") { const o = v.input.choices?.find((x) => x.label.replace(/[−–]/g, "-").trim() === answer); answer = o ? o.id : rng.pick(v.input.choices ?? [{ id: "A", label: "" }]).id; if (!o) { style += "+no-matching-option(guessed)"; working = []; } }
  return { r: { kind: "answer", answer, working }, why: { task: task.kind, mode: "solved", steps: c.steps, value: show(value), style, correctMethod } };
}
export { readEquation };
