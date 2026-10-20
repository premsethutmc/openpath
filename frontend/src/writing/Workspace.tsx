import { useEffect, useRef, useState } from "react";
import {
  CONTRACT,
  type Work,
  type Recognizer,
  type Validator,
  type ValidationFeedback,
  type InputPacket,
} from "./contract";
import { Surface, type Tool } from "./Surface";
import {
  recognize,
  manual,
  confirm,
  undo,
  redo,
  clear,
  packet,
  blockers,
  uid,
} from "./model";
import { unavailableRecognizer, receiptValidator } from "./adapters";
export interface WorkspaceProps {
  compact?: boolean;
  work: Work;
  onChange: (work: Work) => void;
  recognizer?: Recognizer;
  validator?: Validator;
  confidenceThreshold?: number;
  onConfirmedInput?: (packet: InputPacket) => void;
  allowExtraRegions?: boolean;
  studentMode?: boolean;
  externalFeedback?: ValidationFeedback;
}
/** Embeddable, controlled input component. Host owns identity, storage and evidence policy. */
export function WritingWorkspace({
  work,
  compact = false,
  onChange,
  recognizer = unavailableRecognizer,
  validator = receiptValidator,
  confidenceThreshold = 0.9,
  onConfirmedInput,
  allowExtraRegions = true,
  studentMode = false,
  externalFeedback,
}: WorkspaceProps) {
  const [tool, setTool] = useState<Tool>("ink"),
    [zoom, setZoom] = useState(1),
    [penOnly, setPenOnly] = useState(false),
    [region, setRegion] = useState(work.layout.regions[0].id),
    [text, setText] = useState(""),
    [token, setToken] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState<ValidationFeedback | null>(null),
    [keypad, setKeypad] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    latest = useRef(work),
    job = useRef<AbortController | null>(null);
  latest.current = work;
  useEffect(() => () => job.current?.abort(), []);
  useEffect(() => {
    setFeedback(null);
    setToken(null);
    setText("");
    setRegion(work.layout.regions[0].id);
    setZoom(1);
  }, [work.id]);
  const act = (f: () => Work) => {
    try {
      onChange(f());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Input could not be saved");
    }
  };
  function selectToken(id: string) {
    const t = work.tokens.find((t) => t.id === id)!;
    setKeypad(false);
    setToken(id);
    setRegion(t.regionId);
    setText(t.text);
    setFeedback(null);
    requestAnimationFrame(() => input.current?.focus());
  }
  async function read() {
    setBusy(true);
    setError("");
    job.current?.abort();
    const c = new AbortController();
    job.current = c;
    const revision = work.revision;
    try {
      if (!recognizer.available())
        throw Error(
          "Recognition is unavailable. Type your intended number or expression below; no mathematical error has been recorded.",
        );
      const result = await recognizer.recognize(
        {
          contract: CONTRACT,
          workId: work.id,
          revision,
          strokes: work.strokes.filter((s) => !work.erased.includes(s.id)),
          regions: work.layout.regions,
        },
        c.signal,
      );
      if (c.signal.aborted) return;
      if (latest.current.id !== work.id || latest.current.revision !== revision)
        throw Error(
          "Your writing changed while recognizing. Results were ignored; no mathematical error was recorded.",
        );
      onChange(recognize(latest.current, result, confidenceThreshold));
    } catch (e) {
      if (!c.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Recognition failed. Type your intended input instead.",
        );
    } finally {
      if (job.current === c) setBusy(false);
    }
  }
  async function send() {
    setError("");
    setBusy(true);
    job.current?.abort();
    const c = new AbortController();
    job.current = c;
    try {
      const p = packet(work);
      const result = await validator.submit(p, c.signal);
      if (c.signal.aborted) return;
      if (
        result.contract !== CONTRACT ||
        result.workId !== p.workId ||
        result.revision !== p.revision ||
        latest.current.revision !== p.revision ||
        latest.current.id !== p.workId
      )
        throw Error("Out-of-date validation feedback ignored");
      setFeedback(result);
      onConfirmedInput?.(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Input was not sent");
    } finally {
      if (job.current === c) setBusy(false);
    }
  }
  const outstanding = blockers(work);
  const currentFeedback =
    feedback?.revision === work.revision && feedback.workId === work.id
      ? feedback
      : externalFeedback;
  return (
    <section
      className={compact ? "math-workspace answer-canvas" : "math-workspace"}
      aria-label="Mathematical input workspace"
    >
      {!compact && (
        <header>
          <h2>{work.problem.statement}</h2>
          <p>
            Write naturally, or type each step. Recognition uncertainty is an
            input issue, not a maths mistake.
          </p>
        </header>
      )}
      <div className="writing-tools" role="toolbar" aria-label="Writing tools">
        {(["ink", "eraser", "pan"] as const).map((t) => (
          <button key={t} aria-pressed={tool === t} onClick={() => setTool(t)}>
            {t === "ink" ? "Pen" : t === "eraser" ? "Eraser" : "Pan"}
          </button>
        ))}
        <button
          disabled={!work.history.length}
          onClick={() => act(() => undo(work))}
        >
          Undo
        </button>
        <button
          disabled={!work.future.length}
          onClick={() => act(() => redo(work))}
        >
          Redo
        </button>
        <button onClick={() => act(() => clear(work))}>Clear paper</button>
      </div>
      <details open={!studentMode}>
        <summary>Paper, zoom and pen settings</summary>
        <div className="writing-settings">
          <label>
            Paper
            <select
              aria-label="Paper"
              value={work.paper}
              onChange={(e) =>
                onChange({
                  ...work,
                  paper: e.target.value as Work["paper"],
                  revision: work.revision + 1,
                  updatedAt: new Date().toISOString(),
                })
              }
            >
              <option value="blank">Blank</option>
              <option value="grid">Square grid</option>
              <option value="ruled">Ruled</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={penOnly}
              onChange={(e) => setPenOnly(e.target.checked)}
            />
            Pen only: ignore finger/palm touches
          </label>
          <button
            onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            aria-label="Zoom out"
          >
            −
          </button>
          <output aria-label="Zoom">{Math.round(zoom * 100)}%</output>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
        <p className="small">
          Use two fingers to zoom, or choose Pan after zooming. Palm rejection
          is best-effort; Pen only is the reliable touch lock.
        </p>
      </details>
      <Surface
        key={work.id}
        work={work}
        onChange={(w) => {
          onChange(w);
          setFeedback(null);
        }}
        tool={tool}
        stylusOnly={penOnly}
        zoom={zoom}
        onZoom={setZoom}
        selected={region}
        onSelect={(id) => {
          setRegion(id);
          setToken(null);
          setText("");
        }}
      />
      <button disabled={busy} onClick={read}>
        Interpret handwriting
      </button>
      <p className="small">
        {!studentMode && <>Recognizer: {recognizer.id}. </>}
        {recognizer.available()
          ? "Candidate confidence is not mathematical correctness."
          : "Unavailable — the typed path below works for the entire exercise."}
      </p>
      {!compact && (
        <button
          type="button"
          onClick={() => {
            input.current?.scrollIntoView({ block: "center" });
            input.current?.focus();
          }}
        >
          Type instead
        </button>
      )}
      {(!compact || token) && (
        <section className="input-editor" aria-label="Typed mathematical input">
          <h3>{token ? "Clarify or edit this symbol" : "Type a step"}</h3>
          {!compact && (
            <label>
              Mathematical region
              <select
                aria-label="Mathematical region"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setToken(null);
                  setText("");
                }}
              >
                {work.layout.regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(() =>
                token
                  ? confirm(work, token, text, keypad ? "keypad" : "keyboard")
                  : manual(work, region, text, keypad ? "keypad" : "keyboard"),
              );
              if (text.trim()) {
                setText("");
                setToken(null);
              }
            }}
          >
            <label>
              {token ? "Intended symbol or expression" : "Number or expression"}
              <input
                ref={input}
                value={text}
                maxLength={500}
                inputMode={keypad ? "decimal" : "text"}
                onChange={(e) => {
                  setKeypad(false);
                  setText(e.target.value);
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <details open={!studentMode}>
              <summary>Number and maths keyboard</summary>
              <div
                className="math-keypad"
                role="group"
                aria-label="Mathematical keyboard"
              >
                {[
                  "7",
                  "8",
                  "9",
                  "÷",
                  "4",
                  "5",
                  "6",
                  "×",
                  "1",
                  "2",
                  "3",
                  "−",
                  "0",
                  ".",
                  "/",
                  "+",
                  "(",
                  ")",
                  "=",
                  "x",
                  "²",
                  "√",
                  "π",
                  "⌫",
                ].map((k) => (
                  <button
                    type="button"
                    key={k}
                    aria-label={
                      k === "⌫" ? "Delete last character" : `Insert ${k}`
                    }
                    onClick={() => {
                      setKeypad(true);
                      setText((s) => (k === "⌫" ? s.slice(0, -1) : s + k));
                      input.current?.focus();
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </details>
            <button type="submit" disabled={!text.trim()}>
              {token ? "Confirm this symbol" : "Add typed step"}
            </button>
            {token && (
              <button
                type="button"
                onClick={() => {
                  setToken(null);
                  setText("");
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
        </section>
      )}
      <section aria-label="Interpreted working">
        <h3>
          {studentMode
            ? "Your steps · tap a number to change it"
            : "Your interpreted steps"}
        </h3>
        <p>
          Original ink stays on the page. You can edit any interpretation,
          including confident ones.
        </p>
        {!work.tokens.length && <p>No interpreted or typed steps yet.</p>}
        {[...work.layout.regions]
          .sort((a, b) => a.order - b.order)
          .filter(
            (r) =>
              !studentMode ||
              work.tokens.some((t) => t.regionId === r.id) ||
              currentFeedback?.messages.some((m) => m.regionId === r.id),
          )
          .map((r) => (
            <div key={r.id} className="working-row">
              <strong>{r.label}</strong>
              {currentFeedback?.messages
                .filter((m) => m.regionId === r.id)
                .map((m, i) => (
                  <p
                    className={`step-feedback ${m.text.includes("Practice complete") ? "practice-checked" : ""}`}
                    role="status"
                    key={i}
                  >
                    {m.text}
                  </p>
                ))}
              {work.tokens
                .filter((t) => t.regionId === r.id)
                .map((t) => (
                  <button
                    key={t.id}
                    className={
                      t.status === "uncertain" ? "uncertain" : "interpreted"
                    }
                    onClick={() => selectToken(t.id)}
                    aria-label={`Edit ${r.label}: ${t.text}${t.status === "uncertain" ? ", needs clarification" : ""}`}
                  >
                    {t.text} ·{" "}
                    {t.status === "uncertain"
                      ? "Type what you meant"
                      : t.status === "confirmed"
                        ? "Confirmed by you"
                        : `Recognized (${Math.round(t.confidence! * 100)}%)`}
                  </button>
                ))}
            </div>
          ))}
      </section>
      {allowExtraRegions && (
        <button
          onClick={() =>
            act(() => {
              const r = {
                id: uid(),
                label: `Extra step ${work.layout.regions.length + 1}`,
                role: "working",
                order: Math.max(...work.layout.regions.map((x) => x.order)) + 1,
                x: 20,
                y: work.layout.height + 20,
                width: work.layout.width - 40,
                height: 65,
              };
              return {
                ...work,
                layout: {
                  ...work.layout,
                  height: work.layout.height + 120,
                  regions: [...work.layout.regions, r],
                },
                revision: work.revision + 1,
                updatedAt: new Date().toISOString(),
              };
            })
          }
        >
          Add another writing region
        </button>
      )}
      {outstanding.length > 0 && (
        <p role="status">
          Input clarification needed.{" "}
          {outstanding.some((x) => x.startsWith("Some handwriting"))
            ? "Type the unclear part, or choose Type instead."
            : "Choose the highlighted symbol and type what you meant."}
        </p>
      )}
      {!compact && (
        <button
          disabled={busy || !!outstanding.length || !work.tokens.length}
          onClick={send}
        >
          {studentMode
            ? "Check my working"
            : "Send confirmed steps to validator"}
        </button>
      )}
      {currentFeedback && !studentMode && (
        <section aria-label="Validator feedback">
          <h3>
            {currentFeedback.status === "received"
              ? "Input received"
              : "Validator feedback"}
          </h3>
          {currentFeedback.messages.map((m, i) => (
            <p key={i}>
              {work.layout.regions.find((r) => r.id === m.regionId)?.label}:{" "}
              {m.text}
              {m.kind === "input-clarification" && (
                <button
                  onClick={() => {
                    if (
                      m.tokenId &&
                      work.tokens.some((t) => t.id === m.tokenId)
                    )
                      selectToken(m.tokenId);
                    else {
                      setRegion(m.regionId);
                      setToken(null);
                      setText("");
                      input.current?.focus();
                    }
                  }}
                >
                  Clarify this input
                </button>
              )}
            </p>
          ))}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Working… You can keep your original ink.</p>}
    </section>
  );
}
