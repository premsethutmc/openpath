"""Experimental school-geometry reasoning package."""

from .model import Fact, GeometryObject, GeometryProblem, Proof, SubmittedProofStep, VerificationResult
from .synthetic import SyntheticReasoner
from .algebraic import AlgebraicCheck, AlgebraicVerifier
from .verify import verify_geometry_step, verify_student_proof, verify_submitted_proof

__all__ = [
    "Fact", "GeometryObject", "GeometryProblem", "Proof", "SubmittedProofStep", "VerificationResult",
    "SyntheticReasoner", "AlgebraicCheck", "AlgebraicVerifier", "verify_geometry_step", "verify_student_proof", "verify_submitted_proof",
]
