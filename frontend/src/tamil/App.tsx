import { useEffect, useRef, useState } from "react";
import {
  activities,
  competencies,
  evaluate,
  graphemes,
  items,
  type Item,
} from "../../../packages/tamil/src/index";
import {
  answerSession,
  beginPractice,
  newSession,
  focusSession,
  parseSession,
  present,
  revealHint,
  type Session,
} from "./session";
import "./tamil.css";
const KEY = "openpath.tamil.foundation.v1";
function choices(i: Item) {
  const n =
    [...i.id].reduce((n, c) => n + c.codePointAt(0)!, 0) %
    (i.options.length || 1);
  return [...i.options.slice(n), ...i.options.slice(0, n)];
}
/** A host supplies the SAME pupil ID used for English. No inference state is created here. */
export function TamilApp({ learnerId }: { learnerId?: string }) {
  return <TamilSession key={learnerId ?? "standalone"} learnerId={learnerId} />;
}
function TamilSession({ learnerId }: { learnerId?: string }) {
  const key = learnerId ? `${KEY}.${learnerId}` : KEY;
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return {
        session: raw
          ? parseSession(raw, learnerId)
          : newSession(learnerId ?? crypto.randomUUID()),
        error: "",
      };
    } catch {
      return {
        session: null,
        error:
          "சேமித்த பதிவைத் திறக்க முடியவில்லை. பதிவை அழிக்காமல் மீண்டும் திறந்து பாருங்கள்.",
      };
    }
  });
  const [s, setSession] = useState<Session | null>(initial.session);
  const [error, setError] = useState(initial.error);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const shownToken = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function save(next: Session) {
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setError("");
      return true;
    } catch {
      setError(
        "இந்தச் சாதனத்தில் சேமிக்க முடியவில்லை. இடத்தைச் சரிபார்த்து மீண்டும் முயலுங்கள்.",
      );
      return false;
    }
  }
  const token =
    s && ["diagnostic", "practice"].includes(s.phase)
      ? `${s.sessionId}.${s.phase}.${s.cursor}`
      : "";
  useEffect(() => {
    if (!s || !token || shownToken.current === token) return;
    const next = present(s);
    if (save(next)) {
      shownToken.current = token;
      setSession(next);
      setHint(false);
    }
  }, [token]);
  if (!s)
    return (
      <main>
        <h1>தமிழ்</h1>
        <p role="alert">{error}</p>
        <button onClick={() => location.reload()}>மீண்டும் திற</button>
        <p>Existing saved data has been preserved.</p>
      </main>
    );
  const current = s;
  const list = s.phase === "diagnostic" ? s.diagnosticIds : s.practiceIds;
  const item = items.find((i) => i.id === list[s.cursor]);
  const activity = activities.find((a) => a.competency === s.target)!;
  function transition(next: Session) {
    if (save(next)) {
      setSession(next);
      setDraft("");
      setHint(false);
    }
  }
  function submit(value: string) {
    if (busy || shownToken.current !== token || !item || !value.trim()) return;
    const next = answerSession(current, value, hint);
    if (!save(next)) return;
    setBusy(true);
    const result = evaluate(item, value);
    setFeedback(result.feedback);
    // Persist before feedback: reload resumes at the next unanswered question.
    timer.current = setTimeout(
      () => {
        setSession(next);
        setBusy(false);
        setFeedback("");
        setDraft("");
        setHint(false);
      },
      result.correct ? 1100 : 2600,
    );
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              contract: "provisional-language-module.v1",
              language: "ta",
              learnerId: current.learnerId,
              presentations: current.presentations,
              events: current.events,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "openpath-tamil-evidence.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const events = s.events.filter((e) => e.sessionId === s.sessionId);
  return (
    <main lang="ta">
      <header>
        <span>OpenPath · தமிழ்</span>
        <span className="badge">முன்னோட்டம்</span>
      </header>
      <p className="notice">
        ஆசிரியர் ஆய்வு பெறாத பயிற்சி. இது தேர்வு மதிப்பெண் அல்ல.
      </p>
      {error && <p role="alert">{error}</p>}
      {s.phase === "welcome" && (
        <section>
          <h1>தமிழுடன் விளையாடுவோம்!</h1>
          <p>ஆறு சிறிய கேள்விகள். பிறகு ஒரு விளக்கமும் பயிற்சியும்.</p>
          <p>
            ஒலி தேவையில்லை. பதில்கள் இந்தச் சாதனத்தில் மட்டும் இருக்கும்.
            குழந்தையுடன் பெரியவர் ஒருவரும் முயன்று பார்க்கலாம்.
          </p>
          <button
            className="primary"
            onClick={() => transition({ ...s, phase: "diagnostic" })}
          >
            தொடங்கு
          </button>
          <details>
            <summary>ஒரு திறனைப் பயிற்சி செய்</summary>
            {competencies
              .filter((c) => c.status === "pilot")
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => transition(focusSession(s, c.id))}
                >
                  {c.name}
                </button>
              ))}
          </details>
        </section>
      )}
      {(s.phase === "diagnostic" || s.phase === "practice") && item && (
        <section aria-busy={busy} data-item={item.id}>
          <p>
            {s.phase === "diagnostic"
              ? "சிறிய அறிமுகம்"
              : item.stage === "guided"
                ? "சேர்ந்து செய்வோம்"
                : item.transfer
                  ? "புதிய எடுத்துக்காட்டு"
                  : "நீயே முயல்"}{" "}
            · {s.cursor + 1} / {list.length}
          </p>
          <h1>{item.prompt}</h1>
          {item.stage === "guided" && (
            <p className="hint">பார்த்து முயல்வோம்: {item.answers[0]}</p>
          )}
          {item.format === "choice" ? (
            <div className="choices">
              {choices(item).map((o) => (
                <button disabled={busy} key={o} onClick={() => submit(o)}>
                  {o}
                </button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(draft);
              }}
            >
              <label htmlFor="answer">உன் விடை</label>
              <input
                id="answer"
                ref={input}
                lang="ta"
                autoComplete="off"
                spellCheck={false}
                maxLength={120}
                value={draft}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing)
                    e.preventDefault();
                }}
              />
              <p className="small">
                தமிழ் விசைப்பலகை அல்லது கீழே உள்ள எழுத்துகளைப் பயன்படுத்து.
              </p>
              <div className="keyboard" aria-label="தமிழ் விசைப்பலகை">
                {[
                  "அ",
                  "ஆ",
                  "இ",
                  "ஈ",
                  "உ",
                  "ஊ",
                  "எ",
                  "ஏ",
                  "ஐ",
                  "ஒ",
                  "ஓ",
                  "ஔ",
                  ..."கஙசஞடணதநபமயரலவழளறன",
                  "ஃ",
                  "்",
                  "ா",
                  "ி",
                  "ீ",
                  "ு",
                  "ூ",
                  "ெ",
                  "ே",
                  "ை",
                  "ொ",
                  "ோ",
                  "ௌ",
                ].map((k) => (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`எழுது ${k}`}
                    key={k}
                    onClick={() => {
                      setDraft((d) => (d.length + k.length <= 120 ? d + k : d));
                      input.current?.focus();
                    }}
                  >
                    {/[்ா-ௌ]/.test(k) ? "◌" + k : k}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setDraft((d) => graphemes(d).slice(0, -1).join(""))
                  }
                >
                  அழி
                </button>
              </div>
              <button
                className="primary"
                disabled={busy || !draft.trim()}
                type="submit"
              >
                சரிபார்
              </button>
            </form>
          )}
          <button
            className="help"
            disabled={busy || hint || shownToken.current !== token}
            onClick={() => {
              const next = revealHint(s);
              if (save(next)) {
                setSession(next);
                setHint(true);
              }
            }}
          >
            உதவி
          </button>
          {hint && (
            <p className="hint">
              விடையைப் பார்த்து முயலலாம்: {item.answers[0]} · இது உதவியுடன்
              செய்த பயிற்சி.
            </p>
          )}
          <p role="status" aria-live="polite" className="feedback">
            {feedback}
          </p>
        </section>
      )}
      {s.phase === "teach" && (
        <section>
          <h1>{competencies.find((c) => c.id === s.target)?.name}</h1>
          <p>{activity.explanation}</p>
          <p className="example">{activity.examples}</p>
          <p>{activity.contrast}</p>
          <button
            className="primary"
            onClick={() => transition(beginPractice(s))}
          >
            பயிற்சி செய்வோம்
          </button>
        </section>
      )}
      {s.phase === "done" && (
        <section>
          <h1>இன்று நன்றாக முயன்றாய்!</h1>
          <p>
            {events.length} பதில்கள் பதிவாயின. சரியான பதில்கள்:{" "}
            {events.filter((e) => e.correct).length}.
          </p>
          <p>
            உதவியுடன் செய்தவை:{" "}
            {events.filter((e) => e.support.hint || e.support.revealed).length}.
            புதிய எடுத்துக்காட்டுகள்: {events.filter((e) => e.transfer).length}.
          </p>
          <p>
            இவை பயிற்சிப் பதிவுகள் மட்டுமே. திறன் தேர்ச்சி உறுதி
            செய்யப்படவில்லை.
          </p>
          <button onClick={download}>பதிவைப் பதிவிறக்கு</button>
          <button
            onClick={() =>
              transition(newSession(s.learnerId, s.events, s.presentations))
            }
          >
            மீண்டும் விளையாடு
          </button>
        </section>
      )}
      <footer>
        <details>
          <summary>பெரியவர்களுக்கு</summary>
          <p>
            Candidate content; educator review and real-learner validation
            pending. No audio assessment, server upload or mastery estimates.
            Hints and repeated families remain marked in evidence.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "இந்தச் சாதனத்தின் தமிழ் பயிற்சிப் பதிவை அழிக்கவா?",
                )
              ) {
                localStorage.removeItem(key);
                setSession(newSession(s.learnerId));
                setDraft("");
                setHint(false);
              }
            }}
          >
            தமிழ் பதிவை அழி
          </button>
        </details>
      </footer>
    </main>
  );
}
