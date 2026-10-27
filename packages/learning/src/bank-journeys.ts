/**
 * Ten scripted learner journeys on the verified bank only (acceptance test 9).
 *
 * These simulated learners test SYSTEM BEHAVIOUR only: that the bank serves what a journey asks for, says so when it
 * cannot, and that the engine never claims mastery from one interaction, from watching, from guessing or from
 * single-format evidence. They say nothing about whether anyone learns anything.
 *
 * Nothing is generated or solved here. Every item comes from requestItem(bank, ...). The learner is modelled by the
 * existing engine: records (records.ts) -> learnerState (session.ts) -> evidence.ts statuses, plan.ts nextActivity,
 * intervention.ts orderStrategies for the teaching block, reasoning.ts for the diagnosis of a recurring wrong answer.
 * What the harness adds is only the script (which item to ask for, how the simulated learner answers) and the clock.
 * The engine has no notion of difficulty bands, so the band to ask for is part of each script.
 *
 * Mastery is claimed by the engine alone (status "verified"). It is reachable only with the test-only review fixture
 * (shipped content is provisional, so verification is held by the shared content gate: see evidence.ts), which the
 * runner switches on for the run and off afterwards. Journey 1 also shows the same records without the fixture.
 */
import { BANDS, loadBank, memoryMissedLog, requestItem, type Band, type Bank, type BankItem, type MissKind, type MissedItem, type MissedItemLog, type Outcome, type Refused } from "./bank-serve";
import { boardFor } from "./curricula";
import { isCorrect, moduleFor, question } from "./content";
import { DAY, independentAttempt, rightAnswer, useReviewFixture, type SkillEvidence } from "./evidence";
import type { Phase } from "./families";
import { orderStrategies } from "./intervention";
import { nextFromReasoning, reason } from "./reasoning";
import type { LearningActivity, LearningRecord } from "./records";
import { learnerState } from "./session";
import type { Diagnosis } from "./diagnostic";

export const RELEASE_ID = "tn-samacheer-mathematics-grade-5";
const START = Date.parse("2026-09-01T09:00:00Z");
/** Skills whose families may be growing while these journeys are written: never picked for a journey. */
const MOVING = new Set(["MATH.number.fraction-of-collection", "MATH.geometry.fractal-iteration", "MATH.measurement.time-speed-intro", "MATH.geometry.solid-views"]);

// ---------------------------------------------------------------- small helpers

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Format = "choice" | "typed";
const formatOf = (i: BankItem): Format => (i.answerType === "choice" ? "choice" : "typed");
const activityOf = (p: Phase): LearningActivity => p; // diagnostic | check | practice | retention are learning activities too

export type How = "right" | "guess" | { wrong: string | true };
export interface StepLog {
  n: number;
  day: number;
  session: number;
  kind: "attempt" | "view" | "teach" | "wait" | "refused";
  competency?: string;
  item?: string;
  phase?: string;
  band?: number;
  format?: string;
  activity?: string;
  response?: string;
  right?: boolean;
  hints?: number;
  /** Which written misunderstanding the wrong answer was predicted by (or "none predicted"). */
  bug?: string;
  note?: string;
}
export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}
export interface CompetencyFinal {
  status: string;
  retention: string;
  independent: { right: number; total: number };
  assisted: { right: number; total: number };
  engine: string;
  /** The engine's own claim: status "verified". */
  masteryClaimed: boolean;
}
export interface JourneyResult {
  id: number;
  learner: string;
  title: string;
  competencies: string[];
  steps: StepLog[];
  stepsTaken: number;
  itemsServed: string[];
  refusals: { kind: MissKind; reason: string }[];
  missedItemLog: MissedItem[];
  final: Record<string, CompetencyFinal>;
  checks: Check[];
  findings: string[];
}

// ---------------------------------------------------------------- the simulated learner (pseudonymous, records only)

class Learner {
  readonly events: LearningRecord[] = [];
  readonly steps: StepLog[] = [];
  readonly served: BankItem[] = [];
  readonly refusals: Refused[] = [];
  readonly unexpected: string[] = [];
  readonly checks: Check[] = [];
  readonly findings: string[] = [];
  readonly competencies = new Set<string>();
  readonly random: () => number;
  now = START;
  session = 1;
  private seq = 0;
  private n = 0;
  private rel = boardFor("tn", 5)!;
  readonly id: string;
  readonly bank: Bank;
  readonly log: MissedItemLog;
  constructor(id: string, bank: Bank, log: MissedItemLog, seed: number) {
    this.id = id;
    this.bank = bank;
    this.log = log;
    this.random = rng(seed);
    const at = this.stamp();
    this.events.push({ kind: "learning_record", id: this.rid(), at, learnerId: id, sessionId: this.sid(), record: "enrol", grade: 5, academicYear: "2026-27", curriculum: { id: this.rel.id, version: this.rel.version, hash: this.rel.hash } });
  }
  private sid() {
    return `${this.id}:s${this.session}`;
  }
  private rid() {
    return `${this.id}:r${this.seq++}`;
  }
  private stamp() {
    this.now += 60_000;
    return new Date(this.now).toISOString();
  }
  private log1(s: Omit<StepLog, "n" | "day" | "session">) {
    this.steps.push({ n: ++this.n, day: Math.floor((this.now - START) / DAY), session: this.session, ...s });
  }
  chk(name: string, ok: boolean, detail?: string) {
    this.checks.push({ name, ok, ...(detail ? { detail } : {}) });
  }

  /** A new visit (a new session), some days later. */
  visit(days = 0) {
    this.now += days * DAY;
    this.session++;
    if (days) this.log1({ kind: "wait", note: `${days} day(s) pass` });
  }
  state() {
    return learnerState(this.id, this.events, this.now, { currentSession: this.sid() });
  }
  ev(c: string): SkillEvidence {
    return this.state().evidence(c);
  }
  /** Wait (new visit) until the delayed check of c is due. */
  waitUntilDue(c: string) {
    const due = this.ev(c).retentionDueAt;
    if (!due) throw new Error(`${this.id}: no delayed check is scheduled for ${c}`);
    const days = Math.max(0, Math.ceil((Date.parse(due) - this.now) / DAY));
    this.visit(days);
  }

  /** Ask the bank for an item. A refusal is recorded; it is "unexpected" unless the script expects this kind. */
  request(c: string, phase: Phase, o: { band?: Band; format?: Format; expect?: MissKind } = {}): Outcome {
    this.competencies.add(c);
    const out = requestItem(this.bank, { competency: c, phase, difficulty: o.band, format: o.format, excludeIds: this.served.map((i) => i.id) }, this.log);
    if (out.ok) {
      this.served.push(out.item);
      return out;
    }
    this.refusals.push(out);
    this.log1({ kind: "refused", competency: c, phase, band: o.band, format: o.format, note: `${out.kind}: ${out.reason}` });
    if (out.kind !== o.expect) this.unexpected.push(`${c} ${phase} band ${o.band ?? "any"} ${o.format ?? ""}: ${out.kind}`);
    return out;
  }
  /** The simulated learner's answer. A wrong answer is one the item's own written misunderstandings predict. */
  respond(item: BankItem, how: How): { response: string; bug?: string } {
    if (how === "right") return { response: item.answer };
    if (how === "guess") {
      if (item.answerType !== "choice") throw new Error("guessing is scripted on multiple choice only");
      const letters = "ABCD".slice(0, item.options?.length ?? 4);
      return { response: letters[Math.floor(this.random() * letters.length)] };
    }
    const wanted = how.wrong === true ? undefined : how.wrong;
    const hit = item.wrongAnswers.find((w) => (!wanted || w.id === wanted) && w.responses.some((r) => !isCorrect(question(item.id), r)));
    if (hit) return { response: hit.responses.find((r) => !isCorrect(question(item.id), r))!, bug: hit.id };
    // no written misunderstanding applies to this item: a learner who simply picks another option, or gives 0
    if (item.answerType === "choice") return { response: "ABCD".slice(0, item.options?.length ?? 4).split("").find((l) => l !== item.answer)!, bug: "none predicted" };
    return { response: item.answer === "0" ? "1" : "0", bug: "none predicted" };
  }
  /** Record one attempt (the same record the app writes). */
  attempt(item: BankItem, how: How, activity: LearningActivity = activityOf(item.phase), hints = 0): boolean {
    const { response, bug } = this.respond(item, how);
    this.events.push({ kind: "learning_record", id: this.rid(), at: this.stamp(), learnerId: this.id, sessionId: this.sid(), record: "attempt", questionId: item.id, response, activity, hints, solution: false, competency: question(item.id).competency });
    const right = isCorrect(question(item.id), response);
    this.log1({ kind: "attempt", competency: item.competency, item: item.id, phase: item.phase, band: item.difficulty, format: formatOf(item), activity, response, right, hints, ...(bug ? { bug } : {}) });
    return right;
  }
  /** request + attempt. Null when the bank refused. */
  work(c: string, phase: Phase, how: How, o: { band?: Band; format?: Format; activity?: LearningActivity; hints?: number; expect?: MissKind } = {}): { item: BankItem; right: boolean } | null {
    const out = this.request(c, phase, o);
    if (!out.ok) return null;
    return { item: out.item, right: this.attempt(out.item, how, o.activity ?? activityOf(phase), o.hints ?? 0) };
  }
  /** Shown, not answered: nothing is recorded (looking at a question is not evidence). */
  view(c: string, phase: Phase, o: { band?: Band } = {}): BankItem | null {
    const out = this.request(c, phase, o);
    if (!out.ok) return null;
    this.log1({ kind: "view", competency: c, item: out.item.id, phase: out.item.phase, band: out.item.difficulty, format: formatOf(out.item) });
    return out.item;
  }
  /** A teaching block, in the order intervention.ts gives the strategies for this kind of misunderstanding. */
  teach(c: string, kind: "conceptual" | "procedural" | "recall" | "prerequisite" | null = null): string {
    this.competencies.add(c);
    const m = moduleFor(c);
    if (!m) throw new Error(`no module for ${c}`);
    const taught = new Set(this.state().records.teaching.filter((t) => t.competency === c).map((t) => t.strategy));
    const order = orderStrategies(m, { result: kind } as Diagnosis, this.state().records);
    const s = order.find((x) => !taught.has(x.id)) ?? order[0];
    this.events.push({ kind: "learning_record", id: this.rid(), at: this.stamp(), learnerId: this.id, sessionId: this.sid(), record: "teach", competency: c, strategy: s.id, rule: kind ?? "diagnosis" });
    this.log1({ kind: "teach", competency: c, note: `strategy ${s.id}${kind ? ` (for a ${kind} misunderstanding)` : ""}` });
    return s.id;
  }
  /** Independent work on c, as a steady learner: two formats, two visits. Returns when the skill is shown on its own. */
  steady(c: string, o: { band?: Band; formats?: [Format | undefined, Format | undefined] } = {}) {
    const [f0, f1] = o.formats ?? ["choice", "typed"];
    const b = o.band;
    this.work(c, "diagnostic", "right", { band: b, format: f0 });
    this.work(c, "check", "right", { band: b, format: f1 });
    this.visit(1);
    this.work(c, "practice", "right", { band: b, format: f1 });
    this.work(c, "practice", "right", { band: b, format: f0 });
    this.work(c, "check", "right", { band: b, format: f1 });
  }
  delayedCheck(c: string, how: [How, How] = ["right", "right"], o: { band?: Band; formats?: [Format | undefined, Format | undefined] } = {}) {
    const [f0, f1] = o.formats ?? ["choice", "typed"];
    this.work(c, "retention", how[0], { band: o.band, format: f0 });
    this.work(c, "retention", how[1], { band: o.band, format: f1 });
  }
}

// ---------------------------------------------------------------- which skills the journeys use (chosen from the bank, not from totals)

interface Pick {
  phases?: Phase[];
  band?: Band;
  /** At least this many items of each phase (in the band, per format when both formats are needed). */
  min: number;
  both: boolean;
}
function depthOf(bank: Bank, c: string, p: Pick) {
  const its = bank.items.filter((i) => i.competency === c && (!p.band || i.difficulty === p.band));
  const need = (i: BankItem[]) => (p.phases ?? ["diagnostic", "check", "practice", "retention"]).every((ph) => i.filter((x) => x.phase === ph).length >= p.min);
  const types = new Set(its.map((i) => formatOf(i)));
  return p.both ? types.size === 2 && need(its.filter((i) => formatOf(i) === "choice")) && need(its.filter((i) => formatOf(i) === "typed")) : need(its);
}
const candidates = (bank: Bank) => bank.competencies.filter((c) => !MOVING.has(c) && bank.items.some((i) => i.competency === c));
/** The first (sorted) skill with enough items in every phase, preferring `prefer` when it qualifies. */
function pick(bank: Bank, p: Pick, o: { prefer?: string; not?: string[] } = {}): string {
  const ok = candidates(bank).filter((c) => !(o.not ?? []).includes(c) && depthOf(bank, c, p));
  if (o.prefer && ok.includes(o.prefer)) return o.prefer;
  if (!ok.length) throw new Error(`no Grade 5 skill has the depth ${JSON.stringify(p)}`);
  return ok[0];
}
/** A skill whose bank has a single answer type (so the shared engine sees one format only). */
function pickSingleFormat(bank: Bank, not: string[]): string {
  const ok = candidates(bank).filter((c) => !not.includes(c) && new Set(bank.items.filter((i) => i.competency === c).map((i) => i.answerType)).size === 1 && depthOf(bank, c, { min: 4, both: false }));
  if (!ok.length) throw new Error("no single-format skill with enough depth");
  return ok[0];
}

// ---------------------------------------------------------------- generic checks (every journey)

function general(L: Learner, o: { allowRepeat?: boolean } = {}) {
  L.chk("no request hit a missing item unexpectedly", L.unexpected.length === 0, L.unexpected.join("; "));
  // no item served twice in the same phase (an item is never repeated at all unless the journey intends it)
  const seen = new Map<string, number>();
  for (const i of L.served) seen.set(`${i.phase}|${i.id}`, (seen.get(`${i.phase}|${i.id}`) ?? 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  L.chk("no item served twice in the same phase", o.allowRepeat || dup.length === 0, dup.join(", "));
  // every answered item was served by requestItem
  const attempted = L.steps.filter((s) => s.kind === "attempt").map((s) => s.item!);
  L.chk("every item answered was served by the bank (nothing generated)", attempted.every((id) => L.bank.byId.has(id) && L.served.some((s) => s.id === id)));
  // pseudonymous record: a learner-NN id, and records carry no name or birth date fields
  const keys = new Set(L.events.flatMap((e) => Object.keys(e)));
  L.chk("pseudonymous learner record (no names or birth dates)", /^learner-\d{2}$/.test(L.id) && ![...keys].some((k) => /name|birth|dob|email/i.test(k)));
  // the mastery rules, for every skill the journey touched
  const st = L.state();
  for (const c of L.competencies) {
    const e = st.evidence(c);
    const mine = st.records.attempts.filter((a) => question(a.questionId).competency === c);
    const rightIndependent = mine.filter((a) => independentAttempt(a) && rightAnswer(a));
    const distinct = new Set(rightIndependent.map((a) => a.questionId));
    const types = new Set([...distinct].map((id) => L.bank.byId.get(id)!.answerType));
    if (e.status === "verified") {
      const due = e.retentionDueAt!;
      const delayed = mine.filter((a) => a.activity === "retention" && independentAttempt(a) && rightAnswer(a) && a.at >= due);
      L.chk(`${short(c)}: a mastery claim rests on varied evidence and a passed delayed check`, e.retention === "passed" && distinct.size >= 3 && types.size >= 2 && new Set(delayed.map((a) => a.questionId)).size >= 2 && Date.parse(due) - Date.parse(e.independentAt!) >= 7 * DAY, `types ${[...types]}, delayed ${delayed.length}`);
    }
    if (mine.length === 0) L.chk(`${short(c)}: no attempts, no mastery claim`, e.status !== "verified" && e.status !== "independent" && e.status !== "transfer");
  }
}
const short = (c: string) => c.split(".").slice(1).join(".");

function finish(L: Learner, id: number, title: string, o: { allowRepeat?: boolean } = {}): JourneyResult {
  general(L, o);
  const st = L.state();
  const final: Record<string, CompetencyFinal> = {};
  for (const c of [...L.competencies].sort()) {
    const e = st.evidence(c);
    final[c] = { status: e.status, retention: e.retention, independent: e.independent, assisted: e.assisted, engine: e.engine, masteryClaimed: e.status === "verified" };
  }
  return {
    id, learner: L.id, title, competencies: [...L.competencies].sort(), steps: L.steps, stepsTaken: L.steps.length,
    itemsServed: L.served.map((i) => i.id), refusals: L.refusals.map((r) => ({ kind: r.kind, reason: r.reason })),
    missedItemLog: [...L.log.entries()], final, checks: L.checks, findings: L.findings,
  };
}

// ---------------------------------------------------------------- the ten journeys

type Ctx = { bank: Bank; A: string; B: string; B2: string; R: string; G: string; H: string; S: string };
const newLearner = (n: number, bank: Bank, seed = n) => {
  let t = START;
  const log = memoryMissedLog(() => new Date((t += 1000)).toISOString());
  return new Learner(`learner-${String(n).padStart(2, "0")}`, bank, log, 1000 + seed);
};
let fixtureOn = false;
const setFixture = (on: boolean) => {
  fixtureOn = on;
  useReviewFixture(on ? { items: [], releasedAt: "2026-01-01T00:00:00Z", all: true } : null);
};
/** Runs f with the test-only review fixture on or off, then puts it back as it was. */
const withFixture = <T>(on: boolean, f: () => T): T => {
  const was = fixtureOn;
  setFixture(on);
  try {
    return f();
  } finally {
    setFixture(was);
  }
};

/** 1. Steady correct learner: a mastery claim only after varied evidence and a passed delayed check. */
function j1(x: Ctx) {
  const L = newLearner(1, x.bank);
  const A = x.A;
  L.steady(A, { band: 2 });
  const before = L.ev(A);
  L.chk("shown on their own after varied answers, but not yet a mastery claim", (before.status === "independent" || before.status === "transfer") && !before.verified, before.status);
  L.chk("the delayed check is scheduled a week after independent success", before.retention === "scheduled" && Date.parse(before.retentionDueAt!) - Date.parse(before.independentAt!) >= 7 * DAY);
  L.visit(3);
  L.chk("three days later the delayed check is still not due (no claim)", L.ev(A).retention === "scheduled" && !L.ev(A).verified);
  L.waitUntilDue(A);
  const st = L.state();
  L.chk("the plan asks for the delayed check when it is due", st.next?.kind === "retention" && st.next.competency === A, `${st.next?.kind} ${st.next?.competency}`);
  L.delayedCheck(A);
  const after = L.ev(A);
  L.chk("verified only after the delayed check is passed", after.status === "verified" && after.retention === "passed");
  // the same records without the test-only review fixture: provisional content is never called verified
  const bare = withFixture(false, () => L.ev(A));
  L.chk("without educator-reviewed content the same records are not a mastery claim", bare.status !== "verified" && bare.retention === "passed", bare.status);
  // control: evidence in one answer format only, delayed check passed, is still not a mastery claim
  const B = x.B;
  L.steady(B, { formats: [undefined, undefined] });
  L.waitUntilDue(B);
  L.delayedCheck(B, ["right", "right"], { formats: [undefined, undefined] });
  const ctl = L.ev(B);
  L.chk("control: one answer format only, delayed check passed: not a mastery claim", ctl.retention === "passed" && ctl.status !== "verified", `${ctl.status}/${ctl.engineRetention}`);
  L.findings.push(`Single-format skills cannot be verified from the bank: the shared engine needs two answer formats. ${short(B)} has one answer type in the bank, so its delayed check passes (${ctl.retention}) yet its status stays ${ctl.status}.`);
  return finish(L, 1, "Steady correct learner: mastery only after varied evidence and a passed delayed check");
}

/** 2. A recurring wrong-answer pattern, remediation, recovery. */
function j2(x: Ctx) {
  const L = newLearner(2, x.bank);
  const c = x.R;
  const bug = recurringBug(x.bank, c);
  // three different problems, the same misunderstanding each time
  const asked: { item: BankItem; response: string }[] = [];
  for (let k = 0; k < 4 && asked.length < 3; k++) {
    const out = L.request(c, k === 0 ? "diagnostic" : "practice", { band: 1 });
    if (!out.ok) break;
    if (!out.item.wrongAnswers.some((w) => w.id === bug.id && w.responses.length)) {
      L.attempt(out.item, "right");
      continue;
    }
    const right = L.attempt(out.item, { wrong: bug.id });
    asked.push({ item: out.item, response: L.steps[L.steps.length - 1].response! });
    L.chk(`wrong answer ${asked.length} is the one the misunderstanding predicts`, !right && L.steps[L.steps.length - 1].bug === bug.id);
  }
  L.chk("the same misunderstanding showed on at least three different problems", asked.length >= 3 && new Set(asked.map((a) => a.item.id)).size >= 3, String(asked.length));
  const r = reason(asked[0].item.id, asked.map((a) => ({ questionId: a.item.id, response: a.response })));
  L.chk("the diagnosis is established only after it recurs, and names the misunderstanding", r?.status === "established" && r.best?.id === bug.id, `${r?.status} ${r?.best?.id}`);
  const plan = nextFromReasoning(r!, c);
  L.chk("the diagnosis leads to teaching that skill", plan.kind === "teach" && plan.competency === c, `${plan.kind} ${plan.competency}`);
  const mid = L.ev(c);
  L.chk("before remediation the skill is not shown on its own", mid.status !== "independent" && mid.status !== "verified" && mid.independent.right === 0, mid.status);
  // remediation: a teaching block, one guided item with a hint, then fresh checks alone
  L.visit(1);
  L.teach(c, bug.kind as never);
  const g = L.work(c, "practice", "right", { band: 1, activity: "guided", hints: 1 });
  L.chk("guided help counts as help, not independent work", !!g && g.right && L.ev(c).independent.right === 0);
  L.visit(1);
  // the learner now meets problems where the same misunderstanding would have shown, and gets them right on their own
  let met = 0;
  for (let k = 0; k < 8 && L.ev(c).status !== "independent" && L.ev(c).status !== "transfer"; k++) {
    const out = L.request(c, k % 2 ? "practice" : "check", { band: k < 4 ? 1 : 2 });
    if (!out.ok) break;
    if (out.item.wrongAnswers.some((w) => w.id === bug.id && w.responses.length)) met++;
    L.attempt(out.item, "right");
  }
  const end = L.ev(c);
  L.chk("after remediation the skill is shown on their own", end.status === "independent" || end.status === "transfer", end.status);
  L.chk("recovered on problems where the old misunderstanding would have shown", met >= 1, String(met));
  L.chk("recovery is progress, not a mastery claim (delayed check pending)", !end.verified && end.retention === "scheduled");
  return finish(L, 2, `Recurring wrong-answer pattern (${bug.id}), remediation, recovery`);
}
/** The written misunderstanding of c that shows on the most problems (so it can recur). */
function recurringBug(bank: Bank, c: string) {
  const count = new Map<string, { n: number; kind: string }>();
  for (const i of bank.items.filter((i) => i.competency === c && i.difficulty <= 2)) for (const w of i.wrongAnswers) if (w.responses.length && w.competency === c && w.kind !== "prerequisite") count.set(w.id, { n: (count.get(w.id)?.n ?? 0) + 1, kind: w.kind });
  const best = [...count].sort((a, b) => b[1].n - a[1].n || (a[0] < b[0] ? -1 : 1))[0];
  if (!best) throw new Error(`${c} has no written misunderstanding to recur`);
  return { id: best[0], kind: best[1].kind };
}

/** 3. Only watches and reads: no attempts, no mastery. */
function j3(x: Ctx) {
  const L = newLearner(3, x.bank);
  const c = x.A;
  L.teach(c);
  L.view(c, "practice", { band: 1 });
  L.view(c, "check", { band: 2 });
  L.visit(2);
  L.teach(c);
  L.view(c, "practice", { band: 2 });
  L.visit(30);
  const e = L.ev(c);
  const st = L.state();
  L.chk("no attempts were recorded", st.records.attempts.length === 0 && e.attempts.length === 0);
  L.chk("watching is exposure, never shown on their own, never verified", e.status === "exposure" && !e.verified, e.status);
  L.chk("no delayed check is ever scheduled from watching", e.retention === "none" && e.retentionDueAt === null);
  L.chk("the plan carries on with the skill (asks them to try it)", st.next?.kind === "continue" && st.next.competency === c, `${st.next?.kind} ${st.next?.competency}`);
  L.visit(60);
  L.chk("two months later still no mastery", L.ev(c).status === "exposure");
  return finish(L, 3, "Only watches and reads: must not reach mastery");
}

/** 4. One lucky correct answer. */
function j4(x: Ctx) {
  const L = newLearner(4, x.bank);
  const c = x.A;
  const lucky = L.work(c, "check", "right", { band: 2, format: "choice" });
  const e1 = L.ev(c);
  L.chk("one correct answer is not shown on their own", !!lucky && lucky.right && e1.status === "guided" && e1.independentAt === null, e1.status);
  L.chk("one correct answer schedules no delayed check", e1.retention === "none");
  L.visit(1);
  L.work(c, "practice", { wrong: true }, { band: 2, format: "choice" });
  L.visit(1);
  L.work(c, "diagnostic", { wrong: true }, { band: 2, format: "choice" });
  L.visit(30);
  const e2 = L.ev(c);
  L.chk("after more answers that are not right, still not shown and no claim", e2.status !== "independent" && e2.status !== "transfer" && e2.status !== "verified" && e2.independent.right === 1, `${e2.status} ${JSON.stringify(e2.independent)}`);
  L.chk("the plan keeps the skill in progress", L.state().next?.kind === "continue");
  return finish(L, 4, "One lucky correct answer: must not claim mastery");
}

/** 5. Fails the delayed check: the skill returns for review. */
function j5(x: Ctx) {
  const L = newLearner(5, x.bank);
  const c = x.A;
  L.steady(c, { band: 2 });
  L.waitUntilDue(c);
  L.chk("the delayed check is due", L.ev(c).retention === "due");
  L.work(c, "retention", "right", { band: 2, format: "choice" });
  L.work(c, "retention", { wrong: true }, { band: 2, format: "typed" });
  const e = L.ev(c);
  const st = L.state();
  L.chk("a missed delayed check is recorded as failed", e.retention === "failed", e.retention);
  L.chk("the skill returns for review, not verified", e.status === "review" && !e.verified, e.status);
  L.chk("the plan sends the learner back to review this skill", st.next?.kind === "review" && st.next.competency === c, `${st.next?.kind} ${st.next?.competency}`);
  // remediation and fresh answers on their own
  L.visit(1);
  L.teach(c);
  L.work(c, "practice", "right", { band: 2, activity: "guided", hints: 1 });
  L.visit(1);
  L.work(c, "check", "right", { band: 2, format: "typed" });
  L.work(c, "practice", "right", { band: 2, format: "choice" });
  L.visit(9);
  L.work(c, "retention", "right", { band: 2, format: "typed" });
  L.work(c, "retention", "right", { band: 2, format: "choice" });
  const later = L.ev(c);
  L.chk("fresh right answers later do not by themselves clear the missed check into a claim", later.status !== "verified", later.status);
  if (later.status === "review" && later.retention === "failed")
    L.findings.push("After a failed delayed check the skill stays in review for good: skillEvidence (evidence.ts) counts every retention answer given after the due time, and any wrong one fails the check for good, so no later delayed check can pass and verification cannot be reached again. The product rule (returns for review) holds; a path back (a new delayed check after relearning) does not exist yet.");
  return finish(L, 5, "Fails the delayed check: competency returns for review");
}

/** 6. A guessing learner on multiple choice. */
function j6(x: Ctx) {
  const run = (seed: number, id = 6) => {
    const L = newLearner(id, x.bank, seed);
    const c = x.G;
    const phases: Phase[] = ["diagnostic", "check", "practice", "practice", "check", "practice"];
    for (let v = 0; v < 3; v++) {
      for (const ph of phases) L.work(c, ph, "guess", { band: 2, format: "choice" });
      L.visit(2);
    }
    L.waitUntilDue(c);
    return { L, c };
  };
  const { L, c } = run(6);
  // delayed check only if the engine scheduled one for the guesses; either way answers are guesses
  if (L.ev(c).retention === "due") L.delayedCheck(c, ["guess", "guess"], { band: 2, formats: ["choice", "choice"] });
  const e = L.ev(c);
  const rightN = L.steps.filter((s) => s.kind === "attempt" && s.right).length;
  const total = L.steps.filter((s) => s.kind === "attempt").length;
  L.chk("the guesses were multiple choice only", L.steps.filter((s) => s.kind === "attempt").every((s) => s.format === "choice"));
  L.chk("guessing is not a mastery claim", e.status !== "verified" && !e.verified, `${e.status} (${rightN} of ${total} right by chance)`);
  // many seeds: how often does chance alone show a skill "on their own", and never a claim
  let independent = 0;
  let claims = 0;
  const seeds = 24;
  for (let s = 0; s < seeds; s++) {
    const r = run(100 + s, 6);
    const ev = r.L.ev(r.c);
    if (r.L.ev(r.c).retention === "due") r.L.delayedCheck(r.c, ["guess", "guess"], { band: 2, formats: ["choice", "choice"] });
    const end = r.L.ev(r.c);
    if (["independent", "transfer"].includes(ev.status)) independent++;
    if (end.status === "verified") claims++;
  }
  L.chk(`across ${seeds} guessing learners, none is ever a mastery claim`, claims === 0, `${claims} claims`);
  L.findings.push(`Guessing on multiple choice (${seeds} seeded learners, 18 questions each): ${independent} reached "shown on their own" by chance before any delayed check; ${claims} reached a mastery claim (the shared engine needs two answer formats and a passed delayed check).`);
  return finish(L, 6, "Guessing learner on multiple choice");
}

/** 7. High ability, starting at difficulty 3. */
function j7(x: Ctx) {
  const L = newLearner(7, x.bank);
  const c = x.H;
  L.steady(c, { band: 3 });
  const first = L.steps.filter((s) => s.kind === "attempt");
  L.chk("every question served from the start is difficulty 3", first.length > 0 && first.every((s) => s.band === 3));
  const e = L.ev(c);
  L.chk("shown on their own from the first visits, no teaching needed", (e.status === "independent" || e.status === "transfer") && L.state().records.teaching.length === 0, e.status);
  L.chk("not yet a claim until the delayed check", !e.verified);
  L.waitUntilDue(c);
  L.delayedCheck(c, ["right", "right"], { band: 3 });
  const end = L.ev(c);
  L.chk("verified after a passed delayed check, with difficulty 3 retention questions", end.status === "verified" && L.steps.filter((s) => s.phase === "retention").every((s) => s.band === 3));
  return finish(L, 7, "High ability, starting at difficulty 3");
}

/** 8. A struggling learner staying at difficulty 1. */
function j8(x: Ctx) {
  const L = newLearner(8, x.bank);
  const c = x.S;
  const phases: Phase[] = ["diagnostic", "practice", "check", "practice"];
  let wrongRun = 0;
  let taught = 0;
  let p = 0.3;
  for (let k = 0; k < 16; k++) {
    if (k > 0 && k % 4 === 0) L.visit(1);
    if (wrongRun >= 2 && taught < 2) {
      L.teach(c);
      taught++;
      p = 0.55;
      wrongRun = 0;
      L.work(c, "practice", "right", { band: 1, activity: "guided", hints: 1 });
      continue;
    }
    const right = L.random() < p;
    const out = L.work(c, phases[k % 4], right ? "right" : { wrong: true }, { band: 1 });
    if (!out) break;
    wrongRun = out.right ? 0 : wrongRun + 1;
  }
  const attempts = L.steps.filter((s) => s.kind === "attempt");
  L.chk("every question stayed at difficulty 1", attempts.length >= 12 && attempts.every((s) => s.band === 1));
  L.chk("wrong answers were met with teaching", taught >= 1 && attempts.some((s) => s.right === false));
  const e = L.ev(c);
  L.chk("no mastery claim, and no delayed check without independent success", !e.verified && (e.independentAt === null ? e.retention === "none" : true), `${e.status}/${e.retention}`);
  L.chk("the bank never ran dry for the struggling learner", L.refusals.length === 0);
  return finish(L, 8, "Struggling learner staying at difficulty 1");
}

/** 9. Two competencies interleaved. */
function j9(x: Ctx) {
  const L = newLearner(9, x.bank);
  const [A, B] = [x.A, x.B2];
  // A starts on day 0, B only on day 4; the work then alternates between them
  L.work(A, "diagnostic", "right", { band: 2, format: "choice" });
  L.work(A, "check", "right", { band: 2, format: "typed" });
  L.visit(1);
  L.work(A, "practice", "right", { band: 2, format: "typed" });
  L.work(A, "practice", "right", { band: 2, format: "choice" });
  L.visit(3);
  L.work(B, "diagnostic", "right", { band: 2, format: "choice" });
  L.work(A, "check", "right", { band: 2, format: "choice" });
  L.work(B, "check", "right", { band: 2, format: "typed" });
  L.work(A, "practice", "right", { band: 2, format: "typed" });
  L.visit(1);
  L.work(B, "practice", "right", { band: 2, format: "typed" });
  L.work(B, "practice", "right", { band: 2, format: "choice" });
  const nA = L.steps.filter((s) => s.kind === "attempt" && s.competency === A).length;
  const nB = L.steps.filter((s) => s.kind === "attempt" && s.competency === B).length;
  const [eA, eB] = [L.ev(A), L.ev(B)];
  L.chk("each skill's evidence counts only its own answers", eA.independent.total === nA && eB.independent.total === nB, `${eA.independent.total}/${nA} ${eB.independent.total}/${nB}`);
  L.chk("the two skills have their own delayed checks, on different dates", !!eA.retentionDueAt && !!eB.retentionDueAt && eA.retentionDueAt !== eB.retentionDueAt);
  L.waitUntilDue(A);
  const st = L.state();
  L.chk("the plan asks for the delayed check that is due first, not the other", st.next?.kind === "retention" && st.next.competency === A && L.ev(B).retention !== "due", `${st.next?.kind} ${st.next?.competency}; B ${L.ev(B).retention}`);
  L.work(B, "check", "right", { band: 2, format: "choice" }); // interleaved work on B meanwhile
  L.delayedCheck(A, ["right", "right"], { band: 2 });
  L.chk("passing one delayed check does not verify the other skill", L.ev(A).status === "verified" && L.ev(B).status !== "verified");
  L.waitUntilDue(B);
  L.chk("then the other is asked", L.state().next?.kind === "retention" && L.state().next!.competency === B);
  L.delayedCheck(B, ["right", "right"], { band: 2 });
  L.chk("both verified, each after its own delayed check", L.ev(A).status === "verified" && L.ev(B).status === "verified");
  return finish(L, 9, "Two competencies interleaved");
}

/** 10. Exhausts a band: the bank still serves (next band) or says so clearly. */
function j10(x: Ctx) {
  const L = newLearner(10, x.bank);
  const groups = new Map<string, BankItem[]>();
  for (const i of x.bank.items) if (!MOVING.has(i.competency)) groups.set(`${i.competency}|${i.phase}|${i.difficulty}`, [...(groups.get(`${i.competency}|${i.phase}|${i.difficulty}`) ?? []), i]);
  const g = [...groups]
    .filter(([k, v]) => {
      const [c, ph, b] = k.split("|");
      return v.length >= 3 && v.length <= 12 && BANDS.some((o) => o !== Number(b) && groups.has(`${c}|${ph}|${o}`));
    })
    .sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1))[0];
  if (!g) throw new Error("no small band to exhaust");
  const [c, ph, bandS] = g[0].split("|");
  const band = Number(bandS) as Band;
  const phase = ph as Phase;
  // (a) a band runs out: every item is served once, then a clear message that names the other levels, then the next band serves
  let served = 0;
  for (let k = 0; k < g[1].length; k++) if (L.work(c, phase, "right", { band })) served++;
  L.chk("every item of the band was served exactly once", served === g[1].length && new Set(L.served.map((i) => i.id)).size === served);
  const out = L.request(c, phase, { band, expect: "band-exhausted" });
  L.chk("the exhausted band gives a clear failure, not an unexplained one", !out.ok && out.kind === "band-exhausted" && out.reason.length > 40 && !!out.otherBands?.length, out.ok ? "served" : out.reason);
  L.chk("the failure is in the missed-item log", L.log.entries().some((e) => e.kind === "band-exhausted" && e.request.competency === c && e.request.difficulty === band));
  const next = !out.ok ? out.otherBands![0] : band;
  const fb = L.work(c, phase, "right", { band: next });
  L.chk("the next band still serves", !!fb && fb.item.difficulty === next && fb.item.difficulty !== band);
  // (b) a whole kind of question runs out: a clear message, and the learner is not given repeats
  const all = new Map<string, BankItem[]>();
  for (const i of x.bank.items) if (!MOVING.has(i.competency)) all.set(`${i.competency}|${i.phase}`, [...(all.get(`${i.competency}|${i.phase}`) ?? []), i]);
  const small = [...all].filter(([k]) => !k.startsWith(c)).sort((a, b) => a[1].length - b[1].length || (a[0] < b[0] ? -1 : 1))[0];
  const [c2, ph2] = small[0].split("|");
  L.visit(1);
  let n2 = 0;
  for (let k = 0; k < small[1].length; k++) if (L.work(c2, ph2 as Phase, "right")) n2++;
  const out2 = L.request(c2, ph2 as Phase, { expect: "band-exhausted" });
  L.chk("a whole kind of question served in full, then a clear failure (a teacher or parent is suggested)", n2 === small[1].length && !out2.ok && out2.kind === "band-exhausted" && /teacher or parent/.test(out2.reason), out2.ok ? "served" : out2.reason);
  L.chk("both failures logged, with no learner text", L.log.entries().length === 2 && L.log.entries().every((e) => !("freeText" in e.request)));
  return finish(L, 10, "Learner who exhausts a band: the bank still serves or says so");
}

// ---------------------------------------------------------------- run

export function runJourneys(releaseId = RELEASE_ID): JourneyResult[] {
  const bank = loadBank(releaseId);
  const rich = { min: 6, both: true, band: 2 as Band };
  const A = pick(bank, rich, { prefer: "MATH.number.rounding" });
  const x: Ctx = {
    bank,
    A,
    B: pickSingleFormat(bank, [A]),
    B2: pick(bank, rich, { not: [A] }),
    R: pick(bank, { min: 3, both: false, band: 1, phases: ["diagnostic", "practice", "check"] }, { prefer: "MATH.statistics.scaled-bars" }),
    G: pick(bank, { min: 12, both: true, band: 2, phases: ["diagnostic", "check", "practice", "retention"] }, { prefer: A }),
    H: pick(bank, { min: 6, both: true, band: 3 }, { prefer: A }),
    S: pick(bank, { min: 6, both: false, band: 1, phases: ["diagnostic", "practice", "check"] }, { prefer: A }),
  };
  try {
    return withFixture(true, () => [j1, j2, j3, j4, j5, j6, j7, j8, j9, j10].map((j) => j(x)));
  } finally {
    setFixture(false);
  }
}
