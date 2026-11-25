/**
 * chintu@1: Chintu the cat, who says the step help to young learners (questions of Classes 1 to 5). He is a voice for
 * help that already exists (the step's "what to do"), not new content: he speaks only when help is asked for, never
 * praises by himself, and is not shown on questions of Class 6 and up.
 *
 * The drawing is our own (plain shapes). "Hear it" reads his words with the phone's own voice, if it has one: nothing is
 * recorded, downloaded or sent.
 */
import { useState } from "react";

/** How a line of maths is said aloud. */
export const spoken = (t: string) => t.replace(/₹(\d+)/g, "$1 rupees ").replace(/×/g, " times ").replace(/÷/g, " divided by ").replace(/−/g, " minus ").replace(/=/g, " equals ").replace(/▢|□|\?$/g, " what ").replace(/√/g, " the square root of ").replace(/\s+/g, " ").trim();
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/**
 * Say `text` aloud with the phone's own voice (an Indian English one when the phone lists it), stopping anything still
 * being said. Quietly does nothing where there is no speech. `done` is called when it ends or fails.
 */
export function sayAloud(text: string, done?: () => void): boolean {
  if (!canSpeak()) return false;
  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    const u = new SpeechSynthesisUtterance(spoken(text));
    const voice = (synth.getVoices?.() ?? []).find((v) => v.lang.replace("_", "-").toLowerCase() === "en-in");
    if (voice) u.voice = voice;
    u.lang = "en-IN"; u.rate = 0.9;
    u.onend = () => done?.(); u.onerror = () => done?.();
    synth.speak(u);
    return true;
  } catch { done?.(); return false; }
}

export function Chintu({ say }: { say: string }) {
  const [talking, setTalking] = useState(false);
  const hear = () => setTalking(sayAloud(say, () => setTalking(false)));
  return (
    <div className="chintu" data-testid="chintu">
      <svg className="chintu-cat" viewBox="0 0 64 64" role="img" aria-label="Chintu the cat">
        <path d="M12 26 L10 6 L26 16 Z M52 26 L54 6 L38 16 Z" className="chintu-fur" />
        <ellipse cx="32" cy="36" rx="24" ry="21" className="chintu-fur" />
        <path d="M14 14 L13 9 L18 13 Z M50 14 L51 9 L46 13 Z" className="chintu-ear" />
        <ellipse cx="23" cy="33" rx="3.2" ry={talking ? 4.6 : 4} className="chintu-eye" /><ellipse cx="41" cy="33" rx="3.2" ry={talking ? 4.6 : 4} className="chintu-eye" />
        <path d="M29.5 40 L34.5 40 L32 43 Z" className="chintu-nose" />
        <path d={talking ? "M27 46 Q32 53 37 46 Z" : "M26 45 Q29 49 32 45 Q35 49 38 45"} className={talking ? "chintu-mouth open" : "chintu-mouth"} />
        <path d="M6 37 L17 39 M6 44 L17 43 M58 37 L47 39 M58 44 L47 43" className="chintu-whisker" />
      </svg>
      <div className="chintu-bubble">
        <p className="coach-next" role="status">{say}</p>
        {canSpeak() && <button type="button" className="link chintu-hear" data-testid="chintu-hear" onClick={hear}><span aria-hidden="true">🔊 </span>Hear it</button>}
      </div>
    </div>
  );
}
