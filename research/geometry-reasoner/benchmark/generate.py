"""Generate the committed, deterministic 180-case school-geometry benchmark."""
from __future__ import annotations

import json
from pathlib import Path


def fact(predicate, *args, value=None):
    return {"predicate": predicate, "args": list(args), **({"value": value} if value is not None else {})}


def obj(id, kind, **data): return {"id": id, "kind": kind, "data": data}


CASES = []


def add(category, n, objects, facts, conditions, goal, expected, oracle, steps=None, alternative_routes=None):
    CASES.append({
        "id": f"geo-{len(CASES)+1:03d}", "category": category, "objects": objects, "facts": facts,
        "conditions": conditions, "goal": goal, "student_steps": steps if steps is not None else [goal],
        "expected": expected, "oracle": oracle, "alternative_routes": alternative_routes or [],
    })


for i in range(18):
    a, b = f"v{i}a", f"v{i}b"
    add("vertical-opposite", i, [obj(a, "angle"), obj(b, "angle")], [fact("vertical_pair", a, b)], [], fact("equal_angle", a, b), {"verdict": "verified", "valid": True, "complete": True}, "Vertically opposite angles are equal.")

for i in range(18):
    a, b, measure = f"s{i}a", f"s{i}b", 15 + (i * 7) % 150
    add("straight-line", i, [obj(a, "angle"), obj(b, "angle")], [fact("linear_pair", a, b), fact("angle_measure", a, value=measure)], [], fact("angle_measure", b, value=180-measure), {"verdict": "verified", "valid": True, "complete": True}, f"Angles on a line sum to 180°, so 180−{measure}={180-measure}°.")

for i in range(18):
    l, m, a, b = f"p{i}l", f"p{i}m", f"p{i}a", f"p{i}b"
    relation = "corresponding_pair" if i % 2 == 0 else "alternate_pair"
    add("parallel-lines", i, [obj(l, "line"), obj(m, "line"), obj(a, "angle"), obj(b, "angle")], [fact("parallel", l, m), fact(relation, a, b, l, m)], [], fact("equal_angle", a, b), {"verdict": "verified", "valid": True, "complete": True}, "The named angle pair is equal because the two lines are explicitly parallel.")

for i in range(22):
    t, angles = f"t{i}", [f"t{i}A", f"t{i}B", f"t{i}C"]
    x, y = 20 + (i * 3) % 60, 30 + (i * 5) % 60
    if x + y >= 175: y = 40
    add("triangle-sum", i, [obj(t, "triangle", angles=angles, sides=[f"t{i}AB", f"t{i}BC", f"t{i}CA"]), *[obj(a, "angle") for a in angles]], [fact("angle_measure", angles[0], value=x), fact("angle_measure", angles[1], value=y)], [f"nondegenerate:{t}"], fact("angle_measure", angles[2], value=180-x-y), {"verdict": "verified", "valid": True, "complete": True}, f"A nondegenerate triangle sums to 180°: 180−{x}−{y}={180-x-y}°.")

for i in range(18):
    t, angles, sides = f"iso{i}", [f"iso{i}A", f"iso{i}B", f"iso{i}C"], [f"iso{i}AB", f"iso{i}BC", f"iso{i}CA"]
    add("isosceles", i, [obj(t, "triangle", angles=angles, sides=sides), *[obj(x, "angle") for x in angles], *[obj(x, "segment") for x in sides]], [fact("equal_length", sides[0], sides[2])], [f"nondegenerate:{t}"], fact("equal_angle", angles[2], angles[1]), {"verdict": "verified", "valid": True, "complete": True}, "Equal sides AB and CA have equal opposite angles C and B.")

for i in range(20):
    ts = []
    for name in ("u", "v"):
        angles, sides = [f"cg{i}{name}{x}" for x in "ABC"], [f"cg{i}{name}{x}" for x in ("AB", "BC", "CA")]
        ts.append((f"cg{i}{name}", angles, sides))
    objects = [obj(ts[0][0], "triangle", angles=ts[0][1], sides=ts[0][2]), obj(ts[1][0], "triangle", angles=ts[1][1], sides=ts[1][2])]
    if i < 10:
        facts = [fact("equal_length", ts[0][2][j], ts[1][2][j]) for j in range(3)]
        oracle, routes = "SSS establishes congruence.", (["SSS", "SAS"] if i < 4 else ["SSS"])
        if i < 4: facts.append(fact("equal_angle", ts[0][1][0], ts[1][1][0]))
    else:
        facts = [fact("equal_length", ts[0][2][0], ts[1][2][0]), fact("equal_length", ts[0][2][2], ts[1][2][2]), fact("equal_angle", ts[0][1][0], ts[1][1][0])]
        oracle, routes = "SAS establishes congruence.", ["SAS"]
    goal = fact("equal_angle", ts[0][1][1], ts[1][1][1]) if i < 6 else fact("congruent", ts[0][0], ts[1][0])
    add("triangle-congruence", i, objects, facts, [f"nondegenerate:{ts[0][0]}", f"nondegenerate:{ts[1][0]}"], goal, {"verdict": "verified", "valid": True, "complete": True}, oracle + (" CPCTC gives the requested angle." if i < 6 else ""), alternative_routes=routes)

for i in range(14):
    ts = []
    for name in ("u", "v"):
        angles, sides = [f"sm{i}{name}{x}" for x in "ABC"], [f"sm{i}{name}{x}" for x in ("AB", "BC", "CA")]
        ts.append((f"sm{i}{name}", angles, sides))
    objects = [obj(ts[0][0], "triangle", angles=ts[0][1], sides=ts[0][2]), obj(ts[1][0], "triangle", angles=ts[1][1], sides=ts[1][2])]
    facts = [fact("equal_angle", ts[0][1][0], ts[1][1][0]), fact("equal_angle", ts[0][1][1], ts[1][1][1])]
    add("triangle-similarity", i, objects, facts, [f"nondegenerate:{ts[0][0]}", f"nondegenerate:{ts[1][0]}"], fact("similar", ts[0][0], ts[1][0]), {"verdict": "verified", "valid": True, "complete": True}, "Two corresponding equal angles establish AA similarity.")

# Missing parallel assumptions: a drawing or angle-pair label alone cannot establish equality.
for i in range(12):
    l, m, a, b = f"mp{i}l", f"mp{i}m", f"mp{i}a", f"mp{i}b"
    add("missing-assumption", i, [obj(l, "line"), obj(m, "line"), obj(a, "angle"), obj(b, "angle")], [fact("corresponding_pair", a, b, l, m)], [], fact("equal_angle", a, b), {"verdict": "missing_assumption", "valid": False, "complete": False}, "Corresponding positions imply equality only after parallelism is established.")

# Incorrect conclusions contradicted by established measures.
for i in range(10):
    a, b = f"bad{i}a", f"bad{i}b"
    add("incorrect-conclusion", i, [obj(a, "angle"), obj(b, "angle")], [fact("angle_measure", a, value=30+i), fact("angle_measure", b, value=70+i)], [], fact("equal_angle", a, b), {"verdict": "invalid", "valid": False, "complete": False}, "The two established angle measures differ.")

# The numerical triangle claim looks plausible, but a nondegenerate triangle was never established.
for i in range(8):
    t, angles = f"deg{i}", [f"deg{i}A", f"deg{i}B", f"deg{i}C"]
    add("degenerate", i, [obj(t, "triangle", angles=angles, sides=[f"deg{i}AB", f"deg{i}BC", f"deg{i}CA"])], [fact("angle_measure", angles[0], value=60), fact("angle_measure", angles[1], value=60)], [], fact("angle_measure", angles[2], value=60), {"verdict": "missing_assumption", "valid": False, "complete": False}, "Triangle angle sum requires a nondegenerate triangle.")

for i in range(10):
    points = [obj(f"cy{i}{x}", "point") for x in "ABCD"]
    add("outside-coverage", i, points, [], [], fact("concyclic", *[p["id"] for p in points]), {"verdict": "unsupported", "valid": False, "complete": False}, "Concyclic reasoning is intentionally outside the prototype's theorem set.")

# Every submitted step is true, but it merely repeats a given and does not finish the proof.
for i in range(12):
    t, angles = f"inc{i}", [f"inc{i}A", f"inc{i}B", f"inc{i}C"]
    given = fact("angle_measure", angles[0], value=50)
    goal = fact("angle_measure", angles[2], value=70)
    add("valid-incomplete-proof", i, [obj(t, "triangle", angles=angles, sides=[f"inc{i}AB", f"inc{i}BC", f"inc{i}CA"])], [given, fact("angle_measure", angles[1], value=60)], [f"nondegenerate:{t}"], goal, {"verdict": "verified", "valid": True, "complete": False}, "The submitted step is valid but does not state or derive the requested conclusion.", steps=[given])

assert len(CASES) == 180
Path(__file__).with_name("school_geometry_v1.json").write_text(json.dumps({"version": "school-geometry-benchmark@1", "cases": CASES}, indent=2) + "\n")
print(f"wrote {len(CASES)} cases")
