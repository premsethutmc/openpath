import { CurriculumPractice } from "./CurriculumPractice";
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
import { goal as goalById, goals, moduleFor, question, questions } from "../../../packages/learning/src/content";
import { latestReleases, releasesFor, sampleFor } from "../../../packages/learning/src/curricula";
import { allOutcomesOf, assigned, review, subjectSupported, synthesise, type CurriculumRelease, type ReviewDecision } from "../../../packages/learning/src/curriculum";
import { releaseCoverage, UNSUPPORTED } from "../../../packages/learning/src/coverage";
import { offersFor } from "../../../packages/learning/src/decomposition";
import { extract } from "../../../packages/learning/src/extract";
import { decompose, parseProblem, problemOf } from "../../../packages/learning/src/families";
import { familyOf } from "../../../packages/learning/src/intervention";
import { reviewFixtureActive, useReviewFixture } from "../../../packages/learning/src/evidence";
import { examPlan, examPlanApplies, overlay, readiness } from "../../../packages/learning/src/goals";
import { graph } from "../../../packages/learning/src/graph";
import { years } from "../../../packages/learning/src/plan";
import type { LearningActivity, LearningRecord } from "../../../packages/learning/src/records";
import { learnerState, make, type StudyRecord, type StudyUpdate } from "../../../packages/learning/src/session";
import { writtenTask, type WrittenMark } from "../../../packages/learning/src/written";
import { isDrawing, SketchView } from "./SketchPad";
import { flatten, tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { setActiveRegistry, type Registry } from "../../../packages/learning/src/review";
import { Icon } from "./icons";
import { Module, Recovery, Single, STATUS_WORD, type Ctx } from "./Learn";
import "../mathematics/chapter/chapter.css";
import "./year.css";

declare const OPENPATH_REVIEW_FIXTURE: boolean;
// TEST BUILDS ONLY: treat every question as educator-reviewed, so acceptance tests can show a verified (green) skill.
if (typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE) useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z", all: true }); // generated questions too (the dashboard's test build reads the same)

const api = new Api();
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
    const r = await api.request<{ count: number; events: { kind: string }[] }>("GET", `/pupils/${this.learner}/events/?subject=mathematics`);
    this.count = r.count;
    return r.events;
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
  | { name: "curriculum-practice"; competency: string; back: View }
  | { name: "module"; competency: string; back: View }
  | { name: "stuck"; qid: string }
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

function App() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pupils, setPupils] = useState<PupilSummary[]>([]);
  const [learner, setLearner] = useState<string>(new URLSearchParams(location.search).get("learner") ?? "");
  const [events, setEvents] = useState<{ kind: string }[] | null>(null);
  const [view, setView] = useState<View>(new URLSearchParams(location.search).get("curriculum") === "change" ? { name: "setup", sameYear: true } : { name: "year" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [registryLoaded, setRegistryLoaded] = useState(0);
  const visit = useRef(uid());

  async function refreshAccount() {
    const s = await api.status();
    if (!s.available) throw new Error("The OpenPath account service is not reachable. Wait a minute (it may be waking up) and reload.");
    setSignedIn(s.account.authenticated);
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
  useEffect(() => {
    setEvents(null);
    setMarks([]);
    if (!repo || !signedIn) return;
    repo.load().then(setEvents).catch((e) => setError(String(e.message ?? e)));
    api.request<{ marks: WrittenMark[] }>("GET", `/pupils/${learner}/written-marks/`).then((r) => setMarks(r.marks)).catch(() => setMarks([]));
  }, [repo, signedIn]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const st = useMemo(() => (learner && events ? learnerState(learner, events, now, { currentSession: `learn:${learner}:${visit.current}`, marks }) : null), [learner, events, now, registryLoaded, marks]);
  // ?skill=<competency> (from the curriculum dashboard): open that skill's module once the year is loaded
  const wanted = useRef(new URLSearchParams(location.search).get("skill"));
  useEffect(() => {
    const want = wanted.current;
    if (!want || !st?.release || !moduleFor(want)) return;
    wanted.current = null;
    if (new URLSearchParams(location.search).get("practice") === "curriculum") setView({name:"curriculum-practice",competency:want,back:{name:"year"}});
    else if (new URLSearchParams(location.search).get("diagnostic") === "topic" && st.enrolment?.grade === 7) setView({name:"topic-diagnostic",competency:want,back:{name:"year"}});
    else setView({name:"module",competency:want,back:{name:"year"}});
  }, [st?.release]);
  const session = `learn:${learner}:${visit.current}`;
  const ctxOf = () => ({ learnerId: learner, sessionId: session, at: new Date().toISOString() });

  async function save(...records: LearningRecord[]) {
    if (!repo) return false;
    setSaving(true);
    setError("");
    try {
      let next = events ?? [];
      for (const r of records) next = await repo.append(r);
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

  const banner = reviewFixtureActive() ? <div className="test-banner" role="note">TEST BUILD · questions are treated as educator-reviewed so that “verified” can be shown. Never use with real learners.</div> : null;
  if (!ready) return <Shell banner={banner}><p className="muted center">Opening OpenPath…</p></Shell>;
  if (!signedIn) return <Shell banner={banner} error={error}><SignIn onDone={() => refreshAccount().catch((e) => setError(String(e.message ?? e)))} onError={setError} /></Shell>;
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
        ) : (
          <p>Add a learner in <a href="/">OpenPath</a> first; the same learner is used here.</p>
        )}
      </Shell>
    );
  if (!st) return <Shell banner={banner} error={error}><p className="muted center">Loading the record…</p></Shell>;

  const name = pupils.find((p) => p.id === learner)?.display_name ?? "Learner";
  const ctx: Ctx = {
    records: st.records,
    evidence: st.evidence,
    now,
    session,
    saving,
    answer: (qid: string, response: string, activity: LearningActivity, o = {}) => save(make.attempt(ctxOf(), qid, response, activity, o)),
    teach: (competency: string, strategy: string, rule: string) => save(make.teach(ctxOf(), competency, strategy, rule.slice(0, 40))),
  };
  const top = (left: React.ReactNode, title: string) => <TopBar left={left} title={title} />;
  const home = <button className="link" onClick={() => setView({ name: "year" })}>← My year</button>;
  const switcher = pupils.length > 1 ? <button className="link" onClick={() => setLearner("")}>Switch</button> : <a className="link" href="/maths/">← Maths</a>;

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
  const tiles = tilesFor(release, st.evidence, goalOf);
  const open = (t: Tile, path: string[]) => {
    if (t.kind === "proposal" || t.kind === "unsupported") return;
    if (t.kind === "skill" && t.children.length === 0 && moduleFor(t.competency!) && t.content?.level === "module") return setView({ name: "module", competency: t.competency!, back: { name: "tile", path: path.slice(0, -1) } });
    setView({ name: "tile", path });
  };

  if (view.name === "curriculum-practice")
    return (
      <Shell paper banner={banner} error={error} top={top(home, name)}>
        <CurriculumPractice
          key={`${learner}:${release.hash}:${view.competency}`}
          competency={view.competency} ctx={ctx}
          resumeKey={`openpath.curriculum-practice@1:${learner}:${st.enrolment.academicYear}:${release.hash}:${view.competency}`}
          back={`/curriculum/?learner=${encodeURIComponent(learner)}&view=learner#c=${encodeURIComponent(view.competency)}`}
        />
      </Shell>
    );
  if (view.name === "topic-diagnostic")
    return <Shell paper banner={banner} error={error} top={top(home, name)}><TopicSession academicYear={st.enrolment!.academicYear} learner={learner} target={view.competency} ctx={ctx} release={release} events={events ?? []} saveStudy={saveStudy} saveStart={() => save(make.topicStart(ctxOf(),view.competency,release,st.enrolment!.academicYear))} savePlan={minutes => save(make.sessionPlan(ctxOf(), view.competency, minutes, release,st.enrolment!.academicYear))} /></Shell>;
  if (view.name === "module")
    return (
      <Shell paper={grade === 7} banner={banner} error={error} wide={false} top={keyboardOpen ? undefined : top(<button className="link" onClick={() => setView(view.back)}>← Back</button>, name)}>
        <KeyboardPractice key={`${learner}:${view.competency}`} onOpenChange={setKeyboardOpen} api={api} learner={learner} competency={view.competency} onSaved={async () => { if (repo) setEvents(await repo.load()); }}>
          <Module competency={view.competency} ctx={ctx} onExit={() => setView(view.back)} />
        </KeyboardPractice>
      </Shell>
    );
  if (view.name === "stuck")
    return (
      <Shell banner={banner} error={error} top={top(home, name)}>
        <Recovery original={view.qid} ctx={ctx} onExit={() => setView({ name: "year" })} />
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
  const sum = st.summary;
  const next = st.next!;
  const ids = assigned(release).map((a) => a.competency);
  const overlays = activeGoals.map((g) => overlay(g, grade, ids, st.evidence)).filter((o) => o !== null);
  // advanced problems: the steps of the general decomposition that suit this grade; the full problem once its
  // grade and readiness rules are met (decomposition@2 for the steps, the stored readiness rule for the full problem)
  const offers = offersFor(grade, st.evidence).map((o) => {
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
      <div className="actions">
        {events && (() => { const last=[...events].reverse().find((e:any)=>e.record==='topic_session'&&e.academicYear===st.enrolment?.academicYear&&e.curriculum?.id===release.id&&e.curriculum?.hash===release.hash) as Extract<LearningRecord,{record:'topic_session'}>|undefined;return last?<a className="primary" href={`/year/?learner=${encodeURIComponent(learner)}&skill=${encodeURIComponent(last.target)}&diagnostic=topic`}>Resume topic session</a>:null;})()}
        <a className="primary" href={`/curriculum/?learner=${encodeURIComponent(learner)}&view=learner`}>Open Mathematics topics</a>
        <button className="link" onClick={() => setView({ name: "setup", sameYear: true })}>Change board or curriculum</button>
      </div>
      <div className="stats" role="list" aria-label="This year so far">
        <div className="stat verified" role="listitem"><b>{sum.verified}</b><span>Verified</span></div>
        <div className="stat shown" role="listitem"><b>{sum.shown}</b><span>Shown on your own</span></div>
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
      {next.kind !== "none" ? (
        <div className="next">
          <p className="eyebrow">Next</p>
          <h2>{next.question ? question(next.question).prompt.split(":")[0] : graph.get(next.competency!).name}</h2>
          <p className="muted">{next.reason}</p>
          {st.change && <p className="why" role="status"><b>Why this changed:</b> {st.change}</p>}
          <button className="primary" onClick={goNext}>{next.kind === "retention" ? "Start the delayed check" : next.kind === "review" ? "Review it" : next.kind === "continue" ? "Continue" : "Start"}</button>
        </div>
      ) : (
        <div className="next"><p className="eyebrow">Next</p><p>{next.reason}</p></div>
      )}
      {tiles.map((s) => (
        <section key={s.id} aria-label={s.title}>
          <div className="section-title"><h2>{s.title}</h2><span className="small muted">{s.progress.done} of {s.progress.total} skills shown on your own</span></div>
          {s.subtitle && <p className="hint small" role="note">{s.subtitle}</p>}
          <TileGrid tiles={s.children} onOpen={(t) => open(t, [s.id, t.id])} />
        </section>
      ))}
      <CoverageCard release={release} />
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
            const r = readiness(o!.goal.id, grade, st.evidence)!;
            return <p className="small">Foundations so far (up to Grade {grade}): {r.shown} of {r.foundationsSoFar} shown on your own{r.verified ? `, ${r.verified} verified` : ""}. This is read from your own record; a goal adds nothing to it.</p>;
          })()}
          {examPlanApplies(o!.goal.id, grade) && <ExamPlanCard goalId={o!.goal.id} ev={st.evidence} />}
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
        <StuckBox onOpen={(qid) => setView({ name: "stuck", qid })} />
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
      <WrittenWork records={st.records} learner={learner} />
      <div className="section-title"><h2>Your years</h2></div>
      <div className="actions">
        <button className="secondary" onClick={() => setView({ name: "years" })}>Earlier years</button>
        <button className="secondary" onClick={() => setView({ name: "setup" })}>Start the next year</button>
      </div>
    </Shell>
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
          <div className="fact"><b>{STATUS_WORD[e.status]}</b>status</div>
          <div className="fact"><b>{e.retention === "none" ? "Not yet" : e.retention === "scheduled" ? new Date(e.retentionDueAt!).toLocaleDateString() : e.retention === "due" ? "Due now" : e.retention === "passed" ? "Passed" : "Missed"}</b>delayed check</div>
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

/** What the platform can teach from this textbook, measured separately for each kind of content (coverage@1). */
function CoverageCard({ release }: { release: CurriculumRelease }) {
  const c = useMemo(() => releaseCoverage(release), [release]);
  const row = (label: string, n: number) => <li key={label}><b>{n}</b> of {c.counts.total} · {label}</li>;
  return (
    <details className="panel coverage" style={{ marginTop: 16 }}>
      <summary><b>What OpenPath can teach from this textbook</b> <span className="small muted">{c.counts.module} of {c.counts.total} skills have a full learning module · {c.counts.approved} educator-approved</span></summary>
      <p className="small">Read from the book: {c.extracted.chapters} chapters{c.extracted.sections ? `, ${c.extracted.sections} sections` : ""}, {c.extracted.outcomes} outcomes. Mapped to a skill: {c.mapping.accepted} of {c.extracted.outcomes}{c.mapping.proposals ? ` (${c.mapping.proposals} kept as proposals)` : ""}.</p>
      <ul className="plain small" aria-label="Coverage by kind of content">
        {row("with diagnostic questions", c.counts.diagnostic)}
        {row("with teaching strategies", c.counts.strategies)}
        {row("with practice", c.counts.practice)}
        {row("with independent assessment", c.counts.independent)}
        {row("with a delayed (retention) check", c.counts.retention)}
        {row("educator-approved", c.counts.approved)}
      </ul>
      {c.counts.none > 0 && <p className="small">No learning content yet: {c.competencies.filter((x) => x.module === "none").map((x) => x.name).join(", ")}.</p>}
      <p className="small muted">Content is original OpenPath material and not yet educator-reviewed, so no skill can be verified on it. These are counts of content, not of learning.</p>
    </details>
  );
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

function StuckBox({ onOpen }: { onOpen: (qid: string) => void }) {
  const [text, setText] = useState("");
  const [why, setWhy] = useState<string | null>(null);
  return (
    <form className="stack" onSubmit={(e) => {
      e.preventDefault();
      const p = parseProblem(text);
      if (p.supported) {
        setWhy(null);
        onOpen(p.problem.id);
      } else setWhy(p.reason);
    }}>
      <label className="field">The problem<input aria-label="The problem" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. ∫ from 2 to 9 of 6 dx, or 2/5 = □/15" /></label>
      {why && <p className="feedback bad" role="status"><b>OpenPath can’t work through this one yet.</b> {why}</p>}
      <button className="secondary" disabled={!text.trim()}>Work through it</button>
    </form>
  );
}

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

function SignIn({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); setBusy(true); api.login(email, password).then(onDone).catch((er) => onError(String(er.message ?? er))).finally(() => setBusy(false)); }}>
      <h1>Sign in to OpenPath</h1>
      <p className="muted">Use the same account as the rest of OpenPath.</p>
      <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
