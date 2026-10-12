# What the child can do in the home scene

## The flow

```
Play ─▶ Amma walks in and waves ─▶ "Where is my bag?" ─▶ child taps the bag ─▶ she picks it up
     ─▶ takes out the list and shows it ─▶ the child plays freely ─▶ every so often: "Let's go to the shop!"
```

Nothing waits forever. If the child does not touch the bag, Amma points at it (after 4.5 s, then every 5.5 s),
and after three hints she fetches it herself.

## Every touch, and what answers it

Every touch gets an answer on the frame the finger lands: Amma glances at the spot and blinks, and a small sparkle
appears under the finger. What happens next depends on what was touched and when.

| Touch | When | What Amma does | Says |
| --- | --- | --- | --- |
| Amma | walking in, greeting | glances, smiles (does not stop) | |
| Amma | waiting for the bag | points at the bag; the bag wiggles | அதோ! (There it is!) |
| Amma | free play | asks, then giggles next time, alternating | என்ன செல்லம்? (What is it, darling?) |
| The bag on the stool | before she asks | the bag wiggles, she glances | |
| The bag on the stool | waiting for the bag | picks it up, thanks the child, takes out the list | நன்றி செல்லம்! (Thank you, darling!) then இத்தனை ஆப்பிள் வேண்டும்! (We need this many apples!) |
| The bag in her hand | free play | lifts it, looks inside, shakes it | பை காலியா இருக்கு! (The bag is empty!) |
| The list | free play | brings it close; the apple bounces | இத்தனை ஆப்பிள் வேண்டும்! |
| Anything | while the list is close | puts it back | |
| The room | any time | glances at the spot | |
| Nothing for 9 s | free play | glances toward the door, eager | வா செல்லம், கடைக்குப் போகலாம்! (Come, darling, let's go to the shop!) |

She never says the number. The list shows a 5 and an apple; the words are "this many".

If the child taps again while Amma is still doing something, the glance still happens at once; a request to fetch the
bag or put the list back is remembered and done next; other requests are let go, so taps never pile up.

## Real interaction versus scripted animation

| | What it is |
| --- | --- |
| **Real interaction** (decided live by what the child does) | Which action happens and when; whether Amma fetches the bag because the child tapped it or because she gave up waiting; the order of free-play reactions; the instant glance toward exactly where the finger landed; the sparkle at the touch point; the bag's wiggle; returning the list on any touch |
| **Scripted animation** (authored, plays the same each time) | The walk in, the wave, looking for the bag, pointing, picking up the bag, taking out the list, the close-up, looking into the bag, the giggle, the invitation. Each is a short authored action (`actor.js`); gameplay only chooses which one runs |
| **Simulated** (physics, different every time) | Braid, saree end, earrings, the bag swinging in her hand, the settle when she stops, how a touch-glance blends into whatever she is doing |
| **Driven by the audio** | Mouth shapes during speech, timed from the recording's phonemes and read from the audio clock |
| **Idle life** (random, between actions) | Glances, weight shifts, blinks, breathing, the room's dust, light and swing |

## What is recorded

Each touch, state change, action and spoken line goes into an in-memory event list (`window.__game.events`), shown
with `#review`. Nothing is sent anywhere and nothing is stored: connecting this to the evidence API and the
assessment engine is a later step, and this scene does not yet measure anything.
