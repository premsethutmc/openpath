# Experimental observation cost controls

No provider calls or secrets are required to run these offline tests. This change
is not a measured live saving or evidence of equivalent feedback quality.

## Routing boundary

The intended product is deterministic-first: use trusted local checks where they
can confidently handle the task; reserve API analysis for unresolved cases. These
controls optimize that optional API path. They neither trigger an API call nor
implement a confidence router. Existing demo regex matches are not validated
whole-essay assessment, and no match must never mean that a draft is clean. A
router needs explicit rule coverage, abstention, provenance and disagreement
tests before it can safely suppress or request model analysis.

## Opt-in compact foundation observation

`OPENPATH_ESSAY_COMPACT_OBSERVE=1` enables the candidate. Default is off. Only the
foundation-writing observation provider payload changes; request validation still
requires all canonical competencies and replaces caller-owned descriptions.

The candidate retains all 20 competency IDs, names, areas and every misconception
ID/description. It omits only the band ladders used for placement/practice levels,
and removes JSON formatting whitespace. Observation must not assign a band or
infer mastery. Its system prompt keeps the original valid-alternatives, error vs
style, exact quotation, verification, slip, privacy and JSON-output instructions,
and explicitly notes that ladders are absent. Diagnostic questions still receive
the complete canonical band descriptors. Rewrite and argument paths are unchanged.

For the existing first 60-word synthetic sample, measured locally:

| UTF-8 payload component | Default | Compact candidate |
| --- | ---: | ---: |
| User JSON bytes | 12,032 | 6,336 |
| System instruction bytes | 4,086 | 4,309 |
| Combined content bytes | 16,118 | 10,645 |

These are **bytes, not tokenizer counts or billed savings**. Different model
outputs, reasoning, caching and request overhead can change actual cost. The
candidate must be compared against the default using identical samples, valid
regional alternatives, single slips, correction specificity and useful teaching
feedback before enabling it by default. Reducing category coverage is not an
acceptable way to manufacture savings.

## Usage reporting

Numeric provider-reported cached-input and reasoning-output metadata is retained
when available. Missing fields remain unknown. Reasoning tokens are included in
output totals, not added again. Provider-specific cache input semantics must be
respected. Any standard-rate estimate is a comparison calculation, not a billing
invoice, and cannot silently assume cache discounts, write premiums, fees or
missing usage. See the offline usage-accounting regression tests.

Do not enable paid benchmarks automatically. A future comparison needs explicit
bounded-run authorization and temporary secret setup; neither is included here.
