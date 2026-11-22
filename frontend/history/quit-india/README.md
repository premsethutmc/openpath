# The Morning After

Playable standalone Quit India episode. The main path covers the Dandi-to-1942 bridge, failed Cripps talks, Wardha, the August 8 Bombay resolution, the August 9 arrests, Congress Radio, local responses, repression, significance and a separate 1947 ending. Children can open historical evidence, tune the radio, explore four local cases and compare their own retelling. The core story remains understandable without opening extras or turning on sound. No quiz gates, backend, sign-in, storage or paid runtime calls. See the [chapter map](../../../docs/product/history/gandhi-mass-movement.md).

Serve this directory with a static HTTP server or run `python3 package.py The-Morning-After.html` here for an offline single file. In the repository setting the end links back to the existing Dandi journey; this change does not edit that lesson.

## Historical presentation

The images are generated photographic reconstructions, not documentary images. The child observer, props and exact visible scene are imagined. Sound is off by default. Opt in for the pre-rendered Indian English narration, synthetic radio static, and a short, band-limited reenactment of the Congress Radio station identification when you find the signal. No voice imitates a real historical figure. All audio is bundled, and the narration transcript and radio caption are usable without sound. In the station identification, the transcription follows the English wording recorded in the [archival study](https://doi.org/10.1017/S0026749X2200049X); both the caption and the reenactment use this wording, not archival audio. Local reception was uneven; the Tamil Nadu scene does not assert a reception path. The location graphic is a schematic locator, not a historical boundary map.

Primary sources linked within the scene include the British proposal, the Congress reply, the Mani Bhavan speech transcript and Gandhi Heritage chronology, the National Archives exhibit and Tamil Nadu Class X textbook. The lesson distinguishes Gandhi’s nonviolent appeal from varied local actions and repression, and does not depict or reward harm. This is the Quit India episode, not a full Gandhi biography, a replacement Dandi build or a completed Non-Cooperation lesson.

## Verify

From `frontend`, run `node --test history/quit-india/story.test.mjs` and `node --test --test-timeout=40000 e2e/history-quit-india.test.mjs` with Playwright Chromium installed. The browser suite covers touchscreen tuning, navigating every scene, date and evidence content, the Tamil Nadu card, mute/reduced motion, keyboard access, revisit, and replay at 320/390 pixels. This is not a physical Android test.
