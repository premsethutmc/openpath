import { useState } from "react";
import { SyntheticWritingDemo } from "./SyntheticWritingDemo";
import {
  PASSAGE, QUESTIONS, WRITING_PROMPT, LESSONS, CHECKS,
  initialSession, validSession, answer, submitWriting, revise, report,
  type Session,
} from "../logic/exam-diagnostic/session";

export const EXAM_STORAGE_KEY = "openpath.exam-diagnostic@1";
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Compare the original storage value before every write: another tab must not be silently overwritten. */
export function examStore(storage: StorageLike) {
  let expected = storage.getItem(EXAM_STORAGE_KEY);
  return {
    load(): Session {
      if (expected === null) return initialSession();
      const parsed: unknown = JSON.parse(expected);
      if (!validSession(parsed)) throw new Error("Saved preview cannot be read. It has not been changed.");
      return parsed;
    },
    save(next: Session) {
      if (!validSession(next)) throw new Error("This preview could not be saved.");
      if (storage.getItem(EXAM_STORAGE_KEY) !== expected) throw new Error("This preview changed in another tab. Reload before saving; copy any unsaved writing first.");
      const raw = JSON.stringify(next);
      storage.setItem(EXAM_STORAGE_KEY, raw);
      expected = raw;
    },
    clear() {
      if (storage.getItem(EXAM_STORAGE_KEY) !== expected) throw new Error("This preview changed in another tab. Reload before clearing it.");
      storage.removeItem(EXAM_STORAGE_KEY);
      expected = null;
    },
  };
}

export function ExamDiagnostic({ storage }: { storage?: StorageLike }) {
  const [opened] = useState(() => {
    let store: ReturnType<typeof examStore> | undefined;
    try {
      store = examStore(storage ?? localStorage);
      return { store, session: store.load(), error: "" };
    } catch {
      return { store, session: null, error: "The saved preview could not be opened. It has been preserved. If storage is unavailable, enable it and reload." };
    }
  });
  const [session, setSession] = useState<Session | null>(opened.session);
  const [error, setError] = useState(opened.error);
  const [writing, setWriting] = useState(opened.session?.writing ?? "");
  const [revision, setRevision] = useState(opened.session?.revision ?? "");
  const [clearAsked, setClearAsked] = useState(false);
  const [skipAsked, setSkipAsked] = useState(false);
  const [notice, setNotice] = useState("");
  const [practice, setPractice] = useState<string | null>(null);
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);

  function change(make: (s: Session) => Session): boolean {
    if (!session || !opened.store) return false;
    try {
      const next = make(session);
      opened.store.save(next);
      setSession(next);
      setError("");
      setNotice("Saved on this device.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Keep this page open and copy your writing.");
      return false;
    }
  }
  function clear() {
    if (!opened.store) return;
    try {
      opened.store.clear();
      setSession(initialSession());
      setWriting(""); setRevision(""); setPractice(null); setPracticeAnswer(null);
      setClearAsked(false); setSkipAsked(false); setError(""); setNotice("This preview was cleared. Other OpenPath work was not changed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear this preview.");
    }
  }
  return <main className="welcome" data-exam-diagnostic="1">
    <h1>English: reading and writing preview</h1>
    <p>Two short exercises to explore your reading and written explanation. Allow about ten minutes; this version is untimed.</p>
    <p>This is original exam-oriented practice, not an official CAT, GRE, UPSC or TNPSC test. It does not predict a score, percentile or admission outcome.</p>
    <p className="small">Your work stays on this device. No model is called and your writing is not sent anywhere. Writing analysis is not connected in this preview. Avoid personal details. If you have seen these questions before, treat this as practice rather than fresh evidence.</p>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {clearAsked ? <section aria-labelledby="clear-preview-title">
      <h2 id="clear-preview-title">Clear this preview?</h2>
      <p>This removes its saved answers and writing, including unsaved text on this page. It does not affect other OpenPath work.</p>
      <button type="button" onClick={() => setClearAsked(false)}>Keep my work</button>{" "}
      <button type="button" onClick={clear}>Clear this preview</button>
    </section> : <>
      {skipAsked && <section aria-labelledby="skip-title"><h2 id="skip-title">Skip your written explanation?</h2><p>Your typed explanation will not be saved.</p><button type="button" onClick={() => setSkipAsked(false)}>Keep writing</button>{" "}<button type="button" onClick={() => { if (change(s => submitWriting(s, ""))) { setWriting(""); setSkipAsked(false); } }}>Discard writing and skip</button></section>}
      {session && !skipAsked && <ExamDiagnosticView session={session} writing={writing} revision={revision}
        onWriting={setWriting} onRevision={setRevision}
        onAnswer={(id, index) => change(s => answer(s, id, index))}
        onSubmit={() => change(s => submitWriting(s, writing))}
        onSkip={() => { if (writing.trim()) setSkipAsked(true); else change(s => submitWriting(s, "")); }}
        onRevise={() => change(s => revise(s, revision))} />}
      {session?.phase === "report" && <section aria-labelledby="practice-heading">
        <h2 id="practice-heading">Try a targeted lesson</h2>
        <p>These optional activities are supported practice, not a verified improvement or independent proficiency result. Practice responses are not saved.</p>
        {report(session).map(row => <button type="button" key={row.skill} onClick={() => { setPractice(row.skill); setPracticeAnswer(null); }}>{row.skill}: lesson and practice</button>)}
        {practice && <section key={practice}>
          <h3>{practice}</h3><p>{LESSONS[practice]}</p>
          {CHECKS.filter(q => q.skill === practice).slice(0, 1).map(q => <div key={q.id}>
            <p>{q.passage}</p><fieldset disabled={practiceAnswer !== null}><legend>{q.prompt}</legend>
              {q.options.map((option, i) => <button type="button" key={i} onClick={() => setPracticeAnswer(i)}>{option}</button>)}
            </fieldset>
            {practiceAnswer !== null && <div role="status"><p>Your choice: {q.options[practiceAnswer]}</p><p>{practiceAnswer === q.answer ? "That matches this example." : "Compare your choice with the explanation."}</p><p>Matching answer: {q.options[q.answer]}</p><p>{q.explanation}</p><blockquote>{q.quote}</blockquote></div>}
          </div>)}
        </section>}
      </section>}
      <details><summary>Explore the offline synthetic writing example</summary><SyntheticWritingDemo /></details>
      {opened.store && <button type="button" className="secondary" onClick={() => setClearAsked(true)}>Clear only this preview</button>}
      <p><a href="/">Return to OpenPath</a></p>
      {(session?.phase === "writing" || session?.phase === "report") && <p className="small">Typing is not saved until you submit or save it. Copy any unsaved text before leaving or reloading.</p>}
    </>}
  </main>;
}

export function ExamDiagnosticView({ session, writing, revision, onWriting, onRevision, onAnswer, onSubmit, onSkip, onRevise }: {
  session: Session; writing: string; revision: string;
  onWriting: (text: string) => void; onRevision: (text: string) => void;
  onAnswer: (id: string, index: number) => void; onSubmit: () => void; onSkip: () => void; onRevise: () => void;
}) {
  const question = QUESTIONS.find(q => session.answers[q.id] === undefined);
  return <>
    {session.phase !== "report" && <section aria-labelledby="passage-heading"><h2 id="passage-heading">Read the passage</h2><p style={{ whiteSpace: "pre-line" }}>{PASSAGE}</p></section>}
    {session.phase === "reading" && question && <section>
      <p>Question {Object.keys(session.answers).length + 1} of {QUESTIONS.length}</p>
      <fieldset key={question.id}><legend>{question.prompt}</legend>{question.options.map((option, index) => <button key={index} type="button" onClick={() => onAnswer(question.id, index)}>{option}</button>)}</fieldset>
      <p>Submit one answer to continue. Explanations appear after both exercises.</p>
    </section>}
    {session.phase === "writing" && <section>
      <h2>Explain your reasoning</h2><p>{WRITING_PROMPT}</p>
      <label htmlFor="exam-writing">Your written explanation (aim for 100–180 words; 50–250 accepted)</label>
      <textarea id="exam-writing" rows={9} value={writing} onChange={e => onWriting(e.target.value)} />
      <button type="button" onClick={onSubmit}>Save explanation and see reading feedback</button>{" "}
      <button type="button" className="secondary" onClick={onSkip}>Skip writing and see reading feedback</button>
    </section>}
    {session.phase === "report" && <section>
      <h2>Your initial evidence</h2><p>These findings concern these few questions only. One response is not enough to diagnose a lasting gap.</p>
      {report(session).map(row => <article key={row.skill}><h3>{row.skill}</h3><p>{row.status === "supported" ? "Supported on this question" : "Possible gap to check"}</p><p>{row.detail}</p><blockquote>{row.quote}</blockquote></article>)}
      <h2>Your writing</h2>
      {session.writing ? <><p>Saved, not assessed. Grammar, vocabulary, organisation, source accuracy and reasoning quality are still unknown. No model analysis has run.</p><blockquote style={{ whiteSpace: "pre-wrap" }}>{session.writing}</blockquote>
        <details><summary>Compare with the original passage and task</summary><p>{PASSAGE}</p><p>{WRITING_PROMPT}</p></details>
        <p>Use the reading explanations to revise your argument: identify what the evidence supports, what it cannot prove, and what extra information would help.</p>
        <label htmlFor="exam-revision">Optional revision (saved separately, not graded)</label><textarea id="exam-revision" rows={8} value={revision} onChange={e => onRevision(e.target.value)} />
        <button type="button" onClick={onRevise}>Save revision</button>
        {session.revision && <p>Revision saved. Saving does not mean it has improved.</p>}
      </> : <p>No writing was submitted. Writing ability is unassessed.</p>}
      <p>Speaking and listening were not tested. Broader English ability, exam readiness and predicted scores remain unknown.</p>
    </section>}
  </>;
}
