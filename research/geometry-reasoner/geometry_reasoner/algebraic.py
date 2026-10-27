from __future__ import annotations

from fractions import Fraction

from .model import Fact, GeometryObject, GeometryProblem, VerificationResult, condition_distinct


def _point(problem: GeometryProblem, id: str):
    obj = problem.objects.get(id)
    if not obj or obj.kind != "point" or obj.get("x") is None or obj.get("y") is None:
        return None
    return Fraction(obj.get("x")), Fraction(obj.get("y"))


def _endpoints(problem: GeometryProblem, id: str):
    obj = problem.objects.get(id)
    if not obj or obj.kind not in {"line", "segment", "ray"}:
        return None
    points = tuple(obj.get("points", ()))
    return (_point(problem, points[0]), _point(problem, points[1])) if len(points) == 2 else None


def _vector(pair):
    if not pair or not pair[0] or not pair[1]: return None
    return pair[1][0] - pair[0][0], pair[1][1] - pair[0][1]


def _sq(v): return v[0] * v[0] + v[1] * v[1]


class AlgebraicVerifier:
    """Exact rational coordinate checks for selected proof obligations; no numeric tolerances or diagram guesses."""

    supported = {"collinear", "parallel", "perpendicular", "equal_length", "equal_angle", "incidence", "congruent", "similar"}

    def verify(self, problem: GeometryProblem, statement: Fact) -> VerificationResult:
        if statement.predicate not in self.supported:
            return self._result("unsupported", statement, "No coordinate translation exists for this relation.")
        try:
            value, missing = self._evaluate(problem, statement)
        except (KeyError, IndexError, ZeroDivisionError):
            return self._result("unsupported", statement, "The coordinate model is incomplete for this obligation.")
        if missing:
            return VerificationResult("missing_assumption", statement, "coordinate-invariant", (), (), tuple(missing), (), "Exact coordinate verification needs nondegenerate, distinct defining points.", strategy="algebraic")
        return self._result("verified" if value else "invalid", statement, "The exact coordinate invariant is zero/equal as required." if value else "The exact coordinate invariant contradicts the proposed conclusion.")

    def _result(self, verdict, statement, explanation):
        return VerificationResult(verdict, statement, "coordinate-invariant" if verdict != "unsupported" else None, (), (), (), (), explanation, strategy="algebraic")

    def _evaluate(self, problem: GeometryProblem, fact: Fact):
        p, a = fact.predicate, fact.args
        missing: list[str] = []
        if p == "collinear":
            A, B, C = (_point(problem, x) for x in a)
            if None in (A, B, C): return False, ["coordinates for all three points"]
            if A == B: missing.append(condition_distinct(a[0], a[1]))
            return (B[0]-A[0])*(C[1]-A[1]) == (B[1]-A[1])*(C[0]-A[0]), missing
        if p in {"parallel", "perpendicular"}:
            u, v = _vector(_endpoints(problem, a[0])), _vector(_endpoints(problem, a[1]))
            if not u or not v: return False, ["coordinates for both lines"]
            if _sq(u) == 0 or _sq(v) == 0: missing.append("nonzero direction vectors")
            return (u[0]*v[1]-u[1]*v[0] == 0 if p == "parallel" else u[0]*v[0]+u[1]*v[1] == 0), missing
        if p == "equal_length":
            u, v = _vector(_endpoints(problem, a[0])), _vector(_endpoints(problem, a[1]))
            if not u or not v: return False, ["coordinates for both segments"]
            return _sq(u) == _sq(v), missing
        if p == "incidence":
            point = _point(problem, a[0]); ends = _endpoints(problem, a[1])
            if not point or not ends or not ends[0] or not ends[1]: return False, ["point and line coordinates"]
            A, B = ends
            return (B[0]-A[0])*(point[1]-A[1]) == (B[1]-A[1])*(point[0]-A[0]), missing
        if p == "equal_angle":
            vectors = []
            for angle_id in a:
                angle = problem.objects.get(angle_id)
                pts = tuple(angle.get("points", ())) if angle else ()
                if len(pts) != 3: return False, ["three points for each angle"]
                A, V, B = (_point(problem, x) for x in pts)
                if None in (A, V, B): return False, ["coordinates for each angle point"]
                vectors.append(((A[0]-V[0], A[1]-V[1]), (B[0]-V[0], B[1]-V[1])))
            (u, v), (x, y) = vectors
            if 0 in (_sq(u), _sq(v), _sq(x), _sq(y)): return False, ["nonzero angle rays"]
            d1, d2 = u[0]*v[0]+u[1]*v[1], x[0]*y[0]+x[1]*y[1]
            return d1*d1*_sq(x)*_sq(y) == d2*d2*_sq(u)*_sq(v) and (d1 >= 0) == (d2 >= 0), missing
        if p in {"congruent", "similar"}:
            triangles = [problem.objects.get(x) for x in a]
            if any(not t or t.kind != "triangle" for t in triangles): return False, ["two coordinate triangles"]
            lengths = []
            for triangle in triangles:
                points = tuple(triangle.get("points", ()))
                if len(points) != 3: return False, ["three coordinate vertices per triangle"]
                coords = [_point(problem, x) for x in points]
                if any(x is None for x in coords): return False, ["coordinates for triangle vertices"]
                lengths.append([_sq((coords[(i+1)%3][0]-coords[i][0], coords[(i+1)%3][1]-coords[i][1])) for i in range(3)])
            if 0 in lengths[0] + lengths[1]: return False, ["nondegenerate triangles"]
            if p == "congruent": return lengths[0] == lengths[1], missing
            return all(lengths[0][i] * lengths[1][0] == lengths[1][i] * lengths[0][0] for i in range(1, 3)), missing
        return False, []
