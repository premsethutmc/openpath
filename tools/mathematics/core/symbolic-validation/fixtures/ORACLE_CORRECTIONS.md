# Oracle corrections and their mathematical justification

A finite grid finds counterexamples and corroborates verdicts; it is NOT a proof of universal identity or domain equivalence. Where a verdict
says "valid / identity / same domain" the exact argument is the engine's cross-multiplication over Q[x1..xn] (exact rational polynomial
arithmetic); the oracle only supplies independent corroboration. A verdict of "invalid / domain not preserved" IS exact: one point suffices.

## C1. Missing witness a = -3/2 (grid defect)
- Original: (2a + 3z + 3)/(2a + 3z + 3)      Domain D0 = { 2a + 3z + 3 != 0 }
- Proposed line: (2a + 3)/(2a + 3)           Domain D1 = { 2a + 3 != 0 }
- Both equal 1 wherever both are defined, so the lines are an identity on D0 ∩ D1.
- Newly excluded point: a = -3/2, z = 1. Then 2a+3z+3 = -3+3+3 = 3 != 0, so the original is defined (value 1);
  2a+3 = 0, so the new line is 0/0, undefined. Hence D0 ⊄ D1 (exact, one point).
- The step introduces a restriction (2a+3 != 0) that the original does not imply. Unstated => invalid (contract); had the student stated
  "a != -3/2" it would be conditionally valid. Engine verdict (invalid) was right; the oracle said "conditional" only because its grid
  lacked a = -3/2. Correction: the grid now also contains c/2 and c/3 for each integer constant c in the case (roots of linear restrictions).

## C2. Grid lacked statement constants (e.g. "z != 5")   -> constants appearing in a case and their negatives are added.
## C3. Zero base to a symbolic exponent
Strict 0^0 / 0^negative produced false labels because the exponent's sign is unknown. Documented generic assumption: a power with a
symbolic exponent is read as defined only for a non-zero base (same on every line, as written). Same rule in engine and oracle: it is an
ASSUMPTION shared by both, stated in MATH_CORE_SYMBOLIC.md, not independent evidence that the assumption is the right one.
## C4. Degenerate generator cases (0, (0)^2) filtered; whole-case engine refusals (ambiguous "(z-2c)/3c", "cc") are counted as refused, not as disagreements.
