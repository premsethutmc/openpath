# Animation technology: what was evaluated and what was chosen

Prices and plan details checked on 11 October 2026 on the vendors' own pricing pages.

## What this scene needs

1. A character that deforms: bending limbs, hair and cloth with follow-through.
2. Layered raster illustration, so an illustrator's work can be used as delivered.
3. Interaction that changes the animation: reactions to taps, waiting states, interruptions.
4. Audio locked to movement: lip-sync and effects on the frame they belong to.
5. Smooth on ordinary phones, small to download.
6. A path from the web to React Native / Expo, which is the stated mobile stack.
7. A workflow where artists, not engineers, author the animation as the content grows.

## Options

| | Rive | Spine | Phaser | PixiJS + a small rig of our own |
| --- | --- | --- | --- | --- |
| What it is | Editor plus runtimes for interactive animation | Editor plus runtimes for skeletal animation | Game framework | Renderer; the rig is our code |
| Deforming meshes, bones | Yes | Yes, the strongest of the four | Only through Spine | Yes, written by hand |
| Interaction logic | Built in: state machines, tap listeners, inputs | In application code | In application code | In application code |
| Audio | Audio events on the timeline | Events on the timeline, played by the app | Full audio system | Web Audio, by hand |
| React Native | Official runtime | Not confirmed (web, Unity, Flutter and native runtimes exist) | WebView only | WebView only |
| Who authors animation | Animator, in the editor | Animator, in the editor | n/a | Engineer, in code |
| Cost | Free plan cannot export for the runtimes; Cadet is $17 per seat per month or $108 per year | Essential $69 (no meshes); Professional $379 per user; Enterprise from $2,499 + $379 per user once revenue reaches $500k | Free | Free |
| Runtime licence | Open source | Requires a Spine licence | MIT | MIT |

## Chosen for this proof of concept: PixiJS 7 with a small rig of our own

Rive and Spine both need a person operating their editor to produce the animation file, and
their artwork normally comes from an illustrator. Neither exists on this project yet, and the
coding agent cannot operate those editors. Phaser does not author animation at all.

So the proof of concept uses a renderer (PixiJS) and implements exactly what the scene needs:
bending meshes, hanging chains, springs, an expression set, lip-sync and a script of the scene.
That allowed the target quality of motion and interaction to be shown now, at no cost.

It is deliberately not the production recommendation. Animation written in code is slow to
change and only an engineer can change it.

## Recommended for production: Rive, once an illustrator and an animator are involved

- It covers requirements 1 to 7 in one tool, including the React Native runtime.
- Interaction lives in the animation file (state machines and listeners), so reactions like the
  ones in this scene are authored and tuned by the animator.
- Files are small and vector or raster layers can be mixed.
- Cost is modest: one Cadet seat at $108 per year is enough to export for the runtimes.

Spine is the alternative if the art direction leans on heavy mesh deformation and frame-by-frame
polish; it costs more per seat and the React Native route would have to be proven first.

## What carries over from this proof of concept

| Here | In Rive |
| --- | --- |
| `art/` layer list, pivots, draw order | The artboard's layers and bones |
| Mouth, eye and hand sets | Solo groups or blend states |
| `st` intentions in `src/amma.js` (gaze, brow, lean, hand targets) | State machine inputs |
| The scene script and tap reactions in `src/main.js` | States, transitions and listeners |
| Phoneme timings in `voices.json` | Audio events or a number input driven by the app |
| Timing and spacing of each move | The reference the animator matches or improves |

## What a production-quality result needs that this branch cannot supply

- An illustrator to design the character and the room, delivering layered files.
- An animator to rig and animate in the chosen tool.
- Recorded Tamil voice from a native speaker (or the family voice system).
- A sound designer, or at least a person listening to the effects.
- Frame-rate measurements on real low-end Android phones.
