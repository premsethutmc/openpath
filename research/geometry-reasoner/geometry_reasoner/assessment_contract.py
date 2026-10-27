"""Provisional domain-neutral boundary for a future OpenPath mathematics integration."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Protocol


@dataclass(frozen=True)
class MathematicalStatement:
    domain: str
    relation: str
    operands: tuple[str, ...]
    value: Any = None


@dataclass(frozen=True)
class ProofObligation:
    problem_id: str
    assumptions: tuple[MathematicalStatement, ...]
    known: tuple[MathematicalStatement, ...]
    proposed: MathematicalStatement
    conditions: tuple[str, ...]


@dataclass(frozen=True)
class MathematicalVerification:
    verdict: Literal["verified", "invalid", "missing_assumption", "unsupported"]
    rule_id: str | None
    premises: tuple[MathematicalStatement, ...]
    missing_conditions: tuple[str, ...]
    explanation: str
    verifier_version: str


@dataclass(frozen=True)
class StepEvidence:
    learner_id: str
    session_id: str
    item_id: str
    competency_ids: tuple[str, ...]
    statement: MathematicalStatement
    verification: MathematicalVerification
    input_method: str
    assistance: tuple[str, ...]
    provisional: bool


class MathematicalStepVerifier(Protocol):
    def verify(self, obligation: ProofObligation) -> MathematicalVerification: ...
