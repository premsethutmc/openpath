/** Assessment contract, authoritative decision, record evidence, mastery exclusion and the (inactive) fallback interface. */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { contractFor, contractOfProblem, legacyContract, publishable, assessSubmission } from "./assessment.ts";
import { costUsd, createProvider, fallbackConfigFrom, FALLBACK_DISABLED, planFallback, settle, confirmedResubmission, type FallbackConfig } from "./assessment-fallback.ts";
import { pool, problemOf } from "./families.ts";
import { make, decide } from "./session.ts";
import { readRecords, UNRESOLVED_CAP } from "./records.ts";

const KERNEL = ["mul", "pow", "lin", "quad", "meet", "linev"];
const ctx = (n = 0) => ({ learnerId: "L", sessionId: "S", at: new Date(Date.UTC(2026, 9, 1, 9, n)).toISOString() });

describe("contract: independent validation before a question may be used", () => {
  test("every released question of the kernel families is verified, none is held", () => {
    for (const f of KERNEL) for (const q of pool(f).items) { const c = contractFor(q.id)!; expect(c.verification).toBe("verified"); expect(publishable(c)).toBe(true); expect(c.problem?.statement).toBeTruthy(); }
  });
  test("a generator defect is held, not published", () => {
    const pr = problemOf("gen:lin:3,5,4")!;
    for (const bad of [{ ...pr, answer: "5" }, { ...pr, answer: "4.5" }]) { const c = contractOfProblem(bad, "bad"); expect(c.verification).toBe("held"); expect(publishable(c)).toBe(false); }
    const q = problemOf("gen:quad:-5,6")!;
    expect(contractOfProblem({ ...q, answer: "2" }, "bad").verification).toBe("held");      // incomplete solution set
    expect(contractOfProblem({ ...q, answer: "2,4" }, "bad").verification).toBe("held");
    const m = problemOf("gen:lin:3,5,4:mc")!;
    expect(contractOfProblem({ ...m, options: ["4", "4.0", "5", "12"], answer: "A" }, "bad").verification).toBe("held"); // a distractor that is also correct: ambiguous question
    expect(contractOfProblem({ ...q, prompt: "Solve x² − 5x + 7 = 0." }, "bad").verification).toBe("held");           // statement not the question shown
  });
  test("families without a kernel are reported as legacy, written answers as educator-marked", () => {
    const other = [...["rect", "fadd", "pct", "root"]].map((f) => pool(f).items[0]).filter(Boolean);
    expect(other.length).toBeGreaterThan(0);
    for (const q of other) expect(contractFor(q.id)!.verification).toBe("legacy");
    expect(legacyContract({ id: "w", type: "written", answer: "", prompt: "Explain" }).verification).toBe("human");
  });
  test("a choice question's contract takes the option text as the expected answer", () => {
    const c = contractFor("gen:lin:3,5,4:mc")!; expect(c.verification).toBe("verified"); expect(c.expected.display).toBe("4");
  });
});

describe("decision: answer first, explicit answer, no guessing", () => {
  const lin = "gen:lin:3,5,4", quad = "gen:quad:-5,6";
  test("correct answer: credit, working not read, derivation not claimed", () => {
    const a = decide(lin, "x = 4", ["3x + 5 = 17", "3x = 13", "x = 13/3", "x = 4"]);
    expect(a.credit).toBe(true); expect(a.evidence).toMatchObject({ answerCorrect: true, methodExamined: false, derivationVerified: false, firstError: null, unresolved: false, aiFallbackUsed: false });
  });
  test("the explicit answer decides, not the last working line", () => {
    expect(decide(lin, "4", ["3x + 5 = 17", "3x = 12", "x = 5"]).credit).toBe(true);
    expect(decide(lin, "5", ["3x + 5 = 17", "3x = 12", "x = 4"]).credit).toBe(false);
  });
  test("incorrect with working: the first invalid transition; later locally valid steps are not blamed", () => {
    const a = decide(lin, "22/3", ["3x + 5 = 17", "3x = 22", "x = 22/3"]);
    expect(a.credit).toBe(false); expect(a.evidence.methodExamined).toBe(true); expect(a.evidence.firstError?.to.replace(/\s/g, "")).toBe("3x=22");
  });
  test("incorrect without working: established, and a step is offered", () => {
    const a = decide(lin, "5"); expect(a.credit).toBe(false); expect(a.clarification?.kind).toBe("show-step"); expect(a.evidence.clarificationRequired).toBe(false);
  });
  test("incomplete solution set is not credited but is described as incomplete", () => { const a = decide(quad, "2"); expect(a.credit).toBe(false); expect(a.feedback.kind).toBe("incomplete"); });
  test("alternative forms are accepted and recorded in plain form", () => {
    for (const r of ["x = 2 or x = 3", "{3, 2}", "2 and 3", "x=2, x=3"]) { const a = decide(quad, r); expect(a.credit).toBe(true); }
    expect(decide(quad, "x=2, x=3").recordAs).toBe("2, 3"); expect(decide(lin, "x = 4").recordAs).toBe("4"); expect(decide(lin, "4.0").credit).toBe(true); expect(decide(lin, "4.0").recordAs).toBeUndefined();
  });
  test("unreadable answer: unresolved, never incorrect; one clarification, then pending and fallback-eligible", () => {
    const a1 = decide(lin, "four-ish"); expect(a1.credit).toBeNull(); expect(a1.evidence).toMatchObject({ unresolved: true, answerCorrect: null, clarificationRequired: true }); expect(a1.clarification?.kind).toBe("answer-field"); expect(a1.fallbackEligible).toBe(false);
    const a2 = decide(lin, "four-ish", [], 1); expect(a2.credit).toBeNull(); expect(a2.clarification).toBeNull(); expect(a2.feedback.kind).toBe("pending"); expect(a2.fallbackEligible).toBe(true);
    const a3 = decide(lin, "4", [], 1); expect(a3.credit).toBe(true); expect(a3.evidence.clarificationRequired).toBe(true); expect(a3.evidence.unresolved).toBe(false);
  });
  test("the kernel and the stored answer disagreeing is unresolved and held for review, not a verdict", () => {
    const c = contractFor(lin)!;
    const a = assessSubmission(c, { response: "4", legacyCorrect: false }); expect(a.credit).toBeNull(); expect(a.evidence.source).toBe("disagreement"); expect(a.fallbackEligible).toBe(false);
  });
  test("a held question is never graded", () => { const a = assessSubmission(contractOfProblem({ ...problemOf(lin)!, answer: "5" }, "x"), { response: "5", legacyCorrect: true }); expect(a.credit).toBeNull(); expect(a.evidence.source).toBe("held"); });
  test("choice answers", () => { expect(decide(`${lin}:mc`, "B").credit).toBe(true); expect(decide(`${lin}:mc`, "C").credit).toBe(false); });
  test("authored and non-kernel questions keep the stored answer as the (reported) authority; written is educator-marked", () => {
    const q = pool("rect").items[0]; expect(decide(q.id, q.answer)).toMatchObject({ credit: true, evidence: { source: "legacy" } }); expect(decide(q.id, "0").credit).toBe(false);
  });
});

describe("evidence: separate results, mastery untouched by undecided submissions", () => {
  const ev = (items: any[]) => items.map((r, i) => ({ kind: "learning_record", ...r }));
  test("every attempt record carries the assessment evidence (no grading route without it)", () => {
    const r = make.attempt(ctx(), "gen:lin:3,5,4", "x = 4", "practice") as any;
    expect(r.assessment).toMatchObject({ policy: "assessment@1", answerCorrect: true, derivationVerified: false }); expect(r.response).toBe("4");
    for (const dir of ["../../../frontend/src", "."]) { /* attempt records are only built by make.attempt */ }
  });
  test("only session.ts and records.ts build attempt records", () => {
    const hits: string[] = [];
    const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) && /record: *"attempt"/.test(readFileSync(p, "utf8"))) hits.push(p.replace(/^.*\/(packages|frontend)\//, "$1/")); } };
    walk(new URL("../../../packages", import.meta.url).pathname); walk(new URL("../../../frontend/src", import.meta.url).pathname);
    expect(hits.sort()).toEqual(["packages/learning/src/records.ts", "packages/learning/src/session.ts"]);
  });
  test("unresolved submissions are not attempts: no attempt number, no mastery input; the cap stops parking", () => {
    const id = "gen:lin:3,5,4", recs: any[] = [];
    for (let i = 0; i < 4; i++) recs.push(make.attempt(ctx(i), id, "four-ish", "practice"));
    const rr = readRecords("L", recs);
    expect(rr.unresolved.length).toBe(UNRESOLVED_CAP); expect(rr.attempts.length).toBe(4 - UNRESOLVED_CAP);
    const one = readRecords("L", [make.attempt(ctx(0), id, "four-ish", "practice"), make.attempt(ctx(1), id, "4", "practice")]);
    expect(one.attempts.length).toBe(1); expect(one.attempts[0].n).toBe(1); expect(one.unresolved.length).toBe(1);   // the resubmission is still the first real attempt
  });
  test("a wrong answer stays a wrong attempt; a correct answer carries no method claim", () => {
    const rr = readRecords("L", [make.attempt(ctx(0), "gen:lin:3,5,4", "5", "practice"), make.attempt(ctx(1), "gen:lin:3,5,4", "4", "practice")]);
    expect(rr.attempts.length).toBe(2); expect((make.attempt(ctx(2), "gen:lin:3,5,4", "4", "practice") as any).assessment).toMatchObject({ methodExamined: false, derivationVerified: false });
  });
});

describe("python server: the record validator mirrors the rules", () => {
  const py = readFileSync(new URL("../../../backend/family/learning.py", import.meta.url), "utf8");
  test("the server admits the assessment field and keeps the cap in step with the app", () => {
    expect(py).toContain("'assessment'"); expect(py).toContain(`UNRESOLVED_CAP = ${UNRESOLVED_CAP}`); expect(py).toContain("def _assessment_ok");
    expect(py).toMatch(/aiFallbackUsed'\]/); expect(py).toContain("derivationVerified");
  });
});

describe("fallback interface: inactive, bounded, never a grader", () => {
  const cfg: FallbackConfig = { ...FALLBACK_DISABLED, provider: "fixture", maxRequestsPerMonth: 2, maxRequestsPerLearnerPerDay: 1, maxSpendPerMonthUsd: 1, priceInPerMTok: 1, priceOutPerMTok: 5 };
  const id = "gen:quad:-5,6", c = () => contractFor(id)!, stuck = () => decide(id, "two and three-ish", [], 1);
  test("disabled by default; unconfigured environment stays disabled; real providers cannot be created", () => {
    expect(fallbackConfigFrom({}).provider).toBe("none"); expect(fallbackConfigFrom({ OPENPATH_FALLBACK_PROVIDER: "bogus" }).provider).toBe("none");
    expect(planFallback(FALLBACK_DISABLED, { requestsThisMonth: 0, spendThisMonthUsd: 0, learnerRequestsToday: 0 }, c(), stuck(), { response: "x" }).allowed).toBe(false);
    expect(createProvider(FALLBACK_DISABLED)).toBeNull(); expect(() => createProvider({ ...cfg, provider: "anthropic" })).toThrow(/not activated/); expect(() => createProvider({ ...cfg, provider: "openai_compatible" })).toThrow(/not activated/);
  });
  test("only an undecided submission after the clarification is eligible; the budget is strict", () => {
    const u = { requestsThisMonth: 0, spendThisMonthUsd: 0, learnerRequestsToday: 0 }, send = { response: "two and three-ish" };
    expect(planFallback(cfg, u, c(), decide(id, "two and three-ish"), send)).toMatchObject({ allowed: false });                  // clarification not yet spent
    expect(planFallback(cfg, u, c(), decide(id, "5"), send)).toMatchObject({ allowed: false, reason: expect.stringMatching(/deterministically/) });
    const ok = planFallback(cfg, u, c(), stuck(), send); expect(ok.allowed).toBe(true);
    expect(planFallback(cfg, { ...u, requestsThisMonth: 2 }, c(), stuck(), send)).toMatchObject({ allowed: false, reason: expect.stringMatching(/monthly request/) });
    expect(planFallback(cfg, { ...u, learnerRequestsToday: 1 }, c(), stuck(), send)).toMatchObject({ allowed: false, reason: expect.stringMatching(/daily/) });
    expect(planFallback(cfg, { ...u, spendThisMonthUsd: 0.9999 }, c(), stuck(), send)).toMatchObject({ allowed: false, reason: expect.stringMatching(/spend/) });
    expect(planFallback({ ...cfg, maxInputTokens: 10 }, u, c(), stuck(), send)).toMatchObject({ allowed: false });
    expect(JSON.stringify((ok as any).request)).not.toMatch(/learner|session|L"/i);                                            // no identity in the request
  });
  test("a proposal never changes credit; unverifiable claims are discarded; a reading becomes a confirmation the kernel then grades", () => {
    const a = stuck(), s = settle(c(), a, [{ kind: "interpretation", reading: "x = 2 or x = 3" }, { kind: "explanation", text: "you forgot to expand" }, { kind: "error-source", line: 2, text: "bad" }, { kind: "candidate-solution", answer: "the roots" }]);
    expect(s.assessment.credit).toBeNull(); expect(s.assessment.evidence.aiFallbackUsed).toBe(true); expect(s.assessment.evidence.unresolved).toBe(true);
    expect(s.discarded.length).toBe(3); expect(s.confirmation?.answer).toBe("2, 3");
    const r = confirmedResubmission(c(), s)!; expect(r.credit).toBe(true); expect(r.evidence.aiFallbackUsed).toBe(true);
    const wrong = settle(c(), a, [{ kind: "interpretation", reading: "x = 2 or x = 4" }]); expect(confirmedResubmission(c(), wrong)!.credit).toBe(false);   // the kernel, not the proposal, decides
  });
  test("an explanation is usable only for an error the kernel already confirmed", () => {
    const a = decide("gen:lin:3,5,4", "22/3", ["3x + 5 = 17", "3x = 22", "x = 22/3"]);
    const s = settle(contractFor("gen:lin:3,5,4")!, { ...a, credit: null }, [{ kind: "explanation", text: "you added 5 instead of subtracting it" }, { kind: "error-source", line: a.evidence.firstError!.transition, text: "" }, { kind: "error-source", line: 99, text: "" }]);
    expect(s.usable.length).toBe(2); expect(s.discarded.length).toBe(1);
  });
  test("cost arithmetic", () => { expect(costUsd(cfg, 1_000_000, 1_000_000)).toBeCloseTo(6, 6); });
});
