/**
 * child-lab@2: the lab's scenarios. Each starts a new child under an explicitly chosen learning policy (what a lesson does
 * for it — an assumption, not evidence), drives the shipped engine with default settings and returns checks over what the
 * engine did. Every check looks for positive evidence in the run's own rows (a question actually asked, a status actually
 * held at every step), never at the simulated child's state alone.
 *
 * Every scenario also gets the harness checks: every computed response is re-derived from the child's own working (no
 * answer leakage); no critical attempt was one the lab could not work out; the run ended clearly (a stop the engine chose,
 * not the lab running out of steps); and a scenario with no checks of its own fails. The scorecard
 * (content/owner/child-lab.v1.json) is generated; the acceptance contracts (content/owner/child-lab-contracts.v1.json) are
 * written by hand, separately, and say which checks each scenario must carry and which mutants it must catch.
 */
import { question } from "../content";
import { problemOf } from "../families";
import { graph } from "../graph";
import { probeReading } from "../reasoning";
import { prerequisiteAfterOwn, questionSupports, recovery, withinGrade } from "../intervention";
import { describePolicy, LabChild, SLIPS, type LearningPolicy } from "./slips";
import { freshOf, LabRun, TERMINAL, type Mutant, type Row } from "./drive";
import { work } from "./work";

const IM = "MATH.number.integer-multiply", IA = "MATH.number.integer-add", MT = "MATH.number.multiplication-tables", EXP = "MATH.number.exponents", LD = "MATH.number.long-division";
const QD = "MATH.algebra.quadratic-discriminant", AR = "MATH.number.addition-regroup", SR = "MATH.number.subtraction-regroup";
const SHOWN = ["independent", "transfer", "verified"];
const SOLVED = ["solved", "solved_on_retry", "solved_after_help"];
const DISC = "gen:disc:-4,-20"; // x² − 4x − 20 = 0: b² − 4ac = 16 + 80
const FACT = "gen:factor:8,-9"; // x² − x − 72 = (x + 8)(x + □): −72 ÷ 8 = −9
const FA = "MATH.algebra.factorisation";
const LDIV = "gen:ldiv:18,7"; // 126 ÷ 7
const FACT78 = /(7 × 8|8 × 7|56 ÷ [78]|× [78] = 56|8 rows of 7|7 rows of 8)/;
export interface Check { name: string; ok: boolean; group?: "harness" }
export interface Result {
  id: string; title: string; child: string; policy: string; pairedWith?: string; checks: Check[]; pass: boolean; questions: number;
  provenance: Record<string, number>; termination: string; trace: string;
}
export interface Scenario {
  id: string; title: string; slips: string[]; policy: LearningPolicy;
  /** the scenario that runs the same child with the opposite learning assumption */
  pairedWith?: string;
  /** the problem(s) the scenario is about, and the skills whose answers its checks rely on: an unsupported answer on any is fatal */
  originals: string[]; critical: string[];
  /** how the run must end: by the engine's own stop ("terminal"), or no recovery at all ("none") */
  ends: "terminal" | "none";
  child?: string;
  run: (m: Mutant | null) => { checks: Check[]; run: LabRun | null; runs?: LabRun[]; extra?: string };
}
const says = (slips: string[], more = "") => [...slips.map((s) => SLIPS[s].says), ...(more ? [more] : [])].join("; ");
const c = (name: string, ok: boolean): Check => ({ name, ok });
const base = (q: string) => q.replace(/:(mc|w)$/, "");
const lessons = (run: LabRun, comp?: string) => run.rows.filter((r) => r.prompt.startsWith("LESSON") && (!comp || r.active === comp));
/** a question on the skill was actually asked (not only a lesson), in rows after `from` */
const assessed = (run: LabRun, comp: string, from = 0) => run.rows.some((r) => r.n > from && r.qid && r.active === comp);
/** the skill was not shown on your own at any step while the slip was still there (intermediate states, not the end) */
const heldWhile = (run: LabRun, comp: string, slip: string) => { const rs = run.rows.filter((r) => r.slips.includes(slip) && comp in r.status); return rs.length > 0 && rs.every((r) => !SHOWN.includes(r.status[comp])); };
const neverShown = (run: LabRun, comp: string) => { const rs = run.rows.filter((r) => comp in r.status); return rs.length > 0 && rs.every((r) => !SHOWN.includes(r.status[comp])); };
/** the first answer to the problem was wrong, and wrong because of this slip */
const firstWrongBy = (run: LabRun, qid: string, slip: string) => { const r = run.rows.find((x) => x.qid === qid); return !!r && r.right === false && r.provenance === "computed" && !!r.fired?.includes(slip); };
const wrongBy = (r: Row, slip: string) => r.right === false && r.provenance === "computed" && !!r.fired?.includes(slip);
const solvedOnlyAfter = (run: LabRun, comp: string) => { const end = run.termination; if (!end || !SOLVED.includes(end.phase)) return true; return lessons(run, comp).length > 0; };
const child = (slips: string[], policy: LearningPolicy, o: ConstructorParameters<typeof LabChild>[2] = {}) => new LabChild(slips, policy, o);
const lab = (id: string, ch: LabChild, grade: number, watch: string[], m: Mutant | null) => new LabRun(id, ch, { grade, watch, mutant: m });

// ------------------------------------------------------------------ the scenarios
const S: Scenario[] = [
  { id: "S01", title: "Class 10: a sign slip behind x² − 4x − 20 = 0 is found and taught", slips: ["signMul"], policy: { kind: "immediate" }, pairedWith: "S01c", originals: [DISC], critical: [IM, QD], ends: "terminal", run: (m) => {
    const run = lab("lab-s01", child(["signMul"], { kind: "immediate" }), 10, [IM, QD], m); run.recover(DISC, 60);
    return { run, checks: [c("the first answer is wrong because of the sign slip", firstWrongBy(run, DISC, "signMul")), c("a question on integer multiplication is asked", assessed(run, IM, 1)), c("a lesson on integer multiplication is given", lessons(run, IM).length > 0), c("the discriminant is not shown on your own at any step while the slip remains", heldWhile(run, QD, "signMul")), c("solved only after integer multiplication is taught", solvedOnlyAfter(run, IM))] };
  } },
  { id: "S01c", title: "Control for S01: the same sign slip, and teaching does not take", slips: ["signMul"], policy: { kind: "unsuccessful" }, pairedWith: "S01", originals: [DISC], critical: [IM, QD], ends: "terminal", run: (m) => {
    const run = lab("lab-s01c", child(["signMul"], { kind: "unsuccessful" }), 10, [IM, QD], m); const r = run.recover(DISC, 90);
    return { run, checks: [c("the first answer is wrong because of the sign slip", firstWrongBy(run, DISC, "signMul")), c("a question on integer multiplication is asked", assessed(run, IM, 1)), c("stops for a teacher or parent", r.phase === "escalate"), c("integer multiplication is never shown on your own", neverShown(run, IM)), c("the discriminant is never shown on your own", neverShown(run, QD))] };
  } },
  { id: "S02", title: "Class 5: 126 ÷ 7 with a 7 × 8 slip: the fact itself is asked and taught", slips: ["fact78"], policy: { kind: "immediate" }, pairedWith: "S02c", originals: [LDIV], critical: [MT, LD], ends: "terminal", run: (m) => {
    const run = lab("lab-s02", child(["fact78"], { kind: "immediate" }), 5, [LD, MT], m); const r = run.recover(LDIV, 60);
    const fact = run.rows.find((t) => t.qid && FACT78.test(question(t.qid).prompt) && wrongBy(t, "fact78"));
    return { run, checks: [c("the first answer is wrong because of the 7 × 8 slip", firstWrongBy(run, LDIV, "fact78")), c("not sent to multi-digit multiplication", !run.seen().has("MATH.number.multi-multiplication") && !r.supports.some((x) => x.id === "MATH.number.multi-multiplication")), c("a 7 × 8 fact is asked and the slip shows in the answer", !!fact), c("a lesson on times tables is given after that", !!fact && lessons(run, MT).some((l) => l.n > fact.n)), c("times tables are not shown on your own at any step while the slip remains", heldWhile(run, MT, "fact78"))] };
  } },
  { id: "S02c", title: "Control for S02: the same 7 × 8 slip, and teaching does not take", slips: ["fact78"], policy: { kind: "unsuccessful" }, pairedWith: "S02", originals: [LDIV], critical: [MT, LD], ends: "terminal", run: (m) => {
    const run = lab("lab-s02c", child(["fact78"], { kind: "unsuccessful" }), 5, [LD, MT], m); const r = run.recover(LDIV, 120);
    return { run, checks: [c("the first answer is wrong because of the 7 × 8 slip", firstWrongBy(run, LDIV, "fact78")), c("a 7 × 8 fact is asked and the slip shows in the answer", run.rows.some((t) => t.qid && FACT78.test(question(t.qid).prompt) && wrongBy(t, "fact78"))), c("stops for a teacher or parent", r.phase === "escalate"), c("times tables are never shown on your own", neverShown(run, MT))] };
  } },
  { id: "S03", title: "Old mastery, recent mistakes: the skill is checked again during recovery", slips: ["tables78"], policy: { kind: "immediate" }, originals: [LDIV], critical: [MT], ends: "terminal", run: (m) => {
    const ch = child([], { kind: "immediate" }); const run = lab("lab-s03", ch, 5, [MT, LD], m);
    for (const id of ["mt-d1", "mt-d2", "mt-p1", "gen:mul:9,7", "gen:mul:6,8"]) run.answer(id, "practice", "history", "history", MT);
    run.later(40); ch.active.set("tables78", SLIPS.tables78);
    for (const id of [freshOf(run, "mul", (x) => /7 × 8|8 × 7|7 × 7/.test(question(x).prompt)), freshOf(run, "mul", (x) => /× 8 =|8 ×/.test(question(x).prompt))]) if (id) run.answer(id, "practice", "recent", "recent", MT);
    const seeded = run.rows.length;
    const history = run.rows.filter((r) => r.where === "history"), recent = run.rows.filter((r) => r.where === "recent");
    run.recover(LDIV, 60);
    return { run, checks: [c("the old answers were right and the child's own", history.length === 5 && history.every((r) => r.right === true && r.provenance === "computed")), c("the recent answers are wrong because of the slip", recent.length === 2 && recent.every((r) => wrongBy(r, "tables78"))), c("times tables are asked again during the recovery (seeded answers not counted)", assessed(run, MT, seeded))] };
  } },
  { id: "S04", title: "Times tables known on other facts: the exact fact 126 ÷ 7 needs is still asked", slips: ["fact78"], policy: { kind: "immediate" }, originals: [LDIV], critical: [MT], ends: "terminal", run: (m) => {
    const run = lab("lab-s04", child(["fact78"], { kind: "immediate" }), 5, [MT, LD], m);
    for (const id of ["mt-d2", "gen:mul:9,6", "gen:mul:4,3", "gen:mul:6,6"]) run.answer(id, "practice", "history", "history", MT);
    const seeded = run.rows.length; const history = run.rows.slice(0, seeded);
    run.recover(LDIV, 60);
    const fact = run.rows.find((t) => t.n > seeded && t.qid && FACT78.test(question(t.qid).prompt) && wrongBy(t, "fact78"));
    return { run, checks: [c("the other facts were answered right by the child itself", history.every((r) => r.right === true && r.provenance === "computed")), c("during recovery a 7 × 8 fact is asked and the slip shows", !!fact), c("a lesson on times tables is given after that", !!fact && lessons(run, MT).some((l) => l.n > fact.n))] };
  } },
  { id: "S05", title: "Same gap found two ways (by its mistake, or by checking supports): same treatment", slips: ["powAsMul"], policy: { kind: "unsuccessful" }, originals: ["gen:disc:-12,-20"], critical: [EXP], ends: "terminal",
    child: "works out a power as a product (7² = 14); its answers to the discriminant problems are staged (once as the mistake a misconception predicts, once as an unexplained wrong answer)", run: (m) => {
      const mk = (id: string, explained: boolean) => lab(id, child(["powAsMul"], { kind: "unsuccessful" }, { stage: (q) => { if (!q.startsWith("gen:disc:")) return null; if (!explained) return "1"; const pr = probeReading(base(q), "negative-square"); return pr.discriminates ? pr.predicted[0] : null; } }), 10, [EXP], m);
      const a = mk("lab-s05a", true); a.recover("gen:disc:-12,-20", 90); const b = mk("lab-s05b", false); b.recover("gen:disc:-12,-20", 90);
      const below = (x: LabRun) => [MT, "MATH.number.equal-groups", "MATH.number.addition"].filter((s) => assessed(x, s));
      const from = (x: LabRun) => { const i = x.rows.find((r) => r.active === EXP)?.n ?? Infinity; return [...x.seen(i - 1)].sort().join(); };
      return { run: a, runs: [a, b], extra: `--- found by checking supports:\n${b.trace()}`, checks: [c("by its mistake: a question on exponents is asked", assessed(a, EXP)), c("by checking supports: a question on exponents is asked", assessed(b, EXP)), c("by its mistake: a skill underneath exponents is asked before stopping", below(a).length > 0), c("by checking supports: a skill underneath exponents is asked before stopping", below(b).length > 0), c("both ways end the same way", !!a.termination && a.termination.how === "terminal" && a.termination.phase === b.termination?.phase), c("both ways work on the same skills from exponents on", from(a) === from(b) && from(a) !== "")] };
    } },
  { id: "S06", title: "A first answer right after a hint or the worked solution is never 'on your own'", slips: [], policy: { kind: "immediate" }, originals: [DISC], critical: [QD], ends: "none", child: "answers right with help", run: (m) => {
    const checks: Check[] = []; const runs: LabRun[] = [];
    for (const o of [{ hints: 1 }, { solution: true }]) {
      const run = lab("lab-s06", child([], { kind: "immediate" }), 10, [QD], m); runs.push(run);
      run.answer(DISC, "original", "helped", "attempt", null, o);
      const s = run.state(); let r = recovery(DISC, s.records, s.evidence, run.now, run.session); if (m?.recovery) r = m.recovery(r, run);
      const w = "hints" in o ? "a hint" : "the solution";
      checks.push(c(`with ${w}: the child's own answer is right`, run.rows[0].right === true && run.rows[0].provenance === "computed"), c(`with ${w}: not 'solved on your own'`, r.phase !== "solved"), c(`with ${w}: the discriminant is not shown on your own`, !SHOWN.includes(run.rows[0].status[QD])));
    }
    return { run: runs[0], runs, checks };
  } },
  { id: "S07", title: "A lesson, and right answers with help, are not evidence of learning", slips: ["tables78"], policy: { kind: "immediate" }, originals: [LDIV], critical: [MT], ends: "none", run: (m) => {
    const run = lab("lab-s07", child(["tables78"], { kind: "immediate" }), 5, [MT, LD], m);
    run.answer("mt-d1", "diagnostic", "pre", "explore", MT); run.answer(LDIV, "original", "pre", "attempt", null);
    run.teach(MT, "decomposition", "lesson only");
    const lessonRow = run.rows.at(-1)!;
    for (let k = 0; k < 3; k++) { const g = freshOf(run, "mul", (x) => /7 ×|× 7|8 ×|× 8/.test(question(x).prompt)); if (g) run.answer(g, "guided", "guided", "guided", MT, { hints: 1 }); }
    const assisted = run.rows.filter((r) => r.activity === "guided" && r.right === true && r.provenance === "computed");
    return { run, checks: [c("before the lesson both answers are wrong because of the slip", run.rows.slice(0, 2).every((r) => wrongBy(r, "tables78"))), c("right after the lesson: times tables not shown on your own", !SHOWN.includes(lessonRow.status[MT])), c("at least two answers with help are right", assisted.length >= 2), c("after every right answer with help: times tables not shown on your own", assisted.length > 0 && assisted.every((r) => !SHOWN.includes(r.status[MT])))] };
  } },
  { id: "S08", title: "A repair is proven by a new question the child has not seen, answered alone, that the slip would get wrong", slips: ["tables78"], policy: { kind: "immediate" }, pairedWith: "S11", originals: [LDIV], critical: [LD, MT], ends: "terminal", run: (m) => {
    const run = lab("lab-s08", child(["tables78"], { kind: "immediate" }), 5, [LD, MT], m); const r = run.recover(LDIV, 80);
    const lesson = lessons(run).at(0)?.n ?? Infinity;
    const slipChild = child(["tables78"], { kind: "unsuccessful" });
    const fresh = run.rows.find((t) => t.qid && t.n > lesson && base(t.qid) !== LDIV && question(t.qid).competency === LD && !run.rows.some((x) => x.n < t.n && x.qid && base(x.qid) === base(t.qid!))
      && t.hints === 0 && !t.solution && t.activity !== "guided" && t.right === true && t.provenance === "computed" && slipChild.compute(t.qid).text !== t.response);
    return { run, checks: [c("the first answer is wrong because of the slip", firstWrongBy(run, LDIV, "tables78")), c("recovery ends solved", SOLVED.includes(r.phase)), c("after the lesson, a never-asked long-division question is answered right alone, and the slip would have got it wrong", !!fresh)] };
  } },
  { id: "S09", title: "Two slips at once on the discriminant (sign of a product, subtracting a negative): each found and assessed", slips: ["signMul", "subNeg"], policy: { kind: "immediate" }, originals: [DISC], critical: [IM, IA, QD], ends: "terminal", run: (m) => {
    const run = lab("lab-s09", child(["signMul", "subNeg"], { kind: "immediate" }), 10, [IM, IA, QD], m); run.recover(DISC, 90);
    const alone = (s: string, other: string) => run.rows.some((r) => r.right === false && r.fired?.includes(s) && !r.fired.includes(other));
    const assessedWrong = (comp: string, s: string) => run.rows.some((r) => r.qid && r.active === comp && wrongBy(r, s));
    return { run, checks: [c("the first answer is wrong because of a slip", run.rows[0]?.right === false && run.rows[0].provenance === "computed" && (run.rows[0].fired?.length ?? 0) > 0), c("the sign slip shows on its own in some answer", alone("signMul", "subNeg")), c("subtracting a negative shows on its own in some answer", alone("subNeg", "signMul")), c("integer multiplication is assessed and the sign slip shows there", assessedWrong(IM, "signMul")), c("integer addition is assessed and subtracting a negative shows there", assessedWrong(IA, "subNeg")), c("solved only after both skills are taught", solvedOnlyAfter(run, IM) && solvedOnlyAfter(run, IA))] };
  } },
  { id: "S10", title: "Stopping halfway and coming back the next day from the saved records: nothing repeated, same outcome", slips: ["tables78"], policy: { kind: "immediate" }, originals: [LDIV], critical: [LD, MT], ends: "terminal", run: (m) => {
    const a = lab("lab-s10", child(["tables78"], { kind: "immediate" }), 5, [LD, MT], m); const ra = a.recover(LDIV, 80);
    const b = lab("lab-s10", child(["tables78"], { kind: "immediate" }), 5, [LD, MT], m); b.recoverFor(LDIV, 6);
    const paused = b.termination?.how === "paused" && b.questions() > 0;
    const b2 = LabRun.restore(b); b2.later(1); const rb = b2.recover(LDIV, 80);
    const ex = b2.asked().filter((q) => base(q) !== LDIV).map(base);
    const end = (x: LabRun) => x.watch.map((w) => x.status(w)).join();
    return { run: b2, runs: [a, b2], extra: `--- without the break:\n${a.trace()}`, checks: [c("the break comes in the middle of the recovery", paused), c("without the break the run ends clearly", a.termination?.how === "terminal"), c("after the break the run ends clearly", b2.termination?.how === "terminal"), c("no question asked twice", ex.length > 0 && ex.every((q, i) => ex.indexOf(q) === i)), c("same outcome as without the break", rb.phase === ra.phase && end(a) === end(b2))] };
  } },
  { id: "S11", title: "Teaching does not take: the app stops in time and claims nothing", slips: ["tables78"], policy: { kind: "unsuccessful" }, pairedWith: "S08", originals: [LDIV], critical: [LD, MT], ends: "terminal", run: (m) => {
    const run = lab("lab-s11", child(["tables78"], { kind: "unsuccessful" }), 5, [LD, MT], m); const r = run.recover(LDIV, 120);
    return { run, checks: [c("the first answer is wrong because of the slip", firstWrongBy(run, LDIV, "tables78")), c("stops for a teacher or parent", r.phase === "escalate"), c("within 60 steps", run.rows.length < 60), c("times tables are never shown on your own", neverShown(run, MT)), c("long division is never shown on your own", neverShown(run, LD))] };
  } },
  { id: "S12", title: "Forgotten a week later: the delayed check catches it and the record shows it", slips: ["tables78"], policy: { kind: "forgotten", afterDays: 5 }, originals: [LDIV], critical: [MT], ends: "terminal", run: (m) => {
    const run = lab("lab-s12", child(["tables78"], { kind: "forgotten", afterDays: 5 }), 5, [MT, LD], m); run.recover(LDIV, 80);
    const end = { ...run.termination! };
    const shownBefore = run.rows.some((r) => SHOWN.includes(r.status[MT]));
    run.later(9); const back = run.child.active.has("tables78");
    const s = run.state(); let ms = s.module(MT, false); if (m?.module) ms = m.module(ms, MT, run);
    if (ms.question) run.answer(ms.question, ms.activity ?? "retention", "day 9", ms.phase, MT);
    const check = run.rows.at(-1)!;
    const ev = run.state().evidence(MT);
    run.termination = end;
    return { run, checks: [c("before the break, times tables were shown on your own", shownBefore), c("the slip has come back by day 9", back), c("the delayed check is asked", ms.phase === "retention" && check.activity === "retention"), c("the delayed check is answered wrong because of the slip", ms.phase === "retention" && wrongBy(check, "tables78")), c("the record shows the failed check: retention failed, the skill back to review", ev.retention === "failed" && ev.status === "review" && ev.recoveryRequired)] };
  } },
  { id: "S13", title: "Class 10 matrix multiplication: the right foundations are checked", slips: ["signMul"], policy: { kind: "immediate" }, originals: ["gen:apmmul:-3,-3,1,-2,4,-1,5,0"], critical: [IM], ends: "terminal", run: (m) => {
    const id = "gen:apmmul:-3,-3,1,-2,4,-1,5,0"; const run = lab("lab-s13", child(["signMul"], { kind: "immediate" }), 10, [IM, "MATH.algebra.matrices"], m);
    const sup = questionSupports(id, run.state().records).map((s) => s.id); run.recover(id, 60);
    return { run, checks: [c("the first answer is wrong because of the sign slip", firstWrongBy(run, id, "signMul")), c("not sent to inverse functions or sequences", !sup.includes("MATH.algebra.inverse-functions") && !sup.includes("MATH.algebra.geometric-sequences")), c("integer multiplication is a support", sup.includes(IM)), c("a question on integer multiplication is asked", assessed(run, IM, 1)), c("matrices are a Class 10 skill in Tamil Nadu", graph.get("MATH.algebra.matrices").gradeRange[0] <= 10 && withinGrade(run.state().records, id))] };
  } },
  { id: "S14", title: "Class 10 child opens the discriminant normally: sign slip found, nothing overclaimed on the way", slips: ["signMul"], policy: { kind: "immediate" }, originals: [], critical: [QD, IM], ends: "terminal", run: (m) => {
    const run = lab("lab-s14", child(["signMul"], { kind: "immediate" }), 10, [QD, IM], m); run.learn(QD, 100);
    return { run, checks: [c("default settings", prerequisiteAfterOwn()), c("the sign slip shows in a discriminant answer", run.rows.some((r) => r.active === QD && wrongBy(r, "signMul"))), c("a question on integer multiplication is asked", assessed(run, IM)), c("the discriminant is not shown on your own at any step while the slip remains", heldWhile(run, QD, "signMul"))] };
  } },
  { id: "S15", title: "Class 2: adding without carrying (47 + 38 = 75) is found and taught", slips: ["noCarry"], policy: { kind: "immediate" }, pairedWith: "S15c", originals: ["gen:addr:47,38"], critical: [AR], ends: "terminal", run: (m) => {
    const run = lab("lab-s15", child(["noCarry"], { kind: "immediate" }), 2, [AR], m); run.recover("gen:addr:47,38", 60);
    return { run, checks: [c("the first answer is wrong because of the carrying slip", firstWrongBy(run, "gen:addr:47,38", "noCarry")), c("a question on carrying is asked", assessed(run, AR, 1)), c("a lesson on carrying is given", lessons(run, AR).length > 0), c("adding with carrying is not shown on your own at any step while the slip remains", heldWhile(run, AR, "noCarry"))] };
  } },
  { id: "S15c", title: "Control for S15: the same carrying slip, and teaching does not take", slips: ["noCarry"], policy: { kind: "unsuccessful" }, pairedWith: "S15", originals: ["gen:addr:47,38"], critical: [AR], ends: "terminal", run: (m) => {
    const run = lab("lab-s15c", child(["noCarry"], { kind: "unsuccessful" }), 2, [AR], m); const r = run.recover("gen:addr:47,38", 120);
    return { run, checks: [c("the first answer is wrong because of the carrying slip", firstWrongBy(run, "gen:addr:47,38", "noCarry")), c("stops for a teacher or parent", r.phase === "escalate"), c("adding with carrying is never shown on your own", neverShown(run, AR))] };
  } },
  { id: "S16", title: "Class 2: smaller-from-larger subtraction (52 − 27 = 35) is found and taught", slips: ["smallerFromLarger"], policy: { kind: "immediate" }, pairedWith: "S16c", originals: ["gen:acsub2:52,27"], critical: [SR], ends: "terminal", run: (m) => {
    const run = lab("lab-s16", child(["smallerFromLarger"], { kind: "immediate" }), 2, [SR], m); run.recover("gen:acsub2:52,27", 60);
    return { run, checks: [c("the first answer is wrong because of the borrowing slip", firstWrongBy(run, "gen:acsub2:52,27", "smallerFromLarger")), c("a question on borrowing is asked", assessed(run, SR, 1)), c("a lesson on borrowing is given", lessons(run, SR).length > 0), c("subtracting with borrowing is not shown on your own at any step while the slip remains", heldWhile(run, SR, "smallerFromLarger"))] };
  } },
  { id: "S16c", title: "Control for S16: the same borrowing slip, and teaching does not take", slips: ["smallerFromLarger"], policy: { kind: "unsuccessful" }, pairedWith: "S16", originals: ["gen:acsub2:52,27"], critical: [SR], ends: "terminal", run: (m) => {
    const run = lab("lab-s16c", child(["smallerFromLarger"], { kind: "unsuccessful" }), 2, [SR], m); const r = run.recover("gen:acsub2:52,27", 120);
    return { run, checks: [c("the first answer is wrong because of the borrowing slip", firstWrongBy(run, "gen:acsub2:52,27", "smallerFromLarger")), c("stops for a teacher or parent", r.phase === "escalate"), c("subtracting with borrowing is never shown on your own", neverShown(run, SR))] };
  } },
  { id: "S17", title: "A child who guesses is never told it worked on its own, and stops for help", slips: [], policy: { kind: "immediate" }, originals: [DISC], critical: [], ends: "terminal", child: "guesses every answer", run: (m) => {
    const run = lab("lab-s17", child([], { kind: "immediate" }, { guesser: true }), 10, [QD], m); const r = run.recover(DISC, 80);
    return { run, checks: [c("every answer is a guess", run.attempts().length > 0 && run.attempts().every((t) => t.provenance === "guessed")), c("not 'solved on your own'", r.phase !== "solved"), c("the discriminant is never shown on your own", neverShown(run, QD)), c("stops for a teacher or parent", r.phase === "escalate")] };
  } },
  { id: "S18", title: "The child remembers the answer to the problem but has not learned it: new questions catch it", slips: ["tables78"], policy: { kind: "unsuccessful" }, originals: [LDIV], critical: [LD], ends: "terminal", child: `${SLIPS.tables78.says}; after its first try, remembers that 126 ÷ 7 = 18`, run: (m) => {
    let tries = 0;
    const run = lab("lab-s18", child(["tables78"], { kind: "unsuccessful" }, { remembers: (q) => (q === LDIV && tries++ > 0 ? "18" : null) }), 5, [LD, MT], m);
    const r = run.recover(LDIV, 120);
    const remembered = run.rows.find((x) => x.qid === LDIV && x.provenance === "memorized" && x.right === true);
    const after = remembered ? run.rows.filter((t) => t.n > remembered.n && t.qid && base(t.qid) !== LDIV) : [];
    return { run, checks: [c("the first answer is the child's own, and wrong because of the slip", firstWrongBy(run, LDIV, "tables78")), c("the remembered answer is given, and it is right", !!remembered), c("new questions are asked after the remembered answer, and the slip shows in one", after.some((t) => wrongBy(t, "tables78"))), c("not counted as solved", !SOLVED.includes(r.phase)), c("long division is never shown on your own", neverShown(run, LD))] };
  } },
  { id: "S19", title: "Teaching takes only the second time: no success claimed after the first lesson", slips: ["tables78"], policy: { kind: "delayed", lessons: 2 }, pairedWith: "S08", originals: [LDIV], critical: [LD, MT], ends: "terminal", run: (m) => {
    const run = lab("lab-s19", child(["tables78"], { kind: "delayed", lessons: 2 }), 5, [LD, MT], m); const r = run.recover(LDIV, 120);
    return { run, checks: [c("the first answer is wrong because of the slip", firstWrongBy(run, LDIV, "tables78")), c("long division is not shown on your own at any step while the slip remains", heldWhile(run, LD, "tables78")), c("times tables are not shown on your own at any step while the slip remains", heldWhile(run, MT, "tables78")), c("after a lesson that did not take, the app teaches again or stops for a person", r.phase === "escalate" || lessons(run, MT).length >= 2), c("not solved while the slip remains", !SOLVED.includes(r.phase) || !run.child.active.has("tables78"))] };
  } },
  { id: "S20", title: "Two slips, only one repaired by teaching: the problem is not counted solved", slips: ["signMul", "subNeg"], policy: { kind: "partial", repairs: ["signMul"] }, pairedWith: "S09", originals: [DISC], critical: [IM, IA, QD], ends: "terminal", run: (m) => {
    const run = lab("lab-s20", child(["signMul", "subNeg"], { kind: "partial", repairs: ["signMul"] }), 10, [IM, IA, QD], m); const r = run.recover(DISC, 120);
    return { run, checks: [c("the first answer is wrong because of a slip", run.rows[0]?.right === false && run.rows[0].provenance === "computed" && (run.rows[0].fired?.length ?? 0) > 0), c("not counted as solved while subtracting a negative is still wrong", !SOLVED.includes(r.phase)), c("integer addition is never shown on your own", neverShown(run, IA)), c("the discriminant is never shown on your own", neverShown(run, QD))] };
  } },
  { id: "S21", title: "Class 10: a sign slip while factorising x² − x − 72 is checked as integer multiplication and taught", slips: ["signMul"], policy: { kind: "immediate" }, pairedWith: "S01c", originals: [FACT], critical: [IM, FA], ends: "terminal", run: (m) => {
    const run = lab("lab-s21", child(["signMul"], { kind: "immediate" }), 10, [IM, FA], m); run.recover(FACT, 90);
    return { run, checks: [c("the first answer is wrong because of the sign slip", firstWrongBy(run, FACT, "signMul")), c("a question on integer multiplication is asked", assessed(run, IM, 1)), c("a lesson on integer multiplication is given", lessons(run, IM).length > 0), c("factorising is not shown on your own at any step while the slip remains", heldWhile(run, FA, "signMul")), c("solved only after integer multiplication is taught", solvedOnlyAfter(run, IM))] };
  } },
];
export const SCENARIOS: Scenario[] = S;

// ------------------------------------------------------------------ the harness checks every scenario carries

/** a computed response is the child's own: working the same question again with the slips it had then gives the same text */
function ownWork(r: Row): boolean {
  if (r.provenance !== "computed" || !r.qid) return true;
  const w = work(question(r.qid), new LabChild(r.slips, { kind: "unsuccessful" }));
  return w.ok && w.work.text === r.response;
}
function harness(s: Scenario, runs: LabRun[]): Check[] {
  const rows = runs.flatMap((r) => r.attempts());
  const critical = rows.filter((r) => r.provenance === "unsupported" && (s.originals.map(base).includes(base(r.qid!)) || s.critical.includes(question(r.qid!).competency) || s.critical.includes(r.active ?? "")));
  const ends = s.ends === "none" ? runs.every((r) => r.termination === null) : runs.every((r) => r.termination?.how === "terminal");
  return [
    { name: "harness: every computed answer is re-derived from the child's own working", ok: rows.every(ownWork), group: "harness" },
    { name: "harness: no critical answer is one the lab could not work out", ok: critical.length === 0, group: "harness" },
    { name: "harness: the run did not end on an answer the lab could not work out", ok: runs.every((r) => r.attempts().at(-1)?.provenance !== "unsupported"), group: "harness" },
    { name: s.ends === "none" ? "harness: no recovery was run" : "harness: the run ended by the engine's own stop, not by running out of steps", ok: ends, group: "harness" },
  ];
}
export function runScenario(s: Scenario, m: Mutant | null = null): Result {
  const out = s.run(m);
  const runs = out.runs ?? (out.run ? [out.run] : []);
  const own = out.checks.length ? out.checks : [{ name: "harness: the scenario has checks of its own", ok: false, group: "harness" as const }];
  const checks = [...own, ...harness(s, runs)];
  const provenance: Record<string, number> = {};
  for (const r of runs.flatMap((x) => x.attempts())) provenance[r.provenance!] = (provenance[r.provenance!] ?? 0) + 1;
  const main = out.run;
  return { id: s.id, title: s.title, child: s.child ?? says(s.slips), policy: describePolicy(s.policy), ...(s.pairedWith ? { pairedWith: s.pairedWith } : {}), checks, pass: checks.every((x) => x.ok), questions: main?.questions() ?? 0, provenance,
    termination: main?.termination ? `${main.termination.how}: ${main.termination.phase}` : "no recovery", trace: (main?.trace() ?? "") + (out.extra ? `\n${out.extra}` : "") };
}
export const problemExists = (id: string) => !!problemOf(base(id));
