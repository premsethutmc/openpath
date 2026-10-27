from __future__ import annotations

from dataclasses import replace
from typing import Iterable

from .algebraic import AlgebraicVerifier
from .model import Fact, GeometryProblem, ProofAssessment, VerificationResult, condition_nondegenerate
from .synthetic import SyntheticReasoner


def _contradiction(statement: Fact, facts: Iterable[Fact]):
    explicit = Fact("not_" + statement.predicate, statement.args, statement.value)
    for fact in facts:
        if fact.key == explicit.key:
            return fact, "The proposed conclusion directly contradicts an established fact."
        if statement.predicate == "angle_measure" and fact.predicate == "angle_measure" and fact.args == statement.args and fact.value != statement.value:
            return fact, f"The established angle measure is {fact.value}°, not {statement.value}°."
    if statement.predicate in {"equal_angle", "equal_length"}:
        measure = "angle_measure" if statement.predicate == "equal_angle" else "length"
        values = [next((f for f in facts if f.predicate == measure and f.args == (arg,)), None) for arg in statement.args]
        if all(values) and values[0].value != values[1].value:
            return values[0], "The established measures are unequal, so the equality is false."
    return None


def _missing(problem: GeometryProblem, statement: Fact, facts: Iterable[Fact]) -> tuple[str, ...]:
    facts = list(facts)
    if statement.predicate == "equal_angle":
        for relation in ("corresponding_pair", "alternate_pair"):
            pair = next((f for f in facts if f.predicate == relation and f.args[:2] == statement.args), None)
            if pair and not Fact("parallel", pair.args[2:4]).key in {f.key for f in facts}:
                return (f"parallel:{pair.args[2]}:{pair.args[3]}",)
        for triangle in problem.objects.values():
            if triangle.kind != "triangle": continue
            angles, sides = tuple(triangle.get("angles", ())), tuple(triangle.get("sides", ()))
            if all(x in angles for x in statement.args):
                opposite = {angles[2]: sides[0], angles[0]: sides[1], angles[1]: sides[2]} if len(angles) == len(sides) == 3 else {}
                if opposite:
                    need = Fact("equal_length", (opposite[statement.args[0]], opposite[statement.args[1]]))
                    if need.key not in {f.key for f in facts}: return (f"equal_length:{':'.join(need.args)}",)
    if statement.predicate == "angle_measure":
        triangle = next((obj for obj in problem.objects.values() if obj.kind == "triangle" and statement.args[0] in tuple(obj.get("angles", ()))), None)
        if triangle and condition_nondegenerate(triangle.id) not in problem.conditions:
            return (condition_nondegenerate(triangle.id),)
    if statement.predicate in {"congruent", "similar"}:
        return ("a complete SSS/SAS/ASA criterion" if statement.predicate == "congruent" else "two corresponding equal angles or a valid proportional-side criterion",)
    return ()


def verify_geometry_step(
    problem: GeometryProblem,
    known_facts: Iterable[Fact],
    student_step: Fact,
    *,
    synthetic: SyntheticReasoner | None = None,
    algebraic: AlgebraicVerifier | None = None,
) -> VerificationResult:
    """Verify one proposed conclusion. Unsupported means unproved by this prototype, never false."""
    synthetic = synthetic or SyntheticReasoner()
    extra = tuple(known_facts)
    state = synthetic.close(problem, extra)
    established = state.facts.get(student_step.key)
    if established:
        proof = state.proofs.get(student_step.key)
        return VerificationResult(
            "verified", student_step, proof.theorem if proof else established.source or "given",
            proof.premises if proof else (established,), proof.dependencies if proof else (established.key,), (), (),
            proof.explanation if proof else "The statement is explicitly established by the problem.",
        )
    contradiction = _contradiction(student_step, state.facts.values())
    if contradiction:
        fact, explanation = contradiction
        return VerificationResult("invalid", student_step, None, (fact,), (fact.key,), (), (), explanation, "unsupported inference from the diagram")
    missing = _missing(problem, student_step, state.facts.values())
    if missing:
        return VerificationResult("missing_assumption", student_step, None, (), (), missing, (), "The conclusion may follow after these assumptions or proof obligations are established.")
    if algebraic:
        checked = algebraic.verify(problem, student_step)
        if checked.verdict in {"verified", "invalid", "missing_assumption"}:
            return replace(checked, strategy="hybrid")
    supported_predicates = {predicate for rule in synthetic.rules for predicate in rule.conclusion_relations}
    condition = () if student_step.predicate in supported_predicates else (f"relation:{student_step.predicate}",)
    return VerificationResult("unsupported", student_step.as_status("unsupported"), None, (), (), (), condition, "The current engine cannot prove this conclusion. That is not evidence that it is false.")


def verify_student_proof(problem: GeometryProblem, student_steps: Iterable[Fact], *, algebraic: AlgebraicVerifier | None = None) -> ProofAssessment:
    accepted: list[Fact] = []
    results: list[VerificationResult] = []
    for step in student_steps:
        result = verify_geometry_step(problem, accepted, step, algebraic=algebraic)
        results.append(result)
        if result.verdict == "verified": accepted.append(step.as_status("derived", result.theorem))
    goal = verify_geometry_step(problem, accepted, problem.goal or Fact("unsupported_goal", ()), algebraic=algebraic)
    valid = all(result.verdict == "verified" for result in results)
    # Completeness concerns the submitted proof, not whether the engine can silently finish it from the givens.
    complete = valid and bool(results) and problem.goal is not None and results[-1].statement.key == problem.goal.key and goal.verdict == "verified"
    return ProofAssessment(tuple(results), valid, complete, goal)
