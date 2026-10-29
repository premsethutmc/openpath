"""Example authoring module (skipped by the loader because its name starts with '_')."""
from schema import T, W

# single transitions -------------------------------------------------------
T("EQN", "dividing by an expression that can be zero loses its zeros", "solution-set preservation under division",
  "x(x-3)=2(x-3)", "x=2", "statement", "invalid", why="x=3 satisfies the first equation and not the second", pair="eqn-div-zero")
T("EQN", "subtracting the same term keeps the solution set", "solution-set preservation", "x(x-3)=2(x-3)", "x(x-3)-2(x-3)=0",
  "statement", "valid-equivalence", why="adding -2(x-3) to both sides is reversible", pair="eqn-div-zero")
T("DOM", "cancelling a common factor removes an excluded value", "natural-domain preservation in expression rewriting",
  "(x^2-1)/(x-1)", "x+1", "expression", "domain-violation", why="equal only for x != 1; x+1 is defined at 1")
T("DOM", "the same cancellation with the restriction carried", "assumption-aware equivalence",
  "(x^2-1)/(x-1)", "x+1", "expression", "valid-equivalence", assumptions=["x != 1"], why="with x != 1 both sides agree everywhere")

# workings -----------------------------------------------------------------
W("EQN", "squaring then checking candidates", "extraneous-root obligation",
  {"type": "solve", "statement": "sqrt(x+2)=x"},
  ["x+2=x^2", "(x-2)(x+1)=0", "x=2 or x=-1", "check x=-1: sqrt(1)=1, not -1, so reject", "x=2"],
  "valid-implication", answer="x=2", why="squaring is one-way; the extraneous root is checked and rejected",
  oracle_lines=["x+2=x^2", "(x-2)(x+1)=0", "x=2 or x=-1", None, "x=2"])
W("CAL", "product rule", "derivative of a product", {"type": "derivative", "f": "x^2 sin(x)", "var": "x"},
  ["f'(x) = 2x sin(x) + x^2 cos(x)"], "valid-equivalence", answer="2x sin(x) + x^2 cos(x)", why="(uv)' = u'v + uv'",
  oracle_lines=["final: 2x sin(x) + x^2 cos(x)"])
W("ALG", "factorisation chain", "identity chain", {"type": "factor", "start": "x^2-5x+6"}, ["(x-2)(x-3)"],
  "valid-equivalence", answer="(x-2)(x-3)", why="product expands back to x^2-5x+6")
