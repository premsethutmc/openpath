# 3. Canonical representation and normalization

## One reader, one tree

On the statement-text route, P2's `normalizeTask` in `derivation-authority.ts` is now the one reader of the task. It produces `TaskContext`:

- `trees` holds the `Tree` that the P2 authority certifies;
- the declared conditions, the natural domain and the bindings come with it.

The engine does not build a second interpretation of the task. It:

1. asks P2 to read the task;
2. asks P2 to judge the working against that reading;
3. replays the certificate chain P2 issued;
4. records the result.

The native engine and the independent checker still read the statement their own way, as before, because their existing verdicts are kept. P2 is consulted only where both of them abstained. That rule is in `authorityReading` in `unified-math-engine.ts`.

| Form | Read by |
|---|---|
| verbs: solve, simplify, expand, factorise, evaluate, find x … | `normalizeTask` VERB |
| `Given x = 3, find y where y = …`, `… when x = 4` | `normalizeTask` bindings and `defined` |
| `… for x ≠ 3`, `, x > 0`, several conditions joined by "and" or "," | `normalizeTask` conditions → assumptions and `domain` |
| the natural domain (variable denominators ≠ 0) | `normalizeTask` `natural` |
| `−`, `×`, `÷`, `·`, `²`, `³`, `≤`, `≥`, `[ ]` | `strip()` in P2 |
| an inequality task | `normalizeTask` `mode: "inequality"` with `rel` |
| a line `A = B or C = D` (zero product, square-root split) | `natural-disjunction.ts` (engine only): each branch is read by the shared line parser as one equation; the line text goes to P2 unchanged |

## What changed

1. **`natural-disjunction.ts` (new, engine only).** The shared line parser `natural-working.ts` is also an input of the server-grader bundle, so it is **not modified**. The bundle manifest is unchanged and the server grader behaves exactly as before. When the shared parser refuses a working, every refused line made of 2–8 equations joined by "or" (not all in `variable = value` form) is read branch by branch by that same parser. Each branch must come back as exactly one equation, and the line then becomes a `disjunction` relation. The canonical IR (`canonical-math-ir.ts`, not in the bundle) serialises it the same way it serialises a conjunction. Only the statement-text route uses this, and only P2 judges such a line: the checker and the native engine abstain on it.
2. **`unified-math-engine.ts` (`gateAlgebraText`).** Two steps now run around the established gate:
   - `notationAmbiguity` runs first and fails closed (see doc 4);
   - `authorityReading` runs after the established gate. It adopts P2's verdict only when both the checker and the candidate abstained (`unsupported` or `resource-exhausted`), or when the candidate's only ambiguity came from the wrapper text.
3. **`derivation-authority.ts` (P2, still @3).** Four additions:
   - the notation@2 ambiguity rules;
   - a structured `ambiguous` flag on a refused task;
   - final-form completeness for rational expressions in lowest terms;
   - one bounded two-step decomposition for inequalities (a registered balance, then symmetry).
4. **`evidence-provenance.ts`.** The mechanism `p2-derivation-authority` is registered. It applies to the `algebra-text` route only and covers algebra claims only, like the other checker mechanisms on that route. The engine also records the P2 reasoner in the envelope. Its evidence can therefore discharge proof obligations in `certifyClaims` and `adjudicate`. An unregistered label never could.

## What P2 is allowed to establish through the engine

| P2 verdict | Engine classification | Conditions |
|---|---|---|
| every line certified, replay ok, final answer complete and exactly correct | `verified` | gate level `p2-derivation-authority`, one evidence item per line carrying that line's certificate digest |
| every line certified, replay ok, no final answer stated | `incomplete` | `correct: null` |
| a transition refuted by exact solution-set comparison | `invalid` | earliest invalid line, with a counterexample when P2 has one; the final answer is recorded separately |
| a line unsupported or unrecognised | unchanged (`unsupported`) | P2's partial evidence is attached as a note; no credit |
| every line certified, but the chain does not replay | unchanged (`unsupported`) | obligation "the derivation certificate chain did not replay" |
| every line certified, final answer not confirmed | unchanged (`unsupported`) | obligation names the reason |
| native engine verified, P2 refutes | unchanged (`unsupported`) | treated as a conflict: nothing is certified |

The parser never declares a step valid. Every per-step classification comes from P2's transition statuses. The claim ledger, the proof obligations and adjudication run unchanged after the gate, and they can still withdraw an acceptance.

`derivationAuthority.methodShown` is false when the only certified move is `answer-claim`, meaning a bare stated answer. In that case the engine certifies the answer, not a method. The journey's `workingEvidence` already applies the full answer-vs-method@1 rule.
