/**
 * /developer: the founder's diagnostics. Only for an account with an explicit developer grant (a one-time code from
 * the Codespace log); the server refuses everyone else, whatever this screen shows.
 *
 * Everything here is read-only. A pupil's record is fetched once from the audited developer API and replayed in this
 * browser by the existing engine (logic/diagnostics.ts); nothing is written back.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Api, ApiError, type DeveloperOverview, type DeveloperPupil } from "../logic/account.ts";
import { type AppContent, loadContent } from "../logic/content.ts";
import { type Access, checkAccess } from "../logic/developer-access.ts";
import { type Diagnosis, type Report, type TimelineEntry, NOT_RECORDED, bankCoverage, buildReport, diagnose } from "../logic/diagnostics.ts";
import type { AppEvent, SelectionTrace } from "../logic/events.ts";
import { APP_BUILD } from "../logic/telemetry.ts";

type View = { name: "overview" } | { name: "pupils" } | { name: "pupil"; id: string } | { name: "content" } | { name: "audit" };

const fmtTime = (iso: string) => iso.replace("T", " ").slice(0, 16);

function Table({ head, rows, label }: { head: string[]; rows: ReactNode[][]; label: string }) {
  return (
    <div className="dev-table" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children, open = false, count }: { title: string; children: ReactNode; open?: boolean; count?: number | string }) {
  return (
    <details className="dev-section" open={open}>
      <summary>
        {title}
        {count !== undefined && <span className="dev-count">{count}</span>}
      </summary>
      <div className="dev-body">{children}</div>
    </details>
  );
}

export function Developer() {
  const api = useMemo(() => new Api(), []);
  const [access, setAccess] = useState<Access | { phase: "loading" }>({ phase: "loading" });
  const [view, setView] = useState<View>({ name: "overview" });
  const phase = access.phase;
  const commit = access.phase === "ready" || access.phase === "not-developer" ? access.commit : "";

  // checkAccess never throws and every request has a time limit, so this always ends in a definite state
  const check = async () => {
    setAccess({ phase: "loading" });
    setAccess(await checkAccess(api, APP_BUILD));
  };
  useEffect(() => {
    document.title = "OpenPath · Developer diagnostics";
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dev">
      <header className="dev-top">
        <a href="/" className="dev-brand">
          OpenPath
        </a>
        <span className="dev-badge">Developer diagnostics · read-only</span>
      </header>
      {phase === "loading" && (
        <p className="loading" role="status">
          Checking access…
        </p>
      )}
      {access.phase === "error" && (
        <div className="dev-card stack" role="alert">
          <h1>{access.title}</h1>
          <p>{access.message}</p>
          <p className="small">Detail: {access.detail}</p>
          <button type="button" className="primary" onClick={() => void check()}>
            Retry
          </button>
        </div>
      )}
      {access.phase === "ready" && access.mismatch && <p className="warning">{access.mismatch}</p>}
      {phase === "no-server" && <p className="warning">This copy of OpenPath has no account server, so there are no diagnostics to show. Open the Codespaces preview instead.</p>}
      {phase === "signed-out" && <SignIn api={api} onDone={check} />}
      {phase === "not-developer" && <Claim api={api} onDone={check} />}
      {phase === "ready" && (
        <>
          <nav className="dev-nav" aria-label="Developer sections">
            {(
              [
                ["overview", "Health"],
                ["pupils", "Pupils"],
                ["content", "Question bank"],
                ["audit", "Audit log"],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-current={view.name === id || (id === "pupils" && view.name === "pupil") ? "page" : undefined} onClick={() => setView({ name: id } as View)}>
                {label}
              </button>
            ))}
          </nav>
          <main className="dev-main">
            {view.name === "overview" && <Overview api={api} />}
            {view.name === "pupils" && <Pupils api={api} onOpen={(id) => setView({ name: "pupil", id })} />}
            {view.name === "pupil" && <PupilDiagnostics api={api} id={view.id} serverCommit={commit} onBack={() => setView({ name: "pupils" })} />}
            {view.name === "content" && <Coverage />}
            {view.name === "audit" && <Audit api={api} />}
          </main>
        </>
      )}
      <footer className="dev-foot small">
        app {APP_BUILD} · server {commit || "–"} · all educational content is provisional (awaiting educator review)
      </footer>
    </div>
  );
}

function SignIn({ api, onDone }: { api: Api; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      className="dev-card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.login(email, password);
          onDone();
        } catch (err) {
          setProblem((err as Error).message);
        }
      }}
    >
      <h1>Sign in</h1>
      <p>Sign in with the parent account that holds the developer grant. Signing in gives no developer access by itself.</p>
      <label>
        Email
        <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="primary">
        Sign in
      </button>
    </form>
  );
}

function Claim({ api, onDone }: { api: Api; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <form
      className="dev-card stack"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api.claimDeveloper(code);
          onDone();
        } catch (err) {
          setProblem(err instanceof ApiError && err.status === 429 ? "Too many tries. Wait an hour, or issue a new code." : (err as Error).message);
        }
      }}
    >
      <h1>Developer access</h1>
      <p>This account is not a developer. To make it one, enter the one-time developer code printed in your Codespace's creation log (it looks like ABCD-EFGH-JKLM and works once, for 24 hours).</p>
      <label>
        Developer code
        <input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} />
      </label>
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="primary">
        Unlock diagnostics
      </button>
      <p className="small">Every attempt is recorded. Knowing this address, or registering with a particular email, grants nothing.</p>
    </form>
  );
}

function useLoad<T>(f: () => Promise<T>, deps: unknown[] = []): { data: T | null; problem: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setProblem(null);
    f()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setProblem(e.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ...deps]);
  return { data, problem, reload: () => setN((x) => x + 1) };
}

function Overview({ api }: { api: Api }) {
  const { data: o, problem, reload } = useLoad<DeveloperOverview>(() => api.developerOverview());
  if (problem) return <Problem message={problem} onRetry={reload} />;
  if (!o) return <p className="loading">Loading…</p>;
  const c = o.counts;
  const errors = o.recent_server_errors.length + o.recent_app_errors.length;
  return (
    <div className="stack">
      <div className="dev-head">
        <h1>Application health</h1>
        <button type="button" className="secondary dev-small" onClick={reload}>
          Refresh
        </button>
      </div>
      <div className="dev-stats">
        <Stat label="Server" value={o.server.commit} note={`${o.server.database}${o.server.debug ? ", DEBUG on" : ""}`} />
        <Stat label="App builds seen (7 days)" value={o.app_versions_seen.join(", ") || "–"} note={`this page: ${APP_BUILD}`} />
        <Stat label="Pupils" value={c.pupils} note={`${c.pupils_shared_for_diagnostics} shared for diagnostics · ${c.accounts} accounts`} />
        <Stat label="Sessions" value={c.sessions} note={`${c.assessment_sessions} assessments`} />
        <Stat label="Answers recorded" value={c.answers_recorded} note={`${c.events} events · ${c.events_last_24h} in 24 h`} />
        <Stat label="Errors (recent)" value={errors} note={`${o.recent_server_errors.length} server · ${o.recent_app_errors.length} app`} warn={errors > 0} />
      </div>
      <Section title="Events by kind" count={Object.keys(c.events_by_kind).length}>
        <Table label="Events by kind" head={["kind", "count"]} rows={Object.entries(c.events_by_kind).map(([k, v]) => [k, v])} />
      </Section>
      <Section title="App performance, last 7 days (ms)" open count={Object.keys(o.app_last_7_days).length}>
        <p className="small">Measured in the app: answer (save + rebuild after an answer), save, Learner Vector rebuild, question selection, opening a learner; and failures.</p>
        <Table label="App performance" head={["measure", "count", "p50", "p95", "max", "failures"]} rows={Object.entries(o.app_last_7_days).map(([k, v]) => [k, v.count, v.p50 ?? "–", v.p95 ?? "–", v.max ?? "–", v.failures])} />
      </Section>
      <Section title="API performance, last 7 days (ms)" count={Object.keys(o.api_last_7_days).length}>
        <Table label="API performance" head={["route", "count", "p50", "p95", "max", "4xx", "5xx"]} rows={Object.entries(o.api_last_7_days).map(([k, v]) => [k, v.count, v.p50 ?? "–", v.p95 ?? "–", v.max ?? "–", v.client_errors, v.server_errors])} />
      </Section>
      <Section title="Recent server errors" open={o.recent_server_errors.length > 0} count={o.recent_server_errors.length}>
        {o.recent_server_errors.length ? <Table label="Server errors" head={["at", "route", "error"]} rows={o.recent_server_errors.map((e) => [fmtTime(e.at), `${e.method} ${e.route}`, e.error])} /> : <p>None.</p>}
      </Section>
      <Section title="Recent app errors and failed saves" open={o.recent_app_errors.length > 0} count={o.recent_app_errors.length}>
        {o.recent_app_errors.length ? <Table label="App errors" head={["at", "kind", "detail", "build"]} rows={o.recent_app_errors.map((e) => [fmtTime(e.at), e.name, e.detail, e.app_version])} /> : <p>None.</p>}
      </Section>
      <p className="small">Generated {fmtTime(o.generated_at)} UTC. Aggregates only: no names, emails or answers are on this page.</p>
    </div>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="dev-card stack" role="alert">
      <p className="warning">{message}</p>
      <button type="button" className="secondary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function Stat({ label, value, note, warn }: { label: string; value: ReactNode; note?: string; warn?: boolean }) {
  return (
    <div className={`dev-stat${warn ? " warn" : ""}`}>
      <span className="small">{label}</span>
      <b>{value}</b>
      {note && <span className="small">{note}</span>}
    </div>
  );
}

function Pupils({ api, onOpen }: { api: Api; onOpen: (id: string) => void }) {
  const { data, problem, reload } = useLoad<DeveloperPupil[]>(() => api.developerPupils());
  if (problem) return <Problem message={problem} onRetry={reload} />;
  if (!data) return <p className="loading">Loading…</p>;
  return (
    <div className="stack">
      <h1>Test pupils</h1>
      <p className="small">Pupils in this account, and pupils whose parent turned on "Share for diagnostics". Opening one is recorded in the audit log.</p>
      {!data.length && <p>No pupils yet. Add one in the app (Me → Switch learner → Add a learner).</p>}
      <ul className="dev-list">
        {data.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)}>
              <b>{p.display_name}</b>
              <span className="small">
                {p.events} events · added {p.created_at.slice(0, 10)} · {p.own ? "this account" : "shared by its parent"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PupilDiagnostics({ api, id, serverCommit, onBack }: { api: Api; id: string; serverCommit: string; onBack: () => void }) {
  const content = useMemo<AppContent>(() => loadContent(), []);
  const [state, setState] = useState<{ name: string; own: boolean; events: AppEvent[]; d: Diagnosis } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = () => {
    setProblem(null);
    setAttempt((n) => n + 1);
  };
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const r = await api.developerPupilEvents(id);
        const d = await diagnose(content, { pupil: { id, name: r.pupil.display_name }, events: r.events, now: new Date().toISOString(), serverCommit });
        if (live) setState({ name: r.pupil.display_name, own: r.pupil.own, events: r.events, d });
      } catch (e) {
        if (live) setProblem((e as Error).message);
      }
    })();
    return () => {
      live = false;
    };
  }, [api, id, content, serverCommit, attempt]);
  if (problem) return <Problem message={problem} onRetry={reload} />;
  if (!state) return <p className="loading">Replaying the record through the OpenPath engine…</p>;
  const { d } = state;
  const own = d.learner_vector.filter((x) => d.evidence.some((e) => e.capability === x.id));
  const high = d.issues.filter((i) => i.severity === "high" || i.severity === "medium").length;
  return (
    <div className="stack">
      <button type="button" className="link" onClick={onBack}>
        ← All pupils
      </button>
      <h1>{state.name}</h1>
      <p className="small">
        {state.own ? "In this account." : "Shared for diagnostics by its parent."} Read-only: computed in this browser by the OpenPath engine from {d.counts.events} recorded events; nothing is written back.
      </p>
      <div className="dev-stats">
        <Stat label="Answered" value={d.counts.questions_answered} note={`${d.counts.first_attempts.correct} right first time · ${d.counts.second_tries_or_help} helped`} />
        <Stat label="Sessions" value={d.counts.sessions} note={`${d.counts.assessments} assessment${d.counts.assessments === 1 ? "" : "s"} · placement ${d.placement_done ? "done" : "not done"}`} />
        <Stat label="Decisions traced" value={`${d.tracing.traced}/${d.tracing.questions}`} note={`${d.tracing.plansTraced}/${d.tracing.sessions} sessions`} />
        <Stat label="Checks" value={d.issues.length} note={`${high} high/medium`} warn={high > 0} />
      </div>
      <ReportPanel d={d} />
      <Section title="Consistency checks and misleading labels" open={high > 0} count={d.issues.length}>
        {d.issues.length ? (
          <ul className="dev-issues">
            {d.issues.map((i, k) => (
              <li key={k} className={`sev-${i.severity}`}>
                <b>
                  [{i.severity}] {i.check}
                </b>{" "}
                {i.detail}
              </li>
            ))}
          </ul>
        ) : (
          <p>No problems found.</p>
        )}
      </Section>
      <Section title="Learner Vector (skills with answers)" open count={own.length}>
        <Table
          label="Learner Vector"
          head={["skill", "estimate ± sd", "80% range", "certainty", "standing", "mastery", "engine stage", "independent", "after lesson", "helped"]}
          rows={own.map((x) => [
            <span title={x.id}>{x.name}</span>,
            `${x.estimate.mean} ± ${x.estimate.sd}`,
            `${x.estimate.range_80[0]}–${x.estimate.range_80[1]}`,
            x.certainty,
            x.standing,
            x.mastery ? <span title={x.mastery_note ?? ""}>{x.mastery}</span> : "–",
            x.engine_stage,
            `${x.evidence.independentRight}/${x.evidence.independent}`,
            `${x.evidence.afterTeachingRight}/${x.evidence.afterTeaching}`,
            `${x.evidence.assistedRight}/${x.evidence.assisted}`,
          ])}
        />
        <AllSkills d={d} />
      </Section>
      <Section title="Today's recommendations and why" open count={d.today.length}>
        {d.today.map((t, i) => (
          <div key={i} className="dev-card">
            <b>
              {i + 1}. {t.title}
            </b>{" "}
            <span className="small">
              [{t.kind}; {t.planner_action ?? "–"}; priority {t.priority ?? "–"}]
            </span>
            <p>
              <b>Why:</b> {t.why}
            </p>
            {t.would_change_if && (
              <p className="small">
                <b>Would change if:</b> {t.would_change_if}
              </p>
            )}
          </div>
        ))}
        {d.plan.for_adults.length > 0 && (
          <p className="small">
            <b>For an adult:</b> {d.plan.for_adults.map((r) => `${r.action} ${r.capability ?? ""}: ${r.why}`).join(" · ")}
          </p>
        )}
      </Section>
      <Section title="Next question for each activity (difficulty vs ability)" count={d.next_questions.length}>
        <p className="small">The app's own selection, run on a throwaway copy of the record. Nothing is recorded.</p>
        {d.next_questions.map((n, i) => (
          <div key={i} className="dev-card">
            <b>{n.activity}</b>
            <p>{n.error ? `Failed: ${n.error}` : !n.first ? "Nothing to ask." : n.first.lesson ? `A lesson first (${n.first.lesson}).` : `${n.first.item} on ${n.first.capability}, difficulty ${n.first.difficulty}${n.first.difficulty_vs_estimate != null ? ` (${n.first.difficulty_vs_estimate >= 0 ? "+" : ""}${n.first.difficulty_vs_estimate} vs the estimate)` : ""}${n.first.pool ? `, ${n.first.pool} pool` : ""}`}</p>
            {n.first?.prompt && <p className="small">“{n.first.prompt}”</p>}
            {n.selection && <SelectionView t={n.selection} />}
          </div>
        ))}
      </Section>
      <Section title="Misconceptions and skill gaps" count={d.misconceptions_and_gaps.length}>
        {d.misconception_findings.length > 0 && (
          <Table
            label="Misconception status"
            head={["misconception", "skill", "status", "evidence for it", "why", "errors on", "right since on", "not counted"]}
            rows={d.misconception_findings.map((f) => [f.misconception, f.capability, <b>{f.status.replace("_", " ")}</b>, f.support, f.reason, f.errors.map((e) => `${e.item} (b ${e.b})`).join(", ") || "–", f.laterRight.map((e) => `${e.item} (b ${e.b}${e.atLevel ? "" : ", easier"})`).join(", ") || "–", f.notCounted])}
          />
        )}
        {d.misconceptions_and_gaps.length ? (
          <Table label="Misconceptions" head={["skill", "standing", "patterns in wrong answers", "difficulties and notes"]} rows={d.misconceptions_and_gaps.map((g) => [g.name, g.standing, g.misconceptions.map((m: { id: string; strength: number }) => `${m.id} (${m.strength})`).join(", ") || "–", [...g.difficulties, ...g.notes].join("; ") || "–"])} />
        ) : (
          <p>None found yet.</p>
        )}
      </Section>
      <Section title="Independent evidence vs assisted practice" count={Object.keys(d.independent_vs_assisted).length}>
        <Table label="Evidence kinds" head={["kind", "right / answers"]} rows={Object.entries(d.independent_vs_assisted).map(([k, v]) => [k, `${v.right}/${v.n}`])} />
        <p className="small">independent: counted, fresh, unhelped. after_teaching: unhelped but after a lesson in the same session (moves the estimate, cannot demonstrate). held_*: kept but changes no estimate. assisted: a later try or with help.</p>
      </Section>
      <Section title="Demonstration and retention" count={d.retention.length}>
        <Table label="Retention" head={["skill", "standing", "mastery", "estimated (engine)", "evidence gate (C′)", "shown now", "shown earlier", "confirmed", "qualifying", "verification", "later check"]} rows={d.retention.map((x) => [x.name, x.standing, x.mastery ?? "–", x.demonstrated_level ?? "–", x.gate === "not passed" || x.gate.startsWith("passed at") ? `${x.gate}: ${x.gate_missing.join(" ")}` : x.gate, x.levels.demonstrated ?? "–", x.levels.historical ?? "–", x.levels.confirmed ?? "–", `${x.qualifying_answers} in ${x.contexts} formats`, x.verification, x.retention.status === "none" ? "not scheduled" : `${x.retention.status}, due ${String(x.retention.due ?? "").slice(0, 10)}, ${x.retention.checks} done`])} />
      </Section>
      <Section title="Missing evidence and content shortages">
        <ul>
          <li>{d.unknown_and_shortages.never_checked} skills never checked ({Object.entries(d.unknown_and_shortages.never_checked_by_area).map(([k, v]) => `${k} ${v}`).join(", ") || "–"}).</li>
          <li>Too little evidence: {d.unknown_and_shortages.too_little_evidence.join("; ") || "none"}.</li>
          <li>Answered but no later (retention) check yet: {d.unknown_and_shortages.no_retention_check_yet}.</li>
          {d.unknown_and_shortages.no_unused_questions_left.length > 0 && <li>No unused questions left: {d.unknown_and_shortages.no_unused_questions_left.join(", ")}.</li>}
          {d.unknown_and_shortages.no_teaching_activity.length > 0 && <li>Found hard with no teaching activity: {d.unknown_and_shortages.no_teaching_activity.join(", ")}.</li>}
          {d.unknown_and_shortages.bank_gaps_reported_by_engine.map((g: { capability: string; note: string }) => (
            <li key={g.capability}>
              Bank gap reported by the engine: {g.capability}: {g.note}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Questions answered (with difficulty relative to ability)" count={d.counts.first_attempts.total}>
        {d.evidence.map((x) => (
          <div key={x.capability}>
            <h3>{x.name}</h3>
            <Table
              label={`Answers on ${x.name}`}
              head={["", "item", "b", "b − estimate", "kind", "answer", "key", "estimate"]}
              rows={x.answers.map((r) => [r.correct ? "✓" : "✗", r.item, r.difficulty, r.difficulty_vs_estimate_before ?? "–", r.evidence_kind, r.answer, r.correct ? "" : r.key, r.estimate_change ? `${r.estimate_change.from}→${r.estimate_change.to}` : "–"])}
            />
          </div>
        ))}
      </Section>
      <Section title="Decision trace" count={`${d.tracing.traced}/${d.tracing.questions}`}>
        <Timeline entries={d.timeline} />
      </Section>
      <Section title="Complete event history" count={state.events.length}>
        <EventList events={state.events} />
      </Section>
    </div>
  );
}

function AllSkills({ d }: { d: Diagnosis }) {
  const [show, setShow] = useState(false);
  if (!show)
    return (
      <button type="button" className="link" onClick={() => setShow(true)}>
        Show all {d.learner_vector.length} skills (including those at the prior or moved only by related skills)
      </button>
    );
  return <Table label="All skills" head={["skill", "estimate ± sd", "direct answers", "standing", "stage"]} rows={d.learner_vector.map((x) => [<span title={x.id}>{x.name}</span>, `${x.estimate.mean} ± ${x.estimate.sd}`, x.direct.n, x.standing, x.engine_stage])} />;
}

function SelectionView({ t }: { t: SelectionTrace }) {
  if (t.selector === "queue")
    return (
      <p className="small">
        Fixed list: position {t.queue?.position} of {t.queue?.length} — {t.queue?.reason}
      </p>
    );
  if (t.selector === "planner")
    return (
      <p className="small">
        Rule planner: <b>{t.planner?.action}</b>
        {t.planner?.itemRole ? ` (${t.planner.itemRole} item)` : ""}; diagnosis {t.planner?.diagnosis}. {t.planner?.reason}
      </p>
    );
  return (
    <div className="small dev-trace">
      {t.spelling && (
        <p>
          <b>Spelling rule:</b> {t.spelling.rule.replace(/_/g, " ")}
          {t.spelling.window ? ` (±${t.spelling.window} band)` : ""}. {t.spelling.reasons.join(" ")}
          {t.spelling.estimates.length ? ` Estimates then: ${t.spelling.estimates.map((e) => `${e.capability.split(".").pop()} ${e.mean}±${e.sd}`).join(", ")}.` : ""}
        </p>
      )}
      <p>
        <b>Knew:</b> {(t.knew ?? []).map((k) => `${k.capability} ${k.mean}±${k.sd} (${k.n} answers, ${k.stage})`).join("; ") || "–"}
      </p>
      {t.candidates && (
        <p>
          <b>Candidates:</b> {t.candidates.eligible} eligible of {t.candidates.unseen} unseen on the goal; kept out: {t.candidates.excludedReserved} reserved for another use, {t.candidates.excludedPassage} by the passage rule, {t.candidates.excludedSeenWord} word already seen; {t.candidates.seen} already seen.
        </p>
      )}
      <p>
        <b>Engine:</b> mode {t.mode}, path {t.path}, schedule {t.schedule}; target band {t.target?.band} ({t.target?.source}).
      </p>
      {t.chosen && (
        <p>
          <b>Chosen</b> {t.chosen.item} (b {t.chosen.difficulty}): score {t.chosen.score}, p(right) {t.chosen.p}. {t.chosen.reasons.join("; ")}
        </p>
      )}
      {t.alternatives && t.alternatives.length > 0 && (
        <Table label="Alternatives" head={["not chosen", "skill", "b", "score", "p", "why not"]} rows={t.alternatives.map((a) => [a.item, a.capability ?? "–", a.difficulty ?? "–", a.score, a.p, a.whyNot ?? ""])} />
      )}
      {t.bankGaps?.map((g) => (
        <p key={g.capability}>
          <b>Bank gap:</b> {g.capability}: {g.note}
        </p>
      ))}
      {t.explanation && <p>{t.explanation}</p>}
    </div>
  );
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const [limit, setLimit] = useState(25);
  const latest = [...entries].reverse();
  return (
    <div className="stack">
      <p className="small">Most recent first. Each decision is shown as it was recorded when it was made. Older ones say "{NOT_RECORDED}".</p>
      <ol className="dev-timeline">
        {latest.slice(0, limit).map((e, i) =>
          e.kind === "session" ? (
            <li key={i} className="dev-session">
              <b>
                {fmtTime(e.at)} · session {e.type}
                {e.capability ? ` · ${e.capability}` : ""}
                {e.purpose ? ` (${e.purpose})` : ""}
              </b>{" "}
              <span className="small">{e.ended ?? "not finished"}</span>
              {e.plan ? (
                <p className="small">
                  Today offered: {e.plan.offered.map((o, k) => `${k + 1}. ${o.title}`).join(" · ") || "nothing"}; started {e.plan.startedRank === null ? "from outside Today" : `#${e.plan.startedRank + 1}`}.{e.planChange ? ` Since the last recorded plan: ${e.planChange}.` : ""}
                </p>
              ) : (
                <p className="small dev-missing">Why this was started: {NOT_RECORDED}</p>
              )}
            </li>
          ) : (
            <li key={i}>
              <details>
                <summary>
                  {e.answer ? (e.answer.correct ? "✓" : "✗") : "·"} {e.item} <span className="small">({e.capability ?? "–"}, b {e.difficulty ?? "–"}, {e.purpose}{e.answer ? `, ${e.answer.kind}` : ", not answered"})</span>
                </summary>
                {e.selection ? <SelectionView t={e.selection} /> : <p className="small dev-missing">Why it was chosen: {NOT_RECORDED}</p>}
                {e.effect ? (
                  <p className="small">
                    <b>Effect:</b> {e.effect.verdict}
                    {e.effect.before && e.effect.after ? ` — ${e.effect.capability} ${e.effect.before.mean}±${e.effect.before.sd} → ${e.effect.after.mean}±${e.effect.after.sd}` : ""}
                    {e.effect.inferred.length ? `; related skills: ${e.effect.inferred.map((x) => `${x.capability} ${x.shift >= 0 ? "+" : ""}${x.shift}`).join(", ")}` : ""}
                    {e.effect.verdict !== "accepted" ? ` (${e.effect.reasons.join("; ")})` : ""}
                    {e.difficultyVsEstimate != null ? `. Difficulty was ${e.difficultyVsEstimate >= 0 ? "+" : ""}${e.difficultyVsEstimate} vs the estimate.` : ""}
                  </p>
                ) : (
                  e.answer && <p className="small">Effect: none on the estimate ({e.answer.kind}).</p>
                )}
                {e.answer && (
                  <p className="small">
                    Answer: “{e.answer.text}”{e.answer.misconceptions.length ? ` [${e.answer.misconceptions.join(", ")}]` : ""}
                    {e.answer.errorKind ? ` · looks like: ${e.answer.errorKind.replace(/_/g, " ")}` : ""}
                    {e.answer.tries > 1 ? ` · ${e.answer.tries} tries` : ""}
                  </p>
                )}
                {e.next && <p className="small">Then: {e.next}.</p>}
              </details>
            </li>
          ),
        )}
      </ol>
      {limit < latest.length && (
        <button type="button" className="secondary" onClick={() => setLimit(limit + 50)}>
          Show older ({latest.length - limit} more)
        </button>
      )}
    </div>
  );
}

function EventList({ events }: { events: AppEvent[] }) {
  const [limit, setLimit] = useState(40);
  const latest = [...events].reverse();
  return (
    <div className="stack">
      <ol className="dev-events" reversed>
        {latest.slice(0, limit).map((e) => (
          <li key={e.id}>
            <details>
              <summary>
                {fmtTime(e.at)} · <b>{e.kind}</b>
                {"session" in e && e.session ? ` · ${e.session}` : ""}
                {"item" in e && e.item ? ` · ${e.item.id}` : ""}
              </summary>
              <pre>{JSON.stringify(e.kind === "flag" ? { ...e, note: "(note hidden)" } : e, null, 1)}</pre>
            </details>
          </li>
        ))}
      </ol>
      {limit < latest.length && (
        <button type="button" className="secondary" onClick={() => setLimit(limit + 100)}>
          Show older ({latest.length - limit} more)
        </button>
      )}
    </div>
  );
}

function ReportPanel({ d }: { d: Diagnosis }) {
  const [redact, setRedact] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const make = () => {
    setReport(buildReport(d, { redact }));
    setMsg(null);
  };
  const full = report ? `${report.text}\n\n--- JSON ---\n${JSON.stringify(report.json, null, 1)}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setMsg("Copied: the readable report and the JSON. Paste it into ChatGPT or Claude.");
    } catch {
      const ta = document.getElementById("dev-report") as HTMLTextAreaElement | null;
      ta?.select();
      setMsg(document.execCommand?.("copy") ? "Copied." : "Select the text below and copy it.");
    }
  };
  const save = (body: string, ext: string, type: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type }));
    a.download = `openpath-diagnostic-${redact ? "pupil-a" : "pupil"}-${d.generated_at.slice(0, 10)}.${ext}`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="dev-card stack dev-report">
      <b>Diagnostic report for an AI assistant</b>
      <label className="dev-check">
        <input
          type="checkbox"
          checked={redact}
          onChange={(e) => {
            setRedact(e.target.checked);
            setReport(null);
          }}
        />
        Redact the name and record id (recommended)
      </label>
      <button type="button" className="primary" onClick={make}>
        Generate Diagnostic Report
      </button>
      {report && (
        <>
          <div className="dev-row">
            <button type="button" className="primary" onClick={copy}>
              Copy Report
            </button>
            <button type="button" className="secondary" onClick={() => save(full, "txt", "text/plain")}>
              Download (.txt)
            </button>
            <button type="button" className="secondary" onClick={() => save(JSON.stringify(report.json, null, 1), "json", "application/json")}>
              Download JSON
            </button>
          </div>
          {msg && <p className="ok-note">{msg}</p>}
          <textarea id="dev-report" readOnly value={full} rows={12} aria-label="Report text" />
          <p className="small">
            {redact ? "Redacted: the pupil is “Pupil A”; no emails, passwords, tokens or flag notes are included." : "Not redacted: includes the pupil's name and record id. No emails, passwords, tokens or flag notes are ever included."} The report contains answers and timings, as a diagnosis needs them.
          </p>
        </>
      )}
    </div>
  );
}

function Coverage() {
  const content = useMemo<AppContent>(() => loadContent(), []);
  const rows = useMemo(() => bankCoverage(content), [content]);
  const total = rows.reduce((t, r) => t + r.handWritten, 0);
  const bands = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => rows.reduce((t, r) => t + r.bands[b], 0));
  const thin = rows.filter((r) => r.handWritten > 0 && r.handWritten < 6).length;
  return (
    <div className="stack">
      <h1>Question bank coverage</h1>
      <p className="small">From the content in this build. Every question is provisional (draft, awaiting educator review) unless counted as validated.</p>
      <div className="dev-stats">
        <Stat label="Hand-written questions" value={total} note={`${rows.reduce((t, r) => t + r.validated, 0)} validated`} />
        <Stat label="Generated practice words" value={rows.reduce((t, r) => t + r.generated, 0)} note="practice only; never evidence" />
        <Stat label="Skills with no questions" value={rows.filter((r) => !r.handWritten && !r.generated).length} note={`of ${rows.length}`} warn />
        <Stat label="Skills with fewer than 6" value={thin} />
      </div>
      <Table label="Difficulty distribution" head={["band", "1", "2", "3", "4", "5", "6", "7", "8"]} rows={[["questions", ...bands]]} />
      <Table
        label="Coverage by skill"
        head={["skill", "questions", "by band 1–8", "pools", "practice words", "lesson"]}
        rows={rows.map((r) => [
          <span title={r.capability}>{r.name}</span>,
          r.handWritten,
          r.bands.join(" "),
          Object.entries(r.pools)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ") || "–",
          r.generated || "–",
          r.lesson ? "yes" : "–",
        ])}
      />
    </div>
  );
}

function Audit({ api }: { api: Api }) {
  const { data, problem, reload } = useLoad(() => api.developerAudit());
  if (problem) return <Problem message={problem} onRetry={reload} />;
  if (!data) return <p className="loading">Loading…</p>;
  return (
    <div className="stack">
      <h1>Your audit log</h1>
      <p className="small">Every developer read is recorded on the server (who, when, what, which pupil). These are your last 100.</p>
      <Table label="Audit log" head={["at", "action", "pupil"]} rows={data.map((e) => [fmtTime(e.at), e.action, e.pupil ? `${e.pupil.slice(0, 8)}…` : "–"])} />
    </div>
  );
}
