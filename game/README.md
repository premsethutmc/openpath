# OpenPath: the home scene

The first playable slice of the child's experience. Amma comes into the room, greets the child,
can't find her shopping bag, and shows her shopping list once the child helps. Everything the
child does is by touch; nothing on screen is written.

It runs in a browser and is built for Android phones and tablets, upright or sideways.
It is separate from the Django backend and the assessment engine, which it does not change or call.

## Play it

Open `dist/standalone.html` (one file, everything inside). Add `#review` to the address to see a
reviewer's log of every touch, state change and spoken line; the child's view never shows it.

```
npm install          # esbuild and playwright (dev only)
npm run build        # dist/standalone.html, dist/index.html + assets/
npm run playtest     # plays it with emulated Android touch, three ways, and saves screenshots
```

There is no lockfile yet: this was written where the npm registry is unreachable. Run `npm install` once and commit it.

## What the child can do

How each touch is handled, and which parts are real interaction versus scripted animation:
[docs/interaction.md](docs/interaction.md).

## How it is put together

The layers are separate so that art, animation and gameplay can each be replaced without the others.

```
public/assets/           ARTWORK + VOICE: baked textures, atlas.json (layer names, pivots), voice recordings
art/, tools/             how those assets are made today (drawn in code, baked; synthesised voice)

src/content/home.js      CONTENT: where things are in the room, which line is said when, how patient Amma is
src/gameplay/home.js     GAMEPLAY: the scene's states and what each touch does; calls only the actor's interface
src/actors/amma/actor.js ACTOR: Amma's named actions (greet, pointAtBag, fetchBag, takeOutList ...) and instant reactions
src/actors/amma/rig.js   ANIMATION: bones, bending meshes, springs, expressions; turns intentions into movement
src/engine/              renderer, camera and room layers, sound and lip-sync, timing helpers
src/main.js              starts everything and connects the touch screen to gameplay
```

| To change | Touch | Leave alone |
| --- | --- | --- |
| The drawings (an illustrator's version) | `public/assets/` with the same layer names and pivots | everything in `src/` |
| How an action looks | that action in `actor.js` (or `rig.js` for how bodies move) | gameplay, content |
| The whole animation technology (for example Rive) | a new actor with the same methods as `actor.js` | gameplay, content |
| What is said, or when Amma helps | `src/content/home.js`, recordings in `public/assets/` | code |
| What a touch does | `src/gameplay/home.js` | art, animation |

## Placeholders

- **Artwork:** drawn in code and baked to raster layers, not by an illustrator.
- **Voice:** a machine (eSpeak NG, Tamil), to be replaced by the family voice system. The Tamil wording needs a native speaker's review.
- **Sound effects:** synthesised in the browser.

## Testing

`npm run playtest` plays the scene in Chromium with Android touch emulation (Pixel 7, upright and sideways), steps the
animation frame by frame, and checks every state is reached. It does not replace a real device: frame rate, audio and
touch feel have not been measured on Android hardware yet.

Third-party code: PixiJS 7.4.2 and its `unsafe-eval` patch (both MIT) in `vendor/`.
