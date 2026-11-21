/**
 * Home: today's plan from the development planner (at most three activities), a review corner from the real
 * retention schedule and word memory, and two counts read from the record. Nothing on this screen is estimated
 * for display: every number is a count of what happened.
 */
import { longSummary } from "../logic/reading/long-read.ts";
import { kindsSummary } from "../logic/reading/kinds.ts";
import { TamilToggle } from "./tamilHelp.tsx";
import { studySummary } from "../logic/study/study.ts";
import { writtenSummary } from "../logic/reading/written.ts";
import { searchGrammar } from "../logic/grammar-use/search.ts";
import { useState } from "react";
import { Learner } from "../logic/learner.ts";
import { type PlanStep, patternTitle } from "../logic/plan.ts";
import { type PatternPlan, spellingPlan } from "../logic/select.ts";
import { dueWords } from "../logic/state.ts";
import { LEVEL_NAMES, sourceProgress } from "../logic/spelling.ts";
import { latestResult } from "../logic/vocabulary/size-check.ts";
import { NEW_PER_DAY, summary as wordsSummary } from "../logic/vocabulary/daily-words.ts";
import { dictationSummary } from "../logic/dictation/dictation.ts";
import { FIRST, firstSummary, isBeginner } from "../logic/first/first.ts";
import { NAMING_TOPIC, streamRows, type StreamId, type StreamRow } from "../logic/streams/streams.ts";
import { GRAMMAR, grammarSummary } from "../logic/grammar-use/grammar-use.ts";
import { listenSummary } from "../logic/listening/passages.ts";
import { BOARDS, SYLLABUSES, syllabusesOf, coverage as syllabusCoverage, type Board } from "../logic/syllabus/syllabus.ts";
import { COURSE } from "../logic/reading/course.ts";
import { progress } from "../logic/reading/session.ts";

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

declare const __OPENPATH_READ_ALOUD__: boolean | undefined;
const READ_ALOUD_BUILT = typeof __OPENPATH_READ_ALOUD__ !== "undefined" && __OPENPATH_READ_ALOUD__ === true;

export function Home({ onSubjects, learner, onStart, onResume, onJourney, onWhy, onBee, onMyWords, onMyBooks, onVocab, onNewWords, onListenWrite, onReading, onLevelCheck, onGrammarUse, onSyllabus, onListenAnswer, onLongRead, onKinds, onStudy, onWritten, onFirstWords, onParent, onPath, onReadAloud }: { onSubjects?: () => void; learner: Learner; onStart: (s: PlanStep) => void; onResume: () => void; onJourney: () => void; onWhy: () => void; onBee: () => void; onMyWords: () => void; onMyBooks: () => void; onVocab: () => void; onNewWords: () => void; onListenWrite: () => void; onReading: () => void; onLevelCheck: () => void; onGrammarUse: (topics?: string[]) => void; onSyllabus: () => void; onListenAnswer: () => void; onLongRead?: () => void; onKinds?: () => void; onStudy?: () => void; onWritten?: () => void; onFirstWords: () => void; onParent?: () => void; onPath?: () => void; onReadAloud?: () => void }) {
  // once a level is found, "Your English today" leads and the rest is folded away; before that the lists are open.
  // the older journey (General English) is in Journey, except in a pilot build, where it is the whole app.
  const guided = !learner.content.gate && learner.levels().done;
  const [showAll, setShowAll] = useState(!guided);
  const [showSchool, setShowSchool] = useState(!guided);
  const open = learner.state.open;
  const name = learner.state.profile?.name ?? "explorer";
  return (
    <main className="page" aria-labelledby="today-title">
      <TamilToggle />
      {onSubjects && (
        <button type="button" className="link back-subjects" onClick={onSubjects}>
          ← All subjects
        </button>
      )}
      <p className="eyebrow">Your learning space</p>
      <h1 className="hero">
        Hey, {name}! <span aria-hidden="true">👋</span>
      </h1>
      <p className="sub">A little learning today makes a big difference tomorrow.</p>
      {learner.content.gate ? (
        <>
          <BeeCard learner={learner} onBee={onBee} />
          <MyWordsCard learner={learner} onOpen={onMyWords} />
          <MyBooksCard learner={learner} onOpen={onMyBooks} />
        </>
      ) : (
        <>
          <LevelPanel
            learner={learner}
            onLevelCheck={onLevelCheck}
            onGo={(id, open, step) => (id === "words" ? (open === "first" ? onFirstWords() : onNewWords()) : id === "reading" ? onReading() : id === "listening" ? (open === "passage" ? onListenAnswer() : onListenWrite()) : id === "spelling" ? (open === "mywords" ? onMyWords() : open === "rule" && step ? onStart(step) : onBee()) : onGrammarUse(open === "naming" ? [NAMING_TOPIC] : undefined))}
          />
          <GrammarSearch onPractise={(topic) => onGrammarUse([topic])} />
          {/* once the daily rows are there, this lists only what they do not already open */}
          <button type="button" className="fold" aria-expanded={showAll} aria-controls="all-activities" onClick={() => setShowAll(!showAll)}>
            <span>{guided ? "More to practise" : "Or choose an activity"}</span>
            <span className="small">{showAll ? "Hide" : guided ? "Long reads, written answers, listen and answer, Spelling Bee, word check" : "Words, reading, listening, grammar, spelling"}</span>
          </button>
          {showAll && (
            <div id="all-activities" className="compact-list">
              {!guided && <NewWordsCard learner={learner} onOpen={onNewWords} />}
              {!guided && <ReadingCard learner={learner} onOpen={onReading} />}
              {onKinds && <KindsCard learner={learner} onOpen={onKinds} />}
              {onStudy && <StudyCard learner={learner} onOpen={onStudy} />}
              {onLongRead && <LongReadCard learner={learner} onOpen={onLongRead} />}
              {onWritten && <WrittenCard learner={learner} onOpen={onWritten} />}
              {!guided && <ListenWriteCard learner={learner} onOpen={onListenWrite} />}
              {!guided && onReadAloud && <ReadAloudCard learner={learner} onOpen={onReadAloud} />}
              {!guided && <FirstWordsCard learner={learner} onOpen={onFirstWords} />}
              <ListenAnswerCard learner={learner} onOpen={onListenAnswer} />
              {!guided && <GrammarUseCard learner={learner} onOpen={() => onGrammarUse()} />}
              <BeeCard learner={learner} onBee={onBee} />
              <VocabCard learner={learner} onOpen={onVocab} />
            </div>
          )}
          <button type="button" className="fold" aria-expanded={showSchool} aria-controls="school-work" onClick={() => setShowSchool(!showSchool)}>
            <span>School work</span>
            <span className="small">{showSchool ? "Hide" : "Class syllabus, word lists, books"}</span>
          </button>
          {showSchool && (
            <div id="school-work" className="compact-list">
              <p className="small">The class syllabus, and words and texts from school that a parent or the learner adds.</p>
              <SyllabusCard onOpen={onSyllabus} />
              <MyWordsCard learner={learner} onOpen={onMyWords} />
              <MyBooksCard learner={learner} onOpen={onMyBooks} />
            </div>
          )}
        </>
      )}
      {learner.content.gate ? (
        <>
          <h2 className="section-title general-title">General English</h2>
          <GeneralEnglish learner={learner} onStart={onStart} onResume={onResume} onWhy={onWhy} onJourney={onJourney} />
        </>
      ) : (
        <>
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
          <p className="small" style={{ textAlign: "center" }}>
            <button type="button" className="link" onClick={onPath ?? onJourney}>
              Skill-by-skill practice and checks: in Journey
            </button>
          </p>
        </>
      )}
      {onParent && !learner.content.gate && (
        <p className="small parent-entry">
          <button type="button" className="link" onClick={onParent}>
            For parents: word lists and results
          </button>
        </p>
      )}
    </main>
  );
}

/**
 * The older journey (General English): its starting check, a plan of skill lessons and checks, reviews and More
 * practice. Shown on Home only in a pilot build; elsewhere it lives in Journey, under "Skill by skill".
 */
export function GeneralEnglish({ learner, onStart, onResume, onWhy, onJourney }: { learner: Learner; onStart: (s: PlanStep) => void; onResume: () => void; onWhy: () => void; onJourney: () => void }) {
  const [more, setMore] = useState(false);
  const profile = learner.profile();
  const activities = profile.activities;
  const open = learner.state.open;
  if (more && !learner.content.gate) return <MorePractice learner={learner} onStart={onStart} onJourney={onJourney} onBack={() => setMore(false)} />;
  const now = learner.clock();
  const dueChecks = profile.capabilities.filter((x) => x.standing === "check_due");
  const words = dueWords(learner.state, now).length;
  const independent = profile.capabilities.reduce((t, x) => t + x.evidence.independent, 0);
  const checked = profile.capabilities.filter((x) => x.standing !== "not_checked").length;
  return (
    <div id="general-english">
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
    </div>
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
      <p className="small">The app also saves words here from your writing and your new words.</p>
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

/** The word check (logic/vocabulary): candidate content, so never offered in a pilot build. */
function VocabCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const last = latestResult(learner.vocabRecords());
  return (
    <section className="hub-card plain" aria-labelledby="vocab-card-title">
      <h2 id="vocab-card-title">
        <span aria-hidden="true">🔤 </span>Word check
      </h2>
      <p>Find out roughly how many English words you know. Three to five minutes.</p>
      {last && <p className="small">Last time: about {last.estimate.toLocaleString("en-IN")} word families</p>}
      <button type="button" className="secondary" onClick={onOpen}>
        {last ? "Check again" : "Check my words"}
      </button>
    </section>
  );
}

/**
 * Where to start, and today: before a level check, the invitation to take one; after it, each stream with its level,
 * the next thing to do and a tick once something was done in it today. Never offered in a pilot build.
 */
function LevelPanel({ learner, onLevelCheck, onGo }: { learner: Learner; onLevelCheck: () => void; onGo: (id: StreamId, open?: StreamRow["open"], step?: StreamRow["step"]) => void }) {
  if (!learner.levels().done)
    return (
      <section className="hub-card level-cta" aria-labelledby="level-cta-title">
        <h2 id="level-cta-title">
          <span aria-hidden="true">🧭 </span>Start here: find your level
        </h2>
        <p>Four short parts, about ten minutes: words, reading, listening and spelling. Then the app shows where to begin in each.</p>
        <button type="button" className="primary" onClick={onLevelCheck}>
          Find my level
        </button>
      </section>
    );
  const rows = streamRows(learner, learner.clock());
  const left = rows.filter((r) => !r.doneToday && !r.idle).length;
  return (
    <section className="hub-card plain levels" aria-labelledby="levels-title">
      <h2 id="levels-title">
        <span aria-hidden="true">🧭 </span>Your English today
      </h2>
      <p className="small">{left ? "Your level in each stream, and the next thing to do. Pick any; a little of each is best." : "You have done something in every stream today. Well done!"}</p>
      <ul className="stream-rows">
        {rows.map((r) => (
          <li key={r.id} data-stream={r.id} data-done={r.doneToday}>
            <span className="stream-icon" aria-hidden="true">
              {r.icon}
            </span>
            <div>
              <b>{r.name}</b>
              <p className="small stream-level">{r.level}</p>
              <p className="small">{r.doneToday ? `✓ Done today${r.id === "words" ? "" : ` · next: ${r.next}`}` : r.next}</p>
            </div>
            <button type="button" className="secondary" aria-label={`Today: ${r.name}`} disabled={r.idle} onClick={() => onGo(r.id, r.open, r.step)}>
              Go
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="link" onClick={onLevelCheck}>
        Check my level again
      </button>
    </section>
  );
}

/** Listen and answer (logic/listening): candidate content, so never offered in a pilot build. */
function ListenAnswerCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = listenSummary(learner.listenRecords());
  return (
    <section className="hub-card plain" aria-labelledby="listen-answer-card-title">
      <h2 id="listen-answer-card-title">
        <span aria-hidden="true">👂 </span>Listen and answer
      </h2>
      <p>Hear a short passage read aloud, then answer four questions on it. The words are shown only at the end.</p>
      {s.passages > 0 && (
        <p className="small">
          {s.right} of {s.asked} questions right, over {s.passages} {s.passages === 1 ? "passage" : "passages"}
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.passages ? "Hear another passage" : "Try Listen and answer"}
      </button>
    </section>
  );
}

/** Look up a grammar topic by a word or two, and practise it straight away. */
function GrammarSearch({ onPractise }: { onPractise: (topic: string) => void }) {
  const [q, setQ] = useState("");
  const hits = searchGrammar(q);
  return (
    <section className="grammar-search" aria-labelledby="grammar-search-title">
      <label id="grammar-search-title" htmlFor="grammar-search" className="grammar-search-label">
        <span aria-hidden="true">🔎 </span>Look up grammar
      </label>
      <input id="grammar-search" type="search" value={q} autoComplete="off" placeholder="has, apostrophe, their or there…" onChange={(e) => setQ(e.target.value)} />
      {q.trim().length >= 2 && (
        <ul className="grammar-hits" aria-label="Grammar topics found">
          {hits.length ? (
            hits.map((h) => (
              <li key={h.id} data-topic={h.id}>
                <b>{h.name}</b>
                <span className="small">{h.rule}</span>
                <button type="button" className="secondary" onClick={() => onPractise(h.id)}>
                  Practise
                </button>
              </li>
            ))
          ) : (
            <li className="small">No grammar topic found. Try another word, such as "past" or "comma".</li>
          )}
        </ul>
      )}
    </section>
  );
}

function WrittenCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = writtenSummary(learner.writtenRecords());
  return (
    <section className="hub-card plain" aria-labelledby="written-card-title">
      <h2 id="written-card-title">
        <span aria-hidden="true">✏️ </span>Write an answer
      </h2>
      <p>Read a short passage and write your answer to a question on it, as in a test.</p>
      {s.answered > 0 && (
        <p className="small">
          {s.right} of {s.answered} answers right
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        Try Write an answer
      </button>
    </section>
  );
}

function StudyCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = studySummary(learner.studyRecords());
  return (
    <section className="hub-card plain" aria-labelledby="study-card-title">
      <h2 id="study-card-title">
        <span aria-hidden="true">🗺️ </span>Notes, charts and maps
      </h2>
      <p>Make notes and a summary from a passage, read a bar chart and write about it, and follow a road map.</p>
      {s.tasks > 0 && (
        <p className="small">
          {s.tasks} {s.tasks === 1 ? "task" : "tasks"} done · {s.right} of {s.asked} right
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.tasks ? "Another task" : "Try one"}
      </button>
    </section>
  );
}

function KindsCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = kindsSummary(learner.kindRecords());
  return (
    <section className="hub-card plain" aria-labelledby="kinds-card-title">
      <h2 id="kinds-card-title">
        <span aria-hidden="true">📜 </span>Poems and everyday texts
      </h2>
      <p>Poems, notices, timetables, letters, adverts and speeches, with questions on what they mean and why they were written.</p>
      {s.texts > 0 && (
        <p className="small">
          {s.texts} {s.texts === 1 ? "text" : "texts"} read · {s.right} of {s.asked} questions right
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.texts ? "Read another" : "Try one"}
      </button>
    </section>
  );
}

function LongReadCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = longSummary(learner.longRecords());
  return (
    <section className="hub-card plain" aria-labelledby="long-card-title">
      <h2 id="long-card-title">
        <span aria-hidden="true">📚 </span>Long reads
      </h2>
      <p>A longer story in three parts, one part at a time, then questions on the whole story: its theme, a character and the title.</p>
      {s.parts > 0 && (
        <p className="small">
          {s.finished} {s.finished === 1 ? "story" : "stories"} finished · {s.right} of {s.asked} questions right
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.parts ? "Go on reading" : "Try a long read"}
      </button>
    </section>
  );
}

/** First words (logic/first): for a learner who cannot yet read a sentence. Candidate content, so never offered in a pilot build. */
function FirstWordsCard({ learner, onOpen, start }: { learner: Learner; onOpen: () => void; start?: boolean }) {
  if (learner.content.gate) return null;
  const s = firstSummary(FIRST, learner.firstRecords());
  return (
    <section className={start ? "hub-card" : "hub-card plain"} aria-labelledby={start ? "first-start-title" : "first-card-title"} data-first={start ? "start" : "card"}>
      <h2 id={start ? "first-start-title" : "first-card-title"}>
        <span aria-hidden="true">🐱 </span>
        {start ? "Start here: First words" : "First words"}
      </h2>
      <p>{s.sentences ? "Words you know, now in short sentences: read one and tap its picture, or build it from its words." : "Hear a word and tap its picture, build the word from letters, and do what a short sentence says. Nothing has to be read."}</p>
      {s.met > 0 && (
        <p className="small">
          {s.met} of {s.total} words met, {s.sure} found on the first tap
        </p>
      )}
      <button type="button" className={start ? "primary" : "secondary"} onClick={onOpen}>
        {s.met ? "More first words" : "Try First words"}
      </button>
    </section>
  );
}

/** Grammar in use (logic/grammar-use): candidate content, so never offered in a pilot build. */
function GrammarUseCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = grammarSummary(GRAMMAR, learner.grammarRecords());
  return (
    <section className="hub-card plain" aria-labelledby="grammar-use-card-title">
      <h2 id="grammar-use-card-title">
        <span aria-hidden="true">🧩 </span>Grammar
      </h2>
      <p>Fix the wrong word in a sentence, or build a sentence from word tiles. Eight sentences, each with its rule.</p>
      {s.answered > 0 && (
        <p className="small">
          {s.right} of {s.answered} sentences right
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.answered ? "Eight more sentences" : "Try Grammar"}
      </button>
    </section>
  );
}

/** The school syllabuses the app holds (logic/syllabus): an inventory with pointers to practice. */
function SyllabusCard({ onOpen }: { onOpen: () => void }) {
  const lines = SYLLABUSES.reduce((n, d) => n + syllabusCoverage(d).total, 0);
  const span = (b: Board) => {
    const cs = syllabusesOf(b).map((d) => d.class);
    return `${BOARDS.find((x) => x.id === b)!.name} ${cs[0]} to ${cs.at(-1)}`;
  };
  return (
    <section className="hub-card plain" aria-labelledby="syllabus-card-title">
      <h2 id="syllabus-card-title">
        <span aria-hidden="true">🏫 </span>
        School English by board and class
      </h2>
      <p>What the board lists for each class, and where to practise each part here.</p>
      <p className="small">
        Classes {BOARDS.map((b) => span(b.id)).join(", ")}: {lines} lines
      </p>
      <button type="button" className="secondary" onClick={onOpen}>
        Open the class syllabus
      </button>
    </section>
  );
}

/** New words (logic/vocabulary/daily-words.ts): candidate content, so never offered in a pilot build. */
function NewWordsCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = wordsSummary(learner.wordLearnRecords(), learner.clock(), learner.dayFn());
  const todayDone = s.newToday >= NEW_PER_DAY && s.dueNow === 0;
  return (
    <section className="hub-card plain" aria-labelledby="new-words-card-title">
      <h2 id="new-words-card-title">
        <span aria-hidden="true">🌱 </span>Words
      </h2>
      <p>Five new words a day, with meanings and sentences. They come back until you know them.</p>
      {s.learning + s.learnt > 0 && (
        <p className="small">
          {s.learnt} learnt · {s.learning} still learning{todayDone ? " · done for today" : s.dueNow ? ` · ${s.dueNow} to see again` : ""}
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.learning + s.learnt ? "Open New words" : "Learn new words"}
      </button>
    </section>
  );
}

/** Listen and write (logic/dictation): candidate content, so never offered in a pilot build. */
function ListenWriteCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const s = dictationSummary(learner.dictationRecords());
  return (
    <section className="hub-card plain" aria-labelledby="listen-write-card-title">
      <h2 id="listen-write-card-title">
        <span aria-hidden="true">🎧 </span>Listen and write
      </h2>
      <p>Hear a sentence and write it: spelling, capital letters and full stops together. Five sentences.</p>
      {s.sentences > 0 && (
        <p className="small">
          {s.perfectFirst} of {s.sentences} sentences right first time
        </p>
      )}
      <button type="button" className="secondary" onClick={onOpen}>
        {s.sentences ? "Write five more" : "Try Listen and write"}
      </button>
    </section>
  );
}

/** Read aloud (logic/read-aloud): shown only where the site was built with the on-phone speech model; never in a pilot build. */
function ReadAloudCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate || !READ_ALOUD_BUILT) return null;
  return (
    <section className="hub-card plain" aria-labelledby="read-aloud-card-title">
      <h2 id="read-aloud-card-title">
        <span aria-hidden="true">🎤 </span>Read aloud
      </h2>
      <p>Read sentences out loud to the phone and see which words came through clearly. The listening stays on the phone.</p>
      <button type="button" className="secondary" onClick={onOpen}>
        Read aloud
      </button>
    </section>
  );
}

/** The reading course (logic/reading): candidate content, so never offered in a pilot build. */
function ReadingCard({ learner, onOpen }: { learner: Learner; onOpen: () => void }) {
  if (learner.content.gate) return null;
  const p = progress(COURSE, learner.readingRecords());
  const done = [...p.units.values()].filter((u) => u.status === "passed_own" || u.status === "passed_after_help").length;
  return (
    <section className="hub-card plain" aria-labelledby="reading-card-title">
      <h2 id="reading-card-title">
        <span aria-hidden="true">📖 </span>Reading
      </h2>
      <p>Short texts with questions: learn a reading skill from an example, practise with hints, then try new questions on your own.</p>
      {p.units.size > 0 && <p className="small">{done} of {COURSE.skills.length * COURSE.levels.length} skill levels done</p>}
      <button type="button" className="secondary" onClick={onOpen}>
        {p.units.size ? "Carry on reading" : "Start reading"}
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
