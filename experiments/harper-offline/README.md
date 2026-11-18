# Harper offline feasibility experiment (not production)

This is an isolated development experiment, not an evaluator integration or a claim of trustworthy diagnosis. The application dependency manifests, backend, routing, learner state and maths code are unchanged.

## Reproduce

From this directory, run `npm ci --ignore-scripts --no-audit --no-fund`, then `node --test scoring.test.mjs` and `node benchmark.mjs`. Installation downloads packages once. Benchmarking uses the package's local WebAssembly binary, not a CDN, model or hosted grammar API. The runner accepts only the repository's fixed invented 30-case v2 suite, never learner input. Node fetch, HTTP(S) and common TCP connection APIs throw if used; zero attempted calls were observed. This is an API-level guard, not an OS network-isolation proof. Repeated output was byte-identical.

## Dependency and licence evidence

Pinned `harper.js` 3.2.0: Apache-2.0, verified both package metadata and installed LICENSE. Its sole runtime npm dependency resolves to `fflate` 0.8.3: MIT, verified metadata and LICENSE. Exact tarball integrity hashes are locked in package-lock.json. Harper's WASM is bundled in that package; no separate grammar service or per-call fee is required. This is not a full legal/transitive Rust dependency audit; redistribution should preserve applicable licences/notices and review bundled third-party assets before production.

Primary sources: [Harper source](https://github.com/Automattic/harper), [Node integration](https://writewithharper.com/docs/harperjs/node), [JavaScript introduction](https://writewithharper.com/docs/harperjs/introduction). No remote code snippets are executed by the benchmark.

## Measured results

Both Indian and British dialects processed all 30 synthetic cases (14 language, 16 argument), using default rule configuration and plaintext parsing. The exact suite SHA256 and every rule, span, message and suggestion are in results.json.

| Dialect | Alerts, all 30 texts | Required grammar anchors with overlapping alert | Protected-span overlaps |
| --- | ---: | ---: | ---: |
| Indian | 11 | 9 / 31 | 0 |
| British | 12 | 9 / 31 | 1 |

Overlap is candidate retrieval, NOT precision/recall or category agreement. References are AI-authored and unvalidated; the tiny targeted sample cannot establish general accuracy. Optional style annotations are excluded from the 31 grammar-error denominator. The eight argument anchors are not grammar targets and have no semantic assessment here. Previous drafts are not passed to Harper; this does not evaluate revision progress.

### Manual AI review of alerts, not educator validation

Nine overlapping grammar alerts identify genuine issues in these supplied examples: two `PronounVerbAgreement` (say → says), one `OnFloor` (at → on), four `AnA` article changes, one `DependOf` (of → on), and one `MassNouns` (informations). Eight suggested replacements repair their local error. The mass-noun suggestion is incomplete: replacing `informations` with `information` leaves **several information**, still incorrect. An independent AI review confirmed that a second Harper pass then identifies `several information` and proposes `several pieces of information`. This illustrates possible iterative repair, not a general safety guarantee. A diagnostic must teach countability, not blindly auto-apply edits.

Other alerts:
- `DiscourseMarkers` suggests a comma after sentence-initial Therefore. This is punctuation/style advice, not detection of the annotated causal reasoning leap.
- `MissingPreposition` flags **school** in the grammatical clause **The school could open its library for one extra afternoon**. This is a false alarm in the current draft; the previous-draft injection was never supplied to Harper.
- British `SpellCheck` flags valid Indian **lakh**. Indian dialect avoids that regional false positive.

Zero protected overlaps in Indian mode does NOT mean zero false positives: the school false alarm lies outside listed protected spans. Full alert review matters.

Harper misses 22 required grammar anchors here, including most noun-subject agreement, narrative tense consistency, sentence boundaries, collocations and contextual connective misuse. It does not establish claim validity, evidence sufficiency, fair counterargument or articulation quality. Silence means unsupported/unassessed, never correct or mastered.

## Decision

Feasible candidate for a small offline first pass, not a replacement diagnostic. Before integration: develop separately reviewed per-rule eligibility/exclusions and competency mapping, expand counterexamples (including Indian usage), record source/version, test false alarms and incomplete suggestions, and retain unresolved dimensions for optional bounded semantic analysis. Do not turn a successful local lint into whole-writing correctness or automatically expose replacement prose as the learner's answer. No production rule allowlist, confidence threshold or API routing decision is implemented in this experiment.

Independent AI review reproduced the same 11/12 alerts and zero guarded network attempts, reviewed all nine overlapping alerts, and reran scoring tests. Its optional-reference filtering finding was repaired and tested. This is engineering review, not educator validation.
