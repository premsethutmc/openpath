/**
 * Content review (/review/): where educators inspect, test, approve, reject or correct learning content, and release
 * managers release it. The decisions are made on the server (backend/family/content_review.py: who, which version,
 * when); this page shows every reviewable item from the same content files the learner's app uses, and re-runs every
 * family's validation in the browser so a reviewer sees the results for the exact version they approve.
 */
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Figure } from "../year/Figure";
import { Api } from "../english/logic/account";
import { isCorrect, misconceptionOf, modules, moduleOrigin, question } from "../../../packages/learning/src/content";
import { competencyCoverage, MATRIX_LABEL, matrixOf, type CompetencyCoverage, type MatrixStatus } from "../../../packages/learning/src/coverage";
import { allReleases } from "../../../packages/learning/src/curricula";
import { allOutcomesOf, assigned } from "../../../packages/learning/src/curriculum";
import { explainStep, FAMILIES, phasePool, pool, problemOf } from "../../../packages/learning/src/families";
import { graph } from "../../../packages/learning/src/graph";
import { poolDepth } from "../../../packages/learning/src/library";
import { familiesOf, setActiveRegistry, type Registry, type ReviewEntry } from "../../../packages/learning/src/review";
import { familySpec, validateFamily, type ValidationReport } from "../../../packages/learning/src/spec";
import { validateModule } from "../../../packages/learning/src/validate";
import { AnswerInput } from "../year/Learn";
import { isDrawing, SketchView } from "../year/SketchPad";
import "../mathematics/chapter/chapter.css";
import "../year/year.css";
import "./review.css";

const api = new Api();
type View = { name: "overview" } | { name: "families" } | { name: "family"; id: string } | { name: "modules" } | { name: "module"; competency: string } | { name: "curricula" } | { name: "curriculum"; item: string } | { name: "marking" };
const STATE_WORD: Record<string, string> = { draft: "Draft", submitted: "Awaiting review", changes_requested: "Changes requested", rejected: "Rejected", approved: "Approved, not released", released: "Released", missing: "Not in the registry" };
const fams = [...FAMILIES.values()].filter((f) => f.domain).map((f) => f.id);

/**
 * Figures over the whole library (every family's release pool: hundreds of thousands of questions) are worked out a
 * little at a time, so the page can be read and used while they are counted; leaving the page stops the counting.
 */
function useGradually<T>(keys: string[], compute: (k: string) => T, deps: unknown[]): { get: (k: string) => T | undefined; done: number } {
  const [found, setFound] = useState<{ map: Map<string, T>; done: number }>(() => ({ map: new Map(), done: 0 }));
  useEffect(() => {
    const map = new Map<string, T>();
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    let shown = 0;
    setFound({ map, done: 0 });
    const step = () => {
      const t0 = performance.now();
      while (i < keys.length && performance.now() - t0 < 40) {
        map.set(keys[i], compute(keys[i]));
        i++;
      }
      if (i === keys.length || performance.now() - shown > 300) {
        shown = performance.now();
        setFound({ map, done: i });
      }
      if (i < keys.length) timer = setTimeout(step, 0);
    };
    timer = setTimeout(step, 0);
    return () => clearTimeout(timer);
  }, deps);
  return { get: (k) => found.map.get(k), done: found.done };
}
const Counting = ({ done, total, what }: { done: number; total: number; what: string }) => (done < total ? <p className="small muted" aria-live="polite">Counting {what}: {done} of {total}…</p> : null);

function App() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ roles: string[]; registry: Registry } | null>(null);
  const [view, setView] = useState<View>(() => (location.hash.startsWith("#family=") ? { name: "family", id: location.hash.slice(8) } : { name: "overview" }));
  const load = async () => {
    const r = await api.request<{ roles: string[]; registry: Registry }>("GET", "/content-review/");
    setActiveRegistry(r.registry);
    setData(r);
  };
  useEffect(() => {
    api.status().then(async (s) => {
      setSignedIn(s.account.authenticated);
      if (s.account.authenticated) await load();
    }).catch((e) => setError(String(e.message ?? e))).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);
  if (!ready) return <Shell><p className="muted">Opening…</p></Shell>;
  if (!signedIn) return <Shell error={error}><SignIn onDone={() => { setSignedIn(true); load().catch((e) => setError(String(e.message ?? e))); }} onError={setError} /></Shell>;
  if (!data) return <Shell error={error}><p className="muted">Loading the review registry…</p></Shell>;
  const entry = (item: string) => data.registry.entries.find((e) => e.item === item) ?? null;
  const decide = async (e: ReviewEntry, decision: string, note: string) => {
    setError("");
    try {
      await api.request("POST", "/content-review/decisions/", { item: e.item, decision, contentHash: e.contentHash, note });
      await load();
    } catch (er) {
      setError(String((er as Error).message ?? er));
    }
  };
  const nav = (
    <nav className="review-nav" aria-label="Review sections">
      {([["overview", "Overview"], ["families", "Question families"], ["modules", "Modules"], ["curricula", "Curriculum mappings"], ["marking", "Marking"]] as const).map(([n, label]) => (
        <button key={n} className={view.name.startsWith(n.slice(0, -1)) || view.name === n ? "primary" : "secondary"} onClick={() => setView({ name: n } as View)}>{label}</button>
      ))}
    </nav>
  );
  const roles = <p className="small muted" data-testid="roles">Your review roles: {data.roles.length ? data.roles.map((r) => r.replace("_", " ")).join(", ") : "none (you can look, not decide)"}</p>;
  const body =
    view.name === "overview" ? <Overview reg={data.registry} open={setView} />
    : view.name === "families" ? <FamilyList reg={data.registry} open={(id) => setView({ name: "family", id })} />
    : view.name === "family" ? <FamilyDetail id={view.id} e={entry(`family:${view.id}`)} roles={data.roles} decide={decide} />
    : view.name === "modules" ? <ModuleList reg={data.registry} open={(c) => setView({ name: "module", competency: c })} />
    : view.name === "module" ? <ModuleDetail competency={view.competency} e={entry(`module:${view.competency}`)} reg={data.registry} roles={data.roles} decide={decide} openFamily={(id) => setView({ name: "family", id })} />
    : view.name === "curricula" ? <CurriculumList reg={data.registry} open={(item) => setView({ name: "curriculum", item })} />
    : view.name === "marking" ? <Marking roles={data.roles} />
    : <CurriculumDetail item={view.item} e={entry(view.item)} roles={data.roles} decide={decide} />;
  return <Shell error={error}>{nav}{roles}{body}</Shell>;
}

// ---------------------------------------------------------------- marking written answers (written@1)

type QueueRow = { pupil: string; learner: string; attemptId: string; questionId: string; at: string; response: string; task: { prompt: string; kind: string; rubric: { id: string; criterion: string; points: number }[]; guidance: string; competency: string; figure?: { type: string }; answer?: "text" | "drawing"; canvas?: { grid?: boolean; axes?: { x: [number, number]; y: [number, number]; step?: number } } }; mark: null | { verdict: string; score: number; outOf: number; feedback: string; at: string; marker?: string } };
function Marking({ roles }: { roles: string[] }) {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [error, setError] = useState("");
  const load = () => api.request<{ queue: QueueRow[] }>("GET", "/written/queue/").then((r) => setRows(r.queue)).catch((e) => setError(String(e.message ?? e)));
  useEffect(() => {
    if (roles.includes("educator")) load();
  }, []);
  if (!roles.includes("educator")) return <p className="muted">Marking written answers needs the educator role.</p>;
  if (error) return <p className="error" role="alert">{error}</p>;
  if (!rows) return <p className="muted">Loading the marking queue…</p>;
  return (
    <section>
      <h2>Written answers to mark</h2>
      <p className="small muted">Only learners whose parents chose to share their written work with you appear here, under a pseudonym. Each answer is marked once; marks are kept and cannot be changed. Only full marks count as correct.</p>
      {!rows.length && <p className="muted">Nothing to mark.</p>}
      {rows.map((r) => <MarkOne key={`${r.pupil}:${r.attemptId}`} r={r} onDone={load} />)}
    </section>
  );
}
function MarkOne({ r, onDone }: { r: QueueRow; onDone: () => void }) {
  const total = r.task.rubric.reduce((n, x) => n + x.points, 0);
  const [got, setGot] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [msg, setMsg] = useState("");
  const score = Object.values(got).reduce((a, b) => a + b, 0);
  const verdict = score === total ? "correct" : score === 0 ? "incorrect" : "partial";
  return (
    <article className="qcard" data-attempt={r.attemptId}>
      <p className="eyebrow">{r.learner} · {graph.get(r.task.competency).name} · {r.task.kind}</p>
      <p className="prompt">{r.task.prompt}</p>
      {r.task.figure && <Figure v={r.task.figure} />}
      {isDrawing(r.response) ? <SketchView raw={r.response} canvas={r.task.canvas} /> : <blockquote className="response">{r.response}</blockquote>}
      <details><summary>Guidance for the marker</summary><p className="small">{r.task.guidance}</p></details>
      {r.mark ? (
        <p role="status"><b>Marked {r.mark.verdict} ({r.mark.score}/{r.mark.outOf})</b> by {r.mark.marker ?? "an educator"}: {r.mark.feedback}</p>
      ) : (
        <>
          <table className="matrix small"><tbody>
            {r.task.rubric.map((c) => (
              <tr key={c.id}><th>{c.criterion}</th><td><select aria-label={`Points for ${c.criterion}`} value={got[c.id] ?? 0} onChange={(e) => setGot({ ...got, [c.id]: Number(e.target.value) })}>{Array.from({ length: c.points + 1 }, (_, k) => <option key={k} value={k}>{k} / {c.points}</option>)}</select></td></tr>
            ))}
          </tbody></table>
          <label className="field">Feedback for the learner<textarea aria-label="Feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></label>
          <div className="actions">
            <button className="primary" disabled={!feedback.trim()} onClick={async () => {
              try {
                await api.request("POST", "/written/marks/", { pupil: r.pupil, attemptId: r.attemptId, verdict, score, feedback });
                onDone();
              } catch (e) {
                setMsg(String((e as Error).message ?? e));
              }
            }}>Give the mark: {score}/{total} ({verdict === "correct" ? "correct" : verdict === "partial" ? "partly correct" : "not yet correct"})</button>
          </div>
          {msg && <p className="error" role="alert">{msg}</p>}
        </>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- overview: coverage and unresolved issues

const graphIds = graph.competencies.filter((c) => !c.partOf).map((c) => c.id);
const latestReleases = () => allReleases.filter((r, _i, a) => !a.some((x) => x.id === r.id && x.version > r.version));
const releaseIds = (r: (typeof allReleases)[number]) => [...new Set(assigned(r).map((a) => a.competency))];
const coverageIds = [...new Set([...graphIds, ...latestReleases().flatMap(releaseIds), ...modules.map((m) => m.competency)])];
function Overview({ reg, open }: { reg: Registry; open: (v: View) => void }) {
  // coverage depends on the review states (the registry), so it is counted again when they change
  const cov = useGradually<CompetencyCoverage>(coverageIds, competencyCoverage, [reg]);
  const matrix = (ids: string[]) => (ids.every((id) => cov.get(id)) ? matrixOf(ids.map((id) => cov.get(id)!)) : null);
  const g = { matrix: matrix(graphIds), total: graphIds.length };
  const ks = Object.keys(MATRIX_LABEL) as MatrixStatus[];
  const queue = reg.entries.filter((e) => e.state === "submitted");
  const changes = reg.entries.filter((e) => e.state === "changes_requested" || e.state === "rejected");
  const staleItems = reg.entries.filter((e) => e.history.some((h) => (h as { current?: boolean }).current === false) && e.state === "draft");
  const shallow = modules.map((m) => ({ m, c: cov.get(m.competency) })).filter((x) => x.c && (!x.c.depth || !x.c.depth.sufficient)).map(({ m, c }) => ({ m, d: c!.depth }));
  const openItem = (item: string) => (item.startsWith("family:") ? open({ name: "family", id: item.slice(7) }) : item.startsWith("module:") ? open({ name: "module", competency: item.slice(7) }) : open({ name: "curriculum", item }));
  return (
    <div className="stack">
      <h1>Content review</h1>
      <section aria-label="Coverage">
        <h2>Coverage of the competency graph</h2>
        <Counting done={cov.done} total={coverageIds.length} what="the coverage of every skill" />
        <table className="matrix"><tbody>{ks.map((k) => <tr key={k}><th>{MATRIX_LABEL[k]}</th><td data-status={k}>{g.matrix ? g.matrix[k] : "…"}</td></tr>)}</tbody></table>
        <p className="small muted">{g.total} competencies. A module counts as complete only with a question pool deep enough for diagnosis, practice, reassessment and the delayed check. Approved means the module and every question family it uses.</p>
        <table className="matrix small"><thead><tr><th>Textbook</th>{ks.map((k) => <th key={k}>{MATRIX_LABEL[k]}</th>)}</tr></thead><tbody>
          {latestReleases().map((r) => { const m = matrix(releaseIds(r)); return <tr key={r.id}><th>Grade {r.grade}: {r.title}</th>{ks.map((k) => <td key={k}>{m ? m[k] : "…"}</td>)}</tr>; })}
        </tbody></table>
      </section>
      <section aria-label="Unresolved">
        <h2>Unresolved</h2>
        <Issue title="Awaiting review" items={queue} openItem={openItem} />
        <Issue title="Changes requested or rejected" items={changes} openItem={openItem} />
        <Issue title="Changed since an earlier decision (review again)" items={staleItems} openItem={openItem} />
        <h3>Modules whose question pool is too small, or that have none</h3>
        <Counting done={cov.done} total={coverageIds.length} what="question pools" />
        <ul className="plain small">{shallow.map(({ m, d }) => <li key={m.competency}><button className="link" onClick={() => open({ name: "module", competency: m.competency })}>{m.title}</button>: {d ? `short of ${d.short.join(", ")}` : "no question family: a learner can run out of questions"}</li>)}</ul>
      </section>
    </div>
  );
}
function Issue({ title, items, openItem }: { title: string; items: ReviewEntry[]; openItem: (item: string) => void }) {
  return (
    <>
      <h3>{title} ({items.length})</h3>
      {items.length ? <ul className="plain small">{items.slice(0, 40).map((e) => <li key={e.item}><button className="link" onClick={() => openItem(e.item)}>{e.item}</button> · {STATE_WORD[e.state]}</li>)}</ul> : <p className="small muted">None.</p>}
    </>
  );
}

// ---------------------------------------------------------------- families

function FamilyList({ reg, open }: { reg: Registry; open: (id: string) => void }) {
  const size = useGradually(fams, (f) => pool(f).items.length, []);
  return (
    <div className="stack">
      <h1>Question families</h1>
      <p className="muted small">A family is approved as a whole: its generation constraints, answer checking, mistake explanations and options, difficulty classes and wording. Only questions inside an approved, unchanged specification are released.</p>
      <Counting done={size.done} total={fams.length} what="question pools" />
      <table className="matrix"><thead><tr><th>Family</th><th>Skill</th><th>Pool</th><th>State</th></tr></thead><tbody>
        {fams.map((f) => { const def = FAMILIES.get(f)!; const e = reg.entries.find((x) => x.item === `family:${f}`); return <tr key={f}><th><button className="link" onClick={() => open(f)}>{f}: {def.title}</button></th><td>{graph.get(def.competency).name}</td><td>{size.get(f) ?? "…"}</td><td data-state={e?.state}>{STATE_WORD[e?.state ?? "missing"]}</td></tr>; })}
      </tbody></table>
    </div>
  );
}

function FamilyDetail({ id, e, roles, decide }: { id: string; e: ReviewEntry | null; roles: string[]; decide: (e: ReviewEntry, d: string, note: string) => Promise<void> }) {
  const spec = useMemo(() => familySpec(id)!, [id]);
  const [v, setV] = useState<ValidationReport | null>(null);
  const [extra, setExtra] = useState<string[]>([]);
  const def = FAMILIES.get(id)!;
  return (
    <div className="stack" data-family={id}>
      <p className="eyebrow">Question family · version {spec.version} · fingerprint <code>{spec.fingerprint}</code></p>
      <h1 style={{ margin: 0 }}>{spec.title}</h1>
      <p className="small">Skill: {graph.get(spec.competency).name} (<code>{spec.competency}</code>). Answer type: {spec.type}{spec.multipleChoice ? ", also multiple choice (options are the answers the mistake explanations predict)" : ""}.</p>
      <h2>Generation constraints</h2>
      <p className="small">Parameter ranges: {spec.domain.map(([lo, hi], i) => `p${i + 1} from ${lo} to ${hi}`).join("; ")}{def.keep ? ", narrowed by the family's release rule" : ""}; the family's own limits apply too. Pool: <b>{spec.poolSize}</b> questions; excluded automatically (failed validation): <b>{spec.excluded.length}</b>{spec.excluded.length ? ` (${spec.excluded.slice(0, 5).map((x) => x.params.join(",")).join("; ")})` : ""}.</p>
      <p className="small">Difficulty classes: easier {spec.difficulty["1"]}, typical {spec.difficulty["2"]}, harder {spec.difficulty["3"]}.</p>
      {spec.teach && <p className="small">Teaching hints: <i>{spec.teach.idea}</i> {spec.teach.method}</p>}
      <h2>Validation</h2>
      {!v ? <button className="secondary" onClick={() => setV(validateFamily(id))}>Run the validation now</button> : (
        <div className="panel" data-testid="validation" data-ok={v.ok}>
          <p><b>{v.ok ? "All checks pass." : "Checks failed."}</b></p>
          <ul className="plain small">
            <li>Deterministic: every pool question ({v.deterministic.checked}) builds, passes its independent check, rebuilds identically, has a readable prompt, explanations predicting wrong answers only, and distinct options: {v.deterministic.failures.length ? `${v.deterministic.failures.length} failures` : "pass"}</li>
            <li>Property-based: {v.property.cases} random parameter choices across and beyond the ranges: {v.property.failures.length ? `${v.property.failures.length} failures` : "the pool holds exactly what the specification allows"}</li>
            <li>Boundaries: {v.boundary.cases} edges and one step outside: {v.boundary.failures.length ? `${v.boundary.failures.length} failures` : "pass"}</li>
          </ul>
          {[...v.deterministic.failures, ...v.property.failures, ...v.boundary.failures].slice(0, 10).map((f) => <p key={f} className="error small">{f}</p>)}
        </div>
      )}
      <h2>Representative questions</h2>
      <p className="small muted">Try them: answer as a learner would, including the wrong answers a misunderstanding gives.</p>
      {[...spec.examples, ...extra].map((q) => <TryQuestion key={q} qid={q} />)}
      <button className="secondary" onClick={() => setExtra((x) => [...x, ...phasePool(id, "practice").filter((q) => !spec.examples.includes(q) && !x.includes(q)).slice(x.length * 3 % 40, x.length * 3 % 40 + 3)])}>Three more questions from the pool</button>
      <h2>Mistake explanations</h2>
      <ul className="plain small">{spec.explanations.map((x) => <li key={x}>{x}</li>)}</ul>
      <Decision e={e} roles={roles} decide={decide} />
    </div>
  );
}

function TryQuestion({ qid }: { qid: string }) {
  const q = question(qid);
  const p = problemOf(qid);
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<null | boolean>(null);
  const says = checked === false ? misconceptionOf(q, value)?.says : null;
  return (
    <div className="qcard try" data-qid={qid}>
      <p className="small muted">{qid}{p ? ` · difficulty ${FAMILIES.get(p.family)?.difficulty?.(p.params) ?? 2}` : ""}</p>
      <p className="prompt">{q.prompt}</p>
      {q.figure && <Figure v={q.figure} />}
      <AnswerInput q={q} value={value} setValue={(x) => { setValue(x); setChecked(null); }} disabled={false} />
      <div className="actions"><button className="secondary" disabled={!value.trim()} onClick={() => setChecked(isCorrect(q, value))}>Check</button></div>
      {checked !== null && (
        <div role="status" className={checked ? "right" : "wrong"}>
          <b>{checked ? "Right." : "Not right."}</b> Answer: {q.type === "choice" ? `${q.answer} (${q.options!["ABCD".indexOf(q.answer)]})` : q.answer}. {says ? `A learner giving this answer: ${says}` : !checked ? "No written explanation predicts this answer." : ""}
          {p && <ol className="small">{p.steps.map((s) => <li key={s.id}>{explainStep(p, s)}</li>)}</ol>}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- modules

const moduleIds = modules.map((m) => m.competency);
function ModuleList({ reg, open }: { reg: Registry; open: (c: string) => void }) {
  const depth = useGradually(moduleIds, (c) => poolDepth(modules.find((m) => m.competency === c)!), []);
  return (
    <div className="stack">
      <h1>Modules</h1>
      <Counting done={depth.done} total={moduleIds.length} what="question pools" />
      <table className="matrix"><thead><tr><th>Module</th><th>Origin</th><th>Pool</th><th>State</th></tr></thead><tbody>
        {modules.map((m) => { const e = reg.entries.find((x) => x.item === `module:${m.competency}`); const d = depth.get(m.competency); return <tr key={m.competency}><th><button className="link" onClick={() => open(m.competency)}>{m.title}</button></th><td>{moduleOrigin(m.competency)}{"provenance" in m ? ` (${String((m as { provenance: { policy: string } }).provenance.policy)})` : ""}</td><td>{d === undefined ? "…" : d ? (d.sufficient ? d.family : `${d.family}: short`) : "none"}</td><td data-state={e?.state}>{STATE_WORD[e?.state ?? "missing"]}</td></tr>; })}
      </tbody></table>
    </div>
  );
}

function ModuleDetail({ competency, e, reg, roles, decide, openFamily }: { competency: string; e: ReviewEntry | null; reg: Registry; roles: string[]; decide: (e: ReviewEntry, d: string, note: string) => Promise<void>; openFamily: (id: string) => void }) {
  const m = modules.find((x) => x.competency === competency)!;
  const problems = validateModule(m);
  const d = poolDepth(m);
  const screens = (ss: { title: string; text: string[]; math?: string[]; tip?: string }[]) => ss.map((s) => <div key={s.title} className="panel lesson-preview"><h4>{s.title}</h4>{s.text.map((t) => <p key={t}>{t}</p>)}{s.math && <pre className="math">{s.math.join("\n")}</pre>}{s.tip && <p className="hint small">{s.tip}</p>}</div>);
  return (
    <div className="stack" data-module={competency}>
      <p className="eyebrow">Module · {moduleOrigin(competency)}</p>
      <h1 style={{ margin: 0 }}>{m.title}</h1>
      <p className="small">Skill: {graph.get(competency).name}. Structure (validate@1): {problems.length ? <span className="error">{problems.join("; ")}</span> : "complete"}. Question pool (depth@1): {d ? `${d.family}: diagnostic ${d.counts.diagnostic}, checks ${d.counts.check}, practice ${d.counts.practice}, delayed check ${d.counts.retention}${d.sufficient ? "" : ` (short of ${d.short.join(", ")})`}` : "none: only the questions listed here"}.</p>
      <p className="small">Question families used: {familiesOf(m).map((f) => <button key={f} className="link" onClick={() => openFamily(f)}>{f} ({STATE_WORD[reg.entries.find((x) => x.item === `family:${f}`)?.state ?? "missing"]})</button>)}</p>
      <h2>Chapter</h2>
      {screens(m.chapter)}
      <h2>Teaching strategies</h2>
      {m.strategies.map((s) => <div key={s.id}><h3>{s.title} <span className="chip">{s.kind}</span></h3>{screens(s.screens)}<p className="small muted">Guided: {s.guided} · check alone: {s.check}{s.needs.length ? ` · builds on: ${s.needs.join(", ")}` : ""}</p></div>)}
      <h2>Questions it lists</h2>
      <p className="small">Explore: {m.diagnostics.join(", ")}. Practice: {m.practice.join(", ")}. Transfer: {m.transfer.join(", ")}. Delayed check: {m.retention.join(", ")}.</p>
      {[...m.diagnostics.slice(0, 1), ...m.transfer].map((q) => <TryQuestion key={q} qid={q} />)}
      <Decision e={e} roles={roles} decide={decide} />
    </div>
  );
}

// ---------------------------------------------------------------- curriculum mappings

const latest = () => allReleases.filter((r, _i, a) => !a.some((x) => x.id === r.id && x.version > r.version));
function CurriculumList({ reg, open }: { reg: Registry; open: (item: string) => void }) {
  return (
    <div className="stack">
      <h1>Curriculum mappings</h1>
      <table className="matrix"><thead><tr><th>Textbook</th><th>Outcomes</th><th>State</th></tr></thead><tbody>
        {latest().map((r) => { const item = `curriculum:${r.id}@${r.version}`; const e = reg.entries.find((x) => x.item === item); return <tr key={item}><th><button className="link" onClick={() => open(item)}>Grade {r.grade}: {r.title}</button></th><td>{allOutcomesOf(r).length}</td><td>{STATE_WORD[e?.state ?? "missing"]}</td></tr>; })}
      </tbody></table>
    </div>
  );
}
function CurriculumDetail({ item, e, roles, decide }: { item: string; e: ReviewEntry | null; roles: string[]; decide: (e: ReviewEntry, d: string, note: string) => Promise<void> }) {
  const r = allReleases.find((x) => `curriculum:${x.id}@${x.version}` === item)!;
  return (
    <div className="stack">
      <p className="eyebrow">Curriculum release · {r.version} · {r.source.board ?? ""}</p>
      <h1 style={{ margin: 0 }}>{r.title}</h1>
      <p className="small muted">{r.review?.note}</p>
      <table className="matrix small"><thead><tr><th>Outcome</th><th>Where</th><th>Mapping</th><th>Verdict</th></tr></thead><tbody>
        {allOutcomesOf(r).map(({ outcome: o, chapter, sections }) => (
          <tr key={o.id}><td>{o.text}</td><td>{[chapter.title, ...sections.map((s) => s.title)].join(" › ")}{o.pages ? `, p. ${o.pages}` : ""}</td><td>{o.mapping.competencies.filter((m) => m.status === "accepted").map((m) => graph.get(m.id).name).join(", ") || (o.mapping.proposal ? "proposal (no skill)" : "—")}</td><td>{o.mapping.verdict ?? "—"}{o.mapping.why ? `: ${o.mapping.why}` : ""}</td></tr>
        ))}
      </tbody></table>
      <Decision e={e} roles={roles} decide={decide} />
    </div>
  );
}

// ---------------------------------------------------------------- a decision, and the history

function Decision({ e, roles, decide }: { e: ReviewEntry | null; roles: string[]; decide: (e: ReviewEntry, d: string, note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!e) return <p className="error">Not in the review registry.</p>;
  const educator = roles.includes("educator");
  const manager = roles.includes("release_manager");
  const options: [string, string, boolean][] = [
    ["submit", "Submit for review", (educator || manager) && (e.state === "draft" || e.state === "changes_requested")],
    ["approve", "Approve", educator && e.state === "submitted"],
    ["request_changes", "Request corrections", educator && e.state === "submitted"],
    ["reject", "Reject", educator && e.state === "submitted"],
    ["release", "Release to learners", manager && e.state === "approved"],
  ];
  const go = async (d: string) => {
    setBusy(true);
    await decide(e, d, note);
    setNote("");
    setBusy(false);
  };
  return (
    <section className="panel decision" aria-label="Decision">
      <h2 style={{ marginTop: 0 }}>Decision</h2>
      <p>State: <b data-testid="state">{STATE_WORD[e.state]}</b> · version <code>{e.contentHash}</code>{e.releasedAt ? ` · released ${new Date(e.releasedAt).toLocaleString()}` : ""}</p>
      {options.some(([, , ok]) => ok) ? (
        <>
          <label className="field">Note (what you checked, or what to correct)<textarea aria-label="Review note" value={note} onChange={(x) => setNote(x.target.value)} /></label>
          <div className="actions">{options.filter(([, , ok]) => ok).map(([d, label]) => <button key={d} className={d === "approve" || d === "release" ? "primary" : "secondary"} disabled={busy} onClick={() => go(d)}>{label}</button>)}</div>
        </>
      ) : <p className="small muted">{roles.length ? "No decision is open to your role in this state." : "You have no review role."}</p>}
      <h3>History</h3>
      {e.history.length ? <ol className="small history">{e.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleString()} · {STATE_WORD[h.state]} by {h.by} ({h.role}) on <code>{h.contentHash}</code>{(h as { current?: boolean }).current === false ? " (an earlier version: no longer applies)" : ""}{h.note ? ` · “${h.note}”` : ""}</li>)}</ol> : <p className="small muted">No decisions yet.</p>}
    </section>
  );
}

function Shell({ children, error }: { children: React.ReactNode; error?: string }) {
  return (
    <>
      <header className="topbar"><div className="topbar-row wide"><span><a className="link" href="/year/">My Learning Year</a></span><strong>Content review</strong><span /></div></header>
      <main className="page wide review">{error && <p className="error" role="alert">{error}</p>}{children}</main>
    </>
  );
}
function SignIn({ onDone, onError }: { onDone: () => void; onError: (e: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form className="stack" onSubmit={(x) => { x.preventDefault(); api.login(email, password).then(onDone).catch((er) => onError(String(er.message ?? er))); }}>
      <h1>Sign in to review content</h1>
      <label className="field">Email<input type="email" autoComplete="username" value={email} onChange={(x) => setEmail(x.target.value)} required /></label>
      <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(x) => setPassword(x.target.value)} required /></label>
      <button className="primary">Sign in</button>
    </form>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
