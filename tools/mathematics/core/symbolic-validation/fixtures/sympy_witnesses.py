"""Exact (Fraction) witnesses for the three SymPy disagreements: original defined, proposed line undefined."""
from fractions import Fraction as F
cases = [
 ("(-2a+3b)/(-2a+3b) -> (3b)/(3b)", lambda a,b: -2*a+3*b, lambda a,b: 3*b, dict(a=F(1), b=F(0))),
 ("(2a+3z+3)/(2a+3z+3) -> (2a+3)/(2a+3)", lambda a,z: 2*a+3*z+3, lambda a,z: 2*a+3, dict(a=F(-3,2), z=F(1))),
 ("(6y+3)/(6y+3) -> (3y)/(3y)", lambda y: 6*y+3, lambda y: 3*y, dict(y=F(0))),
]
for name, den0, den1, pt in cases:
    d0, d1 = den0(**pt), den1(**pt)
    print(name, pt, "original denominator", d0, "(defined, value 1)" if d0 != 0 else "UNDEFINED", "| new denominator", d1, "(UNDEFINED 0/0)" if d1 == 0 else "defined")
    assert d0 != 0 and d1 == 0
