/**
 * Mathematics curriculum dashboard (/curriculum/), dashboard@1.
 *
 * Grade → chapter tiles → sections and skills (any depth, from the board release) → a competency's detail. Two
 * measurements, always apart:
 *   Verified (learner)   unique competencies the shared engine has verified for the chosen learner ÷ unique
 *                        competencies in scope. Green means verified and nothing else.
 *   Assessment coverage  unique curriculum outcomes the coverage compiler accepts as fully assessed ÷ outcomes in
 *                        scope; educator approval is shown beside it, never folded into it.
 * The first screen needs only the small per-release index (data/*.json, built from the repository's releases and
 * the compiler's output). The learner's evidence (the shared engine) and question previews load when asked for.
 * Nothing here writes a learning record; learning happens in My Learning Year.
 */
import React, { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Api, type PupilSummary } from "../english/logic/account";
import {
  contentOf,
  coverageRollup,
  findNode,
  masteryOf,
  methodCompetencies,
  methodRequired,
  masteryRollup,
  MASTERY_ICON,
  MASTERY_WORD,
  move,
  ordered,
  pathTo,
  REVIEW_WORD,
  reviewState,
  scopeOf,
  scopeOfAll,
  type CoverageRollup,
  type DashCompetency,
  type DashIndex,
  type DashNode,
  type DashRelease,
  type LearnerSkill,
  type Mastery,
  type MasteryRollup,
  type RegistryLike,
} from "../../../packages/learning/src/dashboard";
import type { LearnerView } from "../../../packages/learning/src/dashboard-learner";
import "./curriculum.css";

declare const OPENPATH_REVIEW_FIXTURE: boolean;
const TEST_BUILD = typeof OPENPATH_REVIEW_FIXTURE !== "undefined" && OPENPATH_REVIEW_FIXTURE;
const api = new Api();
const Preview = lazy(() => import("./preview").then((m) => ({ default: m.Preview })));
const PreviewExperience = lazy(() => import("./PreviewExperience").then((m) => ({ default: m.PreviewExperience })));
const BOARD_WORD = { cbse: "CBSE / NCERT", tn: "Tamil Nadu" } as const;
type Board = "cbse" | "tn";

// ---------------------------------------------------------------- route (the URL hash: back works naturally)

interface Route {
  board: Board;
  grade: number;
  node: string | null;
  competency: string | null;
}
function readRoute(): Route {
  const p = new URLSearchParams(location.hash.slice(1));
  const g = Number(p.get("g"));
  return { board: p.get("b") === "tn" ? "tn" : "cbse", grade: g >= 1 && g <= 12 ? g : 10, node: p.get("n"), competency: p.get("c") };
}
const hashOf = (r: Route) => {
  const p = new URLSearchParams({ b: r.board, g: String(r.grade) });
  if (r.node) p.set("n", r.node);
  if (r.competency) p.set("c", r.competency);
  return `#${p}`;
};
const scrolls = new Map<string, number>();
function go(r: Route) {
  scrolls.set(location.hash, window.scrollY);
  location.hash = hashOf(r);
}
function useRoute(): Route {
  const [r, setR] = useState(readRoute);
  useEffect(() => {
    const on = () => setR(readRoute());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  // restore where the viewer was on this screen (back), or start at the top of a new one
  useLayoutEffect(() => {
    window.scrollTo(0, scrolls.get(location.hash) ?? 0);
  }, [r.board, r.grade, r.node, r.competency]);
  return r;
}

// ---------------------------------------------------------------- data

const releaseCache = new Map<string, Promise<DashRelease>>();
const releaseData = (file: string) => {
  let p = releaseCache.get(file);
  if (!p) {
    p = fetch(`data/${encodeURIComponent(file)}`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${file}`);
      return r.json();
    });
    releaseCache.set(file, p);
  }
  return p;
};

/** A viewer's display order (presentation only: never the curriculum, its mappings or anyone's evidence). */
const ORDER_KEY = (release: string, parent: string) => `openpath.curriculum.order.${release}.${parent}`;
function readOrder(release: string, parent: string): string[] | undefined {
  try {
    const v = localStorage.getItem(ORDER_KEY(release, parent));
    return v ? (JSON.parse(v) as string[]) : undefined;
  } catch {
    return undefined;
  }
}
function writeOrder(release: string, parent: string, ids: string[] | null) {
  try {
    if (ids) localStorage.setItem(ORDER_KEY(release, parent), JSON.stringify(ids));
    else localStorage.removeItem(ORDER_KEY(release, parent));
  } catch {
    /* the order is a convenience: without storage it lasts for this visit */
  }
}

// ---------------------------------------------------------------- small views

const masteryClass = (m: Mastery | null) => (m === "verified" ? "m-verified" : m === "learning" || m === "pending" || m === "review" ? "m-progress" : "m-none");

function Meter({ label, value, of, pct, kind, note }: { label: string; value: number; of: number; pct: number; kind: "mastery" | "coverage"; note?: string }) {
  return (
    <div className={`meter ${kind}`}>
      <div className="meter-top">
        <span className="meter-label">{label}</span>
        <span className="meter-num">{of ? `${pct}%` : "–"}</span>
      </div>
      <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-sub">
        {value} of {of}
        {note ? ` · ${note}` : ""}
      </div>
    </div>
  );
}

function Summary({ m, c, learner, scopeWord }: { m: MasteryRollup; c: CoverageRollup; learner: LearnerView | null; scopeWord: string }) {
  const assessed = m.total - m.counts.not_assessed;
  return (
    <section className="summary" aria-label={`${scopeWord} summary`}>
      {learner ? (
        assessed === 0 ? (
          <div className="meter mastery unassessed">
            <div className="meter-top">
              <span className="meter-label">Verified competencies</span>
              <span className="meter-num">Not assessed</span>
            </div>
            <div className="meter-sub">No evidence yet for these {m.total} competencies. Nothing is assumed.</div>
          </div>
        ) : (
          <Meter label="Verified competencies" value={m.counts.verified} of={m.total} pct={m.verifiedPct} kind="mastery" note={`${m.counts.pending} awaiting verification · ${m.counts.learning} learning${m.counts.review ? ` · ${m.counts.review} to review` : ""}`} />
        )
      ) : (
        <div className="meter mastery unassessed">
          <div className="meter-top">
            <span className="meter-label">Verified competencies</span>
            <span className="meter-num">–</span>
          </div>
          <div className="meter-sub">Choose a learner to see verified progress ({m.total} competencies).</div>
        </div>
      )}
      <Meter label="Assessment coverage" value={c.counts.awaiting + c.counts.validated} of={c.total} pct={c.assessedPct} kind="coverage" note={`${c.counts.partial} partial${c.counts.unsupported + c.counts["not-implemented"] ? ` · ${c.counts.unsupported + c.counts["not-implemented"]} not covered` : ""} · educator-approved ${c.approvedPct}%`} />
    </section>
  );
}

function Tile({ node, r, skillOf, onOpen, details, arrange, onMove, first, last }: { node: DashNode; r: DashRelease; skillOf: ((c: string) => Mastery) | null; onOpen: () => void; details?: string; arrange: boolean; onMove: (by: -1 | 1) => void; first: boolean; last: boolean }) {
  const scope = node.kind === "competency" || node.kind === "micro" ? { competencies: node.competency ? [node.competency] : [], outcomes: [] } : scopeOf(node);
  const m = skillOf ? masteryRollup(scope.competencies, skillOf) : null;
  const cov = coverageRollup(r, scope.outcomes);
  const comp = node.competency ? r.competencies[node.competency] : undefined;
  const leafContent = node.kind === "competency" ? contentOf(comp) : null;
  const withModule = scope.competencies.filter((c) => r.competencies[c]?.module).length;
  const state = m ? m.state : null;
  const statusText = !m ? null : node.kind === "competency" ? MASTERY_WORD[m.state] : m.counts.not_assessed === m.total ? "Not assessed" : `${m.counts.verified}/${m.total} verified`;
  const partial = cov.counts.partial > 0;
  return (
    <li className={`tile ${masteryClass(state)} k-${node.kind}`} data-id={node.id}>
      <button type="button" className="tile-main" onClick={onOpen} aria-label={`${node.title}${statusText ? `, ${statusText}` : ""}`}>
        <span className="tile-title">{node.title}</span>
        {node.kind === "chapter" && node.subtitle ? <span className="tile-sub">{node.subtitle}</span> : null}
        {node.kind === "unsupported" || node.kind === "proposal" ? <span className="tile-sub">{node.subtitle}</span> : null}
        {m && node.kind !== "unsupported" && node.kind !== "proposal" ? (
          <>
            <span className="mini-bar" aria-hidden="true">
              <span className="v" style={{ width: `${m.total ? (100 * m.counts.verified) / m.total : 0}%` }} />
              <span className="p" style={{ width: `${m.total ? (100 * (m.counts.pending + m.counts.learning + m.counts.review)) / m.total : 0}%` }} />
            </span>
            <span className="tile-status">
              <span aria-hidden="true">{MASTERY_ICON[m.state]}</span> {statusText}
            </span>
          </>
        ) : null}
        <span className="tile-content">
          {node.kind === "competency" ? (
            <>
              <span className={`dot ${leafContent!.learn ? "on" : ""}`} title="Learning module" aria-hidden="true" />
              {leafContent!.label}
            </>
          ) : node.kind === "unsupported" || node.kind === "proposal" ? (
            "No content"
          ) : (
            <>
              {scope.competencies.length} {scope.competencies.length === 1 ? "skill" : "skills"} · {withModule} with {withModule === 1 ? "a module" : "modules"}
            </>
          )}
          {partial ? <span className="tag partial">Partial</span> : null}
        </span>
      </button>
      {details && <a className="link" href={details}>View topic details</a>}
      {arrange ? (
        <span className="arrange">
          <button type="button" aria-label={`Move ${node.title} earlier`} disabled={first} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" aria-label={`Move ${node.title} later`} disabled={last} onClick={() => onMove(1)}>
            ↓
          </button>
        </span>
      ) : null}
    </li>
  );
}

function Tiles({ nodes, parent, r, skillOf, route, arrange, learnerId, prescribed = false }: { learnerId?: string; prescribed?: boolean; nodes: DashNode[]; parent: string; r: DashRelease; skillOf: ((c: string) => Mastery) | null; route: Route; arrange: boolean }) {
  const [order, setOrder] = useState(() => readOrder(r.release.id, parent));
  useEffect(() => setOrder(readOrder(r.release.id, parent)), [r.release.id, parent]);
  const shown = learnerId || prescribed ? nodes : ordered(nodes, order);
  const ids = shown.map((n) => n.id);
  // progressive: a long level shows its first tiles and the rest on request (never hundreds at once)
  const [all, setAll] = useState(false);
  const LIMIT = 24;
  const visible = all || arrange || learnerId || prescribed ? shown : shown.slice(0, LIMIT);
  return (
    <>
      <ul className="tiles">
        {visible.map((n, k) => (
          <Tile
            key={n.id}
            node={n}
            r={r}
            skillOf={skillOf}
            arrange={arrange}
            first={k === 0}
            last={k === visible.length - 1}
            onMove={(by) => {
              const next = move(ids, n.id, by);
              setOrder(next);
              writeOrder(r.release.id, parent, next);
            }}
            details={learnerId && n.kind === "chapter" ? hashOf({...route,node:n.id,competency:null}) : undefined}
            onOpen={() => {
              return (n.kind === "competency" || n.kind === "micro" ? go({ ...route, competency: n.competency! }) : n.kind === "unsupported" || n.kind === "proposal" ? undefined : go({ ...route, node: n.id, competency: null }));}}
          />
        ))}
      </ul>
      {!learnerId && !prescribed && !all && !arrange && shown.length > LIMIT ? (
        <button type="button" className="secondary more" onClick={() => setAll(true)}>
          Show {shown.length - LIMIT} more
        </button>
      ) : null}
      {arrange && order ? (
        <button
          type="button"
          className="secondary more"
          onClick={() => {
            setOrder(undefined);
            writeOrder(r.release.id, parent, null);
          }}
        >
          Back to book order
        </button>
      ) : null}
    </>
  );
}

function OutcomeList({ r, ids }: { r: DashRelease; ids: string[] }) {
  if (!ids.length) return null;
  return (
    <details className="outcomes">
      <summary>Curriculum outcomes here ({ids.length})</summary>
      <ul>
        {ids.map((o) => {
          const row = r.outcomes[o];
          return (
            <li key={o} className={`cov-${row?.class ?? "not-implemented"}`}>
              <span className="tag">{row?.class === "awaiting" ? "Assessed · awaiting educator review" : row?.class === "validated" ? "Educator-approved" : row?.class === "partial" ? "Partial" : "Not covered"}</span> {row?.text}
              {row?.class === "partial" ? <div className="muted small">{row.why}</div> : null}
              {row?.method ? <div className="muted small">Needs a method an educator marks ({row.written.length} written task{row.written.length === 1 ? "" : "s"}).</div> : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// ---------------------------------------------------------------- competency detail

function Detail({ r, id, route, learner, registry, skillOf }: { r: DashRelease; id: string; route: Route; learner: LearnerView | null; registry: RegistryLike | null; skillOf: ((c: string) => Mastery) | null }) {
  const c: DashCompetency | undefined = r.competencies[id];
  const [preview, setPreview] = useState(false);
  const [allFamilies, setAllFamilies] = useState(false);
  if (!c) return <p>This competency is not mapped in {r.release.title}.</p>;
  const outcomes = Object.values(r.outcomes).filter((o) => o.competencies.includes(id));
  const method = methodRequired(r, id);
  const s: LearnerSkill | undefined = learner?.skillOf(c.evidenceTarget);
  const state = learner ? masteryOf(s, method) : null;
  const name = (p: string) => r.competencies[p]?.name ?? r.names[p] ?? p;
  const moduleReview = c.module ? reviewState(registry, `module:${id}`, c.module.hash) : "missing";
  const famReviews = c.families.map((f) => ({ ...f, review: reviewState(registry, `family:${f.id}`, f.fingerprint) }));
  const approved = famReviews.filter((f) => f.review === "approved" || f.review === "released").length;
  const content = contentOf(c);
  const due = s?.retentionDueAt ? new Date(s.retentionDueAt) : null;
  const next = !learner
    ? null
    : state === "verified"
      ? "Verified. A later review keeps it fresh."
      : state === "review"
        ? "Review: the delayed check was missed. Work the module again."
        : state === "pending"
          ? s?.status === "verified" && method
            ? s.methodPending
              ? "A written answer is waiting for an educator's mark."
              : "Hand in a written answer: this outcome needs a method an educator marks."
            : s?.retention === "due"
              ? "The delayed check is due now."
              : `Delayed check from ${due ? due.toLocaleDateString() : "seven full days after it was shown"}.`
          : state === "learning"
            ? "Carry on with the module."
            : content.learn
              ? "Start the module."
              : "No learning content yet.";
  return (
    <article className="detail">
      <h2>{c.name}</h2>
      {c.description ? <p className="muted">{c.description}</p> : null}
      <div className={`state-card ${masteryClass(state)}`}>
        {learner ? (
          <>
            <strong>
              <span aria-hidden="true">{MASTERY_ICON[state!]}</span> <span className="state-word">{MASTERY_WORD[state!]}</span>
            </strong>
            <span className="muted small">
              {s?.attempts ? `${s.attempts} answer${s.attempts === 1 ? "" : "s"} on record` : "No evidence yet"}
              {s && s.retention !== "none" ? ` · delayed check: ${s.retention}` : ""}
            </span>
            {next ? <p className="next">{next}</p> : null}
            {c.families.length > 0 && c.module ? <p><a className="primary" href={`/year/?learner=${encodeURIComponent(learner.learnerId)}&skill=${encodeURIComponent(c.evidenceTarget)}&practice=curriculum`}>Practise competency</a></p> : <p className="muted">Keyboard practice is not available for this competency yet. Any required written method still needs educator assessment.</p>}
            {content.learn && state !== "verified" ? (
              <a className="primary" href={`/year/?learner=${encodeURIComponent(learner.learnerId)}&skill=${encodeURIComponent(c.evidenceTarget)}${r.release.grade === 7 ? "&diagnostic=topic" : ""}`}>
                {r.release.grade === 7 ? "Optional diagnostic and study plan" : "Optional teaching module"}
              </a>
            ) : null}
          </>
        ) : (
          <span className="muted">Choose a learner to see their evidence for this competency.</span>
        )}
      </div>
      {method ? (
        <p className="note">
          This curriculum asks for the method here, not only the answer. Right final answers alone never make it green: an educator marks a written answer ({c.written.length} written task{c.written.length === 1 ? "" : "s"}).
        </p>
      ) : null}

      <h3>Builds on</h3>
      {c.prerequisites.length ? (
        <ul className="chips">
          {c.prerequisites.map((p) => (
            <li key={p.id}>
              {r.competencies[p.id] ? (
                <button type="button" className={`chip-btn ${masteryClass(skillOf ? skillOf(p.id) : null)}`} onClick={() => go({ ...route, competency: p.id })}>
                  {name(p.id)}
                </button>
              ) : (
                <span className={`chip-btn ${masteryClass(skillOf ? skillOf(p.id) : null)}`}>{name(p.id)}</span>
              )}
              {p.type === "plausible" ? <span className="muted small"> (likely)</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing earlier in the skill map.</p>
      )}

      {c.micro.length ? (
        <>
          <h3>Smaller steps</h3>
          <ul className="chips">
            {c.micro.map((k) => (
              <li key={k}>
                <span className="chip-btn">{name(k)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h3>Teaching module</h3>
      {c.module ? (
        <div className="card">
          <strong>{c.module.title}</strong>
          <div className="muted small">
            {c.module.complete ? "Complete: explore, strategies, practice and a delayed check" : `Incomplete: ${c.module.missing.join(", ")}`}
          </div>
          {c.module.strategies.length ? <div className="small">Ways to learn it: {c.module.strategies.join(" · ")}</div> : null}
          <div className="small">
            {c.module.counts.diagnostics} to explore · {c.module.counts.practice} practice · {c.module.counts.transfer} new-kind · {c.module.counts.retention} delayed-check
          </div>
          <div className="small review-line">Review: {REVIEW_WORD[moduleReview]}</div>
        </div>
      ) : (
        <p className="muted">No module yet.</p>
      )}

      <h3>Assessment</h3>
      <div className="card">
        <div className="small">
          {c.mode === "educator-marked" ? "Marked by an educator (written work)." : "Marked automatically."} {c.complete ? "Every engineering check is met." : `Still missing: ${c.missing.join(", ")}.`}
        </div>
        <div className="small">
          {c.families.length} question {c.families.length === 1 ? "family" : "families"} ({c.families.reduce((n, f) => n + f.problems, 0)} problems) · {approved} educator-approved
          {c.written.length ? ` · ${c.written.length} written task${c.written.length === 1 ? "" : "s"}` : ""}
        </div>
        <p className="muted small">Generated questions are provisional until an educator approves them and a release manager releases them.</p>
        <ul className="families">
          {(allFamilies ? famReviews : famReviews.slice(0, 4)).map((f) => (
            <li key={f.id}>
              <span>{f.title}</span> <span className="muted small">· {REVIEW_WORD[f.review]}</span>
            </li>
          ))}
        </ul>
        {famReviews.length > 4 && !allFamilies ? (
          <button type="button" className="link" onClick={() => setAllFamilies(true)}>
            All {famReviews.length} families
          </button>
        ) : null}
        {c.module?.sample.length || c.written.length ? (
          preview ? (
            <Suspense fallback={<p className="muted">Loading questions…</p>}>
              <Preview ids={c.module?.sample.length ? c.module.sample : c.written.map((w) => w.id).slice(0, 3)} label={c.module?.title ?? c.name} />
            </Suspense>
          ) : (
            <button type="button" className="secondary" onClick={() => setPreview(true)}>
              Preview questions
            </button>
          )
        ) : null}
        <a className="link small" href={`/review/#family=${encodeURIComponent(c.families[0]?.id ?? "")}`}>
          Review this content (educators)
        </a>
      </div>

      <details className="tech">
        <summary>Details: ids, mappings and evidence</summary>
        <dl>
          <dt>Competency</dt>
          <dd>
            <code>{c.id}</code> · {c.strand} · grades {c.grades[0]}–{c.grades[1]}
            {c.evidenceTarget !== c.id ? ` · evidence recorded on ${c.evidenceTarget}` : ""}
          </dd>
          <dt>Release</dt>
          <dd>
            <code>
              {r.release.id}@{r.release.version}
            </code>{" "}
            · hash <code>{r.release.hash}</code>
          </dd>
          <dt>Mapped from</dt>
          <dd>
            <ul>
              {outcomes.map((o) => (
                <li key={o.id}>
                  <code>{o.id}</code> ({o.class}) {o.text}
                </li>
              ))}
            </ul>
          </dd>
          <dt>Families</dt>
          <dd>{c.families.map((f) => `${f.id} (${f.fingerprint})`).join(", ") || "none"}</dd>
          {learner ? (
            <>
              <dt>Evidence history</dt>
              <dd>
                {learner.history(c.evidenceTarget).length ? (
                  <ol>
                    {learner.history(c.evidenceTarget).map((h, k) => (
                      <li key={k}>
                        {new Date(h.at).toLocaleString()} · {h.activity}
                        {h.independent ? " (unaided)" : " (helped or repeated)"} · {h.right ? "right" : "not right"} · <code>{h.question}</code>
                      </li>
                    ))}
                  </ol>
                ) : (
                  "none"
                )}
              </dd>
            </>
          ) : null}
        </dl>
      </details>
    </article>
  );
}

// ---------------------------------------------------------------- the app

function App() {
  const route = useRoute();
  const params = new URLSearchParams(location.search);
  const learnerMode = params.get("view") === "learner";
  const previewMode = params.get("preview") === "1";
  const [index, setIndex] = useState<DashIndex | null>(null);
  const [release, setRelease] = useState<DashRelease | null>(null);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pupils, setPupils] = useState<PupilSummary[]>([]);
  const [learnerId, setLearnerId] = useState(params.get("learner") ?? "");
  const [learner, setLearner] = useState<LearnerView | null>(null);
  const [learnerLoading, setLearnerLoading] = useState(false);
  const [registry, setRegistry] = useState<RegistryLike | null>(null);
  const [arrange, setArrange] = useState(false);
  const [refreshed, setRefreshed] = useState(0);
  const registryRef = useRef<unknown>(null);

  useEffect(() => {
    fetch("data/index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setError("The curriculum index could not be loaded."));
    api
      .status()
      .then(async (s) => {
        setSignedIn(!!s.available && s.account.authenticated);
        if (s.available && s.account.authenticated) {
          const [rows, reg] = await Promise.all([api.pupils().catch(() => []), api.request<{ registry: RegistryLike }>("GET", "/content-review/").catch(() => null)]);
          setPupils(rows);
          if (reg) {
            registryRef.current = reg.registry;
            setRegistry(reg.registry);
          }
          setLearnerId((cur) => (rows.some((p) => p.id === cur) ? cur : learnerMode && rows.length === 1 ? rows[0].id : ""));
        }
      })
      .catch(() => setSignedIn(false));
  }, []);

  // the learner's evidence: the shared engine, loaded on demand
  useEffect(() => {
    setLearner(null);
    if (!learnerId || signedIn !== true) return;
    let live = true;
    setLearnerLoading(true);
    import("./learner")
      .then((m) => m.loadLearner(api, learnerId, registryRef.current, Date.now()))
      .then((v) => live && setLearner(v))
      .catch((e) => live && setError(`The learner's records could not be loaded: ${e.message ?? e}`))
      .finally(() => live && setLearnerLoading(false));
    return () => {
      live = false;
    };
  }, [learnerId, signedIn, registry, refreshed]);
  // coming back to the page (another tab, the phone unlocked) reads the learner's records again
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && setRefreshed((n) => n + 1);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // a learner sees their own year: their enrolment's board and grade
  const own = learnerMode && learner?.enrolment ? index?.releases.find((e) => e.release === learner.enrolment!.curriculum.id) ?? null : null;
  const board: Board = own ? own.board : route.board;
  const grade = own ? own.grade : route.grade;
  const ownUnavailable = learnerMode && learner?.enrolment && index && !own;
  const entry = ownUnavailable ? null : index?.releases.find((e) => e.board === board && e.grade === grade) ?? null;
  useEffect(() => {
    setRelease(null); // never show one curriculum's tiles under another's heading
    if (!entry) return;
    let live = true;
    releaseData(entry.file)
      .then((d) => live && setRelease(d))
      .catch((e) => live && setError(String(e.message ?? e)));
    return () => {
      live = false;
    };
  }, [entry?.file]);

  // mastery per competency for this release, computed once per learner and release (not on every tile render)
  const skillOf = useMemo(() => {
    if (!learner || !release) return null;
    const methods = methodCompetencies(release);
    const cache = new Map<string, Mastery>();
    return (c: string) => {
      let m = cache.get(c);
      if (!m) cache.set(c, (m = masteryOf(learner.skillOf(release.competencies[c]?.evidenceTarget ?? c), methods.has(c))));
      return m;
    };
  }, [learner, release]);

  const r = release && entry && release.release.id === entry.release ? release : null;
  const nodePath = r && route.node ? pathTo(r.nodes, route.node) : null;
  const node = nodePath?.at(-1) ?? null;
  const pupilName = pupils.find((p) => p.id === learnerId)?.display_name;
  const routeHere: Route = { board, grade, node: node?.id ?? null, competency: null };

  const gradeScope = r ? scopeOfAll(r.nodes) : null;
  const nodeScope = node ? scopeOf(node) : null;
  const scope = nodeScope ?? gradeScope;

  // goal pathways: only skills of the learner's own year that a goal builds on (nothing from later grades)
  const goalCards =
    learner && r && learnerMode
      ? learner.goals
          .map((g) => ({ g, o: learner.goalFoundations(g.id, grade, gradeScope!.competencies) }))
          .filter((x) => x.o)
      : [];

  return (
    <div className={`cur${learnerMode ? " learner-notebook" : ""}${previewMode ? " preview-notebook" : ""}`}>
      {TEST_BUILD ? <div className="test-banner">TEST BUILD: every question is treated as educator-reviewed. Never deploy.</div> : null}
      <header className="cur-head">
        <div className="cur-title">
          <a href={previewMode ? "/curriculum/?preview=1#b=cbse&g=7" : learnerId ? `/year/?learner=${encodeURIComponent(learnerId)}` : "/year/"} className="back-home">{previewMode ? "Preview home" : "OpenPath"}</a>
          <h1>Mathematics</h1>
          {previewMode ? <span className="preview-badge">Preview mode · no progress saved</span> : null}
        </div>
        {!learnerMode ? (
          <div className="controls">
            <div className="seg" role="group" aria-label="Board">
              {(["cbse", "tn"] as Board[]).map((b) => (
                <button key={b} type="button" aria-pressed={board === b} onClick={() => go({ board: b, grade, node: null, competency: null })}>
                  {BOARD_WORD[b]}
                </button>
              ))}
            </div>
            <div className="grades" role="group" aria-label="Grade">
              {Array.from({ length: 12 }, (_, k) => k + 1).map((g) => (
                <button key={g} type="button" aria-pressed={grade === g} aria-label={`Grade ${g}`} onClick={() => go({ board, grade: g, node: null, competency: null })}>
                  {g}
                </button>
              ))}
            </div>
            {!previewMode ? <label className="learner-pick">
              Learner
              {signedIn ? (
                <span className="pick-row">
                <select value={learnerId} onChange={(e) => setLearnerId(e.target.value)}>
                  <option value="">No learner (curriculum and coverage only)</option>
                  {pupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                {learnerId ? (
                  <button type="button" className="secondary" onClick={() => setRefreshed((n) => n + 1)} aria-label="Read the learner's records again">
                    Refresh
                  </button>
                ) : null}
                </span>
              ) : signedIn === false ? (
                <span className="muted small">
                  <a href="/year/">Sign in</a> to see your learners' progress.
                </span>
              ) : (
                <span className="muted small">Checking your account…</span>
              )}
            </label> : null}
          </div>
        ) : (
          <div className="learner-curriculum">
            <p className="muted">{pupilName ? `${pupilName}'s year` : "Your year"} · {BOARD_WORD[board]} · Grade {grade}</p>
            <a className="link" href={`/year/?learner=${encodeURIComponent(learnerId)}&curriculum=change`}>Change board or curriculum</a>
          </div>
        )}
      </header>

      {error ? <p className="error" role="alert">{error}</p> : null}
      {!index || (entry && !r) ? <p className="muted loading">Loading the curriculum…</p> : null}
      {ownUnavailable ? <p className="note">Your selected curriculum is available in My Learning Year. This topic dashboard currently lists CBSE/NCERT and Tamil Nadu.</p> : index && !entry ? <p className="muted">No {BOARD_WORD[board]} release for Grade {grade} yet.</p> : null}
      {learnerLoading ? <p className="muted small">Loading {pupilName ?? "the learner"}'s evidence…</p> : null}

      {r && scope && (!learnerMode || !learnerId || learner) ? (
        <main key={`${r.release.id}@${r.release.version}`}>
          <nav className="crumbs" aria-label="Where you are">
            <button type="button" className="link" onClick={() => go({ board, grade, node: null, competency: null })}>
              Grade {grade} · {BOARD_WORD[board]}
            </button>
            {(nodePath ?? []).map((n) => (
              <span key={n.id}>
                {" › "}
                <button type="button" className="link" onClick={() => go({ board, grade, node: n.id, competency: null })}>
                  {n.title}
                </button>
              </span>
            ))}
            {route.competency ? <span> › {r.competencies[route.competency]?.name ?? route.competency}</span> : null}
          </nav>
          {!previewMode && !r.release.sourceVerified ? <p className="note">Parts of this book's inventory could not be checked against the official textbook yet.</p> : null}

          {route.competency ? (
            previewMode ? (
              <Suspense fallback={<p className="muted">Loading the experience…</p>}>
                <PreviewExperience release={r} competency={route.competency} home={() => go({ board, grade, node: null, competency: null })} back={() => history.back()} />
              </Suspense>
            ) : <Detail r={r} id={route.competency} route={routeHere} learner={learner} registry={registry} skillOf={skillOf} />
          ) : (
            <>
              <h2 className="scope-title">{node ? node.title : `Grade ${grade} Mathematics`}</h2>
              <p className="muted small counts">
                {node ? "" : `${r.nodes.length} chapters · `}
                {scope.competencies.length} competencies · {scope.outcomes.length} curriculum outcomes
              </p>
              {!previewMode ? <Summary m={masteryRollup(scope.competencies, skillOf ?? (() => "not_assessed"))} c={coverageRollup(r, scope.outcomes)} learner={learner} scopeWord={node ? node.title : `Grade ${grade}`} /> : <p className="preview-intro">Explore freely. Open any chapter, topic or competency; preview controls let you visit teaching, question and feedback states without submitting work.</p>}
              {learner && learnerMode && node ? <TopicPlan node={node} r={r} skillOf={skillOf!} route={routeHere} learnerId={learnerId} registry={registry} /> : null}
              {goalCards.length && !node ? (
                <section className="goals">
                  {goalCards.map(({ g, o }) => (
                    <div key={g.id} className="card">
                      <strong>Goal: {o!.name}</strong>
                      <p className="muted small">{o!.note}</p>
                      <p className="small">
                        {o!.foundations.length} skills from your year build toward it · {o!.foundations.filter((c) => skillOf?.(c) === "verified").length} verified
                      </p>
                    </div>
                  ))}
                </section>
              ) : null}
              <div className="level-head">
                <h3>{node ? "Inside" : "Chapters"}</h3>
                {!learnerMode && !previewMode ? (
                  <button type="button" className="link" aria-pressed={arrange} onClick={() => setArrange((a) => !a)}>
                    {arrange ? "Done arranging" : "Arrange tiles"}
                  </button>
                ) : null}
              </div>
              {arrange ? <p className="muted small">Arranging changes only the order on this device. The curriculum, its skills and every learner's evidence stay the same.</p> : null}
              <Tiles prescribed={previewMode} learnerId={learnerMode && learner ? learnerId : undefined} nodes={node ? node.children : r.nodes} parent={node?.id ?? "root"} r={r} skillOf={skillOf} route={routeHere} arrange={arrange} />
              {!previewMode ? <OutcomeList r={r} ids={node?.outcomes ?? []} /> : null}
            </>
          )}
        </main>
      ) : null}
    </div>
  );
}

function nextTopicSkill(node: DashNode, r: DashRelease, skillOf: (c:string)=>Mastery) {
 const ids=scopeOf(node).competencies;
 return ["review","learning","not_assessed"].flatMap(m=>ids.filter(c=>skillOf(c)===m)).find(c=>contentOf(r.competencies[c]).learn) ?? null;
}

/** A learner opening a topic: what is verified, being learned, waiting for its delayed check, and what to do next. */
function TopicPlan({ node, r, skillOf, route, learnerId, registry }: { registry: RegistryLike | null; learnerId: string; node: DashNode; r: DashRelease; skillOf: (c: string) => Mastery; route: Route }) {
  const ids = scopeOf(node).competencies;
  const by = (m: Mastery) => ids.filter((c) => skillOf(c) === m);
  const next = nextTopicSkill(node,r,skillOf);
  return (
    <section className="topic-plan card">
      <div className="small">
        <strong>{by("verified").length}</strong> verified · <strong>{by("learning").length + by("review").length}</strong> learning · <strong>{by("pending").length}</strong> awaiting verification (a delayed check or an educator's mark)
      </div>
      {next ? (
        <div>
          Next:{" "}
          <button type="button" className="link" onClick={() => go({ ...route, competency: next })}>
            {r.competencies[next].name}
          </button>
          {contentOf(r.competencies[next]).learn && <p><a className="primary" href={`/year/?learner=${encodeURIComponent(learnerId)}&skill=${encodeURIComponent(r.competencies[next].evidenceTarget)}${r.release.grade === 7 ? "&diagnostic=topic" : ""}`}>{r.release.grade === 7 ? "Start diagnostic" : "Start learning"}</a></p>}
          <p className="muted small">Content review: {REVIEW_WORD[reviewState(registry, `module:${next}`, r.competencies[next].module?.hash ?? "")]}. Practice does not grant verified mastery.</p>
        </div>
      ) : null}
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
