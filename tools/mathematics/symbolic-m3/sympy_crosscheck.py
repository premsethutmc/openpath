"""Independent computational cross-checks; these are not the corpus label oracle."""
import sympy as s
x,y=s.symbols("x y", real=True)
checks={
 "polynomial-expand": s.expand((3*x-2)*(x+y)) == 3*x**2+3*x*y-2*x-2*y,
 "rational-value": s.cancel((x**2-9)/(x-3)) == x+3,
 "trig-pythagorean": s.trigsimp(s.sin(x)**2+s.cos(x)**2-1) == 0,
 "trig-angle-addition": s.trigsimp(s.sin(x+y)-s.sin(x)*s.cos(y)-s.cos(x)*s.sin(y)) == 0,
 "log-positive": s.expand_log(s.log(x*y),force=True) == s.log(x)+s.log(y),
 "principal-root": s.sqrt(x**2) == s.Abs(x),
 "calculus-derivative-form": s.simplify(s.diff((x+1)*(x+2),x)-(2*x+3)) == 0,
 "antiderivative-difference": s.diff((x+1)*(x+2)-(x**2+3*x+2),x) == 0,
}
assert all(checks.values()),checks
print({"checks":len(checks),"passed":sum(checks.values())})
