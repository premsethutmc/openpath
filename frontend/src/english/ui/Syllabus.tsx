/**
 * A school syllabus for English (logic/syllabus): each line the board lists for the class, in OpenPath's own words,
 * marked as practised in the app, partly practised, or not yet; with a button to the stream that practises it.
 */
import { useState } from "react";
import { GRAMMAR } from "../logic/grammar-use/grammar-use.ts";
import { BOARDS, boardOf, coverage, taskLine, type Board, type Coverage, type Outcome, type Syllabus as Doc, type Where } from "../logic/syllabus/syllabus.ts";

const TAG: Record<Coverage, string> = { covered: "In the app", partly: "Partly", guided: "With a grown-up", not: "Not yet" };
const GO: Record<Where, string> = { words: "New words", reading: "Reading", listening: "Listen and write", listen: "Listen and answer", spelling: "Spelling Bee", grammar: "Grammar in use", guided: "Tasks with a grown-up", writing: "Essay studio", first: "First words", passage: "Listen and write a passage", passage_seen: "Read a passage, then write it from dictation", long: "Long reads", written: "Write an answer", kinds: "Poems and everyday texts", study: "Notes, charts and maps" };

export function SyllabusView({ docs, initial, initialBoard = "icse", onOpen, onBack }: { docs: Doc[]; initial: number; initialBoard?: Board; onOpen: (where: Where, topics: string[] | undefined, cls: number, line: { syllabus: string; outcome: string; text: string }, board: Board) => void; onBack: () => void }) {
  const [cls, setCls] = useState(initial);
  const boards = BOARDS.filter((b) => docs.some((d) => boardOf(d) === b.id));
  const [board, setBoard] = useState<Board>(boards.some((b) => b.id === initialBoard) ? initialBoard : (boards[0]?.id ?? "icse"));
  const ofBoard = docs.filter((d) => boardOf(d) === board);
  const doc = ofBoard.find((d) => d.class === cls) ?? ofBoard.find((d) => d.class === 5) ?? ofBoard[0];
  const [source, setSource] = useState(false);
  const c = coverage(doc);
  const topicNames = (o: Outcome) => (o.topics ?? []).map((t) => GRAMMAR.topics.find((x) => x.id === t)?.name ?? t).join(", ");
  return (
    <main className="page vocab syllabus" aria-labelledby="syllabus-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">School work · {doc.board}</p>
      {boards.length > 1 && (
        <div className="syllabus-classes" role="group" aria-label="Board">
          {boards.map((b) => (
            <button key={b.id} type="button" className={b.id === board ? "chip on" : "chip"} aria-pressed={b.id === board} onClick={() => setBoard(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
      )}
      {ofBoard.length > 1 && (
        <div className="syllabus-classes" role="group" aria-label="Class">
          {ofBoard.map((d) => (
            <button key={d.class} type="button" className={d.class === doc.class ? "chip on" : "chip"} aria-pressed={d.class === doc.class} onClick={() => setCls(d.class)}>
              Class {d.class}
            </button>
          ))}
        </div>
      )}
      <h1 id="syllabus-title" className="hero">
        Class {doc.class} English
      </h1>
      <p className="sub">What the board lists for this class, and where to practise it here.</p>
      <p className="pill" data-coverage>
        {c.covered} in the app · {c.partly} partly{c.guided ? ` · ${c.guided} with a grown-up` : ""} · {c.not} not yet (of {c.total})
      </p>
      {doc.strands.map((st) => (
        <section key={st.id} className="syllabus-strand" aria-labelledby={`strand-${st.id}`}>
          <h2 id={`strand-${st.id}`}>{st.name}</h2>
          <ul>
            {st.outcomes.map((o) => (
              <li key={o.id} data-outcome={o.id} data-coverage={o.coverage}>
                <p>
                  <span className={`syllabus-tag ${o.coverage}`}>{TAG[o.coverage]}</span> {o.text}
                </p>
                {(o.note || o.topics) && <p className="small">{[o.topics ? `Practised as: ${topicNames(o)}.` : "", o.note ?? ""].filter(Boolean).join(" ")}</p>}
                {o.where && (
                  <button type="button" className="secondary" aria-label={`Practise ${o.id}: ${GO[o.where]}`} onClick={() => onOpen(o.where!, o.topics, doc.class, { ...taskLine(doc, o), text: o.text }, board)}>
                    {o.where === "guided" || o.where === "writing" ? "Open" : "Practise"}: {GO[o.where]}
                  </button>
                )}
                {o.also?.map((w) => (
                  <button key={w} type="button" className="secondary" aria-label={`Also practise ${o.id}: ${GO[w]}`} onClick={() => onOpen(w, undefined, doc.class, { ...taskLine(doc, o), text: o.text }, board)}>
                    Also: {GO[w]}
                  </button>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <button type="button" className="link" aria-expanded={source} onClick={() => setSource(!source)}>
        Where this list comes from
      </button>
      {source && (
        <div className="small syllabus-source">
          <p>{doc.source.read} (read {doc.source.accessed}).</p>
          <p>{doc.source.note}</p>
          <p>{doc.licence}</p>
          <p>{doc.review}.</p>
        </div>
      )}
    </main>
  );
}
