/** owner-view@1: the owner's maths view at /owner/: per topic, the review figures and everything a learner is told. */
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { sampleOf, search, skillsOf, topicName, topics, totalsOf, type Skill } from "./data";
import "./owner.css";

function Tile({ n, of, label }: { n: number; of?: number; label: string }) {
  return <div className="tile"><b>{n}{of !== undefined ? <small> / {of}</small> : null}</b><span>{label}</span></div>;
}

function SkillCard({ s }: { s: Skill }) {
  const [open, setOpen] = useState(false);
  const samples = useMemo(() => (open ? s.families.map(sampleOf).filter((x) => x !== null) : []), [open, s]);
  return (
    <details className="skill" onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="skill-title">{s.title}</span>
        <span className="skill-meta">{s.cls ? `Class ${s.cls} · ` : ""}{s.screens.length} screens · {s.families.length} question types{s.corrected ? ` · ${s.corrected} fixed by review` : ""}{s.certified < s.families.length ? ` · ${s.families.length - s.certified} not certified` : ""}</span>
      </summary>
      {open && <>
        <h3>Lesson screens</h3>
        {s.screens.map((x, i) => (
          <section className="screen" key={i}>
            <p className="eyebrow">{x.section}{x.corrected ? " · fixed by review" : ""}</p>
            {x.title && <h4>{x.title}</h4>}
            {x.text.map((t, j) => <p key={j}>{t}</p>)}
            {x.math.length > 0 && <div className="math">{x.math.map((t, j) => <div key={j}>{t}</div>)}</div>}
          </section>
        ))}
        <h3>Question types and wrong-answer feedback</h3>
        {samples.map((q) => (
          <section className="screen" key={q!.family}>
            <p className="eyebrow">{q!.title}{q!.certified ? " · answers certified" : " · not certified"}</p>
            <p><b>Sample:</b> {q!.question}</p>
            <p><b>Answer:</b> {q!.answer}</p>
            {q!.mistakes.length > 0 && <ul>{q!.mistakes.map((m, j) => <li key={j}>If the answer is <b>{m.wrong}</b>: {m.says}</li>)}</ul>}
          </section>
        ))}
      </>}
    </details>
  );
}

function App() {
  const [topic, setTopic] = useState(topics[0]);
  const [q, setQ] = useState("");
  const all = useMemo(() => skillsOf(topic), [topic]);
  const shown = useMemo(() => search(all, q), [all, q]);
  const t = totalsOf(all);
  return (
    <main className="owner">
      <h1>Maths, topic by topic</h1>
      <p className="muted">Everything a learner is told, and where the checks stand. This page always shows the version that is live.</p>
      <nav className="chips" aria-label="Topics">{topics.map((x) => <button key={x} className={x === topic ? "chip on" : "chip"} onClick={() => { setTopic(x); setQ(""); }}>{topicName(x)}</button>)}</nav>
      <h2>{topicName(topic)}</h2>
      <div className="tiles">
        <Tile n={t.skills} label="skills" />
        <Tile n={t.screens} label="lesson screens read by AI review" />
        <Tile n={t.corrected} label="screens fixed by review" />
        <Tile n={t.certified} of={t.families} label="question types with certified answers" />
      </div>
      <input className="search" type="search" placeholder={`Search ${topicName(topic).toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      {shown.map((s) => <SkillCard key={s.competency} s={s} />)}
      {shown.length === 0 && <p className="muted">Nothing matches.</p>}
    </main>
  );
}

const el = typeof document !== "undefined" ? document.getElementById("root") : null;
if (el) createRoot(el).render(<App />);
