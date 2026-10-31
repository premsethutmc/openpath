"""Create the frozen D2 benchmark before implementation changes.

Statements are independently written equivalents, not copied exercises. Topic provenance
records the openly licensed texts consulted to select ordinary secondary-school concepts.
Expected verdicts and first-error locations are authored here, never obtained from OpenPath.
"""
import hashlib
import json
from pathlib import Path

SOURCES = {
    "algebra-equations": ("OpenStax Algebra and Trigonometry 2e", "https://openstax.org/details/books/algebra-and-trigonometry-2e"),
    "trigonometry": ("OpenStax Algebra and Trigonometry 2e", "https://openstax.org/details/books/algebra-and-trigonometry-2e"),
    "geometry": ("OpenStax Precalculus 2e", "https://openstax.org/details/books/precalculus-2e"),
    "calculus": ("OpenStax Calculus Volume 1", "https://openstax.org/details/books/calculus-volume-1"),
    "probability-combinatorics": ("OpenStax Introductory Statistics 2e", "https://openstax.org/details/books/introductory-statistics-2e"),
    "vectors-matrices": ("OpenStax Precalculus 2e", "https://openstax.org/details/books/precalculus-2e"),
    "complex-numbers": ("OpenStax Algebra and Trigonometry 2e", "https://openstax.org/details/books/algebra-and-trigonometry-2e"),
    "multi-domain": ("OpenStax Precalculus 2e and Calculus Volume 1", "https://openstax.org/subjects/math"),
}

TEMPLATES = {
    "algebra-equations": ("A polynomial relation is simplified, its roots are found, and the resulting values are checked against an inequality.", ["polynomial equivalence", "quadratic roots", "inequality domain"]),
    "trigonometry": ("An exact trigonometric value is established and then used in an algebraic relation without replacing exact values by decimals.", ["exact trigonometry", "algebraic substitution", "periodic/domain restrictions"]),
    "geometry": ("A triangle fact is proved, transferred to exact angle arithmetic, and checked against the stated nondegeneracy conditions.", ["Euclidean geometry", "angle arithmetic", "nondegeneracy"]),
    "calculus": ("A function is transformed, differentiated or integrated, and the resulting equation is solved with all domain conditions retained.", ["functions", "calculus", "equations"]),
    "probability-combinatorics": ("A finite count is justified before it is used as the denominator of an exact probability calculation.", ["combinatorics", "exact probability", "nonzero sample space"]),
    "vectors-matrices": ("Vector or matrix information is established and then used in an exact system or coordinate calculation.", ["linear algebra", "coordinate geometry", "dimension constraints"]),
    "complex-numbers": ("A complex-number identity is established and then used to verify a polynomial-root relationship with branch conditions preserved.", ["complex arithmetic", "polynomial roots", "complex-domain semantics"]),
    "multi-domain": ("A chain combines several supported domains; every later claim must depend only on facts established earlier in the chain.", ["cross-domain transfer", "proof dependencies", "domain restrictions"]),
}


def authored_problem(category, index):
    n = index + 2
    if category == "algebra-equations":
        return (f"Solve x² - {2*n+1}x + {n*(n+1)} = 0 and verify which roots satisfy x ≥ {n}.",
                [f"Factor as (x-{n})(x-{n+1})=0.", f"Hence x={n} or x={n+1}.", f"Both roots satisfy x≥{n}."],
                [f"Use the quadratic formula with discriminant 1.", f"x=({2*n+1}±1)/2, so x={n},{n+1}.", f"Check both in the inequality."],
                [f"Claim the factorization is (x+{n})(x+{n+1}).", "Continue to the correct positive roots without repairing that sign error."])
    if category == "trigonometry":
        angle = [0, 30, 45, 60, 90][index % 5]
        values = {0:"0",30:"1/2",45:"√2/2",60:"√3/2",90:"1"}
        return (f"Establish sin({angle}°) exactly, then use y=2sin({angle}°) without decimal approximation.",
                [f"Use the standard-angle construction to obtain sin({angle}°)={values[angle]}.", f"Substitute exactly: y=2·{values[angle]}.", "Simplify while retaining radicals."],
                ["Use a unit-circle coordinate for the same angle.", "Read its y-coordinate, then substitute into y=2sin θ."],
                [f"Use cos({angle}°) in place of sin({angle}°).", "Proceed as if the substituted value were justified."])
    if category == "geometry":
        a, b = 35 + index % 10, 45 + index % 8
        c = 180-a-b
        return (f"A nondegenerate triangle has angles {a}° and {b}°. Prove and calculate its third angle.",
                ["Invoke the triangle angle-sum theorem.", f"C=180°-{a}°-{b}°.", f"Therefore C={c}°."],
                [f"First combine the known angles: {a}+{b}={a+b}.", f"Take the supplement: 180-{a+b}={c}."],
                ["Assume the three angles sum to 360°.", f"Later state C={c}° without repairing the premise."])
    if category == "calculus":
        power = index % 5 + 2
        return (f"For f(x)=x^{power}, differentiate exactly and evaluate f′(1).",
                [f"Apply the power rule: f′(x)={power}x^{power-1}.", f"Substitute x=1: f′(1)={power}."],
                [f"Write x^{power} as a product and apply the product rule repeatedly.", f"Collect terms to obtain {power}x^{power-1}, then evaluate at 1."],
                [f"Differentiate to x^{power-1}, omitting the coefficient {power}.", f"Later give f′(1)={power} without correcting the derivative."])
    if category == "probability-combinatorics":
        total, chosen = n+4, 2
        count = total*(total-1)//2
        return (f"Choose 2 objects uniformly from {total} distinct objects. Count the unordered selections and find the probability of one specified pair.",
                [f"There are C({total},2)={count} unordered pairs.", f"Exactly one pair is specified, so P=1/{count}."],
                [f"Count ordered pairs {total}·{total-1}, then divide by 2.", f"Use the resulting sample-space size {count}."],
                [f"Use {total}² outcomes, incorrectly allowing repeated ordered choices.", f"State 1/{count} later without repairing the sample space."])
    if category == "vectors-matrices":
        a, b = index % 6 + 1, index % 5 + 2
        dot = a*b + 2
        return (f"For u=({a},1) and v=({b},2), calculate u·v and use it as the constant in x+1=u·v.",
                [f"u·v={a}·{b}+1·2={dot}.", f"Solve x+1={dot}, giving x={dot-1}."],
                ["Multiply matching components and add.", "Then subtract 1 from both sides of the scalar equation."],
                [f"Treat the dot product as ({a+b},3).", f"Later state x={dot-1} without repairing the vector/scalar error."])
    if category == "complex-numbers":
        a, b = index % 5 + 1, index % 4 + 1
        norm = a*a+b*b
        return (f"Let z={a}+{b}i. Compute z times its conjugate and verify z is a root of (x-z)(x-conjugate(z)).",
                [f"conjugate(z)={a}-{b}i.", f"z·conjugate(z)={a}²+{b}²={norm}.", "Substitution makes one polynomial factor zero."],
                ["Expand the conjugate pair first, then substitute z into the resulting quadratic."],
                [f"Use conjugate(z)={-a}-{b}i.", "Continue to the correct norm without repairing the conjugation error."])
    a, b = 3 + index % 5, 4 + index % 4
    hyp2 = a*a+b*b
    return (f"A right-triangle model has legs {a} and {b}. Derive c²={hyp2}, retain c>0, and use c in a supported downstream algebraic relation.",
            ["Establish the right-angle and nondegenerate-triangle facts.", f"Transfer {a}²+{b}²=c².", f"Thus c²={hyp2}; select only the positive length root."],
            [f"Compute {a}²+{b}² first, then invoke the verified Pythagorean relation and positivity."],
            ["Use the Pythagorean equation without establishing a right angle.", "Continue with correct arithmetic based on the unsupported premise."])


def route(index):
    mode = index % 25
    if mode < 10:
        return "reference-long", "verified", None, 18
    if mode < 15:
        return "alternative", "verified", None, 5
    if mode < 20:
        return "incorrect", "invalid", 2, 5
    if mode < 22:
        return "incomplete", "incomplete", None, 5
    if mode == 22:
        return "unsupported", "unsupported", None, 5
    if mode == 23:
        return "circular", "malformed", 0, 5
    return "resource-boundary", "resource-exhausted", None, 31


cases = []
for category in SOURCES:
    for local_index in range(25):
        chosen, verdict, first, stages = route(local_index)
        title, url = SOURCES[category]
        _, concepts = TEMPLATES[category]
        statement, reference_steps, alternative_steps, incorrect_steps = authored_problem(category, local_index)
        case_id = f"d2-{category}-{local_index:02d}"
        cases.append({
            "id": case_id,
            "category": category,
            "problemStatement": statement,
            "assumptions": ["all displayed denominators are nonzero when used", "all domain restrictions stated in a step remain in force"],
            "validReferenceSolution": {"route": "reference-long", "steps": reference_steps, "stageCount": 18},
            "alternativeValidSolution": {"route": "alternative", "steps": alternative_steps, "stageCount": 5},
            "incorrectStudentWorking": {"route": "incorrect", "steps": incorrect_steps, "expectedFirstInvalidStep": 2},
            "selectedRoute": chosen,
            "selectedStageCount": stages,
            "expected": {"classification": verdict, "firstInvalidStep": first},
            "requiredConcepts": concepts,
            "provenance": {"kind": "independently-written-equivalent", "topicReference": title, "url": url, "license": "CC BY 4.0", "copiedText": False},
        })

payload = {"version": "openpath-d2-external-benchmark@1", "frozen": True, "frozenBeforeImplementation": True, "cases": cases}
encoded = (json.dumps(payload, indent=2, ensure_ascii=False) + "\n").encode()
out = Path(__file__).with_name("frozen-external-benchmark.v1.json")
out.write_bytes(encoded)
digest = hashlib.sha256(encoded).hexdigest()
Path(__file__).with_name("FROZEN_SHA256").write_text(f"{digest}  {out.name}\n")
print({"cases": len(cases), "sha256": digest})
