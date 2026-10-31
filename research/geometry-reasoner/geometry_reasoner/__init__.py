"""Experimental school-geometry reasoning package."""

from .model import Fact, GeometryObject, GeometryProblem, Proof, SubmittedProofStep, VerificationResult
from .synthetic import SyntheticReasoner
from .algebraic import AlgebraicCheck, AlgebraicVerifier
from .verify import verify_geometry_step, verify_student_proof, verify_submitted_proof
from .construction import ConstructionRequest, ConstructionResult, ConstructionVerifier
from .integration_adapter import GeometryExtension, UnifiedAssessment, adapt_geometry_assessment
from .unified_api import assess_unified

__all__ = [
    "Fact", "GeometryObject", "GeometryProblem", "Proof", "SubmittedProofStep", "VerificationResult",
    "SyntheticReasoner", "AlgebraicCheck", "AlgebraicVerifier", "verify_geometry_step", "verify_student_proof", "verify_submitted_proof",
    "ConstructionRequest", "ConstructionResult", "ConstructionVerifier",
    "GeometryExtension", "UnifiedAssessment", "adapt_geometry_assessment",
    "assess_unified",
]
