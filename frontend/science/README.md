# OpenPath Science Labs

Branch-only static prototypes. No connection to the main application, sign-in, APIs, or deployment. From the repository root:

```sh
python3 -m http.server --bind 127.0.0.1 --directory frontend/science 4186
# Open http://127.0.0.1:4186/
```

- **Pressure in the Sand:** [lesson and verification](pressure-in-sand/README.md). A same-brick comparison, then a fresh pressure problem.
- **Plant a Seed:** Observe a virtual bean from first root to shoot. Simulated time advances only when the learner chooses to water or wait. Damp soil without a puddle supports growth; overwatering and dryness can both pause growth in the model. Leaving an overwatered pot alone lets it drain. These short simulated timings are teaching choices, not expected real-world days or watering advice. Plant type, conditions, and containers change real timing.
- Germination sequence: [Penn State Extension's Mighty Seed Activity](https://extension.psu.edu/growing-gardeners-mighty-seed-activity); watering frequency and drainage: [University of Minnesota Extension's bean guide](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-beans).

The bean exercise stores only its synthetic day, stage counter and moisture in this browser, with no identifiers and no transfer result saved. It still works if browser storage is blocked; reload cannot resume in that case. Pressure makes no browser storage writes. Nothing is sent. Neither lab infers mastery.

```sh
cd frontend
node --test science/*/model.test.mjs
# Uses the repository's existing dependencies:
npx playwright install chromium
node --test e2e/science-*.test.mjs
```
