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
  kind: "digit" | "replace" | "backspace" | "finish" | "select";
  digit?: string;
  field?: string;
};
type Props = {
  api: Api;
  pupil: string;
  parameters?: Record<string, number>;
  onExit: () => void | Promise<void>;
  alternative: (mode: string) => ReactNode;
};
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
}: Props) {
  const [activity, setActivity] = useState<LessonActivity | null>(null),
    [state, setState] = useState<PaperState>(initial),
    [cursor, setCursor] = useState<string | null>("quotient:0"),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [mode, setMode] = useState("paper");
  const repo = useRef<WritingLessonRepo | null>(null),
    paper = useRef<PaperState>(initial()),
    active = useRef<string | null>("quotient:0"),
    input = useRef<HTMLInputElement>(null),
    queue = useRef<Op[]>([]),
    running = useRef(false),
    replace = useRef(false),
    mounted = useRef(true),
    composing = useRef(false);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    WritingLessonRepo.open(api, pupil, "division", parameters).then(
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
  }, [api, pupil, JSON.stringify(parameters)]);
  useEffect(() => {
    if (mode === "paper" && cursor)
      input.current?.focus({ preventScroll: true });
  }, [cursor, mode, activity?.id]);
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
        .getElementById("division-feedback")
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
    if (which === "exit") {
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
  return (
    <section
      className="division-lesson writing-host"
      aria-label="Progressive long division"
    >
      <h1>
        {p.dividend} ÷ {p.divisor}
      </h1>
      <p className="paper-instruction">
        Type the numbers. The paper follows you.
      </p>
      <div
        className="division-paper"
        role="group"
        aria-label={`${p.divisor} divides ${p.dividend}`}
        style={
          {
            "--columns": p.dividend.length,
            "--lead": p.divisor.length,
            "--cell": `min(40px, calc((100vw - 88px) / ${p.dividend.length + p.divisor.length + 1}))`,
          } as CSSProperties
        }
      >
        <span className="paper-divisor" style={{ gridColumn: 1, gridRow: 2 }}>
          {p.divisor}
        </span>
        <div
          className="division-bracket"
          style={{ gridColumn: `2 / span ${p.dividend.length}`, gridRow: 2 }}
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
        {fields.map((f, index) => {
          if (index > state.visible) return null;
          const row = position(f);
          return (
            <span
              key={f.id}
              className={`paper-entry ${f.role} ${f.id === cursor ? "active" : ""} ${state.entries[f.id] ? "has-value" : ""}`}
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
                  {[...(state.entries[f.id] || "\u00a0")].map((digit, i) => (
                    <span key={i} data-paper-digit>
                      {digit}
                    </span>
                  ))}
                </span>
              )}
              {f.id !== cursor && (
                <button
                  aria-label={`${f.label}: ${state.entries[f.id] || "empty"}`}
                  className="paper-number"
                  onClick={() => enqueue({ kind: "select", field: f.id })}
                >
                  {[...(state.entries[f.id] || "\u00a0")].map((digit, i) => (
                    <span key={i} data-paper-digit aria-hidden="true">
                      {digit}
                    </span>
                  ))}
                </button>
              )}
            </span>
          );
        })}
        {fields
          .filter(
            (f) =>
              f.role === "difference" && fields.indexOf(f) <= state.visible,
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
            aria-describedby="division-feedback"
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
      <p
        id="division-feedback"
        role="status"
        className={state.complete ? "paper-complete" : ""}
      >
        {state.feedback?.message ??
          (state.complete ? "Finished!" : current?.label)}
      </p>
      {error && <p role="alert">{error}</p>}
      <small role="status">{saved}</small>
      <div className="paper-options">
        <button className="secondary" onClick={() => void leave("ink")}>
          ✏️ Write instead
        </button>
        <button className="link" onClick={() => void leave("guided")}>
          Help me step by step
        </button>
        <button className="link" onClick={() => void leave("answer")}>
          Type a final answer instead
        </button>
      </div>
      <button className="secondary" onClick={() => void leave("exit")}>
        {state.complete ? "Continue learning" : "Save and return to the lesson"}
      </button>
      <small>Provisional practice · completion is not verified mastery.</small>
    </section>
  );
}
