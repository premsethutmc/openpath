/**
 * Before the spelling check (dictation): make sure the words can be heard. With a working voice the learner can
 * test the sound and start. Without one, the app says so plainly and offers what it can honestly do: an adult reads
 * the words aloud (recorded as such), or spelling practice that is labelled as practice. It never swaps in a
 * different kind of question and calls it a spelling check.
 */
import { useState } from "react";
import type { Learner } from "../logic/learner.ts";
import { spellingPlan } from "../logic/select.ts";
import type { PlanStep } from "../logic/plan.ts";
import { speak } from "./speech.ts";

type Start = (step: Pick<PlanStep, "type" | "capability" | "step" | "lesson" | "purpose">, opts?: { delivery?: "device_voice" | "adult_reader" }) => Promise<void>;

export function SpellingIntro({ learner, voice, onStart, onBack, onChanged }: { learner: Learner; voice: SpeechSynthesisVoice | null; onStart: Start; onBack: () => void; onChanged: () => void }) {
  const [tested, setTested] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const hasVoice = !!voice;
  const enabled = learner.state.speech;
  const practice = spellingPlan(learner.state, learner.content, learner.clock(), learner.speech)[0];
  const go = (f: () => Promise<void>) => () => f().catch((e: Error) => setProblem(e.message));
  return (
    <main className="welcome spelling-intro" aria-labelledby="spell-title">
      <div className="page stack">
        <p className="eyebrow">Spelling check</p>
        <h1 id="spell-title" className="hero">
          Hear it, then spell it <span aria-hidden="true">🎧</span>
        </h1>
        <p className="sub">You will hear a word, and you can hear it again or in a sentence. Then type how it is spelt. Each next word depends on your answers, so it is never too easy or too hard for long.</p>
        {hasVoice && enabled && (
          <>
            <p>Turn your sound on, then test it.</p>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                speak("Ready? Here is a test word: garden.", voice);
                setTested(true);
              }}
            >
              <span aria-hidden="true">🔊</span> Test the sound
            </button>
            {tested && <p className="small">Did you hear “garden”? If not, check the volume and that the phone is not on silent, then test again.</p>}
            <button type="button" className="primary" onClick={go(() => onStart({ type: "spelling_assess" }, { delivery: "device_voice" }))}>
              Start the spelling check
            </button>
          </>
        )}
        {hasVoice && !enabled && (
          <div className="tile peach stack" role="note">
            <b>Hearing words is switched off.</b>
            <p>This check needs words read aloud. You can switch hearing words on here (or in Me).</p>
            <button
              type="button"
              className="primary"
              onClick={go(async () => {
                await learner.setSpeech(true);
                onChanged();
              })}
            >
              Switch hearing words on
            </button>
          </div>
        )}
        {!hasVoice && (
          <div className="tile peach stack" role="note" data-speech="unavailable">
            <b>This device can't say the words aloud.</b>
            <p>No English voice was found on this phone or browser, so OpenPath cannot read the words for this check. Some phones need a text-to-speech voice installed or switched on in their settings; after that, open OpenPath again.</p>
            <p>You can still do the check if an adult reads each word aloud. The app shows the word to the adult only when they ask, and records that an adult read the words.</p>
            <button type="button" className="primary" onClick={go(() => onStart({ type: "spelling_assess" }, { delivery: "adult_reader" }))}>
              An adult will read the words aloud
            </button>
            {practice && (
              <button type="button" className="secondary" onClick={go(() => onStart({ type: "spelling_practice", capability: practice.cap, step: practice.step }))}>
                Spelling practice instead (does not count as the check)
              </button>
            )}
          </div>
        )}
        {problem && (
          <p className="warning" role="alert">
            {problem}
          </p>
        )}
        <button type="button" className="quiet" onClick={onBack}>
          Not now
        </button>
      </div>
    </main>
  );
}
