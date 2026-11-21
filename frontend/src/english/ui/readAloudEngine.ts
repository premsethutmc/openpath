/**
 * On-phone speech recognition for Read aloud (logic/read-aloud). Vosk (vosk-browser, Apache-2.0) runs in a web
 * worker inside the page; the model (vosk-model-small-en-us-0.15, about 40 MB) is downloaded once from this site
 * and kept in the browser's storage. The child's voice never leaves the phone: nothing is uploaded or recorded to a
 * file, the microphone is open only while the child is reading, and the sound is dropped as soon as it is checked.
 *
 * Both the library (assets/vosk/vosk.js and worker.js, 5.8 MB) and the model are fetched only when Read aloud is opened, so the app
 * itself stays small.
 */
import type { Heard } from "../logic/read-aloud/readAloud.ts";

interface VoskRecognizer {
  on(event: "result" | "partialresult", listener: (m: { result: { result?: Heard[]; text?: string; partial?: string } }) => void): void;
  setWords(words: boolean): void;
  acceptWaveformFloat(buffer: Float32Array, sampleRate: number): void;
  retrieveFinalResult(): void;
  remove(): void;
}
interface VoskModel {
  KaldiRecognizer: new (sampleRate: number, grammar?: string) => VoskRecognizer;
  terminate(): void;
}
declare global {
  interface Window {
    Vosk?: { createModel(url: string, logLevel?: number): Promise<VoskModel> };
  }
}

const BASE = "assets/vosk/";
let model: Promise<VoskModel> | null = null;

/** True where the browser can give the page a microphone and run the recogniser. */
export function readAloudPossible(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof WebAssembly === "object" && typeof Worker === "function" && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
}

function loadLibrary(): Promise<NonNullable<Window["Vosk"]>> {
  if (window.Vosk) return Promise.resolve(window.Vosk);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `${BASE}vosk.js`;
    s.onload = () => (window.Vosk ? resolve(window.Vosk) : reject(new Error("speech library did not load")));
    s.onerror = () => reject(new Error("speech library could not be fetched"));
    document.head.appendChild(s);
  });
}

/** Load the library and the model (the first time downloads about 40 MB; later visits read it from the phone). */
export function prepare(): Promise<VoskModel> {
  model ??= loadLibrary()
    // absolute: the worker (assets/vosk/worker.js) resolves a relative address against its own location
    .then((v) => v.createModel(new URL(`${BASE}model.tar.gz`, location.href).href, -1))
    .catch((e) => {
      model = null;
      throw e;
    });
  return model;
}

export type MicProblem = "denied" | "none" | "failed";

/** One reading: open the microphone, feed the recogniser the sentence's grammar, and on stop() return what it heard. */
export interface Listening {
  stop(): Promise<Heard[]>;
  cancel(): void;
  /** 0..1, for a simple "I can hear you" meter. */
  level(): number;
}

export async function listen(grammar: string): Promise<Listening> {
  const m = await prepare();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    const name = (e as { name?: string }).name;
    throw Object.assign(new Error("microphone"), { problem: (name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "none" : "failed") as MicProblem });
  }
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const rec = new m.KaldiRecognizer(ctx.sampleRate, grammar);
  rec.setWords(true);
  const heard: Heard[] = [];
  let finalWaiter: (() => void) | null = null;
  rec.on("result", (msg) => {
    for (const w of msg.result.result ?? []) heard.push({ word: w.word, conf: w.conf });
    finalWaiter?.();
  });
  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but works on every phone browser we target; the work it does is a copy.
  const node = ctx.createScriptProcessor(4096, 1, 1);
  let loud = 0;
  node.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i += 16) sum += data[i] * data[i];
    loud = Math.min(1, Math.sqrt(sum / (data.length / 16)) * 6);
    rec.acceptWaveformFloat(new Float32Array(data), ctx.sampleRate);
  };
  source.connect(node);
  node.connect(ctx.destination);
  if (ctx.state === "suspended") await ctx.resume();
  const close = () => {
    node.onaudioprocess = null;
    source.disconnect();
    node.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
  return {
    level: () => loud,
    cancel: () => {
      close();
      rec.remove();
    },
    stop: () =>
      new Promise<Heard[]>((resolve) => {
        close();
        const done = () => {
          finalWaiter = null;
          clearTimeout(timer);
          rec.remove();
          resolve(heard);
        };
        // the final result arrives as one more "result" event once the worker has caught up with the audio; a result
        // already on its way (a pause in the reading) can arrive first, so wait briefly for anything after it
        const timer = setTimeout(done, 4000);
        let settle: ReturnType<typeof setTimeout> | undefined;
        finalWaiter = () => {
          clearTimeout(settle);
          settle = setTimeout(done, 350);
        };
        rec.retrieveFinalResult();
      }),
  };
}
