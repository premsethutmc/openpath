import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Item, Passage, Response } from "../../../../packages/english-core/src/index.ts";
import { speak } from "./speech.ts";

interface Props {
  item: Item;
  passage?: Passage;
  voice: SpeechSynthesisVoice | null;
  locked: boolean;
  onSubmit: (r: Response) => void;
  /** Dictation: who says the word (the device, or an adult reading it aloud). */
  delivery?: "device_voice" | "adult_reader";
}

/** One question, in whichever format it uses. Typed answers never get autocorrect or spellcheck. */
export function ItemView({ item, passage, voice, locked, onSubmit, delivery }: Props) {
  if (item.kind !== "code") return null;
  const kind = item.format.split(":")[0];
  if (item.format === "typed:dictation")
    return (
      <div className="item dictation" data-format={item.format} data-item={item.id}>
        <Prompt text={item.prompt} />
        <Dictation key={item.id} word={item.speak ?? ""} sentence={(item as { sentence?: string }).sentence} voice={voice} delivery={delivery ?? "device_voice"} locked={locked} onSubmit={onSubmit} />
      </div>
    );
  return (
    <div className="item" data-format={item.format} data-item={item.id}>
      {passage && (
        <details className="passage" open>
          <summary>Read: {passage.title}</summary>
          {passage.text.split(/\n+/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </details>
      )}
      <Prompt text={item.prompt} />
      {kind === "typed" && <Typed key={item.id} speakText={item.speak} voice={voice} locked={locked} onSubmit={onSubmit} />}
      {kind === "choice" && <Choice key={item.id} options={item.options!} locked={locked} onSubmit={onSubmit} />}
      {kind === "multi" && <Multi key={item.id} options={item.options!} locked={locked} onSubmit={onSubmit} />}
      {kind === "order" && <Order key={item.id} options={item.options!} locked={locked} onSubmit={onSubmit} />}
      {kind === "match" && <Match key={item.id} left={item.left!} options={item.options!} locked={locked} onSubmit={onSubmit} />}
    </div>
  );
}

function Prompt({ text }: { text: string }) {
  const parts = text.split(/(___+)/);
  return (
    <p className="prompt" id="prompt">
      {parts.map((p, i) => (/^_+$/.test(p) ? <span key={i} className="gap" aria-label="blank" /> : <span key={i}>{p}</span>))}
    </p>
  );
}

function Typed({ speakText, voice, locked, onSubmit, submitLabel = "Check", answerLabel = "Your answer" }: { speakText?: string; voice: SpeechSynthesisVoice | null; locked: boolean; onSubmit: (r: Response) => void; submitLabel?: string; answerLabel?: string }) {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (speakText) speak(speakText, voice);
    input.current?.focus();
  }, [speakText, voice]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !locked) onSubmit({ kind: "typed", text });
  };
  // with the on-screen keyboard open (a phone's screen roughly halves), keep the answer box and Check above it: the
  // dictation check's adult panel sits above the box and could otherwise push Check under the keyboard
  const keepInView = () => {
    if (document.activeElement !== input.current) return;
    input.current?.form?.querySelector<HTMLElement>('button[type="submit"]')?.scrollIntoView({ block: "nearest" });
  };
  useEffect(() => {
    const vv = window.visualViewport;
    vv?.addEventListener("resize", keepInView);
    window.addEventListener("resize", keepInView);
    return () => {
      vv?.removeEventListener("resize", keepInView);
      window.removeEventListener("resize", keepInView);
    };
  }, []);
  return (
    <form className="answer" onSubmit={submit}>
      {speakText && (
        <button type="button" className="listen" onClick={() => speak(speakText, voice)} aria-label="Hear the word again">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
            <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Hear it again
        </button>
      )}
      <label className="ruled">
        <span className="sr-only">{answerLabel}</span>
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={locked}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          onFocus={() => setTimeout(keepInView, 300)}
          aria-describedby="prompt"
          name="answer"
        />
      </label>
      <button type="submit" className="primary" disabled={locked || !text.trim()}>
        {submitLabel}
      </button>
    </form>
  );
}

/**
 * Hear the word, then type it. The word and its sentence are only ever spoken (or, for an adult reading aloud,
 * shown to the adult on request and hidden again): never displayed to the learner before the answer is checked.
 */
/** Labels for the dictation controls; the Spelling Bee passes wording that never contains the word being asked. */
export interface DictationLabels {
  play: string;
  repeat: string;
  sentence: string;
  submit: string;
  answer: string;
  adultLead: string;
  adult: string;
  show: string;
}
const DICTATION_LABELS: DictationLabels = {
  play: "Play the word",
  repeat: "Repeat the word",
  sentence: "Hear it in a sentence",
  submit: "Check",
  answer: "Your answer",
  adultLead: "For the adult:",
  adult: "read the word aloud, then the sentence, then the word again. Keep the screen away from the learner while it is shown.",
  show: "Show the word to read aloud",
};

export function Dictation({ word, sentence, say, voice, delivery, locked, onSubmit, onPlay, labels }: { word: string; sentence?: string; say?: string; voice: SpeechSynthesisVoice | null; delivery: "device_voice" | "adult_reader"; locked: boolean; onSubmit: (r: Response) => void; onPlay?: () => void; labels?: Partial<DictationLabels> }) {
  const L = { ...DICTATION_LABELS, ...labels };
  const [plays, setPlays] = useState(0);
  const [adultSees, setAdultSees] = useState(false);
  const playWord = () => {
    speak(word, voice);
    setPlays((n) => n + 1);
    onPlay?.();
  };
  useEffect(() => {
    // first time: the word, a sentence with it, the word again (a sentence settles words that sound like others)
    if (delivery === "device_voice" && voice) {
      speak(sentence ? `${word}. ${sentence} ${word}.` : word, voice);
      setPlays(1);
      onPlay?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="dictation-controls">
      {delivery === "device_voice" ? (
        <div className="row listen-row">
          <button type="button" className="listen" onClick={playWord} data-plays={plays}>
            <span aria-hidden="true">{plays ? "🔁" : "▶️"}</span> {plays ? L.repeat : L.play}
          </button>
          {sentence && (
            <button
              type="button"
              className="listen"
              onClick={() => {
                speak(`${word}. ${sentence} ${word}.`, voice);
                onPlay?.();
              }}
            >
              <span aria-hidden="true">💬</span> {L.sentence}
            </button>
          )}
        </div>
      ) : (
        <div className="tile peach adult-reader">
          {!adultSees ? (
            <>
              <p>
                <b>{L.adultLead}</b> {L.adult}
              </p>
              <button type="button" className="secondary" onClick={() => setAdultSees(true)}>
                {L.show}
              </button>
            </>
          ) : (
            <>
              <p className="adult-word">
                Say: <b>{word}</b>
                {say && <span className="small"> ({say})</span>}
              </p>
              {sentence && <p>Sentence: “{sentence}”</p>}
              <button type="button" className="primary" onClick={() => setAdultSees(false)}>
                Hide it: the learner types now
              </button>
            </>
          )}
        </div>
      )}
      {!adultSees && <Typed voice={voice} locked={locked} onSubmit={onSubmit} submitLabel={L.submit} answerLabel={L.answer} />}
    </div>
  );
}

function Choice({ options, locked, onSubmit }: { options: string[]; locked: boolean; onSubmit: (r: Response) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="answer">
      <div className="options" role="radiogroup" aria-labelledby="prompt">
        {options.map((o, i) => (
          <button key={i} type="button" role="radio" aria-checked={pick === i} className="option" disabled={locked} onClick={() => setPick(i)}>
            {o}
          </button>
        ))}
      </div>
      <button type="button" className="primary" disabled={locked || pick === null} onClick={() => pick !== null && onSubmit({ kind: "choice", choice: pick })}>
        Check
      </button>
    </div>
  );
}

function Multi({ options, locked, onSubmit }: { options: string[]; locked: boolean; onSubmit: (r: Response) => void }) {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  return (
    <div className="answer">
      <div className="options" role="group" aria-labelledby="prompt">
        {options.map((o, i) => (
          <button key={i} type="button" role="checkbox" aria-checked={picked.includes(i)} className="option" disabled={locked} onClick={() => toggle(i)}>
            {o}
          </button>
        ))}
      </div>
      <button type="button" className="primary" disabled={locked || !picked.length} onClick={() => onSubmit({ kind: "multi", choices: picked })}>
        Check
      </button>
    </div>
  );
}

function Order({ options, locked, onSubmit }: { options: string[]; locked: boolean; onSubmit: (r: Response) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  return (
    <div className="answer">
      <p className="built" aria-live="polite">
        {order.length ? order.map((i) => options[i]).join(" ") : <span className="hint">Tap the parts in order.</span>}
      </p>
      <div className="options chips">
        {options.map((o, i) => (
          <button key={i} type="button" className="option chip" disabled={locked || order.includes(i)} onClick={() => setOrder([...order, i])}>
            {o}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="quiet" disabled={locked || !order.length} onClick={() => setOrder(order.slice(0, -1))}>
          Undo
        </button>
        <button type="button" className="primary" disabled={locked || order.length !== options.length} onClick={() => onSubmit({ kind: "order", order })}>
          Check
        </button>
      </div>
    </div>
  );
}

function Match({ left, options, locked, onSubmit }: { left: string[]; options: string[]; locked: boolean; onSubmit: (r: Response) => void }) {
  const [pairs, setPairs] = useState<(number | null)[]>(left.map(() => null));
  return (
    <div className="answer">
      <div className="match">
        {left.map((l, i) => (
          <label key={i} className="pair">
            <span>{l}</span>
            <select
              value={pairs[i] ?? ""}
              disabled={locked}
              onChange={(e) => setPairs(pairs.map((p, k) => (k === i ? (e.target.value === "" ? null : Number(e.target.value)) : p)))}
            >
              <option value="">Choose…</option>
              {options.map((o, k) => (
                <option key={k} value={k}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button type="button" className="primary" disabled={locked || pairs.some((p) => p === null)} onClick={() => onSubmit({ kind: "match", pairs: pairs as number[] })}>
        Check
      </button>
    </div>
  );
}
