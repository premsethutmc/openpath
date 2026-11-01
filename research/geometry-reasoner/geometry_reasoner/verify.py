from __future__ import annotations

from dataclasses import replace
from typing import Iterable

from .algebraic import AlgebraicVerifier
from .model import Fact, GeometryProblem, ProofAssessment, SubmittedProofStep, VerificationResult, condition_nondegenerate
from .synthetic import KnowledgeState, RULES, SyntheticReasoner


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
    if state.inconsistent:
        return VerificationResult("unsupported", student_step.as_status("unsupported"), None, (), (), (), ("consistent premises",), "The supplied premises are inconsistent; explosion is forbidden and no conclusion is inferred.")
    if state.malformed:
        return VerificationResult("unsupported", student_step.as_status("unsupported"), None, (), (), (), ("well-formed geometry input",), "Malformed geometric data stopped deduction safely.")
    established = state.facts.get(student_step.key)
    if established:
        proof = state.proofs.get(student_step.key)
        return VerificationResult(
            "verified", student_step, proof.theorem if proof else established.source or "given",
            proof.premises if proof else (established,), proof.dependencies if proof else (established.key,), (), (),
            proof.explanation if proof else "The statement is explicitly established by the problem.",
        )
    if state.resource_limit_reached:
        return VerificationResult("unsupported", student_step.as_status("unsupported"), None, (), (), (), ("reasoning resource limit",), "The bounded reasoner stopped safely before establishing this statement.", resource_limit_reached=True)
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
    first_invalid = next((i for i, r in enumerate(results) if r.verdict != "verified"), None)
    unsupported = tuple(i for i, r in enumerate(results) if r.verdict == "unsupported")
    obligations = tuple(dict.fromkeys(x for r in results for x in (*r.missing_assumptions, *r.unsupported_conditions)))
    route = tuple(r.theorem or "given" for r in results if r.verdict == "verified")
    return ProofAssessment(tuple(results), valid, complete, goal, first_invalid, unsupported, obligations, (route,) if route else ())


def _verify_justified_step(problem: GeometryProblem, accepted: list[Fact], step: SubmittedProofStep,
                           cited: tuple[Fact, ...], algebraic: AlgebraicVerifier | None) -> VerificationResult:
    """A method is a direct application of the cited rule, not a completed search.

    Global entailment is consulted only for a sound contradiction or an honest
    missing-assumption result. It cannot supply unstated intermediate steps.
    """
    conclusion = verify_geometry_step(problem, accepted, step.statement, algebraic=algebraic)
    if conclusion.verdict == "invalid" or conclusion.resource_limit_reached:
        return conclusion
    state = KnowledgeState(problem, accepted)
    if state.inconsistent or (conclusion.verdict == "unsupported" and conclusion.unsupported_conditions in (("consistent premises",), ("well-formed geometry input",))):
        return conclusion
    given = next((f for f in problem.facts if f.key == step.statement.key), None)
    if given and step.cited_theorem in (None, "given") and not cited:
        return VerificationResult("verified", step.statement, "given", (given,), (given.key,), (), (), "Restatement of a supplied fact; no method step is established.")
    rule = next((r for r in RULES if r.id == step.cited_theorem), None)
    if rule is None:
        if not step.cited_theorem and conclusion.verdict == "missing_assumption":
            return conclusion
        return VerificationResult("unsupported", step.statement, None, (), (), (), ("justification",),
                                  "Supply a supported rule and its intermediate steps; entailment alone is not demonstrated reasoning.")
    try:
        for index, (fact, premises, conditions) in enumerate(rule.apply(state)):
            if index >= 10_000:
                return VerificationResult("unsupported", step.statement, None, (), (), (), ("reasoning resource limit",), "The direct rule check reached its resource limit.", resource_limit_reached=True)
            keys = tuple(p.key for p in premises)
            if fact.key == step.statement.key and all(c.key in keys for c in cited):
                return VerificationResult("verified", step.statement, rule.id, tuple(premises), keys, (), (), rule.justification)
    except (IndexError, KeyError, TypeError, ValueError, ZeroDivisionError):
        return VerificationResult("unsupported", step.statement, None, (), (), (), ("well-formed geometry input",), "Malformed data stopped the rule check safely.")
    if conclusion.verdict == "missing_assumption":
        return conclusion
    return VerificationResult("unsupported", step.statement, None, (), (), (), ("justification",),
                              "The cited rule has not been justified from the givens and earlier accepted steps. Show an intermediate step or clarify the rule; this is not evidence that the method is false.")


def verify_submitted_proof(problem: GeometryProblem, steps: Iterable[SubmittedProofStep], *, algebraic: AlgebraicVerifier | None = None) -> ProofAssessment:
    """Verify an ordered student proof and its explicit citation graph.

    Future, unknown, self, duplicate, and circular references fail at the first offending
    step. A subsequent correct statement cannot repair that proof failure.
    """
    submitted = tuple(steps)
    ids = [step.id for step in submitted]
    duplicate_ids = {x for x in ids if ids.count(x) > 1}
    positions = {step_id: i for i, step_id in enumerate(ids)}
    by_id = {step.id: step for step in submitted}
    accepted: list[Fact] = []
    results: list[VerificationResult] = []
    graph: list[tuple[str, tuple[str, ...]]] = []
    for index, step in enumerate(submitted):
        graph.append((step.id, step.cited_step_ids))
        bad = tuple(ref for ref in step.cited_step_ids if ref not in positions or positions[ref] >= index)
        if step.id in duplicate_ids or bad:
            reason = "duplicate step identifier" if step.id in duplicate_ids else "forward, self, or unknown proof dependency"
            results.append(VerificationResult("invalid", step.statement, None, (), (), (), tuple(f"step:{x}" for x in bad), f"Invalid proof graph: {reason}."))
            continue
        cited = tuple(by_id[ref].statement for ref in step.cited_step_ids)
        # Citing an earlier unsupported line cannot promote it to a premise.
        accepted_keys = {f.key for f in accepted}
        result = _verify_justified_step(problem, accepted, step, cited, algebraic)
        if result.verdict == "verified" and any(f.key not in accepted_keys for f in cited):
            result = VerificationResult("unsupported", step.statement, None, (), (), (), ("established premises",), "An earlier cited step has not been established.")
        results.append(result)
        if result.verdict == "verified": accepted.append(step.statement.as_status("derived", result.theorem))
    goal = verify_geometry_step(problem, accepted, problem.goal or Fact("unsupported_goal", ()), algebraic=algebraic)
    valid = all(r.verdict == "verified" for r in results)
    demonstrated = any(r.verdict == "verified" and r.theorem != "given" for r in results)
    complete = valid and demonstrated and problem.goal is not None and results[-1].statement.key == problem.goal.key
    first = next((i for i, r in enumerate(results) if r.verdict == "invalid"), None)
    unsupported = tuple(i for i, r in enumerate(results) if r.verdict == "unsupported")
    obligations = tuple(dict.fromkeys(x for r in results for x in (*r.missing_assumptions, *r.unsupported_conditions)))
    route = tuple(r.theorem or "given" for r in results if r.verdict == "verified")
    return ProofAssessment(tuple(results), valid, complete, goal, first, unsupported, obligations, (route,) if route else (), tuple(graph))
