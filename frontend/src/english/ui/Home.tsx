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
import { LEVEL_NAMES, sourceProgress } from "../logic/spelling.ts";

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

export function Home({ learner, onStart, onResume, onJourney, onWhy, onBee, onMyWords, onMyBooks }: { learner: Learner; onStart: (s: PlanStep) => void; onResume: () => void; onJourney: () => void; onWhy: () => void; onBee: () => void; onMyWords: () => void; onMyBooks: () => void }) {
  const [more, setMore] = useState(false);
  const profile = learner.profile();
  // a pilot build has no extra practice (content.ts PilotGate): More practice is never opened there
  const activities = profile.activities;
  const open = learner.state.open;
  if (more && !learner.content.gate) return <MorePractice learner={learner} onStart={onStart} onJourney={onJourney} onBack={() => setMore(false)} />;
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
      <BeeCard learner={learner} onBee={onBee} />
      <MyWordsCard learner={learner} onOpen={onMyWords} />
      <MyBooksCard learner={learner} onOpen={onMyBooks} />
      <h2 className="section-title general-title">General English</h2>
      <p className="small">The starting check and the broader learning journey: grammar, vocabulary and spelling rules. Optional, and separate from the Spelling Bee.</p>
      {open && learner.allows(open.event.type) && (
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
            <li key={`${a.step.type}:${a.step.capability ?? ""}:${a.step.step ?? ""}`} className={first ? "adventure" : ""} data-activity={a.kind} data-action={a.recommendation?.action ?? ""} data-capability={a.step.capability ?? ""}>
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
      {activities.length === 0 && !learner.content.gate && (
        <div className="tile">
          <b>Nothing on the plan right now</b>
          <p>Either everything that can be checked has been, or the app has no more questions or lessons for what comes next. A grown-up can see why on the Progress page, and More practice is always open.</p>
        </div>
      )}
      {activities.length === 0 && learner.content.gate && (
        <div className="tile" data-pilot="nothing-open">
          <b>Nothing to do in the app right now</b>
          <p>This is the pilot version: it has only the starting check and the spelling check, with questions a teacher has approved. There is nothing more to do here today. Thank you!</p>
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
      {!learner.content.gate && (
        <button type="button" className="secondary more-entry" onClick={() => setMore(true)}>
          More practice
        </button>
      )}
      <p className="small" style={{ textAlign: "center" }}>
        <button type="button" className="link" onClick={onWhy}>
          For a grown-up: why these?
        </button>
      </p>
    </main>
  );
}

/** The Spelling Bee, first on Home: it needs no starting check. Hidden in a pilot build (not on the pilot allowlist). */
function BeeCard({ learner, onBee }: { learner: Learner; onBee: () => void }) {
  const words = learner.spellingWords();
  if (!words.length) return null;
  const p = sourceProgress(learner.spelling(), words, learner.clock());
  const s = learner.spellingSession();
  const open = s?.source.type === "bank" ? s : null;
  return (
    <section className="hub-card bee-card" aria-labelledby="bee-card-title">
      <h2 id="bee-card-title">
        <span aria-hidden="true">🐝 </span>Spelling Bee
      </h2>
      <p>{words.length} words ready to practise</p>
      {p.practised > 0 && (
        <p className="small">
          Level {p.level}: {LEVEL_NAMES[p.level ?? 1]} · {p.practised} of {p.total} practised{p.reviewList ? ` · ${p.reviewList} to review` : ""}
        </p>
      )}
      <button type="button" className="primary light" onClick={onBee}>
        {open ? `Carry on Spelling Bee (word ${open.position} of ${open.total})` : "Start Spelling Bee"}
        <Arrow />
      </button>
    </section>
  );
}

/** My Words: a parent's own lists. Hidden in a pilot build (not on the pilot allowlist). */
function MyWordsCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const n = learner.wordLists().length;
  return (
    <section className="hub-card plain" aria-labelledby="mywords-card-title">
      <h2 id="mywords-card-title">
        <span aria-hidden="true">📝 </span>My Words
      </h2>
      <p>Practise words supplied by a parent.</p>
      {n > 0 && <p className="small">{n === 1 ? "1 list saved" : `${n} lists saved`}</p>}
      <button type="button" className="secondary" onClick={onOpen}>
        {n ? "Open My Words" : "Add a word list"}
      </button>
    </section>
  );
}

function MyBooksCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const n = learner.books().length;
  return (
    <section className="hub-card plain" aria-labelledby="mybooks-card-title">
      <h2 id="mybooks-card-title">
        <span aria-hidden="true">📚 </span>My Books
      </h2>
      <p>Spelling and questions from a book you supply, checked by a parent first.</p>
      {n > 0 && <p className="small">{n === 1 ? "1 book saved" : `${n} books saved`}</p>}
      <button type="button" className="secondary" onClick={onOpen}>
        {n ? "Open My Books" : "Add a book"}
      </button>
    </section>
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
