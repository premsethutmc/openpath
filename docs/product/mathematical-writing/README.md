> **Current student integration:** [My Learning Year lessons, run instructions and verification](LEARNING_YEAR.md). The details below describe the retained v2 workspace/backend foundation; `/writing.html` is its legacy host, not the normal curriculum route.

# Mathematical writing — connected learning journey v2

Continues workspace commit `d868060890d4c27614eada155ee9e1979fd0c3ea` on
`feat/mathematical-writing-integration-v2`. The default writing page is now an
**authenticated OpenPath lesson**, not the earlier receipt-only demonstration.
No merge, deployment, paid call or real learner data operation is included.

## What is connected

1. Sign into the existing parent account and choose its existing pupil.
2. Open a division problem, initially **379 ÷ 3**.
3. Read the concept explanation and a worked example using different operands.
4. Write in the existing workspace with finger, pen or mouse, or type steps.
5. The local pretrained digit model proposes interpretations; uncertain marks
   request targeted typed clarification. Original strokes and corrections remain.
6. Django checks individual quotient digits, products, differences, bring-down
   values, intermediate remainders and final result. For 379 ÷ 3 the result is
   **126 remainder 1**. Operands are configurable; interior zeroes and smaller
   dividends are supported.
7. The first invalid operation opens short follow-ups about grouping,
   multiplication and quotient selection. Answers select relevant teaching;
   they do **not** establish a confirmed misconception. Return to the same saved
   working, edit the affected input and check again.
8. Practice receipts are appended to the existing pupil's mathematics event stream
   and replayed through the existing native Ledger and eligibility policy.
   Provisional content and helped corrections never change estimates or mastery.
9. Drafts, lesson stage and follow-up progress persist in Django, with optimistic
   version checks for conflicting saves. Reload and reopen the same problem.

A second real journey asks for an equivalent fraction to **1/2**. Python's exact
`Fraction` arithmetic accepts `2/4` and rejects `2/3`. It uses the same workspace,
contract, authentication, persistence, feedback and evidence adapter. Expression
input is typed; mathematical-expression handwriting recognition is not claimed.

The default `/writing.html` entry is linked from the existing `/mathematics.html`
journey. Existing English, Tamil and essay navigation is not replaced. The previous
synthetic fixture inspector remains explicitly under `?demo=1`; none of the v2
integration acceptance results comes from its mock validator.

## Recognition: real, but deliberately bounded

Provider: **ONNX Runtime Web 1.30.0 + the existing pretrained MNIST digit model**.
Inference runs locally in WebAssembly. No handwriting is sent to a recognition
service. The model is vendored with source, MIT licence, SHA-256 and third-party
notices; the build checks its hash. There is no model training or synthetic lookup.

The current adapter targets separated single digits in numeric worksheet regions.
Its confidence is an uncalibrated model score, not a measured accuracy probability
for children. Low margins, insufficient ink and unsupported expression regions
require clarification. Confident mistakes remain editable. Touching digits,
operators, cursive expressions and diagrams are limitations, not understood maths.
If the model cannot load, typed input still completes the real backend journey.
The runtime WASM asset is about 14 MB; it loads on first recognition, not on typing.
See [RECOGNITION.md](RECOGNITION.md).

Before diagnosing a mathematical error, the child is asked to check the
transcription. **OpenPath read my writing incorrectly** returns to editing,
preserves the original receipt and adds a dispute receipt. That interpretation
is excluded from the derived mathematical evidence; it is not erased from history.
No follow-up or mastery penalty is forced for a transcription problem.

## Local/private preview

Requirements: Node 22.18+ or 24, Python 3.12, installed repository dependencies.
Use an isolated synthetic database, not an existing learner database. From the
repository root, create this local-only settings override:

```sh
cat > /tmp/openpath_writing_preview_settings.py <<'PY'
from config.settings import *
DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3',
                         'NAME': '/tmp/openpath-writing-synthetic.sqlite3'}}
PY
```

Backend terminal (from `backend`, using the existing `.venv`):

```sh
DJANGO_SETTINGS_MODULE=openpath_writing_preview_settings PYTHONPATH=/tmp .venv/bin/python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=openpath_writing_preview_settings PYTHONPATH=/tmp .venv/bin/python manage.py runserver 127.0.0.1:8674 --nothreading
```

Frontend terminal (from `frontend`):

```sh
npm ci
node scripts/build-mathematics-journey.mjs
DIST=dist-english PORT=4674 API_TARGET=http://127.0.0.1:8674 node scripts/preview-english.mjs
```

On that development machine, open `/` on the preview server to create a synthetic
parent account and pupil using the existing UI. Then open `/mathematics.html` and
choose **Write and check mathematical working**, or directly `/writing.html`.
The preview server proxies the real Django API with the existing same-origin
session/CSRF transport. No hosted URL is asserted. For an owner Codespace, forward
4674 with **Private** visibility and use the authenticated Ports URL; never make
it public to bypass access controls.

## Handoff and limits

[INTEGRATION.md](INTEGRATION.md) documents actual endpoints, storage, evidence and
existing-engine boundaries. [TESTS.md](TESTS.md) records actual Node 22/24 and Django
results. Screenshots: [division teaching](screens-v2/division-teaching.png),
[completed division and evidence](screens-v2/completed-division.png).

No physical stylus/Android hardware, real-child trial, educator content approval,
recognition calibration, general handwriting-proof understanding or production
readiness evaluation has been performed. This is a functioning development slice,
not Grade 1–12 curriculum completion. All new lesson and probe content is provisional.
