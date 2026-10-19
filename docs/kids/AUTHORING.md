# Writing an OpenPath Kids episode

An episode is one JSON file in `kids/episodes/`. Writing a new one needs no change to the player. Check it
with `npm run validate` (in `kids/`), which also prints how long it plays at each age level.

The full type definitions are in `kids/src/engine/types.ts`. A complete example is
`kids/episodes/chintoo-apple-tree.json`; a short one that uses every interaction is
`kids/src/engine/fixtures/sample-primitives.json`.

## The parts of an episode

```jsonc
{
  "format": "openpath-kids/episode@1",
  "id": "chintoo-rainy-day",                 // lower-case, digits, dashes
  "title": "Chintoo and the Rainy Day",
  "ages": [3, 7],
  "objectives": [                            // what the child meets; never a mastery claim
    { "id": "count-to-3", "theme": "counting", "description": "Count three puddles." }
  ],
  "characters": {                            // rig = art; voice = placeholder speech settings
    "chintoo":  { "rig": "chintoo", "at": "door", "scale": 0.9, "voice": { "pitch": 1.45, "lang": "en-IN" } },
    "narrator": { "rig": "voice", "at": { "x": 800, "y": 900 } }   // speaks, never appears
  },
  "backgrounds": { "garden": { "scene": "garden" } },
  "points": { "door": { "x": 140, "y": 790 } },        // named places on the 1600 x 900 stage
  "props": {                                 // things on stage; tags are facts interactions can check
    "apple": { "asset": "apple", "variant": "red", "at": { "x": 870, "y": 470 },
               "background": "garden", "tags": { "colour": "red" } }
  },
  "start": "opening",
  "tracks": { "opening": [ /* steps */ ] }
}
```

The stage is 1600 × 900. `y` grows downwards; characters stand on the ground at about `y: 815`. A place can
be coordinates, a named point, a prop or a character.

## Steps

Steps in a track play one after another. Each lasts its `ms` (or a sensible default), so the timing of the
story is in the file.

| Step | Example | Notes |
|---|---|---|
| `scene` | `{ "do": "scene", "background": "garden" }` | Soft fade (default) or `"transition": "cut"`. |
| `say` | `{ "do": "say", "who": "chintoo", "line": "Good morning!", "mood": "happy" }` | 14 words at most. Length is estimated from the words unless `ms` is given. The narrator's lines show as a caption. |
| `act` | `{ "do": "act", "who": "chintoo", "action": "walk", "to": "door", "ms": 3000 }` | See actions below. `"wait": false` starts it and moves straight on. `"reach": true` moves so the hand or beak reaches `to`. |
| `prop` | `{ "do": "prop", "id": "apple", "action": "fall", "to": "puddle" }` | `show`, `hide`, `move`, `fall`, `wobble`, `glow`, `attach` (to `who`), `detach`, `variant`, `badge` (`text`). |
| `sound` | `{ "do": "sound", "sound": "chirp" }` | `chirp`, `rumble`, `pop`, `plop`, `crunch`, `splash`, `thud`, `chime`, `whoosh`, `yawn`, `rustle`. |
| `wait` | `{ "do": "wait", "ms": 1500 }` | A pause in the story. |
| `together` | `{ "do": "together", "steps": [ ... ] }` | Start several steps at once; lasts as long as the longest. |
| `interact` | see below | Ends the track: the outcome chooses the next track. |
| `goto` | `{ "do": "goto", "track": "garden" }` | Ends the track. |
| `end` | `{ "do": "end" }` | The episode is over; the player offers to watch again. |

Any step can have `"level": ["younger"]` or `"level": ["older"]` to play only for that age group.

**Actions.** Chintoo: `place`, `walk`, `run`, `turn`, `look`, `blink`, `react` (with `mood`), `hop`, `jump`,
`point`, `wave`, `dance`, `give`, `sleep`, `wake`, `stretch`, `yawn`, `sit`, `stand`, `eat` (with `prop`),
`pickup` (with `prop`), `wash`, `rub-tummy`, `sniff`. Mina (rig `bird`): the common ones plus `fly`, `peck`,
`flap`. The validator rejects an action a rig cannot do.

**Moods.** `happy`, `sad`, `surprised`, `hungry`, `sleepy`, `yuck`, `proud`, `neutral`.

## Interaction windows

```jsonc
{ "do": "interact", "id": "pick-apple", "primitive": "tap", "objective": "colours-fruit",
  "targets": ["apple-red", "apple-green", "apple-yellow"],
  "window": 18000,                // the story carries on by itself after 18 s
  "hintAfter": 7000,              // after 7 s with no touch, a gentle nudge...
  "hint": [ { "do": "say", "who": "mina", "line": "Red, green or yellow?" } ],
  "bind": "choice",               // remember the touched prop as $choice
  "outcomes": { "tapped": "mina-picks", "timeout": "apple-falls" } }
```

Rules the validator enforces:

- Every outcome of the primitive has a track — including `timeout` — so the story never waits for the child.
- `window` is between 6 and 60 seconds: long enough not to hurry anyone, short enough not to stall.
- A hint never blocks: it plays alongside the open window and stops as soon as the window closes.
- Targets carry the tags the primitive needs (`colour`, `shape`, `animal`, or the number named in `by`).
- Tracks never loop, so every episode reaches its end.

After a `bind`, later steps can use `"$choice"` wherever a prop or place is expected, and lines can say
`"A {choice.colour} apple!"`.

Write every outcome as part of the story. A different choice is not a wrong answer: in
`choose-colour`, the `other` branch might say "Ooh, a green ball! Here is the blue one." There is no
failure screen and nothing to retry.

The primitives are `tap`, `count`, `drag`, `choose-colour`, `match-shape`, `identify-animal`, `compare` and
`observe`; their outcomes are listed in [ARCHITECTURE.md](ARCHITECTURE.md#learning-interactions).

## Checklist for a new episode

1. Write `kids/episodes/<id>.json`.
2. `npm run validate` — fix every error; aim for 3–5 minutes with no touches.
3. Add a branching test in `kids/src/engine/story.test.ts` (no touches; each outcome) and run `npm test`.
4. Watch it: `npm run build && npm run serve`, then open it on a phone or tablet. Add `?speed=4` to skim.
5. Play it through once touching nothing at all. It must still make sense as a cartoon.

To show a different episode, change the import in `kids/src/main.ts` (an episode picker comes with the
second episode).
