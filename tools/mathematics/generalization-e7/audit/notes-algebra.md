alg audit notes. Scripts: t3.ts (batch runner), b1..b9.json (cases), t5.ts (route=true), t6/t7 (parser decimals).
Run: bun t3.ts bN.json
Key traces in final report. Extra cases: lin7 `2x+3=11/2x=8/x=8-4/x=4` verified; d15 `2x+3=11/3x=12/x=4` verified; d13 `x/2=3 / x=3+3 / x=6` verified;
lin3 answer-only `x=4` verified complete; fb1 `5y=10 / 1.5y=10 / y=2` verified (parser strips "1." as list number) ; dec6 `2/4 -> 0.5` invalid (checker-authority overrides native verified).
p5 simplify (x^2-1)/(x-1) -> x+1 verified with outstanding obligation ["1"] (domain restriction recorded not enforced).
Logs/exps: all unsupported/malformed (l1-l8). Inequality unions `x>2 or x<-2` malformed. `x-2=0 or x-3=0` malformed.
exact/ dir (number-families, verify, rational) is NOT imported by any engine route (only its own test); exact-e5.ts is used by e5/e6 (geo/calc), not algebra-text.
