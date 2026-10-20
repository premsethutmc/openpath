/** A guided view of the canonical planner, modules and evidence; not another learner engine. */
import { useEffect, useRef, useState } from "react";
import { type CurriculumRelease } from "../../../packages/learning/src/curriculum";
import { moduleFor } from "../../../packages/learning/src/content";
import { graph } from "../../../packages/learning/src/graph";
import { moduleState } from "../../../packages/learning/src/intervention";
import { nextActivity } from "../../../packages/learning/src/plan";
import {
  buildSession,
  examScope,
  EXAM_GOALS,
  journeyRecords,
  timeSlice,
  type Draft,
  type JourneyRecord,
  type Scope,
  type Usage,
} from "../../../packages/learning/src/journey";
import { tilesFor, type Tile } from "../../../packages/learning/src/tiles";
import { Module, STATUS_WORD, type Ctx } from "./Learn";
import "./journey.css";
const zero = (): Usage => ({
  activeMs: 0,
  idleMs: 0,
  solvingMs: 0,
  helpCount: 0,
});
const time = (ms: number) =>
  `${Math.floor(ms / 60000)}m ${Math.floor(ms / 1000) % 60}s`;
export function GradeJourney({
  release,
  ctx,
  events,
  learner,
  save,
  onSettings,
}: {
  release: CurriculumRelease;
  ctx: Ctx;
  events: { kind: string }[];
  learner: string;
  save: (r: JourneyRecord) => Promise<boolean>;
  onSettings: () => void;
}) {
  const history = journeyRecords(events);
  const [mode, setMode] = useState<"school" | "exams">("school"),
    [goal, setGoal] = useState("gre-quant"),
    [scope, setScope] = useState<Scope>("gre-quant");
  const [notice, setNotice] = useState(""),
    [budget, setBudget] = useState(30),
    [inLesson, setInLesson] = useState(false),
    [saved, setSaved] = useState(true),
    [chosen, setChosen] = useState<string | undefined>();
  const target: Scope = mode === "school" ? "school" : scope;
  const plan = history
    .filter(
      (r) =>
        r.action === "plan" &&
        r.plan?.scope === target &&
        r.plan.curriculum.id === release.id &&
        r.plan.curriculum.version === release.version &&
        r.plan.curriculum.hash === release.hash,
    )
    .at(-1)?.plan;
  const mine = history.filter((r) => r.planId === plan?.id);
  const finished = [
    ...new Set(
      mine.filter((r) => r.action === "finish").map((r) => r.competency!),
    ),
  ];
  const active = plan?.modules.find(
    (m) => !finished.includes(m.competency),
  )?.competency;
  const drafts = useRef<Record<string, Draft>>({}),
    dirty = useRef(false),
    solving = useRef(false),
    usage = useRef(zero());
  const current = useRef({ plan, active, ctx, save, inLesson });
  current.current = { plan, active, ctx, save, inLesson };
  const last = useRef(performance.now()),
    interaction = useRef(performance.now()),
    visible = useRef(!document.hidden),
    pending = useRef(Promise.resolve(true)),
    initialized = useRef("");
  if (plan && initialized.current !== plan.id) {
    drafts.current =
      mine.filter((r) => r.action === "checkpoint").at(-1)?.drafts ?? {};
    initialized.current = plan.id;
  }
  function receipt(
    action: JourneyRecord["action"],
    extra: Partial<JourneyRecord> = {},
    p = current.current.plan,
  ): JourneyRecord {
    return {
      kind: "math_session",
      version: "math-session@1",
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      learnerId: learner,
      sessionId: current.current.ctx.session,
      planId: p!.id,
      action,
      ...extra,
    };
  }
  function account() {
    const now = performance.now(),
      d = timeSlice(
        last.current,
        now,
        interaction.current,
        visible.current,
        solving.current,
      );
    last.current = now;
    if (current.current.inLesson && current.current.active)
      for (const k of ["activeMs", "idleMs", "solvingMs"] as const)
        usage.current[k] += d[k];
  }
  async function flush() {
    account();
    const { plan: p, active: c } = current.current;
    if (!p || !c) return true;
    const u = { ...usage.current };
    for (const k of Object.keys(u) as (keyof Usage)[]) u[k] = Math.round(u[k]);
    usage.current = zero();
    const snapshot = structuredClone(drafts.current),
      wasDirty = dirty.current;
    dirty.current = false;
    if (!wasDirty && !u.activeMs && !u.idleMs && !u.helpCount) return true;
    setSaved(false);
    const checkpoint = receipt("checkpoint", {
        competency: c,
        drafts: snapshot,
      }),
      timed = receipt("time", { competency: c, usage: u });
    pending.current = pending.current.then(async () => {
      const ok = await current.current.save(checkpoint),
        timeOk = ok ? await current.current.save(timed) : false;
      if (!timeOk) {
        dirty.current = true;
        for (const k of Object.keys(u) as (keyof Usage)[])
          usage.current[k] += u[k];
      }
      setSaved(timeOk);
      return timeOk;
    });
    return pending.current;
  }
  useEffect(() => {
    last.current = performance.now();
    interaction.current = performance.now();
    const interact = () => {
      account();
      interaction.current = performance.now();
    };
    const focus = () => {
      account();
      visible.current = !document.hidden;
      interaction.current = performance.now();
    };
    const blur = () => {
      account();
      visible.current = false;
      void flush();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    const visibility = () => {
      account();
      visible.current = !document.hidden;
      if (document.hidden) void flush();
      else interaction.current = performance.now();
    };
    const tick = setInterval(() => void flush(), 5000);
    for (const e of ["pointerdown", "keydown", "input", "scroll"])
      window.addEventListener(e, interact, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(tick);
      for (const e of ["pointerdown", "keydown", "input", "scroll"])
        window.removeEventListener(e, interact);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      void flush();
    };
  }, [inLesson, plan?.id, active]);
  const totals = mine.reduce((s, r) => {
    if (r.usage)
      for (const k of Object.keys(s) as (keyof Usage)[]) s[k] += r.usage[k];
    return s;
  }, zero());
  const remaining =
    plan?.modules
      .filter((m) => !finished.includes(m.competency))
      .reduce(
        (s, m) =>
          s +
          Math.max(
            0,
            m.estimatedMs -
              mine
                .filter((r) => r.competency === m.competency && r.usage)
                .reduce((n, r) => n + (r.usage?.activeMs ?? 0), 0),
          ),
        0,
      ) ?? 0;
  async function start() {
    const p = buildSession(
      release,
      ctx.evidence,
      ctx.records,
      history,
      budget,
      target,
      chosen,
    );
    if (!p.modules.length) {
      setNotice(
        "No available module fits this session. Completed skills stay saved; delayed checks will return when due. Other content still needs review or implementation.",
      );
      return;
    }
    setNotice("");
    if (await save(receipt("plan", { plan: p }, p))) setInLesson(true);
  }
  const workspace: NonNullable<Ctx["workspace"]> = {
    draft: (q) => drafts.current[q],
    saveDraft: (q, d) => {
      drafts.current[q] = d;
      dirty.current = true;
      setSaved(false);
    },
    activity: (s) => {
      account();
      solving.current = s;
    },
    help: () => {
      usage.current.helpCount++;
      dirty.current = true;
    },
  };
  const lessonCtx: Ctx = {
    ...ctx,
    workspace,
    answer: async (...args) => {
      if (!(await flush())) return false;
      return ctx.answer(...args);
    },
  };
  const ms = active
    ? moduleState(
        active,
        ctx.records,
        ctx.evidence(active),
        ctx.now,
        ctx.session,
      )
    : null;
  const canFinish = ms?.phase === "done";
  const tree = (t: Tile): React.ReactNode =>
    t.kind === "skill" || t.kind === "micro" ? (
      <div className="journey-skill" data-competency={t.competency} key={t.id}>
        <div>
          <b>{t.title}</b>
          <small>
            {t.label} · {t.content?.review}
          </small>
          <details>
            <summary>Learning details</summary>
            {t.objectives.map((o, i) => (
              <p key={i}>{o}</p>
            ))}
            {t.evidence.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
            <p>Retention: {t.retention ?? "not scheduled"}</p>
          </details>
          {t.content?.level === "none" && (
            <small>Lesson not yet available</small>
          )}
        </div>
        {t.content?.level === "module" && (
          <button onClick={() => setChosen(t.competency!)}>
            {plan && active ? "Next session" : "Study"}
          </button>
        )}
        {t.children.map(tree)}
      </div>
    ) : (
      <details className="topic-tile" key={t.id}>
        <summary>
          <span>{t.title}</span>
          <small>
            {t.progress.verified} verified · {t.progress.total} supported skills
          </small>
        </summary>
        {t.children.map(tree)}
      </details>
    );
  const next = nextActivity(release, ctx.evidence, ctx.records),
    selectedGoal = EXAM_GOALS.find((g) => g.id === goal)!,
    exam = examScope(scope);
  return (
    <main className="learning-journey">
      <header className="journey-header">
        <button
          aria-label={inLesson ? "Back to plan" : "Back to Mathematics home"}
          onClick={async () => {
            if (inLesson) {
              if (await flush()) setInLesson(false);
            } else window.location.assign("/maths/");
          }}
        >
          ←
        </button>
        <div>
          <small>My Learning Year · Grade {release.grade}</small>
          <h1>{inLesson && active ? graph.get(active).name : "Mathematics"}</h1>
        </div>
        <span role="status" className="save-status">
          {ctx.saving ? "Saving…" : saved ? "Saved" : "Saving draft…"}
        </span>
        {!inLesson && (
          <details className="journey-menu">
            <summary aria-label="More options">⋮</summary>
            <button onClick={onSettings}>Year and curriculum</button>
          </details>
        )}
      </header>
      {notice && <p role="status">{notice}</p>}
      {!inLesson && (
        <nav className="mode-tabs" aria-label="Learning mode">
          <button
            aria-pressed={mode === "school"}
            onClick={() => {
              setMode("school");
              setChosen(undefined);
            }}
          >
            My Mathematics
          </button>
          <button
            aria-pressed={mode === "exams"}
            onClick={() => {
              setMode("exams");
              setChosen(undefined);
            }}
          >
            Exam refresher
          </button>
        </nav>
      )}
      <details className="coverage-note">
        <summary>
          {release.source.synthetic
            ? "Synthetic curriculum preview"
            : "Curriculum and content details"}{" "}
          · formative content
        </summary>
        <p>
          {release.source.board} · {release.version}. Lessons await educator
          review. Practice completion is separate from verified mastery. No exam
          readiness is assessed.
        </p>
      </details>
      {inLesson && active ? (
        <>
          <div className="session-line">
            <span>
              {finished.length}/{plan!.modules.length} modules completed
            </span>
            <span>{time(totals.activeMs)} active</span>
          </div>
          <Module
            key={active}
            competency={active}
            ctx={lessonCtx}
            onExit={() => setInLesson(false)}
            embedded
            compact
          />
          {ms && ["guided", "chapter", "done", "pause"].includes(ms.phase) && (
            <details
              className="context-help"
              onToggle={(e) => {
                if (e.currentTarget.open) workspace.help();
              }}
            >
              <summary>Help me understand</summary>
              <p>{moduleFor(active)?.chapter[0]?.text.join(" ")}</p>
              <p>
                Try writing one small step at a time. A wrong answer alone does
                not tell us why it happened.
              </p>
            </details>
          )}
          {canFinish && (
            <button
              className="primary"
              disabled={ctx.saving}
              onClick={async () => {
                if (
                  (await flush()) &&
                  (await save(receipt("finish", { competency: active })))
                ) {
                  setInLesson(false);
                }
              }}
            >
              Finish this module for now
            </button>
          )}
          <button
            className="quiet"
            onClick={async () => {
              if (await flush()) setInLesson(false);
            }}
          >
            Save and return to plan
          </button>
        </>
      ) : (
        <>
          {mode === "exams" && (
            <section className="exam-scopes">
              <h2>Your goal</h2>
              <div className="goal-options">
                {EXAM_GOALS.map((g) => (
                  <button
                    key={g.id}
                    aria-pressed={goal === g.id}
                    onClick={() => {
                      setGoal(g.id);
                      setChosen(undefined);
                      if (g.tracks[0]) setScope(g.tracks[0] as Scope);
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
              <p>{selectedGoal.missing}</p>
              {selectedGoal.tracks.length > 1 && (
                <label>
                  Track
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as Scope)}
                  >
                    {selectedGoal.tracks.map((t) => (
                      <option key={t} value={t}>
                        {examScope(t)?.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {selectedGoal.tracks.length > 0 ? (
                <>
                  <p className="small">
                    Foundation diagnostic → teaching → practice → reassessment.
                    Shared competency history; separate session completion. No
                    official score or timed simulation. Timed practice uses an
                    elapsed timer only.
                  </p>
                  <ul>
                    {exam?.competencies.map((c) => (
                      <li key={c.id}>
                        {c.name} — {STATUS_WORD[ctx.evidence(c.id).status]}
                      </li>
                    ))}
                  </ul>
                  <a href={exam?.source.url} target="_blank" rel="noreferrer">
                    Official exam source
                  </a>
                  <p className="small">
                    Syllabus version unverified. Target scores and dates are not
                    requested until readiness can be assessed.
                  </p>
                </>
              ) : (
                <p role="status">
                  Not available: verified mapping and content required before a
                  diagnostic can be offered.
                </p>
              )}
            </section>
          )}
          {(mode === "school" || selectedGoal.tracks.length > 0) && (
            <section className="session-plan">
              <h2>
                {plan && finished.length < plan.modules.length
                  ? "Your saved session"
                  : "Make time for maths"}
              </h2>
              {plan && finished.length < plan.modules.length ? (
                <>
                  <p>
                    {plan.budgetMinutes}-minute plan · {finished.length}/
                    {plan.modules.length} modules completed
                  </p>
                  <ol>
                    {plan.modules.map((m) => (
                      <li key={m.competency}>
                        <span>
                          {finished.includes(m.competency) ? "✓ " : ""}
                          {graph.get(m.competency).name}
                        </span>
                        <small>
                          ~{Math.round(m.estimatedMs / 60000)} min · {m.source}
                        </small>
                      </li>
                    ))}
                  </ol>
                  <button className="primary" onClick={() => setInLesson(true)}>
                    Resume session
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {mode === "school"
                      ? chosen
                        ? `Start with ${graph.get(chosen).name}.`
                        : next.reason
                      : "Start with a short foundation diagnostic using the shared question-selection policy."}
                  </p>
                  <fieldset>
                    <legend>Available study time</legend>
                    {[15, 30, 45, 60].map((m) => (
                      <button
                        key={m}
                        aria-pressed={budget === m}
                        onClick={() => setBudget(m)}
                      >
                        {m} min
                      </button>
                    ))}
                  </fieldset>
                  <button
                    className="primary"
                    disabled={ctx.saving}
                    onClick={() => void start()}
                  >
                    {mode === "school"
                      ? "Start session"
                      : "Start foundation diagnostic"}
                  </button>
                </>
              )}
              {chosen && (
                <p>
                  For your next session: {graph.get(chosen).name}{" "}
                  <button
                    className="quiet"
                    onClick={() => setChosen(undefined)}
                  >
                    Clear
                  </button>
                </p>
              )}
              {plan && (
                <details>
                  <summary>Session progress and time</summary>
                  <p>
                    Estimated remaining modules: {time(remaining)}. Active:{" "}
                    {time(totals.activeMs)}. Idle: {time(totals.idleMs)}.
                    Question-solving: {time(totals.solvingMs)}. Help opened:{" "}
                    {totals.helpCount}.
                  </p>
                  <p>
                    Estimates use conservative defaults, then recent completed
                    module activity. Not deadlines; time and completion never
                    prove mastery.
                  </p>
                </details>
              )}
            </section>
          )}
          {mode === "school" && (
            <section aria-label="Grade curriculum topics">
              <h2>Your topics</h2>
              <p className="small">
                From your selected release. Expand a topic to see its
                competencies and evidence.
              </p>
              {tilesFor(release, ctx.evidence)
                .flatMap((t) => (t.kind === "subject" ? t.children : [t]))
                .map(tree)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
