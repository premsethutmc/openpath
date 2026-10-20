# Approved mathematics notebook — implemented learner interface

Branch: `feat/approved-mathematics-notebook-v1`. The supplied [approved reference](approved-reference.jpg) supersedes the earlier design proposals under `docs/design/`. These are **actual browser screenshots from My Learning Year connected to Django**, not mockups or fulfilled learner APIs.

## Six mobile screenshots

| State | 360 × 800 CSS pixels | 393 × 852 CSS pixels |
| --- | --- | --- |
| Working, with original working retained and an earlier quotient selected | [Screenshot](working-360.png) · [Reference comparison](compare-working-360.png) | [Screenshot](working-393.png) · [Reference comparison](compare-working-393.png) |
| Incorrect multiplication row and compact contextual help | [Screenshot](mistake-360.png) · [Reference comparison](compare-mistake-360.png) | [Screenshot](mistake-393.png) · [Reference comparison](compare-mistake-393.png) |
| Complete: 126 remainder 1 | [Screenshot](completed-360.png) · [Reference comparison](compare-completed-360.png) | [Screenshot](completed-393.png) · [Reference comparison](compare-completed-393.png) |

All three states together: [360px gallery](actual-states-360.png) · [393px gallery](actual-states-393.png).

Reference comparisons retain the supplied phone image, including its bezel and operating-system chrome. Actual captures contain the browser application viewport only. Screenshots are not retouched. `compare-screens.py` places them beside the supplied reference, rescaling only the reference crop.

## Typography and visual implementation

**Kalam Light (300), 38px**, Latin WOFF2 from `@fontsource/kalam@5.3.0` / Google Fonts Kalam v18. Copyright 2014 Indian Type Foundry; **SIL Open Font License 1.1**. The unmodified binary and full licence are vendored under `frontend/src/writing/fonts/`. The licence also ships next to `/year/` and the existing writing entry. No font CDN, paid provider, new runtime npm dependency or handwriting-recognition substitution is involved.

Evaluated Caveat, Kalam and Patrick Hand against `379 ÷ 3`, `126`, `1005`, `432`, products `18`, `36`, `96` and all digits: [family comparison](font-comparison.png). A browser/reference comparison showed Kalam Regular was too heavy, so the final choice uses the Light weight: [weight comparison](font-weight-comparison.png). UI text uses the existing clean system sans-serif, separately from mathematical numerals. See [font provenance, licence and hash](../../../../frontend/src/writing/fonts/README.md).

Every visible digit, including each digit of a multi-digit product, occupies an explicit 50px grid column. Glyph widths deliberately need not match; tests verify that they vary and that column alignment remains correct. Rows use a shared 56px pitch, reduced to 52px in short viewports. Brackets and subtraction rules use that same grid. Wider problems scroll within the paper rather than shrinking touch targets or overflowing the page.

The approved composition is implemented with scoped notebook tokens: warm `#FBFAF6` paper, dark `#1D2130` ink, purple focus/action colours, restrained rose error outline and help surface, and compact pale-green success confirmation. There is no giant calculation card, gradient, custom keypad, learner-name banner or permanent Save/disclaimer stack on the default exercise screen. Existing account/demo controls, final-answer mode, guided worksheet and provisional-practice details remain accessible in the overflow menu. Explicit save failures remain visible.

Write opens the existing scribbler. Hint invokes existing, recorded support without obscuring the calculation or requiring navigation away from it. Wrong answers retain the existing deterministic recovery policy. Try again preserves all working. The single completion action uses the **unchanged existing practice variations** already used by final-answer mode; the variation helper was extracted for reuse, not replaced. Exhaustive round checks cover the existing 0–99 range. Next question starts a separately saved draft and retains the completed original. Its existing practice-round navigation metadata is saved through the existing draft action, so closing the application and re-entering through the demo button resumes the new question too; it does not create assessment evidence. No question families, curriculum, estimator, backend state machine or evidence eligibility/mastery rules changed.

## Actual verification

- Django: **241 passed** in the existing isolated test database; no backend source changes.
- Frontend unit tests: **427 passed**, including English/Tamil and the shared existing practice-variation checks.
- All four TypeScript configurations passed. The font-asset build and unchanged practice-variation contract test also passed separately under Node 22.18.0; the full host frontend suite used Node 24.
- Integrated frontend and Tamil packaging passed using the same frontend build/copy sequence as `deploy/preview/Dockerfile`; the self-hosted WOFF2 and licence are included. The Docker image itself was not rebuilt for this visual change.
- Progressive, recovery, demo, final-answer and alternate-input regressions: **14 browser checks passed**. These exercise continuous entry, zero and multi-digit products, six division problems, Backspace, earlier corrections, recognition fallback, saved state and isolated demo reset.
- Approved-design capture/interaction tests: **3 passed**. They cover both mobile widths, actual local font loading and MIME, unequal glyph widths with grid alignment, optional hints and focus, incorrect step/retry, reload, completion, separate next-question drafts, and assisted receipts remaining inadmissible. The third test uses a **simulated keyboard-constrained 360×500 viewport**, not a physical Android IME.
- Demo guided/recognition journeys: **4 passed**, including actual ONNX inference, ambiguity clarification, fractions/multiplication and unavailable-recognizer fallback.
- Normal-account/browser and gateway checks: **20 passed** (7 browser checks and 13 gateway/security checks).
- Resume after restarting the local synthetic **Gunicorn worker**: **3 passed** for demo guided work, ordinary account/evidence and progressive paper. The reused test titles mention container restart; this host run restarted the backend worker, not a Render/Docker container.

Total: **31 browser checks + 13 gateway/security checks**, alongside Django, frontend units, typechecks and builds. Initial regression runs found old visible-button/status selectors after controls moved to the menu; they were updated to exercise the same functions through the real new navigation. An initial packaged-route run also found the local Tamil build had not been copied; running the existing Dockerfile's full frontend packaging sequence resolved it. A prolonged capture session reached the existing 100-synthetic-session cap in the earlier local test database. The final capture/regression run used a new isolated local preview database; the cap and existing records were left intact. No tests were disabled and no unrelated research assertions changed.

## Visual review and remaining differences

The six actual captures were compared with the supplied reference, separately from functional testing. Checked handwritten numeral appearance, shared column centres, subtraction rules, header density, purple focus, compact help below working, retained full result, and the quiet bottom controls.

Known differences are deliberate and visible in the side-by-side files:

1. The exact reference font is unidentified. Kalam Light is a licensed close match, not a claim of identical glyphs. Interface text is the requested clean sans-serif rather than the reference image's serif-like lettering.
2. Progress shows the actual working-entry position (out of 9 here), not the reference's unverified `1 / 5` question count. It does not represent mastery.
3. The reference middle panel omits a quotient digit before its second multiplication row and gives an inconsistent example prompt. The real application retains the learner's entered `12`, marks the actual incorrect `5` row, and asks them to check multiplication by the divisor. It never hides mathematical working to imitate an inconsistent image.
4. Native status/navigation bars and the phone frame are absent from browser captures. Bottom controls therefore occupy the browser's useful viewport; vertical space differs from the photographed frame. There is no fabricated Android keyboard overlay. Physical Samsung/Android keyboard and stylus testing remain outstanding.
5. Ink thickness and system-UI letter shapes vary with device rendering. The error marker is darker than the reference's bright coral for readable contrast. No decorative paper texture or gradient was added.

## Run / review

The actual route is `/year/#writing/MATH.number.long-division` after authentication. In the synthetic preview, open `/`, tap **Try OpenPath as a Demo Student**, and the existing demo entry opens this lesson. Ordinary accounts continue through My Learning Year → Mathematics → Long division.

Use the [existing full local preview instructions](../../../deployment/RENDER_PREVIEW.md) to build/start the application with isolated synthetic data. No new environment variables are required. The local reviewer used `http://127.0.0.1:4721/` with the existing synthetic Django service; that loopback URL is not a phone-accessible hosted preview.

To capture the six screens against a running synthetic preview:

```sh
cd frontend
E2E_URL=http://127.0.0.1:4721 CHROMIUM_PATH=/usr/bin/chromium \
  node --test e2e/approved-notebook.test.mjs
cd ..
python docs/product/mathematical-writing/approved-notebook/compare-screens.py
```

The browser test exercises the application, writes screenshots only in this delivery folder, and creates only disposable synthetic demo records. The GitHub workflow runs it with the existing preview smoke suite. Nothing has been merged, deployed, or enabled for real-child use.
