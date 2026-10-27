from __future__ import annotations

from dataclasses import dataclass, field
from fractions import Fraction
from typing import Any, Literal

FactStatus = Literal["given", "derived", "assumed", "unsupported", "contradicted"]
Verdict = Literal["verified", "invalid", "missing_assumption", "unsupported"]

SYMMETRIC = {"parallel", "perpendicular", "equal_length", "equal_angle", "congruent", "similar", "distinct"}


def _value(value: Any) -> Any:
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int):
        return Fraction(value)
    if isinstance(value, str) and "/" in value:
        try:
            return Fraction(value)
        except ValueError:
            return value
    return value


@dataclass(frozen=True)
class GeometryObject:
    id: str
    kind: Literal["point", "line", "segment", "ray", "angle", "triangle", "polygon", "circle"]
    data: tuple[tuple[str, Any], ...] = ()

    @classmethod
    def make(cls, id: str, kind: str, **data: Any) -> "GeometryObject":
        return cls(id, kind, tuple(sorted(data.items())))  # type: ignore[arg-type]

    def get(self, key: str, default: Any = None) -> Any:
        return dict(self.data).get(key, default)


@dataclass(frozen=True)
class Fact:
    predicate: str
    args: tuple[str, ...]
    value: Any = None
    status: FactStatus = "given"
    source: str | None = None

    def __post_init__(self) -> None:
        args = tuple(sorted(self.args)) if self.predicate in SYMMETRIC else self.args
        object.__setattr__(self, "args", args)
        object.__setattr__(self, "value", _value(self.value))

    @property
    def key(self) -> tuple[str, tuple[str, ...], Any]:
        return self.predicate, self.args, self.value

    def as_status(self, status: FactStatus, source: str | None = None) -> "Fact":
        return Fact(self.predicate, self.args, self.value, status, source or self.source)


@dataclass(frozen=True)
class Proof:
    theorem: str
    premises: tuple[Fact, ...]
    dependencies: tuple[tuple[str, tuple[str, ...], Any], ...]
    explanation: str
    conditions: tuple[str, ...] = ()


@dataclass
class GeometryProblem:
    id: str
    objects: dict[str, GeometryObject]
    facts: list[Fact]
    conditions: set[str] = field(default_factory=set)
    goal: Fact | None = None
    skill: str = "geometry.reasoning"


@dataclass(frozen=True)
class VerificationResult:
    verdict: Verdict
    statement: Fact
    theorem: str | None
    premises: tuple[Fact, ...]
    proof_dependencies: tuple[tuple[str, tuple[str, ...], Any], ...]
    missing_assumptions: tuple[str, ...]
    unsupported_conditions: tuple[str, ...]
    explanation: str
    candidate_misconception: str | None = None
    strategy: Literal["synthetic", "algebraic", "hybrid"] = "synthetic"
    verification_scope: Literal["universal", "problem_instance", "none"] = "universal"
    resource_limit_reached: bool = False


@dataclass(frozen=True)
class ProofAssessment:
    steps: tuple[VerificationResult, ...]
    valid: bool
    complete: bool
    goal: VerificationResult
    first_invalid_step: int | None = None
    unsupported_steps: tuple[int, ...] = ()
    unresolved_obligations: tuple[str, ...] = ()
    alternative_routes: tuple[tuple[str, ...], ...] = ()


def condition_distinct(a: str, b: str) -> str:
    return "distinct:" + ":".join(sorted((a, b)))


def condition_nondegenerate(object_id: str) -> str:
    return f"nondegenerate:{object_id}"
