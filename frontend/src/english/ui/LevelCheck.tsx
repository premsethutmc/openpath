/**
 * Find my level (logic/streams/level-check.ts): words, reading, then listening, each short and adaptive, ending in a
 * level for each stream and where to start. Any part can be skipped. Practice-only.
 */
import { useRef, useState } from "react";
import { GRAMMAR } from "../logic/grammar-use/grammar-use.ts";
import { isBeginner } from "../logic/first/first.ts";
import { Spot, spotTask } from "./GrammarUse.tsx";
import { DICTATION, wordsOf } from "../logic/dictation/dictation.ts";
import { BANK, LEVEL_NAMES } from "../logic/spelling.ts";
import type { Learner } from "../logic/learner.ts";
import { COURSE } from "../logic/reading/course.ts";
import { GrammarPlacement, LISTENING_STEPS, ListeningPlacement, MIDDLE, PARTS, QUICK, READING_TEXTS, ReadingPlacement, SPELLING_STEPS, SpellingPlacement, startFromWords, type GrammarPlacementView, type LevelCheckRecord, type Levels, type Mode, type Part, type ReadingPlacementView } from "../logic/streams/level-check.ts";
import { BANDS } from "../logic/vocabulary/daily-words.ts";
import { ABOUT, CHECK, CHECK_VERSION, SizeCheckSession, levelLine, startBand, type CheckItem } from "../logic/vocabulary/size-check.ts";
import { WordQuestion } from "./VocabularyCheck.tsx";
import { slowText } from "./ListenWrite.tsx";
import { syncAutoLists } from "../logic/streams/joined.ts";
import { VocabularyStretch } from "./VocabularyStretch.tsx";
import { NoteBox } from "./Note.tsx";
import { speechPossible } from "./speech.ts";
import { playWord, stopWord, type PlayOutcome } from "./wordPlayer.ts";

const PART_NAME: Record<Part, string> = { words: "Words", reading: "Reading", listening: "Listening", spelling: "Spelling", grammar: "Grammar" };

function PartHead({ part, onSkip, onStop }: { part: Part; onSkip: () => void; onStop: () => void }) {
  return (
    <div className="level-head">
      <button type="button" className="link" onClick={onStop}>
        ← Stop
      </button>
      <p className="pill">
        Part {PARTS.indexOf(part) + 1} of {PARTS.length}: {PART_NAME[part]}
      </p>
      <button type="button" className="link level-skip" onClick={onSkip}>
        Skip this part
      </button>
    </div>
  );
}

export function LevelIntro({ again, onStart, onBack }: { again: boolean; onStart: (mode: Mode) => void; onBack: () => void }) {
  return (
    <main className="page vocab level" data-phase="intro" aria-labelledby="level-title">
      <button type="button" className="link" onClick={onBack}>
        ← Back
      </button>
      <p className="eyebrow">Find my level</p>
      <h1 id="level-title" className="hero">
        Where should you start?
      </h1>
      <p className="sub">The quick check takes about seven minutes. It finds where your words reach first, and uses that to ask only a few well-chosen questions in each other part.</p>
      <ol className="level-parts">
        <li>
          <b>Words</b>: about {ABOUT} quick questions. Say whether you know a word (some are made up), then pick the closest word for a few.
        </li>
        <li>
          <b>Reading</b>: one or two short texts with six questions each. Say "I'm not sure" rather than guess.
        </li>
        <li>
          <b>Listening</b>: hear three sentences and write them.
        </li>
        <li>
          <b>Spelling</b>: hear four words and spell them.
        </li>
        <li>
          <b>Grammar</b>: tap a word in a few sentences.
        </li>
      </ol>
      <p className="small">It is not a test. If you do not know something, say so: it only helps the app choose the right place to start. Each level shown is only what your answers in that part showed, never a guess from another part. You can skip a part.</p>
      <button type="button" className="primary" onClick={() => onStart("quick")}>
        {again ? "Quick check again" : "Start the quick check"}
      </button>
      <button type="button" className="secondary" onClick={() => onStart("full")}>
        Take the full check instead (about fifteen minutes)
      </button>
    </main>
  );
}

export function LevelWords({ item, asked, about, onAnswer, onSkip, onStop }: { item: CheckItem; asked: number; about: number; onAnswer: (choice: boolean | number | null) => void; onSkip: () => void; onStop: () => void }) {
  return (
    <main className="page vocab level" data-phase="words">
      <PartHead part="words" onSkip={onSkip} onStop={onStop} />
      <p className="pill">
        Question {asked + 1} of about {about}
      </p>
      <WordQuestion item={item} onAnswer={onAnswer} />
    </main>
  );
}

export function LevelReading({ view, texts = READING_TEXTS, onAnswer, onSkip, onStop }: { view: ReadingPlacementView; texts?: number; onAnswer: (choice: number | null) => void; onSkip: () => void; onStop: () => void }) {
  return (
    <main className="page vocab level reading" data-phase="reading" data-level={view.level} data-question={view.index}>
      <PartHead part="reading" onSkip={onSkip} onStop={onStop} />
      <section className="tile reading-passage" aria-label="The text">
        <h2>{view.passage!.title}</h2>
        {view.passage!.text.split(/\n+/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </section>
      <p className="small">
        Text {view.step + 1} of up to {texts} · Question {view.index + 1} of {view.total}
      </p>
      <p className="prompt" id="level-question">
        {view.question!.prompt}
      </p>
      <div className="options" role="group" aria-labelledby="level-question">
        {view.question!.options.map((o, i) => (
          <button key={`${view.step}:${view.index}:${i}`} type="button" className="option" onClick={() => onAnswer(i)}>
            {o}
          </button>
        ))}
        <button key={`${view.step}:${view.index}:unsure`} type="button" className="option vocab-unknown" onClick={() => onAnswer(null)}>
          I'm not sure
        </button>
      </div>
    </main>
  );
}

export function LevelListening({ id, index, total = LISTENING_STEPS, heard, onPlay, onDone, onSkip, onStop }: { id: string; index: number; total?: number; heard: PlayOutcome | null; onPlay: (slow: boolean) => void; onDone: (typed: string) => void; onSkip: () => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(id);
  if (shown !== id) {
    setShown(id);
    setText("");
  }
  return (
    <main className="page vocab level dict" data-phase="listening" data-sentence={id}>
      <PartHead part="listening" onSkip={onSkip} onStop={onStop} />
      <p className="small">
        Sentence {index + 1} of up to {total}. Write it just as you hear it.
      </p>
      <div className="dict-play">
        <button type="button" className="primary" onClick={() => onPlay(false)}>
          🔊 Hear the sentence
        </button>
        <button type="button" className="secondary" onClick={() => onPlay(true)}>
          🐢 Slowly
        </button>
      </div>
      {heard === "blocked" && <p className="small" role="status">Tap “Hear the sentence” to listen.</p>}
      {heard === "failed" && <p className="warning" role="alert">The sentence could not be read aloud. Check that the phone's sound is on and tap again, or skip this part.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (wordsOf(text).length) onDone(text);
        }}
      >
        <label htmlFor="dict-box" className="small">
          Write the sentence here
        </label>
        <textarea id="dict-box" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" />
        <button type="submit" className="primary" disabled={!wordsOf(text).length}>
          Next
        </button>
      </form>
    </main>
  );
}

export function LevelSpelling({ id, index, total = SPELLING_STEPS, heard, onPlay, onDone, onSkip, onStop }: { id: string; index: number; total?: number; heard: PlayOutcome | null; onPlay: (wordOnly: boolean) => void; onDone: (typed: string) => void; onSkip: () => void; onStop: () => void }) {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(id);
  if (shown !== id) {
    setShown(id);
    setText("");
  }
  return (
    <main className="page vocab level dict" data-phase="spelling" data-word-id={id}>
      <PartHead part="spelling" onSkip={onSkip} onStop={onStop} />
      <p className="small">
        Word {index + 1} of up to {total}. You will hear the word, a sentence with it, and the word again. Type the word.
      </p>
      <div className="dict-play">
        <button type="button" className="primary" onClick={() => onPlay(false)}>
          🔊 Hear the word
        </button>
        <button type="button" className="secondary" onClick={() => onPlay(true)}>
          Word only
        </button>
      </div>
      {heard === "blocked" && <p className="small" role="status">Tap “Hear the word” to listen.</p>}
      {heard === "failed" && <p className="warning" role="alert">The word could not be read aloud. Check that the phone's sound is on and tap again, or skip this part.</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onDone(text);
        }}
      >
        <label htmlFor="spell-box" className="small">
          Type the word here
        </label>
        <input id="spell-box" type="text" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="done" />
        <button type="submit" className="primary" disabled={!text.trim()}>
          Next
        </button>
      </form>
    </main>
  );
}

/** The grammar part: a sentence as words to tap. Nothing is typed, and nothing is marked on screen. */
export function LevelGrammar({ view, onDone, onSkip, onStop }: { view: GrammarPlacementView; onDone: (tapped: number) => void; onSkip: () => void; onStop: () => void }) {
  const task = view.task?.kind === "spot" ? spotTask(view.task.ask) : "One word in this sentence is wrong. Tap it.";
  return (
    <main className="page vocab level grammar" data-phase="grammar" data-item={view.id ?? ""}>
      <PartHead part="grammar" onSkip={onSkip} onStop={onStop} />
      <p className="small">
        Question {view.index + 1} of up to {view.total}. If you are not sure, tap your best guess.
      </p>
      <Spot key={view.id} words={view.words} task={task} button="Next" onCheck={onDone} />
    </main>
  );
}

export function LevelResult({ levels, skipped, quick = false, onDone, onGrammar, onStretch }: { levels: Levels; skipped: Part[]; quick?: boolean; onDone: () => void; onGrammar?: () => void; onStretch?: () => void }) {
  const reading = levels.reading && COURSE.levels.find((l) => l.id === levels.reading!.start)!;
  const line = (part: Part) => skipped.includes(part) && <span className="small"> Skipped: the app starts you by age here.</span>;
  return (
    <main className="page vocab level" data-phase="result" aria-labelledby="level-result-title">
      <p className="eyebrow">Find my level</p>
      <h1 id="level-result-title" className="hero">
        Here is where to start
      </h1>
      {quick && <p className="small" data-quick="true">This was the quick check, so each level is a careful starting point: it may be a little lower than you can do, never higher. Practice moves it up, and the full check is there whenever you want it.</p>}
      <ul className="vocab-bands level-result">
        <li data-part="words">
          <span>
            <b>🌱 Words</b>
            {line("words")}
            {levels.words && !skipped.includes("words") && <span className="small"> The words got harder until the check found ones you do not know yet.</span>}
          </span>
          <span className="status">{levels.words && !skipped.includes("words") ? levelLine(levels.words.band) : "—"}</span>
        </li>
        <li data-part="reading">
          <span>
            <b>📖 Reading</b>
            {line("reading")}
          </span>
          <span className="status">{reading && !skipped.includes("reading") ? `${reading.name} (level ${reading.id} of ${COURSE.levels.length})` : "—"}</span>
        </li>
        <li data-part="listening">
          <span>
            <b>🎧 Listening</b>
            {line("listening")}
          </span>
          <span className="status">{levels.listening && !skipped.includes("listening") ? `Level ${levels.listening.level} of ${DICTATION.levels.length}` : "—"}</span>
        </li>
        <li data-part="spelling">
          <span>
            <b>🐝 Spelling</b>
            {line("spelling")}
          </span>
          <span className="status">{levels.spelling && !skipped.includes("spelling") ? `${LEVEL_NAMES[levels.spelling.level]} (level ${levels.spelling.level} of ${Object.keys(LEVEL_NAMES).length})` : "—"}</span>
        </li>
        <li data-part="grammar">
          <span>
            <b>🧩 Grammar</b>
            {line("grammar")}
            {levels.grammar && !skipped.includes("grammar") && !levels.grammar.basics && <span className="small"> Naming a noun and a verb comes first.</span>}
          </span>
          <span className="status">{levels.grammar && !skipped.includes("grammar") ? `Level ${levels.grammar.level} of ${GRAMMAR.levels.length}` : "—"}</span>
        </li>
      </ul>
      {isBeginner(levels) && (
        <p data-beginner>
          <b>🐱 Start with First words.</b> Hear a word and tap its picture: nothing has to be read. It is at the top of your home screen.
        </p>
      )}
      <p className="small">Each level is a first estimate from a few answers, on our own scales. It moves as you practise: up when things go well, down when they are too hard.</p>
      {onGrammar && (
        <section className="tile lilac level-grammar" aria-labelledby="level-grammar-title">
          <b id="level-grammar-title">
            <span aria-hidden="true">🧩</span> A longer grammar check
          </b>
          <p>For a closer look at grammar there is a longer check: about 15 to 20 questions. You can do it now or any time from the home screen, and stop and carry on later.</p>
          <button type="button" className="secondary" onClick={onGrammar}>
            Do the grammar check now
          </button>
        </section>
      )}
      {onStretch && levels.words && !skipped.includes("words") && <button type="button" className="secondary" onClick={onStretch}>Try 3 harder words</button>}
      <button type="button" className="primary" onClick={onDone}>
        See what to do today
      </button>
    </main>
  );
}

export function LevelCheck({ learner, voice, onLeave, onChanged, onGrammar }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void; onChanged: () => void; onGrammar?: () => void }) {
  const age = learner.state.preferences?.band;
  const [part, setPart] = useState<Part | "intro" | "result">("intro");
  const [, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const [stretch, setStretch] = useState(false);
  const [heard, setHeard] = useState<PlayOutcome | null>(null);
  const words = useRef<SizeCheckSession | null>(null);
  const reading = useRef<ReadingPlacement | null>(null);
  const listening = useRef<ListeningPlacement | null>(null);
  const spelling = useRef<SpellingPlacement | null>(null);
  const grammar = useRef<GrammarPlacement | null>(null);
  const skipped = useRef<Part[]>([]);
  const mode = useRef<Mode>("quick");
  /** The word level found in this sitting (null: the words part was skipped), for where the quick check starts the other parts. */
  const wordBand = useRef<number | null>(null);
  const plays = useRef(0);
  const unsaved = useRef<(() => Promise<void>)[]>([]);
  /** Store each step in order; anything that could not be saved goes first next time. */
  const save = async (...writes: (() => Promise<void>)[]) => {
    unsaved.current.push(...writes);
    setTick((t) => t + 1);
    try {
      while (unsaved.current.length) {
        await unsaved.current[0]();
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const level = (r: LevelCheckRecord) => () => learner.recordLevelCheck([r]);
  const say = (slow: boolean) => {
    const text = listening.current?.spoken();
    if (!text) return;
    plays.current++;
    void playWord(slow ? slowText(text) : text, voice).then(setHeard);
  };
  const sayWord = (wordOnly: boolean) => {
    const text = spelling.current?.spoken(wordOnly);
    if (text) void playWord(text, voice).then(setHeard);
  };
  const after = (p: Part): Part | "result" => PARTS[PARTS.indexOf(p) + 1] ?? "result";
  /** Open a part (started by a tap, so the first sentence may be spoken straight away). */
  const open = (next: Part | "result", extra: (() => Promise<void>)[] = []) => {
    scrollTo(0, 0);
    if (next === "words") words.current = new SizeCheckSession(CHECK, startBand(age), learner.vocabRecords());
    // quick check: each part starts where the word level points and asks only a few questions (level-check.ts QUICK)
    const quick = mode.current === "quick";
    const from = (top: number, middle: number) => (quick ? startFromWords(wordBand.current, top, middle) : middle);
    if (next === "reading") reading.current = quick ? new ReadingPlacement(COURSE, from(COURSE.levels.length, MIDDLE.reading), QUICK.reading) : new ReadingPlacement(COURSE, MIDDLE.reading);
    if ((next === "listening" || next === "spelling") && !speechPossible()) {
      skipped.current.push(next);
      return open(after(next), [...extra, level({ type: "skipped", part: next })]);
    }
    if (next === "listening") {
      listening.current = quick ? new ListeningPlacement(DICTATION, from(DICTATION.levels.length, MIDDLE.listening), learner.dictationRecords(), QUICK.listening) : new ListeningPlacement(DICTATION, MIDDLE.listening, learner.dictationRecords());
      plays.current = 0;
      setHeard(null);
      setPart(next);
      say(false);
      return void save(...extra);
    }
    if (next === "spelling") {
      const bee = learner.spellingWords(BANK);
      spelling.current = quick ? new SpellingPlacement(bee, from(Math.max(1, ...bee.map((w) => w.level ?? 1)), MIDDLE.spelling), QUICK.spelling) : new SpellingPlacement(bee, MIDDLE.spelling);
      setHeard(null);
      setPart(next);
      sayWord(false);
      return void save(...extra);
    }
    if (next === "grammar") grammar.current = quick ? new GrammarPlacement(GRAMMAR, from(GRAMMAR.levels.length, MIDDLE.grammar), QUICK.grammar, 2) : new GrammarPlacement(GRAMMAR, MIDDLE.grammar);
    setPart(next);
    const takeWords = next === "words" ? [() => learner.recordVocab(words.current!.take())] : [];
    void save(...extra, ...takeWords, ...(next === "result" ? [level({ type: "done" }), async () => void (await syncAutoLists(learner))] : []));
  };
  const skip = (p: Part) => {
    stopWord();
    skipped.current.push(p);
    open(after(p), [level({ type: "skipped", part: p })]);
  };
  const stop = () => {
    stopWord();
    onLeave();
  };
  const warn = failed && (
    <p className="warning" role="alert">
      This step could not be saved. Check the connection; your next answer will try again.
    </p>
  );
  if (part === "intro")
    return (
      <LevelIntro
        again={learner.levels().done}
        onBack={onLeave}
        onStart={(m) => {
          skipped.current = [];
          mode.current = m;
          wordBand.current = null;
          open("words", [level({ type: "start", mode: m })]);
        }}
      />
    );
  if (part === "words") {
    const s = words.current!;
    const v = s.snapshot();
    return (
      <>
        {warn}
        {v.item && (
          <LevelWords
            item={v.item}
            asked={v.asked}
            about={v.about}
            onStop={stop}
            onSkip={() => skip("words")}
            onAnswer={(c) => {
              s.answer(c);
              const records = s.take();
              const r = s.snapshot().result;
              if (r) wordBand.current = r.band;
              if (r) open("reading", [() => learner.recordVocab(records), level({ type: "words", band: r.band, scale: CHECK_VERSION, estimate: r.estimate, correct: r.correct, answered: r.answered })]);
              else void save(() => learner.recordVocab(records));
            }}
          />
        )}
      </>
    );
  }
  if (part === "reading") {
    const s = reading.current!;
    return (
      <>
        {warn}
        <LevelReading
          view={s.snapshot()}
          texts={mode.current === "quick" ? QUICK.reading.most : READING_TEXTS}
          onStop={stop}
          onSkip={() => skip("reading")}
          onAnswer={(c) => {
            const before = s.snapshot().step;
            s.answer(c);
            const v = s.snapshot();
            if (v.phase === "done") return open("listening", [level({ type: "reading", ...s.result() })]);
            if (v.step !== before) scrollTo(0, 0);
            setTick((t) => t + 1);
          }}
        />
      </>
    );
  }
  if (part === "listening") {
    const s = listening.current!;
    const v = s.snapshot();
    return (
      <>
        {warn}
        {v.id && (
          <LevelListening
            id={v.id}
            index={v.index}
            total={v.total}
            heard={heard}
            onPlay={say}
            onStop={stop}
            onSkip={() => skip("listening")}
            onDone={(typed) => {
              stopWord();
              s.check(typed, plays.current);
              const records = s.take();
              plays.current = 0;
              setHeard(null);
              if (s.finished) return open("spelling", [() => learner.recordDictation(records), level({ type: "listening", ...s.result() })]);
              say(false); // started by the tap on Next
              void save(() => learner.recordDictation(records));
            }}
          />
        )}
      </>
    );
  }
  if (part === "spelling") {
    const s = spelling.current!;
    const v = s.snapshot();
    return (
      <>
        {warn}
        {v.id && (
          <LevelSpelling
            id={v.id}
            index={v.index}
            total={v.total}
            heard={heard}
            onPlay={sayWord}
            onStop={stop}
            onSkip={() => skip("spelling")}
            onDone={(typed) => {
              stopWord();
              s.answer(typed);
              setHeard(null);
              if (s.finished) return open("grammar", [level({ type: "spelling", ...s.result() })]);
              sayWord(false); // started by the tap on Next
              setTick((t) => t + 1);
            }}
          />
        )}
      </>
    );
  }
  if (part === "grammar") {
    const s = grammar.current!;
    return (
      <>
        {warn}
        <LevelGrammar
          view={s.snapshot()}
          onStop={stop}
          onSkip={() => skip("grammar")}
          onDone={(tapped) => {
            s.answer(tapped);
            if (s.finished) return open("result", [level({ type: "grammar", ...s.result() })]);
            setTick((t) => t + 1);
          }}
        />
      </>
    );
  }
  if (stretch) return <VocabularyStretch onBack={() => setStretch(false)} />;
  return (
    <>
      {warn}
      <LevelResult levels={learner.levels()} skipped={skipped.current} quick={mode.current === "quick"} onDone={onLeave} onGrammar={onGrammar} onStretch={() => setStretch(true)} />
      <div className="page vocab-note">
        <NoteBox learner={learner} screen="level-check:result" label="Do these levels look right? Was any part confusing?" />
      </div>
    </>
  );
}
