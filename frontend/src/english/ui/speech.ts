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
export function speak(text: string, voice: SpeechSynthesisVoice | null, heard?: (started: boolean) => void, waitMs = 2500): void {
  if (!voice || typeof window === "undefined" || !("speechSynthesis" in window)) return heard?.(false);
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
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.8;
  u.onstart = () => settle(true);
  u.onerror = () => settle(false);
  synth.resume?.(); // a voice left paused (for example after the tab was in the background) stays silent otherwise
  synth.speak(u);
  if (heard) setTimeout(() => settle(false), waitMs);
}
