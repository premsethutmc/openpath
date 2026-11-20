# OpenPath Science Labs

Branch-only static prototypes. No connection to the main application, sign-in or APIs. From the repository root:

```sh
python3 -m http.server --bind 127.0.0.1 --directory frontend/science 4186
# Open http://127.0.0.1:4186/
```

- **Pressure in the Sand:** [lesson and verification](pressure-in-sand/README.md). A same-brick comparison, then a fresh pressure problem.
- **Prism Lab:** Aim white or red-only light and insert or remove a glass prism. The screen gives a close-up of dispersion. Six sampled colours stand in for a continuous spectrum. The geometry traces refraction at both glass surfaces using illustrative refractive indices. [OpenStax reference](https://openstax.org/books/physics/pages/16-2-refraction).
- **Plant a Seed:** Place and cover a virtual bean, lock a prediction, then open the soil window to discover a root before a shoot is visible. The learner checks the soil, chooses to water or wait, and taps Next day. Two fresh challenges separately check moisture-based care and how to find evidence of growth when the surface is bare. Damp soil without a puddle supports growth; overwatering and dryness can both pause growth in the model. Leaving an overwatered pot alone lets it drain. These short simulated timings are teaching choices, not expected real-world days or watering advice. Plant type, conditions, and containers change real timing.
- **Flower to Seed (ICSE Class 5):** [Teaching scope and verification](flower-to-seed/README.md). Two compatible mustard plants, a scrub-able flower cutaway, a split-open pod, wind/water/animal experiments, and an interactive growing bed. The Plant a Seed lab is the follow-on for germination.
- **Shadow Lab (ICSE Class 5):** Drag the torch to grow and shrink a rabbit shadow, view the beam from the side, and compare opaque, translucent and transparent cutouts. Uses a centered point-source model with illustrative material properties, not real measurements. Covers shadow formation and light transmission, not the full light chapter (which also includes eclipses and day/night). No saved data.
- Germination sequence: [Penn State Extension's Mighty Seed Activity](https://extension.psu.edu/growing-gardeners-mighty-seed-activity); watering frequency and drainage: [University of Minnesota Extension's bean guide](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/growing-beans).

The bean exercise stores only its synthetic day, stage counter, moisture, locked prediction and first-root observation in this browser, with no identifiers and no transfer result saved. It still works if browser storage is blocked; reload cannot resume in that case. Pressure makes no browser storage writes. Nothing is sent. None of the labs infer mastery. Prism does not use browser storage.

```sh
cd frontend
node --test science/*/model.test.mjs
# Uses the repository's existing dependencies:
npx playwright install chromium
node --test e2e/science-*.test.mjs
```

### Lift the Rock

A Class 5 introduction to the first-class lever. On the same beam, move the
support and lift the same rock to the same height. The push meter decreases as
the hand-travel meter increases. Drag the drawn support and handle, or use the
range and Push button. The previous lift leaves a small hand-height marker.
This is a simplified lossless, massless beam model, not a measurement of finger
pressure. At 40/60 cm the required push is 16 N over 6 cm; at 20/80 cm it is 6 N
over 16 cm for the same ideal work of 0.96 J. No backend or external assets.
