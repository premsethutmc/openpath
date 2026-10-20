# Recognition evaluation and decision

Reviewed 2026-10-20. No provider was called for recognition, no account was created,
no models were trained and no paid services were used. No handwriting-accuracy
benchmark was performed. Confidence policy is software-tested, not calibrated on
children's handwriting.

| Option | Browser fit and maintenance | Licensing/cost/privacy | Decision |
|---|---|---|---|
| MyScript iink / **iinkTS** | Official web TypeScript client supports text and math, connects to MyScript Cloud. The former iinkJS README explicitly says it is no longer maintained and directs users to iinkTS. | Client wrapper is Apache-2.0; this does not license the recognition service. Developer account and keys required. README mentions a free monthly quota; current prices, quotas and service/data-processing terms still require owner verification. Recognition sends ink to the selected service. | Best candidate for a future web-math adapter after credential, terms, cost and privacy approval. Not installed or called. |
| Google ML Kit Digital Ink | Official quickstarts target Android/iOS. The digital-ink quickstart is an Android app; no browser JavaScript binding is demonstrated. A native wrapper/bridge would be a separate integration. Do not confuse browser text OCR with digital ink. | Sample source Apache-2.0, distinct from SDK/model terms. Native on-device use/model-download policy must be checked against the selected SDK version. No current web cost/accuracy promise is made. | Not a drop-in solution for this React web application. Potential later native implementation behind the same adapter. |
| Tesseract.js | Apache-2.0 WASM OCR works in browsers/Node and produces text from images. It is not an online stroke/spatial mathematical-expression parser. | Can execute locally with locally supplied models; model downloads/deployment/licences need separate checks. It would discard temporal stroke semantics unless another layer reconstructed them. No evidence here establishes acceptable child-ink mathematical accuracy. | Evaluated, not used to guess digits or create misleading maths failures. |
| Excalidraw | Maintained browser drawing/whiteboard component; MIT. Not a recognizer. Its shapes/document model and broader UI add integration weight. | No recognition accuracy or recognition service implied by its drawing licence. | Not needed for this focused region/stroke contract. Native SVG/Pointer Events provide capture and replay without another dependency. |

Official sources read:

- [iinkTS README](https://github.com/MyScript/iinkTS/blob/master/README.md): web integration, cloud connection, account/keys, features and wrapper licence.
- [Legacy iinkJS migration notice](https://github.com/MyScript/iinkJS/blob/master/README.md).
- [ML Kit samples](https://github.com/googlesamples/mlkit) and [Digital Ink Android quickstart](https://github.com/googlesamples/mlkit/blob/master/android/digitalink/README.md).
- [Tesseract.js scope and licence](https://github.com/naptha/tesseract.js/blob/master/README.md).
- [Excalidraw README](https://github.com/excalidraw/excalidraw/blob/master/README.md).

The linked MyScript developer documentation and Google Digital Ink product pages
returned proxy **403 Forbidden** from this environment. The official GitHub README
sources above were retrieved successfully. Vendor pricing, per-symbol export/confidence
availability, data-processing terms and actual stylus accuracy remain unverified;
none is represented as established by those README files.

## Delivered policy

Default provider: `unavailable@1`. Every exercise can be completed by typing. A host
may inject `Recognizer` without changing the surface or mathematics engine.
Adapter output must reference the request revision and supply region bounds,
original stroke IDs, stable token IDs, text, and a confidence in `[0,1]` or `null`.
Only provider-supported confidence may be supplied. Do not manufacture a high
confidence from a guessed character, global score or mere API success.

The configurable threshold defaults to `0.90`. At/above it an input interpretation
is accepted; below it or with unavailable confidence only that candidate needs
clarification. Unmapped ink still needs region-specific typed input. Confidence
is recognition confidence, never correctness, mastery or evidence eligibility.
Threshold changes apply to future recognition results; confirmed student corrections
remain confirmed. Confidence calibration and provider-specific segmentation need
validation before a real recognizer can be trusted with child input.

Provider failures, unavailable models, malformed results and late responses preserve
ink and leave the typed path working. Requests support abort and stale-revision
checks. No complete proof/diagram understanding is claimed. The synthetic adapter
only recognizes its own unchanged, explicitly labelled vector fixtures.
