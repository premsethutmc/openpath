# OpenPath U4 Independent Proof Kernel

## Recommendation

**MERGE READY for the bounded M3 certificate families listed here.** The kernel is small, separate from the symbolic generator, fail-closed, and now gates every accepted M3 symbolic step. It does not establish universal symbolic coverage.

## Certificate audit

U3's `replaySymbolicCertificate()` recomputed a SHA-256 digest over certificate fields. That detected alteration but never established that the source and target expressions were mathematically equivalent. The mistaken boundary was in `assessSymbolicWorking()`: an M3 `equivalent` result was accepted directly after generation; replay was only exercised by tests and was not an independent mathematical gate.

M3 emits strategies including `canonical-identity`, `rational-normal-form`, `algebraic-relations`, `absolute-value-condition`, `rational-countercertificate`, `bounded-rewrite`, and `exact-zero-counterexample`. Certificates carry canonical source/target expressions, rule names, assumptions, restrictions and obligations. They do not contain a full sequence of every internal canonicalization operation.

The smallest useful independent kernel therefore needs exact rational arithmetic, sparse multivariate polynomial arithmetic, rational-function cross multiplication, supported assumption-aware rewrites, exact trigonometric invariants, exact counterexample evaluation, domain restrictions and certificate/input binding.

## Trusted kernel architecture

`proof-kernel.ts` is independent of `symbolic-equivalence.ts`: it imports only the shared expression type and never calls the M3 verifier, canonicalizer, planner or equivalence function.

For every proposed accepted step it:

1. verifies certificate integrity;
2. rejects unknown rule names;
3. verifies certificate assumptions exactly match the submitted proof;
4. independently rewrites supported log, exponential, radical, absolute-value, tangent and angle-addition rules;
5. independently binds certificate source/target expressions to the submitted transformation;
6. checks exact rational-polynomial equality or a supported trigonometric identity;
7. checks nonzero/domain obligations and carried restrictions;
8. returns `verified`, `rejected`, or `unsupported` with kernel version and checked rules.

`assessSymbolicWorking()` now requires kernel `verified` before retaining M3's equivalent outcome. Kernel rejection or lack of coverage becomes unsupported/inconclusive, never a student mathematical error. Existing first-invalid-step and skill evidence behavior is retained. Dependency uniqueness and acyclicity remain checked by the sequence assessor before certificate acceptance.

## Independently checked families

- multivariate polynomial expansion, factorization and rearrangement;
- bounded rational-function identities using exact cross multiplication;
- denominator/nonzero restrictions and domain-preserving cancellation;
- exact algebraic substitution represented by the supported expression IR;
- positive-domain log product/power and exp/log inverse transformations;
- principal square-root and absolute-value assumptions;
- tangent ratio and two-term sine/cosine angle-addition rewrites;
- `sin²(t)+cos²(t)=1` for a structurally identical argument;
- exact-zero counterexamples using exact standard values;
- certificate/input binding and proof dependency ordering.

## Unsupported certificate families

The kernel returns unsupported for expressions outside its bounded IR, general transcendental identity search, complex branches, unrestricted nested radicals, general solution-set derivation, arbitrary piecewise equivalence and certificates needing a rule outside the allowlist. Exact solution-set representation remains checked by the existing domain engines; U4 does not pretend that M3 currently emits proof certificates for every set operation.

Calculus transformations are kernel-checked only for their symbolic intermediate equality. Calculus method preconditions, limits at singular points, integration bounds, constants and convergence remain checked by C2/C3 and cannot be overridden by U4.

## Adversarial validation

The frozen independently labelled corpus contains 150 cases: 25 each for forged digests, valid digests attached to false mathematics, missing assumptions, incorrect rule applications, invalid dependency chains, and valid/unsupported alternative routes.

- false acceptances: **0**;
- false rejections: **0**;
- rejected forged/false/incorrect-rule cases: **75/75**;
- invalid dependency chains identified: **25/25**;
- valid alternative routes verified: **20/20**;
- explicitly unsupported cases: **30** (25 missing assumptions and 5 unsupported families);
- newly inconclusive previously accepted M3 transformations: **0** in the existing 600-case and 150-case held-out corpora.

Valid-digest/false-mathematics tests are important: the digest remains internally valid, but the certificate's expressions do not match the submitted transformation, so the kernel rejects it.

## Regression results

- `bun test packages/learning`: **816 passed, 0 failed, 4,380 assertions, 0 skipped** across 46 files.
- Geometry G2-G4: **47 passed, 0 failed**.
- M3 independent corpus and held-out benchmark remain green.
- U3 400-case audit remains green under its documented exact-counterexample semantic change.
- Worker concurrency, cancellation, queue saturation, crashes and shutdown remain green.

No existing accepted supported symbolic transformation became inconclusive. No mathematical expected label was weakened.

## Performance impact

The same local U3 benchmark was rerun after kernel gating. Symbolic p50/p95/p99 changed from approximately **0.585/1.092/2.554 ms** to **0.730/1.614/2.602 ms**. The sample contains 30 warm requests and is a development microbenchmark. Arithmetic, geometry and other domain paths do not invoke U4. Geometry-worker behavior is unchanged.

The kernel uses bounded powers (magnitude 16) and caps intermediate polynomial products at 2,048 term pairs. It has no rewrite search loop, subprocess, network access or execution of submitted code.

## Remaining soundness limitations

1. The certificate format records named rewrites rather than a serialized intermediate state for every recursive subexpression. U4 independently replays the supported rewrite family against the original expressions, which is sufficient for the current bounded families but not a general proof language.
2. The trigonometric checker deliberately recognizes a small exact set. Unknown identities remain unsupported.
3. Assumption implication is bounded to exact positive/nonnegative/nonzero facts; it is not a general real-algebraic assumption prover.
4. Exact solution-set derivation and arbitrary parameter-dependent restrictions remain domain-reasoner responsibilities.
5. This is a symbolic-step kernel. Geometry theorem certificates and worker transport retain their independent G4/U2.1 verification paths.

Within that explicit boundary, a valid digest alone can no longer authorize an accepted M3 transformation.
