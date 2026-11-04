# Soundness review: exact domain reasoner (poly.ts, domain-state.ts, domain-rules.ts)

Method: for each suspicion a concrete input was built and the true answer derived by hand (argument in `findings.json`); the code was run only to see what it says. Scripts and raw output: `probe.ts/.out`, `probe2.ts/.out`, `props.ts/.out` (400 randomised property trials against an independent bigint Fraction implementation), `probe_timing.ts/.out`. 26 findings; production code untouched.

## Unsound (wrong answer)

1. **S-01 / S-22 (high): negative exponents are not denominators.** The parser yields `pow(x, neg(1))` for `x^-1`, `x^(-1)`, `x^(1-2)`; `denominatorsOf` only looks for `exp.kind==="num"` with a negative value, so the pole at 0 is never restricted, yet `RatFun.fromExpr` accepts negative exponents and cancels `x^-1*x` to 1.
   - `checkStepText({eq:"x^-1*x=1",excluded:[]} -> {eq:"1=1",excluded:[]})` is valid. True: R\{0} vs R, not equivalent.
   - `checkClaim("1/(x-1)+0*x^-1=-1",["0"])` is valid. True: empty set (0 is outside the domain).
   - `solve("1/(x-1)-1/(x-1)=x^-1*x-1")` returns identity-on-domain with restrictions ["1"], claiming every other value (including 0) is a solution.
   - Unique-solution answers are protected by substitution into the original (the kernel evaluator throws on 0^-1), the identity path is not.
2. **S-03 (high): the `from` state is never validated.** Closure (I2) is computed only for `to`, and I3 needs the `original` argument that `checkStepText` never passes. `(x^2-1)/(x-1)=2 []  ->  x+1=2 []` is accepted as an equivalence (true: empty vs {1}); likewise `0/x=0 [] -> 0=0 []`, `x*x/x=x [] -> x=x []`, and `(x^2-2)/(x^2-2)=1 [] -> x=x []` (irrational poles in `from` are not even refused).
3. **S-04 (medium, outside engine scope): `solSet` compares complex-root polynomials, labelled "real roots".** False rejections only: `x^2+1=0 <=> x^2+4=0`, `x^2+1=0 <=> 1=0`, `x^4=4 <=> x^2=2`, `(x^2+1)(x-1)=0 <=> x-1=0`, and `x^2+1=0 => x=5` are all true over R but flagged. No false accept was found. The engine gate refuses reduced degree >= 2, so it never sees this.
4. **S-05 (medium, outside engine scope):** `checkClaim("x^2+1=0",[])` and `checkClaim("(x-1)*(x^2+1)=0",["1"])` are true claims but return invalid/"undecidable".
5. **S-16 (low):** `x^(x/x)=x [] -> x=x []` is accepted; denominators inside exponents are not recorded and `reduce()` cancels x/x.
6. **S-10 (low):** `checkClaim("x=x","all-real")` rejected though true.
7. **S-24 (low):** parser strips whitespace first, so `1 0` parses as 10.

## Unjustified but correct in scope

S-12 `zerosOfDenominators(1/(x-x))` returns `[]` silently (downstream refuses). S-14 `x^0`/`0^0` refused only by accident (zero-polynomial exponent has no `c[0]`), never silently decided. S-15 exponent >12 / fractional refused; huge exponent gives an untyped RangeError. S-18 `solve("(x^2-1e26)/x=1")` throws `OutsideBoundary` from `gate` (unguarded `splitLinear`) instead of returning `refused`. S-19 the 1e12 limit does not bound work: `rationalRoots` for `hc*x-hc` took 44 ms (720720), 1.2 s (7.35e8), >100 s (9.6e11). S-25 untyped crashes on malformed claim values. S-26 `accept-candidate` catch-all (unreachable for gated input, by reading).

## Held up (sound)

Beyond 1e12, `rationalRoots`/`splitLinear`/`zerosOfDenominators`/`checkClaim` throw `OutsideBoundary`: always a refusal, never a silent answer (S-17); equivalence of huge-coefficient steps is still decided exactly. Repeated roots and exclusions (S-06, S-07), zero polynomial and constants (S-09), `all`/`set` mixing and implication direction (S-08), division by zero (S-11), `0/x` and cancel-after-exclusion (S-13), `zerosIn` with irrational/complex divisors (S-20, S-21), and gcd/divmod/squarefree/rationalRoots/splitLinear/reduce/add (S-23: 0 failures in ~1,800 checks) are all correct.
