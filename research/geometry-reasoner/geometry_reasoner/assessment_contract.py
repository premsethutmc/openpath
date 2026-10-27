"""Provisional domain-neutral boundary for a future OpenPath mathematics integration."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Protocol


@dataclass(frozen=True)
class MathematicalStatement:
    """Domain-neutral semantic statement; rendering text is deliberately excluded."""
    schema_version: str
    domain: str
    relation: str
    operands: tuple[str, ...]
    value: Any = None
    qualifiers: tuple[tuple[str, Any], ...] = ()


@dataclass(frozen=True)
class ProofObligation:
    contract_version: str
    problem_id: str
    assumptions: tuple[MathematicalStatement, ...]
    known: tuple[MathematicalStatement, ...]
    proposed: MathematicalStatement
    conditions: tuple[str, ...]
    resource_budget: tuple[tuple[str, int], ...] = ()


@dataclass(frozen=True)
class MathematicalVerification:
    verdict: Literal["verified", "invalid", "missing_assumption", "unsupported"]
    rule_id: str | None
    premises: tuple[MathematicalStatement, ...]
    missing_conditions: tuple[str, ...]
    explanation: str
    verifier_version: str
    proof_dependencies: tuple[str, ...] = ()
    unresolved_obligations: tuple[str, ...] = ()
    verification_scope: Literal["universal", "problem_instance", "none"] = "none"
    resource_limit_reached: bool = False


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
    sequence_index: int = 0
    prerequisite_skill_ids: tuple[str, ...] = ()


class MathematicalStepVerifier(Protocol):
    def verify(self, obligation: ProofObligation) -> MathematicalVerification: ...
