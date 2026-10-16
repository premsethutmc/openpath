/**
 * Plays a spelling word: a recording (the Spelling Bee's words) with the browser's ordinary audio element, or, for a
 * parent's own words, the device's voice. One audio element for the whole app, so only one word is ever heard at a time
 * (a new word, a repeat or leaving the screen stops the one before) and so a phone that let the first tap play keeps
 * letting the next words play. Nothing is preloaded except the next word's recording, fetched quietly into the
 * browser's own cache.
 *
 * Each play reports how it went:
 *   "played"   sound started;
 *   "blocked"  the browser wants a tap first (autoplay rules: a fresh page, or a word started by a timer);
 *   "failed"   the recording could not be loaded (network, missing file) and the device's voice did not start either.
 * A recording that fails falls back to the device's voice by itself; a blocked one waits for the tap on the speaker.
 */
import { speakAny } from "./speech.ts";

export type PlayOutcome = "played" | "blocked" | "failed";
export interface Playable {
  /** A recording (relative URL), when there is one. */
  url?: string;
  /** What the device's voice should say when there is no recording, or it cannot be loaded. */
  text: string;
}

const LOAD_TIMEOUT_MS = 10_000;
let element: HTMLAudioElement | null = null;
let token = 0;
const listeners = new Set<(playing: boolean) => void>();

function audio(): HTMLAudioElement | null {
  if (element || typeof Audio === "undefined") return element;
  element = new Audio();
  element.preload = "auto";
  element.addEventListener("playing", () => listeners.forEach((f) => f(true)));
  for (const ev of ["ended", "pause", "error", "emptied"]) element.addEventListener(ev, () => listeners.forEach((f) => f(false)));
  return element;
}

/** Be told when sound starts and stops (to light the speaker button). Returns the unsubscribe function. */
export function onPlaying(f: (playing: boolean) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Stop whatever is playing, recording or voice. Safe to call any time. */
export function stopWord(): void {
  token++;
  const a = element;
  if (a && !a.paused) a.pause();
  if (typeof window !== "undefined" && "speechSynthesis" in window && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) window.speechSynthesis.cancel();
  listeners.forEach((f) => f(false));
}

const voiceOnly = (text: string, voice: SpeechSynthesisVoice | null, mine: number) =>
  new Promise<PlayOutcome>((resolve) =>
    speakAny(text, voice, (ok) => {
      if (mine === token) listeners.forEach((f) => f(ok));
      // the voice gives no reliable "ended" everywhere: watch it until it stops, then say so
      if (ok) {
        const watch = setInterval(() => {
          if (mine !== token || !window.speechSynthesis.speaking) {
            clearInterval(watch);
            if (mine === token) listeners.forEach((f) => f(false));
          }
        }, 300);
      }
      resolve(ok ? "played" : "failed");
    }),
  );

/** Play a word (stopping anything else first). A stale result (another word started meanwhile) is reported as played. */
export async function playWord(p: Playable, voice: SpeechSynthesisVoice | null = null): Promise<PlayOutcome> {
  stopWord();
  const mine = token;
  const a = audio();
  if (!p.url || !a) return voiceOnly(p.text, voice, mine);
  // a new word, or the same one after a failed load (setting src again makes the element try the network again)
  if (a.error || !a.src.endsWith(p.url)) a.src = p.url;
  a.currentTime = 0;
  try {
    await Promise.race([a.play(), new Promise((_, reject) => setTimeout(() => reject(new DOMException("too slow", "TimeoutError")), LOAD_TIMEOUT_MS))]);
    return "played";
  } catch (e) {
    if (mine !== token) return "played"; // another word took over: nothing to report for this one
    const name = e instanceof DOMException ? e.name : "";
    if (name === "NotAllowedError") return "blocked";
    a.pause();
    // the recording could not be loaded (offline, a missing file, too slow): the device's own voice, if it has one
    return voiceOnly(p.text, voice, mine);
  }
}

/** Fetch a recording into the browser's cache ahead of time (the next word), without playing it. */
export function prefetch(url: string | undefined): void {
  if (!url || typeof fetch === "undefined") return;
  void fetch(url, { priority: "low" } as RequestInit).catch(() => undefined);
}

/** For tests: the shared element (so a test can see what is playing). */
export const currentAudio = () => element;
