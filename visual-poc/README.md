# Visual-quality proof of concept: Amma at home

One 15–20 second interactive scene, built to answer one question: can OpenPath look and move
like a produced children's game? Nothing here is connected to the learning platform, the
assessment engine or the earlier prototype.

**The scene.** Amma walks in from the inner room toward the child, sees them, smiles and waves,
picks up her yellow cloth bag (manjappai) from the stool, takes out her list (a numeral 5 and an
apple, nothing else), and says a short line in Tamil. After that she waits, and answers taps:

- tap Amma: she asks "என்ன செல்லம்?" (what is it, darling?) or giggles, alternately
- tap the list: she holds it closer, the apple bounces, and she says "இத்தனை ஆப்பிள் வேண்டும்!" (we need this many apples) without saying the number

## Play it

`dist/standalone.html` is the whole scene in one file. Open it in a browser.

To rebuild after a change:

```
npm install            # esbuild and playwright (dev only)
npm run build          # bundles src/ and public/assets into dist/
```

`npm run art` re-bakes the artwork (needs Playwright's Chromium, Python 3 with Pillow and NumPy).
`npm run voice` re-synthesises the placeholder voice (needs the helper in `tools/tts`, built against eSpeak NG).
Baked textures and voice files are committed, so neither is needed just to build.

This folder has no lockfile yet: it was written in a sandbox that cannot reach the npm registry.
Run `npm install` once on a normal machine and commit the lockfile it writes.

## How it is made

```
art/*.mjs          layered illustration: every layer of the room and the character, with pivots
   │  tools/bake.mjs    each layer rendered to its own transparent raster image, with form
   │                    shading, soft edges, pigment mottle and grain applied at bake time
   │  tools/pack.py     character layers packed into one texture atlas (WebP) + atlas.json
   ▼
public/assets/     what the game loads: mom.webp, l_*.webp, atlas.json, voice_*.wav, voices.json
   ▼
src/amma.js        the rig: bones, bending meshes (arms, braid, saree), expression sets, springs
src/main.js        the room, the camera, the script of the scene, tap reactions
src/audio.js       voice playback and lip-sync from phoneme timings; effects fired by the animation
src/kit.js         easing, springs, cancellable scripts, mesh and chain helpers
```

The runtime never draws the artwork. It loads raster layers and moves them: 39 layers in the
character atlas (including 6 mouth shapes, 4 eye states and 4 hand poses) and 9 room layers at
different depths.

What makes it move like a character rather than a puppet:

- arms, the braid and the hanging end of the saree are meshes bent along a spine, not rigid sticks
- the braid, saree end, earrings and bag are simulated, so they lag, swing and settle when she stops
- the skirt is a deforming sheet pushed by each step
- head turns slide the features across the face; eyes lead, then the head follows; she blinks on glance changes
- every move has an anticipation or an overshoot, from eased curves and damped springs
- speech drives mouth shapes from phoneme timings, read from the audio clock so lips and sound cannot drift
- footsteps, anklet, bangles, cloth and paper sounds are fired by the motion that causes them

## What moves, and how

Nothing in the scene crossfades between drawings.

| | Elements |
| --- | --- |
| **Animated continuously** (computed every frame) | Her path and size as she approaches; hips, chest and head; both arms (two-bone reach with a bending mesh, so elbows curve); shoulders lifting; breathing in the torso; the saree skirt (a deforming sheet); gaze (the irises move inside the eyes); eyebrows; head turns (features slide across the face); the list's size and tilt, the apple's bounce; the camera, floor reflection, swing, garden, dust and light beams |
| **Simulated** (physics, never the same twice) | Braid, hanging end of the saree, earrings, the bag swinging from her hand, the settle of body and hem when she stops |
| **Swapped drawings** (frame sequences) | Mouth: 6 shapes, chosen by the speech sounds and eased in. Eyelids: open, half, closed, plus a smiling-shut shape; a blink is three frames. Hands: relaxed, open, gripping |
| **Static** | The room's painted layers (they only shift with the camera); her face base, hair cap and jasmine; the torso drawing (it tilts, breathes and travels but does not twist); her feet (they lift and travel; there are no legs under the saree) |

To record the scene as a video, frame by frame with its soundtrack: `npm run record` (needs ffmpeg).

## What is real and what is a placeholder

| Part | Status |
| --- | --- |
| Illustration | Authored in code and baked to raster layers. Not hand-painted by an illustrator. The layer list, pivots and atlas format are what an illustrator would deliver into. |
| Animation | Real: this is the motion, timing and interaction proposed. Authored in code, which does not scale; see the technology note. |
| Voice | Machine placeholder (eSpeak NG, Tamil). To be replaced by the family voice system. |
| Tamil wording | Written by the engineer. Needs a native speaker's review before any child hears it. |
| Sound effects | Synthesised in the browser. Levels are conservative; they have not been reviewed by ear. |
| Performance | Light by construction (about 90 sprites, 5 small meshes, no filters, one extra pass for the floor reflection). Not yet measured on real phones. |

Technology choice and what a production pipeline would need: [docs/technology-evaluation.md](docs/technology-evaluation.md).

Third-party code: PixiJS 7.4.2 and its `unsafe-eval` patch (both MIT) in `vendor/`.
