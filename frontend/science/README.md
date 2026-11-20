# OpenPath Science Labs

Branch-only static prototypes. No connection to the main application, sign-in or APIs. From the repository root:

```sh
python3 -m http.server --bind 127.0.0.1 --directory frontend/science 4186
# Open http://127.0.0.1:4186/
```

- **Pressure in the Sand:** [lesson and verification](pressure-in-sand/README.md). A same-brick comparison, then a fresh pressure problem.
- **Prism Lab:** Aim white or red-only light and insert or remove a glass prism. The screen gives a close-up of dispersion. Six sampled colours stand in for a continuous spectrum. The geometry traces refraction at both glass surfaces using illustrative refractive indices. [OpenStax reference](https://openstax.org/books/physics/pages/16-2-refraction).
- **Plant a Seed:** Place and cover a virtual bean, lock a prediction, then open the soil window to discover a root before a shoot is visible. The learner checks the soil, chooses to water or wait, and taps Next day. Two fresh challenges separately check moisture-based care and how to find evidence of growth when the surface is bare. Damp soil without a puddle supports growth; overwatering and dryness can both pause growth in the model. Leaving an overwatered pot alone lets it drain. These short simulated timings are teaching choices, not expected real-world days or watering advice. Plant type, conditions, and containers change real timing.
- Germination sequence: [Penn State Extension's Mighty Seed Activity](https://extension.psu.edu/growing-gardeners-mighty-seed-activity); watering frequency and drainage: [University of Minnesota Extension's bean guide](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-beans).

The bean exercise stores only its synthetic day, stage counter, moisture, locked prediction and first-root observation in this browser, with no identifiers and no transfer result saved. It still works if browser storage is blocked; reload cannot resume in that case. Pressure makes no browser storage writes. Nothing is sent. None of the labs infer mastery. Prism does not use browser storage.

```sh
cd frontend
node --test science/*/model.test.mjs
# Uses the repository's existing dependencies:
npx playwright install chromium
node --test e2e/science-*.test.mjs
```
