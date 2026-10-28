/** Answer-first assessment: generated problems, variable names, equivalent forms, skipped steps and deliberately wrong transformations. The oracle (a root chosen first, then the
 *  equation built around it) decides TRUTH only; whether a transition is invalid is decided by the exact kernels under test. */
import { describe, expect, test } from "bun:test";
import { assessAnswerFirst } from "./answer-first.ts";

let seed = 20261028; const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const VARS = ["x", "y", "t", "n", "z", "m", "k", "w"];
const run = (statement: string, lines: string[], diagnose = true) => assessAnswerFirst({ domain: "algebra", statement }, { format: "natural", text: lines.join("\n") }, { diagnose });
const sgn = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);
function linear() { const v = VARS[rnd(VARS.length)], a = 2 + rnd(8), root = rnd(21) - 10, b = rnd(15) + 1, c = a * root + b; return { v, a, root, b, c, eq: `${a}${v} + ${b} = ${c}` }; }

describe("answer-first: a correct final answer earns credit without analysing the work", () => {
  test("linear equations, any variable name, any valid working (none, skipped steps, scaled, rearranged): credit, no diagnosis, no derivation claim", () => {
    for (let i = 0; i < 40; i++) {
      const { v, a, root, b, c, eq } = linear(), k = 2 + rnd(5);
      const workings = [[`${v} = ${root}`], [`${a}${v} = ${c - b}`, `${v} = ${root}`], [`${k * a}${v} + ${k * b} = ${k * c}`, `${v} = ${root}`], [`${a}${v} = ${c} - ${b}`, `${v} = ${c - b}/${a}`, `${v} = ${root}`], [`${v} = ${root}`, `${root} = ${v}`.replace(/^(.*) = (.*)$/, "$2 = $1")]];
      for (const w of workings) { const r = run(eq, w); expect(r.answer.status).toBe("correct"); expect(r.answer.credit).toBe(true); expect(r.diagnosis).toBeNull(); expect(r.derivationCertified).toBe(false); expect(r.cost.analysedWork).toBe(false); }
    }
  });
  test("a correct answer is credited even when the written working contains a wrong line (answer credit is not derivation validity)", () => {
    for (let i = 0; i < 15; i++) { const { v, a, root, b, c, eq } = linear(); const r = run(eq, [`${a}${v} = ${c} - ${b + 1}`, `${v} = ${root}`]); expect(r.answer.credit).toBe(true); expect(r.derivationCertified).toBe(false); }
  });
});

describe("answer-first: an incorrect answer is localised to the earliest invalid written transition", () => {
  test("a wrong constant in the first transition is found there, with the exact correct value; later lines valid relative to the line before them", () => {
    for (let i = 0; i < 40; i++) {
      const { v, a, root, b, c, eq } = linear(), d = 1 + rnd(4), bad = b + d; // subtracts bad instead of b
      const wrongRhs = c - bad, wrongRoot = `${wrongRhs}/${a}`;
      const r = run(eq, [`${a}${v} = ${c} - ${bad}`, `${a}${v} = ${wrongRhs}`, `${v} = ${wrongRoot}`]);
      expect(r.answer.credit).toBe(false);
      const f = r.diagnosis!.firstError!; expect(f.transition).toBe(0); expect(f.kind).toBe("unbalanced-operation"); expect(f.confidence).toBe("exact");
      expect(f.evidence.join(" ")).toContain(`${c} - ${b} = ${c - b}`); // the value the right side should have had
      expect(r.diagnosis!.laterErrors).toEqual([]);
      expect(r.diagnosis!.locallyValidAfterFirstError).toEqual([1, 2]);
    }
  });
  test("two distinct errors: the second (an arithmetic slip) is a separate observable error with the exact evaluation; the final division stays locally valid", () => {
    for (let i = 0; i < 30; i++) {
      const { v, a, b, c, eq } = linear(), bad = b + 1 + rnd(3); let slip = c - bad + 1 + rnd(3); if (slip === c - b) slip += 1; // the slip must not land back on the true value
      const r = run(eq, [`${a}${v} = ${c} - ${bad}`, `${a}${v} = ${slip}`, `${v} = ${slip}/${a}`]);
      expect(r.answer.credit).toBe(false);
      const d = r.diagnosis!; expect(d.firstError!.transition).toBe(0);
      expect(d.laterErrors.length).toBe(1); expect(d.laterErrors[0].transition).toBe(1); expect(d.laterErrors[0].kind).toBe("arithmetic-evaluation");
      expect(d.laterErrors[0].explanation).toBe(`${c} - ${bad} evaluates to ${c - bad}, not ${slip}`);
      expect(d.locallyValidAfterFirstError).toContain(2);
    }
  });
  test("an error that appears only in the third line is not blamed on the first two", () => {
    for (let i = 0; i < 20; i++) {
      const { v, a, root, b, c, eq } = linear(), wrong = root + 1 + rnd(3);
      const r = run(eq, [`${a}${v} = ${c} - ${b}`, `${a}${v} = ${c - b}`, `${v} = ${wrong}`]);
      expect(r.answer.credit).toBe(false);
      expect(r.diagnosis!.firstError!.transition).toBe(2);
      expect(r.diagnosis!.transitions.slice(0, 2).every((t) => t.status === "equivalent")).toBe(true);
    }
  });
  test("an unrecognised operation is not diagnosed beyond what can be established (no invented explanation)", () => {
    const r = run("3x + 4 = 19", ["x^2 = 7", "x = 7"]); // not related by any single supported operation
    const f = r.diagnosis!.firstError!; expect(f.transition).toBe(0); expect(f.confidence).toBe("set-level");
  });
});

describe("answer-first: quadratics, rational equations, inequalities, radicals", () => {
  test("quadratics built from chosen roots: complete answer credited; a missing root is incomplete; a wrong root is incorrect and located", () => {
    for (let i = 0; i < 25; i++) {
      let r1 = rnd(11) - 5, r2 = rnd(11) - 5; if (r1 === r2) r2 += 1;
      const s = -(r1 + r2), p = r1 * r2, eq = `x^2 ${sgn(s).replace("+ 1", "+ 1")}x ${sgn(p)} = 0`;
      expect(run(eq, [`(x ${sgn(-r1)})(x ${sgn(-r2)}) = 0`, `x = ${r1} or x = ${r2}`]).answer.credit).toBe(true);
      expect(run(eq, [`x = ${r1} or x = ${r2}`]).answer.status).toBe("correct");
      const miss = run(eq, [`x = ${r1}`]); expect(miss.answer.status).toBe("incomplete"); expect(miss.answer.credit).toBe(false); expect(miss.answer.missing).toEqual([String(r2)]);
      const bad = run(eq, [`(x ${sgn(r1)})(x ${sgn(-r2)}) = 0`, `x = ${-r1} or x = ${r2}`]); // factor sign slip
      if (r1 !== 0 && -r1 !== r1) { expect(bad.answer.credit).toBe(false); expect(bad.diagnosis!.firstError!.transition).toBe(0); }
    }
  });
  test("rational equations: a root excluded by the domain is not an answer", () => {
    for (let i = 0; i < 20; i++) {
      const k = 1 + rnd(8), eq = `(x^2 - ${k * k})/(x - ${k}) = 0`;
      expect(run(eq, [`x = -${k}`]).answer.credit).toBe(true);
      const bad = run(eq, [`x^2 - ${k * k} = 0`, `x = ${k} or x = -${k}`]); expect(bad.answer.credit).toBe(false); expect(bad.answer.extraneous).toEqual([String(k)]);
    }
  });
  test("inequalities: the full solution set is compared; forgetting to reverse the sign is located at that step", () => {
    for (let i = 0; i < 25; i++) {
      const a = 2 + rnd(6), b = rnd(10), m = rnd(15) - 7, c = b - a * m, v = VARS[rnd(VARS.length)]; // -a v + b > c  <=>  v < m
      const eq = `-${a}${v} + ${b} > ${c}`;
      expect(run(eq, [`-${a}${v} > ${-a * m}`, `${v} < ${m}`]).answer.credit).toBe(true);
      const bad = run(eq, [`-${a}${v} > ${-a * m}`, `${v} > ${m}`]);
      expect(bad.answer.credit).toBe(false); expect(bad.diagnosis!.firstError!.transition).toBe(1);
    }
  });
  test("squaring: valid one-way steps are not errors; an unchecked extraneous candidate is the diagnosis", () => {
    for (let i = 0; i < 20; i++) {
      const r = 1 + rnd(6), q = r + 1 + rnd(5); // sqrt(x + c) = x with roots built from x^2 - x - c = 0 : choose c so that x = q is a root and the other root is negative
      const c = q * q - q, eq = `sqrt(x + ${c}) = x`, other = 1 - q; // roots q and 1-q
      const bad = run(eq, [`x + ${c} = x^2`, `x^2 - x - ${c} = 0`, `x = ${q} or x = ${other}`]);
      expect(bad.answer.credit).toBe(false); expect(bad.answer.extraneous).toEqual([String(other)]);
      expect(bad.diagnosis!.transitions[0].status).toBe("implied"); expect(bad.diagnosis!.firstError!.kind).toBe("unchecked-candidates"); expect(bad.diagnosis!.firstError!.transition).toBe(2); expect(bad.diagnosis!.transitions[0].status).not.toBe("invalid");
      expect(run(eq, [`x + ${c} = x^2`, `x^2 - x - ${c} = 0`, `x = ${q} or x = ${other}`, `x = ${q}`]).answer.credit).toBe(true);
    }
  });
});

describe("answer-first: arithmetic expressions", () => {
  test("the exact value is credited; a slip is located with the exact evaluation", () => {
    for (let i = 0; i < 30; i++) {
      const a = 2 + rnd(9), b = 2 + rnd(9), c = 2 + rnd(9), val = a + b * c, expr = `${a} + ${b}*${c}`;
      expect(run(expr, [`${val}`]).answer.credit).toBe(true);
      const wrong = (a + b) * c; if (wrong === val) continue;
      const r = run(expr, [`${a + b}*${c}`, `${wrong}`]);
      expect(r.answer.credit).toBe(false); expect(r.diagnosis!.firstError!.transition).toBe(0);
    }
  });
});

describe("answer-first: optional work report on a correct answer", () => {
  test("diagnose:'always' reports the written transitions of a correct answer without changing the credit", () => {
    const ok = assessAnswerFirst({ domain: "algebra", statement: "3x + 4 = 19" }, { format: "natural", text: "6x + 8 = 38\nx = 5" }, { diagnose: "always" });
    expect(ok.answer.credit).toBe(true); expect(ok.diagnosis!.transitions.map((t) => t.status)).toEqual(["equivalent", "equivalent"]); expect(ok.diagnosis!.firstError).toBeNull();
    const lucky = assessAnswerFirst({ domain: "algebra", statement: "3x + 4 = 19" }, { format: "natural", text: "3x = 19 - 5\n3x = 14 + 1\nx = 5" }, { diagnose: "always" });
    expect(lucky.answer.credit).toBe(true); expect(lucky.derivationCertified).toBe(false); expect(lucky.diagnosis!.firstError!.transition).toBe(0);
  });
});

describe("answer-first: honest limits", () => {
  test("other domains and unreadable final lines are unsupported/unresolved, never a guessed binary result", () => {
    const calc = assessAnswerFirst({ domain: "calculus", task: "derivative" }, { format: "natural", text: "2x" }); expect(calc.answer.credit).toBeNull(); expect(calc.answer.status).toBe("unsupported");
    const unreadable = run("3x + 4 = 19", ["3x = 15", "so the answer is probably five?"]); expect(unreadable.answer.credit).toBeNull(); expect(unreadable.answer.status).toBe("unresolved");
    const prose = run("3x + 4 = 19", ["let me check: 3x = 15 and then", "x = 5"]); expect(prose.answer.credit).toBe(true); expect(prose.unreadableLines).toEqual([1]);
  });
  test("renaming the variable never changes the verdict class (metamorphic)", () => {
    for (let i = 0; i < 20; i++) {
      const base = linear(), w = base.root + (rnd(2) ? 0 : 1 + rnd(3)), other = VARS[(VARS.indexOf(base.v) + 1 + rnd(VARS.length - 1)) % VARS.length];
      const a = run(base.eq, [`${base.v} = ${w}`]), b = run(base.eq.replaceAll(base.v, other), [`${other} = ${w}`]);
      expect(b.answer.status).toBe(a.answer.status);
    }
  });
});
