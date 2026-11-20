/**
 * A school syllabus for English (logic/syllabus): each line the board lists for the class, in OpenPath's own words,
 * marked as practised in the app, partly practised, or not yet; with a button to the stream that practises it.
 */
import { useState } from "react";
import { GRAMMAR } from "../logic/grammar-use/grammar-use.ts";
import { coverage, type Coverage, type Outcome, type Syllabus as Doc, type Where } from "../logic/syllabus/syllabus.ts";

const TAG: Record<Coverage, string> = { covered: "In the app", partly: "Partly", guided: "With a grown-up", not: "Not yet" };
const GO: Record<Where, string> = { words: "New words", reading: "Reading", listening: "Listen and write", listen: "Listen and answer", spelling: "Spelling Bee", grammar: "Grammar in use", guided: "Tasks with a grown-up", writing: "Essay studio", first: "First words", passage: "Listen and write a passage", passage_seen: "Read a passage, then write it from dictation", long: "Long reads" };

export function SyllabusView({ docs, initial, onOpen, onBack }: { docs: Doc[]; initial: number; onOpen: (where: Where, topics: string[] | undefined, cls: number, line: { syllabus: string; outcome: string; text: string }) => void; onBack: () => void }) {
  const [cls, setCls] = useState(initial);
  const doc = docs.find((d) => d.class === cls) ?? docs[0];
  const [source, setSource] = useState(false);
  const c = coverage(doc);
  const topicNames = (o: Outcome) => (o.topics ?? []).map((t) => GRAMMAR.topics.find((x) => x.id === t)?.name ?? t).join(", ");
  return (
    <main className="page vocab syllabus" aria-labelledby="syllabus-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">School work · {doc.board}</p>
      {docs.length > 1 && (
        <div className="syllabus-classes" role="group" aria-label="Class">
          {docs.map((d) => (
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
                  <button type="button" className="secondary" aria-label={`Practise ${o.id}: ${GO[o.where]}`} onClick={() => onOpen(o.where!, o.topics, doc.class, { syllabus: doc.id, outcome: o.id, text: o.text })}>
                    {o.where === "guided" || o.where === "writing" ? "Open" : "Practise"}: {GO[o.where]}
                  </button>
                )}
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
