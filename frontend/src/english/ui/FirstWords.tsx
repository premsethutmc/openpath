/**
 * First words: hear, then do. Nothing on the screen has to be read: the guide speaks, and the learner taps
 * pictures, places and letters. The word appears only after a right answer. Where the device cannot speak, the
 * guide's words are shown in small print so a helper can read them out.
 */
import { useEffect, useRef, useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { FIRST, FirstSitting, firstSummary, type FirstRecord, type FirstView } from "../logic/first/first.ts";
import { speechPossible } from "./speech.ts";
import { playWord, stopWord } from "./wordPlayer.ts";

const PLACE_LABEL: Record<string, string> = { on: "On top", next: "Beside", under: "Underneath" };

export function FirstWordsView({ view, said, guide, placedAt, onHear, onTap, onLetter, onNext, onGuide, onLeave, onAgain }: { view: FirstView; said: string | null; guide: boolean; placedAt: string | null; onHear: () => void; onTap: (i: number) => void; onLetter: (i: number) => void; onNext: () => void; onGuide: () => void; onLeave: () => void; onAgain: () => void }) {
  if (view.phase === "done")
    return (
      <main className="page vocab first" data-phase="done">
        <p className="first-big" aria-hidden="true">
          🌟
        </p>
        <h1 className="hero">
          {view.done!.right} of {view.done!.asked} on the first tap
        </h1>
        <p className="sub">Every word comes back another day, so there is no need to get them all at once.</p>
        <button type="button" className="primary" onClick={onAgain}>
          More words
        </button>
        <button type="button" className="secondary" onClick={onLeave}>
          Done
        </button>
      </main>
    );
  const right = view.phase === "right";
  return (
    <main className="page vocab first" data-phase={view.phase} data-kind={view.kind ?? ""} data-key={view.key ?? ""}>
      <div className="level-head">
        <button type="button" className="link" onClick={onLeave}>
          ← Stop
        </button>
        <p className="pill" aria-label={`Step ${view.index + 1} of ${view.total}`}>
          {view.index + 1} / {view.total}
        </p>
        <button type="button" className="link" onClick={onGuide} aria-pressed={guide}>
          {guide ? "Hide Chintu" : "Show Chintu"}
        </button>
      </div>
      <div className="first-guide">
        {guide && (
          <span className="first-cat" aria-hidden="true">
            😺
          </span>
        )}
        <button type="button" className="secondary first-hear" onClick={onHear} aria-label="Hear it again">
          🔊
        </button>
      </div>
      {said && (
        <p className="small" data-said>
          {said}
        </p>
      )}
      {view.build && (
        <>
          <p className="first-big" aria-hidden="true">
            {view.build.picture}
          </p>
          <p className="first-word" aria-label="The word so far" data-placed={view.build.placed}>
            {view.build.placed || " "}
          </p>
          {!right && (
            <p className="first-tiles" role="group" aria-label="Letters">
              {view.build.tiles.map((t, i) => (
                <button key={i} type="button" className="first-tile" disabled={t.used} aria-label={`Letter ${t.letter}`} onClick={() => onLetter(i)}>
                  {t.letter}
                </button>
              ))}
            </p>
          )}
        </>
      )}
      {view.place && (
        <div className="first-place" role="group" aria-label="Places">
          {view.place.zones.map((z) => (
            <button key={z.id} type="button" className={`first-zone ${z.id}`} disabled={z.off || right} aria-label={PLACE_LABEL[z.id] ?? z.id} data-zone={z.id} onClick={() => onTap(view.place!.zones.indexOf(z))}>
              {placedAt === z.id ? view.place!.mover : ""}
            </button>
          ))}
          <span className="first-anchor" aria-hidden="true">
            {view.place.anchor}
          </span>
          {!right && (
            <span className="first-mover" aria-hidden="true">
              {view.place.mover}
            </span>
          )}
        </div>
      )}
      {view.options.length > 0 && !right && (
        <p className="first-options" role="group" aria-label="Pictures">
          {view.options.map((o, i) => (
            <button key={i} type="button" className="first-option" disabled={o.off} aria-label={`Picture ${i + 1}`} onClick={() => onTap(i)}>
              {o.picture}
            </button>
          ))}
        </p>
      )}
      {right && view.reveal && (
        <div className="first-reveal" role="status">
          {!view.build && !view.place && (
            <p className="first-big" aria-hidden="true">
              {view.reveal.picture}
            </p>
          )}
          <p className="first-word">{view.reveal.text}</p>
          <button type="button" className="primary" autoFocus onClick={onNext} aria-label="Next">
            ➜
          </button>
        </div>
      )}
    </main>
  );
}

export function FirstWords({ learner, voice, onLeave, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; onLeave: () => void; onChanged: () => void }) {
  const sitting = useRef<FirstSitting | null>(null);
  if (!sitting.current) sitting.current = new FirstSitting(FIRST, learner.firstRecords());
  const [, setTick] = useState(0);
  const [guide, setGuide] = useState(true);
  const [failed, setFailed] = useState(false);
  const unsaved = useRef<FirstRecord[]>([]);
  const canSpeak = speechPossible();
  const say = () => {
    const text = sitting.current!.spoken();
    if (text && canSpeak) void playWord(text, voice);
  };
  // the first task is said when the screen opens (it was opened by a tap, so speech is allowed)
  useEffect(() => {
    say();
    return () => stopWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const step = async (act: () => void, speak: boolean) => {
    act();
    unsaved.current.push(...sitting.current!.take());
    setTick((t) => t + 1);
    if (speak) say();
    try {
      while (unsaved.current.length) {
        await learner.recordFirst([unsaved.current[0]]);
        unsaved.current.shift();
      }
      setFailed(false);
    } catch {
      setFailed(true);
    }
    onChanged();
  };
  const s = sitting.current;
  const view = s.snapshot();
  const leave = () => {
    stopWord();
    onLeave();
  };
  return (
    <>
      {failed && (
        <p className="warning" role="alert">
          This step could not be saved. Check the connection; the next tap will try again.
        </p>
      )}
      <FirstWordsView
        view={view}
        said={canSpeak ? null : s.spoken()}
        guide={guide}
        placedAt={s.solvedPlace()}
        onHear={say}
        onGuide={() => setGuide(!guide)}
        onLeave={leave}
        onTap={(i) => void step(() => void s.tap(i), s.snapshot().phase === "ask" && view.options[i]?.off !== true)}
        onLetter={(i) => {
          const before = s.snapshot().phase;
          void step(() => void s.letter(i), false).then(() => before === "ask" && s.snapshot().phase === "right" && say());
        }}
        onNext={() => void step(() => s.next(), true)}
        onAgain={() => {
          sitting.current = new FirstSitting(FIRST, learner.firstRecords());
          setTick((t) => t + 1);
          setTimeout(say, 0);
        }}
      />
    </>
  );
}

export const firstLine = (learner: Learner) => firstSummary(FIRST, learner.firstRecords());
