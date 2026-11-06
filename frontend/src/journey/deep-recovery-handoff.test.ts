/**
 * recovery-handoff@0 (RESEARCH): every honest stop of the flagged recovery becomes one hand-off report with the right reason, every other
 * screen none; the learner's note says only what the server confirmed. Real engine runs over synthetic learners; nothing here is evidence
 * of learning.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { DEEP_APP_OPTIONS, SITTING_GAP_MS, deepScreen, type DeepScreen } from "../learning/deep-recovery-app";
import { NOT_SENT, handoffReport, handoffText, reasonOf } from "../learning/deep-recovery-handoff";
import { withDecisions } from "../../../packages/learning/src/records";
import { structuredLearner, type Answerer } from "./deep-recovery-journey";
import { right, wrong } from "./learners";
import { question } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";
import { SliceSession } from "./session";

const P = "MATH.", ORIG = "gen:aupfr:1,-3,3,-2,-4", OWN = P + "calculus.integration-methods", PF = P + "algebra.partial-fractions";
const FACT = P + "algebra.factorisation", IDS = P + "algebra.identities", IADD = P + "number.integer-add", INTS = P + "number.integers";
const T0 = Date.parse("2026-11-05T09:00:00Z");
const EPISODE = /^deep:([^|#@>\s]{1,120})#(\d{4}-\d\d-\d\dT[0-9:.]+(?:Z|[+-]\d\d:\d\d))$/;
const SKILL = /^[A-Za-z0-9._-]{1,80}$/;

function run(id: string, answer: Answerer, o: { orig?: string; comp?: string; opts?: typeof DEEP_APP_OPTIONS } = {}) {
  const orig = o.orig ?? ORIG;
  let s = new SliceSession(`synthetic-handoff-${id}`, o.comp ?? OWN, T0);
  s.submit(orig, "1", "practice");
  const screens: DeepScreen[] = [];
  let x!: DeepScreen;
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < 300; i++) {
      const st = s.state();
      x = deepScreen(orig, st.records, st.evidence, s.now, o.opts ?? DEEP_APP_OPTIONS);
      screens.push(x);
      if (x.kind === "end") break;
      if (x.kind === "lesson") { s.taught(x.module, x.episode ?? undefined); continue; }
      const taughtSkills = s.events.filter((e) => (e as { record?: string }).record === "teach").map((e) => (e as unknown as { competency: string }).competency);
      s.submit(x.qid, answer(x.qid, { taughtSkills, answered: s.replies.length, activity: x.activity }), x.activity, { context: x.context });
    }
    if (x.kind !== "end" || x.phase !== "pause") break;
    s = SliceSession.fromEvents(s.learnerId, s.competency, withDecisions(s.events, s.decisions), s.now + SITTING_GAP_MS + 60_000, `s${round + 2}`);
  }
  return { last: x, screens, orig };
}

/** a learner who never gets partial fractions (nor the problem), whatever is taught: everything else right */
const stuck: Answerer = (qid) => (qid.startsWith("gen:aupfr") || graph.evidenceTarget(question(qid.replace(/:(mc|w)$/, "")).competency) === PF ? wrong(qid) : right(qid));
const checkShape = (orig: string, x: DeepScreen) => {
  const r = handoffReport(orig, x)!;
  assert.ok(r, "a stop that hands over is reported");
  assert.match(r.episode, EPISODE);
  assert.equal(EPISODE.exec(r.episode)![1], orig);
  assert.match(r.skill, SKILL);
  assert.ok(r.step === "" || SKILL.test(r.step));
  assert.ok(r.path.length <= 16 && r.path.every((p) => SKILL.test(p)));
  assert.ok(r.detail.length > 0 && r.detail.length <= 1000 && !r.detail.includes("<"));
  return r;
};

test("unavailable content: reported as missing-content at the unteachable step", () => {
  const { last, screens } = run("nocontent", structuredLearner({ "fam:aupfr": [PF], [PF]: [FACT], [FACT]: [IDS], [IDS]: [IADD], [IADD]: [INTS] }, [PF, FACT, IDS, IADD, INTS]));
  assert.equal(last.kind === "end" && last.phase, "blocked");
  const r = checkShape(ORIG, last);
  assert.equal(r.reason, "missing-content");
  assert.equal(r.step, last.state.blocked!.skill);
  assert.equal(r.skill, OWN);
  assert.ok(screens.slice(0, -1).every((x) => handoffReport(ORIG, x) === null), "no screen before the stop is reported");
});

test("no fresh question: reported as no-fresh-question", () => {
  const { last } = run("nofresh", structuredLearner({}, []), { orig: "di-d2", comp: P + "calculus.definite-integrals" });
  assert.equal(last.kind === "end" && last.phase, "escalate");
  assert.equal(checkShape("di-d2", last).reason, "no-fresh-question");
});

test("the effort limit: reported as budget-exhausted", () => {
  const { last } = run("budget", stuck, { opts: { ...DEEP_APP_OPTIONS, sessionBudget: undefined, budget: 8 } });
  assert.equal(last.kind === "end" && last.phase, "escalate", `${last.kind} ${last.state.phase} ${last.state.reason}`);
  assert.equal(checkShape(ORIG, last).reason, "budget-exhausted");
});

test("teaching that did not work: reported as teaching-not-worked", () => {
  const { last } = run("notclicked", stuck);
  assert.equal(last.kind === "end" && last.phase, "escalate", `${last.kind} ${last.state.phase} ${last.state.reason}`);
  assert.equal(checkShape(ORIG, last).reason, "teaching-not-worked");
});

test("teaching that did not work, and the engine's other stop reasons, map to a reason", () => {
  assert.equal(reasonOf("escalate", "Partial fractions looks like the missing piece, and the explanations OpenPath has for it have not clicked yet. Go through it with a teacher or parent."), "teaching-not-worked");
  assert.equal(reasonOf("escalate", "No gap was found in the skills OpenPath maps under X, and teaching X itself did not fix it."), "teaching-not-worked");
  assert.equal(reasonOf("escalate", "No gap was found in the skills OpenPath maps under X, and OpenPath cannot teach X itself (no module)."), "missing-content");
  assert.equal(reasonOf("escalate", "No gap was found in the skills OpenPath maps under X, and its module has no explanation to offer now."), "missing-content");
  assert.equal(reasonOf("escalate", "OpenPath has no fresh question left to check X again."), "no-fresh-question");
  assert.equal(reasonOf("escalate", "Recovery could not settle on a next step."), "unsettled");
  assert.equal(reasonOf("blocked", "anything"), "missing-content");
});

test("a learner who is taught through is never reported", () => {
  const { last, screens } = run("single", structuredLearner({ "fam:aupfr": [PF] }, [PF]));
  assert.ok(last.kind === "end" && (last.phase === "solved_after_help" || last.phase === "solved"), last.state.reason);
  assert.ok(screens.every((x) => handoffReport(ORIG, x) === null));
});

test("the learner's note says only what the server confirmed; never that a message was sent", () => {
  const open = { id: 1, skill: OWN, episode: "e", status: "open" as const, resolvedAt: null, note: "" };
  assert.equal(handoffText(null, true), NOT_SENT, "no answer from the server: the original honest note");
  assert.match(handoffText(open, true), /help list of the educator your family shared your work with/);
  assert.match(handoffText(open, true), /Nobody has been emailed or messaged/);
  assert.match(handoffText(open, false), /no educator can see it yet/);
  assert.match(handoffText(open, false), /OpenPath has not sent this to anyone/);
  const done = handoffText({ ...open, status: "resolved", resolvedAt: "2026-11-06T10:00:00Z", note: "We went through it." }, true);
  assert.match(done, /An educator marked this as dealt with on 2026-11-06\. Their note: “We went through it\.”/);
  assert.match(done, /Nothing here is counted as solved/);
  for (const t of [handoffText(open, true), handoffText(open, false), done, NOT_SENT]) assert.doesNotMatch(t, /\b(email(ed)? (has been|was) sent|notified|we have told|your teacher has been)/i);
});
