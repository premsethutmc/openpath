# Walk to Dandi: cinematic first-person cut

Open `index.html` through any static server. For a self-contained offline copy, run `python3 package.py Walk-to-Dandi-First-Person.html` in this directory. It has no log-in, external media requests, microphone, data collection, or paid runtime dependencies.

Play the 1930 archive opening or skip to the road. The interactive edit leaves the archive picture on the Gandhi profile before the original credit card; credits live beneath the scene. The standalone accepted film is unchanged. On the road, Walk and Stop control a short first-person camera move, not a full 3D walk. Look right (or swipe left across the image or press Right), then ask “Why salt?” if you want. Matching generated stills simulate the companion showing the pouch; the voice is a temporary synthesized performance, not lip-synced. The caption works muted. Pause/replay and soft footsteps are part of the handoff. Reduced-motion mode uses fixed cuts. No interaction is mandatory.

## Media provenance

- Opening: the same OpenPath 21.5 s archival edit, transcoded for a web player in H.264/AAC and VP9/Opus. Source: [Wikimedia/GandhiServe Salt March compilation](https://commons.wikimedia.org/wiki/File:Salt_March.ogv), listed there as public domain in India and the US. Modern synthesized score and footsteps; original archival audio not reused. Neither archive clip nor current reconstruction purports to show exact geography of the footage.
- Road: a fictional child’s view and an imagined marcher approaching Aslali, 12 March 1930. The [Gandhi Heritage Portal chronology](https://www.gandhiheritageportal.org/dandi-march-details) supports the date and first halt. The line paraphrases the salt-tax argument in Gandhi’s letter of 2 March to the viceroy, reproduced in [Sushila Nayar, vol. VI](https://www.mkgandhi.org/ebks/Mahatma-Gandhi-Sushila-Nayar-volume6.pdf). It is not a historical quote from this fictional person.
- The two monochrome OpenPath-generated stills are deliberately labeled as reconstruction. English scratch voices rendered locally with FFmpeg/Flite. Gandhi is neither rendered nor impersonated.
- Verification: `node --test --test-timeout=40000 e2e/history-dandi-first-person.test.mjs` from `frontend` with Playwright Chromium. Test both real media action and silent keyboard/reduced-motion mode. Hosted touch emulation is not a physical Android run.
