/**
 * Shared helpers for the Spelling Bee browser tests.
 *
 * Audio is REAL: the app's own <audio> element plays the real MP3 recordings in Chromium (headless Chromium decodes
 * MP3 and fires "playing" and "ended" like a browser on a phone). The test only watches: it wraps
 * HTMLMediaElement.prototype.play to note which file was asked for and what happened (a spy; playback is untouched),
 * and learns which word is being asked from the recording's file name, through the manifest
 * (content/english/spelling/audio/bee-audio.json) - never from the page.
 *
 * Speech synthesis (a parent's own words) is a stand-in that records what it was asked to say: headless Chromium has
 * no voices. It proves the app asked for the right text, not that a phone's voice says it.
 */
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../../../content/english/spelling/audio/bee-audio.json", import.meta.url), "utf8"));
/** file name -> { id, kind, word, script, ms } */
export const CLIPS = new Map();
for (const [id, c] of Object.entries(manifest.clips)) for (const kind of ["word", "full"]) CLIPS.set(c[kind].file, { id, kind, word: c[kind].script.split(".")[0].trim(), script: c[kind].script, ms: c[kind].ms });

/**
 * Install the spies and stand-ins before the app loads. advanceMs: how long the answer stays before the next word
 * (window.__beeAdvanceMs; null leaves the app's own timing). dropSpeech: utterances the stand-in voice silently drops.
 */
export async function install(context, { advanceMs = 600_000, dropSpeech = 0, voices = true, strictAutoplay = false } = {}) {
  await context.addInitScript(
    ({ advanceMs, dropSpeech, voices, strictAutoplay }) => {
      if (advanceMs !== null) window.__beeAdvanceMs = advanceMs;
      window.__drop = dropSpeech;
      window.__spoken = [];
      window.__played = [];
      window.__asked = [];
      window.__audioEvents = [];
      // the spy: note each play() and its outcome; the real play() still does the work
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        const file = (this.src || "").split("/").pop();
        window.__played.push(file);
        window.__asked.push(["recording", file]);
        window.__audio = this;
        if (!this.__watched) {
          this.__watched = true;
          for (const ev of ["playing", "ended", "pause", "error"]) this.addEventListener(ev, () => window.__audioEvents.push([ev, (this.src || "").split("/").pop(), Math.round(this.currentTime * 1000)]));
        }
        // headless Chromium plays any sound; a phone's Chrome refuses sound that no recent tap started. strictAutoplay
        // applies that rule with the browser's own record of taps (navigator.userActivation, set by real clicks)
        if (strictAutoplay && !navigator.userActivation?.isActive) {
          window.__audioEvents.push(["rejected", file, "NotAllowedError"]);
          return Promise.reject(new DOMException("play() can only be started by a tap", "NotAllowedError"));
        }
        const p = play.call(this);
        p.catch((e) => window.__audioEvents.push(["rejected", file, e.name]));
        return p;
      };
      const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => (voices ? [v] : []),
          speak: (u) => {
            window.__spoken.push(u.text);
            window.__asked.push(["voice", u.text]);
            if (!(window.__drop > 0 && window.__drop--)) setTimeout(() => u.onstart?.(), 0);
          },
          cancel: () => undefined,
          resume: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          speaking: false,
          pending: false,
        },
      });
    },
    { advanceMs, dropSpeech, voices, strictAutoplay },
  );
}

/** How many words have been asked for so far (recordings played plus things said). */
export const asked = (page) => page.evaluate(() => window.__asked.length);
export const played = (page) => page.evaluate(() => window.__played.slice());
export const spoken = (page) => page.evaluate(() => window.__spoken.slice());
export const audioEvents = (page) => page.evaluate(() => window.__audioEvents.slice());

/** The word asked for right after the first `n` requests (waits for it): from the recording's file, or from what the voice was asked to say. */
export async function wordAfter(page, n) {
  await page.waitForFunction((k) => window.__asked.length > k, n);
  const [via, value] = await page.evaluate((k) => window.__asked[k], n);
  if (via === "recording") {
    const c = CLIPS.get(value);
    if (!c) throw new Error(`played ${value}, which is not a Spelling Bee recording`);
    return { ...c, via, file: value };
  }
  return { word: value.split(".")[0].trim(), via, script: value };
}

/** Do something, then return the word it made the app ask for. */
export async function after(page, action) {
  const n = await asked(page);
  await action();
  return wordAfter(page, n);
}

/** Click a button by name and return the word asked for next. */
export const clickFor = (page, name) => after(page, () => page.getByRole("button", { name }).click());

/** The word must not be anywhere in the page (text, attributes, title) before it is answered. */
export async function notInPage(page, assert, word) {
  const html = (await page.evaluate(() => document.title + document.body.outerHTML)).toLowerCase();
  assert.ok(!new RegExp(`\\b${word.toLowerCase()}\\b`).test(html), `"${word}" is in the page before it was answered`);
}

/** Wait until the shared audio element has played a file to its end; returns its events. */
export async function waitEnded(page, file, timeout = 15_000) {
  await page.waitForFunction((f) => window.__audioEvents.some(([ev, src]) => ev === "ended" && src === f), file, { timeout });
  return audioEvents(page);
}
