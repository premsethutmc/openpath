import json
import random
from fractions import Fraction

import sympy as sp

random.seed(314159)
rows = []


def record(area, index, engine_expression, oracle_expression):
    delta = sp.simplify(engine_expression - oracle_expression)
    rows.append(
        {
            "id": f"{area}-{index:03}",
            "area": area,
            "engineExpression": str(engine_expression),
            "oracleExpression": str(oracle_expression),
            "match": delta == 0,
        }
    )


# Cartesian complex arithmetic and conjugation.
for i in range(50):
    a, b, c, d = i % 7 + 1, i % 5 - 2, i % 3 + 1, -(i % 4 + 1)
    z, w = a + b * sp.I, c + d * sp.I
    operation = i % 5
    if operation == 0:
        actual, oracle = z + w, (a + c) + (b + d) * sp.I
    elif operation == 1:
        actual, oracle = z * w, (a * c - b * d) + (a * d + b * c) * sp.I
    elif operation == 2:
        actual = sp.cancel(z / w)
        oracle = sp.cancel(((a * c + b * d) + (b * c - a * d) * sp.I) / (c * c + d * d))
    elif operation == 3:
        actual, oracle = sp.conjugate(z), a - b * sp.I
    else:
        actual, oracle = sp.expand_complex(z * sp.conjugate(z)), a * a + b * b
    record("arithmetic", i, actual, oracle)


# Exact pi-based polar multiplication, powers and supported roots of unity.
for i in range(50):
    p = sp.Rational((i % 7) - 3, 4)
    q = sp.Rational((i % 5) - 2, 2)
    radius_a, radius_b = sp.Integer(i % 4 + 1), sp.Integer(i % 3 + 1)
    operation = i % 3
    if operation == 0:
        actual = radius_a * sp.exp(sp.I * sp.pi * p) * radius_b * sp.exp(sp.I * sp.pi * q)
        oracle = radius_a * radius_b * sp.exp(sp.I * sp.pi * (p + q))
    elif operation == 1:
        exponent = i % 5 + 1
        actual = (radius_a * sp.exp(sp.I * sp.pi * p)) ** exponent
        oracle = radius_a**exponent * sp.exp(sp.I * sp.pi * p * exponent)
    else:
        n, k = 4, i % 4
        actual = sp.exp(2 * sp.pi * sp.I * k / n) ** n
        oracle = sp.Integer(1)
    record("polar", i, sp.expand_complex(actual), sp.expand_complex(oracle))


# Polynomial substitution, factor theorem, multiplicity and Vieta invariants.
x = sp.symbols("x")
for i in range(50):
    root = (i % 5) - 2 + sp.I * ((i % 3) - 1)
    conjugate = sp.conjugate(root)
    polynomial = sp.expand((x - root) * (x - conjugate) * (x - (i % 7 + 1)))
    operation = i % 4
    if operation == 0:
        actual, oracle = polynomial.subs(x, root), sp.Integer(0)
    elif operation == 1:
        actual, oracle = sp.rem(polynomial, x - root, domain=sp.QQ_I), sp.Integer(0)
    elif operation == 2:
        monic = sp.Poly(polynomial, x)
        roots = sp.roots(monic)
        actual, oracle = -monic.all_coeffs()[1], sum(value * count for value, count in roots.items())
    else:
        doubled = sp.expand((x - root) ** 2 * (x - conjugate))
        derivative, multiplicity = doubled, 0
        while sp.simplify(derivative.subs(x, root)) == 0:
            multiplicity += 1
            derivative = sp.diff(derivative, x)
        actual = sp.Integer(multiplicity)
        oracle = sp.Integer(3 if sp.simplify(root - conjugate) == 0 else 2)
    record("polynomial", i, actual, oracle)


# Complex-plane distance, translation, quarter rotation and reflection.
for i in range(50):
    a, b, c, d = i % 6, i % 5 - 2, i % 4 - 1, i % 3 + 1
    z, w = a + b * sp.I, c + d * sp.I
    operation = i % 4
    if operation == 0:
        actual = sp.expand_complex((z - w) * sp.conjugate(z - w))
        oracle = (a - c) ** 2 + (b - d) ** 2
    elif operation == 1:
        actual, oracle = z + w, (a + c) + (b + d) * sp.I
    elif operation == 2:
        actual, oracle = sp.expand_complex(sp.I * z), -b + a * sp.I
    else:
        actual, oracle = sp.conjugate(z), a - b * sp.I
    record("geometry", i, actual, oracle)


output = {
    "version": "complex-b3-exact-oracle@1",
    "seed": 314159,
    "total": len(rows),
    "matched": sum(row["match"] for row in rows),
    "oracle": f"SymPy {sp.__version__}",
    "results": rows,
}
assert output["total"] == 200
if output["matched"] != 200:
    print([row for row in rows if not row["match"]][:10])
    raise AssertionError(f"{output['matched']} of 200 oracle cases matched")
path = __file__.replace("exact_oracle_crosscheck.py", "exact-oracle-results.v1.json")
with open(path, "w", encoding="utf-8") as handle:
    json.dump(output, handle, indent=2)
    handle.write("\n")
print({"total": output["total"], "matched": output["matched"]})
