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
