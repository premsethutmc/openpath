/**
 * Reading (logic/reading): choose a skill and a level; learn it from a worked example, practise with hints, then
 * answer two questions you have never seen, on texts you were not taught with. Practice-only: nothing here changes
 * the learner's capability picture.
 */
import { useMemo, useRef, useState } from "react";
import { ReadingEvidence } from "./ReadingEvidence.tsx";
import { ReadingInference } from "./ReadingInference.tsx";
import { COURSE, LEVELS, unitKey, type Course, type Level, type Passage, type SkillId, type Unit } from "../logic/reading/course.ts";
import { asReadingLevel } from "../logic/streams/level-check.ts";
import { ReadingUnitSession, progress, recommend, statusOf, type Mode, type Progress, type ReadingRecord, type Snapshot, type UnitStatus } from "../logic/reading/session.ts";
import type { Learner } from "../logic/learner.ts";
import { NoteBox } from "./Note.tsx";

const STATUS: Record<UnitStatus, { word: string; cls: string }> = {
  new: { word: "not started", cls: "" },
  learning: { word: "started", cls: "s-check" },
  passed_own: { word: "shown on your own", cls: "s-secure" },
  passed_after_help: { word: "solved after help", cls: "s-ready" },
  needs_practice: { word: "practise again", cls: "s-needs" },
  no_fresh_check: { word: "no new questions left", cls: "s-needs" },
};
const WHY = { step_back: "A step back will make the harder level easier.", practise_again: "One more go at this, then a new check.", next: "Next on your reading path." };

const skillName = (course: Course, id: SkillId) => course.skills.find((s) => s.id === id)!.name;
const levelName = (course: Course, id: Level) => course.levels.find((l) => l.id === id)!.name;

/** The text, with the part to reread marked when a hint or an explanation points at it. */
export function PassageView({ passage, highlight }: { passage: Passage; highlight?: string | null }) {
  return (
    <section className="passage reading-passage" aria-label={`Text: ${passage.title}`}>
      <h2>{passage.title}</h2>
      {passage.text.split(/\n+/).map((para, i) => {
        const at = highlight ? para.indexOf(highlight) : -1;
        return at < 0 || !highlight ? (
          <p key={i}>{para}</p>
        ) : (
          <p key={i}>
            {para.slice(0, at)}
            <mark>{highlight}</mark>
            {para.slice(at + highlight.length)}
          </p>
        );
      })}
    </section>
  );
}

export function ReadingMap({ course, progress: p, start, onOpen, onBack }: { course: Course; progress: Progress; start?: Level; onOpen: (u: Unit, mode: Mode) => void; onBack: () => void }) {
  const next = recommend(course, p, start);
  const done = [...p.units.values()].filter((u) => u.status === "passed_own" || u.status === "passed_after_help").length;
  return (
    <main className="page reading" aria-labelledby="reading-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Reading</p>
      <h1 id="reading-title" className="hero">
        Read, think, answer
      </h1>
      <p className="sub">Six reading skills at six levels. Learn each one with an example, practise with hints, then try two new questions on your own.</p>
      {next ? (
        <section className="tile lilac reading-next" aria-labelledby="reading-next-title">
          <p className="kicker">{WHY[next.why]}</p>
          <h2 id="reading-next-title">
            {skillName(course, next.unit.skill)} · {levelName(course, next.unit.level)}
          </h2>
          <p>{course.skills.find((s) => s.id === next.unit.skill)!.blurb}</p>
          <button type="button" className="primary" onClick={() => onOpen(next.unit, "learn")}>
            Start
          </button>
        </section>
      ) : (
        <section className="tile mint" aria-label="All done">
          <h2>Every skill at every level is done.</h2>
          <p>New texts are needed before there is more to check here.</p>
        </section>
      )}
      <h2 className="section-title">All skills and levels</h2>
      <p className="small">
        {done} of {course.skills.length * LEVELS.length} done. Pick any level. “Check me” skips the lesson and goes straight to two new questions.
      </p>
      {course.skills.map((s) => (
        <section key={s.id} className="hub-card plain reading-skill" aria-label={s.name}>
          <h3>{s.name}</h3>
          <p className="small">{s.blurb}</p>
          <ul className="reading-levels">
            {course.levels.map((l) => {
              const unit = { skill: s.id, level: l.id };
              const st = statusOf(p, unit);
              const closed = st === "no_fresh_check" || st === "passed_own" || st === "passed_after_help";
              return (
                <li key={l.id} data-unit={unitKey(unit)}>
                  <span className="reading-level-name">
                    {l.name}
                    <span className={`status ${STATUS[st].cls}`}>{STATUS[st].word}</span>
                  </span>
                  <span className="reading-level-go">
                    <button type="button" className="secondary" onClick={() => onOpen(unit, "learn")}>
                      {st === "new" ? "Learn" : "Learn again"}
                    </button>
                    {!closed && (
                      <button type="button" className="link" onClick={() => onOpen(unit, "check_me")}>
                        Check me
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="small">{course.levels.map((l) => `${l.name}: ${l.about}`).join(" ")}</p>
    </main>
  );
}

export interface UnitHandlers {
  nextStep: () => void;
  startPractice: () => void;
  hint: () => void;
  answerPractice: (i: number) => void;
  nextPractice: () => void;
  answerCheck: (i: number) => void;
  open: (u: Unit, mode: Mode) => void;
  leave: () => void;
}

export function ReadingUnitView({ course, snap, on }: { course: Course; snap: Snapshot; on: UnitHandlers }) {
  const [pick, setPick] = useState<number | null>(null);
  const head = (
    <>
      <button type="button" className="link" onClick={on.leave}>
        ← All reading skills
      </button>
      <p className="eyebrow">
        {skillName(course, snap.unit.skill)} · {levelName(course, snap.unit.level)}
      </p>
    </>
  );
  if (snap.phase === "lesson") {
    const { lesson, steps } = snap;
    const last = steps >= lesson.worked.steps.length;
    return (
      <main className="page reading" data-phase="lesson">
        {head}
        <h1 className="hero">{lesson.title}</h1>
        <p className="rule">{lesson.strategy}</p>
        <PassageView passage={snap.passage} />
        <section className="lesson reading-worked" aria-label="Worked example">
          <p className="kicker">Worked example</p>
          <p className="prompt">{lesson.worked.prompt}</p>
          <ol>
            {lesson.worked.steps.slice(0, steps).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {last && (
            <p className="feedback right">
              <span className="verdict">Answer: </span>
              {lesson.worked.answer}
            </p>
          )}
        </section>
        {last ? (
          <button type="button" className="primary" onClick={on.startPractice}>
            Now you try
          </button>
        ) : (
          <button type="button" className="primary" onClick={on.nextStep}>
            Next step ({steps} of {lesson.worked.steps.length})
          </button>
        )}
      </main>
    );
  }
  if (snap.phase === "practice") {
    const p = snap.practice;
    const settled = p.solved || p.revealed;
    return (
      <main className="page reading" data-phase="practice">
        {head}
        <p className="pill">
          Practice {p.index + 1} of {p.total} · hints allowed
        </p>
        <PassageView passage={p.question.passage} highlight={p.highlight} />
        <p className="prompt" id="reading-prompt">
          {p.question.prompt}
        </p>
        <div className="options" role="group" aria-labelledby="reading-prompt">
          {p.question.options.map((o, i) => {
            const crossed = p.wrong.includes(i);
            return (
              <button key={i} type="button" className={`option${crossed ? " is-wrong crossed" : ""}${p.answer?.index === i ? " is-right" : ""}`} disabled={settled || crossed} onClick={() => on.answerPractice(i)}>
                {o}
              </button>
            );
          })}
        </div>
        {p.wrong.length > 0 && !settled && <p className="feedback wrong">Not that one. Read the hint and try again.</p>}
        {p.hints.length > 0 && (
          <ul className="hints reading-hints" aria-label="Hints">
            {p.hints.map((h, i) => (
              <li key={i} className="hint">
                {h}
              </li>
            ))}
            {p.highlight && !settled && <li className="hint">Read the marked part of the text again.</li>}
          </ul>
        )}
        {p.canHint && (
          <button type="button" className="secondary" onClick={on.hint}>
            {p.hints.length ? "Another hint" : "Give me a hint"}
          </button>
        )}
        {p.answer && (
          <>
            <p className={`feedback ${p.solved ? "right" : "wrong"}`}>
              <span className="verdict">{p.solved ? "Yes. " : `The answer is: ${p.question.options[p.answer.index]}. `}</span>
              {p.answer.explain}
            </p>
            <button type="button" className="primary" onClick={on.nextPractice}>
              {p.index + 1 < p.total ? "Next practice question" : "I'm ready for two new questions"}
            </button>
          </>
        )}
      </main>
    );
  }
  if (snap.phase === "check") {
    const q = snap.question;
    return (
      <main className="page reading" data-phase="check">
        {head}
        <p className="pill">
          On your own: question {snap.position + 1} of {snap.total} · no hints · marked at the end
        </p>
        <PassageView passage={q.passage} />
        <p className="prompt" id="reading-prompt">
          {q.prompt}
        </p>
        <div className="options" role="radiogroup" aria-labelledby="reading-prompt">
          {q.options.map((o, i) => (
            <button key={`${q.id}:${i}`} type="button" role="radio" aria-checked={pick === i} className="option" onClick={() => setPick(i)}>
              {o}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="primary"
          disabled={pick === null}
          onClick={() => {
            if (pick === null) return;
            const i = pick;
            setPick(null);
            on.answerCheck(i);
          }}
        >
          {snap.position + 1 < snap.total ? "Lock in and go on" : "Lock in and see how I did"}
        </button>
      </main>
    );
  }
  if (snap.phase === "no_fresh_check")
    return (
      <main className="page reading" data-phase="no_fresh_check">
        {head}
        <h1 className="hero">No new questions left here</h1>
        <p className="sub">You have already seen every check question for this skill at this level. A question you have seen cannot show what you can do on your own, so none is repeated.</p>
        <button type="button" className="primary" onClick={() => on.open(snap.unit, "learn")}>
          Go over the lesson and practice
        </button>
        <button type="button" className="secondary" onClick={on.leave}>
          Choose another skill
        </button>
      </main>
    );
  const r = snap.result;
  const right = r.review.filter((x) => x.correct).length;
  return (
    <main className="page reading" data-phase="result">
      {head}
      <h1 className="hero">
        {right} of {r.review.length} right
      </h1>
      {r.label ? <p className="pill">{r.label}</p> : <p className="sub">Not yet. Look at what the text says below, then practise once more.</p>}
      <p className="small">{r.scope}</p>
      {r.review.map((x) => (
        <section key={x.question.id} className={`feedback ${x.correct ? "right" : "wrong"}`} aria-label={x.question.prompt}>
          <p className="small">{x.question.passage.title}</p>
          <p className="prompt">{x.question.prompt}</p>
          <p>
            <span className="verdict">{x.correct ? "Right: " : "You chose: "}</span>
            {x.question.options[x.choice]}
          </p>
          {!x.correct && (
            <p>
              <span className="verdict">Answer: </span>
              {x.question.options[x.right]}
            </p>
          )}
          <p>{x.explain}</p>
          <blockquote>{x.evidence}</blockquote>
        </section>
      ))}
      {r.next.kind === "level_up" && (
        <button type="button" className="primary" onClick={() => on.open((r.next as { unit: Unit }).unit, "learn")}>
          Go up to {levelName(course, r.next.unit.level)}
        </button>
      )}
      {r.next.kind === "step_back" && (
        <button type="button" className="primary" onClick={() => on.open((r.next as { unit: Unit }).unit, "learn")}>
          Step back to {levelName(course, r.next.unit.level)} first
        </button>
      )}
      {r.next.kind === "practise_again" && (
        <button type="button" className="primary" onClick={() => on.open(snap.unit, "learn")}>
          Practise again, then two new questions
        </button>
      )}
      {r.next.kind === "no_fresh_check" && <p className="sub">There are no new check questions left for this skill at this level. You can still go over the lesson and practice.</p>}
      {r.next.kind === "skill_complete" && <p className="sub">That is the top level of this skill.</p>}
      <button type="button" className="secondary" onClick={on.leave}>
        All reading skills
      </button>
    </main>
  );
}

export function Reading({ learner, onLeave, onChanged }: { learner: Learner; onLeave: () => void; onChanged: () => void }) {
  const [evidence,setEvidence]=useState(false);
  const [inference,setInference]=useState(false);
  const [session, setSession] = useState<ReadingUnitSession | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<ReadingRecord[]>([]);
  const records = learner.readingRecords();
  const p = useMemo(() => progress(COURSE, records), [records.length]);
  /**
   * Store what the step recorded, then show the result (a check question is saved as seen before it is displayed).
   * Records that could not be saved wait in order and go first on the next step.
   */
  const step = async (s: ReadingUnitSession, act?: () => void) => {
    const before = s.snapshot();
    act?.();
    unsaved.current.push(...s.take());
    try {
      while (unsaved.current.length) {
        await learner.recordReading([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    setTick((t) => t + 1);
    onChanged();
    const after = s.snapshot();
    const moved = before.phase !== after.phase || (before.phase === "practice" && after.phase === "practice" && before.practice.index !== after.practice.index) || (before.phase === "check" && after.phase === "check" && before.position !== after.position);
    if (moved || !act) scrollTo(0, 0);
  };
  const open = (u: Unit, mode: Mode) => {
    const s = new ReadingUnitSession(COURSE, u, mode, learner.readingRecords());
    setSession(s);
    void step(s);
  };
  if(inference)return <ReadingInference learner={learner} onBack={()=>setInference(false)} onChanged={onChanged}/>;
  if(evidence)return <ReadingEvidence learner={learner} onBack={()=>setEvidence(false)} onChanged={onChanged}/>;
  if (!session)
    return (
      <>
        <div className="page"><button className="secondary" onClick={()=>setEvidence(true)}>Answer and show why</button><button className="secondary" onClick={()=>setInference(true)}>Connect the clues</button></div>
        <ReadingMap course={COURSE} progress={p} start={asReadingLevel(learner.levels().reading?.start)} onOpen={open} onBack={onLeave} />
        <div className="page reading-note">
          <NoteBox learner={learner} screen="reading" label="Anything confusing or wrong on this screen? Tell us." />
        </div>
      </>
    );
  const s = session;
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next step will try again.
        </p>
      )}
      <ReadingUnitView
        key={`${unitKey(s.unit)}:${s.snapshot().phase}`}
        course={COURSE}
        snap={s.snapshot()}
        on={{
          nextStep: () => void step(s, () => s.nextStep()),
          startPractice: () => void step(s, () => s.startPractice()),
          hint: () => void step(s, () => s.hint()),
          answerPractice: (i) => void step(s, () => s.answerPractice(i)),
          nextPractice: () => void step(s, () => s.nextPractice()),
          answerCheck: (i) => void step(s, () => s.answerCheck(i)),
          open,
          leave: () => setSession(null),
        }}
      />
      <div className="page reading-note">
        <NoteBox learner={learner} screen={`reading:${unitKey(s.unit)}:${s.snapshot().phase}`} label="Was this text, question or explanation confusing or wrong? Tell us." />
      </div>
    </>
  );
}
