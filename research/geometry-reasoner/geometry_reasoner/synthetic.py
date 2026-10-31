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
        self.alternative_proofs: dict[tuple, list[Proof]] = {}
        self.inconsistent = False
        self.malformed = False
        self.resource_limit_reached = False
        self.rule_applications = 0
        for fact in [*problem.facts, *extra]:
            opposite = Fact(fact.predicate[4:], fact.args, fact.value).key if fact.predicate.startswith("not_") else Fact("not_" + fact.predicate, fact.args, fact.value).key
            if opposite in self.facts:
                self.inconsistent = True
            self.facts[fact.key] = fact
        self._check_numeric_consistency()

    def _check_numeric_consistency(self) -> None:
        values: dict[tuple[str, tuple[str, ...]], object] = {}
        for fact in self.facts.values():
            if fact.predicate in {"angle_measure", "length", "length_squared"}:
                k = (fact.predicate, fact.args)
                if k in values and values[k] != fact.value: self.inconsistent = True
                values[k] = fact.value
                if fact.value is not None and fact.value < 0: self.inconsistent = True
        for obj in self.problem.objects.values():
            if obj.kind != "triangle": continue
            sides = tuple(obj.get("sides", ()))
            lengths = [self.valued("length", side) for side in sides]
            if len(lengths) == 3 and all(lengths):
                v = [x.value for x in lengths]
                if any(v[i] + v[(i+1)%3] <= v[(i+2)%3] for i in range(3)): self.inconsistent = True

    def has(self, predicate: str, *args: str, value=None) -> Fact | None:
        return self.facts.get(Fact(predicate, tuple(args), value).key)

    def all(self, predicate: str) -> list[Fact]:
        return [fact for fact in self.facts.values() if fact.predicate == predicate]

    def valued(self, predicate: str, *args: str) -> Fact | None:
        return next((fact for fact in self.all(predicate) if fact.args == tuple(args)), None)

    def add(self, fact: Fact, rule: TheoremRule, premises: tuple[Fact, ...], conditions: tuple[str, ...]) -> bool:
        if fact.key in self.facts:
            proof = Proof(rule.id, premises, tuple(p.key for p in premises), rule.justification, conditions)
            if fact.key in self.proofs and proof not in self.alternative_proofs.setdefault(fact.key, [self.proofs[fact.key]]):
                self.alternative_proofs[fact.key].append(proof)
            return False
        derived = fact.as_status("derived", rule.id)
        self.facts[derived.key] = derived
        deps = tuple(p.key for p in premises)
        self.proofs[derived.key] = Proof(rule.id, premises, deps, rule.justification, conditions)
        self.alternative_proofs[derived.key] = [self.proofs[derived.key]]
        return True

    def proof_graph_acyclic(self) -> bool:
        visiting, done = set(), set()
        def visit(key):
            if key in done: return True
            if key in visiting: return False
            visiting.add(key)
            proof = self.proofs.get(key)
            if proof and any(dep in self.proofs and not visit(dep) for dep in proof.dependencies): return False
            visiting.remove(key); done.add(key); return True
        return all(visit(key) for key in self.proofs)


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


def _circle_rules(state: KnowledgeState):
    for relation in state.all("central_inscribed_pair"):
        central, inscribed, circle = relation.args
        if f"nondegenerate:{circle}" not in state.problem.conditions: continue
        mc = state.valued("angle_measure", central); mi = state.valued("angle_measure", inscribed)
        if mc and not mi and 0 < mc.value < 360: yield Fact("angle_measure", (inscribed,), mc.value / 2), (relation, mc), (f"nondegenerate:{circle}",)
        if mi and not mc and 0 < mi.value < 180: yield Fact("angle_measure", (central,), mi.value * 2), (relation, mi), (f"nondegenerate:{circle}",)
    for relation in state.all("same_segment_pair"):
        circle = relation.args[2]
        if f"nondegenerate:{circle}" in state.problem.conditions:
            yield Fact("equal_angle", relation.args[:2]), (relation,), (f"nondegenerate:{circle}",)


def _quadrilateral_rules(state: KnowledgeState):
    for fact in state.all("parallelogram"):
        q = state.problem.objects.get(fact.args[0])
        if not q or f"nondegenerate:{q.id}" not in state.problem.conditions: continue
        sides, angles = tuple(q.get("sides", ())), tuple(q.get("angles", ()))
        if len(sides) == 4:
            yield Fact("equal_length", (sides[0], sides[2])), (fact,), (f"nondegenerate:{q.id}",)
            yield Fact("equal_length", (sides[1], sides[3])), (fact,), (f"nondegenerate:{q.id}",)
        if len(angles) == 4:
            yield Fact("equal_angle", (angles[0], angles[2])), (fact,), (f"nondegenerate:{q.id}",)
            yield Fact("equal_angle", (angles[1], angles[3])), (fact,), (f"nondegenerate:{q.id}",)


def _polygon_angles(state: KnowledgeState):
    for polygon in state.problem.objects.values():
        if polygon.kind != "polygon" or f"nondegenerate:{polygon.id}" not in state.problem.conditions or f"simple:{polygon.id}" not in state.problem.conditions: continue
        angles = tuple(polygon.get("angles", ())); n = len(angles)
        if n < 3: continue
        known = [state.valued("angle_measure", a) for a in angles]
        if sum(x is None for x in known) == 1:
            idx = known.index(None); total = Fraction(180 * (n - 2))
            value = total - sum((x.value for x in known if x), Fraction())
            if value > 0:
                yield Fact("angle_measure", (angles[idx],), value), tuple(x for x in known if x), (f"nondegenerate:{polygon.id}", f"simple:{polygon.id}")


def _pythagorean(state: KnowledgeState):
    for triangle in state.problem.objects.values():
        if triangle.kind != "triangle" or f"nondegenerate:{triangle.id}" not in state.problem.conditions: continue
        right = state.has("right_triangle", triangle.id)
        sides = tuple(triangle.get("sides", ())); hyp = triangle.get("hypotenuse")
        if not right or len(sides) != 3 or hyp not in sides: continue
        lengths = {s: state.valued("length_squared", s) for s in sides}
        if any(f and f.value <= 0 for f in lengths.values()): continue
        missing = [s for s, f in lengths.items() if not f]
        if len(missing) == 1:
            m = missing[0]; legs = [s for s in sides if s != hyp]
            value = (sum(lengths[s].value for s in legs) - (0 if m == hyp else lengths[hyp].value)) if m == hyp else lengths[hyp].value - lengths[next(s for s in legs if s != m)].value
            if value > 0:
                yield Fact("length_squared", (m,), value), (right, *(f for f in lengths.values() if f)), (f"nondegenerate:{triangle.id}", "positive side lengths")


def _triangle_inequality(state: KnowledgeState):
    for triangle in state.problem.objects.values():
        if triangle.kind != "triangle" or f"nondegenerate:{triangle.id}" not in state.problem.conditions: continue
        sides = tuple(triangle.get("sides", ()))
        measures = [state.valued("length", s) for s in sides]
        if len(sides) == 3 and all(measures):
            for i in range(3):
                j, k = (i + 1) % 3, (i + 2) % 3
                yield Fact("less_than", (sides[i], f"{sides[j]}+{sides[k]}")), tuple(measures), (f"nondegenerate:{triangle.id}",)


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
    TheoremRule("circle-angle", "Circle angle theorems", ("central_inscribed_pair", "same_segment_pair"), ("nondegenerate circle",), ("angle_measure", "equal_angle"), "An angle at the centre is twice an angle at the circumference on the same arc; angles in the same segment are equal.", _circle_rules),
    TheoremRule("parallelogram-properties", "Parallelogram properties", ("parallelogram",), ("nondegenerate quadrilateral",), ("equal_length", "equal_angle"), "Opposite sides and angles of a nondegenerate parallelogram are equal.", _quadrilateral_rules),
    TheoremRule("polygon-angle-sum", "Polygon angle sum", ("angle_measure",), ("nondegenerate polygon",), ("angle_measure",), "The interior angles of an n-sided simple polygon sum to (n−2)×180°.", _polygon_angles),
    TheoremRule("pythagorean", "Pythagorean theorem", ("right_triangle", "length_squared"), ("nondegenerate right triangle",), ("length_squared",), "For a right triangle, the square on the hypotenuse equals the sum of the squares on the legs.", _pythagorean),
    TheoremRule("triangle-inequality", "Triangle inequality", ("length",), ("nondegenerate triangle",), ("less_than",), "Each side of a nondegenerate triangle is shorter than the sum of the other two sides.", _triangle_inequality),
)


class SyntheticReasoner:
    def __init__(self, rules: tuple[TheoremRule, ...] = RULES, max_rounds: int = 20, max_rule_applications: int = 10_000) -> None:
        self.rules = rules
        self.max_rounds = max_rounds
        self.max_rule_applications = max_rule_applications

    def close(self, problem: GeometryProblem, extra: Iterable[Fact] = ()) -> KnowledgeState:
        state = KnowledgeState(problem, extra)
        if state.inconsistent:
            return state
        for _ in range(self.max_rounds):
            changed = False
            for rule in self.rules:
                try:
                    for fact, premises, conditions in rule.apply(state):
                        state.rule_applications += 1
                        if state.rule_applications > self.max_rule_applications:
                            state.resource_limit_reached = True
                            return state
                        changed |= state.add(fact, rule, tuple(premises), tuple(conditions))
                except (IndexError, KeyError, TypeError, ValueError, ZeroDivisionError):
                    state.malformed = True
                    return state
            if not changed:
                return state
        state.resource_limit_reached = True
        return state
