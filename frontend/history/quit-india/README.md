# The Morning After

First playable standalone episode for the Quit India Movement. See the [chapter map and production plan](../../../docs/product/history/gandhi-mass-movement.md). In this version children compare two documents, look towards the August 8 gathering, read the next morning’s arrest notice, tune Congress Radio, explore four regional examples, and reflect on what changed and what did not. The August chronology, sources and short optional comparisons are separate from the interactive scenes. No quiz gates, backend, sign-in, storage or paid runtime calls.

Serve this directory with a static HTTP server or run `python3 package.py The-Morning-After.html` here for an offline single file. In the repository setting the end links back to the existing Dandi journey; this change does not edit that lesson.

## Historical presentation

The images are generated photographic reconstructions, not documentary images. The child observer, props and exact visible scene are imagined. No speech audio or imitation; the radio tone is a quiet synthetic sound effect, off by default. In the station identification, the transcription follows the English wording recorded in the [archival study](https://doi.org/10.1017/S0026749X2200049X); this is a caption, not a historical recording. Local reception was uneven; the Tamil Nadu scene does not assert a reception path. The location graphic is a schematic locator, not a historical boundary map.

Primary sources linked within the scene include the British proposal, the Congress reply, the Mani Bhavan speech transcript and Gandhi Heritage chronology, the National Archives exhibit and Tamil Nadu Class X textbook. The lesson distinguishes Gandhi’s nonviolent appeal from varied local actions and repression, and does not depict or reward harm. This is the Quit India episode, not a full Gandhi biography, a replacement Dandi build or a completed Non-Cooperation lesson.

## Verify

From `frontend`, run `node --test history/quit-india/story.test.mjs` and `node --test --test-timeout=40000 e2e/history-quit-india.test.mjs` with Playwright Chromium installed. The browser suite covers touchscreen tuning, navigating every scene, date and evidence content, the Tamil Nadu card, mute/reduced motion, keyboard access, revisit, and replay at 320/390 pixels. This is not a physical Android test.
