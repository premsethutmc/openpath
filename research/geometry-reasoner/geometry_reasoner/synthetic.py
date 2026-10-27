from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from itertools import combinations
from typing import Callable, Iterable

from .model import Fact, GeometryProblem, Proof, condition_nondegenerate


@dataclass(frozen=True)
class TheoremRule:
    id: str
    name: str
    required_relations: tuple[str, ...]
    required_conditions: tuple[str, ...]
    conclusion_relations: tuple[str, ...]
    justification: str
    apply: Callable[["KnowledgeState"], Iterable[tuple[Fact, tuple[Fact, ...], tuple[str, ...]]]]


class KnowledgeState:
    def __init__(self, problem: GeometryProblem, extra: Iterable[Fact] = ()) -> None:
        self.problem = problem
        self.facts: dict[tuple, Fact] = {}
        self.proofs: dict[tuple, Proof] = {}
        for fact in [*problem.facts, *extra]:
            self.facts[fact.key] = fact

    def has(self, predicate: str, *args: str, value=None) -> Fact | None:
        return self.facts.get(Fact(predicate, tuple(args), value).key)

    def all(self, predicate: str) -> list[Fact]:
        return [fact for fact in self.facts.values() if fact.predicate == predicate]

    def add(self, fact: Fact, rule: TheoremRule, premises: tuple[Fact, ...], conditions: tuple[str, ...]) -> bool:
        if fact.key in self.facts:
            return False
        derived = fact.as_status("derived", rule.id)
        self.facts[derived.key] = derived
        deps = tuple(p.key for p in premises)
        self.proofs[derived.key] = Proof(rule.id, premises, deps, rule.justification, conditions)
        return True


def _pair_rule(construction: str, conclusion: str, condition: Callable[[KnowledgeState, Fact], tuple[Fact, ...] | None] | None = None):
    def apply(state: KnowledgeState):
        for pair in state.all(construction):
            required = condition(state, pair) if condition else ()
            if required is not None:
                yield Fact(conclusion, pair.args[:2]), (pair, *required), ()
    return apply


def _parallel_pair(state: KnowledgeState, pair: Fact):
    # pair args: angle1, angle2, line1, line2; the transversal construction is explicit, never read from a drawing
    parallel = state.has("parallel", pair.args[2], pair.args[3])
    return (parallel,) if parallel else None


def _straight_line(state: KnowledgeState):
    for pair in state.all("linear_pair"):
        a, b = pair.args
        ma = next((x for x in state.all("angle_measure") if x.args == (a,)), None)
        mb = next((x for x in state.all("angle_measure") if x.args == (b,)), None)
        if ma and not mb:
            yield Fact("angle_measure", (b,), Fraction(180) - ma.value), (pair, ma), ()
        if mb and not ma:
            yield Fact("angle_measure", (a,), Fraction(180) - mb.value), (pair, mb), ()


def _triangle_sum(state: KnowledgeState):
    for triangle in state.problem.objects.values():
        if triangle.kind != "triangle":
            continue
        condition = condition_nondegenerate(triangle.id)
        if condition not in state.problem.conditions:
            continue
        angles = tuple(triangle.get("angles", ()))
        known = [next((x for x in state.all("angle_measure") if x.args == (angle,)), None) for angle in angles]
        if len(angles) == 3 and sum(x is not None for x in known) == 2:
            missing = next(i for i, item in enumerate(known) if item is None)
            premises = tuple(item for item in known if item is not None)
            yield Fact("angle_measure", (angles[missing],), Fraction(180) - sum((item.value for item in premises), Fraction())), premises, (condition,)


def _isosceles(state: KnowledgeState):
    for triangle in state.problem.objects.values():
        if triangle.kind != "triangle" or condition_nondegenerate(triangle.id) not in state.problem.conditions:
            continue
        sides, angles = tuple(triangle.get("sides", ())), tuple(triangle.get("angles", ()))
        if len(sides) != 3 or len(angles) != 3:
            continue
        # AB, BC, CA are opposite C, A, B respectively.
        opposite = (2, 0, 1)
        for i, j in combinations(range(3), 2):
            equal = state.has("equal_length", sides[i], sides[j])
            if equal:
                yield Fact("equal_angle", (angles[opposite[i]], angles[opposite[j]])), (equal,), (condition_nondegenerate(triangle.id),)


def _correspondence(state: KnowledgeState, relation: str):
    triangles = [obj for obj in state.problem.objects.values() if obj.kind == "triangle" and condition_nondegenerate(obj.id) in state.problem.conditions]
    for left, right in combinations(triangles, 2):
        ls, rs = tuple(left.get("sides", ())), tuple(right.get("sides", ()))
        la, ra = tuple(left.get("angles", ())), tuple(right.get("angles", ()))
        if len(ls) != 3 or len(rs) != 3 or len(la) != 3 or len(ra) != 3:
            continue
        side = [state.has("equal_length", ls[i], rs[i]) for i in range(3)]
        angle = [state.has("equal_angle", la[i], ra[i]) for i in range(3)]
        premises: tuple[Fact, ...] | None = None
        theorem = ""
        if relation == "congruent":
            if all(side): premises, theorem = tuple(side), "SSS"
            else:
                adjacent = ((0, 2), (0, 1), (1, 2))
                for vertex, (x, y) in enumerate(adjacent):
                    if side[x] and side[y] and angle[vertex]: premises, theorem = (side[x], angle[vertex], side[y]), "SAS"
                for side_index, (x, y) in enumerate(((0, 1), (1, 2), (2, 0))):
                    if angle[x] and angle[y] and side[side_index]: premises, theorem = (angle[x], side[side_index], angle[y]), "ASA"
        elif sum(x is not None for x in angle) >= 2:
            premises, theorem = tuple(x for x in angle if x)[:2], "AA"
        if premises:
            yield Fact(relation, (left.id, right.id)), premises, (condition_nondegenerate(left.id), condition_nondegenerate(right.id), theorem)


def _congruent_parts(state: KnowledgeState):
    for fact in state.all("congruent"):
        left, right = (state.problem.objects.get(x) for x in fact.args)
        if not left or not right:
            continue
        for a, b in zip(left.get("sides", ()), right.get("sides", ())):
            yield Fact("equal_length", (a, b)), (fact,), ()
        for a, b in zip(left.get("angles", ()), right.get("angles", ())):
            yield Fact("equal_angle", (a, b)), (fact,), ()


RULES = (
    TheoremRule("vertical-opposite", "Vertically opposite angles", ("vertical_pair",), (), ("equal_angle",), "Vertically opposite angles formed by two intersecting lines are equal.", _pair_rule("vertical_pair", "equal_angle")),
    TheoremRule("straight-line", "Angles on a straight line", ("linear_pair", "angle_measure"), (), ("angle_measure",), "Adjacent angles on a straight line sum to 180°.", _straight_line),
    TheoremRule("parallel-corresponding", "Corresponding angles", ("parallel", "corresponding_pair"), (), ("equal_angle",), "Corresponding angles are equal when a transversal crosses parallel lines.", _pair_rule("corresponding_pair", "equal_angle", _parallel_pair)),
    TheoremRule("parallel-alternate", "Alternate interior angles", ("parallel", "alternate_pair"), (), ("equal_angle",), "Alternate interior angles are equal when a transversal crosses parallel lines.", _pair_rule("alternate_pair", "equal_angle", _parallel_pair)),
    TheoremRule("triangle-sum", "Triangle angle sum", ("angle_measure",), ("nondegenerate triangle",), ("angle_measure",), "The interior angles of a nondegenerate triangle sum to 180°.", _triangle_sum),
    TheoremRule("isosceles-base-angles", "Isosceles triangle base angles", ("equal_length",), ("nondegenerate triangle",), ("equal_angle",), "Angles opposite equal sides in a nondegenerate triangle are equal.", _isosceles),
    TheoremRule("triangle-congruence", "Triangle congruence", ("equal_length", "equal_angle"), ("nondegenerate triangles",), ("congruent",), "SSS, SAS or ASA establishes triangle congruence with the stated correspondence.", lambda state: _correspondence(state, "congruent")),
    TheoremRule("triangle-similarity", "Triangle similarity", ("equal_angle",), ("nondegenerate triangles",), ("similar",), "Two corresponding equal angles establish triangle similarity (AA).", lambda state: _correspondence(state, "similar")),
    TheoremRule("cpctc", "Corresponding parts of congruent triangles", ("congruent",), (), ("equal_length", "equal_angle"), "Corresponding sides and angles of congruent triangles are equal.", _congruent_parts),
)


class SyntheticReasoner:
    def __init__(self, rules: tuple[TheoremRule, ...] = RULES, max_rounds: int = 20) -> None:
        self.rules = rules
        self.max_rounds = max_rounds

    def close(self, problem: GeometryProblem, extra: Iterable[Fact] = ()) -> KnowledgeState:
        state = KnowledgeState(problem, extra)
        for _ in range(self.max_rounds):
            changed = False
            for rule in self.rules:
                for fact, premises, conditions in rule.apply(state):
                    changed |= state.add(fact, rule, tuple(premises), tuple(conditions))
            if not changed:
                return state
        return state
