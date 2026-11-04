# OpenPath B2 Vectors, Matrices and Linear Algebra

## Recommendation

**MERGE READY for the bounded exact-rational families documented here.** All accepted B2 steps are checked by an independent U4 linear-algebra kernel and returned through the existing unified assessment API.

## Mathematical architecture

B2 adds two modules:

- `linear-algebra.ts`: sequence, dependency, first-error and unified-envelope adapter;
- `linear-algebra-kernel.ts`: independent exact mathematical checker identified as `openpath-proof-kernel-linear-algebra@1`.

The adapter does not calculate correctness. It submits every step to the U4 kernel and accepts it only when the kernel returns `verified`. Kernel rejection becomes invalid; missing preconditions remain missing assumptions; unknown rules remain unsupported; exhausted bounds remain resource exhaustion.

The only public entry remains `assessMathematicalWorking(problem, studentWorking, options)`. B2 can participate in existing explicit cross-domain stages without creating another proof coordinator.

## Representation

B2 defines typed finite vectors, rectangular matrices with explicit dimensions, exact rational scalars, exact radical magnitudes, system-solution classifications and structured proof steps. Each step contains an ID, rule, exact result, dependencies and assumptions.

All arithmetic uses normalized BigInt rationals. Floating-point equality is never used for mathematical acceptance. The current supported coefficient boundary is exact rational coefficients; general symbolic matrix entries remain unsupported.

## Supported operations

### Vectors and coordinate geometry

- addition, subtraction and scalar multiplication;
- magnitude and bounded exact normalization;
- dot and 3D cross products;
- projection with a nonzero target vector;
- parallelism and perpendicularity;
- collinearity through exact dependence;
- direction vectors and distance;
- angle cosine when the norm product has an exact rational square root;
- triangle area in 2D;
- plane normals from two 3D direction vectors.

Zero-vector normalization and projection onto the zero vector are rejected. Dimensions must match. No geometric fact is inferred from a drawing.

### Matrices and determinants

- addition, subtraction and scalar multiplication;
- dimension-checked matrix multiplication;
- transpose, zero/identity-compatible operations;
- exact determinants through order 5;
- inverse through order 4;
- rank and exact RREF;
- exact commutativity checks rather than assuming `AB = BA`;
- cofactor-expansion and row-operation method labels.

### Linear systems

- exact Gaussian/RREF classification;
- unique, inconsistent and infinitely-many-solution systems;
- substitution, elimination, Gaussian elimination, inverse method and Cramer's-rule method labels within supported problems;
- inverse-method precondition requiring established invertibility.

Rank and augmented-rank reasoning distinguish the three solution classes. Singular inverse requests are rejected.

## Proof rules and alternative methods

The U4 allowlist includes component-wise arithmetic, dot/cross products, cofactor expansion, row operations, elimination, substitution, Gaussian elimination, inverse method, Cramer's rule and geometric-vector reasoning. Different valid method labels are accepted when their exact result and preconditions agree.

Dependencies are checked for uniqueness, ordering and cycles before U4 evaluation. A later correct result cannot repair an earlier invalid row operation or arithmetic step. Every verified step records the U4 kernel version and a rule/operation trace.

## Independent validation

The frozen corpus contains **400** cases, 100 per requested area. The first **100** were frozen before final tuning.

- exact classification and first-step agreement: **400/400**;
- verified: **200**;
- invalid: **80**;
- missing assumption: **30**;
- unsupported: **50**;
- resource exhausted: **40**;
- false acceptances: **0**;
- false rejections: **0**;
- first-invalid-step accuracy: **400/400**;
- verified steps carrying the independent U4 kernel version: **200/200**.

The corpus includes mismatched vector/matrix dimensions, incorrect products, false commutativity, singular inversion, incorrect determinant results, invalid row-operation results, unique/dependent/inconsistent systems, missing invertibility, unsupported rules and oversized proofs.

## Exact oracle cross-checks

SymPy independently checked **200/200** exact cases:

- 50 vector dot products;
- 50 matrix products;
- 50 independently expanded 3x3 determinants;
- 50 system classifications using rank and augmented rank.

The oracle uses exact integers/rationals. It supplements rather than generates runtime verdicts.

## Regression results

- Full learning/unified suite: **821 passed, 0 failed, 6,019 assertions, 0 skipped** across 49 files.
- Geometry G2-G4: **47 passed, 0 failed**.
- B1, D1, U4, U3, M3, M1/M2 and C2/C3 suites remain green.
- Worker-pool concurrency/failure tests remain green.
- Node-target package build passed.

No previously supported mathematical verdict changed.

## Performance and resource limits

Warm local measurements, 100 verified assessments per area:

| Area | p50 ms | p95 ms | p99 ms |
|---|---:|---:|---:|
| Vectors | 0.016 | 0.159 | 0.296 |
| Matrices | 0.014 | 0.116 | 0.252 |
| Determinants | 0.011 | 0.036 | 0.071 |
| Systems | 0.013 | 0.102 | 0.163 |

Limits are: vector dimension 12, matrix dimensions 6x6, determinant order 5, inverse order 4, 64 submitted proof steps, exact rational coefficients and bounded RREF. A 65-step submission returns resource exhausted immediately. No unrestricted symbolic matrix expansion is performed.

## Unsupported cases and limitations

1. General symbolic/eigenvalue matrix algebra, characteristic polynomials, diagonalization and abstract vector spaces are outside B2.
2. Exact normalization and angle cosine return unsupported when the required square root is outside the bounded rational-radical representation.
3. Higher-order determinant/inverse requests exceed explicit limits.
4. Arbitrary symbolic coefficients and parameter-dependent rank cases are unsupported.
5. General plane intersections, affine subspaces and numerical approximation are not implemented.
6. Row-operation traces identify the selected method and independently verify the resulting claim; B2 does not yet serialize every intermediate augmented matrix as a standalone kernel certificate.
7. Cross-domain geometry remains typed and evidence-backed; diagram recognition is not present.

Within these limits, OpenPath accepts alternative exact methods, enforces dimensions and invertibility, and identifies the earliest invalid step without weakening U4 or D1.
