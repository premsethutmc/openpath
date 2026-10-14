/**
 * Home: today's plan from the development planner (at most three activities), a review corner from the real
 * retention schedule and word memory, and two counts read from the record. Nothing on this screen is estimated
 * for display: every number is a count of what happened.
 */
import { useState } from "react";
import { Learner } from "../logic/learner.ts";
import { type PlanStep, patternTitle } from "../logic/plan.ts";
import { type PatternPlan, spellingPlan } from "../logic/select.ts";
import { dueWords } from "../logic/state.ts";

const STATUS_WORDS: Record<string, string> = {
  not_started: "not started",
  needs_work: "needs work",
  practising: "practising",
  ready_for_check: "ready for a check",
  check_again: "practise, then check again",
  secure: "secure",
};

const Arrow = () => (
  <span className="arrow" aria-hidden="true">
    →
  </span>
);

export function Home({ learner, onStart, onResume, onJourney, onWhy }: { learner: Learner; onStart: (s: PlanStep) => void; onResume: () => void; onJourney: () => void; onWhy: () => void }) {
  const [more, setMore] = useState(false);
  const profile = learner.profile();
  const activities = profile.activities;
  const open = learner.state.open;
  if (more) return <MorePractice learner={learner} onStart={onStart} onJourney={onJourney} onBack={() => setMore(false)} />;
  const now = learner.clock();
  const dueChecks = profile.capabilities.filter((x) => x.standing === "check_due");
  const words = dueWords(learner.state, now).length;
  const independent = profile.capabilities.reduce((t, x) => t + x.evidence.independent, 0);
  const checked = profile.capabilities.filter((x) => x.standing !== "not_checked").length;
  const name = learner.state.profile?.name ?? "explorer";
  return (
    <main className="page" aria-labelledby="today-title">
      <p className="eyebrow">Your learning space</p>
      <h1 className="hero">
        Hey, {name}! <span aria-hidden="true">👋</span>
      </h1>
      <p className="sub">A little learning today makes a big difference tomorrow.</p>
      {open && (
        <section className="resume" aria-label="Unfinished activity">
          <p>
            You stopped in the middle of <strong>{Learner.sessionTitle(open.event.type).toLowerCase()}</strong> ({open.answered.length} answered).
          </p>
          <button type="button" className="primary" onClick={onResume}>
            Carry on
          </button>
        </section>
      )}
      <h2 id="today-title" className="section-title">
        Today's plan
      </h2>
      <ol className="plan" aria-labelledby="today-title">
        {activities.map((a, i) => {
          const first = i === 0 && !open;
          return (
            <li key={`${a.step.type}:${a.step.capability ?? ""}:${a.step.step ?? ""}`} className={first ? "adventure" : ""} data-activity={a.kind} data-capability={a.step.capability ?? ""}>
              <p className="kicker">{first ? `Your next adventure · ${a.label}` : a.label}</p>
              <h2>{a.title}</h2>
              <p>{a.line}</p>
              <button type="button" className={first ? "primary light" : "secondary"} onClick={() => onStart(a.step)}>
                Start
                <Arrow />
              </button>
            </li>
          );
        })}
      </ol>
      {activities.length === 0 && (
        <div className="tile">
          <b>Nothing on the plan right now</b>
          <p>Either everything that can be checked has been, or the app has no more questions or lessons for what comes next. A grown-up can see why on the Progress page, and More practice is always open.</p>
        </div>
      )}
      <div className="tile mint">
        <b>
          <span aria-hidden="true">🔁</span> Review corner
        </b>
        <p>
          {dueChecks.length || words
            ? [dueChecks.length ? `${dueChecks.length} skill${dueChecks.length === 1 ? " is" : "s are"} due for a later check (${dueChecks.map((x) => x.name).join(", ")})` : "", words ? `${words} spelling word${words === 1 ? " is" : "s are"} due for review` : ""].filter(Boolean).join("; ") + ". They are on today's plan when they matter most."
            : "OpenPath brings skills back after some days, with different questions, to see what has stuck. Nothing is due right now."}
        </p>
      </div>
      <div className="stats" aria-label="So far">
        <div className="stat">
          <b>{independent}</b>
          <small>answers on your own</small>
        </div>
        <div className="stat">
          <b>{checked}</b>
          <small>skill{checked === 1 ? "" : "s"} with answers</small>
        </div>
      </div>
      <button type="button" className="secondary more-entry" onClick={() => setMore(true)}>
        More practice
      </button>
      <p className="small" style={{ textAlign: "center" }}>
        <button type="button" className="link" onClick={onWhy}>
          For a grown-up: why these?
        </button>
      </p>
    </main>
  );
}

/** Extra practice, apart from Today's plan: the doubling journey, spelling patterns and questions from anywhere. Nothing here is a second plan. */
export function MorePractice({ learner, onStart, onJourney, onBack }: { learner: Learner; onStart: (s: PlanStep) => void; onJourney: () => void; onBack: () => void }) {
  const now = learner.clock();
  const s = learner.state;
  const words = [...s.words.values()];
  const due = dueWords(s, now).length;
  const spelling: PatternPlan[] = s.sessions.size > 1 ? spellingPlan(s, learner.content, now, learner.speech).slice(0, 4) : [];
  return (
    <main className="page" aria-labelledby="more-practice-title">
      <p>
        <button type="button" className="link" onClick={onBack}>
          ← Back to today
        </button>
      </p>
      <p className="eyebrow">Extra things to try</p>
      <h1 id="more-practice-title" className="hero">
        More practice
      </h1>
      <p className="sub">Today's list chooses what matters most; these are for when you want more.</p>
      <section className="journey-card" aria-labelledby="journey-card-title">
        <h2 id="journey-card-title">Doubling letters (new, adaptive)</h2>
        <p>hop → hopping, stop → stopped. A few questions on your own, then teaching that changes if it is not working, then new words on your own.</p>
        <p className="small">Demonstration content: the questions, lessons and hints are provisional and not yet reviewed by an educator. They do not change your levels.</p>
        <button type="button" className="secondary" onClick={onJourney}>
          {learner.doublingReport().started ? "Go on with doubling letters" : "Try doubling letters"}
        </button>
      </section>
      {spelling.length > 0 && (
        <section className="tile" aria-labelledby="spelling-plan">
          <h2 id="spelling-plan">Spelling patterns</h2>
          <ul className="patterns">
            {spelling.map((p) => (
              <li key={`${p.cap}#${p.step}`}>
                <span>{patternTitle(learner.content, p.cap, p.step)}</span>
                <span className={`status s-${p.status}`}>{STATUS_WORDS[p.status]}</span>
              </li>
            ))}
          </ul>
          <p className="small">
            {words.filter((w) => !w.learned).length} words in your review list, {due} due now; {words.filter((w) => w.learned).length} learned.
          </p>
        </section>
      )}
      <section className="tile mint more" aria-labelledby="more-title">
        <h2 id="more-title">Questions from anywhere</h2>
        <p>Ten questions from any part of English: reading, writing, sentences and more.</p>
        <button type="button" className="secondary" onClick={() => onStart({ type: "explore", title: "More practice", reason: "" })}>
          Start more practice
        </button>
      </section>
    </main>
  );
}

export { STATUS_WORDS };
