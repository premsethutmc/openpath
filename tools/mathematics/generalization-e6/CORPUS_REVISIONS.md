# E6 corpus revisions before implementation

1. 2026-10-28 (rev 1, 01:12Z): first freeze (hashes superseded).
2. rev 2: printer defects found by reading dev/E5-baseline output *before any engine change*:
   - implicit multiplication printed `6*3^2` as `63^2` (digit adjacency, ambiguous);
   - latex printed `((1+i)^2)^2` as `(1 + i)^{2}^{2}`;
   - negative right operands printed `u*-e^(-u)`.
   Fixed in `e6_oracle.py`; corpus regenerated and re-frozen. Labels were re-derived from the same oracle assertions (no label was edited by hand).
   The E5-engine baseline on e6dev (23/100 exact, 1 false acceptance) is diagnostic only and was run on the rev-1 dev partition; validation and sealed were never scored.
