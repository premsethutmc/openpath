/**
 * Grammar in use (logic/grammar-use): fix the wrong word in a sentence, or build a sentence from word tiles. The
 * right sentence and a one-line rule follow every answer. Practice-only.
 */
import { dueTopics, masterySummary } from "../logic/grammar-use/mastery.ts";
import { WriteOwn } from "./WriteOwn.tsx";
import { ownFor } from "../logic/grammar-use/write-own.ts";
import { Flag } from "./Flag.tsx";
import { TextPics } from "./Pic.tsx";
import { useRef, useState } from "react";
import { GRAMMAR, GrammarSitting, grammarSummary, levelFor, startLevel, type FixFeedback, type GrammarRecord, type GrammarUse as Content, type GrammarView } from "../logic/grammar-use/grammar-use.ts";
import type { Learner } from "../logic/learner.ts";
import { NoteBox } from "./Note.tsx";

const levelName = (c: Content, id: number) => c.levels.find((l) => l.id === id)?.name ?? "";

export function GrammarIntro({ level, levelLabel, topics, done, mastery, onStart, onBack, child }: { child?: boolean; level: number; levelLabel: string; topics: string[]; done: { answered: number; right: number }; mastery?: { mastered: number; learnt: number; learning: number; due: number }; onStart: () => void; onBack: () => void }) {
  return (
    <main className="page vocab grammar" data-phase="intro" aria-labelledby="grammar-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Grammar</p>
      <h1 id="grammar-title" className="hero">
        Fix it or build it
      </h1>
      <p className="sub">Some sentences have one wrong word: tap it and type the right one. Others come as word tiles: put them in order. Each answer shows the rule.</p>
      {topics.length ? (
        <p className="pill">Topics: {topics.join(", ")}</p>
      ) : child ? null : (
        <p className="pill">
          Level {level}: {levelLabel}
        </p>
      )}
      {done.answered > 0 && (
        <p className="small">
          So far: {done.right} of {done.answered} sentences right.
          {mastery && mastery.mastered + mastery.learnt + mastery.learning > 0 && (
            <span data-mastery>
              {" "}
              Topics: {mastery.mastered} mastered, {mastery.learnt} learnt and coming back for review, {mastery.learning} being learnt.
              {mastery.due > 0 && !topics.length ? ` ${mastery.due} due for review today: they come first.` : ""}
            </span>
          )}
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
export const spotTask = (ask: string) => (ask === "object" ? "Tap the object of the verb in this sentence." : ask === "subject" ? "Tap any word of the subject of this sentence." : ask === "main clause" ? "Tap any word of the main clause." : ask === "predicate" ? "Tap any word of the predicate." : `Tap ${/^[aeiou]/.test(ask) ? "an" : "a"} ${ask} in this sentence.`);

/** Write a sentence out again with its mistakes put right; the box starts with the sentence, to edit. */
function Rewrite({ sentence, onCheck }: { sentence: string; onCheck: (typed: string) => void }) {
  const [text, setText] = useState(sentence);
  return (
    <>
      <p className="small" id="grammar-task">
        Write this sentence again, with its mistakes put right.
      </p>
      <p className="grammar-quote">
        <TextPics text={sentence} />
      </p>
      <textarea className="grammar-rewrite" aria-labelledby="grammar-task" rows={3} value={text} spellCheck={false} autoCapitalize="off" autoCorrect="off" onChange={(e) => setText(e.target.value)} />
      <button type="button" className="primary" disabled={!text.trim()} onClick={() => onCheck(text)}>
        Check
      </button>
    </>
  );
}

/** The rule said another, plainer way, for a learner who keeps missing it. */
function Simple({ simple }: { simple: { say: string; example: string } }) {
  return (
    <div className="grammar-simple" aria-label="Another way to see it">
      <p>
        <strong>Another way to see it</strong>
      </p>
      <p>{simple.say}</p>
      <p className="small">
        <TextPics text={simple.example} />
      </p>
    </div>
  );
}

/** Pick one answer to a question about a sentence. */
function Choose({ sentence, question, options, onCheck }: { sentence: string; question: string; options: string[]; onCheck: (chosen: number) => void }) {
  return (
    <>
      <p className="grammar-quote"><TextPics text={sentence} /></p>
      <p className="small" id="grammar-task">
        {question}
      </p>
      <div className="grammar-choices" role="group" aria-labelledby="grammar-task">
        {options.map((o, i) => (
          <button key={i} type="button" className="secondary grammar-choice" data-choice={o} onClick={() => onCheck(i)}>
            <TextPics text={o} />
          </button>
        ))}
      </div>
    </>
  );
}

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
          <button key={t} type="button" className="grammar-tile placed" data-tile={tiles[t]} onClick={() => setChosen(chosen.filter((x) => x !== t))}>
            <TextPics text={tiles[t]} />
          </button>
        ))}
      </p>
      <p className="grammar-pool" role="group" aria-labelledby="grammar-task">
        {tiles.map((w, i) =>
          chosen.includes(i) ? null : (
            <button key={i} type="button" className="grammar-tile" data-tile={w} onClick={() => setChosen([...chosen, i])}>
              <TextPics text={w} />
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

/** The card before a topic's first sentence: the rule, two examples, one question to try (not scored). */
function Learn({ topic, card, onTry, onLearned }: { topic: string; card: NonNullable<GrammarView["learn"]>; onTry: (chosen: number) => void; onLearned: () => void }) {
  const t = card.tried;
  // the second question is for the learner alone: answered here, not recorded
  const [second, setSecond] = useState<number | null>(null);
  const s2 = card.second;
  return (
    <section className="grammar-learn" aria-labelledby="grammar-learn-title">
      <h2 id="grammar-learn-title">{card.simple ? "Again" : "New"}: {topic}</h2>
      {card.simple && <Simple simple={card.simple} />}
      <p className="grammar-rule">{card.rule}</p>
      <ul className="grammar-examples">
        {card.examples.map((e) => (
          <li key={e}>
            <TextPics text={e} />
          </li>
        ))}
      </ul>
      <div className="grammar-mistake" aria-label="A common mistake">
        <p>
          <span className="mistake-wrong" aria-label="Not this">
            ✗
          </span>{" "}
          <TextPics text={card.mistake.wrong} />
        </p>
        <p>
          <span className="mistake-right" aria-label="This">
            ✓
          </span>{" "}
          <TextPics text={card.mistake.right} />
        </p>
        <p className="small">{card.mistake.why}</p>
      </div>
      <p id="grammar-try">
        <strong>Try one:</strong> {card.question}
      </p>
      <p className="choose-options" role="group" aria-labelledby="grammar-try">
        {card.options.map((o, i) => (
          <button key={o} type="button" className="choice" disabled={!!t} data-state={t ? (i === t.answer ? "right" : i === t.chosen ? "wrong" : "") : ""} onClick={() => onTry(i)}>
            <TextPics text={o} />
          </button>
        ))}
      </p>
      {t && (
        <p className={t.right ? "words-verdict right" : "words-verdict"} role="status">
          {t.right ? "✓ Right" : `The answer is “${card.options[t.answer]}”.`}
        </p>
      )}
      {t && (
        <>
          <p id="grammar-try2">
            <strong>One more:</strong> {s2.question}
          </p>
          <p className="choose-options" role="group" aria-labelledby="grammar-try2">
            {s2.options.map((o, i) => (
              <button key={o} type="button" className="choice" data-try="2" disabled={second !== null} data-state={second !== null ? (i === s2.answer ? "right" : i === second ? "wrong" : "") : ""} onClick={() => setSecond(i)}>
                <TextPics text={o} />
              </button>
            ))}
          </p>
          {second !== null && (
            <p className={second === s2.answer ? "words-verdict right" : "words-verdict"} role="status">
              {second === s2.answer ? "✓ Right" : `The answer is “${s2.options[s2.answer]}”.`}
            </p>
          )}
        </>
      )}
      <button type="button" className={t && second !== null ? "primary" : "link"} onClick={onLearned}>
        {t && second !== null ? "Now practise" : "Skip to practice"}
      </button>
    </section>
  );
}

const edges = (w: string) => {
  const m = /^([^A-Za-z']*)(.*?)([^A-Za-z']*)$/.exec(w)!;
  return { before: m[1], core: m[2], after: m[3] };
};

/** A fix answer: what the learner wrote (their change marked), then the right sentence (the wrong word struck out and the right one in its place). */
function FixResult({ fix, correct }: { fix: FixFeedback; correct: boolean }) {
  const theirs = fix.words.map((w, i) => {
    if (i !== fix.tapped) return <span key={i}>{w} </span>;
    const e = edges(w);
    return (
      <span key={i}>
        {e.before}
        <s className="gfb-old">{e.core}</s> <mark className="gfb-mine">{fix.typed}</mark>
        {e.after}{" "}
      </span>
    );
  });
  const right = fix.words.map((w, i) => {
    if (i !== fix.wrong) return <span key={i}>{w} </span>;
    const e = edges(w);
    const r = edges(fix.fixed);
    return (
      <span key={i}>
        {e.before}
        {!correct && <s className="gfb-old">{e.core}</s>}
        {!correct && " "}
        <mark className="gfb-right">{r.core}</mark>
        {r.after}{" "}
      </span>
    );
  });
  if (correct)
    return (
      <p className="gfb-sentence" data-row="right">
        {right}
      </p>
    );
  const missed = fix.tapped !== fix.wrong;
  return (
    <>
      <div className="gfb-row" data-row="yours">
        <p className="gfb-label">You wrote</p>
        <p className="gfb-sentence">{theirs}</p>
      </div>
      {missed && (
        <p className="gfb-hint">
          “{edges(fix.words[fix.tapped]).core}” was fine. The word to change was “{edges(fix.words[fix.wrong]).core}”.
        </p>
      )}
      <div className="gfb-row" data-row="right">
        <p className="gfb-label">Right</p>
        <p className="gfb-sentence">{right}</p>
      </div>
    </>
  );
}

/** Any other kind of answer: the learner's answer when it was wrong, then the right one. */
function OtherResult({ given, right, correct }: { given: string; right: string; correct: boolean }) {
  return (
    <>
      {!correct && given && (
        <div className="gfb-row" data-row="yours">
          <p className="gfb-label">Your answer</p>
          <p className="gfb-sentence gfb-dim">
            <TextPics text={given} />
          </p>
        </div>
      )}
      <div className="gfb-row" data-row="right">
        {!correct && <p className="gfb-label">Right</p>}
        <p className="gfb-sentence">
          <TextPics text={right} />
        </p>
      </div>
    </>
  );
}

export function GrammarUseView({ child, content, view, onRewrite, onFix, onBuild, onSpot, onChoose, onNext, onLeave, onAgain, onTry, onLearned, onOwn }: { child?: boolean; onRewrite: (typed: string) => void; onOwn?: (r: GrammarRecord) => void; onTry: (chosen: number) => void; onLearned: () => void; content: Content; view: GrammarView; onFix: (tapped: number, typed: string) => void; onBuild: (chosen: string[]) => void; onSpot: (tapped: number) => void; onChoose: (chosen: number) => void; onNext: () => void; onLeave: () => void; onAgain: () => void }) {
  if (view.phase === "done") {
    const d = view.done!;
    const own = onOwn ? ownFor(d.topics) : null;
    return (
      <main className="page vocab grammar" data-phase="done">
        <p className="eyebrow">Grammar</p>
        <h1 className="hero">
          {d.right} of {d.asked} right
        </h1>
        {d.weak.length > 0 && (
          <p className="sub">
            To look at again: <strong>{d.weak.join(", ")}</strong>
          </p>
        )}
        <p className="small">
          {child ? (d.nextLevel > view.level ? "Next time: a little harder." : d.nextLevel < view.level ? "Next time: a little easier, to build up again." : "Sentences you missed will come back another day.") : d.nextLevel > view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}.` : d.nextLevel < view.level ? `Next time: level ${d.nextLevel}, ${levelName(content, d.nextLevel).toLowerCase()}, to build up again.` : "Sentences you missed will come back another day."}
        </p>
        {own && <WriteOwn key={`${d.sitting}|${own.topic}`} prompt={own} onDone={(correct, tries) => onOwn?.({ type: "own", sitting: d.sitting, topic: own.topic, correct, tries })} />}
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
    <main className="page vocab grammar" data-phase={view.phase} data-item={view.id ?? ""} data-kind={view.fix ? "fix" : view.build ? "build" : view.spot ? "spot" : view.choose ? "choose" : view.rewrite ? "rewrite" : ""}>
      <button type="button" className="link" onClick={onLeave}>
        ← Stop
      </button>
      <p className="pill">
        Sentence {view.index + 1} of {view.total} · {view.topic}
      </p>
      {view.phase === "learn" && view.learn && <Learn topic={view.topic ?? ""} card={view.learn} onTry={onTry} onLearned={onLearned} />}
      {view.phase === "ask" && view.fix && <Fix key={view.id} words={view.fix.words} onCheck={onFix} />}
      {view.phase === "ask" && view.build && <Build key={view.id} tiles={view.build.tiles} whole={view.build.whole} task={view.build.task} onCheck={onBuild} />}
      {view.phase === "ask" && view.choose && <Choose key={view.id} sentence={view.choose.sentence} question={view.choose.question} options={view.choose.options} onCheck={onChoose} />}
      {view.phase === "ask" && view.rewrite && <Rewrite key={view.id} sentence={view.rewrite.sentence} onCheck={onRewrite} />}
      {view.phase === "ask" && view.spot && <Spot key={view.id} words={view.spot.words} task={spotTask(view.spot.ask)} onCheck={onSpot} />}
      {f && (
        <section className="gfb" role="status" data-correct={f.correct} aria-label={f.correct ? "Right" : "Not quite"}>
          <p className="gfb-verdict">
            <span className="gfb-mark" aria-hidden="true">
              {f.correct ? "✓" : "✗"}
            </span>
            {f.correct ? "Right!" : "Not quite"}
          </p>
          {f.fix ? <FixResult fix={f.fix} correct={f.correct} /> : <OtherResult given={f.given} right={f.right} correct={f.correct} />}
          <div className="gfb-why">
            <p className="gfb-label">Why</p>
            <p>{f.rule}</p>
          </div>
          {f.simple && <Simple simple={f.simple} />}
          <button type="button" className="primary" autoFocus onClick={onNext}>
            {view.index + 1 < view.total ? "Next sentence" : "Finish"}
          </button>
          <div className="gfb-flag">
            <Flag stream="grammar" id={view.id ?? ""} />
          </div>
        </section>
      )}
    </main>
  );
}

export function GrammarUse({ learner, topics, onLeave, onChanged }: { learner: Learner; topics?: string[]; onLeave: () => void; onChanged: () => void }) {
  const [sitting, setSitting] = useState<GrammarSitting | null>(null);
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<GrammarRecord[]>([]);
  const level = () => levelFor(GRAMMAR, learner.grammarRecords(), learner.levels().grammar?.level ?? startLevel(learner.state.preferences));
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
    // grammar-mastery@1: a level sitting starts with the topics due for review
    const s = new GrammarSitting(GRAMMAR, level(), learner.grammarRecords(), topics, topics?.length ? [] : dueTopics(learner.grammarTimed(), learner.clock()));
    setSitting(s);
    scrollTo(0, 0);
    void step(s);
  };
  if (!sitting) {
    const done = grammarSummary(GRAMMAR, learner.grammarRecords());
    return <GrammarIntro level={level()} levelLabel={levelName(GRAMMAR, level())} topics={(topics ?? []).map((t) => GRAMMAR.topics.find((x) => x.id === t)?.name ?? t)} done={done} mastery={masterySummary(learner.grammarTimed(), learner.clock())} onStart={begin} onBack={onLeave} child={!!learner.state.preferences?.school} />;
  }
  const view = sitting.snapshot();
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; your next answer will try again.
        </p>
      )}
      <GrammarUseView child={!!learner.state.preferences?.school} content={GRAMMAR} view={view} onLeave={onLeave} onAgain={begin} onFix={(i, t) => void step(sitting, () => sitting.fix(i, t))} onRewrite={(t) => void step(sitting, () => sitting.rewrite(t))} onBuild={(c) => void step(sitting, () => sitting.build(c))} onSpot={(i) => void step(sitting, () => sitting.spot(i))} onTry={(i) => void step(sitting, () => sitting.tryCard(i))} onLearned={() => void step(sitting, () => sitting.learned())} onChoose={(i) => void step(sitting, () => sitting.choose(i))} onNext={() => void step(sitting, () => sitting.next())} onOwn={(r) => void learner.recordGrammar([r]).then(onChanged).catch(() => undefined)} />
      {view.phase === "done" && (
        <div className="page vocab-note">
          <NoteBox learner={learner} screen="grammar-use:done" label="Was any sentence marked unfairly, or any rule unclear?" />
        </div>
      )}
    </>
  );
}
