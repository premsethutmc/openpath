# Oracle changelog (all changes made before the benchmark freeze and before any E7 execution)

1. Form checks (`_form`): "expanded" now means no power of a sum and no product containing a sum in the written
   (unevaluated) final line; factor checks flatten nested products. Previously correct expansions with 3+ terms and
   products of 3+ factors were reported as incomplete (raised by the ALG/FUN author as [oracle-dispute] on
   ALG-0167/0171/0172/0191/0194/0211/0217).
2. Show-that: the target form must actually be written (structural comparison up to term/factor order), not merely
   a value equal to it (ALG-0187).
3. `restrict:` lines in expression chains now narrow the domain for later links, and sign assumptions derived from
   the domain include nonnegative/nonpositive (FUN-0173).
Author labels were not changed by these fixes; the [oracle-dispute] notes in those cases' explanations record the
history.
4. Expression chains: a domain widening is accepted only if the stated restrictions actually exclude the gained
   points (DOM-0197: "x != 0" stated, "x != 1" also needed); an unrepresentable restriction makes the case uncertified.
5. Solve tasks: a final solved statement listing values outside the task domain is an error (TRG-0190: x = 2π for
   x ∈ [0, 2π)), unless the working shows a check/rejection.
6. Trigonometric solution sets: SymPy `solveset` was found to (a) drop roots on bounded intervals (TRG-0168:
   1 − 2sin²x = sin x lost 3π/2) and (b) return a single period for sin(x) ≠ 0 over all reals. The oracle now refuses
   to certify trigonometric sets over unbounded domains, and on bounded domains cross-checks every finite set by
   dense numeric root search and every relation by sampled membership; any disagreement => uncertified. Numeric
   checks are used only to refuse, never to certify.
