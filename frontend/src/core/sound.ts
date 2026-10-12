/** Spoken prompts and small sound effects. Both respect one mute setting. */
import { load, save } from "./storage";

const KEY = "openpath.muted";
let muted = load<boolean>(KEY, false);
let audio: AudioContext | null = null;

export const isMuted = (): boolean => muted;

export function setMuted(value: boolean): void {
  muted = value;
  save(KEY, value);
  if (value && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

/** Read a line aloud. Young children are not expected to read the bubbles. */
export function speak(text: string): void {
  if (muted || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.15;
    speechSynthesis.speak(utterance);
  } catch {
    /* speech is a nicety, never a requirement */
  }
}

function tone(frequency: number, start: number, duration: number, volume = 0.12): void {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(audio.currentTime + start);
  oscillator.stop(audio.currentTime + start + duration);
}

export function play(effect: "drop" | "lift" | "cheer" | "nudge" | "tick"): void {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    if (effect === "drop") tone(520, 0, 0.12);
    if (effect === "lift") tone(380, 0, 0.1);
    if (effect === "tick") tone(660, 0, 0.14);
    if (effect === "nudge") [392, 330].forEach((f, i) => tone(f, i * 0.14, 0.2));
    if (effect === "cheer") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.28));
  } catch {
    /* no audio available */
  }
}
