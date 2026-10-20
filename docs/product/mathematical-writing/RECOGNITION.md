# Real recognition provider and limits

## Delivered provider

**ONNX Runtime Web 1.30.0**, pinned in `package-lock.json`, executes the existing
pretrained CNTK/MNIST model from Microsoft's ONNX Runtime test assets. No model was
trained, reimplemented or fit to the acceptance traces. The browser actually
rasterizes captured ink and runs model inference; IDs, known examples and the
problem's expected answer never determine a prediction.

- Source: https://github.com/microsoft/onnxruntime/blob/main/onnxruntime/test/testdata/mnist.onnx
- Vendored file: `frontend/assets/recognition/mnist.onnx` (26,454 bytes).
- SHA-256: `2f06e72de813a8635c9bc0397ac447a601bdbfa7df4bebc278723b958831c9bf`.
- Source/licence manifest, repository MIT licence and third-party notices ship with
  the model. The build verifies its hash and copies the pinned runtime assets.
- Inference uses single-threaded WASM/SIMD on the browser, with same-origin model,
  module and WASM requests. No API key, recognition account, paid call, upload to a
  recognition provider or external CDN is used. The WASM asset is about 14 MB.
- ONNX Runtime Web is the maintained runtime; the pretrained MNIST weights are an
  older, small digit model. Neither their age nor published MNIST benchmark results
  establish accuracy on children's stylus input. No such accuracy claim is made.

The adapter groups strokes by overlapping horizontal extent in known numeric
regions, rasterizes aspect-preserving 20px ink into a 28px image, centres its mass,
and runs the existing convolutional model. These are preprocessing/segmentation,
not a new handwriting model. Predictions include positions, original stroke IDs,
alternatives and a model score. Pen originals stay in the workspace.

The default threshold is 0.90, configurable on the existing component. Low model
margins are held below acceptance; dots/insufficient ink and very wide marks require
clarification. Expression regions are explicitly unsupported and return an uncertain
candidate for manual entry. A confirmed correction is not replaced by another
recognition pass. High-score errors remain editable, including a transcription
error found after a mathematical check.

Scores are uncalibrated softmax values, **not** reliable per-child probabilities.
Touching digits, unusual styles, symbols misread as digits and connected/cursive
expressions remain important limitations. Not every bad interpretation will be
flagged uncertain automatically. Students must be able to inspect/edit the result;
the backend never assumes an incorrect transcription proves a misconception.

## Alternatives evaluated

- **MyScript iinkTS:** established web text/math client, Apache-2.0 wrapper,
  separate cloud-service keys, quota, pricing and data-processing terms. No keys are
  available and no service use was authorized. It may replace the adapter later;
  no paid provider is required for the delivered digit journey.
- **ML Kit Digital Ink:** official Android/iOS quickstarts do not supply a browser
  binding. A native bridge is outside this existing web application.
- **Tesseract.js:** maintained browser OCR, but not a stroke-aware mathematical
  parser. We did not substitute print OCR for demonstrated digit handwriting.
- **Excalidraw:** maintained MIT drawing component, not a recognizer. The existing
  native SVG surface already captures the required raw metadata and is retained.

Official sources: [iinkTS](https://github.com/MyScript/iinkTS),
[ML Kit digital ink sample](https://github.com/googlesamples/mlkit/tree/master/android/digitalink),
[Tesseract.js](https://github.com/naptha/tesseract.js),
[Excalidraw](https://github.com/excalidraw/excalidraw),
[ONNX Runtime](https://github.com/microsoft/onnxruntime),
[ONNX MNIST model description](https://github.com/onnx/models/tree/main/validated/vision/classification/mnist).
The model was retrieved successfully from the ONNX Runtime repository. The ONNX
model zoo's LFS/media host and direct MyScript/Google product documentation were
blocked by the environment proxy; current vendor prices/terms were not verified.

## Actual validation performed

Automated browser tests run real local inference on hand-authored traces for **1,
2 and 7**, repeat with changed stroke IDs, and test unsupported expression handling.
The real Django journey captures a handwritten 1, clarifies an insufficient mark,
combines it with typed input, validates all division operations and records practice.
A separate journey blocks all recognition assets and still completes with typing.
These are browser/mouse/touch/pen simulations, not physical handwriting hardware,
MNIST accuracy benchmarks, real-child learning evidence or educator validation.

There is no general mathematical expression, proof or diagram recognizer in this
iteration. Those inputs remain typed/manual; this limitation is explicit in the UI.
