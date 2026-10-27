# Unified Mathematics U3 Capability Matrix

`Supported` means exact verification within the named rules. `Bounded` means only the stated families are implemented. `Unsupported` is an explicit non-verdict. `Inconclusive` means a supported verifier attempted the claim but could not prove or refute it within sound bounds.

| Subject | Status | Supported problems and transformations | Assumptions and limits |
|---|---|---|---|
| Arithmetic | Supported | Exact integer/rational arithmetic and registered number-operation families | Typed/parser-supported notation only |
| Elementary algebra | Supported / bounded | Equation transformations, exact substitution, polynomial expansion/factoring, rational cancellation | Denominator and lost-solution obligations are mandatory; unrestricted transcendental algebra is unsupported |
| Inequalities | Bounded | Linear, compound, bounded polynomial-sign and rational families | Sign reversal, excluded denominators and interval boundaries are preserved |
| Quadratics | Bounded | Factoring, completing square, formula, discriminant, repeated and supported exact radical roots | Exact represented radicals only; arbitrary algebraic numbers unsupported |
| Functions | Bounded | Evaluation, composition, supported inverse/domain and piecewise families | Inverse restrictions and declared domains required |
| Trigonometry | Bounded | Standard angles, Pythagorean and selected addition identities, equations and periodic sets in M2; symbolic identity reductions in M3 | Undefined tangent/reciprocal points and quadrant restrictions retained; arbitrary identity search inconclusive |
| Exponentials/logarithms | Bounded | Exact laws, supported equations/inequalities, log product/power and exp/log inverses | Positive arguments, positive base and base != 1 required; branch-sensitive complex laws unsupported |
| Sequences/series | Bounded | AP/GP terms and finite sums, supported recurrence/induction and convergent infinite GP | No formula inference from samples; convergence required |
| Radicals/surds | Bounded | Principal roots, exact simplification, selected rationalization/equations and extraneous-root checks | `sqrt(x²)=|x|`; nested/general algebraic radicals unsupported |
| Coordinate geometry | Bounded | Distance, midpoint, slope, line relationships/intersections and selected circles | Nondegeneracy and exact coordinate conditions required |
| Synthetic geometry | Bounded | Structured G4 theorem rules, proof sequences, dependencies, missing assumptions and first invalid step | No diagram parser; external natural-language proofs unsupported; orientation/construction support remains partial |
| Differentiation | Bounded | Constant/power/sum/product/quotient/chain, selected trig/exp/log, implicit/higher/piecewise cases | Point differentiability and domain conditions must be established |
| Integration | Bounded | Standard antiderivatives, FTC, substitution, parts, partial fractions, selected improper/piecewise families | Constants, bound transformations, singularities and convergence are checked; general symbolic integration unsupported |
| Limits/continuity | Bounded | Direct, polynomial/rational, selected trig, one-sided/infinite/piecewise and bounded L'Hôpital families | No numerical sampling proof; L'Hôpital preconditions required |
| General symbolic equivalence | Bounded | Exact multivariate rational-polynomial normalization; selected trig/log/exp/root rewrites; exact zero counterexamples; finite/interval/periodic set representation | 256 nodes, depth 24, 512 terms/candidates, 32 rewrites and 64 steps by default; unfamiliar claims remain inconclusive |
| Cross-domain proof state | Bounded | Ordered typed stages through one API, geometry-to-algebra obligations, M1/M2/calculus/symbolic stage composition | Explicit adapters only; no unrestricted theorem search; earliest failing stage stops assessment |
| Execution boundary | Supported for tested runtime | Persistent Python geometry pool, queue/deadlines, cancellation, crash replacement, graceful shutdown and aggregate metrics | Per-replica pool; production orchestration and metrics export remain outside the engine |

Representative verified examples include multivariate difference-of-squares expansion, `sin²(x)+cos²(x)=1`, positive-domain logarithm laws, `sqrt(x²)=|x|`, exact derivatives, supported integration-by-parts routes, structured triangle proofs and geometry-to-algebra angle obligations.

The matrix does not claim complete school, Class 12, IIT-JEE, geometry, calculus or symbolic coverage.
