"""Experimental school-geometry reasoning package."""

from .model import Fact, GeometryObject, GeometryProblem, Proof, VerificationResult
from .synthetic import SyntheticReasoner
from .algebraic import AlgebraicVerifier
from .verify import verify_geometry_step, verify_student_proof

__all__ = [
    "Fact", "GeometryObject", "GeometryProblem", "Proof", "VerificationResult",
    "SyntheticReasoner", "AlgebraicVerifier", "verify_geometry_step", "verify_student_proof",
]
