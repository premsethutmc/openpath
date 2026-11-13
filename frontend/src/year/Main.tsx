import { CurriculumPractice } from "./CurriculumPractice";
import { setGradingMode } from "../../../packages/learning/src/grading/mode";
import { TopicSession } from "./TopicSession";
import { KeyboardPractice } from "../writing/KeyboardPractice";
/**
 * My Learning Year (/year/): one learner's school year through the shared learning engine. Same account, learner and
 * record as the rest of OpenPath (kind "learning_record" in the mathematics record). Everything shown is derived from
 * the stored records; nothing is kept only on the device.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../english/logic/account";
import { apiOptions, DEVICE_BUILD } from "./device-api";
import { goal as goalById, goals, moduleFor, question, questions } from "../../../packages/learning/src/content";
import { latestReleases, releasesFor, sampleFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf, assigned, review, subjectSupported, synthesise, type CurriculumRelease, type ReviewDecision } from "../../../packages/learning/src/curriculum";
import { UNSUPPORTED } from "../../../packages/learning/src/coverage";
import { offersFor } from "../../../packages/learning/src/decomposition";
import { extract } from "../../../packages/learning/src/extract";
import { decompose, problemOf } from "../../../packages/learning/src/families";
import { sameAnswer, solve } from "../../../packages/learning/src/solve";
import { readProblem } from "../../../packages/learning/src/read-problem";
import { familyOf, moduleState } from "../../../packages/learning/src/intervention";
import { reviewFixtureActive, rightAnswer, useReviewFixture } from "../../../packages/learning/src/evidence";
import { parentReport } from "../../../packages/learning/src/parent-report";
import { competencyProfile, topicName, type Period, type TopicMeasure } from "../../../packages/learning/src/competency-profile";
import { examPlan, examPlanApplies, overlay, readiness } from "../../../packages/learning/src/goals";
import { graph } from "../../../packages/learning/src/graph";
import { years } from "../../../packages/learning/src/plan";
import { withDecisions, type HandoverAcknowledgement, type LearningActivity, type LearningRecord, type ServerDecision } from "../../../packages/learning/src/records";
import { delayedCheckFact } from "../../../packages/learning/src/due-display";
import { learnerState, make, type StudyRecord, type StudyUpdate } from "../../../packages/learning/src/session";
import { KEYBOARD_UNAVAILABLE, withheldDrawings, writtenTask, type WrittenMark } from "../../../packages/learning/src/written";
import { isDrawing, SketchView } from "./SketchPad";
import { contentOf, flatten, tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { setActiveRegistry, type Registry } from "../../../packages/learning/src/review";
import { Icon } from "./icons";
import { Module, Recovery, Single, STATUS_WORD, type Ctx } from "./Learn";
import { DeepRecovery } from "./DeepRecovery";
import { deepRecoveryOn, deepPathwayAllowed, DEEP_EVALUATION } from "./deep-recovery-flag";
import { RecoveryAnswersPermission } from "./RecoveryAnswersPermission";
import { openDeepRecoveries } from "../learning/deep-recovery-app";
import { deepGoalModule } from "../learning/deep-goal";
import { afterHelpOf, afterHelpTiles, afterHelpSummary, qualifiedEvidence, type AfterHelp } from "../learning/deep-evidence";
import "../mathematics/chapter/chapter.css";
import "./year.css";

declare const OPENPATH_REVIEW_FIXTURE: boolean;
// TEST BUILDS ONLY: treat every question as educator-reviewed, so acceptance tests can show a verified (green) skill.
if (typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE) useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true }); // generated questions too (the dashboard's test build reads the same)

const api = new Api(apiOptions());
/** deep-recovery@0 (research): false in every shipped build (deep-recovery-flag.ts). The build constant is read here directly so
 *  that a shipped (minified) bundle folds DEEP to false and drops the research view and its code. */
declare const OPENPATH_DEEP_RECOVERY: boolean;
const DEEP = typeof OPENPATH_DEEP_RECOVERY !== "undefined" && OPENPATH_DEEP_RECOVERY === true && deepRecoveryOn();
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
/** Problems a learner may bring when stuck (a class or coaching problem): opened by the learner, never pushed. */
const STUCK = questions.filter((q) => q.role === "original");
/** Offered from two grades before the problem's own grade (a learner meeting it early in class or coaching). */
const stuckFor = (grade: number) => STUCK.filter((q) => graph.get(q.competency).gradeRange[0] - 2 <= grade);

class Repo {
  private queue: Promise<unknown> = Promise.resolve();
  private count = 0;
  readonly learner: string;
  constructor(learner: string) {
    this.learner = learner;
  }
  async load() {
    const r = await api.request<{ count: number; events: { kind: string }[]; decisions?: Record<string, ServerDecision>; gradingMode?: string }>("GET", `/pupils/${this.learner}/events/?subject=mathematics`);
    this.count = r.count;
    setGradingMode(r.gradingMode); // which grading is authoritative: the result shown after an answer is the server's recorded decision
    // stage 7: a regrade appends a superseding decision on the server; replay uses it in place of the one inside the stored attempt
    return withDecisions(r.events, r.decisions);
  }
  append(event: LearningRecord) {
    const work = this.queue.then(async () => {
      let r:{count:number};
      try { r = await api.request<{ count: number }>("POST", `/pupils/${this.learner}/events/`, { subject: "mathematics", seq: this.count, event }); }
      catch(error){const known=await this.load();if(known.some((e:any)=>e.id===event.id))return known;throw error;}
      this.count = r.count;
      return this.load();
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}

type View =
  | { name: "year" }
  | { name: "setup"; sameYear?: boolean }
  | { name: "tile"; path: string[] }
  | { name: "topic-diagnostic"; competency: string; back: View }
  | { name: "curriculum-practice"; competency: string; back: View; stage?: "teaching" | "practice" }
  | { name: "module"; competency: string; back: View; reviewOnly?: boolean }
  | { name: "stuck"; qid: string; back?: View }
  | { name: "worked"; text: string; read?: WordReading }
  | { name: "parent" }
  | { name: "single"; qid: string; heading: string; note?: string }
  | { name: "years" };

const academicYear = (d = new Date(), ahead = 0) => {
  const y = (d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1) + ahead;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};
/** Subjects a learner may name; only those with a competency graph can be taught here (coverage@1 says so). */
const SUBJECTS = ["Mathematics", "English", "Science", "Social studies", "Another language"];
/** The heading over a tile's children, from what they are. */
const childHeading = (ts: Tile[]) => {
  const kinds = new Set(ts.map((t) => (t.kind === "proposal" || t.kind === "unsupported" ? "skill" : t.kind)));
  const only = kinds.size === 1 ? [...kinds][0] : null;
  return only === "unit" ? "Units" : only === "chapter" ? "Chapters" : only === "section" ? "Sections" : only === "skill" ? "Skills" : only === "micro" ? "Smaller steps" : "Inside";
};
const KIND_WORD: Record<Tile["kind"], string> = { subject: "Subject", unit: "Unit", chapter: "Chapter", section: "Section", skill: "Skill", micro: "Smaller step", proposal: "Not mapped yet", unsupported: "Not supported yet" };

/** The learner is added here: kept in this browser only in a device build (device-mode@1), with the parent account otherwise. */
function AddDeviceLearner({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setBusy(true); api.createPupil(name.trim()).then(() => { setName(""); onDone(); }).catch((er) => onError(String(er.message ?? er))).finally(() => setBusy(false)); }}>
      <label htmlFor="device-learner">{DEVICE_BUILD ? "Add a learner on this device" : "Add a learner"}</label>
      <input id="device-learner" value={name} maxLength={60} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="A first name or nickname" />
      <p className="muted">A first name or a nickname is enough. {DEVICE_BUILD ? "It stays in this browser." : "It is kept with your parent account."}</p>
      <button className="primary" disabled={busy || !name.trim()}>Add learner</button>
    </form>
  );
}

function App() {
  const [pathwayTarget, setPathwayTarget] = useState(new URLSearchParams(location.search).get("target") ?? "");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [emailAccount, setEmailAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [pupils, setPupils] = useState<PupilSummary[]>([]);
  const [learner, setLearner] = useState<string>(new URLSearchParams(location.search).get("learner") ?? "");
  const [events, setEvents] = useState<{ kind: string }[] | null>(null);
  const showPathway = new URLSearchParams(location.search).get("foundation") === "1" || !!events?.some((e) => (e as LearningRecord).record === "foundation_pathway");
  const pathwayChoices = useMemo(() => showPathway ? graph.competencies.filter((c) => !c.partOf && moduleFor(c.id)) : [], [showPathway]);
  // deep-recovery@0 (research builds only): ?stuck=<question> opens the recovery from that problem
  const stuckQ = DEEP ? new URLSearchParams(location.search).get("stuck") : null;
  const [view, setView] = useState<View>(new URLSearchParams(location.search).get("curriculum") === "change" ? { name: "setup", sameYear: true } : stuckQ && (() => { try { return !!question(stuckQ); } catch { return false; } })() ? { name: "stuck", qid: stuckQ } : { name: "year" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [registryLoaded, setRegistryLoaded] = useState(0);
  const visit = useRef(uid());

  async function refreshAccount() {
    let s = await api.status();
    if (!s.available) throw new Error("The OpenPath account service is not reachable. Wait a minute (it may be waking up) and reload.");
    // name-start@1: a sign-in that has run out is renewed with this browser's own key
    if (NAME_START && !s.account.authenticated && (await guestSignIn())) s = await api.status();
    setSignedIn(s.account.authenticated);
    setAccountEmail(s.account.authenticated ? (s.account as { email?: string }).email ?? "" : "");
    if (s.account.authenticated) {
      // what is released (educator-reviewed): only released content can count toward verified mastery
      const reviewed = await api.request<{ registry: Registry }>("GET", "/content-review/").catch(() => null);
      if (reviewed) {
        setActiveRegistry(reviewed.registry);
        setRegistryLoaded((n) => n + 1);
      }
      const rows = await api.pupils();
      setPupils(rows);
      setLearner((cur) => (rows.some((p) => p.id === cur) ? cur : rows.length === 1 ? rows[0].id : ""));
    }
  }
  useEffect(() => {
    refreshAccount().catch((e) => setError(String(e.message ?? e))).finally(() => setReady(true));
  }, []);
  const repo = useMemo(() => (learner ? new Repo(learner) : null), [learner]);
  // written@1: an educator's marks on this learner's written answers (read-only; only a mark of correct counts)
  const [marks, setMarks] = useState<WrittenMark[]>([]);
  const [acks, setAcks] = useState<HandoverAcknowledgement[]>([]);
  useEffect(() => {
    setEvents(null);
    setMarks([]);
    if (!repo || !signedIn) return;
    repo.load().then(setEvents).catch((e) => setError(String(e.message ?? e)));
    api.request<{ marks: WrittenMark[] }>("GET", `/pupils/${learner}/written-marks/`).then((r) => setMarks(r.marks)).catch(() => setMarks([]));
    // handover@1: an educator's acknowledgements of a paused skill, from the server only
    api.request<{ acknowledgements: HandoverAcknowledgement[] }>("GET", `/pupils/${learner}/handover-acknowledgements/`).then((r) => setAcks(r.acknowledgements)).catch(() => setAcks([]));
  }, [repo, signedIn]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const st = useMemo(() => (learner && events ? learnerState(learner, events, now, { currentSession: `learn:${learner}:${visit.current}`, marks, acknowledgements: acks }) : null), [learner, events, now, registryLoaded, acks, marks]);
  // ?skill=<competency> (from the curriculum dashboard): open that skill's module once the year is loaded
  const wanted = useRef(new URLSearchParams(location.search).get("skill"));
  useEffect(() => {
    const want = wanted.current;
    if (!want || !st?.release || !moduleFor(want)) return;
    wanted.current = null;
    const stage = new URLSearchParams(location.search).get("stage");
    // a stage chosen on the lesson page applies once: a reload resumes the lesson where it was left
    if (stage) { const u = new URL(location.href); u.searchParams.delete("stage"); history.replaceState(history.state, "", u); }
    if (new URLSearchParams(location.search).get("practice") === "curriculum") setView({name:"curriculum-practice",competency:want,back:{name:"year"},stage:stage==="practice"?"practice":stage==="learn"?"teaching":undefined});
    else if (new URLSearchParams(location.search).get("diagnostic") === "topic" && st.enrolment?.grade === 7) setView({name:"topic-diagnostic",competency:want,back:{name:"year"}});
    else setView({name:"module",competency:want,back:{name:"year"}});
  }, [st?.release]);
  const session = `learn:${learner}:${visit.current}`;
  const ctxOf = () => ({ learnerId: learner, sessionId: session, at: new Date().toISOString() });

  // timing@1: about how long the current question has been on screen. The clock restarts when the screen changes and after
  // each answer, and stops while the page is hidden. Longer than ten minutes is treated as a pause and not recorded.
  const shown = useRef({ at: Date.now(), hidden: 0, hiddenAt: 0 });
  const restartClock = () => { shown.current = { at: Date.now(), hidden: 0, hiddenAt: document.visibilityState === "hidden" ? Date.now() : 0 }; };
  useEffect(restartClock, [view]);
  useEffect(() => {
    const onVis = () => { const s = shown.current; if (document.visibilityState === "hidden") s.hiddenAt = Date.now(); else if (s.hiddenAt) { s.hidden += Date.now() - s.hiddenAt; s.hiddenAt = 0; } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  const onScreen = (): number | null => { const s = shown.current; const ms = Date.now() - s.at - s.hidden; restartClock(); return ms > 0 && ms <= 600_000 ? ms : null; };
  const lastDecision = useRef<ServerDecision | null>(null);
  async function save(...records: LearningRecord[]) {
    if (!repo) return false;
    setSaving(true);
    setError("");
    lastDecision.current = null;
    try {
      let next = events ?? [];
      for (const r of records) next = await repo.append(r);
      // the server's recorded (authoritative) decision for the answer just saved: what the learner is shown (check A)
      const savedId = (records.at(-1) as { id?: string } | undefined)?.id;
      lastDecision.current = ((next as { id?: string; decision?: ServerDecision }[]).find((e) => e.id === savedId)?.decision) ?? null;
      setEvents(next);
      setNow(Date.now());
      return true;
    } catch (e) {
      setError(`Not saved: ${String((e as Error).message ?? e)}. Check your connection and try again.`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveStudy(update:StudyUpdate):Promise<StudyRecord|null> {
    if(!repo)return null;
    try{const next=await repo.append(make.study(ctxOf(),update));setEvents(next);return [...next].reverse().find((e:any)=>e.record==='study_session'&&e.planId===update.planId) as StudyRecord;}
    catch { return null; } // The study timer owns retry/error state and clears it after a successful save.
  }

  const banner = DEVICE_BUILD ? <div className="test-banner" role="note">This device only · progress is kept in this browser, not on a server. It is not backed up and cannot be opened on another device.</div> : DEEP_EVALUATION ? <div className="test-banner" role="note">Controlled evaluation · integration methods only. Real educator review gates apply; unapproved content is unavailable.</div> : reviewFixtureActive() ? <div className="test-banner" role="note">TEST BUILD · questions are treated as educator-reviewed so that “verified” can be shown. Never use with real learners.</div> : null;
  if (!ready) return <Shell banner={banner}><p className="muted center">Opening OpenPath…</p></Shell>;
  if (!signedIn) {
    const done = () => refreshAccount().catch((e) => setError(String(e.message ?? e)));
    return <Shell banner={banner} error={error}>{NAME_START && !emailAccount ? <NameStart onDone={done} onError={setError} onAccount={() => { setError(""); setEmailAccount(true); }} /> : <SignIn onDone={done} onError={setError} />}</Shell>;
  }
  if (!learner)
    return (
      <Shell banner={banner} error={error}>
        <h1>Who is learning?</h1>
        {pupils.length ? (
          <div className="cards">
            {pupils.map((p) => (
              <button key={p.id} className="card big" onClick={() => setLearner(p.id)}>
                <span className="card-title">{p.display_name}</span>
                <span className="card-sub">Open My Learning Year</span>
              </button>
            ))}
          </div>
        ) : null}
        {/* a learner is added here too (the same learner is used in the rest of OpenPath when there is an account) */}
        {<AddDeviceLearner onDone={() => refreshAccount().catch((e) => setError(String(e.message ?? e)))} onError={setError} />}
        <p className="center"><a className="link" href="/">← OpenPath</a></p>
      </Shell>
    );
  if (!st) return <Shell banner={banner} error={error}><p className="muted center">Loading the record…</p></Shell>;

  const name = pupils.find((p) => p.id === learner)?.display_name ?? "Learner";
  const ctx: Ctx = {
    records: st.records.pathway?.active ? st.selectionRecords : st.records,
    // deep-recovery@0 on one learning goal (research switch; deep-goal.ts): only that goal's "recover" changes
    ...(st.records.pathway?.active ? { module: DEEP && deepPathwayAllowed(st.records) ? deepGoalModule(true, st.module, st.selectionRecords, st.selectionEvidence, now) : st.module } : {}),
    evidence: st.records.pathway?.active ? st.selectionEvidence : st.evidence,
    now,
    session,
    saving,
    answer: (qid: string, response: string, activity: LearningActivity, o = {}) => { const ms = onScreen(); return save(make.attempt(ctxOf(), qid, response, activity, { ...o, ...(ms ? { ms } : {}) })); },
    recorded: () => lastDecision.current,
    teach: (competency: string, strategy: string, rule: string, o?: { episode?: string }) => save(make.teach(ctxOf(), competency, strategy, rule.slice(0, 40), o?.episode ? { episode: o.episode } : {})),
  };
  const top = (left: React.ReactNode, title: string) => <TopBar left={left} title={title} />;
  const home = <button className="link" onClick={() => setView({ name: "year" })}>← My year</button>;
  // device-mode@1: the learner list is also where a learner is added, so it is always reachable; there is no /maths/ page there
  const switcher = pupils.length > 1 || DEVICE_BUILD ? <button className="link" onClick={() => setLearner("")}>{DEVICE_BUILD ? "Learners" : "Switch"}</button> : <a className="link" href="/maths/">← Maths</a>;

  if (!st.enrolment || view.name === "setup")
    return (
      <Shell banner={banner} error={error} top={top(st.enrolment ? home : switcher, name)}>
        <Setup
          current={st.enrolment?.grade ?? null}
          sameYear={view.name === "setup" && view.sameYear}
          currentYear={st.enrolment?.academicYear}
          goals={[...st.records.goals.keys()]}
          saving={saving}
          onSave={async (grade, release, saveRelease, goal, year) => {
            const recs: LearningRecord[] = [];
            if (saveRelease) recs.push(make.curriculum(ctxOf(), release));
            recs.push(make.enrol(ctxOf(), grade, year, release));
            if (!(view.name === "setup" && view.sameYear)) {
              for (const g of st.records.goals.keys()) if (g !== goal) recs.push(make.goal(ctxOf(), g, false));
              if (goal && !st.records.goals.has(goal)) recs.push(make.goal(ctxOf(), goal, true));
            }
            if (await save(...recs)) {
              const url = new URL(location.href);
              url.searchParams.delete("curriculum");
              history.replaceState(null, "", url);
              setView({ name: "year" });
            }
          }}
        />
      </Shell>
    );
  if (!st.release || !st.summary)
    return (
      <Shell banner={banner} error={error} top={top(switcher, name)}>
        <p className="error">This year's curriculum could not be found (it may have changed). Choose it again.</p>
        <button className="primary" onClick={() => setView({ name: "setup" })}>Choose the curriculum</button>
      </Shell>
    );

  const release = st.release;
  const grade = st.enrolment.grade;
  const activeGoals = [...st.records.goals.keys()];
  const goalOf = (c: string) => activeGoals.filter((g) => overlay(g, grade, assigned(release).map((a) => a.competency), st.evidence)?.foundations.includes(c));
  // deep-recovery@0 evidence after help (research switch; learning/deep-evidence.ts): a skill shown only after a deep episode's help
  // reads "Solved independently after help" on its tile (never the unqualified "Shown on your own"); switch off: unchanged
  const ahMemo = new Map<string, AfterHelp | null>();
  const ahOf = (c: string, recs = st.records, ev = st.evidence) => { const k = `${recs === st.records ? "y" : "g"}:${c}`; if (!ahMemo.has(k)) ahMemo.set(k, afterHelpOf(c, recs, ev, now)); return ahMemo.get(k)!; };
  const claimEvidence = qualifiedEvidence(st.evidence, (c) => ahOf(c));
  const tiles = afterHelpTiles(tilesFor(release, st.evidence, goalOf), (c) => ahOf(c));
  const open = (t: Tile, path: string[]) => {
    if (t.kind === "proposal" || t.kind === "unsupported") return;
    if (t.kind === "skill" && t.children.length === 0 && moduleFor(t.competency!) && t.content?.level === "module") return setView({ name: "module", competency: t.competency!, back: { name: "tile", path: path.slice(0, -1) } });
    setView({ name: "tile", path });
  };

  if (view.name === "curriculum-practice")
    return (
      <Shell paper banner={banner} error={error} top={top(home, name)}>
        {st.records.pathway?.active && st.records.pathway.target === view.competency && st.next?.competency && st.next.competency !== view.competency && <aside className="why" aria-label="Optional supporting lesson">
          <p>You can learn this chapter now. If you want supporting practice, we recommend {graph.get(st.next.competency).name}. Opening a lesson does not claim mastery.</p>
          <button className="secondary" onClick={() => setView({ name: "module", competency: st.next!.competency!, back: view })}>Try optional support</button>
        </aside>}
        <CurriculumPractice
          key={`${learner}:${release.hash}:${view.competency}`}
          competency={view.competency} ctx={ctx}
          resumeKey={`openpath.curriculum-practice@1:${learner}:${st.enrolment.academicYear}:${release.hash}:${view.competency}`}
          back={`/curriculum/?learner=${encodeURIComponent(learner)}#c=${encodeURIComponent(view.competency)}`}
          initialStage={view.stage}
          onAssess={() => setView({ name: "module", competency: view.competency, back: { name: "curriculum-practice", competency: view.competency, back: view.back } })}
          onStuck={(qid) => setView({ name: "stuck", qid, back: { name: "curriculum-practice", competency: view.competency, back: view.back, stage: "practice" } })}
        />
      </Shell>
    );
  if (view.name === "topic-diagnostic")
    return <Shell paper banner={banner} error={error} top={top(home, name)}><button className="secondary" onClick={() => setView({ name: "curriculum-practice", competency: view.competency, stage: "teaching", back: view.back })}>Open this lesson</button><p className="small muted">This starting-point check is optional. You can learn the chapter first.</p><TopicSession academicYear={st.enrolment!.academicYear} learner={learner} target={view.competency} ctx={ctx} release={release} events={events ?? []} saveStudy={saveStudy} saveStart={() => save(make.topicStart(ctxOf(),view.competency,release,st.enrolment!.academicYear))} savePlan={minutes => save(make.sessionPlan(ctxOf(), view.competency, minutes, release,st.enrolment!.academicYear))} /></Shell>;
  if (view.name === "module")
    return (
      <Shell paper={grade === 7} banner={banner} error={error} wide={false} top={keyboardOpen ? undefined : top(<button className="link" onClick={() => setView(view.back)}>← Back</button>, name)}>
        <div className="lesson-link"><button className="link" onClick={() => setView({ name: "curriculum-practice", competency: view.competency, stage: "teaching", back: view.back })}>Open this lesson</button></div>
        <KeyboardPractice key={`${learner}:${view.competency}`} onOpenChange={setKeyboardOpen} api={api} learner={learner} competency={view.competency} onSaved={async () => { if (repo) setEvents(await repo.load()); }}>
          <Module competency={view.competency} reviewOnly={view.reviewOnly} ctx={ctx} onExit={() => setView(view.back)} />
        </KeyboardPractice>
        <KeyboardNote competency={view.competency} ctx={ctx} />
      </Shell>
    );
  if (view.name === "parent")
    return (
      <Shell banner={banner} error={error} top={top(home, "For parents")}>
        <ParentView name={name} learner={learner} st={st} guest={isGuest(accountEmail)} onClaimed={() => refreshAccount().catch((e) => setError(String(e.message ?? e)))} now={now} />
      </Shell>
    );
  if (view.name === "worked")
    return <Shell banner={banner} error={error} top={top(home, name)}><Worked text={view.text} read={view.read} onExit={() => setView({ name: "year" })} /></Shell>;
  if (view.name === "stuck")
    return (
      <Shell banner={banner} error={error} top={top(home, name)}>
        {DEEP && deepPathwayAllowed(ctx.records) ? <DeepRecovery original={view.qid} ctx={ctx} onExit={() => setView(view.back ?? { name: "year" })} exitLabel={view.back ? "Back to the lesson" : undefined} />
          : <Recovery original={view.qid} ctx={ctx} onExit={() => setView(view.back ?? { name: "year" })} exitLabel={view.back ? "Back to the lesson" : undefined} />}
      </Shell>
    );
  if (view.name === "single")
    return (
      <Shell banner={banner} error={error} top={top(home, name)}>
        <Single qid={view.qid} ctx={ctx} heading={view.heading} note={view.note} onExit={() => setView({ name: "year" })} />
      </Shell>
    );
  if (view.name === "years")
    return (
      <Shell banner={banner} error={error} wide top={top(home, name)}>
        <h1>Your years</h1>
        <p className="muted">Every year keeps its records. A skill shown in an earlier year stays shown, and its delayed checks still come back.</p>
        {years(st.records).slice().reverse().map((y) => {
          const r = latestReleases.find((x) => x.id === y.curriculum.id && x.hash === y.curriculum.hash) ?? [...st.records.curricula.values()].find((x) => x.id === y.curriculum.id && x.hash === y.curriculum.hash);
          const s = r ? flatten(tilesFor(r, st.evidence)).filter((t) => t.kind === "skill" && t.assessable) : [];
          return (
            <div key={y.at} className="panel" style={{ marginBottom: 12 }}>
              <p className="eyebrow">{y.current ? "This year" : "Earlier"}</p>
              <h2>Grade {y.grade} · {y.academicYear}</h2>
              <p className="muted">{r?.title ?? y.curriculum.id}</p>
              <p className="small">{s.filter((t) => t.status === "verified").length} verified · {s.filter((t) => t.status === "shown").length} shown on your own · {s.filter((t) => t.status === "active").length} learning · {s.filter((t) => t.status === "not_started").length} not started</p>
            </div>
          );
        })}
      </Shell>
    );
  if (view.name === "tile") {
    const chain: Tile[] = [];
    let level = tiles;
    for (const id of view.path) {
      const t = level.find((x) => x.id === id);
      if (!t) break;
      chain.push(t);
      level = t.children;
    }
    const here = chain.at(-1);
    if (!here) return setTimeout(() => setView({ name: "year" })) && null;
    return (
      <Shell banner={banner} error={error} wide top={top(<button className="link" onClick={() => setView(view.path.length > 1 ? { name: "tile", path: view.path.slice(0, -1) } : { name: "year" })}>← Back</button>, name)}>
        <nav className="crumbs" aria-label="Where you are">
          <button onClick={() => setView({ name: "year" })}>My year</button>
          {chain.map((t, k) => (
            <React.Fragment key={t.id}>
              <span>›</span>
              {k < chain.length - 1 ? <button onClick={() => setView({ name: "tile", path: view.path.slice(0, k + 1) })}>{t.title}</button> : <span>{t.title}</span>}
            </React.Fragment>
          ))}
        </nav>
        <TileDetail t={here} ev={st.evidence} onStart={here.competency && moduleFor(here.competency) && here.kind === "skill" ? () => setView({ name: "module", competency: here.competency!, back: view }) : undefined} />
        {here.children.length > 0 && (
          <>
            <div className="section-title"><h2>{childHeading(here.children)}</h2></div>
            <TileGrid tiles={here.children} onOpen={(t) => open(t, [...view.path, t.id])} />
          </>
        )}
      </Shell>
    );
  }

  // ---------------------------------------------------------------- the year dashboard
  const qualifiedSummary = afterHelpSummary(tiles);
  const sum = qualifiedSummary ?? st.summary;
  const next = st.next!;
  const routeHelp = st.records.pathway?.active ? (st.selectionRecords.readinessRoute ?? []).map(c => ahOf(c, st.selectionRecords, st.selectionEvidence)).filter(Boolean) : [];
  const nextReason = next.kind === "none" && routeHelp.length && /shown/.test(next.reason)
    ? "This route includes problems solved independently after help. That success stays recorded, but it is not unqualified mastery; later checks and any difficulties remain in your record."
    : next.reason;
  const ids = assigned(release).map((a) => a.competency);
  const overlays = activeGoals.map((g) => overlay(g, grade, ids, claimEvidence)).filter((o) => o !== null);
  // advanced problems: the steps of the general decomposition that suit this grade; the full problem once its
  // grade and readiness rules are met (decomposition@2 for the steps, the stored readiness rule for the full problem)
  const offers = offersFor(grade, claimEvidence).map((o) => {
    const fam = familyOf(o.problem.full.id);
    const d = fam ? decompose(problemOf(fam)!, grade) : null;
    return { o, steps: o.full ? [] : (d?.forGrade ?? []).map((x) => x.question!) };
  }).filter((x) => x.o.full || x.steps.length);
  const goNext = () => {
    if (next.kind === "challenge" && next.question) return setView({ name: "single", qid: next.question, heading: "Enrichment challenge" });
    if (next.competency) setView({ name: "module", competency: next.competency, back: { name: "year" } });
  };
  return (
    <Shell paper={grade === 7} banner={banner} error={error} wide top={top(switcher, name)}>
      <div className="year-head">
        <p className="eyebrow">My Learning Year</p>
        <h1>Grade {grade} · {st.enrolment.academicYear}</h1>
        <div className="year-meta">
          <span className="chip">{release.title}</span>
          {release.source.synthetic && <span className="chip">Sample textbook</span>}
          {activeGoals.map((g) => <span key={g} className="chip">Goal: {goalById(g)?.name}</span>)}
        </div>
      </div>
      {events && (()=>{const done=[...events].reverse().find((e:any)=>e.record==='study_session'&&e.phase==='ended'&&events.some((p:any)=>p.id===e.planId&&p.academicYear===st.enrolment?.academicYear&&p.curriculum?.id===release.id&&p.curriculum?.hash===release.hash)) as StudyRecord|undefined;if(!done?.summary)return null;const plan=events.find((e:any)=>e.id===done.planId) as Extract<LearningRecord,{record:'topic_session'}>|undefined;return plan?<p className="small">Last study session: {done.summary.correctIds.length} correct, {done.summary.incorrectIds.length} incorrect. <a href={`/year/?learner=${encodeURIComponent(learner)}&skill=${encodeURIComponent(plan.target)}&diagnostic=topic`}>View session summary</a> · Performance is separate from verified mastery.</p>:null;})()}
      {/* today-plan@1: one clear thing to do, the day's goal and the run of days, before anything else on the page */}
      <TodayStrip st={st} now={now} />
      {next.kind !== "none" ? (
        <div className="next">
          <p className="eyebrow">Next</p>
          <h2>{next.question ? question(next.question).prompt.split(":")[0] : graph.get(next.competency!).name}</h2>
          <p className="muted">{nextReason}</p>
          {st.change && <p className="why" role="status"><b>Why this changed:</b> {st.change}</p>}
          <button className="primary" onClick={goNext}>{next.kind === "retention" ? "Start the delayed check" : next.kind === "review" ? "Review it" : next.kind === "continue" ? "Continue" : "Start"}</button>
        </div>
      ) : (
        <div className="next"><p className="eyebrow">Next</p><p>{nextReason}</p>{next.reviewCompetency && <button className="secondary" onClick={() => setView({ name: "module", competency: next.reviewCompetency!, reviewOnly: true, back: { name: "year" } })}>Review a supported lesson</button>}</div>
      )}
      {showPathway && <section className="next" aria-label="Learning pathway">
        <h2>Your learning goal</h2>
        <p>Choose a topic and open its lesson now. Prerequisite checks recommend supporting practice; they do not lock lessons. Your starting grade is not a ceiling. Earlier marks stay unchanged, and opening a lesson or choosing a goal awards no mastery. Demonstration content remains labelled.</p>
        <p className="small muted">Using a learning goal opts new answers into the trusted grader and skill-evidence policy. Opening a lesson alone does not change that policy.</p>
        {st.records.pathway?.active && <p>Current goal: {graph.get(st.records.pathway.target).name}</p>}
        <label>Target topic<select aria-label="Target topic" value={pathwayTarget} onChange={(e) => setPathwayTarget(e.target.value)}><option value="">Choose a topic</option>{pathwayChoices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button className="primary" disabled={saving || !pathwayTarget || !moduleFor(pathwayTarget)} onClick={() => setView({ name: "curriculum-practice", competency: pathwayTarget, stage: "teaching", back: { name: "year" } })}>Open selected lesson</button>
        <button className="primary" disabled={saving || !pathwayTarget || !moduleFor(pathwayTarget)} onClick={() => save(make.pathway(ctxOf(), pathwayTarget))}>Use this learning goal</button>
        {st.records.pathway?.active && <button className="secondary" disabled={saving} onClick={() => save(make.pathway(ctxOf(), st.records.pathway!.target, false))}>Return to my year plan</button>}
      </section>}
      {DEEP && (() => { const open = openDeepRecoveries(st.records, st.evidence, now); return open.length ? (
        <section aria-label="Continue a recovery">
          <div className="section-title"><h2>Continue where you left off</h2></div>
          <div className="cards">{open.map((o) => <button key={o.original} className="card" data-deep-continue={o.original} onClick={() => setView({ name: "stuck", qid: o.original })}><span className="card-title">{graph.get(question(o.original).competency).name}</span><span className="card-sub">{o.screen.kind === "end" ? "Paused: your place is saved" : "A recovery in progress"}</span></button>)}</div>
        </section>) : null; })()}
      {st.records.pathway?.active && (() => { const route = st.selectionRecords.readinessRoute ?? []; const hits = route.map((c) => [c, ahOf(c, st.selectionRecords, st.selectionEvidence)] as const).filter(([, a]) => a);
        return hits.length ? <p className="small" role="note" data-after-help-goal>{hits.map(([c, a]) => `${graph.get(c).name}: ${a!.label}.`).join(" ")}</p> : null; })()}
      {next.paused?.length ? <p className="why" role="note"><b>Paused for a teacher or parent:</b> {next.paused.map((id) => graph.get(id).name).join(", ")}. Different explanations have not worked yet, so OpenPath does not ask more on {next.paused.length > 1 ? "these" : "this"} on its own.</p> : null}
      {tiles.map((s) => (
        <section key={s.id} aria-label={s.title}>
          <div className="section-title"><h2>{s.title}</h2><span className="small muted">{s.progress.done} of {s.progress.total} skills shown on your own</span></div>
          {s.subtitle && <p className="hint small" role="note">{s.subtitle}</p>}
          <TileGrid tiles={s.children} onOpen={(t) => open(t, [s.id, t.id])} />
        </section>
      ))}
      <CoverageCard release={release} learner={learner} />
      {overlays.map((o) => (
        <section key={o!.goal.id} aria-label={`Goal ${o!.goal.name}`}>
          <div className="section-title"><h2>Your goal: {o!.goal.name}</h2></div>
          <p className="muted">{o!.note}</p>
          {o!.foundations.length > 0 && <p className="small">Marked <b>Goal</b> on the tiles: {o!.foundations.map((c) => graph.get(c).name).join(", ")}.</p>}
          {o!.challenges.length > 0 && (
            <div className="cards">
              {o!.challenges.map((c) => {
                const done = st.records.attempts.some((a) => a.questionId === c.question);
                return (
                  <button key={c.question} className={`card ${c.ready ? "" : "locked"}`} disabled={!c.ready} onClick={() => setView({ name: "single", qid: c.question, heading: `Enrichment challenge · ${o!.goal.name}` })}>
                    <span className="tag">{done ? "Tried" : c.ready ? "Ready" : "Locked"}</span>
                    <span className="card-title">{question(c.question).prompt.split(":")[0]}</span>
                    <span className="card-sub">{c.ready ? "A reasoning challenge built on a skill you have shown." : `Opens after you show ${c.readiness.map((r) => graph.get(r).name.toLowerCase()).join(", ")} on your own.`}</span>
                  </button>
                );
              })}
            </div>
          )}
          {(() => {
            const r = readiness(o!.goal.id, grade, claimEvidence)!;
            return <p className="small">Foundations so far (up to Grade {grade}): {r.shown} of {r.foundationsSoFar} shown on your own{r.verified ? `, ${r.verified} verified` : ""}. This is read from your own record; a goal adds nothing to it.</p>;
          })()}
          {examPlanApplies(o!.goal.id, grade) && <ExamPlanCard goalId={o!.goal.id} ev={claimEvidence} />}
        </section>
      ))}
      {offers.length > 0 && (
        <section aria-label="Steps toward an advanced problem">
          <div className="section-title"><h2>Steps toward an advanced problem</h2></div>
          <p className="muted small">An advanced problem, broken into steps. You see only the steps for your grade; the whole problem comes when you are ready for it.</p>
          <div className="cards">
            {offers.flatMap(({ o, steps }) =>
              o.full
                ? [
                    <button key={o.full.id} className="card" onClick={() => setView({ name: "single", qid: o.full!.id, heading: `Full problem · ${o.problem.title}`, note: "You have shown the skills it needs. This is the full problem." })}>
                      <span className="tag">Full problem</span>
                      <span className="card-title">{o.full.prompt}</span>
                      <span className="card-sub">{o.problem.style} · {o.problem.validation}</span>
                    </button>,
                  ]
                : steps.map((q) => (
                    <button key={q.id} className="card" onClick={() => setView({ name: "single", qid: q.id, heading: `One step of: ${o.problem.title}`, note: `One part of an advanced problem, at your grade. It uses ${graph.get(q.competency).name.toLowerCase()}.` })}>
                      <span className="tag">One step</span>
                      <span className="card-title">{q.prompt}</span>
                      <span className="card-sub">{graph.get(q.competency).name}</span>
                    </button>
                  )),
            )}
          </div>
        </section>
      )}
      <section aria-label="Stuck on a problem">
        <div className="section-title"><h2>Stuck on a problem?</h2></div>
        <p className="muted small">Type a problem from class or coaching. OpenPath works out what went wrong, teaches the skill it needs, and brings you back to it.</p>
        <StuckBox grade={grade ?? undefined} onOpen={(qid) => setView({ name: "stuck", qid })} onWorked={(text, read) => setView({ name: "worked", text, read })} />
        {stuckFor(grade).length > 0 && (
          <div className="cards" style={{ marginTop: 10 }}>
            {stuckFor(grade).map((q) => (
              <button key={q.id} className="card" onClick={() => setView({ name: "stuck", qid: q.id })}>
                <span className="card-title">{q.prompt}</span>
                <span className="card-sub">{graph.get(q.competency).name}</span>
              </button>
            ))}
          </div>
        )}
      </section>
      {/* the year's totals and the less-used links sit below the work (today-plan@1) */}
      <section aria-label="Your year so far" className="year-foot">
        <div className="section-title"><h2>Your year so far</h2></div>
      {st.records.pathway?.active && <p className="small muted">Year totals summarize answer evidence. Recommendations and competency claims consider skill coverage and diagnosed gaps. Your chapters remain open for teaching.</p>}
      <div className="stats" role="list" aria-label="This year so far">
        <div className="stat verified" role="listitem"><b>{sum.verified}</b><span>Verified</span></div>
        <div className="stat shown" role="listitem"><b>{sum.shown}</b><span>Shown on your own</span></div>
        {qualifiedSummary && qualifiedSummary.afterHelp > 0 && <div className="stat active" role="listitem" data-after-help-count={qualifiedSummary.afterHelp}><b>{qualifiedSummary.afterHelp}</b><span>Solved independently after help</span></div>}
        <div className="stat active" role="listitem"><b>{sum.developing}</b><span>Learning</span></div>
        <div className="stat not_started" role="listitem"><b>{sum.notStarted}</b><span>Not started</span></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>Year progress: {Math.round(sum.progress * 100)}% of this year's skills shown on your own or verified</p>
      <span className="bar" role="progressbar" aria-label="Year progress" aria-valuenow={Math.round(sum.progress * 100)}><span style={{ width: `${Math.round(sum.progress * 100)}%` }} /></span>
      <ul className="legend" aria-label="What the colours mean">
        <li><span className="swatch verified" /><Icon glyph="✓" /> Verified (checked again after a week)</li>
        <li><span className="swatch shown" /><Icon glyph="★" /> Shown on your own</li>
        <li><span className="swatch active" /><Icon glyph="◐" /> Learning</li>
        <li><span className="swatch not_started" /><Icon glyph="○" /> Not started</li>
      </ul>
      <div className="actions year-actions">
        {events && (() => { const last=[...events].reverse().find((e:any)=>e.record==='topic_session'&&e.academicYear===st.enrolment?.academicYear&&e.curriculum?.id===release.id&&e.curriculum?.hash===release.hash) as Extract<LearningRecord,{record:'topic_session'}>|undefined;return last?<a className="primary" href={`/year/?learner=${encodeURIComponent(learner)}&skill=${encodeURIComponent(last.target)}&diagnostic=topic`}>Resume topic session</a>:null;})()}
        <a className="primary" href={`/curriculum/?learner=${encodeURIComponent(learner)}&view=learner`}>Open Mathematics topics</a>
        <a className="secondary" href={`/curriculum/?preview=1#b=${release.id.startsWith("tn-") ? "tn" : release.id.startsWith("icse-") ? "icse" : "cbse"}&g=${grade}`}>Preview Mathematics experience</a>
        <button className="link" onClick={() => setView({ name: "setup", sameYear: true })}>Change board or curriculum</button>
        {!DEVICE_BUILD && <button className="link" onClick={() => setView({ name: "parent" })}>For parents{isGuest(accountEmail) ? " · keep progress safe" : ""}</button>}
      </div>
      </section>
      <WrittenWork records={st.records} learner={learner} />
      {/* recovery-handoff@0 hook (worker D, research build only; hidden when the server switch is off) */}
      {DEEP && <RecoveryAnswersPermission learner={learner} />}
      <div className="section-title"><h2>Your years</h2></div>
      <div className="actions">
        <button className="secondary" onClick={() => setView({ name: "years" })}>Earlier years</button>
        <button className="secondary" onClick={() => setView({ name: "setup" })}>Start the next year</button>
      </div>
    </Shell>
  );
}

/** keyboard-offer@1: drawn tasks of this topic are not offered with keyboard input; when only they are left, the topic says so
 *  (never a trap: the learner goes back and other topics are open). Nothing is hidden from the records. */
function KeyboardNote({ competency, ctx }: { competency: string; ctx: Ctx }) {
  const ids = withheldDrawings.get(competency);
  if (!ids?.length) return null;
  const ev = ctx.evidence(competency);
  const ms = ctx.module ? ctx.module(competency) : moduleState(competency, ctx.records, ev, ctx.now, ctx.session, null, ctx.evidence);
  const ended = ms.phase === "done" && !["independent", "transfer", "verified"].includes(ev.status);
  const n = ids.length;
  return (
    <p className={ended ? "why" : "small muted"} role="note" data-keyboard-offer={ended ? "ended" : "withheld"}>
      {ended ? KEYBOARD_UNAVAILABLE : `${n} drawing or construction task${n === 1 ? " is" : "s are"} not available with keyboard input, so ${n === 1 ? "it is" : "they are"} left out of this topic.`}
    </p>
  );
}

/** written@1: written answers waiting for an educator, the marks given, and the parent's choice of who marks. */
function WrittenWork({ records, learner }: { records: ReturnType<typeof learnerState>["records"]; learner: string }) {
  const marked = records.attempts.filter((a) => a.written);
  const [shares, setShares] = useState<{ email: string }[] | null>(null);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    api.request<{ shares: { email: string }[] }>("GET", `/pupils/${learner}/marking-share/`).then((r) => setShares(r.shares)).catch(() => setShares([]));
  }, [learner]);
  if (!records.pending.length && !marked.length && !shares?.length) return null;
  return (
    <section aria-label="Written work">
      <div className="section-title"><h2>Written work</h2></div>
      <p className="muted small">Proofs, constructions and explanations are read and marked by an educator, never by the computer. An answer counts only once it is marked correct.</p>
      <p className="small" role="status" data-written-waiting={records.pending.length}>
        {records.pending.length ? `${records.pending.length} answer${records.pending.length === 1 ? " is" : "s are"} waiting for an educator. ` : "Nothing is waiting for an educator. "}
        {shares?.length ? <>Your educator marks them by signing in at <a href="/review/#marking">{location.origin}/review/#marking</a> (Content review → Marking).</> : "Share written work with an educator below; they mark it by signing in to Content review → Marking."}
      </p>
      {records.pending.map((p) => (
        <div key={p.id} className="panel"><p className="eyebrow">Waiting for an educator · {graph.get(p.competency).name}</p>{isDrawing(p.text) ? <SketchView raw={p.text} canvas={writtenTask(p.questionId)?.canvas} /> : <p className="small">{p.text.slice(0, 280)}{p.text.length > 280 ? "…" : ""}</p>}</div>
      ))}
      {marked.map((a) => (
        <div key={a.id} className={`feedback ${a.written!.mark.verdict === "correct" ? "good" : "bad"}`} role="note">
          <strong>{a.written!.mark.verdict === "correct" ? "Marked correct" : a.written!.mark.verdict === "partial" ? "Partly correct" : "Not yet correct"} · {a.written!.mark.score}/{a.written!.mark.outOf}</strong>
          <p>{a.written!.mark.feedback}</p>
          <p className="small muted">{graph.get(a.competency).name} · marked by an educator</p>
        </div>
      ))}
      <details className="panel">
        <summary>Who marks written work</summary>
        <p className="small">Written answers are shown only to the educators you choose (under a pseudonym). {shares?.length ? `Shared with: ${shares.map((s) => s.email).join(", ")}.` : "Not shared with anyone yet."}</p>
        <label className="field">Educator's email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off" /></label>
        <div className="actions">
          <button className="secondary" disabled={!email.trim()} onClick={async () => {
            try {
              await api.request("POST", `/pupils/${learner}/marking-share/`, { email });
              setShares([...(shares ?? []), { email }]);
              setMsg("Shared."); setEmail("");
            } catch (e) {
              setMsg(String((e as Error).message ?? e));
            }
          }}>Share written work</button>
          {shares?.map((s) => <button key={s.email} className="link" onClick={async () => { await api.request("DELETE", `/pupils/${learner}/marking-share/`, { email: s.email }); setShares(shares.filter((x) => x.email !== s.email)); }}>Stop sharing with {s.email}</button>)}
        </div>
        {msg && <p className="small" role="status">{msg}</p>}
      </details>
    </section>
  );
}

function TileGrid({ tiles, onOpen }: { tiles: Tile[]; onOpen: (t: Tile) => void }) {
  return (
    <div className="tiles">
      {tiles.map((t) => (
        <button key={t.id} className={`tile ${t.kind === "proposal" || t.kind === "unsupported" ? "proposal" : t.status}`} data-status={t.status} data-kind={t.kind} disabled={t.kind === "proposal" || t.kind === "unsupported"} onClick={() => onOpen(t)} aria-label={`${t.title}: ${t.label}${t.progress.total ? `, ${t.progress.done} of ${t.progress.total}` : ""}${t.content && t.content.level !== "module" ? `, ${t.content.label}` : ""}`}>
          {t.goalRefs.length > 0 && <span className="goal-mark">Goal</span>}
          {t.kind !== "skill" && t.kind !== "micro" && t.kind !== "proposal" && t.kind !== "unsupported" && <span className="tile-kind">{KIND_WORD[t.kind]}</span>}
          <span className="tile-title">{t.title}</span>
          {t.subtitle && <span className="tile-sub">{t.subtitle}</span>}
          {t.content?.level === "partial" && <span className="tile-sub">Some content: not a full module yet</span>}
          {t.progress.total > 0 && <span className="tbar" aria-hidden="true"><span style={{ width: `${(100 * t.progress.done) / t.progress.total}%` }} /></span>}
          <span className="tile-status"><span className="tile-icon" aria-hidden="true"><Icon glyph={t.icon} /></span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

function TileDetail({ t, ev, onStart }: { t: Tile; ev: Ctx["evidence"]; onStart?: () => void }) {
  const e = t.competency ? ev(t.competency) : null;
  return (
    <div className="stack">
      <p className="eyebrow">{KIND_WORD[t.kind]}</p>
      <h1 style={{ margin: 0 }}>{t.title}</h1>
      <div className="year-meta">
        <span className="chip"><Icon glyph={t.icon} /> {t.label}</span>
        {t.progress.total > 0 && <span className="chip">{t.progress.done} of {t.progress.total}{t.children.length ? "" : " milestones"}</span>}
        {t.goalRefs.map((g) => <span key={g} className="chip">Goal: {goalById(g)?.name}</span>)}
      </div>
      {t.objectives.length > 0 && <ul className="plain">{t.objectives.map((o) => <li key={o}>{o}</li>)}</ul>}
      {e && (
        <div className="facts">
          <div className="fact"><b>{e.independent.right} / {e.independent.total}</b>right on your own</div>
          <div className="fact"><b>{e.assisted.right} / {e.assisted.total}</b>right with help</div>
          <div className="fact"><b>{(t as Tile & { afterHelp?: AfterHelp }).afterHelp?.label ?? STATUS_WORD[e.status]}</b>status</div>
          {(t as Tile & { afterHelp?: AfterHelp }).afterHelp && <p className="small muted" data-after-help={(t as Tile & { afterHelp?: AfterHelp }).afterHelp!.kind}>{(t as Tile & { afterHelp?: AfterHelp }).afterHelp!.note}</p>}
          <div className="fact"><b>{delayedCheckFact(e, Intl.DateTimeFormat().resolvedOptions().timeZone).text}</b>delayed check</div>
        </div>
      )}
      {t.strategies.length > 0 && <p className="small muted">Ways it can be explained: {t.strategies.join(" · ")}</p>}
      {t.content && (t.kind === "skill" || t.kind === "micro") && (
        <p className="small" data-content={t.content.level}>
          <b>{t.content.label}.</b>{t.content.level === "partial" ? ` Missing: ${t.content.missing.join("; ")}.` : ""}{t.content.review ? ` ${t.content.review}.` : ""}
          {t.content.origin === "synthesised" ? " Questions generated from a checked problem family; teaching text written for OpenPath." : ""}
        </p>
      )}
      {t.alternatives && t.alternatives.length > 0 && <p className="small muted">Another way to think about it: {t.alternatives.join(" · ")}</p>}
      {t.enrichment && t.enrichment.length > 0 && <p className="small muted">Where it leads: {t.enrichment.join(" · ")}</p>}
      {t.curriculumRefs[0] && <p className="ref">{t.curriculumRefs[0].textbook}{t.curriculumRefs[0].chapter ? ` · ${t.curriculumRefs[0].chapter}` : ""}{t.curriculumRefs[0].pages ? ` · pp. ${t.curriculumRefs[0].pages}` : ""}</p>}
      {onStart && t.assessable && <button className="primary" onClick={onStart}>{e && e.status !== "not_started" ? "Continue" : "Start"}</button>}
      {t.kind === "micro" && t.competency && <p className="muted small">Practised inside {graph.get(graph.evidenceTarget(t.competency)).name.toLowerCase()}: its questions on this step count here.</p>}
      {!onStart && t.kind === "skill" && <p className="muted small">No learning content for this skill yet. It is part of your curriculum, so it stays on your map.</p>}
    </div>
  );
}

/** Reuse validated tile metadata here; full question-pool audits belong to coverage tooling. */
function CoverageCard({ release, learner }: { release: CurriculumRelease; learner: string }) {
  const rows = [...new Set(assigned(release).map(a => a.competency))].map(id => ({ id, content: contentOf(id) }));
  const complete = rows.filter(r => r.content.level === "module").length;
  const missing = rows.filter(r => r.content.level === "none");
  return <details className="panel coverage" style={{ marginTop: 16 }}>
    <summary><b>What OpenPath can teach from this textbook</b> <span className="small muted">{complete} of {rows.length} mapped skills have content in a learning module</span></summary>
    <p>Modules and teaching completeness are different. Some explanations, methods or practice may still be missing. Existing educator-review labels remain visible in each lesson.</p>
    {missing.length > 0 && <p className="small">No learning content yet: {missing.map(r => graph.get(r.id).name).join(", ")}.</p>}
    <a href={`/curriculum/?learner=${encodeURIComponent(learner)}&view=learner`}>View chapters and available teaching</a>
    <p className="small muted">These are counts of available content, not of learning or verified mastery.</p>
  </details>;
}

function ExamPlanCard({ goalId, ev }: { goalId: string; ev: Ctx["evidence"] }) {
  const [target, setTarget] = useState<0.6 | 0.75 | 0.9>(0.75);
  const [weeks, setWeeks] = useState(40);
  const plan = examPlan(goalId, ev, weeks, target)!;
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Exam plan</h3>
      <div className="actions" role="radiogroup" aria-label="Time left">
        {([[40, "Months away"], [8, "Last 8 weeks"]] as const).map(([w, label]) => <button key={w} role="radio" aria-checked={weeks === w} className={weeks === w ? "primary" : "secondary"} onClick={() => setWeeks(w)}>{label}</button>)}
      </div>
      <div className="actions" role="radiogroup" aria-label="Target" style={{ marginTop: 8 }}>
        {([0.6, 0.75, 0.9] as const).map((t) => <button key={t} role="radio" aria-checked={t === target} className={t === target ? "primary" : "secondary"} onClick={() => setTarget(t)}>{Math.round(t * 100)}%</button>)}
      </div>
      <p>{plan.advice}</p>
      <p>Rough estimate from your own answers: {plan.estimate.low}–{plan.estimate.high}% of the marks. {plan.onTrack ? "On track for this target." : "Below this target so far."}</p>
      <ol className="plain">{plan.priorities.slice(0, 3).map((p) => <li key={p.topic}><b>{p.topic}</b> · weight {Math.round(p.weight[0] * 100)}–{Math.round(p.weight[1] * 100)}% · {p.attempt ? "worth attempting" : "skip unless sure (negative marking)"}</li>)}</ol>
      <p className="small"><b>The paper ({plan.goal.exam.pattern}):</b> {plan.sections.map((sec) => `${sec.questions} ${sec.format === "numerical" ? "numerical" : sec.format === "mcq-multiple" ? "multiple-correct" : sec.format === "mixed" ? "mixed-format" : "single-correct"} (+${sec.marking.correct}/${sec.marking.wrong}${sec.marking.partialPerOption ? ", partial marks" : ""}${sec.rule.breakEven ? `; guess only if your chance is above ${Math.round(sec.rule.breakEven * 100)}%` : "; always answer"})${sec.disputed ? ` [${sec.disputed}]` : ""}`).join(" · ")}</p>
      <p className="small muted">{plan.caveat}</p>
    </div>
  );
}

/** word-reader@1: how a typed word problem was read by the language reader on the server (never the answer). */
interface WordReading { original: string; reading: string; unit: string }
function StuckBox({ onOpen, onWorked, grade }: { onOpen: (qid: string) => void; onWorked: (text: string, read?: WordReading) => void; grade?: number }) {
  const [text, setText] = useState("");
  const [why, setWhy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // whether this site reads word problems, and how many of today's are left (never in a device build: there is no server)
  const [words, setWords] = useState<{ available: boolean; limit: number; left: number } | null>(null);
  useEffect(() => { if (!DEVICE_BUILD) api.request<{ available: boolean; limit: number; left: number }>("GET", "/solver/read/").then(setWords).catch(() => setWords(null)); }, []);
  async function readWords(typed: string, fallback: string) {
    setBusy(true);
    try {
      const r = await api.request<{ calculation?: string; reading?: string; unit?: string; cannot?: string; left: number }>("POST", "/solver/read/", { text: typed });
      setWords((w) => (w ? { ...w, left: r.left } : w));
      // the reading is used only if OpenPath's own solver can work the calculation and check it
      if (r.calculation && r.reading && solve(r.calculation).ok) { setWhy(null); onWorked(r.calculation, { original: typed, reading: r.reading, unit: r.unit ?? "" }); }
      else setWhy(r.cannot ?? "OpenPath could not read this one. Try typing just the calculation.");
    } catch (er) {
      setWhy(/used|resting/.test(String((er as Error).message)) ? String((er as Error).message) : fallback);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      const p = readProblem(text);
      if (p.supported) {
        setWhy(null);
        onOpen(p.problem.id);
        return;
      }
      // general-solver@1: no lesson of ours matches, so the calculation itself is worked, one move at a time
      const s = solve(text);
      if (s.ok) { setWhy(null); onWorked(text); }
      else if (s.words && words?.available && !busy) { setWhy(null); void readWords(text.trim(), s.reason); }
      else setWhy(s.reason);
    }}>
      <label className="field">The problem<input aria-label="The problem" value={text} onChange={(e) => setText(e.target.value)} placeholder={grade && grade <= 5 ? "e.g. 3/4 + 1/8, or 15% of 200" : grade && grade <= 8 ? "e.g. 2x + 1 = 7, or 3/4 + 1/8" : "e.g. x² − 10x − 24 = 0, or ∫ from 2 to 9 of 6 dx"} /></label>
      <p className="small muted">Type the calculation or equation, like 23 × 14 or 5/6 − 1/4. {words?.available ? `A word problem is read by an AI helper: only the words you type are sent to it. ${words.left} of ${words.limit} left today.` : "Word problems are not read yet."}</p>
      <details className="type-examples">
        <summary>What else can I type?</summary>
        <ul>
          <li>HCF and LCM of 24 and 36 · factors of 36 · prime factors of 84</li>
          <li>3.5 km in m · 2 h 30 min in minutes</li>
          <li>area of a rectangle 7 cm by 6 cm · perimeter of a square of side 5 m</li>
          <li>12:18 · divide ₹600 in the ratio 2:3</li>
          <li>simple interest on ₹5000 at 8% for 3 years</li>
          <li>2:45 pm + 1 h 30 min · from 9:15 am to 2:40 pm</li>
        </ul>
      </details>
      {why && <p className="feedback bad" role="status"><b>OpenPath can’t work through this one yet.</b> {why}</p>}
      <button className="secondary" disabled={!text.trim() || busy}>{busy ? "Reading your problem…" : "Work through it"}</button>
    </form>
  );
}

/** today-plan@1: the day's goal (questions answered today, of DAILY_GOAL) and the run of days. Counts only; the goal is a
 *  number of questions tried, never a number right, so a hard day still counts. */
const DAILY_GOAL = 10;
function TodayStrip({ st, now }: { st: NonNullable<ReturnType<typeof learnerState>>; now: number }) {
  const r = useMemo(() => parentReport({ attempts: st.records.attempts, teaching: st.records.teaching }, rightAnswer, (c) => c, now), [st, now]);
  const done = Math.min(r.today.answered, DAILY_GOAL), reached = r.today.answered >= DAILY_GOAL;
  return (
    <section className="today" aria-label="Today">
      <div className="today-row">
        <h2>Today</h2>
        <span className="today-streak" data-streak={r.streak}>{r.streak >= 2 ? `🔥 ${r.streak} days in a row` : r.streak === 1 ? (r.today.answered ? "🔥 Day 1 of a new run" : "🔥 1 day so far: keep it going") : "Start a run of days today"}</span>
      </div>
      <p className="today-goal">{reached ? <><b>Goal reached:</b> {r.today.answered} questions today. Anything more is a bonus.</> : <><b>{done} of {DAILY_GOAL}</b> questions today</>}</p>
      <span className="bar today-bar" role="progressbar" aria-label="Today's goal" aria-valuemin={0} aria-valuemax={DAILY_GOAL} aria-valuenow={done}><span style={{ width: `${(done / DAILY_GOAL) * 100}%` }} /></span>
    </section>
  );
}

/** an account made by name-start@1 for this browser only (its address is made up, in this domain) */
const isGuest = (email: string) => email.endsWith("@guest.openpath.example");

/** keep-safe@1: a name-only learner's progress is tied to this browser. Here the parent gives the account a real email and
 *  a password, so it can be opened anywhere and survives cleared browser data. */
function KeepSafe({ onDone }: { onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  return (
    <form className="stack keep-safe" onSubmit={(e) => {
      e.preventDefault();
      setBusy(true);
      setProblem("");
      api.request("POST", "/account/claim/", { email, password }).then(() => { try { localStorage.removeItem(GUEST_KEY); } catch { /* the key no longer opens anything */ } onDone(email.trim().toLowerCase()); }).catch((er) => setProblem(String(er.message ?? er))).finally(() => setBusy(false));
    }}>
      <h2>Keep this progress safe</h2>
      <p className="muted">Right now the progress is saved for this phone and browser only. If the browser's data is cleared or the phone changes, it cannot be opened again. Add your email and a password to keep it.</p>
      <label className="field">Your email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field">Choose a password<input type="password" autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <p className="muted small">At least 10 characters. Write it down: this site cannot email a reset link yet.</p>
      {problem && <p className="feedback bad" role="alert">{problem}</p>}
      <button className="primary" disabled={busy}>{busy ? "Saving…" : "Keep it safe"}</button>
    </form>
  );
}

/** parent-view@1: what the learner did, in counts (packages/learning/src/parent-report.ts). Nothing is estimated. */
function ParentView({ name, learner, st, guest, onClaimed, now }: { name: string; learner: string; st: ReturnType<typeof learnerState> | null; guest: boolean; onClaimed: () => void; now: number }) {
  // kept here, not in the form: once the account has an email the form is gone, and the confirmation must stay
  const [savedAs, setSavedAs] = useState("");
  const [period, setPeriod] = useState<Period>("week");
  const skillName = (c: string) => { try { return graph.get(c).name; } catch { return c; } };
  const topicOf = (c: string) => { try { return topicName(c, graph.get(c).strand); } catch { return "Other"; } };
  const report = useMemo(() => (st ? parentReport({ attempts: st.records.attempts, teaching: st.records.teaching }, rightAnswer, skillName, now) : null), [st, now]);
  const profile = useMemo(() => (st ? competencyProfile(st.records.attempts, rightAnswer, topicOf, skillName, period, now) : null), [st, now, period]);
  if (!report || !profile || !st) return <p className="muted center">Opening…</p>;
  const sum = st.summary;
  const most = Math.max(1, ...profile.calendar.map((d) => d.answered));
  const ago = (iso: string) => { const d = Math.floor((now - Date.parse(iso)) / 86_400_000); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
  const pct = (v: number | null) => (v === null ? "not enough yet" : `${Math.round(v * 100)}%`);
  const secs = (v: number | null) => (v === null ? null : v < 60 ? `${Math.round(v)} s` : `${Math.floor(v / 60)} min ${Math.round(v % 60)} s`);
  const WORD: Record<Period, string> = { week: "this week", month: "in the last 30 days", year: `in ${new Date(now).getFullYear()}` };
  const f = profile.findings;
  const paceWord = (t: TopicMeasure) => (t.pace === "quick" ? "quicker than their usual" : t.pace === "slow" ? "takes longer than their usual" : t.pace === "steady" ? "about their usual pace" : null);
  return (
    <div className="stack parent-view">
      <p className="eyebrow">For parents</p>
      <h1>{name}'s Maths</h1>
      {report.lastActive ? <p className="muted">Last worked {ago(report.lastActive)}{report.streak >= 2 ? ` · ${report.streak} days in a row` : ""}.</p> : <p className="muted">{name} has not answered a question yet. Once they do, this page shows what they did.</p>}
      <div className="period-tabs" role="tablist" aria-label="Period">
        {(["week", "month", "year"] as Period[]).map((p) => <button key={p} type="button" role="tab" aria-selected={period === p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p === "week" ? "Week" : p === "month" ? "Month" : "Year"}</button>)}
      </div>
      <div className="stats" role="list" aria-label={`Counts ${WORD[period]}`}>
        <div className="stat" role="listitem"><b>{profile.answered}</b><span>Questions</span></div>
        <div className="stat" role="listitem"><b>{profile.rightFirstTry}</b><span>Right at the first try</span></div>
        <div className="stat" role="listitem"><b>{profile.activeDays}</b><span>Days worked</span></div>
        <div className="stat" role="listitem"><b>{profile.minutes === null ? "–" : profile.minutes}</b><span>Minutes on questions</span></div>
      </div>
      <div className={`cal cal-${period}`} role="img" aria-label={`Questions ${WORD[period]}: ${profile.calendar.filter((d) => d.answered).map((d) => `${d.label} ${d.answered}`).join(", ") || "none"}`}>
        {profile.calendar.map((d) => period === "month"
          ? <span key={d.key} className="cal-cell" data-level={d.answered === 0 ? 0 : Math.min(4, 1 + Math.floor((d.answered / most) * 3.999))} title={`${d.key}: ${d.answered}`}>{d.label}</span>
          : <div key={d.key} className="week-bar"><span className="week-count">{d.answered || ""}</span><span className="week-fill" style={{ height: `${Math.round((d.answered / most) * 56) + (d.answered ? 4 : 2)}px` }} /><span className="week-label">{d.label}</span></div>)}
      </div>
      {profile.answered > 0 && (
        <section aria-label="What the answers show">
          <h2>What the answers show {WORD[period]}</h2>
          <ul className="findings">
            {f.quickest && <li><span aria-hidden="true">⚡</span><span><b>Quickest in {f.quickest.topic}:</b> about {secs(f.quickest.paceSeconds)} a question, against their usual {secs(profile.paceSeconds)}.</span></li>}
            {f.mostAccurate && <li><span aria-hidden="true">🎯</span><span><b>Most accurate in {f.mostAccurate.topic}:</b> {pct(f.mostAccurate.accuracy)} right at the first try ({f.mostAccurate.rightFirstTry} of {f.mostAccurate.answered}).</span></li>}
            {f.mostPractised && <li><span aria-hidden="true">📚</span><span><b>Most practised: {f.mostPractised.topic}</b> ({f.mostPractised.answered} questions).</span></li>}
            {f.stuck.length > 0 && <li><span aria-hidden="true">🧩</span><span><b>Stuck on:</b> {f.stuck.map((x) => x.skill).join("; ")}. Fewer than half right at the first try, or the full solution opened more than once. Sitting together for the next lesson on these usually helps.</span></li>}
            {!f.quickest && !f.mostAccurate && !f.mostPractised && !f.stuck.length && <li><span aria-hidden="true">⏳</span><span>Not enough answers yet to say where {name} is strongest. This fills in after about five questions in two or more topics.</span></li>}
          </ul>
        </section>
      )}
      {profile.topics.length > 0 && (
        <section aria-label="By topic">
          <h2>By topic</h2>
          <ul className="topic-rows">
            {profile.topics.map((t) => (
              <li key={t.topic}>
                <div className="topic-head"><b>{t.topic}</b><span className="muted small">{t.answered} question{t.answered === 1 ? "" : "s"} · {t.skills} skill{t.skills === 1 ? "" : "s"}</span></div>
                <div className="measure"><span>Right at the first try</span><span className="bar"><span style={{ width: `${Math.round((t.accuracy ?? 0) * 100)}%` }} /></span><span>{pct(t.accuracy)}</span></div>
                <div className="measure"><span>Without help</span><span className="bar"><span style={{ width: `${Math.round((t.independence ?? 0) * 100)}%` }} /></span><span>{pct(t.independence)}</span></div>
                <p className="small muted">{t.paceSeconds === null ? "Pace: not enough timed answers yet." : `Pace: about ${secs(t.paceSeconds)} a question${paceWord(t) ? ` (${paceWord(t)})` : ""}.`}{t.stuck.length ? ` Stuck on: ${t.stuck.join("; ")}.` : ""}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="The year so far">
        <h2>The school year so far</h2>
        {sum ? <p>{sum.verified} skill{sum.verified === 1 ? "" : "s"} checked again a week later and still right · {sum.shown} shown on their own · {sum.developing} being learned · {sum.notStarted} not started.</p> : <p className="muted">No school year has been set up yet.</p>}
      </section>
      <details className="type-examples">
        <summary>How to read this page</summary>
        <ul>
          <li>Everything here is counted from {name}'s own answers in OpenPath. Nothing is estimated or predicted.</li>
          <li>"Quicker" and "takes longer" compare {name} only with their own pace in other topics, never with other children.</li>
          <li>Pace is the middle time for questions answered right at the first try. Timing began on 13 November 2026, so earlier answers have none, and it includes reading the question.</li>
          <li>A measure appears only after five answers; before that it says "not enough yet".</li>
          <li>A skill is called checked only after it is answered correctly again at least a week later. The lessons are machine-checked for correctness and have not been reviewed by a teacher.</li>
        </ul>
      </details>
      {savedAs && <p className="feedback good" role="status"><b>Saved.</b> Sign in with {savedAs} on any phone or computer to see the same progress. Keep the password somewhere safe: this site cannot email a reset link yet.</p>}
      {guest ? <KeepSafe onDone={(email) => { setSavedAs(email); onClaimed(); }} /> : <p className="muted small">This progress is saved in your account and opens on any device you sign in on. <a className="link" href={`/api/pupils/${encodeURIComponent(learner)}/export/`} download={`openpath-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`}>Download a copy</a></p>}
    </div>
  );
}

/** general-solver@1: a typed calculation worked one move at a time. Nothing here is recorded: it is a calculator that shows
 *  its working, not a lesson and not evidence about the learner. The learner may try first; the steps open one by one. */
function Worked({ text, read, onExit }: { text: string; read?: WordReading; onExit: () => void }) {
  const solved = useMemo(() => solve(text), [text]);
  const [shown, setShown] = useState(0);
  const [mine, setMine] = useState("");
  const [verdict, setVerdict] = useState<boolean | null | undefined>(undefined);
  if (!solved.ok) return <div className="stack"><p className="feedback bad" role="status">{solved.reason}</p><button className="secondary" onClick={onExit}>Back</button></div>;
  const all = shown >= solved.steps.length;
  return (
    <div className="stack worked">
      <p className="eyebrow">Your problem</p>
      {read ? (
        <>
          <p className="worked-words">{read.original}</p>
          <div className="worked-reading" role="note">
            <span className="eyebrow">How OpenPath read it</span>
            <p>{read.reading}</p>
            <h1 className="worked-problem">{solved.problem}</h1>
            <p className="muted small">Check this matches your problem. If it does not, go back and type the calculation yourself.</p>
          </div>
        </>
      ) : <h1 className="worked-problem">{solved.problem}</h1>}
      {!all && (
        <form className="worked-try" onSubmit={(e) => { e.preventDefault(); setVerdict(sameAnswer(solved, mine)); }}>
          <label className="field">Try it first (optional)<input aria-label="Your answer" value={mine} inputMode="text" autoComplete="off" onChange={(e) => { setMine(e.target.value); setVerdict(undefined); }} placeholder="Your answer" /></label>
          <button className="secondary" disabled={!mine.trim()}>Check</button>
        </form>
      )}
      {verdict === true && <p className="feedback good" role="status"><b>That is right.</b> You can still open the steps to compare your working.</p>}
      {verdict === false && <p className="feedback bad" role="status"><b>Not yet.</b> Try again, or open the steps one at a time.</p>}
      {verdict === null && <p className="feedback" role="status">OpenPath could not read that answer. Type a number or a fraction, like 7/12.</p>}
      <ol className="worked-steps" aria-label="Working">
        {solved.steps.slice(0, shown).map((st, i) => (
          <li key={i}><span className="worked-line">{solved.kind === "arithmetic" ? "= " : ""}{st.expression}</span><span className="worked-why">{st.explanation}</span>{st.layout && <pre className="worked-columns" aria-label="Written in columns">{st.layout.join("\n")}</pre>}</li>
        ))}
      </ol>
      {all ? (
        <div className="worked-answer" role="status"><span className="eyebrow">Answer</span><strong>{solved.answer}{read?.unit && solved.kind !== "units" ? ` ${read.unit}` : ""}</strong>{solved.also.map((a) => <span key={a} className="muted">{/^[≈A-Z]|=/.test(a) ? a : `= ${a}`}</span>)}</div>
      ) : (
        <button className="primary" onClick={() => setShown(shown + 1)}>{shown === 0 ? "Show the first step" : shown === solved.steps.length - 1 ? "Show the last step" : "Show the next step"}</button>
      )}
      <p className="muted small">{read ? "The words were read by an AI helper, which can misread. The working and the answer are OpenPath's own calculator, checked line by line. " : "Worked by OpenPath's calculator and checked by it line by line. "}It is not one of OpenPath's lessons, and nothing here is saved or counted.</p>
      <button className="secondary" onClick={onExit}>{all ? "Done" : "Back"}</button>
    </div>
  );
}

/** simple-setup@1: the boards OpenPath has a curriculum for, and the grades each one covers. */
const boardOf = (r: CurriculumRelease) => r.source.board ?? "Another textbook";
const boardLabel = (b: string) => b.replace(/\s*\(.*\)\s*$/, "");
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
/** a real board's own curriculum (mapped from its curriculum inventory); the sample books stay under "More options" */
const realBoard = (r: CurriculumRelease) => (r.source as { synthetic?: boolean }).synthetic === false && !!r.source.board;
const ALL_BOARDS = [...new Set(GRADES.flatMap((g) => releasesFor(g).filter(realBoard).map(boardOf)))].sort((a, b) => boardLabel(a).localeCompare(boardLabel(b)));
const gradesOf = (board: string) => (board ? GRADES.filter((g) => releasesFor(g).some((r) => realBoard(r) && boardOf(r) === board)) : []);
/** The detailed choices start closed. Test builds keep them open: the browser journeys written before simple-setup@1 use them. */
const MORE_OPTIONS_OPEN = typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE === true;

function Setup({ current, sameYear = false, currentYear, goals: active, saving, onSave }: { current: number | null; sameYear?: boolean; currentYear?: string; goals: string[]; saving: boolean; onSave: (grade: number, r: CurriculumRelease, saveRelease: boolean, goal: string | null, year: string) => void }) {
  const [grade, setGrade] = useState<number | null>(current ? sameYear ? current : Math.min(current + 1, 12) : null);
  const [year, setYear] = useState(sameYear && currentYear ? currentYear : academicYear(new Date(), current ? 1 : 0));
  const [board, setBoard] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Set<string>>(new Set(["Mathematics"]));
  const [mode, setMode] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<CurriculumRelease | null>(null);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [goal, setGoal] = useState<string | null>(active[0] ?? null);
  const [problem, setProblem] = useState("");
  const [quickBoard, setQuickBoard] = useState("");
  const [quickGrade, setQuickGrade] = useState<number | null>(current ? (sameYear ? current : Math.min(current + 1, 12)) : null);
  // the board's own curriculum for the grade
  const quickRelease = quickBoard && quickGrade ? (releasesFor(quickGrade).find((r) => realBoard(r) && boardOf(r) === quickBoard) ?? null) : null;
  const sample = grade ? sampleFor(grade) : null;
  const outcomes = draft ? allOutcomesOf(draft).map(({ chapter, sections, outcome }) => ({ c: chapter, where: [chapter.title, ...sections.map((x) => x.title)].join(" › "), o: outcome })) : [];
  const finish = (r: CurriculumRelease, own: boolean) => onSave(grade!, r, own, goal, year);
  const boards = grade ? [...new Set(releasesFor(grade).map((r) => r.source.board ?? "Another textbook"))] : [];
  const shown = grade ? releasesFor(grade).filter((r) => !board || (r.source.board ?? "Another textbook") === board) : [];
  const unsupportedDraft = draft ? draft.subjects.find((s) => s.supported === false) : null;
  const read = (doc: Parameters<typeof synthesise>[0]) => {
    const d = synthesise(doc);
    if (d.grade !== grade) throw new Error(`This textbook says Grade ${d.grade}; Grade ${grade} is chosen.`);
    setDraft(d);
    // a clear match is ticked for you to confirm; an uncertain one is left for you to choose
    setPicked(Object.fromEntries(allOutcomesOf(d).map(({ outcome: o }) => [o.id, new Set(o.mapping.verdict === "clear" ? o.mapping.competencies.slice(0, 1).map((m) => m.id) : [])])));
    setProblem("");
  };
  return (
    <div className="stack">
      <h1>{sameYear ? "Choose your curriculum" : current ? "Start the next year" : "Set up My Learning Year"}</h1>
      {current && <p className="muted">Every record from Grade {current} is kept. Skills you have shown stay shown.</p>}
      {/* simple-setup@1: two questions and one button. Everything else keeps its default and stays under "More options". */}
      <div className="stack simple-setup">
        <label className="field" htmlFor="setup-board">Board
          <select id="setup-board" value={quickBoard} onChange={(e) => { setQuickBoard(e.target.value); if (quickGrade && !gradesOf(e.target.value).includes(quickGrade)) setQuickGrade(null); }}>
            <option value="">Choose a board</option>
            {ALL_BOARDS.map((b) => <option key={b} value={b}>{boardLabel(b)}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="setup-grade">Grade
          <select id="setup-grade" value={quickGrade ?? ""} disabled={!quickBoard} onChange={(e) => setQuickGrade(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{quickBoard ? "Choose a grade" : "Choose a board first"}</option>
            {gradesOf(quickBoard).map((g) => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </label>
        {quickRelease && <p className="muted small">{quickRelease.title}</p>}
        <button className="primary" disabled={saving || !quickRelease} onClick={() => quickRelease && onSave(quickGrade!, quickRelease, false, goal, year)}>{saving ? "Saving…" : sameYear ? "Use this board and grade" : "Start learning"}</button>
      </div>
      <details className="more-options" open={MORE_OPTIONS_OPEN}>
      <summary>More options (year, goal, another textbook)</summary>
      <div className="stack">
      <h2>Which grade?</h2>
      <div className="tiles">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
          <button key={g} className={`tile ${grade === g ? "shown" : "not_started"}`} style={{ minHeight: 64 }} aria-pressed={grade === g} onClick={() => { setGrade(g); setMode(null); setDraft(null); }}>
            <span className="tile-title">Grade {g}</span>
            <span className="tile-sub">{sampleFor(g) ? "Sample textbook ready" : "Your textbook"}</span>
          </button>
        ))}
      </div>
      {grade && (
        <>
          <h2>Academic year</h2>
          <div className="actions" role="radiogroup" aria-label="Academic year">
            {[academicYear(new Date(), 0), academicYear(new Date(), 1)].map((y) => <button key={y} role="radio" aria-checked={year === y} className={year === y ? "primary" : "secondary"} onClick={() => setYear(y)}>{y}</button>)}
          </div>
          <h2>Subjects</h2>
          <div className="cards" role="group" aria-label="Subjects">
            {SUBJECTS.map((sj) => {
              const ok = subjectSupported(sj);
              return (
                <label key={sj} className={`card ${subjects.has(sj) ? "accent" : ""} ${ok ? "" : "locked"}`}>
                  <span className="card-title"><input type="checkbox" disabled={!ok} checked={subjects.has(sj)} onChange={(e) => setSubjects((cur) => { const n = new Set(cur); if (e.target.checked) n.add(sj); else n.delete(sj); return n; })} /> {sj}</span>
                  <span className="card-sub">{ok ? "Supported: skill map, modules and evidence" : sj === "English" ? "Not in My Learning Year yet (OpenPath English is separate)" : "Not supported yet: no skill map in OpenPath"}</span>
                </label>
              );
            })}
          </div>
          {!sameYear && <><h2>Long-term goal (optional)</h2>
          <div className="cards">
            {[null, ...goals.map((g) => g.id)].map((g) => (
              <button key={g ?? "none"} className={`card ${goal === g ? "accent" : ""}`} aria-pressed={goal === g} onClick={() => setGoal(g)}>
                <span className="card-title">{g ? goalById(g)!.name : "No goal for now"}</span>
                {g && <span className="card-sub">{grade < 11 ? "Shown as foundations in your own year, and challenges when ready. Nothing from later grades." : "Exam plan with weight ranges and the paper's marking."}</span>}
              </button>
            ))}
          </div>
          </>}
          <h2>Board or curriculum</h2>
          {boards.length > 1 && (
            <div className="actions" role="radiogroup" aria-label="Board">
              {[null, ...boards].map((b) => <button key={b ?? "all"} role="radio" aria-checked={board === b} className={board === b ? "primary" : "secondary"} onClick={() => { setBoard(b); setMode(null); }}>{b ? b.replace(/\s*\(.*\)\s*$/, "") : "All boards"}</button>)}
            </div>
          )}
          <div className="cards">
            {sample && shown.includes(sample) && <button className={`card ${mode === "sample" ? "accent" : ""}`} onClick={() => setMode("sample")}><span className="card-title">{sample.title}</span><span className="card-sub">{sample.source.board ?? "A sample textbook"} · reviewed mapping, not an educator review</span></button>}
            {shown.filter((r) => r.id !== sample?.id).map((r) => <button key={r.id} className={`card ${mode === r.id ? "accent" : ""}`} onClick={() => setMode(r.id)}><span className="card-title">{r.title}</span><span className="card-sub">{r.source.board ?? "Another textbook"} · {(r.source as { synthetic?: boolean }).synthetic === false ? "mapped from the curriculum inventory, not an educator review" : "a sample book (synthetic)"}</span></button>)}
            <button className={`card ${mode === "book" ? "accent" : ""}`} onClick={() => setMode("book")}><span className="card-title">Add my textbook</span><span className="card-sub">Paste its contents, or choose a PDF of its contents pages</span></button>
          </div>
        </>
      )}
      {mode === "sample" && sample && <button className="primary" disabled={saving} onClick={() => finish(sample, false)}>{saving ? "Saving…" : sameYear ? "Use this curriculum" : `Start Grade ${grade}`}</button>}
      {mode && mode !== "sample" && mode !== "book" && grade && <button className="primary" disabled={saving} onClick={() => finish(releasesFor(grade).find((r) => r.id === mode)!, false)}>{saving ? "Saving…" : sameYear ? "Use this curriculum" : `Start Grade ${grade}`}</button>}
      {mode === "book" && !draft && (
        <div className="stack">
          <p className="small muted">Paste the contents pages: chapter headings with pages (units and numbered sections too), and the lists of what learners will be able to do. Or choose a PDF (one with selectable text; scanned pages cannot be read yet).</p>
          <textarea className="book" aria-label="Textbook contents" value={text} onChange={(e) => setText(e.target.value)} />
          <label className="field small">Or a PDF<input type="file" accept="application/pdf" aria-label="Textbook PDF" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              read(await extract({ bytes: new Uint8Array(await f.arrayBuffer()) }));
            } catch (er) {
              setProblem(String((er as Error).message ?? er));
            }
          }} /></label>
          {problem && <p className="error">{problem}</p>}
          <button className="primary" disabled={!text.trim()} onClick={async () => {
            try {
              read(await extract({ text }));
            } catch (er) {
              setProblem(String((er as Error).message ?? er));
            }
          }}>Read the textbook</button>
        </div>
      )}
      {draft && (
        <div className="stack">
          <h2>Check the skills for each outcome</h2>
          <p className="small muted">OpenPath suggests skills from its skill map. Nothing is used until you confirm. An outcome with no match is kept as a proposal with its page reference; it gets no questions.</p>
          <div className="mapping">
            {outcomes.map(({ where, o }) => (
              <div key={o.id} className="outcome">
                <p>{o.text} <span className="ref">({where}{o.pages ? `, p. ${o.pages}` : ""})</span></p>
                {o.mapping.verdict === "uncertain" && <p className="hint small" role="note">Please choose: {o.mapping.why}</p>}
                {o.mapping.competencies.length ? o.mapping.competencies.map((m) => (
                  <label key={m.id}>
                    <input type="checkbox" checked={picked[o.id]?.has(m.id) ?? false} onChange={(e) => setPicked((p) => { const s = new Set(p[o.id]); if (e.target.checked) s.add(m.id); else s.delete(m.id); return { ...p, [o.id]: s }; })} />
                    {graph.get(m.id).name} <span className="ref">({Math.round(m.score * 100)}% match)</span>
                  </label>
                )) : <span className="ref">{o.mapping.verdict === "unsupported" ? "Not supported yet: nothing is mapped." : "No matching skill: kept as a proposal."}</span>}
              </div>
            ))}
          </div>
          {unsupportedDraft && <p className="error" role="alert">{unsupportedDraft.unsupportedReason} {UNSUPPORTED.subjects}</p>}
          <button className="primary" disabled={saving || !!unsupportedDraft} onClick={() => {
            const decisions: ReviewDecision[] = outcomes.map(({ o }) => ({ outcome: o.id, accept: [...(picked[o.id] ?? [])] }));
            finish(review(draft, decisions, "account owner", new Date().toISOString()), true);
          }}>{saving ? "Saving…" : `Use this curriculum for Grade ${grade}`}</button>
        </div>
      )}
      </div>
      </details>
    </div>
  );
}

function Shell({ children, top, error, banner, wide, paper }: { paper?: boolean; children: React.ReactNode; top?: React.ReactNode; error?: string; banner?: React.ReactNode; wide?: boolean }) {
  return (
    <>
      {banner}
      {top}
      <main className={`page ${wide ? "wide" : ""} ${paper ? "year-paper" : ""}`}>
        {error && <p className="error" role="alert">{error}</p>}
        {children}
      </main>
    </>
  );
}

function TopBar({ left, title }: { left: React.ReactNode; title: string }) {
  return (
    <header className="topbar">
      <div className="topbar-row wide">
        <span>{left}</span>
        <strong>{title}</strong>
        <span />
      </div>
    </header>
  );
}

/** name-start@1: a name is enough to begin. The record is still kept on OpenPath's server, under a key made for this
 *  browser (an account with a made-up address and a random password, both kept only in this browser). Lose the browser's
 *  storage and the record cannot be opened again, which the screen says. An email account remains available. */
declare const OPENPATH_NAME_START: boolean;
const NAME_START = typeof OPENPATH_NAME_START !== "undefined" && OPENPATH_NAME_START === true && !DEVICE_BUILD;
const GUEST_KEY = "openpath.guest.v1";
const guestKey = (): { email: string; password: string } | null => { try { const v = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null"); return v && typeof v.email === "string" && typeof v.password === "string" ? v : null; } catch { return null; } };
const randomHex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
/** Signs this browser back in with its own key, if it has one (after a sign-in has run out). */
async function guestSignIn(): Promise<boolean> {
  const key = guestKey();
  if (!key) return false;
  try { await api.login(key.email, key.password); return true; } catch { return false; }
}
function NameStart({ onDone, onError, onAccount }: { onDone: () => void; onError: (e: string) => void; onAccount: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!agree) return onError("Tick the box so OpenPath may keep this learner's progress.");
    setBusy(true);
    onError("");
    try {
      let key = guestKey();
      if (!key) {
        key = { email: `guest-${randomHex(12)}@guest.openpath.example`, password: randomHex(24) };
        // the key is kept before the account exists: an account whose key was not kept could never be opened again
        localStorage.setItem(GUEST_KEY, JSON.stringify(key));
        if (!guestKey()) throw new Error("This browser is not letting OpenPath save anything (a private window, perhaps). Create an account with an email instead.");
        await api.register(key.email, key.password);
      } else await api.login(key.email, key.password);
      await api.createPupil(name.trim());
      onDone();
    } catch (er) {
      onError(String((er as Error).message ?? er));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack" onSubmit={submit}>
      <h1>Who is learning?</h1>
      <label className="field">Name<input id="start-name" value={name} maxLength={60} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="A first name or nickname" /></label>
      <label className="consent-line"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>A parent or guardian agrees that OpenPath keeps this name and the learner's answers on its server. They are not sold or given to anyone else.</span></label>
      <button className="primary" disabled={busy || !name.trim()}>{busy ? "One moment…" : "Start"}</button>
      <p className="muted small">Progress is saved for this phone and browser. To use another device, or to keep it safe if this browser's data is cleared, use an email account.</p>
      <p className="muted center"><button type="button" className="link" onClick={onAccount}>Sign in or create an email account</button></p>
    </form>
  );
}

/** one-account@1: signing in and creating the parent account are both here, so Maths never sends a parent to another app. */
const CONSENT_TEXT = "I am a parent or guardian. I agree that OpenPath keeps my email and my children's learning records on its server, to show their learning to me. OpenPath's developers read a child's record only if I turn on sharing for diagnostics for that child in Me (every look is logged), and the app sends performance measurements that never include answers or names. Records are not sold or given to anyone else, and I can export or delete them at any time.";
function SignIn({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [create, setCreate] = useState(false);
  const [agree, setAgree] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (create && !agree) return onError("Tick the box to agree to how records are kept.");
    setBusy(true);
    onError("");
    (create ? api.register(email, password) : api.login(email, password)).then(onDone).catch((er) => onError(String(er.message ?? er))).finally(() => setBusy(false));
  };
  return (
    <form className="stack" onSubmit={submit}>
      <h1>{create ? "Create your account" : "Sign in to OpenPath"}</h1>
      <p className="muted">{create ? "One account for English and Maths. You add your child next." : "One account for English and Maths."}</p>
      <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field">Password<input type="password" autoComplete={create ? "new-password" : "current-password"} minLength={create ? 10 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {create && <p className="muted small">At least 10 characters.</p>}
      {create && <label className="consent-line"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>{CONSENT_TEXT}</span></label>}
      <button className="primary" disabled={busy}>{busy ? "One moment…" : create ? "Create account" : "Sign in"}</button>
      <p className="muted center"><button type="button" className="link" onClick={() => { setCreate(!create); onError(""); }}>{create ? "I already have an account" : "New here? Create an account"}</button></p>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
