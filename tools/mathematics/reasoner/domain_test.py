"""Domain-restriction tests. The checker must treat a step that silently drops 'x != 0' (cancelling x/x) as INVALID,
and must still accept steps that keep the restriction. Also records what the planner does with the same equations."""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from check import step_ok
CASES = [  # (previous, next, expected step_ok, why)
  ('(9*x)/x=10', '9=10', False, 'cancel x/x: widens the domain from x!=0 to all reals'),
  ('(9*x)/x=9', '9=9', False, 'cancel x/x: identity over x!=0 would be reported as identity over all reals'),
  ('(x*x)/x=5', 'x=5', False, 'cancel one factor of x: domain changes even though the solution set stays {5}'),
  ('x/x=1', '1=1', False, 'cancel x/x'),
  ('2*x=6', '(2*x)/x=6/x', False, 'divide both sides by x introduces x!=0'),
  ('2*x=6', 'x*(2*x)=x*6', False, 'multiply both sides by x adds the root 0'),
  ('2*x=6', '0*(2*x)=0*6', False, 'multiply both sides by 0'),
  ('(9*x)/x=10', '(9*x)/x+1=10+1', True, 'add 1 to both sides: domain x!=0 kept, solution set kept'),
  ('(9*x)/x=10', '2*((9*x)/x)=2*10', True, 'multiply both sides by 2 keeps the restriction'),
  ('2*x=6', '2*x/2=6/2', True, 'divide both sides by a non-zero constant'),
  ('3/x=6', '3=6*x', False, 'multiplying by x is only valid when x != 0 is carried along (here it is dropped)'),
  ('3/x=6', '3/x+1=6+1', True, 'keeps the restriction'),
]
def main():
    rows, ok = [], 0
    for prev, nxt, want, why in CASES:
        got = step_ok(prev, nxt); ok += got == want
        rows.append({'previous': prev, 'next': nxt, 'expectedValid': want, 'checkerSaysValid': got, 'pass': got == want, 'why': why})
    json.dump({'cases': rows, 'passed': ok, 'total': len(CASES)}, open(sys.argv[1], 'w'), indent=1)
    print(f"domain tests: {ok}/{len(CASES)} as expected")
if __name__ == '__main__': main()
