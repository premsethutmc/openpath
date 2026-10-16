/**
 * DESIGN PROTOTYPE ONLY (Phase 1). The adaptive spelling screen and a simple grown-up view, inside a phone frame, with
 * demo controls beside it. Built into one self-contained page by scripts/build-prototype.mjs; never part of the app.
 */
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  type ClueState,
  type Help,
  type PastSlip,
  type PatternId,
  PATTERN_TEXT,
  type PrototypeWord,
  type RejectReason,
  SAMPLE_WORDS,
  TIMING,
  type WordEvidence,
  clueReady,
  completionOf,
  helpAfterWrong,
  helpOffer,
  judgeChange,
  nextClue,
  pattern,
  reassessOf,
  slips,
  takeClue,
} from "./logic.ts";

/* ------------------------------------------------------------------ speech (the browser's own voice) */

let speechToken = 0;
/** Say text; resolves when it ends (or after an estimate when the browser cannot speak, so timing still pauses). */
function say(text: string): Promise<void> {
  const mine = ++speechToken;
  const estimate = 600 + text.length * 55;
  return new Promise((resolve) => {
    const done = () => mine === speechToken && resolve();
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") return void setTimeout(done, estimate);
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = 0.85;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      done();
    };
    u.onend = end;
    u.onerror = end;
    synth.speak(u);
    setTimeout(end, estimate + 4000); // never wait for ever
  });
}
const stopSaying = () => {
  speechToken++;
  const s = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (s && (s.speaking || s.pending)) s.cancel();
};

/* ------------------------------------------------------------------ the child's word screen */

type Phase = "answering" | "wrong" | "copy" | "right";
interface Settings {
  speed: number;
  ringVisible: boolean;
  timing: "normal" | "slower" | "off";
}

interface WordProps {
  w: PrototypeWord;
  index: number;
  total: number;
  history: PastSlip[];
  settings: Settings;
  paused: boolean;
  onEvidence: (e: WordEvidence) => void;
  onSlips: (s: PastSlip[]) => void;
  onNext: () => void;
  bindSim: (f: ((kind: SimKind) => void) | null) => void;
}
export type SimKind = "paste" | "suggestion" | "autocorrect" | "compose";

function WordScreen({ w, index, total, history, settings, paused, onEvidence, onSlips, onNext, bindSim }: WordProps) {
  const [typed, setTypedState] = useState("");
  // the answer OpenPath holds, updated at once (keyboard events can arrive faster than React re-renders)
  const model = useRef("");
  const setTyped = (v: string) => {
    model.current = v;
    setTypedState(v);
  };
  const [phase, setPhase] = useState<Phase>("answering");
  const [speaking, setSpeaking] = useState(false);
  const [clue, setClue] = useState<ClueState>({ level: 0, revealed: 0, lastClueAt: null });
  const [active, setActive] = useState(0); // active thinking seconds
  const [help, setHelp] = useState<Help | null>(null);
  const [nudge, setNudge] = useState(false);
  const [shake, setShake] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const lastKey = useRef(0);
  const plays = useRef(0);
  const added = useRef(0);
  const removed = useRef(0);
  const rejected = useRef(new Map<RejectReason, number>());
  const attempts = useRef<WordEvidence["attempts"]>([]);
  const clues = useRef<WordEvidence["clues"]>([]);
  const patterns = useRef(new Map<PatternId, "this_word" | "supported">());

  // the timer: active thinking time only (paused while the word is said, during feedback, when hidden or paused)
  const [hidden, setHidden] = useState(typeof document !== "undefined" && document.visibilityState === "hidden");
  useEffect(() => {
    const v = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", v);
    window.addEventListener("blur", v);
    return () => {
      document.removeEventListener("visibilitychange", v);
      window.removeEventListener("blur", v);
    };
  }, []);
  const running = phase === "answering" && !speaking && !hidden && !paused;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setActive((a) => a + 0.25 * settings.speed), 250);
    return () => clearInterval(t);
  }, [running, settings.speed]);

  const scale = settings.timing === "slower" ? 1.6 : 1;
  const offering = phase === "answering" && settings.timing !== "off" && helpOffer(clue, w.word, active / scale, active - lastKey.current);
  const upcoming = nextClue(clue, w.word);
  const ready = clueReady(clue, w.word, active);
  // ring: how far towards the next offer (full when the next clue is only given on request)
  const ringTarget = upcoming && upcoming <= 3 ? Math.max(TIMING.offerAt[upcoming - 1], clue.lastClueAt === null ? 0 : clue.lastClueAt + TIMING.afterClueGap) * scale : null;
  const ringFrom = clue.lastClueAt ?? 0;
  const ring = ringTarget === null ? 1 : Math.min(1, Math.max(0, (active - ringFrom) / Math.max(1, ringTarget - ringFrom)));

  const hear = useCallback(
    async (text: string) => {
      setSpeaking(true);
      plays.current += 1;
      await say(text);
      setSpeaking(false);
    },
    [],
  );
  const first = w.soundsLike ? `${w.word}. ${w.sentence} ${w.word}.` : `${w.word}.`;
  useEffect(() => {
    void hear(first);
    input.current?.focus({ preventScroll: true });
    return stopSaying;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takeHelp = () => {
    if (!ready || phase !== "answering") return;
    const n = takeClue(clue, w.word, active);
    clues.current.push({ level: n.level === 4 ? 4 : n.level, atActiveMs: Math.round(active * 1000) });
    setClue(n);
    if (n.level === 1) void hear(w.sentence.replace(new RegExp(`\\b${w.word}\\b`, "i"), w.word));
    if (n.level === 2) void hear(`${w.word} means ${w.meaning}.`);
    input.current?.focus({ preventScroll: true });
  };

  const reject = (reason: RejectReason) => {
    rejected.current.set(reason, (rejected.current.get(reason) ?? 0) + 1);
    setShake((s) => s + 1);
    const total = [...rejected.current.values()].reduce((a, b) => a + b, 0);
    if (total >= 2) setNudge(true);
  };
  const apply = (next: string, inputType: string) => {
    const prev = model.current;
    const d = judgeChange(prev, next, inputType);
    const el = input.current;
    if (d.kind === "add") {
      added.current++;
      lastKey.current = active;
      setTyped(prev + d.letter);
      if (el) el.value = prev + d.letter;
    } else if (d.kind === "remove") {
      removed.current += d.count;
      lastKey.current = active;
      const v = prev.slice(0, prev.length - d.count);
      setTyped(v);
      if (el) el.value = v;
    } else if (d.kind === "reject") {
      reject(d.reason);
      if (el) el.value = prev; // back to the child's own letters
    }
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  };
  // demo: produce the same events a phone's keyboard would
  useEffect(() => {
    bindSim((kind) => {
      const el = input.current;
      if (!el || phase === "right") return;
      const setValue = (v: string, inputType: string, data: string | null) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, v);
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data }));
      };
      const typed = model.current;
      if (kind === "paste") setValue(typed + w.word, "insertFromPaste", w.word);
      else if (kind === "suggestion") setValue(w.word + " ", "insertCompositionText", w.word + " ");
      else if (kind === "autocorrect") setValue(w.word, "insertReplacementText", w.word);
      else {
        // Android composition: letters arrive one at a time through insertCompositionText
        const target = w.word.slice(0, Math.max(typed.length + 1, Math.min(3, w.word.length)));
        let v = typed;
        for (const ch of target.slice(typed.length)) {
          v += ch;
          setValue(v, "insertCompositionText", v);
        }
      }
    });
    return () => bindSim(null);
  });

  const evidence = useMemo((): WordEvidence => {
    const finalCorrect = phase === "right";
    const base = { attempts: attempts.current, lettersRevealed: clue.revealed, finalCorrect, clues: clues.current };
    const completion = completionOf(base, w.word);
    const firstHelp = attempts.current.findIndex((a) => a.afterHelp !== null);
    const firstLetterClue = clues.current.find((c) => c.level >= 3);
    const ind = attempts.current[0] && !(firstLetterClue && firstLetterClue.atActiveMs <= attempts.current[0].atActiveMs) && firstHelp !== 0 ? attempts.current[0].answer : null;
    return {
      kind: "spell_attempt_v2",
      word: { id: w.id, text: w.word, capability: w.capability, ...(w.item ? { item: w.item } : {}) },
      attempts: attempts.current,
      independentAnswer: ind,
      activeMs: Math.round(active * 1000),
      plays: plays.current,
      clues: clues.current,
      lettersRevealed: clue.revealed,
      rejectedInputs: [...rejected.current].map(([reason, count]) => ({ reason, count })),
      finalCorrect,
      completion: phase === "answering" && !finalCorrect ? "not_completed" : completion,
      possiblePatterns: [...patterns.current].map(([pattern, support]) => ({ pattern, support })),
      reassess: reassessOf(phase === "answering" ? "not_completed" : completion),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, clue, Math.floor(active), typed, speaking, shake]);
  useEffect(() => onEvidence(evidence), [evidence, onEvidence]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const answer = typed.trim();
    if (!answer || speaking) return;
    const correct = answer.toLowerCase() === w.word;
    attempts.current.push({ answer, correct, atActiveMs: Math.round(active * 1000), lettersAdded: added.current, lettersRemoved: removed.current, afterHelp: phase === "copy" ? "from_start" : (help?.kind ?? null) });
    added.current = 0;
    removed.current = 0;
    stopSaying();
    setSpeaking(false);
    if (correct) {
      setPhase("right");
      void say(`Yes! ${w.word}.`);
      return;
    }
    const found = slips(w, answer);
    const h = helpAfterWrong(w, answer, history);
    for (const p of found) patterns.current.set(p, h.kind === "targeted" && h.pattern === p ? "supported" : patterns.current.get(p) ?? "this_word");
    onSlips(found.map((p) => ({ word: w.word, pattern: p })));
    const wrongs = attempts.current.filter((a) => !a.correct).length;
    if (wrongs >= 2 || phase === "copy") {
      // two tries: show the word and copy it once (guided practice, never a test)
      setPhase("copy");
      setHelp(null);
      setTyped("");
      if (input.current) input.current.value = "";
      setClue((c) => ({ ...c, revealed: w.word.length }));
      void say(`${w.word}. Let's write it together.`);
      return;
    }
    setHelp(h);
    setPhase("wrong");
    const keep = h.kind === "other_word" ? "" : w.word.slice(0, h.keep);
    setTyped(keep);
    if (input.current) input.current.value = keep;
  };
  const tryAgain = () => {
    setPhase("answering");
    if (help?.kind === "other_word") void hear(`${w.sentence}`);
    else void hear(`${w.word}.`);
    setTimeout(() => input.current?.focus({ preventScroll: true }), 0);
  };
  useEffect(() => {
    if (phase !== "right") return;
    const t = setTimeout(onNext, 3500); // the demo speed changes thinking time only
    return () => clearTimeout(t);
  }, [phase, onNext]);

  const letters = pattern(w.word, clue.revealed);
  const blanked = w.sentence.replace(new RegExp(`\\b${w.word}\\b`, "i"), "_____");
  const label = speaking ? "Listening…" : plays.current > 1 ? "Hear it again" : "Hear the word";
  const offerText = upcoming === 1 ? "Hear it in a sentence?" : upcoming === 2 ? "Want to know what it means?" : "Want the first letter?";
  const clueName = upcoming === 1 ? "Sentence" : upcoming === 2 ? "Meaning" : upcoming === 3 ? "First letter" : upcoming === 4 ? "Another letter" : "No more clues";

  return (
    <div className={`ws phase-${phase}`} data-phase={phase}>
      <div className="ws-top">
        <span className="ws-count">
          Word {index + 1} of {total}
        </span>
        <span className="ws-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, k) => (
            <i key={k} className={k < index ? "done" : k === index ? "now" : ""} />
          ))}
        </span>
      </div>

      <div className="ws-listen">
        <button type="button" className={`speaker ${speaking ? "on" : ""}`} aria-label={label} onClick={() => void hear(phase === "copy" ? `${w.word}.` : `${w.word}.`)} data-testid="speaker">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className="speaker-label">{label}</span>
      </div>

      {(clue.level >= 1 || clue.revealed > 0) && phase !== "copy" && (
        <div className="clues" data-testid="clues">
          {clue.level >= 1 && (
            <p className="clue clue-sentence">
              <span className="clue-tag">Sentence</span>
              {blanked}
            </p>
          )}
          {clue.level >= 2 && (
            <p className="clue clue-meaning">
              <span className="clue-tag">Meaning</span>
              {w.meaning}
            </p>
          )}
          {clue.revealed > 0 && (
            <div className="clue-letters" aria-label={`Clue: ${letters.join(" ")}`} data-testid="pattern">
              {letters.map((ch, i) => (
                <span key={i} className={ch === "_" ? "blank" : "given"}>
                  {ch === "_" ? "" : ch}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === "wrong" && help && (
        <div className="help" role="status" data-testid="help" data-help={help.kind}>
          {help.kind === "other_word" ? (
            <>
              <p className="help-title">That's a real word, but a different one.</p>
              <p>
                We need the word in: <i>{blanked}</i>
              </p>
              <p className="small">It means: {w.meaning}</p>
            </>
          ) : help.kind === "targeted" ? (
            <>
              <p className="help-title">So close!</p>
              <p>{help.pattern === "missed_double" ? "One letter in this word is doubled. Listen for it." : "This word has one letter fewer. Listen carefully."}</p>
              <div className="clue-letters spot" aria-hidden="true">
                {[...w.word].map((ch, i) => (
                  <span key={i} className={i < help.keep ? "given" : help.marker !== null && (i === help.marker || i === help.marker + 1) ? "spot-mark" : "blank"}>
                    {i < help.keep ? ch : ""}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="help-title">Nearly!</p>
              <p>{help.keep > 0 ? `The start is right. Keep going from “${w.word.slice(0, help.keep)}”.` : "Listen again and have another go."}</p>
            </>
          )}
          <button type="button" className="primary" onClick={tryAgain} data-testid="try-again">
            Try again
          </button>
        </div>
      )}

      {phase === "copy" && (
        <div className="help copy" role="status" data-testid="copy">
          <p className="help-title">Let's write it together.</p>
          <p className="copy-word">{w.word}</p>
          <p className="small">Look at it, then type it.</p>
        </div>
      )}

      {phase === "right" && (
        <div className="right" role="status" data-testid="right">
          <p className="right-title">Yes!</p>
          <p className="right-word">{w.word}</p>
          <button type="button" className="primary" onClick={onNext}>
            Next word
          </button>
        </div>
      )}

      {(phase === "answering" || phase === "copy") && (
        <form className="answer" onSubmit={submit}>
          <label className={`tiles ${shake % 2 ? "shake-a" : shake ? "shake-b" : ""}`} data-testid="tiles">
            <span className="sr">Type the word, one letter at a time</span>
            {[...typed].map((ch, i) => (
              <span key={i} className="tile">
                {ch}
              </span>
            ))}
            <span className="tile caret" aria-hidden="true" />
            <input
              ref={(el) => {
                // a new box (after feedback) starts from the answer OpenPath holds, such as the kept right start
                input.current = el;
                if (el && el.value !== model.current) el.value = model.current;
              }}
              className="catcher"
              type="text"
              name="spell-letter-input"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="go"
              aria-label="Your spelling"
              data-testid="answer"
              defaultValue=""
              onInput={(e) => apply((e.target as HTMLInputElement).value, ((e.nativeEvent as InputEvent).inputType ?? "") as string)}
              onPaste={(e) => {
                e.preventDefault();
                reject("paste");
              }}
              onDrop={(e) => {
                e.preventDefault();
                reject("paste");
              }}
              onSelect={(e) => {
                const el = e.currentTarget;
                if (el.selectionStart !== el.value.length) el.setSelectionRange(el.value.length, el.value.length);
              }}
            />
          </label>
          {nudge && <p className="small nudge">Type one letter at a time.</p>}
          <div className="answer-row">
            <button type="button" className={`clue-btn ${offering ? "offer" : ""}`} onClick={takeHelp} disabled={!ready || phase === "copy"} aria-label={`Clue: ${clueName}`} data-testid="clue" data-next={upcoming ?? 0}>
              {settings.ringVisible && settings.timing !== "off" && (
                <svg className="ring" viewBox="0 0 44 44" aria-hidden="true">
                  <circle cx="22" cy="22" r="20" className="ring-track" />
                  <circle cx="22" cy="22" r="20" className="ring-fill" style={{ strokeDashoffset: `${125.66 * (1 - ring)}` }} />
                </svg>
              )}
              <svg className="bulb" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="submit" className="primary submit" disabled={!typed.trim() || speaking}>
              Submit
            </button>
          </div>
          {offering && (
            <p className="offer-bubble" data-testid="offer">
              {offerText}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ grown-up view */

function GrownUp({ done, slipsSeen, settings, setSettings }: { done: WordEvidence[]; slipsSeen: PastSlip[]; settings: Settings; setSettings: (s: Settings) => void }) {
  const attempted = done.length;
  const independent = done.filter((e) => e.completion === "independent").length;
  const assisted = done.filter((e) => e.completion === "assisted" || e.completion === "guided").length;
  const counts = new Map<PatternId, Set<string>>();
  for (const s of slipsSeen) {
    if (s.pattern === "other" || s.pattern === "swapped_letters") continue;
    counts.set(s.pattern, (counts.get(s.pattern) ?? new Set()).add(s.word));
  }
  const difficulties = [...counts].sort((a, b) => b[1].size - a[1].size).slice(0, 3);
  const again = done.filter((e) => e.reassess.needed);
  return (
    <div className="gu" data-testid="grown-up">
      <h2>This week</h2>
      <div className="gu-stats">
        <div>
          <b>{attempted}</b>
          <span>words tried</span>
        </div>
        <div>
          <b>{attempted ? `${independent} of ${attempted}` : "–"}</b>
          <span>spelt on their own</span>
        </div>
        <div>
          <b>{assisted}</b>
          <span>finished with help</span>
        </div>
      </div>
      <h3>Tricky spots</h3>
      {difficulties.length ? (
        <ul className="gu-list">
          {difficulties.map(([p, words]) => (
            <li key={p}>
              {PATTERN_TEXT[p].parent}
              <span className="small"> · {[...words].join(", ")}{words.size >= 2 ? "" : " (seen once, not a pattern yet)"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">Nothing yet.</p>
      )}
      <h3>To try again</h3>
      {again.length ? (
        <ul className="gu-list">
          {again.map((e) => (
            <li key={e.word.id}>
              <b>{e.word.text}</b> <span className="small">· {e.reassess.reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="small">Nothing yet.</p>
      )}
      <h3>Help settings</h3>
      <div className="gu-settings">
        <label>
          <span>When clues are offered</span>
          <select value={settings.timing} onChange={(e) => setSettings({ ...settings, timing: e.target.value as Settings["timing"] })} id="gu-timing">
            <option value="normal">Normal</option>
            <option value="slower">Give more time</option>
            <option value="off">Only when asked</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.ringVisible} onChange={(e) => setSettings({ ...settings, ringVisible: e.target.checked })} id="gu-ring" />
          <span>Show the help ring</span>
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the prototype, with demo controls */

function App() {
  const [order, setOrder] = useState(SAMPLE_WORDS.map((w) => w.id));
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0); // remount key
  const [view, setView] = useState<"child" | "grown-up">("child");
  const [settings, setSettings] = useState<Settings>({ speed: 1, ringVisible: true, timing: "normal" });
  const [paused, setPaused] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [history, setHistory] = useState<PastSlip[]>([]);
  const [current, setCurrent] = useState<WordEvidence | null>(null);
  const [done, setDone] = useState<WordEvidence[]>([]);
  const sim = useRef<((k: SimKind) => void) | null>(null);
  const words = order.map((id) => SAMPLE_WORDS.find((w) => w.id === id)!);
  const w = words[index];
  const seed: PastSlip[] = [
    { word: "stopped", pattern: "missed_double" },
    { word: "rabbit", pattern: "missed_double" },
  ];
  const allHistory = useMemo(() => [...(seeded ? seed : []), ...history], [seeded, history]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    setDone((d) => (current ? [...d.filter((e) => e.word.id !== current.word.id), current] : d));
    setIndex((i) => (i + 1) % order.length);
    setRun((r) => r + 1);
  }, [current, order.length]);
  const pick = (k: number) => {
    if (current && current.attempts.length) setDone((d) => [...d.filter((e) => e.word.id !== current.word.id), current]);
    setIndex(k);
    setRun((r) => r + 1);
    setView("child");
  };
  const reset = () => {
    stopSaying();
    setDone([]);
    setHistory([]);
    setIndex(0);
    setRun((r) => r + 1);
    setOrder(SAMPLE_WORDS.map((x) => x.id));
  };

  return (
    <div className="proto">
      <div className="phone" data-testid="phone">
        <div className="phone-bar">
          <button type="button" className={view === "child" ? "on" : ""} onClick={() => setView("child")}>
            Spelling
          </button>
          <button type="button" className={view === "grown-up" ? "on" : ""} onClick={() => setView("grown-up")} data-testid="tab-grown-up">
            Grown-up view
          </button>
        </div>
        <div className="phone-screen">
          {view === "child" ? (
            <WordScreen
              key={`${w.id}:${run}`}
              w={w}
              index={index}
              total={words.length}
              history={allHistory}
              settings={settings}
              paused={paused}
              onEvidence={setCurrent}
              onSlips={(s) => setHistory((h) => [...h, ...s])}
              onNext={next}
              bindSim={(f) => (sim.current = f)}
            />
          ) : (
            <GrownUp done={current && current.attempts.length ? [...done.filter((e) => e.word.id !== current.word.id), current] : done} slipsSeen={allHistory} settings={settings} setSettings={setSettings} />
          )}
        </div>
      </div>

      <aside className="controls" aria-label="Demo controls">
        <section>
          <h3>Word</h3>
          <div className="chips">
            {words.map((x, k) => (
              <button type="button" key={x.id} className={k === index ? "chip on" : "chip"} onClick={() => pick(k)} data-testid={`word-${x.word}`}>
                {x.word}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h3>Simulate the keyboard</h3>
          <div className="chips">
            <button type="button" className="chip" onClick={() => sim.current?.("compose")} data-testid="sim-compose">
              Android typing (composition)
            </button>
            <button type="button" className="chip" onClick={() => sim.current?.("suggestion")} data-testid="sim-suggestion">
              Tap a word suggestion
            </button>
            <button type="button" className="chip" onClick={() => sim.current?.("autocorrect")} data-testid="sim-autocorrect">
              Autocorrect
            </button>
            <button type="button" className="chip" onClick={() => sim.current?.("paste")} data-testid="sim-paste">
              Paste the word
            </button>
          </div>
        </section>
        <section>
          <h3>Timer</h3>
          <div className="chips">
            {[1, 4].map((s) => (
              <button type="button" key={s} className={settings.speed === s ? "chip on" : "chip"} onClick={() => setSettings({ ...settings, speed: s })} data-testid={`speed-${s}`}>
                {s === 1 ? "Real time" : "4× faster"}
              </button>
            ))}
            <button type="button" className={paused ? "chip on" : "chip"} onClick={() => setPaused(!paused)} data-testid="pause">
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        </section>
        <section>
          <h3>Learner history</h3>
          <label className="check">
            <input type="checkbox" id="seed" checked={seeded} onChange={(e) => setSeeded(e.target.checked)} data-testid="seed" />
            <span>Earlier slips: “stoped”, “rabit”</span>
          </label>
          <p className="small">With these, “prefered” gets targeted help; without, ordinary left-to-right help.</p>
          <button type="button" className="chip" onClick={reset}>
            Start again
          </button>
        </section>
        <section className="ev">
          <h3>What OpenPath records for this word</h3>
          <pre data-testid="evidence">{current ? JSON.stringify(current, null, 1) : ""}</pre>
        </section>
      </aside>
    </div>
  );
}

const mount = document.getElementById("prototype");
if (mount) createRoot(mount).render(<App />);
