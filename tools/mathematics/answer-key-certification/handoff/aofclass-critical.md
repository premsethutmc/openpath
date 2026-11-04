# aofclass: Generator defect (critical)

- question id: gen:aofclass:-3,2,-5,2
- params: [-3, 2, -5, 2]
- prompt: Let f : [−5, ∞) → [6, ∞) be given by f(x) = x² + 6x + 11. Which statement is true?
- stored: C
- derived/counterexample: no option is true: f(−3)=2 ∉ [6,∞), so the stated f is not a map [−5,∞)→[6,∞); with the corrected codomain [2,∞) the answer would be C (onto, not one-one)
- affected count: 41
- why: In the 41 affected questions (all variant 2, vertex of f inside the domain) the printed codomain is [f(lo), ∞) where lo is the left end of the domain, but the true minimum of f on [lo, ∞) is the vertex value, which is smaller. So f takes values below the codomain's lower end: f is not a function into the stated codomain at all, so 'f is onto but not one-one' (keyed) is not true of the stated map. Example: f(x)=x²+6x+11 on [−5,∞): f(−3)=2 but the codomain is [6,∞). The intended codomain was [2,∞), for which the keyed answer would be right.
