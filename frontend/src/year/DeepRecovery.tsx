/**
 * deep-recovery@0 view (RESEARCH, shown only when year/deep-recovery-flag.ts is on; otherwise the shipped Recovery is used).
 * Every screen comes from learning/deep-recovery-app.ts `deepScreen` over the saved records; this view only shows it and saves
 * answers and lessons through the app's own ctx (the same API calls as everywhere else). A failed save changes nothing: the
 * screen stays, the answer stays in the box, and the app's error line says it was not saved.
 */
import { DEEP_EVALUATION, deepPathwayAllowed } from "./deep-recovery-flag";
import { releaseOf } from "../../../packages/learning/src/review";
import { useState } from "react";
import { question } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";
import { deepScreen } from "../learning/deep-recovery-app";
import { Ask, Feedback, Lesson, type Ctx, type Fb } from "./Learn";
import { DeepRecoveryHandoff } from "./DeepRecoveryHandoff";

const nameOf = (id: string) => (graph.byId.has(id) ? graph.get(id).name : id);

export function DeepRecovery({ original, ctx, onExit, exitLabel = "Back to the year", onFeedback }: { original: string; ctx: Ctx; onExit: () => void; exitLabel?: string; onFeedback?: (fb: Fb) => void }) {
  // [worker C, in-module recovery] embedded in a module, feedback is kept by the module: the episode can end with the answer just
  // saved (this view then unmounts), and the learner must still see that answer's feedback
  const [own, setOwn] = useState<Fb | null>(null);
  const fb = onFeedback ? null : own;
  const setFb = (f: Fb | null) => (onFeedback ? f && onFeedback(f) : setOwn(f));
  const s = deepScreen(original, ctx.records, ctx.evidence, ctx.now);
  const q = question(original);
  // learner-scoped draft keys (session ids are "learn:<learner>:<visit>"): a typed answer or a lesson screen survives a reload
  const learner = /^learn:([^:]+):/.exec(ctx.session)?.[1];
  const key = learner ? `openpath.deep-recovery@0:${learner}:${original}` : undefined;
  const path = s.state.path.length > 1 ? <p className="small muted" data-deep-path={s.state.path.join(">")}>Checking: {s.state.path.map(nameOf).join(" › ")}</p> : null;
  const head = (
    <>
      <p className="small muted" role="note" data-deep-recovery="on">{DEEP_EVALUATION ? "Controlled evaluation: real review gates apply." : "Research prototype (test build): deep recovery. Synthetic testing only."}</p>
      <p className="eyebrow">{s.kind === "end" ? "The problem you were stuck on" : s.heading}</p>
      <h1>{graph.get(q.competency).name}</h1>
      {path}
    </>
  );
  if (DEEP_EVALUATION && (!deepPathwayAllowed(ctx.records) || !ctx.records.readinessRoute?.includes(q.competency) || (s.kind === "ask" && !releaseOf(s.qid)) || (s.kind === "lesson" && !s.module.contentReview?.educatorApproved)))
    return <div className="stack" data-evaluation-stop="review-required">{head}<p>This pathway needs educator-reviewed content before this step can be used. Nothing is counted as solved. Your place is saved.</p><button onClick={onExit}>Back</button></div>;
  if (fb) return <div className="stack">{head}<p className="eyebrow">{fb.qid === original ? "The problem" : nameOf(question(fb.qid).competency)}</p><Feedback fb={fb} onNext={() => setFb(null)} /></div>;
  if (s.kind === "ask")
    return (
      <div className="stack" data-deep-phase={s.state.phase} data-deep-screen="ask">
        {head}
        <p className="why">{s.reason}</p>
        <Ask key={s.qid} qid={s.qid} activity={s.activity} ctx={ctx} context={s.context} resumeKey={key && `${key}:${s.qid}`} onAnswered={setFb} />
      </div>
    );
  if (s.kind === "lesson") {
    const review = s.module.contentReview;
    return (
      <div className="stack" data-deep-phase="teach" data-deep-screen="lesson">
        {head}
        <p className="why">{s.reason}</p>
        <p className="small muted" role="note" data-content-review={review?.status ?? "unknown"}>{review?.educatorApproved ? review.label : `${review?.label ?? "Demonstration: this explanation has not been approved by an educator."} ${s.module.teachingReview === "machine-checked" ? "It has been checked automatically against its question." : "It has not been checked automatically."}`}</p>
        <Lesson competency={s.competency} key={s.strategy.id} resumeKey={key && `${key}:lesson:${s.strategy.id}`} s={s.strategy} saving={ctx.saving} onDone={() => ctx.teach(s.competency, s.strategy.id, s.rule, s.episode ? { episode: s.episode } : undefined)} />
      </div>
    );
  }
  const good = s.phase === "solved" || s.phase === "solved_after_help";
  return (
    <div className="stack" data-deep-phase={s.phase} data-deep-screen="end">
      {head}
      <div className={`feedback ${good ? "good" : s.phase === "pause" ? "" : "bad"}`} role="status">
        <strong>{s.title}</strong>
        <p>{s.reason}</p>
        {/* recovery-handoff@0 hook (worker D): the same note until the server confirms a hand-off; a routine pause says nothing was sent */}
        {(s.handover || s.phase === "pause") && <DeepRecoveryHandoff original={original} screen={s} learner={learner} records={ctx.records} ctx={ctx} />}
      </div>
      <button className="secondary wide" onClick={onExit}>{exitLabel}</button>
    </div>
  );
}
