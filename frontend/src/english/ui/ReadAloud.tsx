/**
 * Read aloud (logic/read-aloud): the learner reads a sentence out loud and the phone shows which words it heard.
 * Recognition runs on the phone (readAloudEngine.ts); nothing is uploaded. Five sentences a sitting at a level that
 * follows Listen and write's levels; two tries a sentence, and a sentence can be heard first. Practice only.
 */
import { useEffect, useRef, useState } from "react";
import { DICTATION, levelFor, startLevel } from "../logic/dictation/dictation.ts";
import type { Learner } from "../logic/learner.ts";
import { align, allRead, grammarFor, nextLevel, pickSentences, type WordResult } from "../logic/read-aloud/readAloud.ts";
import { Flag } from "./Flag.tsx";
import { listen, prepare, readAloudPossible, type Listening, type MicProblem } from "./readAloudEngine.ts";
import { speechPossible } from "./speech.ts";
import { playWord } from "./wordPlayer.ts";

const TRIES = 2;
const key = (l: Learner, k: string) => `openpath-read-aloud-${k}:${l.profileId}`;
function load(l: Learner, k: string): string | null {
  try {
    return localStorage.getItem(key(l, k));
  } catch {
    return null;
  }
}
function save(l: Learner, k: string, v: string) {
  try {
    localStorage.setItem(key(l, k), v);
  } catch {
    /* private mode: the level is simply not remembered */
  }
}

export function readAloudLevel(l: Learner): number {
  const n = Number(load(l, "level"));
  if (DICTATION.levels.some((x) => x.id === n)) return n;
  // first time: Listen and write's level for this learner
  return levelFor(DICTATION, l.dictationRecords(), l.levels().listening?.level ?? startLevel(l.state.preferences?.band));
}

const MIC_TEXT: Record<MicProblem, string> = {
  denied: "The phone did not let OpenPath use the microphone. Allow the microphone for this site in the browser's settings, then try again.",
  none: "No microphone was found on this device.",
  failed: "The microphone could not be started. Close other apps using it and try again.",
};

export function Words({ result }: { result: WordResult[] }) {
  return (
    <p className="ra-words" aria-label="What the phone heard">
      {result.map((w, i) => (
        <span key={i} className={`ra-${w.status}`} title={w.status === "read" ? "read" : w.status === "missed" ? "not heard" : "not clear"}>
          {w.word}
        </span>
      ))}
    </p>
  );
}

type Phase = "intro" | "loading" | "ready" | "listening" | "checking" | "result" | "done";

export function ReadAloud({ learner, voice, onLeave }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void }) {
  const [level, setLevel] = useState(() => readAloudLevel(learner));
  const [phase, setPhase] = useState<Phase>("intro");
  const [problem, setProblem] = useState<string | null>(null);
  const [sentences, setSentences] = useState(() => pickSentences(level, new Set(JSON.parse(load(learner, "clean") ?? "[]") as string[]), dayNumber()));
  const [at, setAt] = useState(0);
  const [tries, setTries] = useState(0);
  const [result, setResult] = useState<WordResult[] | null>(null);
  const [clean, setClean] = useState<string[]>([]);
  const [meter, setMeter] = useState(0);
  const mic = useRef<Listening | null>(null);
  const sentence = sentences[at];

  useEffect(() => () => mic.current?.cancel(), []);
  useEffect(() => {
    if (phase !== "listening") return;
    const t = setInterval(() => setMeter(mic.current?.level() ?? 0), 120);
    return () => clearInterval(t);
  }, [phase]);

  const start = async () => {
    setProblem(null);
    setPhase("loading");
    try {
      await prepare();
      setPhase("ready");
    } catch {
      setProblem("The listening part could not be downloaded. Check the internet connection and try again.");
      setPhase("intro");
    }
  };
  const begin = async () => {
    setProblem(null);
    try {
      mic.current = await listen(grammarFor(sentence.text));
      setPhase("listening");
    } catch (e) {
      setProblem(MIC_TEXT[(e as { problem?: MicProblem }).problem ?? "failed"]);
      setPhase("ready");
    }
  };
  const finish = async () => {
    const m = mic.current;
    if (!m) return;
    setPhase("checking");
    const heard = await m.stop();
    mic.current = null;
    const r = align(sentence.text, heard);
    setResult(r);
    setTries((t) => t + 1);
    if (allRead(r) && tries === 0) setClean((c) => [...c, sentence.id]);
    setPhase("result");
  };
  const next = () => {
    setResult(null);
    setTries(0);
    if (at + 1 < sentences.length) return (setAt(at + 1), setPhase("ready"));
    const old = new Set(JSON.parse(load(learner, "clean") ?? "[]") as string[]);
    for (const id of clean) old.add(id);
    save(learner, "clean", JSON.stringify([...old]));
    const lv = nextLevel(level, clean.length);
    save(learner, "level", String(lv));
    setLevel(lv);
    setPhase("done");
  };
  const again = () => {
    setResult(null);
    setPhase("ready");
  };
  const more = () => {
    setSentences(pickSentences(level, new Set(JSON.parse(load(learner, "clean") ?? "[]") as string[]), dayNumber() + Date.now()));
    setAt(0);
    setClean([]);
    setPhase("ready");
  };

  const levelName = DICTATION.levels.find((l) => l.id === level)?.name ?? "";
  const back = (
    <button type="button" className="link" onClick={() => (mic.current?.cancel(), onLeave())}>
      ← Back
    </button>
  );

  if (phase === "intro" || phase === "loading")
    return (
      <main className="page vocab ra" data-phase={phase} aria-labelledby="ra-title">
        {back}
        <p className="eyebrow">Reading · Read aloud</p>
        <h1 id="ra-title" className="hero">
          Read a sentence out loud
        </h1>
        <p className="sub">Read each sentence to the phone. It shows the words it heard, so you can see which ones to read again.</p>
        <p className="pill">
          Level {level}: {levelName}
        </p>
        {problem && (
          <p className="warning" role="alert">
            {problem}
          </p>
        )}
        {!readAloudPossible() ? (
          <p className="warning">This browser cannot use the microphone, so Read aloud is not available here.</p>
        ) : phase === "loading" ? (
          <p role="status" className="small" data-loading="model">
            Getting the listening ready… The first time, this downloads about 40 MB, so Wi-Fi is best.
          </p>
        ) : (
          <button type="button" className="primary" onClick={start}>
            Start
          </button>
        )}
        <p className="small">For grown-ups: the listening happens on this phone. Nothing the child says is recorded, kept or sent anywhere.</p>
      </main>
    );

  if (phase === "done")
    return (
      <main className="page vocab ra" data-phase="done">
        <h1 className="hero">{clean.length >= 4 ? "Great reading!" : clean.length >= 2 ? "Good reading" : "Well tried"}</h1>
        <p className="sub">
          {clean.length} of {sentences.length} sentences read clearly the first time.
        </p>
        <p className="pill">
          Next time: level {level}, {levelName}
        </p>
        <button type="button" className="primary" onClick={more}>
          Read five more
        </button>
        <button type="button" className="secondary" onClick={onLeave}>
          Done
        </button>
      </main>
    );

  return (
    <main className="page vocab ra" data-phase={phase} data-sentence={sentence.id}>
      {back}
      <p className="eyebrow">
        Sentence {at + 1} of {sentences.length}
      </p>
      {result ? <Words result={result} /> : <p className="ra-sentence">{sentence.text}</p>}
      {problem && (
        <p className="warning" role="alert">
          {problem}
        </p>
      )}
      {phase === "ready" && (
        <>
          <button type="button" className="primary ra-mic" onClick={begin}>
            🎤 Start reading
          </button>
          {speechPossible() && (
            <button type="button" className="secondary" onClick={() => void playWord(sentence.text, voice)}>
              🔊 Hear it first
            </button>
          )}
        </>
      )}
      {phase === "listening" && (
        <>
          <p role="status" className="ra-listening">
            Listening… read the sentence, then tap Done.
          </p>
          <div className="ra-meter" aria-hidden="true">
            <span style={{ width: `${Math.round(meter * 100)}%` }} />
          </div>
          <button type="button" className="primary" onClick={finish}>
            Done
          </button>
        </>
      )}
      {phase === "checking" && <p role="status">Checking…</p>}
      {phase === "result" && result && (
        <>
          <p role="status" className="ra-verdict">
            {allRead(result)
              ? "Every word heard. Well read!"
              : `${result.filter((w) => w.status !== "read").length === 1 ? "One word" : `${result.filter((w) => w.status !== "read").length} words`} in orange did not come through clearly.`}
          </p>
          {!allRead(result) && tries < TRIES && (
            <button type="button" className="primary" onClick={again}>
              Read it again
            </button>
          )}
          <button type="button" className={allRead(result) || tries >= TRIES ? "primary" : "secondary"} onClick={next}>
            {at + 1 < sentences.length ? "Next sentence" : "Finish"}
          </button>
          <p className="small">The phone can mishear. If you are sure you read it right, just carry on.</p>
          <Flag stream="read-aloud" id={sentence.id} />
        </>
      )}
    </main>
  );
}

const dayNumber = () => Math.floor(Date.now() / 86_400_000);
