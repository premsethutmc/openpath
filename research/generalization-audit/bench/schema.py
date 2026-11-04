"""Benchmark case schema and authoring helpers (benchmark construction only; no E7 code is imported here).

Authors write cases in category modules (bench/categories/*.py) by calling T(...) for a single transition or W(...) for
a multi-line working. Every case states the mathematical principle, the invariant/capability challenged, the expected
mathematical relationship (8-way), the expected E7-vocabulary verdict and an independent justification.
"""
from __future__ import annotations

CATEGORIES = {
    "ALG": ("Algebraic equivalence and transformations", 200),
    "EQN": ("Equations, implication and solution sets", 200),
    "DOM": ("Domain restrictions and singularities", 200),
    "INE": ("Inequalities and conditional transformations", 150),
    "FUN": ("Functions, composition and identities", 150),
    "TRG": ("Trigonometric reasoning", 150),
    "CAL": ("Differentiation and integration", 200),
    "LIM": ("Sequences, limits and convergence", 150),
    "MUL": ("Multivariable mathematics", 150),
    "PRF": ("Multi-step reasoning and proof obligations", 200),
    "ADV": ("Adversarial and cross-domain combinations", 250),
}

# Mathematical relationship (what is true), 8-way
RELATIONS = {
    "valid-equivalence",        # next has exactly the meaning of prev (same set / same function on the same domain); or a fully correct working
    "valid-implication",        # prev implies next, not conversely (e.g. squaring); a sound one-way step
    "invalid",                  # a sound counterexample / wrong result exists
    "incomplete",               # nothing false, but the task is not finished
    "domain-violation",         # correct only after a restriction the work drops or never states
    "wrong-reason",             # mathematically correct result, incorrect cited reasoning/rule
    "insufficient-information", # the claim cannot be decided from the information given (needs an unstated condition)
    "unsupported",              # mathematics outside a reasonable verifier scope (proof-style etc.); truth recorded separately
}

# E7 vocabularies. Transitions are read as relations; workings as classifications.
T_VERDICTS = {"equivalent", "implied", "invalid", "conditional", "abstain"}
W_VERDICTS = {"verified", "invalid", "incomplete", "missing-assumption", "abstain"}

DEFAULT_T = {"valid-equivalence": ("equivalent", ["equivalent"]), "valid-implication": ("implied", ["implied"]),
             "invalid": ("invalid", ["invalid"]), "domain-violation": ("conditional", ["conditional", "implied", "invalid"]),
             "insufficient-information": ("conditional", ["conditional", "abstain"]), "unsupported": ("abstain", ["abstain"])}
DEFAULT_W = {"valid-equivalence": ("verified", ["verified"]), "valid-implication": ("verified", ["verified"]),
             "invalid": ("invalid", ["invalid"]), "incomplete": ("incomplete", ["incomplete"]),
             "domain-violation": ("missing-assumption", ["missing-assumption", "invalid"]),
             "wrong-reason": ("invalid", ["invalid", "incomplete"]),
             "insufficient-information": ("missing-assumption", ["missing-assumption", "abstain", "incomplete"]),
             "unsupported": ("abstain", ["abstain"])}

_CASES: list[dict] = []
_ctx = {"module": None}


def _base(cat, principle, invariant, relation, why, answer, difficulty, complexity, composition, pair, notation, domain, truth, expected, acceptable, source):
    assert cat in CATEGORIES, cat
    assert relation in RELATIONS, relation
    assert difficulty in ("easy", "medium", "hard"), difficulty
    assert 1 <= complexity <= 5
    assert principle and invariant and why
    if relation == "unsupported":
        assert truth in ("valid", "invalid", "unknown"), "unsupported cases must record the mathematical truth"
    return {"category": cat, "categoryName": CATEGORIES[cat][0], "domain": domain, "principle": principle, "invariant": invariant,
            "relation": relation, "truth": truth or ("invalid" if relation in ("invalid",) else "valid" if relation.startswith("valid") or relation == "wrong-reason" else "n/a"),
            "explanation": why, "answer": answer, "difficulty": difficulty, "complexity": complexity, "composition": composition,
            "minimalPair": pair, "notation": notation, "expected": expected, "acceptable": acceptable, "oracleSource": source,
            "module": _ctx["module"]}


def T(cat, principle, invariant, prev, nxt, kind, relation, *, why, answer=None, assumptions=(), difficulty="medium", complexity=1,
      composition=False, pair=None, notation="standard", domain="algebra", truth=None, expected=None, acceptable=None,
      oracle_prev=None, oracle_next=None, source="exact oracle (sets / identity with domains / exact counterexample)", unsupported_behavior=None):
    """Single transition prev -> next. kind: 'statement' (solution-set semantics, variable real) or 'expression'."""
    assert kind in ("statement", "expression")
    e, acc = DEFAULT_T[relation] if relation in DEFAULT_T else (expected, acceptable)
    e, acc = expected or e, acceptable or acc
    assert e in T_VERDICTS and all(a in T_VERDICTS for a in acc), (e, acc)
    c = _base(cat, principle, invariant, relation, why, answer or nxt, difficulty, complexity, composition, pair, notation, domain, truth, e, acc, source)
    c.update({"kind": "transition", "transitionKind": kind, "statement": prev, "working": [nxt], "assumptions": list(assumptions),
              "chainLength": 1, "oracle": {"prev": oracle_prev or prev, "next": oracle_next or nxt},
              "unsupportedBehavior": unsupported_behavior or "abstain (unsupported/unresolved); never report equivalent or implied"})
    _CASES.append(c)
    return c


def W(cat, principle, invariant, task, working, relation, *, why, answer, oracle_lines=None, assumptions=(), difficulty="medium",
      complexity=2, composition=False, pair=None, notation="standard", domain=None, truth=None, expected=None, acceptable=None,
      source=None, unsupported_behavior=None):
    """Multi-line working for a task.
    task types: {'type':'solve','statement':...} | {'type':'system','statement':...} |
                {'type':'simplify'|'expand'|'factor'|'evaluate','start':...} | {'type':'show','start':lhs,'target':rhs} |
                {'type':'derivative'|'indefinite-integral','f':...,'var':'x'} | {'type':'definite-integral','f','a','b','var'} |
                {'type':'limit','f','to','side','var'} | {'type':'statement-task','calculusTask':..., 'statement':...} (proof-style)
    oracle_lines: canonical per-line math for the oracle (see oracle.py); default = working lines."""
    e, acc = DEFAULT_W[relation]
    e, acc = expected or e, acceptable or acc
    assert e in W_VERDICTS and all(a in W_VERDICTS for a in acc), (e, acc)
    dom = domain or ("calculus" if task["type"] in ("derivative", "indefinite-integral", "definite-integral", "limit", "statement-task") else "algebra")
    src = source or {"solve": "exact solution sets per line (oracle.certify_solve)", "system": "exact solution of the system (oracle.certify_system)",
                     "derivative": "exact derivative reference (oracle.certify_calculus)", "indefinite-integral": "differentiate the answer (oracle.certify_calculus)",
                     "definite-integral": "exact definite integral (oracle.certify_calculus)", "limit": "exact limit + numeric corroboration (oracle.certify_calculus)",
                     "statement-task": "hand derivation (proof-style; not machine-certified)"}.get(task["type"], "exact identity chain with domains (oracle.certify_expression_chain)")
    c = _base(cat, principle, invariant, relation, why, answer, difficulty, complexity, composition, pair, notation, dom, truth, e, acc, src)
    c.update({"kind": "working", "task": task, "statement": task.get("statement") or task.get("start") or task.get("f"), "working": list(working),
              "assumptions": list(assumptions), "chainLength": len(working), "oracle": {"lines": oracle_lines if oracle_lines is not None else list(working)},
              "unsupportedBehavior": unsupported_behavior or "abstain (unsupported/unresolved); never verify"})
    assert len(c["oracle"]["lines"]) == len(working), "oracle_lines must align with working lines"
    _CASES.append(c)
    return c


def cases():
    return _CASES
