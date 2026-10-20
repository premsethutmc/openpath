import "./notebook.css";
import { WorkspaceRecovery } from "./WorkspaceRecovery";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Api } from "../english/logic/account";
import { WritingLessonRepo, type LessonActivity } from "./lesson-service";
import { GuidedWritingLesson } from "./GuidedLesson";
export type PaperField = {
  id: string;
  role: "quotient" | "product" | "difference";
  cycle: number;
  column: number;
  width: number;
  region: string;
  position: number | null;
  label: string;
};
export type DivisionPaper = {
  dividend: string;
  divisor: string;
  start: number;
  fields: PaperField[];
};
export type PaperState = {
  entries: Record<string, string>;
  active: string | null;
  visible: number;
  complete: boolean;
  feedback?: { outcome: string; message: string } | null;
};
type Op = {
  kind:
    | "digit"
    | "replace"
    | "backspace"
    | "finish"
    | "select"
    | "retry"
    | "hint"
    | "concept-hint";
  digit?: string;
  field?: string;
};
type Props = {
  api: Api;
  pupil: string;
  parameters?: Record<string, number>;
  onExit: () => void | Promise<void>;
  alternative: (mode: string) => ReactNode;
  onNext?: () => void | Promise<void>;
  sessionControls?: ReactNode;
  round?: number;
};
const CELL = 50; // Shared paper coordinates; never derived from glyph advance widths.
const initial = (): PaperState => ({
  entries: {},
  active: "quotient:0",
  visible: 0,
  complete: false,
});
/** One native input follows a server-owned cursor. Buffered keystrokes survive API latency between rows. */
export function ProgressiveDivision({
  api,
  pupil,
  parameters = {},
  onExit,
  alternative,
  onNext,
  sessionControls,
  round = 0,
}: Props) {
  const [activity, setActivity] = useState<LessonActivity | null>(null),
    [state, setState] = useState<PaperState>(initial),
    [cursor, setCursor] = useState<string | null>("quotient:0"),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [mode, setMode] = useState("paper"),
    [conceptHint, setConceptHint] = useState(false);
  const repo = useRef<WritingLessonRepo | null>(null),
    paper = useRef<PaperState>(initial()),
    active = useRef<string | null>("quotient:0"),
    input = useRef<HTMLInputElement>(null),
    host = useRef<HTMLElement>(null),
    queue = useRef<Op[]>([]),
    running = useRef(false),
    replace = useRef(false),
    mounted = useRef(true),
    composing = useRef(false);
  useEffect(() => {
    setActivity(null);
    let live = true;
    mounted.current = true;
    WritingLessonRepo.open(api, pupil, "division", parameters)
      .then(async (r) => {
        // Reuse the existing navigation metadata so demo re-entry resumes the same practice round.
        // No mathematical response, ink, ledger entry or mastery state is replaced here.
        if (
          live &&
          round > 0 &&
          r.activity.support.simple?.round !== round &&
          !r.activity.support.simple?.result
        ) {
          r.activity = await r.repo.action("answer-draft", {
            round,
            answer: r.activity.support.simple?.answer ?? "",
          });
        }
        return r;
      })
      .then(
        (r) => {
          if (!live) return;
          repo.current = r.repo;
          setActivity(r.activity);
          const s = r.activity.support.divisionPaper ?? initial();
          paper.current = s;
          active.current = s.active;
          setCursor(s.active);
          setState(s);
          setSaved(
            r.activity.support.divisionPaper ? "Saved working resumed" : "",
          );
        },
        (e) => live && setError(String(e)),
      );
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [api, pupil, JSON.stringify(parameters), round]);
  useEffect(() => {
    if (mode === "paper" && cursor)
      input.current?.focus({ preventScroll: true });
  }, [cursor, mode, activity?.id]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () =>
      host.current?.style.setProperty(
        "--notebook-height",
        `${viewport?.height ?? innerHeight}px`,
      );
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, [mode, activity?.id]);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const before = (event: Event) => {
      const e = event as InputEvent;
      if (
        e.inputType === "insertLineBreak" ||
        e.inputType === "insertParagraph"
      ) {
        e.preventDefault();
        enqueue({ kind: "finish" });
        return;
      }
      if (
        e.inputType === "deleteContentBackward" &&
        !el.value &&
        !composing.current
      ) {
        e.preventDefault();
        enqueue({ kind: "backspace" });
      }
    };
    el.addEventListener("beforeinput", before);
    const visible = () => {
      const box = el.getBoundingClientRect();
      if (box.bottom > (window.visualViewport?.height ?? innerHeight) - 16)
        el.scrollIntoView({ block: "nearest", behavior: "instant" });
    };
    visible();
    window.visualViewport?.addEventListener("resize", visible);
    return () => {
      el.removeEventListener("beforeinput", before);
      window.visualViewport?.removeEventListener("resize", visible);
    };
  }, [cursor, mode, activity?.id]);
  useEffect(() => {
    if (mode === "paper" && state.complete)
      document
        .getElementById("division-success")
        ?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }, [state.complete, mode]);
  async function process() {
    if (running.current || !repo.current) return;
    running.current = true;
    setSaved("Saving…");
    try {
      while (queue.current.length) {
        const op = queue.current.shift()!;
        if (op.kind === "select") {
          active.current = op.field!;
          replace.current = true;
          setCursor(op.field!);
          input.current?.focus({ preventScroll: true });
          continue;
        }
        if (op.kind === "concept-hint") {
          const a = await repo.current.action("answer-help");
          if (!mounted.current) return;
          setActivity(a);
          setConceptHint(true);
          input.current?.focus({ preventScroll: true });
          continue;
        }
        if (op.kind === "retry" || op.kind === "hint") {
          const a = await repo.current.action("workspace-recovery", {
            choice: op.kind,
          });
          if (!mounted.current) return;
          setActivity(a);
          const s = a.support.divisionPaper!;
          paper.current = s;
          active.current = s.active;
          setState(s);
          setCursor(s.active);
          replace.current = true;
          input.current?.focus({ preventScroll: true });
          continue;
        }
        if (!active.current) continue;
        const operation =
          op.kind === "digit" && replace.current ? "replace" : op.kind;
        replace.current = false;
        const a = await repo.current.action("division-input", {
          entry: active.current,
          operation,
          digit: op.digit,
        });
        if (!mounted.current) return;
        const s = a.support.divisionPaper!;
        paper.current = s;
        active.current = s.active;
        setActivity(a);
        setState(s);
        setCursor(s.active);
        if (
          s.feedback?.outcome === "incorrect" ||
          s.feedback?.outcome === "format"
        ) {
          queue.current = [];
          replace.current = true;
          break;
        }
      }
      setSaved("Saved");
      setError("");
    } catch (e) {
      queue.current = [];
      setSaved("Not saved");
      setError(`${String(e)} Reload to resume the last saved number.`);
    } finally {
      running.current = false;
    }
  }
  function enqueue(op: Op) {
    queue.current.push(op);
    void process();
  }
  function digits(text: string) {
    for (const digit of text.replace(/[^0-9]/g, ""))
      queue.current.push({ kind: "digit", digit });
    void process();
  }
  async function reopen() {
    try {
      const r = await WritingLessonRepo.open(
        api,
        pupil,
        "division",
        parameters,
      );
      repo.current = r.repo;
      setActivity(r.activity);
      const s = r.activity.support.divisionPaper ?? initial();
      paper.current = s;
      active.current = s.active;
      setState(s);
      setCursor(s.active);
      setMode("paper");
      setSaved("Saved working resumed");
    } catch (e) {
      setError(String(e));
    }
  }
  async function leave(which: string) {
    if (running.current) {
      setError("Wait a moment for your last number to save.");
      return;
    }
    if (which === "next") {
      await repo.current?.flush();
      setConceptHint(false);
      await (onNext ?? onExit)();
    } else if (which === "exit") {
      await repo.current?.flush();
      await onExit();
    } else if (which === "guided") {
      await repo.current!.action("guided");
      setMode("guided");
    } else setMode(which);
  }
  if (!activity)
    return <p role="status">Opening your division paper…{error}</p>;
  if (mode !== "paper")
    return (
      <>
        <button className="secondary" onClick={() => void reopen()}>
          Back to division paper
        </button>
        {mode === "guided" ? (
          <GuidedWritingLesson
            api={api}
            pupil={pupil}
            topic="division"
            parameters={parameters}
            onExit={onExit}
          />
        ) : (
          alternative(mode)
        )}
      </>
    );
  const p = activity.lesson.divisionPaper!,
    fields = p.fields;
  const position = (f: PaperField): CSSProperties => ({
    gridColumn: `${2 + f.column - (f.role === "quotient" ? 0 : f.width - 1)} / span ${f.role === "quotient" ? 1 : f.width}`,
    gridRow:
      f.role === "quotient"
        ? 1
        : 3 + f.cycle * 2 + (f.role === "difference" ? 1 : 0),
  });
  const current = fields.find((f) => f.id === cursor);
  const recovery = activity.support.workspaceRecovery;
  const errorField = fields.find((f) => f.id === recovery?.entry);
  const context =
    errorField?.role === "product"
      ? `Multiply your quotient digit by ${p.divisor}. Check the product in this row.`
      : errorField?.role === "difference"
        ? "Subtract the multiplication row from the number above it."
        : "Check how many whole groups fit in the number you are working with.";
  const step = state.complete
    ? fields.length
    : Math.max(
        0,
        fields.findIndex((f) => f.id === cursor),
      ) + 1;
  const hint = () => {
    if (recovery?.open) enqueue({ kind: "hint" });
    else enqueue({ kind: "concept-hint" });
  };
  return (
    <section
      ref={host}
      className={`division-lesson writing-host notebook ${state.complete ? "is-complete" : ""}`}
      data-state={
        state.complete ? "completed" : recovery?.open ? "mistake" : "working"
      }
      aria-label="Progressive long division"
    >
      <header className="notebook-header">
        <button
          className="notebook-icon"
          aria-label="Back to lesson"
          onClick={() => void leave("exit")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m13 5-7 7 7 7M6 12h14" />
          </svg>
        </button>
        <div className="notebook-title">
          <h1>Long Division</h1>
          <p>
            Divide {p.dividend} by {p.divisor}
          </p>
        </div>
        <div
          className="notebook-progress"
          aria-label={`Working entry ${step} of ${fields.length}; not a proficiency measure`}
        >
          <span>
            {step} / {fields.length}
          </span>
          <div aria-hidden="true">
            {fields.map((f, i) => (
              <i key={f.id} className={i < step ? "on" : ""} />
            ))}
          </div>
        </div>
        <details className="notebook-more">
          <summary aria-label="Lesson options">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </summary>
          <div className="notebook-menu">
            <button onClick={() => void leave("guided")}>
              Help me step by step
            </button>
            <button onClick={() => void leave("answer")}>
              Type a final answer instead
            </button>
            <button onClick={() => void leave("exit")}>Return to lesson</button>
            <details>
              <summary>Practice details</summary>
              <p>Provisional practice · completion is not verified mastery.</p>
              <p>Your working saves automatically.</p>
            </details>
            {sessionControls}
          </div>
        </details>
      </header>
      <div
        className="notebook-main"
        style={
          {
            "--recovery-offset": errorField
              ? `${(p.divisor.length * CELL + 12) / 2 + (errorField.column - (errorField.role === "quotient" ? 0 : (errorField.width - 1) / 2) - (p.dividend.length - 1) / 2) * CELL}px`
              : "0px",
          } as CSSProperties
        }
      >
        <div className="notebook-paper-scroll">
          <div
            className="division-paper"
            role="group"
            aria-label={`${p.divisor} divides ${p.dividend}`}
            style={
              {
                "--columns": p.dividend.length,
                "--lead": p.divisor.length,
                "--cell": `${CELL}px`,
              } as CSSProperties
            }
          >
            <span
              className="paper-divisor"
              style={{ gridColumn: 1, gridRow: 2 }}
            >
              {p.divisor}
            </span>
            <div
              className="division-bracket"
              style={{
                gridColumn: `2 / span ${p.dividend.length}`,
                gridRow: 2,
              }}
            />
            {[...p.dividend].map((d, i) => (
              <span
                className="printed-digit"
                data-print-column={i}
                key={`printed:${i}`}
                style={{ gridColumn: i + 2, gridRow: 2 }}
              >
                {d}
              </span>
            ))}
            {fields
              .filter(
                (f) =>
                  f.role === "quotient" && fields.indexOf(f) > state.visible,
              )
              .map((f) => (
                <span
                  key={`placeholder:${f.id}`}
                  className="quotient-placeholder"
                  aria-hidden="true"
                  style={position(f)}
                />
              ))}
            {fields.map((f, index) => {
              if (index > state.visible) return null;
              const row = position(f);
              return (
                <span
                  key={f.id}
                  className={`paper-entry ${f.role} ${f.id === cursor ? "active" : ""} ${state.entries[f.id] ? "has-value" : ""} ${activity.support.workspaceRecovery?.open && activity.support.workspaceRecovery.entry === f.id ? "paper-error" : ""}`}
                  data-entry={f.id}
                  style={row}
                >
                  {f.role === "product" && (
                    <span className="minus" aria-hidden="true">
                      −
                    </span>
                  )}
                  {f.id === cursor && (
                    <span className="paper-number" aria-hidden="true">
                      {[...(state.entries[f.id] || "\u00a0")].map(
                        (digit, i) => (
                          <span key={i} data-paper-digit>
                            {digit}
                          </span>
                        ),
                      )}
                    </span>
                  )}
                  {f.id !== cursor && (
                    <button
                      aria-label={`${f.label}: ${state.entries[f.id] || "empty"}`}
                      className="paper-number"
                      onClick={() => enqueue({ kind: "select", field: f.id })}
                    >
                      {[...(state.entries[f.id] || "\u00a0")].map(
                        (digit, i) => (
                          <span key={i} data-paper-digit aria-hidden="true">
                            {digit}
                          </span>
                        ),
                      )}
                    </button>
                  )}
                </span>
              );
            })}
            {fields
              .filter(
                (f) =>
                  f.role === "difference" &&
                  fields.indexOf(f) - 1 <= state.visible &&
                  Boolean(state.entries[fields[fields.indexOf(f) - 1].id]),
              )
              .map((f) => (
                <span
                  key={`line:${f.id}`}
                  className="subtraction-line"
                  style={{
                    gridRow: 2 + f.cycle * 2 + 1,
                    gridColumn: `${2 + f.column - fields[f.cycle * 3 + 1].width + 1} / span ${fields[f.cycle * 3 + 1].width}`,
                  }}
                />
              ))}
            {fields
              .filter(
                (f) =>
                  f.role === "difference" &&
                  f.column + 1 < p.dividend.length &&
                  fields.indexOf(f) < state.visible,
              )
              .map((f) => (
                <span
                  key={`bring:${f.id}`}
                  className="printed-digit brought-digit"
                  aria-label={`Brought down ${p.dividend[f.column + 1]}`}
                  style={{ gridColumn: f.column + 3, gridRow: 4 + f.cycle * 2 }}
                >
                  {p.dividend[f.column + 1]}
                </span>
              ))}
            {current && (
              <input
                ref={input}
                className="paper-cursor"
                style={position(current)}
                aria-label={current.label}
                aria-describedby={
                  recovery?.open
                    ? "division-feedback workspace-recovery"
                    : "division-feedback"
                }
                aria-invalid={
                  (recovery?.open && recovery.entry === current.id) || undefined
                }
                value={state.entries[current.id] ?? ""}
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                autoComplete="off"
                spellCheck={false}
                onCompositionStart={() => {
                  composing.current = true;
                }}
                onCompositionEnd={(e) => {
                  composing.current = false;
                  digits(e.data);
                }}
                onChange={(e) => {
                  if (composing.current) return;
                  const native = e.nativeEvent as InputEvent;
                  if (
                    native.isComposing ||
                    native.inputType === "insertCompositionText" ||
                    native.inputType === "insertFromComposition"
                  )
                    return;
                  if (native.inputType?.startsWith("delete"))
                    enqueue({ kind: "backspace" });
                  else digits(native.data ?? e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                    digits(e.key);
                  } else if (e.key === "Backspace") {
                    e.preventDefault();
                    enqueue({ kind: "backspace" });
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    enqueue({ kind: "finish" });
                  }
                }}
              />
            )}
          </div>
        </div>
        <p id="division-feedback" role="status" className="notebook-feedback">
          <span>
            {!state.complete && !recovery?.open && state.feedback?.message}
          </span>
          <span className="notebook-sr">{current?.label}</span>
        </p>
        <WorkspaceRecovery
          state={recovery}
          context={context}
          onAction={(choice) => enqueue({ kind: choice })}
        />
        {conceptHint && (
          <aside className="notebook-concept" aria-label="Concept hint">
            <p>{activity.lesson.explanation}</p>
            <button
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                setConceptHint(false);
                input.current?.focus({ preventScroll: true });
              }}
            >
              Back to my working
            </button>
          </aside>
        )}
        {state.complete && (
          <div className="notebook-success" role="status" id="division-success">
            <span className="success-mark" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>Great work!</strong>
              <p>{state.feedback?.message?.replace(/^Finished! /, "")}</p>
            </div>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <span
          className={`notebook-save ${saved === "Not saved" ? "save-error" : ""}`}
          role="status"
        >
          {saved}
        </span>
      </div>
      <footer className="notebook-bottom">
        <button
          className="notebook-quiet"
          onClick={() => void leave("ink")}
          aria-label="Write instead"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4 16-1 5 5-1L21 7l-4-4L4 16Zm10-10 4 4M4 16l4 4" />
          </svg>
          Write
        </button>
        <button
          className="notebook-quiet"
          onPointerDown={(e) => e.preventDefault()}
          onClick={hint}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 18h6M9 21h6M8 14a7 7 0 1 1 8 0l-1 3H9l-1-3Z" />
          </svg>
          Hint
        </button>
        {state.complete && (
          <button className="notebook-next" onClick={() => void leave("next")}>
            Next question <span aria-hidden="true">→</span>
          </button>
        )}
      </footer>
    </section>
  );
}
