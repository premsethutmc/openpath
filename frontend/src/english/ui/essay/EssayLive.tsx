/**
 * The essay studio connected to the real engine (?experience=essay-live).
 *
 * Every status here is read from EssayStudio (logic/essay-live/studio.ts), which reads the learner's own record
 * through the core: nothing on this screen decides what a learner knows. The studio works only with synthetic
 * essays, on a dedicated on-device synthetic profile; it never uses a child's profile or the parent account.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { DEVELOPER_VERIFICATION, canRetryRewrite, type Item, PILOT_VERIFICATION, type Response, argumentRecords, argumentTask, wordCount } from "../../../../../packages/english-core/src/index.ts";
import type {WorkspaceSelection} from './EnglishWorkspace.tsx';
import {withWorkspaceBank} from '../../logic/essay-live/workspace-bank.ts';
import {withWorkspaceLessons} from '../../logic/essay-live/workspace-lessons.ts';
import {createWorkspaceProfile} from '../../logic/essay-live/workspace-profiles.ts';
import {ArgumentWorkspaceView} from './ArgumentWorkspaceView.tsx';
import { Brand } from "../Onboarding";
import { ItemView } from "../ItemView";
import { BUILD_CONTENT_MODE, loadContent } from "../../logic/content.ts";
import type { Feedback } from "../../logic/feedback.ts";
import { Learner } from "../../logic/learner.ts";
import { openRepo } from "../../logic/store.ts";
import { connectEvaluator, EssayStudio, SAMPLES, STUDIO_PROFILE_ID, STUDIO_PROFILE_NAME, type StudioView } from "../../logic/essay-live/studio.ts";
import { Api } from "../../logic/account.ts";
import { type EvidenceKey, estimateLabel, evidenceLabel, formativeLabel, lessonLabel } from "../../logic/essay-live/evidence-labels.ts";
import "./essay.css";

/** Real time, plus the offset in days the app's tests already use (so a later sitting can be tested). */
const clock = () => {
  let days = 0;
  try {
    days = Number(localStorage.getItem("openpath-english-clock-offset-days") ?? 0) || 0;
  } catch {
    days = 0;
  }
  return new Date(Date.now() + days * 86_400_000).toISOString();
};

type Screen = "argument" | "essay" | "skills" | "check" | "path" | "rewrite" | "profile";
const NAV: { screen: Screen; label: string }[] = [
  { screen: "essay", label: "Essay" },
  { screen: "skills", label: "Skills" },
  { screen: "check", label: "Questions" },
  { screen: "path", label: "Path" },
  { screen: "rewrite", label: "Rewrite" },
  { screen: "profile", label: "Profile" },
];
const STEP_LABEL = { diagnose: "Short check", teach: "Lesson", guided_practice: "Practice with help", independent_check: "Check without help" } as const;
const STEP_STATUS = { pending: "Not done yet", done: "Done (not a claim of mastery)", green: "Shown: the engine counts this skill at the grade target", blocked: "Content missing", skipped: "Not needed: the check without help showed the skill (still available to open)" } as const;
const RETENTION = {
  not_applicable: "Not yet: a delayed check comes only after the skill is shown without help",
  pending: "Pending: the delayed check is not due yet",
  due: "Due: the delayed check can be taken now",
  demonstrated: "Shown: the delayed check showed it was kept",
  not_demonstrated: "Not shown: the delayed check did not show it was kept (the evidence is recorded)",
} as const;
const yesNo = (b: boolean | null, yes: string, no: string, none = "Not on this path") => (b === null ? none : b ? yes : no);
const GAP = { suspected: "Suspected from your essay: not checked with bank questions yet", confirmed: "Gap confirmed: bank questions answered without help agreed", weakened: "Gap not confirmed: bank questions answered without help were right", unresolved: "Checked with bank questions: not settled" } as const;

const screenFor = (v: StudioView): Screen => (v.stage === "write" ? "essay" : v.stage === "diagnose" ? "check" : v.stage === "plan" || v.stage === "learn" ? "path" : v.stage === "rewrite" ? "rewrite" : "profile");

export function EssayLive({workspace}:{workspace?:WorkspaceSelection}={}) {
  const content = useMemo(() => workspace ? withWorkspaceBank(withWorkspaceLessons(loadContent())) : loadContent(), [workspace]);
  const workspaceProfile=useMemo(()=>workspace?createWorkspaceProfile(workspace.goal,workspace.difficulty,content):null,[workspace,content]);
  const profileId=workspace?`english-workspace-synthetic-${workspace.goal}-${workspace.difficulty}`:STUDIO_PROFILE_ID;
  const [syntheticConfirmed,setSyntheticConfirmed]=useState(false);
  const [studio, setStudio] = useState<EssayStudio | null>(null);
  const [view, setView] = useState<StudioView | null>(null);
  const [screen, setScreen] = useState<Screen>("essay");
  const [draft, setDraft] = useState("");
  const [rewrite, setRewrite] = useState("");
  const [busy, setBusy] = useState(false);
  const [argumentNavigationLocked,setArgumentNavigationLocked]=useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ item: string; f: Feedback } | null>(null);
  const [lessonAnswer, setLessonAnswer] = useState<number | null>(null);
  /** A lesson of the programme opened from the path (beyond the journey's own teaching step). */
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  /** The last answer to a generated question was recorded (its result is shown only once all five are answered). */
  const [recorded, setRecorded] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        // the device store only: essays never go to a parent account or a server
        const repo = await openRepo();
        const profiles = await repo.profiles();
        const learner = profiles.some((p) => p.id === profileId)
          ? await Learner.open(content, repo, profileId, clock)
          : await Learner.create(content, repo, workspace?"English workspace (synthetic)":STUDIO_PROFILE_NAME, "guardian", clock, profileId, "this_device_only");
        // the server's evaluator only on explicit opt-in (&evaluator=server): otherwise nothing leaves the device
        const wantServer = workspace?workspace.server:new URLSearchParams(location.search).get("evaluator") === "server";
        const api=new Api();
        const evaluator = wantServer ? await connectEvaluator(workspaceProfile?{essayEvaluatorStatus:()=>api.essayEvaluatorStatus(workspaceProfile.rubric),essayEvaluate:b=>api.essayEvaluate(b)}:api) : null;
        if (wantServer && !evaluator) setError(workspace?"The configured evaluator is unavailable. Work remains unassessed; no pattern fallback was substituted.":"The server's essay evaluator is not available (sign in with a developer account, and ask for it to be switched on). Using the recorded samples and the pattern stand-in.");
        // developer testing only: unreviewed questions may verify, and every such result says so
        const developer = BUILD_CONTENT_MODE !== "pilot" && new URLSearchParams(location.search).get("verification") === "developer";
        const s = new EssayStudio(learner, evaluator, undefined, workspace||developer ? DEVELOPER_VERIFICATION : PILOT_VERIFICATION, workspaceProfile?{profile:workspaceProfile.profile,failClosed:true,useFallback:false}:undefined);
        const v = s.view();
        setStudio(s);
        setView(v);
        const argumentsSaved=argumentRecords(learner.events.filter(e=>e.kind==='essay'));
        const reserved=!!workspace&&argumentsSaved.reservations.some(r=>!argumentsSaved.abandoned.some(a=>a.reservationId===r.id)&&!argumentsSaved.artifacts.some(a=>a.transferReservationId===r.id));
        setArgumentNavigationLocked(reserved);setScreen(reserved?'argument':screenFor(v));
        document.documentElement.dataset.essayStore = repo.kind;
      } catch (e) {
        setError(e instanceof Error ? e.message : "The essay studio could not open.");
      }
    })();
  }, [content]);
  useEffect(() => heading.current?.focus(), [screen]);

  async function act(f: () => Promise<StudioView>, after?: (v: StudioView) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const v = await f();
      setView(v);
      after?.(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }
  async function answer(item: Item, r: Response, kind: "diagnostic" | "step" | "later" | "practice") {
    if (!studio) return;
    // practice on model-written questions never reveals an answer while the learner is still answering
    const practice = kind === "practice";
    await act(async () => {
      const out = kind === "diagnostic" ? await studio.answerDiagnostic(r) : kind === "later" ? await studio.answerLaterCheck(r) : practice ? await studio.answerPractice(r) : await studio.answerStep(r);
      setFeedback(practice ? null : { item: item.id, f: out.feedback });
      setRecorded(practice);
      return out.view;
    });
  }
  /** Formal track: eligible, unseen bank questions for the chosen competency. */
  async function checkSkill(hypothesis: string) {
    if (!studio) return;
    await act(
      () => studio.checkSkill(hypothesis),
      () => {
        setFeedback(null);
        setScreen("check");
      },
    );
  }
  /** Practice track: five fresh model-written questions (provisional; formative only). */
  async function practise(hypothesis: string) {
    if (!studio) return;
    await act(
      async () => (await studio.practise(hypothesis)).view,
      (nv) => {
        setFeedback(null);
        setRecorded(false);
        if (nv.nextPractice) setScreen("check");
      },
    );
  }
  /** The recommended next activity, as an action. */
  function follow(kind: string, cap: string | null) {
    const h = cap ? view?.hypotheses.filter((x) => x.competency === cap).at(-1) : undefined;
    if (kind === "learn" || kind === "practise_and_check") void act(async () => (view?.journey && view.journey.essay === view.essay?.id && view.journey.trees.some(t=>t.root===cap) ? view : await studio!.plan()), () => setScreen("path"));
    else if (kind === "check_observation" && cap) void act(()=>studio!.checkObservation(cap),()=>setScreen('check'));
    else if (kind === "check_skill" && h) void checkSkill(h.id);
    else if (kind === "practise" && h) void practise(h.id);
    else if (kind === "answer_questions" || kind === "finish_practice") setScreen("check");
    else setScreen("essay");
  }
  const keyOf = (it: Item | undefined) => (it?.kind === "code" ? (it.options && it.answer !== undefined ? it.options[it.answer] : (it.answers?.[0] ?? "")) : "");

  const workspaceText=(text:string)=>workspace?text.replace(/the grade target/gi,'the selected practice reference').replace(/Grade 0/gi,'non-school practice').replace(/Grade 8 target/gi,'selected practice reference'):text;
  const presentEvidence=(label:ReturnType<typeof evidenceLabel>)=>workspace?{...label,label:label.key==='verified'||label.key==='verified_developer'?'Retained on candidate practice checks':label.key==='shown'||label.key==='shown_unreviewed_check'?'Shown on candidate independent checks':label.key==='confirmed'?'Concern supported by candidate checks':workspaceText(label.label),detail:workspaceText(label.detail)+' This is candidate practice evidence, not validated proficiency or an exam prediction.'}:label;
  const v = view;
  const essay = v?.essay;
  const name = (cap: string) => studio?.ectx.profile.byCapability.get(cap)?.name ?? cap;
  const STATUS_CLASS: Record<EvidenceKey, string> = { none: "not-started", seen: "needs-verification", suspected: "needs-verification", confirmed: "learning", unsettled: "needs-verification", not_confirmed: "needs-verification", shown: "independently-demonstrated", shown_unreviewed_check: "independently-demonstrated", verified: "verified", verified_developer: "independently-demonstrated" };
  const labelFor = (cap: string) => {
    const c = v?.profile.competencies.find((x) => x.competency === cap);
    return c ? presentEvidence(evidenceLabel(c)) : null;
  };
  /** The evidence state, worded for what the evidence actually shows (evidence-labels.ts). */
  const Status = ({ cap }: { cap: string }) => {
    const l = labelFor(cap);
    if (!l) return null;
    return (
      <span className={`essay-status essay-status-${STATUS_CLASS[l.key]}`} data-status={l.key} title={l.detail}>
        {l.label}
      </span>
    );
  };
  const Recommendation = () =>
    v?.recommendation ? (
      <section className="essay-card essay-recommendation" data-recommendation={v.recommendation.kind} aria-label="What to do next">
        <p className="kicker">Next</p>
        <h2>{v.recommendation.title}</h2>
        <p className="small">{workspaceText(v.recommendation.reason)}</p>
        {v.recommendation.verification && !v.recommendation.verification.available && (
          <p className="small" data-verification="unavailable">
            {workspaceText(v.recommendation.verification.reason)}
          </p>
        )}
        {v.recommendation.history.length > 0 && (
          <ul className="small" data-history>
            {v.recommendation.history.map((h) => (
              <li key={h}>Earlier essay {h}</li>
            ))}
          </ul>
        )}
        {(v.recommendation.kind !== "practise" || v.canGenerate) && (
          <button className="primary essay-primary" disabled={busy} onClick={() => follow(v.recommendation!.kind, v.recommendation!.competency)}>
            {
              ({ review_saved_writing: "Review my saved draft", check_observation: "Check this concern", learn: "Start learning", practise_and_check: "Go to my learning path", answer_questions: "Back to the questions", finish_practice: "Back to the practice", check_skill: "Check this skill", practise: "Practise: 5 new questions", write_again: "Write another essay" } as Record<string, string>)[v.recommendation.kind]
            }
          </button>
        )}
      </section>
    ) : null;
  const passage = (item: Item) => (item.kind === "code" && item.passage ? content.ctx.content.passages.get(item.passage) : undefined);
  const enabled = (s: Screen) => !!v && (s === "essay" || !!essay) && (s !== "rewrite" || !!v.journey?.finalRewrite.available) && (s !== "profile" || !!essay);

  return (
    <div className="shell essay-experience" data-essay-mode="live" data-stage={v?.stage ?? "loading"}>
      <header className="top">
        <Brand />
        <a className="essay-exit" href="./">
          Back to OpenPath
        </a>
      </header>
      <aside className="essay-demo-banner" aria-label="What is real here">
        <strong>{workspace?"English workspace · one learning history":"Essay studio · connected to the learning engine"}</strong>
        <span>
          Synthetic essays only, on a test learner kept on this device. {workspace?"Candidate practice evidence only, not validated adult proficiency or exam readiness. Lesson completion and model feedback do not establish mastery.":studio?.verification.eligibility === "counted" ? "Developer test: answers on unreviewed questions may verify, and such results are labelled so; this is not the pilot policy." : "Verified mastery needs educator-reviewed questions, answered after their release (the pilot policy)."} Questions, lessons and every status come from the real engine.{" "}
          {studio?.connected
            ? `Essay analysis${studio.canGenerate ? " and fresh questions" : ""}: OpenPath's server evaluator (${studio.evaluator.model ?? "model"}), checked by the engine. Synthetic text, quoted evidence, task prompts and practice-profile metadata are sent to the server. Argument revision analysis also includes the previous draft. Questions written by the model are provisional: they inform your profile but never count as showing a skill.`
            : workspace?"No evaluator connected: writing is saved but unassessed. Self-review prompts are available; no pattern judgment is substituted.":"Essay analysis: recorded outputs for the built-in samples (other text: a simple pattern stand-in). No AI model is connected."}
        </span>
      </aside>
      {v && (
        <nav className="essay-nav" aria-label="Essay journey">
          {(workspace?[...NAV.slice(0,2),{screen:"argument" as const,label:"Articulate both sides"},...NAV.slice(2)]:NAV).map((n) => (
            <button type="button" key={n.screen} aria-current={screen === n.screen ? "step" : undefined} disabled={busy || (argumentNavigationLocked&&n.screen!=="argument") || !enabled(n.screen)} onClick={() => {if(studio)setView(studio.view());setScreen(n.screen);}}>
              {n.label}
            </button>
          ))}
        </nav>
      )}
      <main id="essay-main" className="page essay-main" aria-busy={busy}>
        <p className="eyebrow">{workspace?`${workspace.goal} · ${workspace.difficulty} starting practice, not a measured level`:"Grade 8 · writing"}</p>
        <h1 className="hero" ref={heading} tabIndex={-1}>
          {{ argument:"Build and test your argument", essay: "Your essay", skills: "What your essay shows", check: "A few questions", path: "Your learning path", rewrite: "Same ideas, at most 50 words", profile: "Your writing profile" }[screen]}
        </h1>
        {error && (
          <div role="alert" className="essay-error">
            <p>{error}</p>
          </div>
        )}
        {!v && !error && <p role="status">Opening the essay studio…</p>}
        {workspace&&v?.essay&&(!v.analysis||v.analysis.status==='rejected')&&<section className="essay-card" data-writing-unassessed><h2>Your draft is saved, not assessed</h2><details><summary>Read my saved draft</summary><p style={{whiteSpace:'pre-wrap'}}>{v.essay.text}</p></details><p>No learning targets or successful completion were inferred. Retrying uses this same draft, not a second writing sample.</p>{studio?.connected?<button disabled={busy} onClick={()=>void act(()=>studio!.retryAnalysis(),()=>setScreen('skills'))}>Retry analysis of this saved draft</button>:<p>Reconnect the evaluator and reopen this same workspace to retry. Your committed draft is kept.</p>}</section>}
        {v && screen === "essay" && (
          <>
            {essay && (
              <p className="essay-note" data-testid="essay-count">
                {v.essays.length} essay{v.essays.length === 1 ? "" : "s"} so far. A new essay starts from everything already recorded.
              </p>
            )}
            <section className="essay-prompt">
              <p className="kicker">Use invented text only</p>
              <p>{workspace?argumentTask(workspace!.goal,workspace!.difficulty,1,"initial").prompt:"Pick a built-in synthetic sample, or type invented writing. Do not paste a real child’s work."}</p>
              {!workspace&&SAMPLES.essays.map((s) => (
                <button key={s.id} type="button" className="link" data-sample={s.id} onClick={() => setDraft(s.text)}>
                  Use sample: {s.title}
                </button>
              ))}
            </section>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if(workspace&&(!syntheticConfirmed||wordCount(draft)>800))return;
                void act(
                  () => studio!.submit(draft, { kind: SAMPLES.essays.some((s) => s.text === draft) ? "synthetic" : "typed", ...(workspaceProfile?{prompt:argumentTask(workspace!.goal,workspace!.difficulty,1,"initial").prompt}:{}) }),
                  (nv) => {
                    setDraft("");
                    setScreen("skills");
                    void nv;
                  },
                );
              }}
            >
              <label htmlFor="essay-live-draft">Essay</label>
              <textarea id="essay-live-draft" disabled={!!workspace&&busy} rows={10} maxLength={10000} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="essay-editor-foot">
                <span>{workspace ? "30–800 words" : "At least 30 words"}</span>
                <output aria-live="polite">{wordCount(draft)} words</output>
              </div>
              <label>{workspace&&<><input type="checkbox" checked={syntheticConfirmed} onChange={e=>setSyntheticConfirmed(e.target.checked)}/>This is invented test writing, not real learner work.</>}</label>
              <button type="submit" className="primary essay-primary" disabled={busy || wordCount(draft) < 30 || (!!workspace&&(!syntheticConfirmed||wordCount(draft)>800))}>
                Analyse this essay
              </button>
            </form>
          </>
        )}
        {workspace&&studio&&essay&&screen==="argument"&&<ArgumentWorkspaceView studio={studio} selection={workspace} initialText={essay.text} initialEssayId={essay.id} onNavigationLock={setArgumentNavigationLocked}/>}
        {v && screen === "skills" && essay && (
          <>
            <p className="essay-note" data-testid="analysed-by">
              {
                workspace&&!v.analysedBy?"Saved, not assessed. No model judgment or pattern substitute was used.":{
                  llm: "Analysis: an AI model on OpenPath's server. Structure and quoted text are checked, not semantic correctness.",
                  replay: "Analysis: a recorded server answer (test mode), checked by the engine.",
                  recorded: "Analysis: recorded evaluator output for this built-in sample, checked by the engine.",
                  patterns: "Analysis: the simple pattern stand-in (it misses most errors), checked by the engine.",
                }[v.analysedBy ?? "patterns"]
              }{" "}
              {v.failedAnalyses.length > 0 && (workspace?(v.analysis?.status==='accepted'?"An earlier analysis attempt failed; these are the accepted retry observations, still tentative. ":"Analysis was unavailable or rejected. No gaps were inferred. "):"The server's evaluator failed for this essay, so the local stand-in answered. ")}One essay gives clues, not conclusions.
            </p>
            {v.analysis?.repeatOf&&<p>This repeats saved writing. It is not new evidence; use the original draft’s check or write a genuinely new sample.</p>}
            <Recommendation />
            <div className="essay-competencies" data-dashboard>
              {[...new Set(v.analysis?.observations.map((o) => o.competency) ?? [])].map((cap) => {
                const obs = v.analysis!.observations.filter((o) => o.competency === cap);
                const errors = obs.filter((o) => o.kind === "error");
                const h = v.hypotheses.filter((x) => x.competency === cap).at(-1);
                const asked = !!h && v.diagnostics.some((d) => d.request.hypothesis === h.id && d.request.source !== "generated");
                const sets = h ? v.questionSets.filter((q) => q.hypothesis === h.id) : [];
                const failed = sets.at(-1)?.status === "rejected" ? sets.at(-1) : undefined;
                return (
                  <article className="essay-card" key={cap} data-competency={cap} data-errors={errors.length}>
                    <div className="essay-card-heading">
                      <h2>{name(cap)}</h2>
                    </div>
                    <Status cap={cap} />
                    {h && <p data-gap={h.status}>{h.exploratory?(h.status==='suspected'?'You chose to check a tentative concern. No gap is confirmed.':h.status==='confirmed'?'Independent bank answers suggest this skill needs practice. This does not prove a recurring problem in your own writing.':h.status==='weakened'?'Bank answers did not support this concern. No writing improvement or mastery is inferred.':GAP[h.status]):GAP[h.status]}</p>}
                    <p className="small">
                      {errors.length ? `${errors.length} thing${errors.length === 1 ? "" : "s"} to check` : obs.some(o=>o.kind==='style') ? "Style suggestions to consider, not errors" : "Strengths observed, not verified"}
                      {h && h.essays.length > 1 ? ` · also seen in ${h.essays.length - 1} earlier essay${h.essays.length === 2 ? "" : "s"}` : ""}
                    </p>
                    <ul className="essay-quotes">
                      {obs.map((o) => (
                        <li key={o.id} data-quote={o.span.quote}>
                          {o.kind === "error" ? "Check: " : o.kind === "style" ? "Style (a suggestion, not an error): " : "Good: "}“{o.span.quote}”{!workspace&&o.correction ? ` → ${o.correction}` : ""}{workspace&&o.kind==='error'?" Which part would you change, and why? Check it before accepting this concern.":""}
                        </li>
                      ))}
                    </ul>
                    {workspace&&v.observationChecks.includes(cap)&&<button type="button" className="essay-primary" data-observation-check={cap} disabled={busy} onClick={()=>void act(()=>studio!.checkObservation(cap),()=>setScreen('check'))}>Check this concern before accepting it</button>}
                    {h && h.status === "suspected" && !asked && (
                      <button type="button" className="essay-primary" data-check={cap} disabled={busy} onClick={() => void checkSkill(h.id)}>
                        Check this skill (questions from the bank)
                      </button>
                    )}
                    {h && v.canGenerate && !v.nextPractice && (
                      <button type="button" className="link" data-practise={cap} disabled={busy} onClick={() => void practise(h.id)}>
                        {failed ? "Try again: practise with 5 new questions" : "Practise with 5 new questions (provisional)"}
                      </button>
                    )}
                    {workspace&&workspaceProfile?.coverage.find(c=>c.capability===cap)?.specified===false&&<p className="small">This area has no specified independent check yet. Treat the comment as a tentative observation: explain what you meant and revise in your own words if it helps. No confirmed gap or mastery is recorded.</p>}
                    {failed && (
                      <p className="small" role="status" data-questions-rejected>
                        The questions written for this skill did not pass OpenPath&apos;s checks, so none is used: {[...failed.reasons, ...failed.rejected.flatMap((r) => r.reasons.map((x) => `question ${r.index + 1}: ${x}`))].slice(0, 3).join("; ")}.
                      </p>
                    )}
                    <details>
                      <summary>Why?</summary>
                      {obs.map((o) => (
                        <blockquote key={o.id}>
                          “{o.span.quote}”: {o.note}
                        </blockquote>
                      ))}
                      {h && <p className="small">{h.basis.join(". ")}</p>}
                    </details>
                  </article>
                );
              })}
            </div>
            <button className="primary essay-primary" onClick={() => setScreen(screenFor(v))}>
              Continue
            </button>
          </>
        )}
        {v && screen === "check" && (
          <>
            {v.nextDiagnostic ? (
              <section className="essay-card essay-diagnostic" data-diagnostic={v.nextDiagnostic.request.competency} data-source={v.nextDiagnostic.request.source ?? "bank"}>
                <p className="kicker">
                  {name(v.nextDiagnostic.request.competency)} · question {v.nextDiagnostic.position} of {v.nextDiagnostic.request.source === "generated" ? "" : "up to "}
                  {v.nextDiagnostic.total} · without help
                </p>
                {v.nextDiagnostic.request.source === "generated" && <p className="small">Written for you from your essay. Provisional: not reviewed by a teacher, and it never counts as showing the skill. Answers are shown at the end.</p>}
                {recorded && (
                  <p className="small" role="status" data-recorded>
                    Answer recorded.
                  </p>
                )}
                <ItemView key={v.nextDiagnostic.item.id} item={v.nextDiagnostic.item} passage={passage(v.nextDiagnostic.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.nextDiagnostic!.item, r, "diagnostic")} />
              </section>
            ) : v.nextPractice ? (
              <section className="essay-card essay-diagnostic" data-practice={v.nextPractice.set.competency} data-source="generated">
                <p className="kicker">
                  {name(v.nextPractice.set.competency)} · practice {v.nextPractice.position} of {v.nextPractice.total}
                </p>
                <p className="small">Practice written for you from your essay by a model. Provisional: not reviewed by a teacher. It gives feedback only; it never confirms a gap or counts as showing the skill. Answers are shown at the end.</p>
                {recorded && (
                  <p className="small" role="status" data-recorded>
                    Answer recorded.
                  </p>
                )}
                <ItemView key={v.nextPractice.item.id} item={v.nextPractice.item} passage={undefined} voice={null} locked={busy} onSubmit={(r) => void answer(v.nextPractice!.item, r, "practice")} />
              </section>
            ) : (
              !v.questionSets.some((q) => q.status === "accepted") && <p className="essay-note">No questions are waiting.</p>
            )}
            {feedback && (
              <div className="essay-feedback" role="status" data-correct={feedback.f.correct}>
                <p>{feedback.f.correct ? "Right." : `Not quite. ${feedback.f.answer ? `Answer: ${feedback.f.answer}.` : ""}`}</p>
                {feedback.f.explanation && <p className="small">{feedback.f.explanation}</p>}
              </div>
            )}
            {!v.nextPractice &&
              v.questionSets
                .filter((q) => q.status === "accepted" && q.essay === essay?.id)
                .map((q) => {
                  const f = v.profile.competencies.find((c) => c.competency === q.competency)?.formative;
                  if (!f || f.set !== q.id || f.status === "pending") return null;
                  return (
                    <section className="essay-card essay-results" key={q.id} data-results={q.competency} data-formative={f.status}>
                      <h2>{name(q.competency)}: your practice</h2>
                      <p>{f.reason}</p>
                      <ol>
                        {q.items.map((it) => {
                          const a = f.answers.find((x) => x.item === it.id);
                          return (
                            <li key={it.id} data-result-item={it.id} data-correct={String(!!a?.correct)}>
                              <span>{it.prompt}</span>
                              <small>
                                {a?.correct ? "Right" : "Not quite"} · answer: {keyOf(it)}
                                {it.explain ? `. ${it.explain}` : ""}
                              </small>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  );
                })}
            {!v.nextDiagnostic && !v.nextPractice && <Recommendation />}
            <ul className="essay-profile-list">
              {v.diagnostics.map((d) => (
                <li key={d.request.id} data-outcome={d.outcome.status}>
                  <span>{name(d.request.competency)}</span>
                  <span>{d.outcome.status === "pending" ? "In progress" : d.outcome.reason}</span>
                  <small>{d.request.source === "generated" ? "Older fresh questions (provisional: not a formal check)" : "Questions from the bank"}</small>
                </li>
              ))}
            </ul>
            {!v.nextDiagnostic && (
              <button className="primary essay-primary" onClick={() => setScreen("path")}>
                Go to my learning path
              </button>
            )}
          </>
        )}
        {v && screen === "path" && (
          <>
            {v.journey?.trees.length===0&&<p role="status">No learning targets have been established. This is not a completed learning path or evidence of correct writing. Return to Skills to explore a tentative concern.</p>}
            {!v.journey || v.journey.trees.length===0 ? (
              <button className="primary essay-primary" disabled={busy || !!v.nextDiagnostic} onClick={() => void act(() => studio!.plan())}>
                Build my learning path
              </button>
            ) : (
              <>
                <div className="essay-tree">
                  {v.journey.trees.map((t) => (
                    <section className="essay-branch" key={t.root} data-tree={t.root}>
                      <h2>{name(t.root)}</h2>
                      <Status cap={t.root} />
                      {t.nodes.some((n) => n.competency === t.root && n.steps.some((x) => x.kind === "independent_check" && x.status === "blocked")) && (
                        <p className="small" data-verification="unavailable">
                          {workspace?`Candidate independent checking is not available for ${name(t.root)} yet: eligible unseen questions are insufficient after exposure and retention reservations. Teaching remains available; missing content is not a learner deficit.`:`Mastery verification is not available for ${name(t.root)} yet: the question bank does not have enough reviewed, unseen questions at the selected provisional practice target band for a check without help. The lessons and practice still work, and nothing will be claimed until a real check is possible.`}
                        </p>
                      )}
                      {(() => {
                        const c = v.profile.competencies.find((x) => x.competency === t.root);
                        const l = c?.lessons;
                        if (!l) return null;
                        const nextId = l.lessons.find((x) => !x.completedAt)?.id;
                        return (
                          <div className="small" data-lesson-programme={t.root} data-lessons-done={l.completed} data-lessons-total={l.total}>
                            <p>
                              Lessons: {l.completed} of {l.total} completed ({l.percent}%){l.sessions > 1 ? `, over ${l.sessions} sessions` : ""}. Learning progress only: it is not a measure of understanding or mastery.
                            </p>
                            {nextId && !openLesson && (
                              <button type="button" className="link" disabled={busy} data-next-lesson={nextId} onClick={() => setOpenLesson(nextId)}>
                                Next lesson ({l.completed + 1} of {l.total})
                              </button>
                            )}
                          </div>
                        );
                      })()}
                      {v.canGenerate && !v.nextPractice && (() => {
                        const h = v.hypotheses.filter((x) => x.competency === t.root).at(-1);
                        return h ? (
                          <button type="button" className="link" data-practise={t.root} disabled={busy} onClick={() => void practise(h.id)}>
                            More practice: 5 new questions (provisional)
                          </button>
                        ) : null;
                      })()}
                      <div className="essay-branch-body">
                        {t.nodes.map((n) => (
                          <div key={n.competency} data-node={n.competency} data-green={n.green}>
                            {n.role === "prerequisite" && <p className="kicker">First: {name(n.competency)}</p>}
                            <ol>
                              {n.steps.map((s) => (
                                <li key={s.id} data-step={s.kind} data-status={s.status}>
                                  <span className="essay-node" />
                                  {STEP_LABEL[s.kind]}
                                  <small>{s.status === "blocked" ? s.content.note : workspace&&s.status==="green"?"Shown on candidate independent practice checks":workspaceText(STEP_STATUS[s.status])}</small>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                {(v.journey.reviews ?? []).map((r) => (
                  <section className="essay-branch" key={r.check} data-review={r.competency} data-review-complete={String(r.complete)}>
                    <h2>Review: {name(r.competency)}</h2>
                    <p className="small">{r.reason} Your learning path above is unchanged.</p>
                    <ol>
                      {r.steps.map((s) => (
                        <li key={s.id} data-step={s.kind} data-status={s.status}>
                          <span className="essay-node" />
                          {STEP_LABEL[s.kind]}
                          <small>{s.status === "blocked" ? s.content.note : s.status === "skipped" ? "Available if you want it: some answers in the delayed check were right" : STEP_STATUS[s.status]}</small>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                {v.outcomes.length > 0 && (
                  <section className="essay-card essay-outcomes" aria-label="Where each skill stands">
                    <h2>Where each skill stands</h2>
                    <p className="small">Each line is a separate claim. Finishing the path is never the same as showing a skill.</p>
                    {v.outcomes.map((o) => (
                      <dl key={o.competency} data-outcome-for={o.competency} data-journey-completed={String(o.journeyCompleted)} data-demonstrated={String(o.demonstrated)} data-verified={String(o.verified)} data-retention={o.retention}>
                        <dt>{name(o.competency)}</dt>
                        <dd>Path: {yesNo(o.journeyCompleted, "completed", "not finished")}</dd>
                        <dd>Shown without help at band {o.target}: {o.demonstrated ? "yes" : "not yet"}</dd>
                        <dd>{workspace?"Retained on candidate later checks":"Verified (a later check passed)"}: {o.verified ? "yes" : "not yet"}</dd>
                        <dd>Retention: {RETENTION[o.retention]}{o.retentionDueAt && (o.retention === "pending" || o.retention === "due") ? ` (from ${o.retentionDueAt.slice(0, 10)})` : ""}</dd>
                        {o.pending && <dd className="small">{o.pending}</dd>}
                      </dl>
                    ))}
                    {v.outcomes.some((o) => o.next && !o.next.planned) && (
                      <button className="essay-primary" disabled={busy} onClick={() => void act(() => studio!.planLaterChecks())}>
                        Plan the later checks
                      </button>
                    )}
                    {v.checks.filter((c) => !v.laterCheck || c.id !== v.laterCheck.check.id).map((c) => (
                      <p className="small" key={c.id} data-planned-check={c.kind}>
                        {c.kind === "retention" ? "Delayed check" : "Later check"} on {name(c.competency)}: from {c.notBefore.slice(0, 10)}
                      </p>
                    ))}
                  </section>
                )}
                {v.laterCheck && !v.next && (
                  <section className="essay-card essay-active-step" data-current-step={`later_${v.laterCheck.check.kind}`}>
                    <p className="kicker">
                      {name(v.laterCheck.check.competency)} · {v.laterCheck.check.kind === "retention" ? "Delayed check" : "Later check"} {v.laterCheck.position} of {v.laterCheck.total}
                    </p>
                    <p className="small">A new sitting, on questions you have not seen. Answer without help.</p>
                    <ItemView key={v.laterCheck.item.id} item={v.laterCheck.item} passage={passage(v.laterCheck.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.laterCheck!.item, r, "later")} />
                  </section>
                )}
                {openLesson && content.lessons.get(openLesson) && (() => {
                  const l = content.lessons.get(openLesson)!;
                  return (
                    <section className="essay-card essay-active-step" data-current-step="programme_lesson" data-lesson={l.id}>
                      <p className="kicker">{name(l.capability)} · Lesson programme</p>
                      <h2>{l.title}</h2>
                      <p>{l.rule}</p>
                      {l.examples.map((ex) => (
                        <blockquote key={ex.text}>{ex.text}</blockquote>
                      ))}
                      <fieldset>
                        <legend>{l.check.prompt}</legend>
                        {l.check.options.map((o, i) => (
                          <label className="essay-option" key={o}>
                            <input type="radio" name="lesson-check" checked={lessonAnswer === i} onChange={() => setLessonAnswer(i)} />
                            <span>{o}</span>
                          </label>
                        ))}
                      </fieldset>
                      <button
                        className="primary essay-primary"
                        disabled={busy || lessonAnswer === null}
                        onClick={() =>
                          void act(
                            () => studio!.readLesson(l.id, lessonAnswer === l.check.answer),
                            () => {
                              setLessonAnswer(null);
                              setOpenLesson(null);
                            },
                          )
                        }
                      >
                        I&apos;ve read this
                      </button>
                    </section>
                  );
                })()}
                {v.next && !openLesson && (
                  <section className="essay-card essay-active-step" data-current-step={v.next.step.kind}>
                    <p className="kicker">
                      {name(v.next.node.competency)} · {STEP_LABEL[v.next.step.kind]}
                    </p>
                    {v.next.step.kind === "teach" && v.next.lesson && (
                      <>
                        <h2>{v.next.lesson.title}</h2>
                        <p>{v.next.lesson.rule}</p>
                        {v.next.lesson.examples.map((ex) => (
                          <blockquote key={ex.text}>{ex.text}</blockquote>
                        ))}
                        <fieldset>
                          <legend>{v.next.lesson.check.prompt}</legend>
                          {v.next.lesson.check.options.map((o, i) => (
                            <label className="essay-option" key={o}>
                              <input type="radio" name="lesson-check" checked={lessonAnswer === i} onChange={() => setLessonAnswer(i)} />
                              <span>{o}</span>
                            </label>
                          ))}
                        </fieldset>
                        <button
                          className="primary essay-primary"
                          disabled={busy || lessonAnswer === null}
                          onClick={() => {
                            const l = v.next!.lesson!;
                            void act(() => studio!.readLesson(l.id, lessonAnswer === l.check.answer), () => setLessonAnswer(null));
                          }}
                        >
                          I&apos;ve read this
                        </button>
                      </>
                    )}
                    {v.next.item && (
                      <>
                        <p className="small">
                          {v.next.step.kind === "guided_practice"
                            ? "Practice: these answers help you learn and never count as showing the skill."
                            : v.next.newSitting
                              ? "A new sitting starts now, so this check is not straight after the lesson. Answer without help."
                              : "Answer without help."}
                        </p>
                        <ItemView key={v.next.item.id} item={v.next.item} passage={passage(v.next.item)} voice={null} locked={busy} onSubmit={(r) => void answer(v.next!.item!, r, "step")} />
                      </>
                    )}
                  </section>
                )}
                {feedback && (
                  <div className="essay-feedback" role="status" data-correct={feedback.f.correct}>
                    <p>{feedback.f.correct ? "Right." : `Not quite. ${feedback.f.answer ? `Answer: ${feedback.f.answer}.` : ""}`}</p>
                  </div>
                )}
                {v.journey.contentGaps.length > 0 && (
                  <details className="essay-note">
                    <summary>Missing content ({v.journey.contentGaps.length})</summary>
                    <ul>
                      {v.journey.contentGaps.map((g) => (
                        <li key={`${g.competency}${g.what}`}>{g.what}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {v.journey.skipped.length > 0 && (
                  <details>
                    <summary>Not on this path ({v.journey.skipped.length})</summary>
                    <ul>
                      {v.journey.skipped.map((s) => (
                        <li key={s.competency}>{s.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <section className="essay-final-gate">
                  <h2>Final challenge</h2>
                  <p>{v.journey.finalRewrite.reason}</p>
                  <button className="primary" disabled={!v.journey.finalRewrite.available} onClick={() => setScreen("rewrite")}>
                    Rewrite in at most 50 words
                  </button>
                </section>
              </>
            )}
          </>
        )}
        {v && screen === "rewrite" && essay && (
          <>
            <details className="essay-original" open>
              <summary>Your essay</summary>
              <p>{essay.text}</p>
            </details>
            {!workspace&&SAMPLES.rewrites.some((r) => SAMPLES.essays.find((s) => s.id === r.essay)?.text === essay.text) && (
              <button type="button" className="link" data-sample-rewrite onClick={() => setRewrite(SAMPLES.rewrites.find((r) => SAMPLES.essays.find((s) => s.id === r.essay)?.text === essay.text)!.text)}>
                Use the synthetic sample rewrite
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act(() => studio!.rewrite(rewrite,v.savedRewrite?.rewrite.id), () => setScreen("profile"));
              }}
            >
              <label htmlFor="essay-live-rewrite">Rewrite</label>
              <textarea id="essay-live-rewrite" rows={6} maxLength={2000} value={rewrite} onChange={(e) => setRewrite(e.target.value)} />
              <div className="essay-editor-foot">
                <span>20 to 50 words · aim for about 50</span>
                <output aria-live="polite">{wordCount(rewrite)} / 50 words</output>
              </div>
              <button className="primary essay-primary" type="submit" disabled={busy || wordCount(rewrite) < 20 || wordCount(rewrite) > 50}>
                Submit rewrite
              </button>
            </form>
          </>
        )}
        {v && screen === "profile" && (
          <>
            {v.rewrite && (
              <section className="essay-rewrite-feedback" data-rewrite={v.rewrite.status}>
                <h2>Rewrite</h2>
                {v.rewrite.status === "evaluated" ? (
                  v.rewrite.dimensions.map((d) => (
                    <article className="essay-card" key={d.dimension} data-dimension={d.dimension} data-dimension-status={d.status}>
                      <h3>{d.dimension.replace("_", " ")}</h3>
                      <p>{d.status === "accepted" ? `Tentative feedback: ${d.rating?.replace("_", " ")}` : `Not judged: ${d.reason}`}</p>{d.status==="accepted"&&d.quotes.map((quote,i)=><blockquote key={i}>{quote}</blockquote>)}
                    </article>
                  ))
                ) : (
                  <p className="essay-note">{v.rewrite.reasons[0]}</p>
                )}
                {v.savedRewrite&&<details open><summary>Read my saved rewrite</summary><p style={{whiteSpace:'pre-wrap'}}>{v.savedRewrite.rewrite.text}</p></details>}
                {v.rewriteRetryAvailable&&v.savedRewrite&&<button disabled={busy} onClick={()=>void act(()=>studio!.retrySavedRewrite(v.savedRewrite!.rewrite.id))}>Retry this saved rewrite analysis</button>}
                {canRetryRewrite(v.rewrite)&&!studio?.connected&&<p>Reconnect the evaluator and reopen this workspace to retry unavailable analysis. Your saved rewrite is kept.</p>}
                {v.rewrite.status==='evaluated'&&<>
                  <h3>Ideas compared with your original</h3><p>These are the evaluator's suggested matches, not a complete or verified account of your meaning. A missing match does not prove an idea was lost.</p>
                  {v.rewrite.keyIdeas.length===0?<p>No usable idea comparison was returned.</p>:v.rewrite.keyIdeas.map((idea,i)=><article key={i}><blockquote>{idea.original}</blockquote>{idea.rewrite?<><p>Possible match in your rewrite:</p><blockquote>{idea.rewrite}</blockquote></>:<p>The evaluator did not locate a matching passage. Decide whether this idea matters to your intended meaning.</p>}</article>)}
                  {v.rewriteQuestion&&<section><h3>One question for your next revision</h3><p>{v.rewriteQuestion}</p></section>}
                </>}
                {v.savedRewrite&&<button disabled={busy} onClick={()=>{setRewrite(v.savedRewrite!.rewrite.text);setScreen('rewrite');}}>Revise my saved rewrite in my own words</button>}
                <p className="small">A rewrite never changes an estimate and never verifies a skill.</p>
              </section>
            )}
            <section>
              <h2>{workspace?"Writing foundations and observed evidence":"Skills in Grade 8 writing"}</h2>
              <ul className="essay-profile-list">
                {v.profile.competencies
                  .filter((c) => c.state !== "unknown")
                  .map((c) => (
                    <li key={c.competency} data-profile={c.competency} data-state={c.state}>
                      <span>{c.name}</span>
                      <Status cap={c.competency} />
                      {c.gap && <small data-profile-gap={c.gap.status}>{GAP[c.gap.status]}</small>}
                      {lessonLabel(c) && (
                        <small data-lessons={c.lessons!.percent}>{lessonLabel(c)}</small>
                      )}
                      <small data-estimate={c.engine.estimate ? c.engine.estimate.mean.toFixed(1) : "none"}>{workspace?estimateLabel(c).replace("the Grade 8 target", "the self-selected practice reference"):estimateLabel(c)}</small>
                      {formativeLabel(c) && <small data-formative={c.formative!.status}>{formativeLabel(c)}</small>}
                      {c.provenance.provisional.length > 0 && <small data-held={c.provenance.provisional.length}>{c.provenance.provisional.length} answer{c.provenance.provisional.length === 1 ? "" : "s"} on model-written practice questions: kept, never counted as evidence of the skill</small>}
                      {c.notes.map((n) => (
                        <small key={n}>{workspaceText(n)}</small>
                      ))}
                    </li>
                  ))}
              </ul>
            </section>
            <div className="essay-next">
              <button className="primary" onClick={() => setScreen("essay")}>
                Write another essay
              </button>
            </div>
          </>
        )}
        {workspaceProfile&&<details><summary>What this workspace can and cannot assess</summary>{workspaceProfile.limitations.map((note,i)=><p key={i}>{note}</p>)}<p>{workspaceProfile.summary.withLessons} competencies have candidate lesson or mini-lesson content; {workspaceProfile.summary.withoutLessons} have missing teaching. Missing content is not a learner deficit.</p><ul>{workspaceProfile.coverage.map(c=><li key={c.capability}>{c.name}: {c.status.replaceAll('_',' ')}; {c.lessonIds.length} lesson parts; {c.itemsAtPracticeTarget} raw items at the practice reference (eligibility and freshness still apply).</li>)}</ul></details>}
      </main>
    </div>
  );
}
