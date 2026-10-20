# Mathematical writing workspace v1

Independent branch: `feat/mathematical-writing-workspace-v1`, based on integrated
PR #55 commit `174f73136841b9f980fe35c632ed290c2ead1b5a`.
This adds an input component and a local demonstration. It does not change the
mathematics curriculum, validator, diagnostic engine, estimator, evidence gate,
learner records or existing application navigation. No deployment is configured.

## Run the demonstration

From `frontend`:

```sh
npm ci
node scripts/build-writing.mjs
DIST=dist-writing PORT=4670 node scripts/preview-english.mjs
```

Open the resulting **local** development server on your own development machine.
In a Codespace, forward 4670 with **Private** visibility and use its authenticated
owner URL. This cloud workspace does not provide a remotely accessible preview URL.
No public deployment or tunnel is needed. No backend or recognition credentials
are required. The existing preview server is reused without changes.

The default exercise is **379 ÷ 3**. Write in the labelled regions using a finger,
pen or mouse. Type a region's intended input when recognition is unavailable.
For manual-only working, enter quotient `126`, first product `3`, difference `0`,
bring-down `7`, product `6`, difference `1`, next bring-down `19`, product `18`,
and remainder `1`. The input layer does not decide whether these steps are correct.
Press **Send confirmed steps to validator** to inspect the transport packet.
The mock acknowledges receipt and explicitly says mathematical validation is not
connected. It never returns a correctness score, diagnostic or mastery claim.

Under **Problem and writing layout**, change dividend/divisor to open a separate
resumable division draft. Division is not restricted to this example. Add more
regions for longer working. Free, column-operation, fraction, algebra and coordinate
choices provide a free writing region; hosts can supply a complete structured layout.
They are not implemented lessons or automatic diagram interpretation.

Under **Synthetic recognition demonstrations**:

- **Correct sample** loads synthetic vector strokes for the working above.
- **Incorrect sample** changes the second product from `6` to `8`. The packet
  preserves that digit; the input UI does not diagnose it.
- **Ambiguous sample** gives only the final `8` in `18` low confidence. Interpret,
  choose that highlighted digit and type `8`. All other interpretations remain.
  Interpret again or reload: the confirmed correction is not requested again.
- Any confident interpretation can also be edited. Erasing recognized ink removes
  its active interpretation; undo restores it. Original strokes remain archived.

These labelled fixtures are **not a recognizer for student handwriting**. Editing
fixture ink makes its synthetic adapter refuse recognition and offer typing.
A real recognizer is deliberately optional; see [RECOGNITION.md](RECOGNITION.md).

## Implemented surface

Native Pointer Events and SVG capture/replay mouse, finger and pen strokes. Pen
pressure changes rendered width. Samples retain paper coordinates, event timestamps,
pressure, tilt, twist and additional angles/tangential pressure when supplied.
Strokes record wall-clock start, performance time origin, pointer ID and contact size.
There is no drawing model, image service or paid call. Native SVG is used instead
of a large drawing dependency because we need editable numerical samples and
region references rather than a full whiteboard's document model.

Tools: pen, stroke eraser, undo/redo (60 history entries), clear, zoom (100–400%),
pan after zooming, two-finger pinch, blank/grid/ruled paper, configurable regions,
and a numeric/mathematical keyboard. Eraser removes whole intersected strokes,
not partial pixel segments. Stroke originals are retained but erased strokes are
hidden. Recognition overlays never replace active handwriting.

Pen input suppresses simultaneous finger touches. **Pen only** explicitly locks
out touch input; this is the reliable option for resting a palm on the screen.
Automatic palm rejection is best-effort. The browser cannot identify all palms,
and some hardware reports a stylus as a mouse. Scroll outside the paper; pointer
gestures inside the paper are reserved for drawing or zoom/pan.

## Persistence and privacy

The standalone demo stores drafts on this browser, not a learner profile. It
serializes writes, resumes the last saved draft, and preserves undo/redo and
correction history. Returning to a problem resumes its separate draft. Completed
strokes and **added/confirmed** typed steps are saved; an unfinished pen gesture
or text still in the entry field is not committed. Wait for “Saved” before closing.

JSON download/restore supports manual backup. Invalid or unsupported draft versions
are rejected without overwriting their stored copy. Quota/storage failures display
“Not saved”; writing and download remain available. The local limit is 8 MB per
serialized draft, 10,000 strokes/200,000 samples per snapshot and 60 undo entries.
Long sessions can reach browser quotas earlier. This is not server synchronization.
No data leaves the browser in the delivered demo; recognition fixtures and validator
are local. Imported drafts contain original writing and must be treated as private.

## Integration

See [INTEGRATION.md](INTEGRATION.md) for the public API, contract and exact engine
boundary. The mathematics owner must supply a real validator and an authenticated
work repository if required. Contract adoption has not been confirmed by that owner;
mounted host-adapter tests verify the proposed interface, not integration into their
active development branch.

Tests and observed results: [TESTS.md](TESTS.md). Screens: [synthetic division ink](screens/division-ink.png), [keyboard](screens/math-keyboard.png), [clarification and packet](screens/clarified.png).
The tests simulate pen/touch through Chromium. No physical stylus or Android hardware
was available. Unrestricted handwritten proofs, semantic graph sketches and geometric
constructions are not automatically interpreted by this implementation.
