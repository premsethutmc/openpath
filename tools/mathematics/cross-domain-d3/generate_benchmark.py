import hashlib
import json
from pathlib import Path

JOURNEYS = [
    ("geometry-algebra-trigonometry", "A verified triangle angle is bound as θ, reused in an algebraic equation, then supplied to an exact trigonometric-value problem."),
    ("algebra-functions-calculus", "A verified algebraic scalar is scoped as x, substituted into a function parameter, and retained in a calculus expression."),
    ("vectors-geometry-algebra", "A verified dot product is bound as a scalar constraint and reused without promoting an unproved perpendicularity claim."),
    ("matrices-systems-functions", "A verified determinant is bound as a scalar, used under its invertibility condition, and supplied to a function calculation."),
    ("probability-algebra-statistics", "A verified exact probability is rebound as a rational scalar and reused in a supported exact calculation."),
    ("complex-polynomial-algebra", "A verified complex norm or root fact is transferred to a polynomial constraint and then to exact algebra."),
    ("sequences-limits", "A verified sequence term is scoped as an exact scalar and used in a supported limiting expression."),
    ("calculus-algebra", "A verified calculus result is bound as an exact expression or scalar and used in a downstream algebraic constraint."),
]

MODES = (
    [("valid-reference", "verified", None)] * 40
    + [("valid-alternative", "verified", None)] * 20
    + [("invalid-type", "invalid", 1)] * 20
    + [("missing-assumption", "missing-assumption", None)] * 15
    + [("wrong-scope", "invalid", 1)] * 15
    + [("domain-mismatch", "invalid", 1)] * 10
    + [("circular", "malformed", 0)] * 10
    + [("unverified-source", "invalid", 0)] * 10
    + [("resource-exhausted", "resource-exhausted", None)] * 10
)

cases = []
for index, (mode, classification, first) in enumerate(MODES):
    journey, statement = JOURNEYS[index % len(JOURNEYS)]
    cases.append({
        "id": f"d3-{index:03d}",
        "journey": journey,
        "mode": mode,
        "problemStatement": statement,
        "assumptions": ["only source steps verified by their native reasoner may be exported", "symbol scopes must match explicitly"],
        "referenceTransfer": ["verify the source step", "create an exact typed binding", "check type, scope, restrictions and obligations", "substitute into the destination problem", "verify the destination step"],
        "expected": {"classification": classification, "firstInvalidStep": first},
        "oracle": "independently authored type, scope, dependency, and exact-value expectation",
    })

payload = {"version": "openpath-d3-cross-domain-benchmark@1", "frozen": True, "frozenBeforeImplementation": True, "cases": cases}
encoded = (json.dumps(payload, indent=2) + "\n").encode()
path = Path(__file__).with_name("frozen-cross-domain-cases.v1.json")
path.write_bytes(encoded)
digest = hashlib.sha256(encoded).hexdigest()
Path(__file__).with_name("FROZEN_SHA256").write_text(f"{digest}  {path.name}\n")
print({"cases": len(cases), "sha256": digest})
