/**
 * Write your own, at the end of a Grammar sitting: one sentence of the learner's own that uses a rule just practised,
 * checked by rule (grammar-use/write-own.ts). A second try, then an example. The sentence itself is never stored.
 */
import { useEffect, useState } from "react";
import { markOwn, type OwnMark, type OwnPrompt } from "../logic/grammar-use/write-own.ts";
import { loadDictionary, type Dictionary } from "../logic/writing/dictionary.ts";

export function WriteOwn({ prompt, onDone }: { prompt: OwnPrompt; onDone: (correct: boolean, tries: number) => void }) {
  const [text, setText] = useState("");
  const [tries, setTries] = useState(0);
  const [mark, setMark] = useState<OwnMark | null>(null);
  const [dict, setDict] = useState<Dictionary | null>(null);
  useEffect(() => {
    void loadDictionary().then(setDict).catch(() => undefined);
  }, []);
  const finished = !!mark && (mark.ok || tries >= 2);
  const check = () => {
    const m = markOwn(prompt, text, dict);
    const n = tries + 1;
    setTries(n);
    setMark(m);
    if (m.ok || n >= 2) onDone(m.ok, n);
  };
  return (
    <section className="write-own" aria-labelledby="write-own-title" data-topic={prompt.topic} data-state={finished ? (mark!.ok ? "right" : "shown") : mark ? "again" : "ask"}>
      <h2 id="write-own-title">Write your own</h2>
      <label htmlFor="write-own-text">{prompt.prompt}</label>
      <textarea id="write-own-text" rows={2} value={text} disabled={finished} onChange={(e) => (setText(e.target.value), mark && !finished && setMark(null))} placeholder="Write one sentence." />
      {!mark && (
        <button type="button" className="primary" disabled={!text.trim()} onClick={check}>
          Check my sentence
        </button>
      )}
      {mark && (
        <div className="dict-feedback" role="status" data-correct={mark.ok}>
          <p className={mark.ok ? "words-verdict right" : "words-verdict"}>{mark.ok ? "✓ Well done: your sentence uses the rule" : finished ? "Here is one way" : "Not yet"}</p>
          {!mark.ok && (
            <ul className="small">
              {mark.rule && <li>{prompt.hint}</li>}
              {!mark.form.capital && <li>Start with a capital letter.</li>}
              {!mark.form.end && <li>End with a full stop, a question mark or an exclamation mark.</li>}
              {!mark.form.long && <li>Write a whole sentence of at least four words.</li>}
              {mark.slips.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {finished && !mark.ok && <p className="dict-reveal">{prompt.example}</p>}
          {!finished && (
            <button type="button" className="primary" onClick={check} disabled={!text.trim()}>
              Check again
            </button>
          )}
        </div>
      )}
    </section>
  );
}
