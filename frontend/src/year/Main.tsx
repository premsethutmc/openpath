/**
 * My Learning Year (/year/): one learner's school year through the shared learning engine. Same account, learner and
 * record as the rest of OpenPath (kind "learning_record" in the mathematics record). Everything shown is derived from
 * the stored records; nothing is kept only on the device.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../english/logic/account";
import { goal as goalById, goals, moduleFor, question, questions } from "../../../packages/learning/src/content";
import { sampleFor, sampleReleases } from "../../../packages/learning/src/curricula";
import { assigned, review, synthesise, type CurriculumRelease, type ReviewDecision } from "../../../packages/learning/src/curriculum";
import { offersFor, trace } from "../../../packages/learning/src/decomposition";
import { reviewFixtureActive, useReviewFixture } from "../../../packages/learning/src/evidence";
import { examPlan, examPlanApplies, overlay } from "../../../packages/learning/src/goals";
import { graph } from "../../../packages/learning/src/graph";
import { years } from "../../../packages/learning/src/plan";
import type { LearningActivity, LearningRecord } from "../../../packages/learning/src/records";
import { learnerState, make } from "../../../packages/learning/src/session";
import { flatten, tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { Icon } from "./icons";
import { Module, Recovery, Single, STATUS_WORD, type Ctx } from "./Learn";
import "../mathematics/chapter/chapter.css";
import "./year.css";

declare const OPENPATH_REVIEW_FIXTURE: boolean;
// TEST BUILDS ONLY: treat every question as educator-reviewed, so acceptance tests can show a verified (green) skill.
if (typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE) useReviewFixture({ items: questions.map((q) => q.id), releasedAt: "2020-01-01T00:00:00Z" });

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
      const r = await api.request<{ count: number }>("POST", `/pupils/${this.learner}/events/`, { subject: "mathematics", seq: this.count, event });
      this.count = r.count;
      return this.load();
    });
    this.queue = work.catch(() => undefined);
    return work;
  }
}

type View =
  | { name: "year" }
  | { name: "setup" }
  | { name: "tile"; path: string[] }
  | { name: "module"; competency: string; back: View }
  | { name: "stuck"; qid: string }
  | { name: "single"; qid: string; heading: string; note?: string }
  | { name: "years" };

const academicYear = (d = new Date()) => {
  const y = d.getMonth() >= 5 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};

function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pupils, setPupils] = useState<PupilSummary[]>([]);
  const [learner, setLearner] = useState<string>(new URLSearchParams(location.search).get("learner") ?? "");
  const [events, setEvents] = useState<{ kind: string }[] | null>(null);
  const [view, setView] = useState<View>({ name: "year" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const visit = useRef(uid());

  async function refreshAccount() {
    const s = await api.status();
    if (!s.available) throw new Error("The OpenPath account service is not reachable. Wait a minute (it may be waking up) and reload.");
    setSignedIn(s.account.authenticated);
    if (s.account.authenticated) {
      const rows = await api.pupils();
      setPupils(rows);
      setLearner((cur) => (rows.some((p) => p.id === cur) ? cur : rows.length === 1 ? rows[0].id : ""));
    }
  }
  useEffect(() => {
    refreshAccount().catch((e) => setError(String(e.message ?? e))).finally(() => setReady(true));
  }, []);
  const repo = useMemo(() => (learner ? new Repo(learner) : null), [learner]);
  useEffect(() => {
    setEvents(null);
    if (!repo || !signedIn) return;
    repo.load().then(setEvents).catch((e) => setError(String(e.message ?? e)));
  }, [repo, signedIn]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  const st = useMemo(() => (learner && events ? learnerState(learner, events, now) : null), [learner, events, now]);
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
          goals={[...st.records.goals.keys()]}
          saving={saving}
          onSave={async (grade, release, saveRelease, goal) => {
            const recs: LearningRecord[] = [];
            if (saveRelease) recs.push(make.curriculum(ctxOf(), release));
            recs.push(make.enrol(ctxOf(), grade, academicYear(), release));
            for (const g of st.records.goals.keys()) if (g !== goal) recs.push(make.goal(ctxOf(), g, false));
            if (goal && !st.records.goals.has(goal)) recs.push(make.goal(ctxOf(), goal, true));
            if (await save(...recs)) setView({ name: "year" });
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
    if (t.kind === "proposal") return;
    if (t.kind === "skill" && t.children.length === 0 && moduleFor(t.competency!)) return setView({ name: "module", competency: t.competency!, back: { name: "tile", path: path.slice(0, -1) } });
    setView({ name: "tile", path });
  };

  if (view.name === "module")
    return (
      <Shell banner={banner} error={error} wide={false} top={top(<button className="link" onClick={() => setView(view.back)}>← Back</button>, name)}>
        <Module competency={view.competency} ctx={ctx} onExit={() => setView(view.back)} />
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
          const r = sampleReleases.find((x) => x.id === y.curriculum.id && x.hash === y.curriculum.hash) ?? [...st.records.curricula.values()].find((x) => x.id === y.curriculum.id && x.hash === y.curriculum.hash);
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
        <TileDetail t={here} ev={st.evidence} onStart={here.competency && moduleFor(here.competency) ? () => setView({ name: "module", competency: here.competency!, back: view }) : undefined} />
        {here.children.length > 0 && (
          <>
            <div className="section-title"><h2>{here.kind === "chapter" ? "Skills" : here.kind === "subject" ? "Chapters" : "Smaller steps"}</h2></div>
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
  const offers = offersFor(grade, st.evidence).filter((o) => o.full || o.fragments.length);
  const goNext = () => {
    if (next.kind === "challenge" && next.question) return setView({ name: "single", qid: next.question, heading: "Enrichment challenge" });
    if (next.competency) setView({ name: "module", competency: next.competency, back: { name: "year" } });
  };
  return (
    <Shell banner={banner} error={error} wide top={top(switcher, name)}>
      <div className="year-head">
        <p className="eyebrow">My Learning Year</p>
        <h1>Grade {grade} · {st.enrolment.academicYear}</h1>
        <div className="year-meta">
          <span className="chip">{release.title}</span>
          {release.source.synthetic && <span className="chip">Sample textbook</span>}
          {activeGoals.map((g) => <span key={g} className="chip">Goal: {goalById(g)?.name}</span>)}
        </div>
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
          <button className="primary" onClick={goNext}>{next.kind === "retention" ? "Start the delayed check" : next.kind === "review" ? "Review it" : next.kind === "continue" ? "Continue" : "Start"}</button>
        </div>
      ) : (
        <div className="next"><p className="eyebrow">Next</p><p>{next.reason}</p></div>
      )}
      {tiles.map((s) => (
        <section key={s.id} aria-label={s.title}>
          <div className="section-title"><h2>{s.title}</h2><span className="small muted">{s.progress.done} of {s.progress.total} chapters shown</span></div>
          <TileGrid tiles={s.children} onOpen={(t) => open(t, [s.id, t.id])} />
        </section>
      ))}
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
          {examPlanApplies(o!.goal.id, grade) && <ExamPlanCard goalId={o!.goal.id} ev={st.evidence} />}
        </section>
      ))}
      {offers.length > 0 && (
        <section aria-label="Steps toward an advanced problem">
          <div className="section-title"><h2>Steps toward an advanced problem</h2></div>
          <div className="cards">
            {offers.flatMap((o) => (o.full ? [o.full] : o.fragments).map((f) => {
              const tr = trace(f.id)!;
              return (
                <button key={f.id} className="card" onClick={() => setView({ name: "single", qid: f.id, heading: tr.isFull ? `Full problem · ${o.problem.title}` : `One step of: ${o.problem.title}`, note: tr.isFull ? "You have shown the skills it needs. This is the full problem." : `This is one part of an advanced problem, at your grade. It uses ${f.competencies.map((c) => graph.get(c).name.toLowerCase()).join(" and ")}.` })}>
                  <span className="tag">{tr.isFull ? "Full problem" : "One step"}</span>
                  <span className="card-title">{f.prompt}</span>
                  <span className="card-sub">{o.problem.style} · {o.problem.validation}</span>
                </button>
              );
            }))}
          </div>
        </section>
      )}
      {stuckFor(grade).length > 0 && <section aria-label="Stuck on a problem">
        <div className="section-title"><h2>Stuck on a problem?</h2></div>
        <p className="muted small">A problem from class or coaching. OpenPath finds which skill it rests on is missing, teaches that, and brings you back.</p>
        <div className="cards">
          {stuckFor(grade).map((q) => (
            <button key={q.id} className="card" onClick={() => setView({ name: "stuck", qid: q.id })}>
              <span className="card-title">{q.prompt}</span>
              <span className="card-sub">{graph.get(q.competency).name}</span>
            </button>
          ))}
        </div>
      </section>}
      <div className="section-title"><h2>Your years</h2></div>
      <div className="actions">
        <button className="secondary" onClick={() => setView({ name: "years" })}>Earlier years</button>
        <button className="secondary" onClick={() => setView({ name: "setup" })}>Start the next year</button>
      </div>
    </Shell>
  );
}

function TileGrid({ tiles, onOpen }: { tiles: Tile[]; onOpen: (t: Tile) => void }) {
  return (
    <div className="tiles">
      {tiles.map((t) => (
        <button key={t.id} className={`tile ${t.kind === "proposal" ? "proposal" : t.status}`} data-status={t.status} disabled={t.kind === "proposal"} onClick={() => onOpen(t)} aria-label={`${t.title}: ${t.label}${t.progress.total ? `, ${t.progress.done} of ${t.progress.total}` : ""}`}>
          {t.goalRefs.length > 0 && <span className="goal-mark">Goal</span>}
          <span className="tile-title">{t.title}</span>
          {t.subtitle && <span className="tile-sub">{t.subtitle}</span>}
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
      <p className="eyebrow">{t.kind === "subject" ? "Subject" : t.kind === "chapter" ? "Chapter" : t.kind === "micro" ? "Smaller step" : "Skill"}</p>
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
      {t.curriculumRefs[0] && <p className="ref">{t.curriculumRefs[0].textbook}{t.curriculumRefs[0].chapter ? ` · ${t.curriculumRefs[0].chapter}` : ""}{t.curriculumRefs[0].pages ? ` · pp. ${t.curriculumRefs[0].pages}` : ""}</p>}
      {onStart && t.assessable && <button className="primary" onClick={onStart}>{e && e.status !== "not_started" ? "Continue" : "Start"}</button>}
      {t.kind === "micro" && t.competency && <p className="muted small">Practised inside {graph.get(graph.evidenceTarget(t.competency)).name.toLowerCase()}: its questions on this step count here.</p>}
      {!onStart && t.kind === "skill" && <p className="muted small">No questions for this skill yet.</p>}
    </div>
  );
}

function ExamPlanCard({ goalId, ev }: { goalId: string; ev: Ctx["evidence"] }) {
  const [target, setTarget] = useState<0.6 | 0.75 | 0.9>(0.75);
  const plan = examPlan(goalId, ev, 26, target)!;
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h3 style={{ marginTop: 0 }}>Exam plan</h3>
      <div className="actions" role="radiogroup" aria-label="Target">
        {([0.6, 0.75, 0.9] as const).map((t) => <button key={t} role="radio" aria-checked={t === target} className={t === target ? "primary" : "secondary"} onClick={() => setTarget(t)}>{Math.round(t * 100)}%</button>)}
      </div>
      <p>Rough estimate from your own answers: {plan.estimate.low}–{plan.estimate.high}% of the marks. {plan.onTrack ? "On track for this target." : "Below this target so far."}</p>
      <p className="small muted">{plan.caveat} Marking: {plan.goal.marking.note}</p>
      <ol className="plain">{plan.priorities.slice(0, 3).map((p) => <li key={p.topic}><b>{p.topic}</b> · weight {Math.round(p.weight[0] * 100)}–{Math.round(p.weight[1] * 100)}% · {p.attempt ? "worth attempting" : "skip unless sure (negative marking)"}</li>)}</ol>
    </div>
  );
}

function Setup({ current, goals: active, saving, onSave }: { current: number | null; goals: string[]; saving: boolean; onSave: (grade: number, r: CurriculumRelease, saveRelease: boolean, goal: string | null) => void }) {
  const [grade, setGrade] = useState<number | null>(current ? Math.min(current + 1, 12) : null);
  const [mode, setMode] = useState<"sample" | "book" | null>(null);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<CurriculumRelease | null>(null);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const [goal, setGoal] = useState<string | null>(active[0] ?? null);
  const [problem, setProblem] = useState("");
  const sample = grade ? sampleFor(grade) : null;
  const outcomes = draft ? draft.subjects.flatMap((s) => s.chapters.flatMap((c) => c.outcomes.map((o) => ({ c, o })))) : [];
  const finish = (r: CurriculumRelease, own: boolean) => onSave(grade!, r, own, goal);
  return (
    <div className="stack">
      <h1>{current ? "Start the next year" : "Set up My Learning Year"}</h1>
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
          <h2>Long-term goal (optional)</h2>
          <div className="cards">
            {[null, ...goals.map((g) => g.id)].map((g) => (
              <button key={g ?? "none"} className={`card ${goal === g ? "accent" : ""}`} aria-pressed={goal === g} onClick={() => setGoal(g)}>
                <span className="card-title">{g ? goalById(g)!.name : "No goal for now"}</span>
                {g && <span className="card-sub">{grade < 11 ? "Shown as foundations in your own year, and challenges when ready. Nothing from later grades." : "Exam plan with weight ranges and the paper's marking."}</span>}
              </button>
            ))}
          </div>
          <h2>Curriculum</h2>
          <div className="cards">
            {sample && <button className={`card ${mode === "sample" ? "accent" : ""}`} onClick={() => setMode("sample")}><span className="card-title">{sample.title}</span><span className="card-sub">A sample textbook written for OpenPath (reviewed mapping, not an educator review)</span></button>}
            <button className={`card ${mode === "book" ? "accent" : ""}`} onClick={() => setMode("book")}><span className="card-title">Add my textbook</span><span className="card-sub">Paste its contents: chapters, pages and learning outcomes</span></button>
          </div>
        </>
      )}
      {mode === "sample" && sample && <button className="primary" disabled={saving} onClick={() => finish(sample, false)}>{saving ? "Saving…" : `Start Grade ${grade}`}</button>}
      {mode === "book" && !draft && (
        <div className="stack">
          <p className="small muted">Format: a front matter block (title, grade, subject, licence), then “## Chapter title (pp. 1–10)” and “- Outcome (p. 3)” lines. See the sample textbooks.</p>
          <textarea className="book" aria-label="Textbook contents" value={text} onChange={(e) => setText(e.target.value)} />
          {problem && <p className="error">{problem}</p>}
          <button className="primary" disabled={!text.trim()} onClick={() => {
            try {
              const d = synthesise(text);
              if (d.grade !== grade) throw new Error(`This textbook says Grade ${d.grade}; Grade ${grade} is chosen.`);
              setDraft(d);
              setPicked(Object.fromEntries(d.subjects.flatMap((s) => s.chapters.flatMap((c) => c.outcomes.map((o) => [o.id, new Set(o.mapping.competencies.slice(0, 1).map((m) => m.id))])))));
              setProblem("");
            } catch (e) {
              setProblem(String((e as Error).message ?? e));
            }
          }}>Read the textbook</button>
        </div>
      )}
      {draft && (
        <div className="stack">
          <h2>Check the skills for each outcome</h2>
          <p className="small muted">OpenPath suggests skills from its skill map. Nothing is used until you confirm. An outcome with no match is kept as a proposal with its page reference; it gets no questions.</p>
          <div className="mapping">
            {outcomes.map(({ c, o }) => (
              <div key={o.id} className="outcome">
                <p>{o.text} <span className="ref">({c.title}{o.pages ? `, p. ${o.pages}` : ""})</span></p>
                {o.mapping.competencies.length ? o.mapping.competencies.map((m) => (
                  <label key={m.id}>
                    <input type="checkbox" checked={picked[o.id]?.has(m.id) ?? false} onChange={(e) => setPicked((p) => { const s = new Set(p[o.id]); if (e.target.checked) s.add(m.id); else s.delete(m.id); return { ...p, [o.id]: s }; })} />
                    {graph.get(m.id).name} <span className="ref">({Math.round(m.score * 100)}% match)</span>
                  </label>
                )) : <span className="ref">No matching skill: kept as a proposal.</span>}
              </div>
            ))}
          </div>
          <button className="primary" disabled={saving} onClick={() => {
            const decisions: ReviewDecision[] = outcomes.map(({ o }) => ({ outcome: o.id, accept: [...(picked[o.id] ?? [])] }));
            finish(review(draft, decisions, "account owner", new Date().toISOString()), true);
          }}>{saving ? "Saving…" : `Use this curriculum for Grade ${grade}`}</button>
        </div>
      )}
    </div>
  );
}

function Shell({ children, top, error, banner, wide }: { children: React.ReactNode; top?: React.ReactNode; error?: string; banner?: React.ReactNode; wide?: boolean }) {
  return (
    <>
      {banner}
      {top}
      <main className={`page ${wide ? "wide" : ""}`}>
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
