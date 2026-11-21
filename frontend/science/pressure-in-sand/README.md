# Pressure in the Sand

A standalone OpenPath science prototype, not linked from the live app. From the repository root:

```sh
python3 -m http.server --bind 127.0.0.1 --directory frontend/science 4186
# Open http://127.0.0.1:4186/pressure-in-sand/
```

The lesson works from static files: no API, credentials, analytics, storage, learner profile or new dependencies. Reload restarts the lab. Files must be served over HTTP because the lab uses browser JavaScript modules.

1. Optionally drop and lift a brick or feather. These toy imprints are qualitative; impact is not the static-pressure experiment.
2. Predict, then lower the same 12 N brick onto fresh sand in each trial. Wide: 60 cm² and 2 kPa; narrow: 30 cm² and 4 kPa. The drawing exaggerates the imprints and is not a sand deformation model.
3. Choose feet and a reason for a heavy stand; no hint appears until the first answer. Try again after feedback for practice. The page makes no mastery claim.

Tap/click or use Tab, arrow keys and Enter/Space; no drag is required. Reduced motion shows the final state without transitions.

```sh
cd frontend
node --test science/pressure-in-sand/model.test.mjs
# Browser check with the repo's dependencies installed:
npx playwright install chromium
node --test e2e/science-pressure.test.mjs
```

The browser test serves only the static science fixture and exercises the learner journey at 390 CSS px. No deploy is configured.
