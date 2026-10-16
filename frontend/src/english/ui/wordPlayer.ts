/**
 * Says a spelling word with the browser's own speech (the Web Speech API's speechSynthesis), for every source: the
 * Spelling Bee's words and a parent's own (My Words, My Books).
 *
 * Built for the phones children actually have:
 *   - No voice list is required. Chrome on many Android phones (Samsung's among them) lists no voices, or lists them
 *     late, yet speaks with the phone's default voice when asked. Requiring a listed English voice first is what made
 *     the app say "This device can't say words aloud" on phones that can. A listed local English voice is used when
 *     there is one (looked up again on every play, so voices that arrive late are used from then on); otherwise no voice
 *     is chosen and the browser's default speaks (language en-GB). A network voice is never chosen on purpose.
 *   - Only one word is ever heard: anything still speaking is cancelled first, and a stale utterance's events are ignored.
 *   - Each play reports how it went, so the screen can ask for a tap instead of waiting in silence:
 *       "played"   speech started;
 *       "blocked"  the browser refused speech no tap started ("not-allowed", or silence with no recent tap);
 *       "failed"   speech did not start even though a tap started it, or this browser has no speech at all.
 */
import { speechPossible } from "./speech.ts";

export type PlayOutcome = "played" | "blocked" | "failed";

/** How long to wait for speech to start before calling it refused or failed. */
const START_TIMEOUT_MS = 3000;
let token = 0;
const listeners = new Set<(speaking: boolean) => void>();
const notify = (on: boolean) => listeners.forEach((f) => f(on));

/** Be told when speech starts and stops (to light the speaker button). Returns the unsubscribe function. */
export function onPlaying(f: (speaking: boolean) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** A listed local English voice (British first), or null: the browser's default then speaks. Never a network voice. */
export function pickVoice(preferred: SpeechSynthesisVoice | null): SpeechSynthesisVoice | null {
  if (preferred) return preferred;
  const voices = (speechPossible() && window.speechSynthesis.getVoices?.()) || [];
  const local = voices.filter((v) => v.localService && v.lang.replace("_", "-").toLowerCase().startsWith("en"));
  return local.find((v) => /^en-gb/i.test(v.lang.replace("_", "-"))) ?? local[0] ?? null;
}

/** Stop whatever is being said. Safe to call any time. */
export function stopWord(): void {
  token++;
  if (speechPossible()) {
    const s = window.speechSynthesis;
    // cancel only when something is queued: on some Android versions cancel() straight before speak() drops the next one
    if (s.speaking || s.pending) s.cancel();
  }
  notify(false);
}

/**
 * Say `text` (stopping anything else first). If a listed voice errors, it is tried once more with no voice chosen (the
 * browser's default). A stale result (another word started meanwhile) is reported as played.
 */
export async function playWord(text: string, preferred: SpeechSynthesisVoice | null = null): Promise<PlayOutcome> {
  if (!speechPossible()) return "failed";
  const voice = pickVoice(preferred);
  const r = await attempt(text, voice);
  return r === "error" && voice ? (await attempt(text, null)).replace("error", "failed") as PlayOutcome : r === "error" ? "failed" : r;
}

function attempt(text: string, voice: SpeechSynthesisVoice | null): Promise<PlayOutcome | "error"> {
  stopWord();
  const mine = token;
  const synth = window.speechSynthesis;
  // whether a tap is still fresh: without one, Chrome on a phone may refuse speech (or ignore it silently)
  const tapped = typeof navigator !== "undefined" && navigator.userActivation ? navigator.userActivation.isActive : true;
  return new Promise((resolve) => {
    let settled = false;
    const settle = (o: PlayOutcome | "error") => {
      if (settled) return;
      settled = true;
      resolve(mine === token ? o : "played");
    };
    const u = new SpeechSynthesisUtterance(text);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = "en-GB";
    u.rate = 0.8;
    u.onstart = () => {
      if (mine === token) notify(true);
      settle("played");
    };
    u.onend = () => {
      if (mine === token) notify(false);
    };
    u.onerror = (e: SpeechSynthesisErrorEvent) => {
      if (mine === token) notify(false);
      // "interrupted"/"canceled" come from our own stopWord for a newer word: that one is not a failure
      if (e.error === "interrupted" || e.error === "canceled") return settle("played");
      settle(e.error === "not-allowed" ? "blocked" : "error");
    };
    synth.resume?.(); // a voice left paused (for example after the tab was hidden) stays silent otherwise
    synth.speak(u);
    setTimeout(() => {
      if (settled || mine !== token) return settle("played");
      // nothing started: refused (no fresh tap) or failed (even with one); clear it so it cannot start late, over the next
      if (synth.speaking || synth.pending) synth.cancel();
      settle(tapped ? "failed" : "blocked");
    }, START_TIMEOUT_MS);
  });
}

/** Call `f` once when the browser's voice list changes (voices that load late), or never. Returns the unsubscribe. */
export function onVoicesChanged(f: () => void): () => void {
  if (!speechPossible() || !window.speechSynthesis.addEventListener) return () => undefined;
  const once = () => {
    window.speechSynthesis.removeEventListener?.("voiceschanged", once);
    f();
  };
  window.speechSynthesis.addEventListener("voiceschanged", once);
  return () => window.speechSynthesis.removeEventListener?.("voiceschanged", once);
}
