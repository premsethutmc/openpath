from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from typing import Literal

from .model import Fact, GeometryProblem, VerificationResult, condition_distinct


@dataclass(frozen=True)
class AlgebraicCheck:
    classification: Literal["verified_for_instance", "exact_counterexample", "conditional", "unsupported"]
    statement: Fact
    missing_conditions: tuple[str, ...] = ()
    explanation: str = ""


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

    supported = {"collinear", "parallel", "perpendicular", "equal_length", "equal_angle", "incidence", "congruent", "similar", "midpoint", "distance_squared", "slope"}

    def check(self, problem: GeometryProblem, statement: Fact) -> AlgebraicCheck:
        """Check one fully specified coordinate instance. This is not a universal proof."""
        if statement.predicate not in self.supported:
            return AlgebraicCheck("unsupported", statement, explanation="No coordinate translation exists for this relation.")
        try:
            value, missing = self._evaluate(problem, statement)
        except (KeyError, IndexError, ZeroDivisionError, TypeError):
            return AlgebraicCheck("unsupported", statement, explanation="The coordinate model is incomplete for this obligation.")
        if missing:
            return AlgebraicCheck("conditional", statement, tuple(missing), "Exact evaluation requires the listed nondegeneracy conditions.")
        return AlgebraicCheck("verified_for_instance" if value else "exact_counterexample", statement, explanation="Exact rational coordinate invariants were evaluated for this problem instance.")

    def verify(self, problem: GeometryProblem, statement: Fact) -> VerificationResult:
        check = self.check(problem, statement)
        verdict = {"verified_for_instance": "verified", "exact_counterexample": "invalid", "conditional": "missing_assumption", "unsupported": "unsupported"}[check.classification]
        return VerificationResult(verdict, statement, "coordinate-invariant" if verdict != "unsupported" else None, (), (), check.missing_conditions, (), check.explanation, strategy="algebraic", verification_scope="problem_instance" if verdict in {"verified", "invalid"} else "none")

    def _result(self, verdict, statement, explanation):
        return VerificationResult(verdict, statement, "coordinate-invariant" if verdict != "unsupported" else None, (), (), (), (), explanation, strategy="algebraic", verification_scope="problem_instance")

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
        if p == "midpoint":
            M, A, B = (_point(problem, x) for x in a)
            if None in (M, A, B): return False, ["coordinates for midpoint and endpoints"]
            if A == B: missing.append(condition_distinct(a[1], a[2]))
            return 2*M[0] == A[0]+B[0] and 2*M[1] == A[1]+B[1], missing
        if p == "distance_squared":
            A, B = (_point(problem, x) for x in a)
            if None in (A, B): return False, ["coordinates for both points"]
            return (B[0]-A[0])**2 + (B[1]-A[1])**2 == fact.value, missing
        if p == "slope":
            A, B = (_point(problem, x) for x in a)
            if None in (A, B): return False, ["coordinates for both points"]
            if A == B: missing.append(condition_distinct(a[0], a[1]))
            if B[0] == A[0]: return fact.value == "undefined", missing
            return (B[1]-A[1]) == Fraction(fact.value) * (B[0]-A[0]), missing
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
