"""Build the independent hardening benchmark (540 deterministic cases)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent
base = json.loads((ROOT / "school_geometry_v1.json").read_text())["cases"]
cases = list(base)

def fact(predicate, *args, value=None):
    return {"predicate": predicate, "args": list(args), **({"value": value} if value is not None else {})}

def obj(id, kind, **data): return {"id": id, "kind": kind, "data": data}

def add(category, objects, facts, conditions, goal, verdict="verified", strategy="synthetic", steps=None, complete=True, oracle="independently calculated fixture"):
    cases.append({"id": f"g2-{len(cases)+1:03d}", "category": category, "objects": objects, "facts": facts,
                  "conditions": conditions, "goal": goal, "student_steps": steps or [goal], "strategy": strategy,
                  "expected": {"verdict": verdict, "valid": verdict == "verified", "complete": complete if verdict == "verified" else False},
                  "oracle": oracle, "alternative_routes": []})

for i in range(40):
    c, a, b = f"C{i}", f"ca{i}", f"ia{i}"; m = 40 + 2*(i % 50)
    add("circle-centre-angle", [obj(c,"circle"),obj(a,"angle"),obj(b,"angle")], [fact("central_inscribed_pair",a,b,c),fact("angle_measure",a,value=m)], [f"nondegenerate:{c}"], fact("angle_measure",b,value=m//2), oracle="inscribed angle is half the central angle on the same arc")
for i in range(40):
    c, a, b = f"S{i}", f"sa{i}", f"sb{i}"
    add("circle-same-segment", [obj(c,"circle"),obj(a,"angle"),obj(b,"angle")], [fact("same_segment_pair",a,b,c)], [f"nondegenerate:{c}"], fact("equal_angle",a,b), oracle="same chord and segment are explicit")
for i in range(40):
    q=f"Q{i}"; sides=[f"q{i}{x}" for x in "abcd"]; angles=[f"q{i}{x}" for x in "ABCD"]
    add("quadrilateral-parallelogram", [obj(q,"polygon",sides=sides,angles=angles)], [fact("parallelogram",q)], [f"nondegenerate:{q}"], fact("equal_length",sides[i%2],sides[(i%2)+2]), oracle="opposite sides of a parallelogram are equal")
for i in range(40):
    n=4+(i%5); p=f"P{i}"; angles=[f"p{i}a{x}" for x in range(n)]; known=[20+x*5 for x in range(n-1)]; total=(n-2)*180; known[-1] += max(0,total-sum(known)-10)
    add("polygon-angle-sum", [obj(p,"polygon",angles=angles)], [fact("angle_measure",a,value=v) for a,v in zip(angles,known)], [f"nondegenerate:{p}",f"simple:{p}"], fact("angle_measure",angles[-1],value=total-sum(known)), oracle="(n-2)×180 minus the independently summed known angles")
for i in range(40):
    t=f"R{i}"; sides=[f"r{i}a",f"r{i}b",f"r{i}c"]; a=3+(i%8); b=4+(i%7)
    add("pythagorean", [obj(t,"triangle",sides=sides,hypotenuse=sides[2])], [fact("right_triangle",t),fact("length_squared",sides[0],value=a*a),fact("length_squared",sides[1],value=b*b)], [f"nondegenerate:{t}"], fact("length_squared",sides[2],value=a*a+b*b), oracle="exact a²+b²")
for i in range(40):
    t=f"I{i}"; sides=[f"i{i}a",f"i{i}b",f"i{i}c"]; a,b=3+i%3,4+i%4; values=(a,b,min(5+i%5,a+b-1))
    add("triangle-inequality", [obj(t,"triangle",sides=sides)], [fact("length",s,value=v) for s,v in zip(sides,values)], [f"nondegenerate:{t}"], fact("less_than",sides[0],f"{sides[1]}+{sides[2]}"), oracle="positive nondegenerate triangle inequality")
for i in range(40):
    x,y=i%9-4,i%7-3; points=[obj(f"m{i}","point",x=x,y=y),obj(f"a{i}","point",x=x-2,y=y-4),obj(f"b{i}","point",x=x+2,y=y+4)]
    add("coordinate-midpoint", points, [], [f"distinct:a{i}:b{i}"], fact("midpoint",f"m{i}",f"a{i}",f"b{i}"), strategy="algebraic", oracle="exact rational midpoint identity")
for i in range(40):
    a,b=f"x{i}",f"y{i}"; goal=fact("equal_angle",a,b)
    add("inconsistent-premises", [obj(a,"angle"),obj(b,"angle")], [fact("vertical_pair",a,b),fact("not_vertical_pair",a,b)], [], goal, verdict="unsupported", oracle="inconsistent premises must not entail arbitrary conclusions")
for i in range(40):
    t=f"D{i}"; angles=[f"d{i}{x}" for x in "ABC"]
    add("valid-incomplete-multistep", [obj(t,"triangle",angles=angles)], [fact("angle_measure",angles[0],value=50),fact("angle_measure",angles[1],value=60)], [f"nondegenerate:{t}"], fact("angle_measure",angles[2],value=70), steps=[fact("angle_measure",angles[0],value=50)], complete=False, oracle="repeating a given is valid but does not complete the proof")

assert len(cases) == 540
(ROOT / "school_geometry_hardening_v2.json").write_text(json.dumps({"version":"school-geometry-hardening@2","cases":cases},indent=2)+"\n")
print(f"wrote {len(cases)} cases")
