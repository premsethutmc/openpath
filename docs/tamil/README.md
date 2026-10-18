# Tamil foundation: engineering handoff

This is a runnable **provisional literacy candidate**, not a validated assessment or a production rollout. A child can answer a short diagnostic, see relevant Tamil teaching, practise with help, try a different written example, and export structured response evidence. It does not create a second learner-state engine or claim mastery.

## Inspection and reuse decisions

Inspected the English framework, content and evidence types in `packages/english-core/src/{types,framework,content,evaluation,store,updater}.ts`, English learner/account/store/frontend patterns, Django `family`, `learners` and `evaluation` boundaries, and frontend build/browser tests. English has a rich inference implementation but its graph validation hardcodes `EN`, and its app event union/repositories are English-specific. Its assessment gateway is disabled/mock/replay, not a published Elastic Lexi Vector contract.

Reuse React, esbuild, the static-preview pattern, local-first evidence, Tamil-native browser Unicode input, and Playwright. Keep English's functioning inference, framework, account protocol, database and UI unchanged. Tamil is a separate build on port 4176 so its bundle, persistence key and routes do not collide with English. No research repository is read or modified.

Minimum language-neutral boundary: a versioned graph with stable IDs/relations; immutable versioned items with response demands, scoring keys, review and provenance; instructional activities; raw response/presentation evidence under a host-supplied pupil ID; an inference/selection service owned by the shared engine. The implementation of the first four is `packages/tamil/src/index.ts`. The shared inference contract remains unavailable, so `provisional-language-module.v1` is explicitly replaceable.

## Run and demonstrate

Requires the repository's Node >=22.18 and existing frontend dependencies. No Python service, paid speech, token, external font, or speech synthesizer is needed.

```sh
cd frontend
npm ci
npm run tamil:build
npm run tamil:preview
```

Use the local preview port **4176** in a browser on the development machine. Start with **தொடங்கு**: six diagnostic questions, a relevant explanation, guided practice, a different independent item and a reserved transfer example. A wrong short/long-vowel answer leads to **குறிலும் நெடிலும்** teaching. If all answers are correct, composition practice is offered; this is a bounded demo sequence, not adaptive inference.

The optional **ஒரு திறனைப் பயிற்சி செய்** section offers focused entry to every pilot competency, including ஆய்தம் and word matching. Those routes start with one diagnostic question and teach that competency even when the answer is correct. ஆய்தம் has only one symbol and intentionally makes no unfamiliar-transfer claim.

Choice answers advance automatically after feedback. Construction tasks accept a native Tamil keyboard or the built-in character/sign palette, with **சரிபார்** (Enter also submits outside IME composition). Grapheme deletion removes a whole written unit, not a detached code point. There is no dependency on sound; a child who cannot yet read the instructions needs adult assistance, which has not been validated with learners.

Completed visits offer JSON export. Evidence stays in the browser under `openpath.tamil.foundation.v1`; no automatic network upload occurs. The parent section deletes only Tamil data, after confirmation. Storage denial prevents progression and shows an error; unreadable records are preserved, not silently overwritten. Export before clearing browser storage. There is no backup import or account synchronization in this phase.

## Files and boundaries

- `content/tamil/ontology.v1.json`: ontology `ta-foundation@0.1.0`.
- `content/tamil/items.v1.json`: 144 committed, inspectable candidate records; no runtime generation.
- `content/tamil/activities.v1.json`: 8 Tamil explanations, examples and contrasts.
- `packages/tamil/src/index.ts`: pure data, Unicode operations, code scoring, evidence adapter, integrity checks and bounded practice selection. No estimates, activation weights, fixed-length vector or mastery updater.
- `frontend/src/tamil/session.ts`: disposable visit/navigation state plus raw response and presentation history. This is not a learner capability model.
- `frontend/src/tamil/App.tsx`: touch UI and local persistence. A host can mount `<TamilApp learnerId={existingPupilId} />` to retain the same identity as English; the standalone demo generates a local pseudonymous ID. It does not automatically discover or link English accounts.
- `frontend/scripts/{build,preview}-tamil.mjs`: isolated production bundle and static preview.
- `.github/workflows/ci.yml`: additive Tamil build, contract and Chromium phone-flow job.

## Ontology and content coverage

Stable IDs are namespaced `TA.*`. Each node has `requires` (learning prerequisites) and `composes` (aggregation children). Arrays and keyed IDs support future activation, refinement and aggregation without fixing a vector dimension. Edges are definitions, not empirically established causal relationships. Version changes must preserve old evidence mappings; add IDs rather than reassign their meaning.

The graph has 22 nodes, including 8 pilot competencies. Other nodes cover decoding; sound-to-script and script-to-sound; suffixes and inflection; sentence construction and grammar; comprehension; spoken/formal register. These are **planned definitions only**, with no pilot questions, inferred scores or fake coverage. They require finer subgraphs and reviewed content before activation.

| Pilot competency | Candidates | Scope |
| --- | ---: | --- |
| `TA.vowels` | 13 | All 12 உயிரெழுத்துகள்; visual classification |
| `TA.consonants` | 37 | All 18 native மெய்யெழுத்துகள்; glyph matching and pulli construction |
| `TA.aytham` | 5 | ஃ identification; repeated layouts share one family |
| `TA.length` | 13 | குறில்/நெடில் classification, including ஐ and ஔ |
| `TA.composition` | 31 | க, ச, த, ப, ம with அ through ஊ |
| `TA.signs` | 31 | Same consonants with எ, ஏ, ஐ, ஒ, ஓ, ஔ; visual placement and logical input order |
| `TA.recognition` | 7 | Visual word matching: மரம், மலர், படம், கடல், கல், கால் |
| `TA.spelling` | 7 | Written grapheme assembly for the same six words |
| **Total** | **144** | **109 families; 57 choice, 87 construction** |

There are 88 independent-stage, 48 reserved-transfer-stage and 8 guided candidates. The eight guided items reuse a seed question/answer and family; counts are not 144 independent psychometric observations. The four ஆய்தம் layouts also share one family. Composition tests exercise all 216 native consonant-vowel combinations, but **the content bank itself contains only 60 composition combinations**. Some letter combinations are script exercises, not vocabulary claims.

## Diagnosis and evidence safeguards

Every item includes stable ID/version, competency IDs, family, response format, task demand/cue, difficulty assumption (not calibrated), stage/transfer basis, misconception tags, scoring/feedback, provisional review and authored-template provenance. No educator approvals, learner evidence or calibration have been fabricated. Generated/template-derived candidates remain provisional.

Scoring uses NFC plus boundary trimming only. It accepts canonical equivalents such as decomposed கொ, but preserves pulli, vowel length, ர/ற, ந/ன, ல/ள, interior spaces, punctuation and joiners. Unknown wrong responses are incorrect with **no invented misconception**. Known distractors suggest short/long confusion, missing pulli, vowel-sign misuse, consonant-category confusion or word spelling. These are item-level observations, not clinical diagnoses or persistent beliefs about the child. Feedback explains the relevant rule.

Visual matching is deliberately labelled `task.cue=visual-match`; it does not prove decoding or independent recall. Construction is labelled separately; word assembly supplies the constituent graphemes, so it is not dictation or unaided spelling from memory. The paired recognition/construction families and rule/transfer questions let a future inference engine compare evidence. The current module does not conclude that a child understands a rule from one correct answer.

Presentations are persisted before accepting responses. Hints/reveals, abandoned prompts, reloads, prior answers, and same-family recognition/production variants affect evidence. Repeated items/families never become independent evidence. Transfer requires a reserved item **and** fresh exposure; it is unfamiliar only relative to this module's recorded history, not a claim about everything the child has seen in life. Guided answers are always marked revealed. Instruction-before-answer is retained separately from hints. All current responses have `eligibleForInference=false` because every item is provisional. `independenceCandidate` is a support/exposure flag, not mastery.

Audio-dependent competencies are inactive. `audio=null` and `task.audioAssessed=false` explicitly prevent written exercises being mistaken for speech perception, pronunciation or sound-to-script assessment. Tamil orthographic labels are not a substitute for verified recordings or educator scoring.

## Shared Elastic Lexi Vector integration requirements

1. **Identity and transport:** host supplies its existing pupil ID; agree authenticated append-only event transport, consent, erasure/export, offline synchronization and ordering. Do not send Tamil events to English's closed event union without a schema migration. Current browser data is local only.
2. **Graph registration:** register `ta-foundation@0.1.0`, sparse `TA.*` definitions, prerequisite and aggregation edges; retain version-to-version ID mappings. Engine owns activation/refinement/aggregation, uncertainty and estimates.
3. **Item contract:** consume `tamilModule.items` and `.activities`; retain immutable ID/version, family, task demand/cue, assumed difficulty, review/provenance, reserved transfer and misconception metadata. Engine must respect a formal educator-review gate and calibrate before high-stakes use.
4. **Evidence ingestion:** accept `openpath.language-evidence.v1`: unique event ID, shared learner ID, session/time, language/ontology version, item reference, raw and normalized response, correctness, tentative misconception tags, recognition/construction, support, exposure and transfer. Export includes presentation history to prevent unanswered exposures being lost. Agree idempotency by event ID and server-time policy. The adapter currently rejects duplicate IDs in its supplied history; this is not a server deduplication implementation.
5. **Inference ownership:** the engine decides novelty beyond this device, aggregation, forgetting, mastery, misconception activation and selection. It must never convert provisional, hinted, repeated or revealed practice into independent proof. No Tamil-specific permanent updater should be added. Replace `practice()` and the six-question sequence with engine proposals through a reviewed bridge; retain Tamil scoring and UI.
6. **Contract acceptance:** run `npm run tamil:test` and the mobile flows against the bridge. Agree review authorization, schema validation, confidence semantics, exposure across languages/devices, prerequisite effects, time provenance and retention before enabling learner-state updates. No production gateway or final Claude contract was available in this checkout.

## Review and validation still needed

A Tamil educator must check instructions, letter forms and consonant distinctions, the simplifications in குறில்/நெடில் teaching (including context-dependent ஐ/ஔ duration), distractor suitability, child vocabulary, families and transfer design. Add reviewed phonological tasks, verified audio and human pronunciation rubrics, richer morphology/grammar/comprehension content, language/register contexts and real-child usability evaluation. The pilot requires a modern browser with Intl.Segmenter (Chromium 87+); older browsers need a reviewed segmentation polyfill before support can be claimed. Native Android/IME/device/font testing remains necessary; Chromium emulation is not physical-device validation. No scientific validity, full curriculum coverage or production rollout is claimed.

See [validation.md](validation.md) for commands and observed results.
