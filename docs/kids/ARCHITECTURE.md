# OpenPath Kids — architecture

OpenPath Kids is an independent product inside the OpenPath repository: a player for short interactive
cartoons for children of about 3–7. Its first recurring character is Chintoo, a chubby cat, and its first
episode is *Chintoo and the Apple Tree*.

It lives entirely in `kids/`. It imports nothing from `frontend/`, `packages/` or `backend/`, and nothing
there imports it. It has no server, no account and no network access.

```
kids/
  episodes/                     authored episodes (JSON) — the only thing a new episode needs
  src/engine/                   story engine: format, validator, runner, clocks, primitives, events (no DOM)
  src/art/                      character rigs, scenes and props (layered SVG) + the art catalogue
  src/player/                   browser player: stage, actors, motion, audio, the child-facing shell
  e2e/walkthrough.test.mjs      Playwright walkthrough at Android phone and tablet sizes
  scripts/                      build (one self-contained HTML file), serve, validate
```

## How a story plays

Each episode follows **story → opportunity to interact → natural consequence → story continues**.

```
episode JSON ──► Runner ──perform(step)──► Stage (Director) ──► SVG + Web Animations + speech
                  │  ▲                         │
                  │  └──── touches ◄───────────┘  (only while an interaction window is open)
                  ├── Clock (story time: real & pausable in the browser, virtual in tests)
                  └── LearningEventSink (what happened in each window; never mastery)
```

- **Runner** (`src/engine/runner.ts`) walks the episode's tracks step by step. It owns all timing: every
  step lasts the time the episode gives it (or a fixed default from `timing.ts`), never "until the animation
  ends" or "until the voice stops". That makes playback deterministic and testable, and identical on a fast
  tablet and a slow phone.
- **Interaction windows** are `interact` steps. While one is open the child may touch its targets. A
  **primitive** (`primitives.ts`) — a small pure state machine — decides when the window has an outcome.
  Every primitive has a `timeout` outcome, and the validator refuses an episode unless every outcome leads
  to a track. So the story always carries on by itself: there is no failure screen, no forced answer and
  no waiting forever.
- **Natural consequences** are just tracks: if the child taps an apple, the bird picks *that* apple
  (`bind` remembers the choice as `$choice`, and lines can say `{choice.colour}`); if nobody taps, an apple
  falls into the mud, Chintoo washes it and eats it. Both lead back into the same story.
- **Stage** (`src/player/stage.ts`) is the only code that touches the DOM. It implements the runner's
  `Director` interface: `perform(step, ms)`, `openWindow(...)`, `feedback(...)`. It never decides what
  happens next.

## Choice of renderer

The brief asked to evaluate Phaser, PixiJS and simpler browser-native approaches and to choose the smallest
maintainable one that plays smoothly on inexpensive Android devices.

| | Phaser | PixiJS | **Browser-native SVG + Web Animations API (chosen)** |
|---|---|---|---|
| What it is | Full game framework (scenes, physics, input, audio, tweens) | Fast 2D WebGL/canvas renderer | The browser's own vector rendering and animation engine |
| Download | Hundreds of kB of library before any content | Smaller, still hundreds of kB, plus a tween library | No library. The whole player, art and episode are about 100 kB in one HTML file |
| Fit for this content | Built for games with many moving sprites; most of it unused | Good for many sprites and particles | A few layered characters, props and scenes — well within what SVG handles |
| Art | Raster textures (vector art must be baked to bitmaps per resolution) | Same; SVG support is partial | Vector art stays crisp on every screen density; an illustrator's layered SVG drops in |
| Pause, speed, reduced motion | Its own clock | Its own ticker | `Animation.pause()`, playback rate and CSS media queries, built in |
| Touch, accessibility, testing | Canvas: touch areas and labels by hand, opaque to tests | Canvas: same | Real DOM elements: aria labels, Playwright selectors, large hit circles |
| Risk on cheap Android | Low frame cost, WebGL context loss to handle | Same | Few nodes; transforms and opacity only (GPU-composited); no filters or blurs |

So the player is browser-native: SVG for drawing, the Web Animations API for motion, CSS for ambient
movement, `speechSynthesis` for placeholder voices and Web Audio for small synthesised sound effects. There
is **no custom animation engine**: `src/player/motion.ts` is a 90-line wrapper that scales durations and
pauses everything together.

**When to revisit.** If a future episode needs hundreds of simultaneous sprites, particle effects or
frame-by-frame bitmap animation, PixiJS can be put behind the same `Director` interface; episodes would not
change. If the illustrator delivers rigs authored in Rive or Spine, their runtimes can render a character
inside the stage the same way. Neither is needed now, and neither involves licences or paid services today.

**Device performance.** Measured in headless Chromium at an Android phone viewport (915 × 412, device pixel
ratio 2.6) with DevTools CPU throttling, over 45 s of the garden scene (walking, flying, ambient motion):
4× slower CPU, 59 frames a second with no frame over 50 ms; 6× slower CPU, 57 frames a second with 4 frames
over 50 ms (`node scripts/dev/frames.mjs 6 45`). This is an emulation. It has **not yet been verified on a
physical inexpensive Android phone**; that check is listed in the PR as outstanding.

## Characters are rigs, not pictures

Chintoo and Mina (the myna bird) are layered SVG rigs (`src/art/chintoo.ts`, `src/art/bird.ts`). Each moving
part — head, ears, eyes, pupils, eyelids, brows, mouths, arms, feet, tail, scarf; for Mina head, beak, wings,
tail — is its own group with a pivot point. Actions in `src/player/actors.ts` move parts with keyframes:

- **Genuinely animated (continuous keyframed motion of parts):** walking (feet step, body bobs, arms and
  tail swing while the body travels), flying (wing beats, body tilt, travel along an arc), jumping with
  squash and stretch, hopping, looking (pupils and head turn toward a place), blinking, ear twitches,
  breathing, tail sway, waking and stretching, yawning, rubbing the tummy, picking up, eating (the apple
  goes to the mouth and shrinks bite by bite), washing (dipping three times), pecking, waving, pointing,
  dancing, turning around, apples wobbling and falling with a bounce, clouds, sun, leaves, grass, flowers,
  curtains, butterflies and bird-bath ripples.
- **Swapped, not animated (instant changes between drawn states):** mouth shapes (smile, open, sad, "o",
  yuck), closed eyes, and the muddy/clean apple. Talking flaps between the current mouth and an open mouth.
- **Static:** the backgrounds' buildings, fence, tree trunk and bird bath.

Moods (`happy`, `sad`, `surprised`, `hungry`, `sleepy`, `yuck`, `proud`, `neutral`) are a data attribute on
the rig; CSS picks the matching mouth, eyes and brows.

### Replacing the art

The current artwork is original and consistent, but it is code-drawn vector art, not the final illustrated
production standard. It is deliberately modular so an illustrator can replace it without touching the
player or any episode:

1. Draw each part on its own layer and export it as SVG groups with the same class names
   (`head`, `ear-l`, `eye-l`, `pupil`, `arm-r`, `foot-l`, `tail`, `mouth-smile`, ...).
2. Keep the pivots in `CHINTOO_PIVOTS` / `BIRD_PIVOTS` (or update those numbers to the new drawing).
3. Keep the hold point (`CHINTOO_HOLD`), which is where a held object sits.

Scenes and props are the same: a scene is a string of SVG with optional `amb-*` groups for gentle ambient
motion; a prop is an SVG group per look (variant). `src/art/catalogue.ts` lists what exists, and the
validator checks episodes against it.

## Learning interactions

All eight primitives from the brief are implemented as pure, tested state machines:

| Primitive | Child does | Outcomes |
|---|---|---|
| `tap` | taps any target | `tapped`, `timeout` |
| `count` | taps each target once; a number appears and is spoken | `counted`, `timeout` |
| `drag` | drags a target onto `params.zone` | `placed`, `timeout` (a miss glides back) |
| `choose-colour` | taps a target; tag `colour` vs `params.colour` | `match`, `other`, `timeout` |
| `match-shape` | as above with `shape` | `match`, `other`, `timeout` |
| `identify-animal` | as above with `animal` | `match`, `other`, `timeout` |
| `compare` | taps the group with more/fewer/bigger/smaller (`params.want`, `params.by`) | `match`, `other`, `timeout` |
| `observe` | may tap the cause to make it happen now | `triggered`, `timeout` |

A different choice is never "wrong": it is the `other` outcome and gets its own warm branch. The first
episode uses `tap` and `count`, plus cause and effect told through the story itself (the apple falls in
the mud). `src/engine/fixtures/sample-primitives.json` uses every primitive and is played in the tests.
The player supports tap-style primitives and drag; drawing assets for balls, shapes, animals and plates
is future art work.

## Integration with OpenPath

OpenPath Kids reports what happened in each interaction window through `LearningEventSink`
(`src/engine/events.ts`):

```ts
{ schema: "openpath-kids/learning-event@1", episode, interaction, primitive, objective, level,
  outcome, engaged, touched, openFor, evidence: "exposure" | "participation", claimsMastery: false }
```

- `exposure`: the window closed by itself; the child saw the concept.
- `participation`: the child touched something.
- `claimsMastery` is the literal type `false`. Watching an animation or tapping an object is never mastery.

The prototype uses an in-memory sink and keeps nothing. A future adapter can forward events to OpenPath's
competency system as weak observations; deciding how (or whether) they count toward a capability belongs to
OpenPath's existing evidence and verification rules, which this change does not touch. Events contain no
child identity.

## Child experience safeguards

- One big play button to start; minimal text (short speech bubbles; the storyteller's lines as a caption).
- Spoken dialogue on the device (placeholder voices until the family voice system); sound button always on
  screen; nothing plays until the child presses play.
- Large touch areas: at least 68 px on screen, grown to fill the space between targets.
- No ads, no external links, no network requests (enforced by a Content-Security-Policy with
  `connect-src 'none'`), no account, no camera or microphone, no personal data.
- No punishment, no timers on screen, no hurry: windows are at least 6 seconds (the first episode uses
  18–28 seconds), with a gentle hint (a look, a wobble, a spoken nudge) after a pause.
- No flashing: scene changes fade through warm white; highlights pulse slowly.
- Reduced motion: follows the device setting, or a grown-up switch; it stops ambient motion and bouncing,
  while the story still plays.
- Pause button, and the story pauses itself when the app goes to the background.
- Grown-up settings (age level, reduced motion, sound, start again) open only with a one-second press.

## Difficulty by developmental level

Steps can carry `"level": ["younger"]` or `["older"]`. In the first episode, younger children (about 3–4)
count three apples; older children (about 5–7) see three apples "and two more", count five, and hear
"three and two make five".
