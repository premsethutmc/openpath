/**
 * My Books: a parent pastes a book's text (or opens a plain-text file); the app finds spelling words, fill-the-gap
 * vocabulary questions and comprehension questions in that text only (logic/books.ts); the parent ticks the ones the
 * learner may see and saves. The learner practises the approved spelling words with the Spelling Bee's screen and
 * answers the approved questions here. The text stays in this learner's record on this device.
 */
import { type ChangeEvent, type ReactElement, useMemo, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { type Book, type BookQuestion, type BookSkill, type Extraction, BOOK_LIMITS, SKILL_LABELS, approvedActivities, bookWords, tidyText } from "../logic/books.ts";
import { keptWhere } from "./MyWords.tsx";
import { sourceProgress } from "../logic/spelling.ts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function MyBooks({ learner, onSpelling, onQuestions, onLeave, onChanged }: { learner: Learner; onSpelling: (b: Book) => void; onQuestions: (b: Book) => void; onLeave: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState<Book | "new" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  if (editing) return <BookEditor learner={learner} book={editing === "new" ? null : editing} onDone={() => (setEditing(null), onChanged())} />;
  const list = learner.books();
  const st = learner.spelling();
  return (
    <main className="page my-words my-books" aria-labelledby="mybooks-title">
      <p>
        <button type="button" className="link" onClick={onLeave}>
          ← Home
        </button>
      </p>
      <p className="eyebrow">Books from a parent</p>
      <h1 id="mybooks-title" className="hero">
        My Books
      </h1>
      <p className="sub">Paste the text of a book the learner is reading. OpenPath finds spelling words and questions in that text; you choose which ones the learner sees.</p>
      <p className="small where-kept">{keptWhere(learner, "Books", "its text")}</p>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      <button type="button" className="primary" onClick={() => setEditing("new")}>
        Add a book
      </button>
      {list.length === 0 ? (
        <p className="tile">No books yet.</p>
      ) : (
        <ul className="word-lists books">
          {list.map((b) => {
            const ex = learner.bookActivities(b);
            const ok = approvedActivities(b, ex);
            const sp = sourceProgress(st, bookWords(b, ex), learner.clock());
            const q = learner.bookQuestions(b.id).progress;
            return (
              <li key={b.id} className="tile" data-book={b.id}>
                <h2>{b.title}</h2>
                {!b.reviewed ? (
                  <p className="small warning">Not reviewed yet: the learner sees nothing from this book.</p>
                ) : (
                  <p className="small">
                    Approved: {plural(ok.spelling.length, "spelling word")} · {plural(ok.questions.length, "question")}
                    {ok.spelling.length > 0 && ` · spelling practised ${sp.practised} of ${sp.total}${sp.reviewList ? `, ${sp.reviewList} to review` : ""}`}
                    {ok.questions.length > 0 && ` · questions ${q.right} of ${q.total} right`}
                  </p>
                )}
                <div className="row">
                  {ok.spelling.length > 0 && (
                    <button type="button" className="primary" onClick={() => onSpelling(b)}>
                      Practise spelling
                    </button>
                  )}
                  {ok.questions.length > 0 && (
                    <button type="button" className="primary" onClick={() => onQuestions(b)}>
                      Answer questions
                    </button>
                  )}
                  <button type="button" className="secondary" onClick={() => setEditing(b)}>
                    Review
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    onClick={async () => {
                      if (!window.confirm(`Delete "${b.title}"? Its text, and the activities found in it, are removed from the learner's record. The learner's answers stay, without the book's words.`)) return;
                      try {
                        setProblem(null);
                        await learner.deleteBook(b.id);
                      } catch (e) {
                        setProblem(`The book was not deleted: ${e instanceof Error ? e.message : "it could not be removed"}. Try again.`);
                      }
                      onChanged();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="small">
        How activities are found: by fixed rules, from this text only. No AI, no internet, and no meanings from a dictionary. Photos and PDFs cannot be read; paste the text, or open a .txt file.
      </p>
    </main>
  );
}

function BookEditor({ learner, book, onDone }: { learner: Learner; book: Book | null; onDone: () => void }) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [text, setText] = useState(book?.text ?? "");
  const [found, setFound] = useState<{ text: string; ex: Extraction } | null>(book ? { text: tidyText(book.text), ex: learner.bookActivities(book) } : null);
  const [chosen, setChosen] = useState<Set<string>>(new Set(book?.reviewed ? book.approved : []));
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stale = found !== null && found.text !== tidyText(text);

  const find = () => {
    const t = tidyText(text);
    if (!t) return setProblem("Paste the book's text first.");
    if (t.length > BOOK_LIMITS.chars) return setProblem(`This text has ${t.length.toLocaleString("en-GB")} characters; My Books takes up to ${BOOK_LIMITS.chars.toLocaleString("en-GB")} (a few chapters). Nothing was cut: shorten the text, or add it as more than one book.`);
    setProblem(null);
    const ex = learner.bookActivities({ text: t });
    // a different text means a fresh review: nothing stays ticked from before
    if (!found || found.text !== t) setChosen(new Set());
    setFound({ text: t, ex });
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > BOOK_LIMITS.fileBytes) return setProblem(`That file is too big (at most ${Math.round(BOOK_LIMITS.fileBytes / 1000)} KB).`);
    if (!/\.txt$/i.test(f.name) && f.type !== "text/plain") return setProblem("Choose a plain-text (.txt) file. Word files, PDFs and photos cannot be read: copy the text and paste it instead.");
    setProblem(null);
    setText(await f.text());
    if (!title.trim()) setTitle(f.name.replace(/\.txt$/i, "").slice(0, BOOK_LIMITS.titleLength));
  };
  const toggle = (id: string) => setChosen((s) => (s.has(id) ? (s.delete(id), new Set(s)) : new Set(s.add(id))));
  const setAll = (ids: string[], on: boolean) => setChosen((s) => new Set(on ? [...s, ...ids] : [...s].filter((x) => !ids.includes(x))));
  const save = async () => {
    if (!found || stale) return;
    setBusy(true);
    try {
      await learner.saveBook(title, found.text, [...chosen], book?.id);
      onDone();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Could not save the book");
    } finally {
      setBusy(false);
    }
  };
  const textChanged = book && book.reviewed === false && book.approved.size === 0 && learner.events.some((e) => e.kind === "book_review" && e.book === book.id);

  return (
    <main className="page my-words my-books" aria-labelledby="book-editor-title">
      <p>
        <button type="button" className="link" onClick={onDone}>
          ← My Books
        </button>
      </p>
      <h1 id="book-editor-title" className="hero">
        {book ? "Review the book" : "Add a book"}
      </h1>
      {textChanged && <p className="warning">The text changed after it was last reviewed, so nothing from it is shown to the learner until you approve activities again.</p>}
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={BOOK_LIMITS.titleLength} placeholder="For example: The Lantern on the Hill" autoComplete="off" />
      </label>
      <label className="field">
        <span>The book's text: paste a chapter or a short story (up to {BOOK_LIMITS.chars.toLocaleString("en-GB")} characters)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} spellCheck={false} />
      </label>
      <label className="field file">
        <span>Or open a plain-text (.txt) file</span>
        <input type="file" accept=".txt,text/plain" onChange={(e) => void onFile(e)} />
      </label>
      <button type="button" className="secondary" onClick={find}>
        Find activities
      </button>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      {found && <Review ex={found.ex} chosen={chosen} toggle={toggle} setAll={setAll} stale={stale} />}
      <button type="button" className="primary" disabled={busy || !found || stale || !title.trim()} onClick={() => void save()}>
        {chosen.size ? `Save and approve ${plural(chosen.size, "activity", "activities")}` : "Save without approving anything"}
      </button>
    </main>
  );
}

function Review({ ex, chosen, toggle, setAll, stale }: { ex: Extraction; chosen: Set<string>; toggle: (id: string) => void; setAll: (ids: string[], on: boolean) => void; stale: boolean }) {
  const questions = [...ex.vocabulary, ...ex.comprehension];
  const of = (skill: BookSkill) => questions.filter((q) => q.skill === skill);
  const preview = (id: string) => <QuestionPreview q={questions.find((x) => x.id === id)!} />;
  const groups: { key: BookSkill; title: string; note: string; ids: string[]; body: (id: string) => ReactElement }[] = [
    {
      key: "spelling",
      ...SKILL_LABELS.spelling,
      ids: ex.spelling.map((s) => s.id),
      body: (id) => {
        const s = ex.spelling.find((x) => x.id === id)!;
        return (
          <>
            <strong className="written">{s.word}</strong>
            <span className="small">{s.sentence ? ` Spoken with: “${s.sentence}”` : " Spoken on its own (its sentence is too long)."}</span>
          </>
        );
      },
    },
    ...(["vocabulary-in-context", "literal-comprehension", "sequencing"] as const).map((key) => ({ key, ...SKILL_LABELS[key], ids: of(key).map((q) => q.id), body: preview })),
  ];
  return (
    <section className="tile book-review" aria-labelledby="book-review-title" aria-live="polite">
      <h2 id="book-review-title">
        Found {plural(ex.spelling.length, "spelling word")}, {plural(ex.vocabulary.length + ex.comprehension.length, "question")}
      </h2>
      <p className="small">
        Four kinds, named for what they practise. None of them is inferential comprehension (reasons, feelings, predictions): these rules cannot write those.
      </p>
      <p className="small">
        From {plural(ex.words, "word")} in {plural(ex.sentences, "sentence")}. Tick what the learner may see; anything not ticked stays hidden. Check each one: the rules can make a poor question (for example, a gap two choices could fill).
      </p>
      {stale && <p className="warning">The text was changed: press "Find activities" again before saving.</p>}
      {ex.notes.length > 0 && (
        <ul className="small notes">
          {ex.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      {groups
        .filter((g) => g.ids.length)
        .map((g) => (
          <fieldset key={g.key} className="review-group">
            <legend>
              {g.title} ({g.ids.filter((i) => chosen.has(i)).length} of {g.ids.length} ticked)
            </legend>
            <p className="small">{g.note}</p>
            <div className="row">
              <button type="button" className="link" onClick={() => setAll(g.ids, true)}>
                Tick all: {g.title.toLowerCase()}
              </button>
              <button type="button" className="link" onClick={() => setAll(g.ids, false)}>
                Untick all
              </button>
            </div>
            <ul>
              {g.ids.map((id) => (
                <li key={id}>
                  <label className="check">
                    <input type="checkbox" checked={chosen.has(id)} onChange={() => toggle(id)} data-activity={id} />
                    <span>{g.body(id)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
    </section>
  );
}

function QuestionPreview({ q }: { q: BookQuestion }) {
  return (
    <>
      <span className="small">{q.prompt}</span>
      {q.text && <q className="book-quote">{q.text}</q>}
      <span className="small">
        {" "}
        Choices: {q.options.map((o) => (o === q.answer ? `${o} (answer)` : o)).join(" · ")}
      </span>
    </>
  );
}

/** The learner answers a book's approved questions, one at a time, with the answer shown after each. */
export function BookQuestions({ learner, book, onLeave, onChanged }: { learner: Learner; book: Book; onLeave: () => void; onChanged: () => void }) {
  const plan = useMemo(() => learner.bookQuestions(book.id).plan, [learner, book.id]);
  const [k, setK] = useState(0);
  const [result, setResult] = useState<{ chose: string; correct: boolean; answer: string } | null>(null);
  const [right, setRight] = useState(0);
  const [busy, setBusy] = useState(false);
  const q = plan[k];
  const choose = async (o: string) => {
    if (!q || result || busy) return;
    setBusy(true);
    try {
      const r = await learner.answerBookQuestion(book.id, q.id, o);
      setResult({ chose: o, ...r });
      if (r.correct) setRight((n) => n + 1);
      onChanged();
    } finally {
      setBusy(false);
    }
  };
  const back = (
    <p>
      <button type="button" className="link" onClick={onLeave}>
        ← My Books
      </button>
    </p>
  );
  if (!q)
    return (
      <main className="page book-quiz" aria-labelledby="quiz-title">
        {back}
        <section className="tile bee-done">
          <h1 id="quiz-title" className="hero">
            {plan.length ? "All done" : "No questions yet"}
          </h1>
          {plan.length > 0 && <p>{`${right} of ${plan.length} right.`}</p>}
          <button type="button" className="primary" onClick={onLeave}>
            Back to My Books
          </button>
        </section>
      </main>
    );
  return (
    <main className="page book-quiz" aria-labelledby="quiz-title">
      {back}
      <p className="eyebrow">
        {book.title} · {SKILL_LABELS[q.skill].title}
      </p>
      <p className="small">
        Question {k + 1} of {plan.length}
      </p>
      <h1 id="quiz-title" className="hero">
        {q.prompt}
      </h1>
      {q.text && <blockquote className="book-quote">{q.text}</blockquote>}
      <div className="options" role="group" aria-label="Choices">
        {q.options.map((o) => (
          <button key={o} type="button" className={`option ${result ? (o === result.answer ? "is-right" : o === result.chose ? "is-wrong" : "") : ""}`} disabled={!!result || busy} onClick={() => void choose(o)}>
            {o}
          </button>
        ))}
      </div>
      {result && (
        <section className={`feedback ${result.correct ? "right" : "wrong"}`} role="status" aria-live="polite">
          <h2 className="verdict">{result.correct ? "Right!" : "Not quite."}</h2>
          {!result.correct && (
            <p>
              The answer is <strong>{result.answer}</strong>.
            </p>
          )}
          <button
            type="button"
            className="primary"
            autoFocus
            onClick={() => {
              setResult(null);
              setK(k + 1);
            }}
          >
            {k + 1 < plan.length ? "Next question" : "See how you did"}
          </button>
        </section>
      )}
    </main>
  );
}
