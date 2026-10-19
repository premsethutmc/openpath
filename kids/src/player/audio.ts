/**
 * Sound: spoken dialogue and small sound effects, both made on the device.
 *
 * Speech uses the browser's built-in text-to-speech as a placeholder until the
 * OpenPath family voice system exists; recorded lines can replace it per line
 * later without changing the episode format. Effects are synthesised with Web
 * Audio, so there are no audio files to download. Nothing is recorded: no
 * microphone is ever opened.
 */
import type { Voice } from "../engine/types.ts";

export class Audio {
  muted = false;
  private ctx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof speechSynthesis !== "undefined") {
      const load = () => (this.voices = speechSynthesis.getVoices());
      load();
      speechSynthesis.addEventListener?.("voiceschanged", load);
    }
  }

  /** Must be called from a touch: browsers only allow sound after the child presses something. */
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
    // A silent utterance wakes speech up on Android Chrome.
    if (typeof speechSynthesis !== "undefined" && !this.muted) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.hush();
  }

  hush() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }

  pause() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.pause();
    void this.ctx?.suspend();
  }

  resume() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.resume();
    void this.ctx?.resume();
  }

  private pickVoice(lang: string) {
    const exact = this.voices.find((v) => v.lang.replace("_", "-") === lang);
    const sameLanguage = this.voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    return exact ?? sameLanguage ?? null;
  }

  say(line: string, voice: Voice = {}) {
    if (this.muted || typeof speechSynthesis === "undefined") return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(line);
    u.lang = voice.lang ?? "en-IN";
    const v = this.pickVoice(u.lang);
    if (v) u.voice = v;
    u.pitch = voice.pitch ?? 1;
    u.rate = voice.rate ?? 0.9;
    speechSynthesis.speak(u);
  }

  /** A short synthesised sound effect. Volumes stay low and nothing is harsh. */
  sound(name: string) {
    const ctx = this.ctx;
    if (this.muted || !ctx || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.18;
    out.connect(ctx.destination);

    const tone = (type: OscillatorType, f0: number, f1: number, start: number, dur: number, vol = 1) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + start);
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + start + dur);
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(vol, t + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g).connect(out);
      o.start(t + start);
      o.stop(t + start + dur + 0.02);
    };
    const noise = (start: number, dur: number, freq: number, q: number, vol = 1) => {
      const len = Math.ceil(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(filter).connect(g).connect(out);
      src.start(t + start);
    };

    switch (name) {
      case "chirp":
        tone("sine", 2600, 3600, 0, 0.09, 0.6);
        tone("sine", 2900, 4200, 0.12, 0.08, 0.5);
        tone("sine", 2400, 3300, 0.24, 0.1, 0.5);
        break;
      case "rumble":
        tone("triangle", 90, 60, 0, 0.35, 0.9);
        tone("triangle", 110, 70, 0.32, 0.4, 0.8);
        tone("triangle", 80, 55, 0.66, 0.45, 0.7);
        break;
      case "pop":
        tone("sine", 500, 1100, 0, 0.09, 0.8);
        break;
      case "plop":
        tone("sine", 700, 220, 0, 0.16, 0.8);
        break;
      case "crunch":
        noise(0, 0.08, 2400, 1.2, 1.4);
        noise(0.12, 0.07, 2000, 1.2, 1.2);
        noise(0.24, 0.06, 2600, 1.2, 1);
        break;
      case "splash":
        noise(0, 0.35, 1400, 0.8, 1.2);
        tone("sine", 900, 300, 0, 0.2, 0.3);
        break;
      case "thud":
        tone("sine", 160, 60, 0, 0.22, 1);
        noise(0, 0.06, 500, 1, 0.6);
        break;
      case "chime":
        tone("sine", 1046, 1046, 0, 0.6, 0.5);
        tone("sine", 1318, 1318, 0.08, 0.6, 0.4);
        tone("sine", 1568, 1568, 0.16, 0.7, 0.35);
        break;
      case "whoosh":
        noise(0, 0.4, 900, 0.6, 0.7);
        break;
      case "rustle":
        noise(0, 0.25, 3200, 0.7, 0.5);
        break;
      case "yawn":
        tone("sine", 420, 260, 0, 0.9, 0.35);
        break;
    }
  }
}
