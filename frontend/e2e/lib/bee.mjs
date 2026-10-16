/**
 * Shared helpers for the Spelling Bee browser tests.
 *
 * Words are said with the browser's own speech (speechSynthesis). Headless Chromium has no voices and no sound, so a
 * stand-in speechSynthesis replaces it before the app loads. It behaves like the ones on phones, as configured:
 *
 *   voices        "en" (one local en-GB voice listed), "none" (an empty voice list, like many Samsung phones), or
 *                 "later": the list is empty until the test calls window.__listVoices(), then the voice appears and
 *                 "voiceschanged" fires (voices that load late)
 *   needsTap      refuse speech ("not-allowed") unless a real tap or key press came in the last 5 s, the rule Chrome on a
 *                 phone applies (navigator.userActivation cannot be used to judge it here: Playwright's own page
 *                 evaluations count as user gestures)
 *   failures      the next N utterances fail with "synthesis-failed"
 *   voiceFails    every utterance with a chosen voice fails (the default voice still works)
 *   silent        the next N utterances are silently dropped: no start, no error (a cold start on some phones)
 *   noSpeech      the browser has no speechSynthesis at all
 *   speakMs       how long each utterance "speaks" for
 *
 * It records what it was asked to say (text, chosen voice, language, what happened) and counts overlaps: speak() called
 * while another utterance is still speaking and was not cancelled first. It proves what the app asked for, not that a
 * phone's voice says it. Which word is being asked is learnt only from what the app asked to be said, never from the page.
 */

export async function install(context, { advanceMs = 600_000, voices = "en", needsTap = false, failures = 0, voiceFails = false, silent = 0, noSpeech = false, speakMs = 300 } = {}) {
  await context.addInitScript(
    ({ advanceMs, voices, needsTap, failures, voiceFails, silent, noSpeech, speakMs }) => {
      if (advanceMs !== null) window.__beeAdvanceMs = advanceMs;
      window.__said = [];
      window.__overlaps = 0;
      window.__fail = failures;
      window.__silent = silent;
      if (noSpeech) {
        // as in a browser without it: the names are not there at all
        delete window.speechSynthesis;
        delete Window.prototype.speechSynthesis;
        delete window.SpeechSynthesisUtterance;
        delete window.SpeechSynthesisErrorEvent;
        return;
      }
      let lastTap = -1e9;
      for (const t of ["pointerdown", "keydown", "click"]) window.addEventListener(t, (e) => e.isTrusted && (lastTap = performance.now()), true);
      const v = { name: "Test English (UK)", lang: "en-GB", localService: true, default: true, voiceURI: "test-en-gb" };
      let listed = voices === "en";
      const listeners = new Set();
      window.__listVoices = () => {
        listed = true;
        listeners.forEach((f) => f(new Event("voiceschanged")));
      };
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
          this.voice = null;
          this.lang = "";
        }
      };
      let current = null; // the utterance speaking now
      let timer = null;
      const synth = {
        speaking: false,
        pending: false,
        getVoices: () => (listed ? [v] : []),
        addEventListener: (t, f) => t === "voiceschanged" && listeners.add(f),
        removeEventListener: (t, f) => listeners.delete(f),
        resume: () => undefined,
        cancel: () => {
          if (!current) return;
          const u = current;
          current = null;
          clearTimeout(timer);
          synth.speaking = false;
          u.onerror?.({ error: "interrupted" });
        },
        speak: (u) => {
          const rec = { text: u.text, voice: u.voice ? u.voice.name : null, lang: u.lang, outcome: "" };
          window.__said.push(rec);
          if (current) window.__overlaps++;
          const fail = (error) => {
            rec.outcome = error;
            setTimeout(() => u.onerror?.({ error }), 5);
          };
          if (needsTap && performance.now() - lastTap > 5000) return fail("not-allowed");
          if (voiceFails && u.voice) return fail("synthesis-failed");
          if (window.__fail > 0) {
            window.__fail--;
            return fail("synthesis-failed");
          }
          if (window.__silent > 0) {
            window.__silent--;
            rec.outcome = "dropped";
            return;
          }
          rec.outcome = "spoken";
          current = u;
          synth.speaking = true;
          setTimeout(() => current === u && u.onstart?.(), 5);
          timer = setTimeout(() => {
            if (current !== u) return;
            current = null;
            synth.speaking = false;
            u.onend?.();
          }, speakMs);
        },
      };
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: synth });
    },
    { advanceMs, voices, needsTap, failures, voiceFails, silent, noSpeech, speakMs },
  );
}

/** Everything the app asked to be said: [{ text, voice, lang, outcome }]. */
export const said = (page) => page.evaluate(() => window.__said.slice());
/** Only the texts that were actually spoken. */
export const spoken = (page) => page.evaluate(() => window.__said.filter((s) => s.outcome === "spoken").map((s) => s.text));
export const overlaps = (page) => page.evaluate(() => window.__overlaps);
export const asked = (page) => page.evaluate(() => window.__said.length);

/** The word in the first utterance spoken after the first `n` requests (waits for it). */
export async function wordAfter(page, n) {
  await page.waitForFunction((k) => window.__said.slice(k).some((s) => s.outcome === "spoken"), n);
  const s = await page.evaluate((k) => window.__said.slice(k).find((x) => x.outcome === "spoken"), n);
  return { word: s.text.split(".")[0].trim(), script: s.text, voice: s.voice, lang: s.lang };
}

/** Do something, then return the word it made the app say. */
export async function after(page, action) {
  const n = await asked(page);
  await action();
  return wordAfter(page, n);
}

/** Click a button by name and return the word said next. */
export const clickFor = (page, name) => after(page, () => page.getByRole("button", { name }).click());

/** The word must not be anywhere in the page (text, attributes, title) before it is answered. */
export async function notInPage(page, assert, word) {
  const html = (await page.evaluate(() => document.title + document.body.outerHTML)).toLowerCase();
  assert.ok(!new RegExp(`\\b${word.toLowerCase()}\\b`).test(html), `"${word}" is in the page before it was answered`);
}
