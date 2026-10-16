/**
 * On-device speech for dictation (decision 5). Only voices the browser marks as local (`localService`)
 * are used, so the word is spoken by the device itself. Nothing is recorded, uploaded or recognised.
 * Where no local English voice exists, dictation items are simply not offered.
 */
export interface SpeechState {
  available: boolean;
  voice: SpeechSynthesisVoice | null;
}

const PREFERRED = ["en-IN", "en-GB", "en-AU", "en-US"];

function pick(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const local = voices.filter((v) => v.localService && v.lang.toLowerCase().startsWith("en"));
  for (const lang of PREFERRED) {
    const v = local.find((x) => x.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
    if (v) return v;
  }
  return local[0] ?? null;
}

/** Find a local English voice; voices load asynchronously in some browsers, so wait briefly. */
export function detectSpeech(timeoutMs = 1500): Promise<SpeechState> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve({ available: false, voice: null });
  const synth = window.speechSynthesis;
  const now = pick(synth.getVoices());
  if (now) return Promise.resolve({ available: true, voice: now });
  return new Promise((resolve) => {
    const done = () => {
      const v = pick(synth.getVoices());
      resolve({ available: !!v, voice: v });
    };
    synth.addEventListener?.("voiceschanged", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

/**
 * Say `text` with the local voice. `heard` is told whether speech actually started: Chrome on Android can refuse speech
 * that was not started by a tap ("not-allowed"), or drop the first utterance after the page loads, without any error
 * the page would otherwise see. Callers use it to ask the learner to tap Play instead of waiting in silence.
 */
export function speak(text: string, voice: SpeechSynthesisVoice | null, heard?: (started: boolean) => void, waitMs = 2500, anyVoice = false): void {
  if ((!voice && !anyVoice) || typeof window === "undefined" || !("speechSynthesis" in window)) return heard?.(false);
  const synth = window.speechSynthesis;
  // cancel only when something is queued: on some Android versions cancel() straight before speak() drops the new one
  if (synth.speaking || synth.pending) synth.cancel();
  let settled = false;
  const settle = (ok: boolean) => {
    if (settled) return;
    settled = true;
    heard?.(ok);
  };
  const u = new SpeechSynthesisUtterance(text);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else u.lang = "en-GB"; // the device's own default voice (see speakAny)
  u.rate = 0.8;
  u.onstart = () => settle(true);
  u.onerror = () => settle(false);
  synth.resume?.(); // a voice left paused (for example after the tab was in the background) stays silent otherwise
  synth.speak(u);
  if (heard) setTimeout(() => settle(false), waitMs);
}

/** Whether this browser has speech synthesis at all (it may still have no voice listed). */
export const speechPossible = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

/**
 * Say text for a parent's own words (My Words, My Books), trying harder than speak(): with the device's local English
 * voice when one is listed, and otherwise with no voice chosen at all, so the phone's default text-to-speech engine
 * speaks. Chrome on many Android phones (Samsung's among them) lists no voices, or lists them late, yet speaks with the
 * default engine when asked; requiring a listed local voice made the app say "this device can't say words aloud" on
 * phones that can. A network voice is never chosen on purpose (decision 5: a parent's words stay on the device). Whether
 * it was actually heard is reported to `heard`, so the screen can ask for a tap instead of waiting in silence.
 */
export function speakAny(text: string, voice: SpeechSynthesisVoice | null, heard: (started: boolean) => void, waitMs = 3000): void {
  if (!speechPossible()) return heard(false);
  const listed = voice ?? (window.speechSynthesis.getVoices?.() ?? []).find((v) => v.localService && v.lang.toLowerCase().startsWith("en")) ?? null;
  speak(text, listed, heard, waitMs, true);
}

