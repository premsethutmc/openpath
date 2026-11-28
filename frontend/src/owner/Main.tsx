/** owner-view@1: the owner's maths view at /owner/: per topic, the review figures and everything a learner is told. */
import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { sampleOf, search, skillsOf, topicName, topics, totalsOf, type Skill } from "./data";
import { FoundationCard, SteppedMath } from "../year/StartHere";
import { Picture } from "../year/Learn";
import { PictureExplore, PictureRound } from "../year/PictureTasks";
import { picturesOf } from "../../../packages/learning/src/foundations";
import "../year/scene.css";
import "../year/start-here.css";
import "../year/matrix-text.css";
import "../year/start-here.css";
import { mx } from "../year/MatrixText";
import "./owner.css";
import changes from "../../../content/owner/changes.v1.json";
import lab from "../../../content/owner/child-lab.v1.json";
import { stepWhys } from "../../../packages/learning/src/families";

/** one draw per page load: the picture questions change when the page is opened again, not while it is being read */
const SEED = Math.floor(Math.random() * 1e9);

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
        <span className="skill-meta">{s.cls ? `Class ${s.cls} · ` : ""}{s.foundations.length ? `starts with ${s.foundations.map((f) => f.concept).join(", ")} · ` : ""}{s.screens.length} screens · {s.families.length} question types{s.corrected ? ` · ${s.corrected} fixed by review` : ""}{s.certified < s.families.length ? ` · ${s.families.length - s.certified} not certified` : ""}</span>
      </summary>
      {open && <>
        <p><a className="child-link" data-child-view href={`/year/#try-skill=${encodeURIComponent(s.competency)}`} target="_blank" rel="noreferrer">Open as a child ↗</a> <span className="muted small">The same screens and questions a child gets, one at a time. Nothing is saved.</span></p>
        {s.foundations.length > 0 && <><h3>Start here (shown before the lesson)</h3>{s.foundations.map((f, k) => <div className="sh" key={k}><p className="muted small">{f.concept}: {!f.show ? "has a picture" : f.show.decision === "none" ? `no picture needed (it is a ${f.show.why})` : `no picture yet: needs a new figure in the engine (${f.show.figure})`}</p>{f.screens.map((x, i) => <FoundationCard key={i} s={x} />)}{picturesOf(f).map((p) => <PictureExplore key={p} kind={p} seed={SEED} />)}{picturesOf(f).map((p) => <PictureRound key={p} kind={p} seed={SEED} />)}{f.practice?.length ? <section className="sh-card"><p className="sh-eyebrow">Answer key for the practice on this idea (a child gets these one at a time, with no answers showing): {1 + (f.rounds?.length ?? 0)} rounds of {f.practice.length}, a new round each visit</p>{[f.practice, ...(f.rounds ?? [])].flat().map((q, i) => <div className="sh-answer-key" key={i}><p><b>{i + 1}. {q.question}</b></p><ul>{q.options.map((o, j) => <li key={j}>{j === q.answer ? <b>{o} ✓ {q.why}</b> : <>{o}: {q.wrong[j]}</>}</li>)}</ul></div>)}</section> : null}</div>)}</>}
        <h3>Lesson screens</h3>
        {s.screens.map((x, i) => (
          <section className="screen" key={i}>
            <p className="eyebrow">{x.section}{x.corrected ? " · fixed by review" : ""}</p>
            {x.title && <h4>{x.title}</h4>}
            {x.text.map((t, j) => <p key={j}>{mx(t)}</p>)}
            {x.picture && <Picture w={x.picture} competency={s.competency} />}
            {x.math.length >= 3 ? <SteppedMath lines={x.math} whys={stepWhys(x.instance)} qid={x.instance} /> : x.math.length > 0 && <div className="math">{x.math.map((t, j) => <div key={j}>{mx(t)}</div>)}</div>}
          </section>
        ))}
        <h3>Question types and wrong-answer feedback</h3>
        {samples.map((q) => (
          <section className="screen" key={q!.family}>
            <p className="eyebrow">{q!.title}{q!.certified ? " · answers certified" : " · not certified"}</p>
            <p><b>Sample:</b> {mx(q!.question)}</p>
            <p><b>Answer:</b> {mx(q!.answer)}</p>
            {q!.mistakes.length > 0 && <ul>{q!.mistakes.map((m, j) => <li key={j}>If the answer is <b>{mx(m.wrong)}</b>: {mx(m.says)}</li>)}</ul>}
          </section>
        ))}
      </>}
    </details>
  );
}

/** changes@1: what changed, newest first, each with the exact place to look. */
function Changes() {
  return (
    <section className="changes" data-changes>
      {changes.entries.map((c, i) => (
        <article className="change" key={i}>
          <p className="muted small">{c.date} · {c.status === "live" ? "live" : "not live yet: " + c.status}{c.pr ? <> · <a href={`https://github.com/premsethutmc/openpath/pull/${c.pr}`} target="_blank" rel="noreferrer">PR #{c.pr}</a></> : null}{c.commit ? ` · ${c.commit}` : ""}</p>
          <h3>{c.title}</h3>
          <p>{c.what}</p>
          <ul className="plain">{c.links.map((l, j) => <li key={j}><a className="child-link" href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a></li>)}</ul>
        </article>
      ))}
    </section>
  );
}

/** child-lab@1: the simulated children with real slips, run on every change; what the app did for each. */
function Lab() {
  const all = lab.scenarios as { id: string; title: string; child: string; expected: string; gap?: string; pass: boolean; questions: number; checks: { name: string; ok: boolean }[] }[];
  const passed = all.filter((x) => x.pass).length;
  return (
    <section className="changes" data-lab>
      <div className="tiles"><Tile n={passed} of={all.length} label="scenarios the app handles" /><Tile n={all.length - passed} label="known gaps being fixed" /></div>
      {all.map((x) => (
        <article className="change" key={x.id}>
          <p className="muted small">{x.id} · {x.pass ? "handled" : "known gap"} · {x.questions} questions</p>
          <h3>{x.pass ? "✓" : "✗"} {x.title}</h3>
          <p className="muted">The child {x.child}.</p>
          <ul className="plain">{x.checks.map((k, j) => <li key={j}>{k.ok ? "✓" : "✗"} {k.name}</li>)}</ul>
          {x.gap ? <p className="small">{x.gap}</p> : null}
        </article>
      ))}
    </section>
  );
}

function App() {
  const [view, setView] = useState(location.hash === "#changes" ? "changes" : location.hash === "#lab" ? "lab" : "maths");
  const [topic, setTopic] = useState(topics[0]);
  const [q, setQ] = useState("");
  const all = useMemo(() => skillsOf(topic), [topic]);
  const shown = useMemo(() => search(all, q), [all, q]);
  const t = totalsOf(all);
  return (
    <main className="owner">
      <nav className="chips" aria-label="Pages"><button className={view === "changes" ? "chip on" : "chip"} onClick={() => { setView("changes"); history.replaceState(null, "", "#changes"); }}>What changed</button><button className={view === "maths" ? "chip on" : "chip"} onClick={() => { setView("maths"); history.replaceState(null, "", "#"); }}>Maths by topic</button><button className={view === "lab" ? "chip on" : "chip"} onClick={() => { setView("lab"); history.replaceState(null, "", "#lab"); }}>Child lab</button></nav>
      {view === "lab" ? <><h1>Child lab</h1><p className="muted">Simulated children, each with a real slip (a dropped minus sign, 7 × 8 = 54, no carrying), go through the app on every change. A scenario the app handles must keep passing, or the change cannot go in. This shows how the app behaves; only real children can show that they learn.</p><Lab /></> : view === "changes" ? <><h1>What changed</h1><p className="muted">Newest first. Each change links to the exact place to see it.</p><Changes /></> : <>
      <h1>Maths, topic by topic</h1>
      <p className="muted">Everything a learner is told, and where the checks stand. This page always shows the version that is live.</p>
      <nav className="chips" aria-label="Topics">{topics.map((x) => <button key={x} className={x === topic ? "chip on" : "chip"} onClick={() => { setTopic(x); setQ(""); }}>{topicName(x)}</button>)}</nav>
      <h2>{topicName(topic)}</h2>
      <div className="tiles">
        <Tile n={t.skills} label="skills" />
        <Tile n={t.screens} label="lesson screens read by AI review" />
        <Tile n={t.foundations} label="start-here screens added" />
        <Tile n={t.practice} label="practice questions on those ideas" />
        <Tile n={t.corrected} label="screens fixed by review" />
        <Tile n={t.certified} of={t.families} label="question types with certified answers" />
      </div>
      {t.ideas > 0 && <p className="muted" data-picture-decisions>Start here: {t.ideas} ideas. {t.pictured} have a picture to tap or move. {t.noPicture} need none (a word, a symbol or a rule). {t.newFigure} would be helped by a figure the engine does not have yet.</p>}
      <input className="search" type="search" placeholder={`Search ${topicName(topic).toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
      {shown.map((s) => <SkillCard key={s.competency} s={s} />)}
      {shown.length === 0 && <p className="muted">Nothing matches.</p>}
      </>}
    </main>
  );
}

const el = typeof document !== "undefined" ? document.getElementById("root") : null;
if (el) createRoot(el).render(<App />);
