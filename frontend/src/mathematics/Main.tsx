import { competencyGraph } from "../../../packages/mathematics/src/prerequisites";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  competencies,
  examTracks,
  type Competency,
} from "../../../packages/mathematics/src/curriculum";
import {
  generate,
  generateBatch,
  evaluate,
  type GeneratedItem,
} from "../../../packages/mathematics/src/generator";
import {
  programFor,
  startProgram,
  updateProgram,
  programKey,
  completion,
  type ProgramRecord,
  type AttemptReceipt,
  type StageId,
} from "../../../packages/mathematics/src/program";
import { candidateResponse } from "../../../packages/mathematics/src/adapter";
import "./style.css";
const currentGraph = competencyGraph();
type Saved = {
  version: 1;
  records: Record<string, ProgramRecord>;
  drafts: Record<string, string>;
  seeds: Record<string, number>;
  support?: Record<string, { hint: boolean; solution: boolean }>;
};
const storageKey = "openpath-math-program-preview@1";
function read(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (
      v?.version === 1 &&
      v.records &&
      typeof v.records === "object" &&
      v.drafts &&
      v.seeds &&
      Object.values(v.records).every((raw) => {
        const r = raw as ProgramRecord;
        return (
          r?.schemaVersion === 1 &&
          typeof r.programId === "string" &&
          competencies.some(
            (c) => c.id === r.programId && c.version === r.programVersion,
          ) &&
          Array.isArray(r.completed) &&
          Array.isArray(r.attempts) &&
          Array.isArray(r.timeReceipts) &&
          typeof r.current === "string" &&
          Number.isFinite(r.elapsedMs)
        );
      }) &&
      Object.values(v.seeds).every(
        (s) =>
          typeof s === "number" &&
          Number.isInteger(s) &&
          s >= 0 &&
          s <= 0xffffffff,
      ) &&
      Object.values(v.drafts).every((d) => typeof d === "string")
    )
      return v;
  } catch {}
  return { version: 1, records: {}, drafts: {}, seeds: {} };
}
const route = () => new URLSearchParams(location.hash.slice(1));
function useVisibleDuration(key: string) {
  const clock = useRef({
    elapsed: 0,
    last: Date.now(),
    visible: document.visibilityState === "visible",
  });
  useEffect(() => {
    clock.current = {
      elapsed: 0,
      last: Date.now(),
      visible: document.visibilityState === "visible",
    };
    const tick = () => {
      const now = Date.now();
      if (clock.current.visible)
        clock.current.elapsed += now - clock.current.last;
      clock.current.last = now;
      clock.current.visible = document.visibilityState === "visible";
    };
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [key]);
  return () =>
    Math.min(
      3600000,
      clock.current.elapsed +
        (clock.current.visible ? Date.now() - clock.current.last : 0),
    );
}
function App() {
  const [saved, setSaved] = useState(read),
    [tab, setTab] = useState(
      route().get("tab") === "exams" ? "exams" : "school",
    ),
    [track, setTrack] = useState(
      examTracks.some((t) => t.id === route().get("track"))
        ? route().get("track")!
        : "jee-main",
    ),
    [expanded, setExpanded] = useState<string | null>(
      route().get("competency"),
    ),
    [search, setSearch] = useState(route().get("search") ?? ""),
    [error, setError] = useState("");
  useEffect(() => {
    const p = new URLSearchParams({ tab, track, search });
    if (expanded) p.set("competency", expanded);
    history.replaceState(null, "", "#" + p.toString());
  }, [tab, track, search, expanded]);
  const journey = tab === "school" ? "school" : track,
    exam = examTracks.find((t) => t.id === track)!;
  function persist(v: Saved) {
    setSaved(v);
    try {
      localStorage.setItem(storageKey, JSON.stringify(v));
      setError("");
    } catch {
      setError(
        "Device storage is unavailable. Changes may not survive closing this page.",
      );
    }
  }
  function record(c: Competency) {
    const fresh = startProgram("synthetic-preview", journey, programFor(c)),
      r = saved.records[programKey(fresh)];
    return r?.schemaVersion === 1 &&
      r.programVersion === fresh.programVersion &&
      Array.isArray(r.completed) &&
      Array.isArray(r.attempts) &&
      Array.isArray(r.timeReceipts)
      ? r
      : fresh;
  }
  function familyFor(c: Competency) {
    const fs = programFor(c).families;
    return tab === "school"
      ? fs[0]
      : fs.find((f) => (exam.questionFamilies as string[]).includes(f));
  }
  const activeC = competencies.find((c) => c.id === expanded);
  const visibleDuration = useVisibleDuration(
    `${journey}:${expanded}:${activeC ? record(activeC).current : ""}`,
  );
  function nextSeed(c: Competency, r: ProgramRecord) {
    const family = familyFor(c);
    if (!family) return 1;
    const current = saved.seeds[programKey(r)] ?? 1;
    const seen = new Set(
      Object.values(saved.records)
        .flatMap((p) => p.attempts)
        .filter((a) => a.familyId === family)
        .map((a) => generate(a.familyId, a.seed).fingerprint),
    );
    seen.add(generate(family, current).fingerprint);
    return generateBatch(family, current + 1, 1, seen)[0].seed;
  }
  function change(
    c: Competency,
    action: Parameters<typeof updateProgram>[2],
    advance = false,
  ) {
    try {
      let base = record(c);
      if (
        action.kind === "complete" &&
        ["concept", "worked"].includes(action.stage)
      )
        base = updateProgram(programFor(c), base, {
          kind: "time",
          id: `time:${Date.now()}:${base.revision}`,
          stage: action.stage,
          elapsedMs: visibleDuration(),
        });
      const r = updateProgram(programFor(c), base, action),
        key = programKey(r);
      persist({
        ...saved,
        records: { ...saved.records, [key]: r },
        seeds: advance
          ? { ...saved.seeds, [key]: nextSeed(c, r) }
          : saved.seeds,
        drafts: advance ? { ...saved.drafts, [key]: "" } : saved.drafts,
      });
    } catch (e) {
      setError(String(e));
    }
  }
  function next(c: Competency) {
    try {
      const r = record(c),
        key = programKey(r);
      persist({
        ...saved,
        seeds: { ...saved.seeds, [key]: nextSeed(c, r) },
        drafts: { ...saved.drafts, [key]: "" },
      });
    } catch {
      setError(
        "Available unique examples have been used. Revisit another program; no duplicate item was issued.",
      );
    }
  }
  function exportEvidence() {
    const attempts = Object.values(saved.records)
      .flatMap((r) => r.attempts.map((a) => ({ r, a })))
      .sort((x, y) => Date.parse(x.a.at) - Date.parse(y.a.at));
    const rows = attempts.map(({ r, a }, i) => {
      const item = generate(a.familyId, a.seed),
        prior = attempts
          .slice(0, i)
          .filter((p) => p.r.learnerId === r.learnerId),
        same = prior.filter(
          (p) =>
            generate(p.a.familyId, p.a.seed).fingerprint === item.fingerprint,
        ).length,
        family = prior.filter((p) => p.a.familyId === a.familyId).length;
      return candidateResponse({
        learnerId: r.learnerId,
        journeyId: r.journeyId,
        at: a.at,
        item,
        response: a.response,
        correct: a.correct,
        elapsedMs: a.elapsedMs,
        hintCount: a.hints,
        solutionSeen: a.solutionSeen,
        priorItemExposures: same,
        priorFamilyExposures: family,
        exposure: same ? "repeat" : family ? "variant" : "fresh",
      });
    });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthetic-math-practice.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const selected =
    tab === "school"
      ? competencies
      : competencies.filter((c) =>
          exam.syllabusMapping.some((m) => m.competencyId === c.id),
        );
  const visible = selected.filter((c) =>
    `${c.name} ${c.strand} ${c.gradeRange[0]}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main>
      <header>
        <span className="brand">openpath ✦</span>
        <h1>Mathematics</h1>
        <p className="banner">
          Synthetic preview · Provisional practice · No learner assessment
        </p>
      </header>
      <nav aria-label="Learning journey">
        <button
          aria-pressed={tab === "school"}
          onClick={() => {
            setTab("school");
            setExpanded(null);
          }}
        >
          School mathematics
        </button>
        <button
          aria-pressed={tab === "exams"}
          onClick={() => {
            setTab("exams");
            setExpanded(null);
          }}
        >
          Competitive Exams
        </button>
      </nav>
      <p>
        Activity completion and demonstrated understanding are separate.
        Strengths and difficulties will come from the shared learner engine;
        they are unavailable in this preview.
      </p>
      {tab === "exams" && (
        <section className="exam">
          <label>
            Exam journey
            <select
              value={track}
              onChange={(e) => {
                setTrack(e.target.value);
                setExpanded(null);
              }}
            >
              {examTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <h2>{exam.name}</h2>
          <p>
            Original practice, not official questions. School activity progress
            stays separate; competencies are shared.
          </p>
          <p>{exam.coverage}</p>
          <p>
            Journey: topic practice → shared evidence review → speed and
            strategy → timed test.
          </p>
          <p>
            Weak-area analysis awaits shared evidence. Completion is not exam
            readiness.
          </p>
          <button disabled>Timed test unavailable</button>
          <p>
            Current syllabus, formats, timing and scoring need verification.{" "}
            <a href={exam.source.url} target="_blank" rel="noreferrer">
              Official source
            </a>
          </p>
        </section>
      )}
      <label>
        Find a competency
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Fractions, algebra, grade…"
        />
      </label>
      <p className="small">
        {visible.length} competencies · Expand a row to inspect available
        practice.
      </p>
      <div role="alert">{error}</div>
      {!visible.length && (
        <p>No matching competencies. Clear the search or try another topic.</p>
      )}
      {visible.map((c) => {
        const def = programFor(c),
          r = record(c),
          key = programKey(r),
          pct = completion(def, r),
          open = expanded === c.id,
          seed = saved.seeds[key] ?? 1,
          family = familyFor(c),
          item = family ? generate(family, seed) : null;
        return (
          <section className="row" key={c.id}>
            <button
              className="row-toggle"
              aria-expanded={open}
              aria-controls={`detail-${c.id}`}
              onClick={() => setExpanded(open ? null : c.id)}
            >
              <span>
                <strong>{c.name}</strong>
                <small>
                  Grade {c.gradeRange[0]} · {c.strand} ·{" "}
                  {item ? "Practice available" : "Lessons planned"}
                </small>
              </span>
              <span>
                {pct}% {open ? "−" : "+"}
              </span>
            </button>
            <div
              className="bar"
              role="progressbar"
              aria-label={`${c.name} activity completion`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <i style={{ width: `${pct}%` }} />
            </div>
            {open && (
              <div className="detail" id={`detail-${c.id}`}>
                <p>{c.description}</p>
                <p>
                  Program {def.version} · {r.completed.length}/
                  {def.stages.length} activities completed ·{" "}
                  {Math.floor(r.elapsedMs / 60000)}m{" "}
                  {Math.round(r.elapsedMs / 1000) % 60}s recorded learning time
                  · {r.attempts.length} attempts
                </p>
                <p>
                  Demonstrated understanding:{" "}
                  <strong>Unavailable — shared engine required</strong>
                  <br />
                  Retention:{" "}
                  {r.retention === "host-pending"
                    ? "Awaiting host-scheduled delayed evidence"
                    : "Not scheduled"}
                </p>
                <ol className="stages">
                  {def.stages.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => change(c, { kind: "open", stage: s.id })}
                        aria-current={r.current === s.id ? "step" : undefined}
                      >
                        {s.title}
                        <small>
                          {r.completed.includes(s.id)
                            ? "Activity completed"
                            : r.current === s.id
                              ? "Current activity"
                              : "Remaining"}
                        </small>
                      </button>
                    </li>
                  ))}
                </ol>
                <h3>{def.stages.find((s) => s.id === r.current)?.title}</h3>
                <p>{def.stages.find((s) => s.id === r.current)?.instruction}</p>
                {!item ? (
                  <p>
                    This competency has a versioned scaffold, but no reviewed
                    lesson or generator yet. Activities cannot be marked
                    complete.
                  </p>
                ) : r.current === "retention" ? (
                  <p>
                    The shared engine must schedule a delayed check. Completion
                    cannot verify retention.
                  </p>
                ) : (
                  <>
                    {r.current === "concept" && (
                      <p className="example">
                        Example: {item.statement} Read the worked example next,
                        then try a new question.
                      </p>
                    )}
                    {r.current === "worked" && (
                      <p className="example">
                        {item.statement}
                        <br />
                        {item.workedSolution}
                      </p>
                    )}
                    {!["concept", "worked"].includes(r.current) && (
                      <Question
                        support={saved.support?.[`${key}:${seed}:${r.current}`]}
                        onSupport={(support) =>
                          persist({
                            ...saved,
                            support: {
                              ...saved.support,
                              [`${key}:${seed}:${r.current}`]: support,
                            },
                          })
                        }
                        key={`${key}:${seed}:${r.current}`}
                        item={item}
                        stage={r.current}
                        initial={saved.drafts[key] ?? ""}
                        prior={r.attempts.some(
                          (a) => a.itemId === item.id && a.stage === r.current,
                        )}
                        onDraft={(text) =>
                          persist({
                            ...saved,
                            drafts: { ...saved.drafts, [key]: text },
                          })
                        }
                        onAttempt={(receipt) =>
                          change(c, { kind: "attempt", receipt })
                        }
                        onNext={() => next(c)}
                      />
                    )}
                    <button
                      className="primary"
                      disabled={
                        !["concept", "worked"].includes(r.current) &&
                        !r.attempts.some((a) => a.stage === r.current)
                      }
                      onClick={() =>
                        change(c, { kind: "complete", stage: r.current }, true)
                      }
                    >
                      Finish activity — save place
                    </button>
                    <p className="small">
                      Activity completion does not verify understanding.
                    </p>
                  </>
                )}
                <details>
                  <summary>Evidence and prerequisites (graph 1.1.0)</summary>
                  <p>
                    {c.id} · {c.version}
                  </p>
                  <p>{c.demonstrationCriteria.join(" ")}</p>
                  <p>
                    Prerequisites:{" "}
                    {currentGraph.find((n) => n.id === c.id)!.prerequisites.join(", ") ||
                      currentGraph.find((n) => n.id === c.id)!.rootJustification}
                  </p>
                  <p>
                    NCERT/CBSE proposed grade {c.gradeRange[0]}: provisional.
                    Tamil Nadu: unmapped.
                  </p>
                </details>
              </div>
            )}
          </section>
        );
      })}
      <footer>
        <button onClick={exportEvidence}>
          Export synthetic practice evidence
        </button>
        <p>
          Device-only prototype. No external services, accounts, telemetry or
          proficiency updates. Do not enter real-child data.
        </p>
      </footer>
    </main>
  );
}
function Question({
  item,
  stage,
  initial,
  prior,
  support,
  onSupport,
  onDraft,
  onAttempt,
  onNext,
}: {
  support?: { hint: boolean; solution: boolean };
  onSupport: (s: { hint: boolean; solution: boolean }) => void;
  item: GeneratedItem;
  stage: StageId;
  initial: string;
  prior: boolean;
  onDraft: (s: string) => void;
  onAttempt: (a: AttemptReceipt) => void;
  onNext: () => void;
}) {
  const [response, setResponse] = useState(initial),
    [feedback, setFeedback] = useState(
      prior
        ? "Previously attempted. Reopen the solution or try another example."
        : "",
    ),
    [hint, setHint] = useState(support?.hint ?? false),
    [seen, setSeen] = useState(support?.solution ?? false),
    [started] = useState(() => Date.now()),
    [submitted, setSubmitted] = useState(prior);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!response.trim() || submitted) return;
    const result = evaluate(item, response);
    if (!result.supported) {
      setFeedback(
        "Unsupported answer format. Use numbers, fractions, or algebra with x, +, −, *, /constant and powers 0–6.",
      );
      return;
    }
    onAttempt({
      id: `${item.id}:${stage}`,
      itemId: item.id,
      familyId: item.familyId,
      seed: item.seed,
      stage,
      at: new Date().toISOString(),
      response,
      correct: result.correct,
      hints: hint ? 1 : 0,
      solutionSeen: seen,
      elapsedMs: Math.min(Date.now() - started, 3600000),
    });
    setSubmitted(true);
    setFeedback(
      `${result.correct ? "Correct for this practice item." : "Try the worked method."} ${result.feedback} Provisional practice, not verified evidence.`,
    );
  }
  return (
    <form onSubmit={submit}>
      <p className="question">{item.statement}</p>
      {item.options && (
        <ul>
          {item.options.map((o, i) => (
            <li key={o}>
              {item.format === "single-choice" ? `${"ABCD"[i]}: ` : ""}
              {o}
            </li>
          ))}
        </ul>
      )}
      <label>
        Your answer
        <input
          value={response}
          autoComplete="off"
          disabled={submitted}
          onChange={(e) => {
            setResponse(e.target.value);
            onDraft(e.target.value);
          }}
        />
      </label>
      <div className="actions">
        <button type="submit" disabled={!response.trim() || submitted}>
          Check answer
        </button>
        <button
          type="button"
          disabled={submitted}
          onClick={() => {
            setHint(true);
            onSupport({ hint: true, solution: seen });
          }}
        >
          Hint
        </button>
        <button
          type="button"
          onClick={() => {
            setSeen(true);
            onSupport({ hint, solution: true });
            setFeedback(item.workedSolution);
          }}
        >
          Worked solution
        </button>
      </div>
      {hint && (
        <p>
          Identify the quantities and operation first. A hinted response stays
          practice evidence.
        </p>
      )}
      <p role="status">{feedback}</p>
      {submitted && (
        <button type="button" onClick={onNext}>
          Try another example
        </button>
      )}
    </form>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
