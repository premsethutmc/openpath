/**
 * Grammar in use (logic/grammar-use): fix the wrong word in a sentence, or build a sentence from word tiles. The
 * right sentence and a one-line rule follow every answer. Practice-only.
 */
import { useRef, useState } from "react";
import { GRAMMAR, GrammarSitting, grammarSummary, levelFor, startLevel, type GrammarRecord, type GrammarUse as Content, type GrammarView } from "../logic/grammar-use/grammar-use.ts";
import type { Learner } from "../logic/learner.ts";
import { NoteBox } from "./Note.tsx";

const levelName = (c: Content, id: number) => c.levels.find((l) => l.id === id)?.name ?? "";

export function GrammarIntro({ level, levelLabel, topics, done, onStart, onBack }: { level: number; levelLabel: string; topics: string[]; done: { answered: number; right: number }; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab grammar" data-phase="intro" aria-labelledby="grammar-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Grammar in use</p>
      <h1 id="grammar-title" className="hero">
        Fix it or build it
      </h1>
      <p className="sub">Some sentences have one wrong word: tap it and type the right one. Others come as word tiles: put them in order. Each answer shows the rule.</p>
      {topics.length ? (
        <p className="pill">Topics: {topics.join(", ")}</p>
      ) : (
        <p className="pill">
          Level {level}: {levelLabel}
        </p>
      )}
      {done.answered > 0 && (
        <p className="small">
          So far: {done.right} of {done.answered} sentences right.
        </p>
      )}
      <button type="button" className="primary" onClick={onStart}>
        Start
      </button>
    </main>
  );
}

function Fix({ words, onCheck }: { words: string[]; onCheck: (tapped: number, typed: string) => void }) {
  const [tapped, setTapped] = useState<number | null>(null);
  const [text, setText] = useState("");
  return (
    <>
      <p className="small" id="grammar-task">
        One word is wrong. Tap it.
      </p>
      <p className="grammar-words" role="group" aria-labelledby="grammar-task">
        {words.map((w, i) => (
          <button key={i} type="button" className={i === tapped ? "grammar-word picked" : "grammar-word"} aria-pressed={i === tapped} onClick={() => setTapped(i)}>
            {w}
          </button>
        ))}
      </p>
      {tapped !== null && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onCheck(tapped, text);
          }}
        >
          <label htmlFor="grammar-box" className="small">
            Type the right word in place of “{words[tapped].replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")}”
          </label>
          <input id="grammar-box" type="text" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" autoFocus />
          <button type="submit" className="primary" disabled={!text.trim()}>
            Check
          </button>
        </form>
      )}
    </>
  );
}

/** Find a word of a kind: tap it, then check. Used in a sitting and in Find my level. */
export function Spot({ words, task, button = "Check", onCheck }: { words: string[]; task: string; button?: string; onCheck: (tapped: number) => void }) {
  const [tapped, setTapped] = useState<number | null>(null);
  return (
    <>
      <p className="small" id="grammar-task">
        {task}
      </p>
      <p className="grammar-words" role="group" aria-labelledby="grammar-task">
        {words.map((w, i) => (
          <button key={i} type="button" className={i === tapped ? "grammar-word picked" : "grammar-word"} aria-pressed={i === tapped} onClick={() => setTapped(i)}>
            {w}
          </button>
        ))}
      </p>
      <button type="button" className="primary" disabled={tapped === null} onClick={() => tapped !== null && onCheck(tapped)}>
        {button}
      </button>
    </>
  );
}
export const spotTask = (ask: string) => (ask === "object" ? "Tap the object of the verb in this sentence." : ask === "subject" ? "Tap any word of the subject of this sentence." : `Tap ${/^[aeiou]/.test(ask) ? "an" : "a"} ${ask} in this sentence.`);

function Build({ tiles, whole, task, onCheck }: { tiles: string[]; whole: boolean; task: string | null; onCheck: (chosen: string[]) => void }) {
  const [chosen, setChosen] = useState<number[]>([]);
  return (
    <>
      <p className="small" id="grammar-task">
        {task ? `${task} Tap one in your answer to take it back.` : whole ? "Tap the sentences in the order in which things happen. Tap one in your answer to take it back." : "Tap the words in order to build the sentence. Tap a word in your sentence to take it back. Not every word may be needed."}
      </p>
      <p className="grammar-line" aria-label="Your sentence" data-empty={chosen.length === 0}>
        {chosen.length === 0 && <span className="small">Your sentence appears here.</span>}
        {chosen.map((t) => (
          <button key={t} type="button" className="grammar-tile placed" onClick={() => setChosen(chosen.filter((x) => x !== t))}>
            {tiles[t]}
          </button>
        ))}
      </p>
      <p className="grammar-pool" role="group" aria-labelledby="grammar-task">
        {tiles.map((w, i) =>
          chosen.includes(i) ? null : (
            <button key={i} type="button" className="grammar-tile" onClick={() => setChosen([...chosen, i])}>
              {w}
            </button>
          ),
        )}
      </p>
      <button type="button" className="primary" disabled={!chosen.length} onClick={() => onCheck(chosen.map((i) => tiles[i]))}>
        Check
      </button>
    </>
  );
}

export function GrammarUseView({ content, view, onFix, onBuild, onSpot, onNext, onLeave, onAgain }: { content: Content; view: GrammarView; onFix: (tapped: number, typed: string) => void; onBuild: (chosen: string[]) => void; onSpot: (tapped: number) => void; onNext: () => void; onLeave: () => void; onAgain: () => void }) {
  if (view.phase === "done") {
    const d = view.done!;
    return (
      <main className="page vocab grammar" data-phase="done">
        <p className="eyebrow">Grammar in use</p>
        <h1 className="hero">
          {d.right} of {d.asked} right
        </h1>
        {d.weak.length > 0 && (
          <p className="sub">
            To look at again: <strong>{d.weak.join(", ")}</strong>
          </p>
        )}
        <p className="small">
          {d.nextLevel > view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}.` : d.nextLevel < view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}, to build up again.` : "Sentences you missed will come back another day."}
        </p>
        <button type="button" className="primary" onClick={onLeave}>
          Done
        </button>
        <button type="button" className="secondary" onClick={onAgain}>
          Eight more
        </button>
      </main>
    );
  }
  const f = view.feedback;
  return (
    <main className="page vocab grammar" data-phase={view.phase} data-item={view.id ?? ""} data-kind={view.fix ? "fix" : view.build ? "build" : view.spot ? "spot" : ""}>
      <button type="button" className="link" onClick={onLeave}>
        ← Stop
      </button>
      <p className="pill">
        Sentence {view.index + 1} of {view.total} · {view.topic}
      </p>
      {view.phase === "ask" && view.fix && <Fix key={view.id} words={view.fix.words} onCheck={onFix} />}
      {view.phase === "ask" && view.build && <Build key={view.id} tiles={view.build.tiles} whole={view.build.whole} task={view.build.task} onCheck={onBuild} />}
      {view.phase === "ask" && view.spot && <Spot key={view.id} words={view.spot.words} task={spotTask(view.spot.ask)} onCheck={onSpot} />}
      {f && (
        <div className="dict-feedback" role="status" data-correct={f.correct}>
          <p className={f.correct ? "words-verdict right" : "words-verdict"}>{f.correct ? "✓ Right" : "Not quite"}</p>
          {!f.correct && (
            <p className="small">
              {f.wrongWord ? `The wrong word was “${f.wrongWord.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")}”. ` : ""}You gave: {f.given}
            </p>
          )}
          <p className="dict-reveal">{f.right}</p>
          <p className="grammar-rule">{f.rule}</p>
          <button type="button" className="primary" autoFocus onClick={onNext}>
            {view.index + 1 < view.total ? "Next sentence" : "Finish"}
          </button>
        </div>
      )}
    </main>
  );
}

export function GrammarUse({ learner, topics, onLeave, onChanged }: { learner: Learner; topics?: string[]; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<GrammarSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<GrammarRecord[]>([]);
  const level = () => levelFor(GRAMMAR, learner.grammarRecords(), learner.levels().grammar?.level ?? startLevel(learner.state.preferences?.band));
  const step = async (s: GrammarSitting, act?: () => void) => {
    act?.();
    unsaved.current.push(...s.take());
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await learner.recordGrammar([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const begin = () => {
    const s = new GrammarSitting(GRAMMAR, level(), learner.grammarRecords(), topics);
    setSitting(s);
    scrollTo(0, 0);
    void step(s);
  };
  if (!sitting) {
    const done = grammarSummary(GRAMMAR, learner.grammarRecords());
    return <GrammarIntro level={level()} levelLabel={levelName(GRAMMAR, level())} topics={(topics ?? []).map((t) => GRAMMAR.topics.find((x) => x.id === t)?.name ?? t)} done={done} onStart={begin} onBack={onLeave} />;
  }
  const view = sitting.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <GrammarUseView content={GRAMMAR} view={view} onLeave={onLeave} onAgain={begin} onFix={(i, t) => void step(sitting, () => sitting.fix(i, t))} onBuild={(c) => void step(sitting, () => sitting.build(c))} onSpot={(i) => void step(sitting, () => sitting.spot(i))} onNext={() => void step(sitting, () => sitting.next())} />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="grammar-use:done" label="Was any sentence marked unfairly, or any rule unclear?" />
        </div>
      )}
    </>
  );
}
