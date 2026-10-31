# 1. Pipeline audit

Starting point: `feat/p2-general-derivations` at `eca220f092dab48b1af59e56aac150773d181d70`. The audit was done before any code changed. The trace script `tools/mathematics/grader-parser-integration/scripts/engine-trace.ts` only reads; it records each stage's verdict for every corpus item.

## Statement problems: raw input to learner evidence

```
Raw learner input ─ {format:"natural", text} or string[]
  │  assessMathematicalWorking            unified-math-engine.ts: bare-log resolution; string[] is joined into natural text
  ▼
Parsed working ─ parseNaturalWorking      natural-working.ts: one NaturalRelation per line
  │      (equation, inequality, solution-set, conjunction; B2 adds disjunction)
  │      not parsed → malformed / ambiguous            ◄── REJECTION POINT 1: the line parser
  ▼
Candidate verdict ─ textAssessment → math-core assessWorking(statement, lines)
  │      reads the STATEMENT as a bare relation. "Solve …", "Given x = …, find y …"
  │      and "… for x ≠ 3" fail with PARSE_ERROR (unsupported), or with a false
  │      ambiguity: ")for x" matches the "/(…)letter" rule.
  │                                                    ◄── REJECTION POINT 2: the statement reader
  ▼
gateTextRoute ─ line accounting, refineLoss
  ▼
Acceptance gate ─ gateAlgebraText
  │      independent checker checkAlgebraSubmission reads the statement again on
  │      its own: "Solve" counts as a product of letters ("more than one variable").
  │      Other refusals: "not a single parseable statement", "parse fidelity",
  │      "the given values must be equations".
  │                                                    ◄── REJECTION POINT 3: the checker's statement reader
  │      reconcileAlgebra(candidate, check)
  │      P2 is consulted ONLY in algebraGroundings, ONLY for lines the checker already
  │      verified, and ONLY to authorise or refuse grounding. It can withdraw; it can
  │      never certify.
  │                                                    ◄── POINT 4: P2 never decides validity
  ▼
certifyClaims ─ claim ledger (evaluateLedger) and proof obligations
  │      Discharged only by a registered mechanism (evidence-provenance.ts MECHANISMS).
  ▼
adjudicate ─ certification-authority.ts: single-route stamp, or objection rules across routes
  ▼
Engine result ─ AssessmentEnvelope {classification, firstInvalidStep, steps, acceptanceGate, certification}

Learner evidence (separate path)
  frontend/src/journey/session.ts → derivation-interface.authorizeWorking
    → P2 assessChain → replayDerivationChain → workingEvidence()
    = method-verified | method-false-step | no-method-evidence (answer-vs-method@1)
  The journey does not consume the engine envelope.
  The backend (family/learning.py, assessment@1) refuses any client claim of derivationVerified.

Certificates
  P2 DerivationSession.seal builds a digest chain (derivation-certificate@3).
  replayDerivationChain re-normalises the task and re-authorises every line.
```

## Where supported mathematics was stopped

Each item P2 decides on its own counts once. An item is decided when P2 certifies the chain or refutes it exactly. The categories are kept separate (`scripts/reach-categories.py`; output in `results/reach-categories.txt`).

| Corpus (P2-decided items) | engine verdict = P2 verdict | task-normalisation failure (statement) | parser rejection: line | parser rejection: false ambiguity | unsupported operation | final answer: incomplete | replay failure |
|---|---|---|---|---|---|---|---|
| HELDOUT5 (109) | 19 | 77 | 3 | 6 | 1 | 3 | 0 |
| HELDOUT4 (210) | 22 | 172 | 7 | 3 | 2 | 4 | 0 |
| HELDOUT3 (309) | 130 | 69 | 13 | 14 | 46 | 37 | 0 |
| HELDOUT3 bare (293) | 197 | 0 | 12 | 14 | 21 | 49 | 0 |
| HELDOUT2 (260) | 172 | 34 | 0 | 13 | 33 | 8 | 0 |
| HELDOUT2 bare (244) | 207 | 18 | 0 | 0 | 10 | 9 | 0 |

The main blocker is the statement, not the working. P2's `normalizeTask` reads "Solve …", "Given …" and "… for x ≠ c". The native engine and the checker each read the statement their own way, and both fail on the wrapper. The bare corpora, which have no wrapper, show far less loss.

No item was blocked at this stage for "invalid reasoning" or "certificate failure". Where the engine said invalid, P2 agreed. Every P2-certified chain replayed.

## Parser limitations vs genuine P2 unsupported cases

- **Parser limitations.** These are fixed by routing to P2's reader:
  - statement wrappers (verbs, bindings, conditions);
  - false ambiguity from wrapper text;
  - zero-product and square-root branch lines `A = B or C = D`, which the line parser refused with "solution branches must name one variable".
- **Genuine P2 unsupported cases.** These stay unsupported (see doc 9):
  - lines with two operations that P2 does not decompose (`x = 2x - 2 → x = 2`);
  - the quadratic formula and `±`;
  - radicals, logarithms and systems;
  - multipliers of unknown sign.
