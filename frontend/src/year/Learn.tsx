import { contentEligibility } from "../../../packages/learning/src/explanation-review";
import { teachingEligibility } from "../../../packages/learning/src/teaching-contract";
import { releaseOf } from "../../../packages/learning/src/review";
import { geometryTask } from '../../../packages/learning/src/geometry-task';
/**
 * The learning views of My Learning Year: one skill module (Explore → Strategy → Chapter → Practise → Verify), the
 * recovery from a problem the learner is stuck on, and a single question (a challenge or a problem fragment).
 * Every decision comes from the shared engine (moduleState, recovery); these views only show it and record answers.
 */
import { scheduleNote } from "../../../packages/learning/src/due-display";
import { useState, useRef } from "react";
import {useResume} from "./resume";
import { Figure, describe, legacyStripKind, legacyStrips, stripsFor } from "./Figure";
import { SketchPad } from "./SketchPad";
import { HANDWRITING_ENABLED } from "../writing/features";
import { writtenTask } from "../../../packages/learning/src/written";
import { moduleFor, needsMarking } from "../../../packages/learning/src/content";
import { creditOf } from "../../../packages/learning/src/grade";
import { question, type Question, type Screen, type Strategy } from "../../../packages/learning/src/content";
import { answerFeedback } from "../../../packages/learning/src/answer-feedback";
import { rightAnswer, type SkillEvidence } from "../../../packages/learning/src/evidence";
import { graph } from "../../../packages/learning/src/graph";
import { problemOf } from "../../../packages/learning/src/families";
import { retriesLeft, reviewStrategy as reviewStrategyFor, familyOf, investigateContext, moduleState, recovery, type Established, type ModulePhase } from "../../../packages/learning/src/intervention";
import { decide } from "../../../packages/learning/src/session";
import { compose, kidQuestion, type Ask as KidAsk } from "../../../packages/learning/src/kid-say";
// deep-recovery@0 in a module (RESEARCH, research builds only, default off: deep-recovery-flag.ts; MODULE-RECOVERY.md)
import { deepRecoveryOn, deepPathwayAllowed, DEEP_EVALUATION } from "./deep-recovery-flag";
import { deepModuleState } from "../learning/deep-module";
import { DEEP_GOAL_POLICY } from "../learning/deep-goal";
import { afterHelpOf, qualifyReason, skillLabel } from "../learning/deep-evidence";
import { DeepRecovery } from "./DeepRecovery";
import { DeepModuleHandoff } from "./DeepRecoveryHandoff";
// the build constant is read here directly (as in Main.tsx) so a shipped bundle folds this to false and never reads ?deep
declare const OPENPATH_DEEP_RECOVERY: boolean;
const DEEP_MODULE = typeof OPENPATH_DEEP_RECOVERY !== "undefined" && OPENPATH_DEEP_RECOVERY === true && deepRecoveryOn();
import type { Assessment } from "../../../packages/learning/src/assessment";
import { workingFeedback } from "../journey/renderer-adapter";
import type { GradingDecision } from "../../../packages/learning/src/grading/decision";
import { Icon } from "./icons";
import type { LearnerRecords, LearningActivity, ServerDecision } from "../../../packages/learning/src/records";
import { authoritativeView } from "../../../packages/learning/src/grading/view";
import { semanticsOf } from "../../../packages/learning/src/grading/parse";
import { examplesFor, SYNTAX } from "../../../packages/learning/src/grading/syntax";
import { KID, kidName } from "./kid";
import { FeedbackBox } from "./Feedback";

export const LETTERS = ["A", "B", "C", "D"];

export interface Ctx {
  records: LearnerRecords;
  module?: (competency: string, withinRecovery?: boolean) => ReturnType<typeof moduleState>;
  evidence: (id: string) => SkillEvidence;
  now: number;
  session: string;
  saving: boolean;
  answer: (qid: string, response: string, activity: LearningActivity, o?: { hints?: number; context?: string; working?: string[]; clarifications?: number }) => Promise<boolean>;
  /** `episode` (research, deep-recovery@0): the recovery that delivered this lesson; omitted everywhere else */
  teach: (competency: string, strategy: string, rule: string, o?: { episode?: string }) => Promise<boolean>;
  /** the server's recorded decision for the answer just saved (authoritative); null when the server recorded none */
  recorded?: () => ServerDecision | null;
}
export const STATUS_WORD: Record<SkillEvidence["status"], string> = {
  verified: "Verified",
  transfer: "Shown on your own, also on new problems",
  independent: "Shown on your own",
  review: "Review needed",
  guided: "Learning (with help so far)",
  exposure: "Started",
  not_started: "Not started",
};
export const statusClass = (s: SkillEvidence["status"]) => (s === "verified" ? "verified" : s === "independent" || s === "transfer" ? "shown" : s === "not_started" ? "not_started" : "active");

const FLOW = ["Explore", "Strategy", "Chapter", "Practise", "Verify"] as const;
/** What each step is, in a learner's words. */
const KID_FLOW_WORDS: Record<(typeof FLOW)[number], string> = { Explore: "Let's see what you know", Strategy: "The idea", Chapter: "How to do it", Practise: "On your own", Verify: "Check again later" };
const FLOW_WORDS: Record<(typeof FLOW)[number], string> = { Explore: "Find your starting point", Strategy: "See the idea", Chapter: "Learn the method", Practise: "Practise on your own", Verify: "Check it again later" };
const flowIndex = (p: ModulePhase) => (p === "explore" || p === "recover" ? 0 : p === "strategy" ? 1 : p === "chapter" ? 2 : p === "guided" || p === "check" ? 3 : 4);
const activityOf = (phase: ModulePhase, q: Question): LearningActivity =>
  phase === "explore" ? "diagnostic" : phase === "strategy" ? "probe" : phase === "guided" ? "guided" : phase === "check" ? "check" : phase === "retention" ? "retention" : q.role === "transfer" ? "transfer" : "practice";
/** The example under an answer box: the format's own first example, except that a list of whole numbers that are not
 *  negative is shown as "4, 9" (a list example with a negative number looked wrong under a question about primes). */
function exampleFor(q: { type: string; answer?: string }): string {
  const sem = semanticsOf({ type: q.type as never, answer: q.answer ?? "" });
  const first = examplesFor(sem)[0] ?? "12";
  return sem.kind === "solution-set" && !/-/.test(q.answer ?? "") && !/[a-z]/i.test(q.answer ?? "") ? "4, 9" : first;
}
/** kid-look@1: what a right answer says (picked by the question, so it does not flicker on a re-render) */
const CHEERS = [{ word: "Correct! Well done.", emoji: "🎉" }, { word: "Yes, that's right!", emoji: "⭐" }, { word: "Brilliant!", emoji: "🌟" }, { word: "Spot on!", emoji: "✨" }];
const COUNTS: Record<LearningActivity, string> = {
  diagnostic: "On your own · a short check to find the starting point",
  probe: "On your own · what you already know",
  guided: "Practice with help · a hint is there if you want it",
  check: "On your own · no hints",
  practice: "On your own",
  transfer: "On your own · a new kind of problem",
  retention: "On your own · delayed check",
  original: "On your own",
  challenge: "On your own · enrichment",
};

export interface Fb {
  qid: string;
  response: string;
  right: boolean;
  working?: string[];
  activity?: LearningActivity;
  /** assessment@1: the decision behind `right`. credit null = undecided: the answer is saved, not marked wrong, and not counted either way. */
  assessment?: Assessment;
  decision?: ServerDecision;
}

const ANSWER_LABEL: Record<string, string> = {
  integer: "Your answer (a whole number)",
  fraction: "Your answer (a fraction such as 3/4, or a decimal)",
  set: "Your answers, separated by a comma",
  polynomial: "Your answer (an expression in x)",
  exact: "Your answer (exact: use √ or sqrt, fractions, letters)",
  roots: "Your answers, separated by a comma (exact)",
  tuple: "Your answer, in brackets, e.g. (3, −2)",
  matrix: "Your answer, row by row, e.g. [[1, 2], [3, 4]]",
  interval: "Your answer, e.g. x > 3, or −1 < x ≤ 4, or (−∞, 2]",
  ratio: "Your answer, e.g. 3:4",
  mixed: "Your answer as a mixed number, e.g. 3 2/5",
  expression: "Your answer (an expression: sin, cos, ln, e^x, ^ for powers)",
  antiderivative: "Your answer (+ C may be written or not)",
};
/** How to type an answer: examples generated from the strict parser's own accepted syntax (grading/syntax.ts; each is tested to parse as shown). */
function SyntaxHelp({ q }: { q: { type: string; answer?: string } }) {
  const sem = semanticsOf({ type: q.type, answer: q.answer ?? "" });
  const g = SYNTAX.find((x) => x.kind === sem.kind);
  if (!g) return null;
  return (
    <details className="syntax-help">
      <summary>How to type it</summary>
      <p>Accepted: {examplesFor(sem).map((e, i) => <span key={i}>{i ? ", " : ""}<code>{e}</code></span>)}</p>
      {g.notAccepted.length > 0 && <p>Not accepted: {g.notAccepted.map((x, i) => <span key={i}>{i ? "; " : ""}<code>{x.text}</code> ({x.why})</span>)}</p>}
    </details>
  );
}
/** kid-say@1: a lesson's words for a child: the first sentence of each part, the rest one tap away ("Tell me more"). */
const KID_TITLES: Record<string, string> = { "The method": "How to do it", "The idea": "The big idea", "A common wrong answer": "Watch out for this" };
const kidTitle = (t: string) => KID_TITLES[t] ?? t;
const firstSentence = (t: string) => { const m = t.match(/^.+?[.!?](?=\s+[A-Z(])/); return m && m[0].length < t.length ? [m[0], t.slice(m[0].length).trim()] : [t, ""]; };
function KidText({ text }: { text: string[] }) {
  const parts = text.map(firstSentence);
  const more = parts.map(([, rest]) => rest).filter(Boolean);
  return (
    <>
      {parts.map(([head], k) => <p key={k}>{head}</p>)}
      {more.length > 0 && (
        <details className="kid-more">
          <summary>Tell me more</summary>
          {more.map((t, k) => <p key={k}>{t}</p>)}
        </details>
      )}
    </>
  );
}
const safeKid = (q: Question) => { try { return kidQuestion(q); } catch { return null; } };
/** kid-say@1: the answer shaped the way the question suggests (₹ before, a unit after, m and cm boxes, tap to order,
 * tap one); it hands back the same answer string the typed box would. */
function KidAnswer({ ask, answer, type, setValue, disabled }: { ask: KidAsk; answer: string; type: string; setValue: (v: string) => void; disabled: boolean }) {
  const [parts, setParts] = useState<string[]>([]);
  const put = (next: string[], done: boolean) => { setParts(next); setValue(done ? compose(ask, next, answer, type) : ""); };
  if (ask.kind === "tap")
    return (
      <div className="kid-taps" role="radiogroup" aria-label="Choose one">
        {ask.items.map((x) => (
          <button key={x.label} type="button" role="radio" aria-checked={parts[0] === x.value} className={`kid-tap ${parts[0] === x.value ? "picked" : ""}`} disabled={disabled} onClick={() => put([x.value], true)}>{x.label}</button>
        ))}
      </div>
    );
  if (ask.kind === "order") {
    const name = (x: string) => (ask.prefix ? `${ask.prefix} ${x}` : x);
    const left = ask.items.filter((x) => !parts.includes(x));
    return (
      <div className="kid-order">
        <div className="kid-taps" aria-label="Numbers to put in order">
          {left.map((x) => <button key={x} type="button" className="kid-tap" disabled={disabled} onClick={() => { const n = [...parts, x]; put(n, n.length === ask.items.length); }}>{name(x)}</button>)}
        </div>
        <ol className="kid-slots" aria-label={`Your order, ${ask.first} first`}>
          {ask.items.map((_, i) => (
            <li key={i}>{parts[i] ? <button type="button" className="kid-tap placed" disabled={disabled} aria-label={`Take back ${name(parts[i])}`} onClick={() => put(parts.filter((_, j) => j !== i), false)}>{name(parts[i])}</button> : <span className="kid-slot" />}</li>
          ))}
        </ol>
        <p className="small muted">Tap them in order, {ask.first} first. Tap one again to take it back.</p>
      </div>
    );
  }
  if (ask.kind === "fields")
    return (
      <div className="kid-fields">
        {ask.labels.map((l, i) => (
          <label key={l} className="kid-unit">
            <input aria-label={`Your answer: ${l}`} inputMode="numeric" autoComplete="off" value={parts[i] ?? ""} disabled={disabled} onChange={(e) => { const n = ask.labels.map((_, j) => (j === i ? e.target.value : parts[j] ?? "")); put(n, n.every((x) => x.trim())); }} />
            <span>{l}</span>
          </label>
        ))}
      </div>
    );
  const unit = ask.kind === "box" ? ask : { before: undefined, after: undefined };
  return (
    <label className="kid-unit">
      {unit.before && <span>{unit.before}</span>}
      <input aria-label="Your answer" inputMode={ask.kind === "product" ? "text" : "decimal"} autoComplete="off" placeholder={ask.kind === "product" ? "e.g. 2 × 3 × 3" : "Your answer"} value={parts[0] ?? ""} disabled={disabled} onChange={(e) => put([e.target.value], !!e.target.value.trim())} />
      {unit.after && <span>{unit.after}</span>}
    </label>
  );
}

/** An answer box for any question type. */
export function AnswerInput({ q, value, setValue, disabled }: { q: Pick<Question, "type" | "options" | "picks"> & { id?: string; answer?: string }; value: string; setValue: (v: string) => void; disabled: boolean }) {
  // pick@1: the answer is one of the values the question shows: tap it (submits exactly what typing it would)
  if (q.picks?.length)
    return (
      <div className="options picks" role="radiogroup" aria-label="Tap your answer">
        {q.picks.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === o.value} className={`option ${value === o.value ? "picked" : ""}`} disabled={disabled} onClick={() => setValue(o.value)}>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
    );
  if (q.type === "choice")
    return (
      <div className="options" role="radiogroup" aria-label="Choose one answer">
        {q.options!.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === LETTERS[i]} className={`option ${value === LETTERS[i] ? "picked" : ""}`} disabled={disabled} onClick={() => setValue(LETTERS[i])}>
            <span className="letter">{LETTERS[i]}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
    );
  const task = q.type === "written" && q.id ? writtenTask(q.id) : null;
  if (task?.answer === "drawing" && !HANDWRITING_ENABLED)
    return <p role="note">This task requires a drawing or construction and is unavailable with keyboard input. It has not been changed to a final-answer question. Previously saved work remains available for educator review.</p>;
  if (task?.answer === "drawing")
    return <div className="field">Your drawing (an educator will look at it and mark it)<SketchPad value={value} onChange={setValue} canvas={task.canvas} disabled={disabled} /></div>;
  if (q.type === "written")
    return (
      <label className="field">
        Your written answer (an educator will read and mark it)
        <textarea aria-label="Your answer" rows={6} maxLength={4000} value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} />
      </label>
    );
  const label = ANSWER_LABEL[q.type] ?? "Your answer";
  return (
    <label className="field">
      {/* a child gets the example in the box, not a label and a typing guide */}
      {!KID && label}
      <input aria-label="Your answer" inputMode={q.type === "integer" ? "numeric" : "text"} autoComplete="off" value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} placeholder={`e.g. ${exampleFor(q)}`} />
      {!KID && <SyntaxHelp q={q} />}
    </label>
  );
}

export function Feedback({ fb, onNext, label = "Continue", onRetry, onInvestigate }: { fb: Fb; onNext: () => void; label?: string; onRetry?: (hint:boolean) => void; onInvestigate?: () => void }) {
  const q = question(fb.qid);
  if (needsMarking(q))
    return (
      <div className="stack enter">
        <div className="feedback" role="status">
          <strong>Sent to be marked.</strong>
          <p>An educator will read your answer and mark it against the criteria. It counts only once it is marked correct; you will see the mark and the feedback under “Written work”.</p>
          <p className="small muted">{q.solution}</p>
        </div>
        <div className="actions sticky"><button className="primary" onClick={onNext}>{label}</button></div>
      </div>
    );
  const undecided = fb.assessment ? fb.assessment.credit === null : false;
  // answer-feedback@1: one answer cannot show why it was given: what is known about the answer, and the mathematics, never a claim
  const mixup = fb.right || undecided ? null : answerFeedback(q, fb.response);
  const trusted = fb.decision?.decidedBy === "server" && fb.decision.questionId === fb.qid ? fb.decision as unknown as GradingDecision : null;
  const judged = trusted ? workingFeedback(trusted) : null;
  return (
    <div className="stack enter">
      <div className={`feedback ${undecided ? "" : fb.right ? "good" : "bad"}${KID && !undecided ? (fb.right ? " kid-cheer" : " kid-soft") : ""}`} role="status">
        {KID && fb.right && !undecided && <span className="kid-burst" aria-hidden="true">{CHEERS[fb.qid.length % CHEERS.length].emoji}</span>}
        <strong>{undecided ? "Saved, not marked." : KID ? (fb.right ? CHEERS[fb.qid.length % CHEERS.length].word : "Not quite.") : fb.right ? "Right." : "Not this time."}</strong>
        {undecided && <p>{fb.assessment!.feedback.message}</p>}
        {!undecided && fb.assessment?.evidence.firstError && <p>{fb.assessment.feedback.message}</p>}
        {mixup && <p data-feedback="answer-feedback@1">{mixup.note}{mixup.principle ? ` ${mixup.principle}` : ""}</p>}
        {fb.assessment?.clarification?.kind === "show-step" && !fb.working?.length && <p className="small muted">{fb.assessment.clarification.prompt}</p>}
        {(!onRetry || fb.right) && (KID ? <details className="kid-why" open={!fb.right}><summary>{fb.right ? "How it works" : "See why"}</summary><p>{q.solution}</p></details> : <p>{q.solution}</p>)}
        {onRetry && !fb.right && <><p>{KID ? "Have another go, or ask for a hint." : "Your answer and working are saved. A wrong answer alone does not tell us why."}</p><button className="secondary" onClick={()=>onRetry(false)}>Try again</button> <button className="link" onClick={()=>onRetry(true)}>Give me a hint</button></>}
      </div>
      {!!fb.working?.length && <div className={`feedback ${trusted?.working?.status === "invalid" ? "bad" : ""}`} role="note" aria-label="Your working">
        <strong>Your working</strong>
        <p>{judged?.message ?? "Your working is saved. It has not been marked right or wrong. Show an intermediate step or review a supported lesson; no method mastery is claimed."}</p>
        <ol>{fb.working.map((line,i)=><li key={i}>{line}{judged?.steps[i] && <span className="small"> — {judged.steps[i].verified ? "Checked" : judged.steps[i].badge === "invalid" ? "Check this step" : "Not checked"}</span>}</li>)}</ol>
      </div>}
      {/* adaptive loop: a wrong answer on a problem OpenPath can reason about opens the same recovery as "I'm stuck" */}
      {onInvestigate && !fb.right && !undecided ? <button className="secondary wide" onClick={onInvestigate}>Find out what went wrong</button> : null}
      <div className="actions sticky">
        <button className="primary" onClick={onNext}>{onRetry && !fb.right ? "Continue with another question" : label}</button>
      </div>
    </div>
  );
}

/** One question: answer, see feedback. */
export function Ask({ qid, activity, ctx, onAnswered, context, hintAllowed = false, heading, resumeKey, previous, showHint = false }: { qid: string; activity: LearningActivity; ctx: Ctx; onAnswered?: (fb: Fb) => void; context?: string; hintAllowed?: boolean; heading?: string; resumeKey?: string; previous?: Fb; showHint?: boolean }) {
  const q = question(qid);
  const [value, setValue] = useResume(resumeKey && `${resumeKey}:answer`, previous?.response ?? "");
  const [hint, setHint] = useResume(resumeKey && `${resumeKey}:hint`, showHint);
  const [working, setWorking] = useResume(resumeKey && `${resumeKey}:working`, previous?.working?.join("\n") ?? "");
  const [workingOpen,setWorkingOpen] = useResume(resumeKey && `${resumeKey}:working-open`, !!working);
  const [asked, setAsked] = useState(0);
  const [clarify, setClarify] = useState<string | null>(null);
  const submitting = useRef(false);
  // nothing to work out when the answer is tapped from the ones shown
  const workable = q.type !== "written" && !q.picks?.length;
  // kid-say@1: the child build shows each generated question as one short ask (wording and answer shape only)
  const kq = KID && q.type !== "written" ? safeKid(q) : null;
  if (DEEP_EVALUATION && !releaseOf(qid)) return <p role="note" data-evaluation-stop="review-required">This question needs educator review before evaluation. Nothing is counted as solved.</p>;
  return (
    <div className="qcard enter" key={qid} data-qid={qid}>
      {heading && <p className="eyebrow">{heading}</p>}
      {!KID && <span className="counted">{COUNTS[activity]}</span>}
      <p className="prompt">{kq ? kq.say : q.prompt}</p>
      {(kq ? kq.figure : q.figure) && <Figure v={(kq ? kq.figure : q.figure)!} />}
      {kq?.note && <p className="kid-note">{kq.note}</p>}
      {kq && q.type !== "choice" && !q.picks?.length && (kq.ask.kind !== "box" || kq.ask.before || kq.ask.after || ["integer", "fraction", "exact", "mixed"].includes(q.type))
        ? <KidAnswer key={qid} ask={kq.ask} answer={q.answer} type={q.type} setValue={setValue} disabled={ctx.saving} />
        : <AnswerInput q={kq?.options ? { ...q, options: kq.options } : q} value={value} setValue={setValue} disabled={ctx.saving} />}
      {clarify && <p className="small" role="status">{clarify}</p>}
      {workable && (
        <details className="working" open={workingOpen}>
          {/* Save activation before a queued native toggle can race editing/reload.
              Summary still supplies native focus and Enter/Space activation. */}
          <summary onClick={e=>{e.preventDefault();setWorkingOpen(!workingOpen);}}>{KID ? "Show my working" : "Show your working (optional)"}</summary>
          <p className="small">{geometryTask(qid)?.labels}</p>
          <textarea aria-label="Your working" rows={3} value={working} onChange={(e) => setWorking(e.target.value)} placeholder={"One step per line, e.g.\n7 × 5 + 7 × 3 = 35 + 21 = 56"} />
          <p className="small muted">Any correct way is fine. Your working is kept with your answer; it does not change how the answer counts.</p>
        </details>
      )}
      {(hint || showHint) && <aside className="hint" aria-label="Contextual help"><p>{q.hint ?? "Look at the explanation and try one part at a time."}</p>{showHint && <p>{q.solution}</p>}</aside>}
      <div className="actions">
        {hintAllowed && q.hint && !hint && <button className="secondary" type="button" onClick={() => setHint(true)}>Show a hint</button>}
        <button
          className="primary"
          disabled={(!value.trim() && !working.trim()) || ctx.saving || (q.type === "written" && writtenTask(q.id)?.answer === "drawing" && !HANDWRITING_ENABLED)}
          onClick={async () => {
            if (submitting.current) return;
            const lines = working.split("\n").map((l) => l.trim()).filter(Boolean);
            if (lines.length > 8 || lines.some((line) => line.length > 80)) { setClarify("Your work is still here. Use at most 8 lines, with at most 80 characters per line, before checking."); return; }
            // one decision per submission (assessment@1): the answer box is graded first; an unreadable answer gets ONE short clarification, then it is saved as undecided
            const preview = needsMarking(q) ? null : decide(qid, value, lines, asked);
            submitting.current = true;
            let ok: boolean;
            try { ok = await ctx.answer(qid, value, activity, { hints: hint || showHint ? 1 : 0, ...(context ? { context } : {}), ...(lines.length ? { working: lines } : {}), ...(asked ? { clarifications: asked } : {}) }); } finally { submitting.current = false; }
            if (!ok) return;
            // release check A: show the server's recorded decision, never a conflicting preview of the unified grader
            const a = authoritativeView(preview, ctx.recorded?.() ?? null);
            if (a?.clarification && a.credit === null && a.feedback.kind === "clarify") { setAsked(asked + 1); setClarify(a.clarification.prompt); return; }
            setClarify(null);
            onAnswered?.({ qid, response: value, activity, ...(ctx.recorded?.() ? { decision: ctx.recorded()! } : {}), right: a ? a.credit === true : creditOf(qid, value) === true, ...(a ? { assessment: a } : {}), ...(lines.length ? { working: lines } : {}) });
          }}
        >
          {ctx.saving ? "Saving…" : "Check"}
        </button>
      </div>
      {KID && <FeedbackBox key={qid} where={qid} />}
    </div>
  );
}

function Picture({ w, competency }: { w: NonNullable<Screen["widget"]>; competency?: string }) {
  // visuals@2: strips that state both fractions (bottomShaded / labels) are drawn by Figure (equal wholes, independent shading).
  // Legacy strips (top, bottom, shaded) state only the first fraction: the existing two-row picture with the derived equivalent
  // shading is kept only in an equivalence lesson, when that shading is exact; otherwise Figure says so in text (no guessed picture).
  if (w.type !== "strips" && w.type !== "array") return <Figure v={w} />;
  if (w.type === "strips") {
    const v = stripsFor(w, competency);
    if (!legacyStrips(v) || legacyStripKind(v) !== "equivalent") return <Figure v={v} />;
    const row = (n: number, shaded: number) => (
      <div className="strip" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {Array.from({ length: n }, (_, i) => <span key={i} className={i < shaded ? "on" : ""} />)}
      </div>
    );
    const top = w.top ?? 2;
    const bottom = w.bottom ?? 4;
    const shaded = w.shaded ?? 1;
    return (
      <figure className="strips" role="img" aria-label={describe(v)}>
        {row(top, shaded)}
        {row(bottom, (shaded * bottom) / top)}
      </figure>
    );
  }
  const rows = w.rows ?? 3;
  const cols = w.cols ?? 4;
  return (
    <figure className="array" style={{ gridTemplateColumns: `repeat(${cols}, 14px)` }} aria-label={`${rows} rows of ${cols} dots${w.split ? `, split after ${w.split}` : ""}`}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const second = w.split ? (rows >= cols ? r >= w.split : c >= w.split) : false;
        return <i key={i} className={second ? "second" : ""} />;
      })}
    </figure>
  );
}

export function Lesson({ s, onDone, saving, resumeKey, doneLabel = "Try it", competency }: { s: Strategy | { title: string; screens: Screen[] }; onDone: () => void; saving: boolean; resumeKey?: string; doneLabel?: string; competency?: string }) {
  const [stored, setI] = useResume(resumeKey, 0);
  const i = Number.isInteger(stored) && stored >= 0 && stored < s.screens.length ? stored : 0;
  const m = competency ? moduleFor(competency) : null;
  if (DEEP_EVALUATION && (!m || !("id" in s) || !contentEligibility(m, s, { competency: competency!, mode: "supervised-evaluation", usage: "lesson" }).educatorApproved))
    return <p role="note" data-evaluation-stop="review-required">This explanation needs educator review before evaluation. Your place is saved.</p>;
  const raw = s.screens[i];
  // kid-say@1: a worked example about a generated question reads (and pictures) the way the question will
  const kq = KID && raw.instance ? safeKid(question(raw.instance)) : null;
  const swap = (t: string) => (t === question(raw.instance!).prompt ? kq!.say : t);
  const sc = kq ? { ...raw, text: raw.text.map(swap), math: raw.math?.map(swap), widget: (kq.figure as typeof raw.widget) ?? raw.widget } : raw;
  const last = i === s.screens.length - 1;
  return (
    <div className="stack enter" key={`${s.title}-${i}`}>
      <div className="panel lesson">
        <p className="eyebrow">{s.title}{s.screens.length > 1 ? ` · ${i + 1} of ${s.screens.length}` : ""}</p>
        <h3>{KID ? kidTitle(sc.title) : sc.title}</h3>
        {KID ? <KidText text={sc.text} /> : sc.text.map((t, k) => <p key={k}>{t}</p>)}
        {sc.widget && <Picture w={sc.widget} competency={competency} />}
        {sc.math && <div className="formula">{sc.math.map((m, k) => <span key={k}>{m}</span>)}</div>}
        {sc.tip && <p className="hint">{sc.tip}</p>}
        {KID && <FeedbackBox key={`${s.title}-${i}`} where={`lesson:${competency ?? ""}:${"id" in s ? s.id : "lesson"}:${i + 1}${raw.instance ? `:${raw.instance}` : ""}`.replace(/[^A-Za-z0-9:_.,\-/ ]/g, "")} />}
      </div>
      <div className="actions sticky">
        {i > 0 && <button className="secondary" onClick={() => setI(i - 1)}>Back</button>}
        <button className="primary" disabled={saving} onClick={() => (last ? (setI(0), onDone()) : setI(i + 1))}>{last ? (saving ? "Saving…" : doneLabel) : "Next"}</button>
      </div>
    </div>
  );
}

/** lesson-resume@1: a learner-scoped key for lesson positions in a module opened without its own resume key (session ids are
 *  "learn:<learner>:<visit>"; anything else gets no persistence). */
const lessonResumeKey = (session: string, competency: string) => { const m = /^learn:([^:]+):/.exec(session); return m ? `openpath.module-lesson@1:${m[1]}:${competency}` : undefined; };
/** One skill, end to end, as the engine directs. */
export function Module({ competency, ctx, onExit, onLearn, embedded = false, onFeedback, established, resumeKey, sessionMode = false, reviewOnly = false, withinRecovery = false }: { competency: string; ctx: Ctx; onExit: () => void; onLearn?: () => void; embedded?: boolean; onFeedback?: (fb: Fb) => void; established?: Established | null; resumeKey?: string; sessionMode?: boolean; reviewOnly?: boolean; withinRecovery?: boolean }) {
  const [own, setOwn] = useResume<Fb | null>(resumeKey && `${resumeKey}:feedback`, null);
  const [retry, setRetry] = useResume<boolean | "hint">(resumeKey && `${resumeKey}:retry`, false);
  // lesson-resume@1: the screen reached in a lesson (and an open lesson review) survives a reload, per learner and skill
  const lessonKey = resumeKey ?? lessonResumeKey(ctx.session, competency);
  const [reviewOpen, setReviewOpen] = useResume<string | null>(lessonKey && `${lessonKey}:review`, null);
  // teach-first@1: the learner chose "I know this — test me" on a new skill
  const [testMe, setTestMe] = useResume<boolean>(lessonKey && `${lessonKey}:test-me`, false);
  const fb = onFeedback ? null : own;
  const setFb = (f: Fb | null) => (onFeedback ? f && onFeedback(f) : setOwn(f));
  const ev = ctx.evidence(competency);
  const ms = ctx.module && !established ? ctx.module(competency, withinRecovery) : DEEP_MODULE && deepPathwayAllowed(ctx.records) ? deepModuleState(true, competency, ctx.records, ev, ctx.now, ctx.session, established, withinRecovery ? undefined : ctx.evidence) : moduleState(competency, ctx.records, ev, ctx.now, ctx.session, established, withinRecovery ? undefined : ctx.evidence);
  // deep-recovery@0 evidence after help (research switch; learning/deep-evidence.ts): after a deep episode's help the status reads
  // "Solved independently after help" (never the unqualified "Shown on your own"); switch off: the same words as before
  const afterHelp = afterHelpOf(competency, ctx.records, ctx.evidence, ctx.now);
  const statusWord = skillLabel(true, ev.status, STATUS_WORD[ev.status], afterHelp);
  const shownReason = qualifyReason(true, ms.reason, ev.status, afterHelp);
  const name = kidName(competency, graph.get(competency).name);
  const step = flowIndex(ms.phase);
  // skill-steps@1: the five steps are progress, not buttons: a slim bar with one plain line saying where the learner is
  // (the step's own name stays in each item for screen readers and the browser journeys)
  const stepper = (
    <div className="skill-steps">
      <ol className="flow" aria-label="Steps of this skill">
        {FLOW.map((f, k) => (
          <li key={f} className={k === step ? "here" : k < step ? "past" : ""} aria-current={k === step ? "step" : undefined}><span className="sr-only">{f}</span></li>
        ))}
      </ol>
      <p className="skill-steps-caption">Step {step + 1} of {FLOW.length} · {(KID ? KID_FLOW_WORDS : FLOW_WORDS)[FLOW[step]]}</p>
    </div>
  );
  const head = (
    <>
      {!embedded && !KID && <p className="eyebrow">Skill</p>}
      {embedded ? <h2>{name}</h2> : <h1>{name}</h1>}
      {!KID && (<div className="year-meta"><span className={`chip status-${ms.requirementsMet === false ? "active" : statusClass(ev.status)}`}>{ms.requirementsMet === false ? "More evidence needed" : statusWord}</span>{afterHelp && <span className="small muted" data-after-help={afterHelp.kind}> {afterHelp.note}</span>}</div>)}
      {stepper}
    </>
  );
  const lessonModule = moduleFor(competency);
  const reviewStrategy = lessonModule ? reviewStrategyFor(lessonModule, ctx.records, fb?.qid ?? ms.question) : null;
  const reviewOffer = reviewStrategy ? <button className="secondary wide" disabled={ctx.saving} onClick={async () => { if (reviewStrategy && await ctx.teach(competency, reviewStrategy.id, "foundation-lesson-review@1")) setReviewOpen(reviewStrategy.id); }}>{KID ? "Learn it again" : "Review a supported lesson"}</button> : null;
  // the lesson being reviewed is the one that was opened (recorded), even if the question on screen changed since
  const reviewing = reviewOpen ? lessonModule?.strategies.find((x) => x.id === reviewOpen && ctx.records.teaching.some((t) => t.competency === competency && t.strategy === x.id && t.rule === "foundation-lesson-review@1")) : undefined;
  if (reviewing) return <div className="stack">{head}{!KID && <p role="note">Lesson review only. Your earlier answers are saved. This review does not award mastery; further answers in this visit are recorded with help.</p>}<Lesson competency={competency} s={reviewing} resumeKey={lessonKey && `${lessonKey}:review:${reviewing.id}`} doneLabel={KID ? "Let's try again" : "Return to my progress"} saving={false} onDone={() => setReviewOpen(null)} />{!KID && <button className="secondary" onClick={() => setReviewOpen(null)}>Return to my progress</button>}</div>;
  if (reviewOnly) return <div className="stack">{head}<p>This is lesson review, not a mastery check. Your progress is preserved.</p>{reviewOffer ?? <p>No eligible explanation is available for this topic yet.</p>}<button className="secondary" onClick={onExit}>Choose another goal</button></div>;
  if (fb) return <div className="stack">{head}{retry ? <Ask key={`${fb.qid}:retry`} qid={fb.qid} activity={fb.activity ?? "guided"} ctx={ctx} previous={fb} resumeKey={resumeKey && `${resumeKey}:${fb.qid}`} showHint={retry === "hint"} hintAllowed onAnswered={f=>{setRetry(false);setFb(f);}}/> : <Feedback fb={fb} onNext={() => setFb(null)} onRetry={sessionMode && retriesLeft(ctx.records, fb.qid) > 0 ? hint=>setRetry(hint ? "hint" : true) : undefined}/>}{!retry && !(KID && fb.right) && reviewOffer}</div>;
  if (sessionMode && ms.phase === "retention") return <div className="stack">{head}<p>A delayed check is reserved for a later session. Your completed work is preserved.</p><button className="primary" onClick={onExit}>Next planned competency</button></div>;
  if (sessionMode && ms.question && writtenTask(ms.question)?.answer === "drawing" && !HANDWRITING_ENABLED)
    return <div className="stack">{head}<AnswerInput q={question(ms.question)} value="" setValue={()=>{}} disabled/><button className="secondary" onClick={onExit}>Next planned competency</button></div>;
  if (ms.phase === "unavailable") return <div className="stack">{head}<p className="why">{ms.reason}</p>{reviewOffer}<button className="secondary wide" onClick={onExit}>Back</button></div>;
  // the same investigation as from Practice: the wrong answer is looked into, and the skill it points to is worked on first
  if (ms.phase === "recover" && ms.original) return <div className="stack">{head}{DEEP_MODULE && deepPathwayAllowed(ctx.records) && (!ctx.module || ms.why === DEEP_GOAL_POLICY) /* a learning goal: only the one connected goal (deep-goal.ts) */ ? <DeepRecovery key={ms.original} original={ms.original} ctx={ctx} onExit={onExit} exitLabel="Back" onFeedback={setFb} /> : <Recovery original={ms.original} ctx={ctx} onExit={onExit} embedded onFeedback={setFb} />}</div>;
  if (ms.phase === "chapter" && ms.strategy)
    return (
      <div className="stack">
        {head}
        <p className="why">{ms.reason}</p>
        <p className="small muted" role="note" data-content-review={ms.contentReview?.status ?? "unknown"}>{ms.contentReview?.educatorApproved ? ms.contentReview.label : `${ms.contentReview?.label ?? "Demonstration: this explanation has not been approved by an educator."} ${ms.teachingReview === "machine-checked" ? "It has been checked automatically against its question." : "It has not been checked automatically."}`}</p>
        <Lesson competency={competency} key={ms.strategy.id} resumeKey={lessonKey && `${lessonKey}:lesson:${ms.strategy.id}`} s={ms.strategy} saving={ctx.saving} onDone={() => ctx.teach(competency, ms.strategy!.id, ms.decision?.diagnosis.kind ?? ms.diagnosis?.result ?? "diagnosis")} />
      </div>
    );
  // teach-first@1 (child build): a skill never met before opens on its lesson, not a check. "I know this — test me" skips
  // to the check. The lesson is recorded as teaching (as a chapter's lesson is), so the engine knows it was shown.
  // the idea first: a conceptual lesson for the same part of the skill, when one is eligible; else the usual review lesson
  // the idea first: a lesson that opens on the concept (else the worked steps) for the same part of the skill; never a
  // "spot the mistake" lesson, which is for after a slip
  const fits = (x: (typeof lessonModule & {})["strategies"][number]) => !!lessonModule && !!reviewStrategy && !x.addresses && x.id !== "spot_the_mistake" && x.screens[0]?.role !== "misconception" && (x.scope?.subSkill ?? null) === (reviewStrategy.scope?.subSkill ?? null) && teachingEligibility(lessonModule, x).eligible && contentEligibility(lessonModule, x, { competency, usage: "lesson" }).eligible;
  const firstLesson = lessonModule && reviewStrategy
    ? lessonModule.strategies.find((x) => fits(x) && x.screens[0]?.role === "concept") ?? lessonModule.strategies.find((x) => fits(x) && x.kind === "procedural") ?? lessonModule.strategies.find(fits) ?? reviewStrategy
    : null;
  const neverMet = KID && !ctx.records.attempts.some((a) => a.competency === competency) && !ctx.records.teaching.some((t) => t.competency === competency);
  if (neverMet && !testMe && ms.phase === "explore" && firstLesson)
    return (
      <div className="stack">
        {!embedded && <h1>{name}</h1>}
        <p className="kid-new">✨ New skill — let's learn it first.</p>
        <Lesson competency={competency} key={`first:${firstLesson.id}`} resumeKey={resumeKey && `${resumeKey}:first:${firstLesson.id}`} s={firstLesson} saving={ctx.saving} doneLabel="Let's try" onDone={() => ctx.teach(competency, firstLesson.id, "teach-first@1")} />
        <button className="link kid-skip" onClick={() => setTestMe(true)}>I know this — test me</button>
      </div>
    );
  // "teach me" under a check: the lesson opens here, in the same flow (answers after it count as with help)
  const teachMe = KID && reviewStrategy && (ms.phase === "explore" || ms.phase === "check")
    ? <button className="secondary wide kid-learn" disabled={ctx.saving} onClick={async () => { if (reviewStrategy && await ctx.teach(competency, reviewStrategy.id, "foundation-lesson-review@1")) setReviewOpen(reviewStrategy.id); }}>I don't know this yet — teach me 📖</button>
    : null;
  if (ms.question)
    return (
      <div className="stack">
        {head}
        {!KID && <p className="why">{shownReason}</p>}
        <Ask resumeKey={resumeKey && `${resumeKey}:${ms.question}`} key={ms.question} qid={ms.question} activity={ms.activity ?? activityOf(ms.phase, question(ms.question))} ctx={ctx} context={ms.context} hintAllowed={ms.phase === "guided"} onAnswered={setFb} />
        {/* kid-look@1: a child who does not know yet is never left to guess: the lesson is one tap away, before answering */}
        {teachMe ?? (KID && onLearn && (ms.phase === "explore" || ms.phase === "check") && <button className="secondary wide kid-learn" onClick={onLearn}>I don't know this yet — teach me 📖</button>)}
      </div>
    );
  // done or pause
  return (
    <div className="stack">
      {head}
      <div className={`feedback ${ms.phase === "pause" ? "bad" : ms.phase === "waiting" ? "" : "good"}`} role="status">
        <strong>{ms.phase === "pause" ? "Let's pause this one" : ms.phase === "waiting" ? "With an educator" : statusWord}</strong>
        <p>{shownReason}</p>
        {(() => { const n = scheduleNote(ms, Intl.DateTimeFormat().resolvedOptions().timeZone); return n ? <p className="small" data-handover={ms.handover?.route ?? "retention"}>{n}</p> : null; })()}
        {/* recovery-handoff@0 hook (worker D, research): a module paused by deep recovery hands the stopped episode over */}
        {DEEP_MODULE && ms.phase === "pause" && ms.why?.startsWith("deep-recovery-module@0: ") && <DeepModuleHandoff competency={competency} ctx={ctx} />}
        <p className="small">On your own: {ev.independent.right} right of {ev.independent.total}. With help: {ev.assisted.right} right of {ev.assisted.total}.</p>
      </div>
      {ms.phase === "pause" && reviewOffer}
      {!embedded && <button className="secondary wide" onClick={onExit}>{sessionMode ? "Next planned competency" : "Back to the year"}</button>}
    </div>
  );
}

/** A problem the learner is stuck on: try it, find the supporting skill that is missing, learn it, come back. */
/** The supports to explain to a learner: only relations confirmed all the way from the problem's skill (mandatory edges whose
 *  chain is mandatory too); unconfirmed (plausible, support) relations stay advisory and are not shown as "what this uses". */
function confirmedSupports(start: string, supports: { id: string; via: string | null; type: string; assessable: boolean; depth: number }[]) {
  const reached = new Set([start]);
  return supports.filter((s) => {
    if ((s.type !== "mandatory" && s.type !== "uses") || !reached.has(s.via ?? "")) return false;
    reached.add(s.id);
    return s.assessable;
  });
}
export function Recovery({ original, ctx, onExit, exitLabel = "Back to the year", embedded = false, onFeedback }: { original: string; ctx: Ctx; onExit: () => void; exitLabel?: string; embedded?: boolean; onFeedback?: (fb: Fb) => void }) {
  // Module recovery can end as soon as the saved answer arrives. Keep feedback
  // in the owning module so that unmounting this investigation cannot discard it.
  const [own, setOwn] = useState<Fb | null>(null);
  const fb = onFeedback ? null : own;
  const setFb = (f: Fb | null) => onFeedback ? f && onFeedback(f) : setOwn(f);
  const r = recovery(original, ctx.records, ctx.evidence, ctx.now, ctx.session);
  const q = question(original);
  const trace = (
    <div className="trace" aria-label="What this problem uses">
      {/* only confirmed (mandatory) relations are explained to the learner; unconfirmed ones stay advisory */}
      {confirmedSupports(q.competency, r.supports).map((s) => {
        const e = ctx.evidence(s.id);
        return (
          <div key={s.id} className={`trace-row ${statusClass(e.status)} ${r.active === s.id ? "now" : ""}`}>
            <Icon glyph={e.status === "verified" ? "✓" : e.status === "independent" || e.status === "transfer" ? "★" : e.status === "not_started" ? "○" : e.status === "review" ? "↻" : "◐"} />
            <span className="trace-text"><b>{graph.get(s.id).name}</b><span>{s.assessable ? STATUS_WORD[e.status] : "No questions yet"} · {s.depth === 1 ? "used directly" : `used by ${graph.get(s.via ?? "").name.toLowerCase()}`}</span></span>
          </div>
        );
      })}
    </div>
  );
  // what the investigation found, in plain words (diagnostic@2; the support numbers are relative, not probabilities)
  const finding = r.reasoning && r.reasoning.observed.length > 0 && (
    <div className={`feedback ${r.reasoning.status === "established" ? "good" : "bad"}`} role="note" aria-label="What we think happened">
      <strong>{r.reasoning.status === "established" ? "What we think happened" : r.reasoning.status === "uncertain" ? "Not sure yet" : "Looking into it"}</strong>
      <p>{r.plan?.why ?? r.reason}</p>
      {r.reasoning.status === "uncertain" && <p className="small">A teacher or parent can look at your working with you.</p>}
    </div>
  );
  if (fb) return <div className="stack"><p className="eyebrow">{fb.qid === original ? "The problem" : graph.get(question(fb.qid).competency).name}</p><Feedback fb={fb} onNext={() => setFb(null)} /></div>;
  if (r.phase === "attempt" || r.phase === "return")
    return (
      <div className="stack">
        <p className="eyebrow">{r.phase === "return" ? "Back to the original problem" : "A problem you are stuck on"}</p>
        <h1>{graph.get(q.competency).name}</h1>
        {finding}
        {r.phase === "return" && <p className="why">{r.reason} A second attempt counts as work with help, not on your own.</p>}
        <Ask qid={original} activity="original" ctx={ctx} context={`recovery:${original}`} onAnswered={setFb} />
      </div>
    );
  if (r.phase === "investigate" && r.question)
    return (
      <div className="stack">
        <p className="eyebrow">Working out what happened</p>
        <h1>{graph.get(q.competency).name}</h1>
        <p className="why">{r.reason}</p>
        <Ask key={r.question} qid={r.question} activity="diagnostic" ctx={ctx} context={investigateContext(original)} onAnswered={setFb} />
      </div>
    );
  if ((r.phase === "support" || r.phase === "teach") && r.active)
    return (
      <div className="stack">
        <p className="eyebrow">{r.phase === "teach" ? "Learning the step that went wrong" : "Finding what this problem needs"}</p>
        <h1>{graph.get(q.competency).name}</h1>
        {finding || <p className="why">{r.reason}</p>}
        {trace}
        <div className="panel"><Module key={r.active} competency={r.active} ctx={ctx} onExit={onExit} embedded withinRecovery onFeedback={setFb} established={r.established} /></div>
      </div>
    );
  return (
    <div className="stack">
      <h1>{graph.get(q.competency).name}</h1>
      {finding}
      <div className={`feedback ${r.phase === "escalate" ? "bad" : "good"}`} role="status">
        <strong>{r.phase === "solved" ? "Solved on your own" : r.phase === "solved_on_retry" ? "Solved on a second try" : r.phase === "solved_after_help" ? "Solved after help" : "Ask for help with this one"}</strong>
        <p>{r.reason}</p>
        {r.handover && (() => { const n = scheduleNote(r, Intl.DateTimeFormat().resolvedOptions().timeZone); return n ? <p className="small" data-handover={r.handover.route}>{n}</p> : null; })()}
      </div>
      {trace}
      <button className="secondary wide" onClick={onExit}>{exitLabel}</button>
    </div>
  );
}

/** One question on its own (an enrichment challenge, or a fragment of an advanced problem). */
export function Single({ qid, ctx, onExit, heading, note }: { qid: string; ctx: Ctx; onExit: () => void; heading: string; note?: string }) {
  const [fb, setFb] = useState<Fb | null>(null);
  const done = ctx.records.attempts.find((a) => a.questionId === qid);
  return (
    <div className="stack">
      <p className="eyebrow">{heading}</p>
      {note && <p className="why">{note}</p>}
      {fb ? <Feedback fb={fb} onNext={onExit} label="Back to the year" /> : done ? (
        <>
          <div className={`feedback ${rightAnswer(done) ? "good" : "bad"}`}><strong>Answered: {done.response}</strong><p>{question(qid).solution}</p></div>
          <button className="secondary wide" onClick={onExit}>Back to the year</button>
        </>
      ) : <Ask qid={qid} activity="challenge" ctx={ctx} onAnswered={setFb} />}
    </div>
  );
}
