"""Isolated adapter to the read-only math-core WorkingAssessment envelope.

Audited refs:
  feat/math-core 93127dd709358982b923c05797405ec0aa539364
  feat/domain-aware-reasoner 9cfc9ce07e8c2db63aefc07b5d5231ca917d3b55
Geometry details remain in an extension; no field is silently discarded.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
from .model import ProofAssessment

@dataclass(frozen=True)
class UnifiedStep:
    index:int; status:Literal["verified","invalid","unsupported","incomplete"]; explanation:str
@dataclass(frozen=True)
class GeometryExtension:
    schema_version:str
    native_verdicts:tuple[str,...]
    proof_dependencies:tuple[tuple[str,tuple[str,...]],...]
    mathematical_dependencies:tuple[tuple[tuple[str,tuple[str,...],object],...],...]
    unresolved_obligations:tuple[str,...]
    verification_scopes:tuple[str,...]
    skill_ids:tuple[str,...]
    resource_limit_reached:bool
@dataclass(frozen=True)
class UnifiedAssessment:
    outcome:Literal["verified","invalid","ambiguous","unsupported","incomplete"]
    correct:bool|None
    advisory:bool
    firstInvalidStep:int|None
    steps:tuple[UnifiedStep,...]
    causes:tuple[str,...]
    summary:str
    resourceLimit:bool
    geometry:GeometryExtension

def adapt_geometry_assessment(a:ProofAssessment,skill_ids:tuple[str,...]=())->UnifiedAssessment:
    resource=any(x.resource_limit_reached for x in (*a.steps,a.goal))
    if a.valid and a.complete: outcome="verified"
    elif a.valid: outcome="incomplete"
    elif any(x.verdict=="invalid" for x in a.steps): outcome="invalid"
    else: outcome="unsupported" # missing_assumption is retained natively below
    correct=True if outcome=="verified" else False if outcome=="invalid" else None
    status=lambda v: "verified" if v=="verified" else "invalid" if v=="invalid" else "unsupported"
    ext=GeometryExtension(schema_version="openpath-geometry-extension@1",native_verdicts=tuple(x.verdict for x in a.steps),proof_dependencies=a.dependency_graph,mathematical_dependencies=tuple(x.proof_dependencies for x in a.steps),unresolved_obligations=a.unresolved_obligations,verification_scopes=tuple(x.verification_scope for x in a.steps),skill_ids=skill_ids,resource_limit_reached=resource)
    return UnifiedAssessment(outcome,correct,True,a.first_invalid_step,tuple(UnifiedStep(i,status(x.verdict),x.explanation) for i,x in enumerate(a.steps)),(),f"geometry proof is {outcome}",resource,ext)
