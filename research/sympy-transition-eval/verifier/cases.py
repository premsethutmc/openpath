"""Case-level adapter: (problem, student working) -> verdict, built on the transition verifier.

This is the evaluation adapter that lets the SymPy verifier be run on whole E7 cases. It is deliberately conservative:
  * every clause that contains mathematics must parse, otherwise the case is 'unsupported' (parse) -- never verified;
  * the case is 'verified' only when every chain transition is sound for the task (keeps all true solutions /
    exact identity), every side claim is true, and the final statement equals the exact task answer;
  * 'invalid' only from an exact counterexample (lost solution, false side claim, wrong final answer);
  * extraneous candidates that are dropped without any visible check -> 'missing-assumption';
  * a correct chain that stops before a solved/final form -> 'incomplete';
  * geometry, proof-style calculus (series tests, squeeze, epsilon-delta, improper, FTC), word problems and most
    'other domains' tasks have no answer contract here -> 'unsupported' (out of prototype scope).
Verdict vocabulary matches E7: verified | invalid | incomplete | missing-assumption | unsupported | malformed | ambiguous.
"""
from __future__ import annotations
import re
from fractions import Fraction
import sympy as sp
from safe_parse import Ctx, Statement, Unreadable, Ambiguous, parse_statement, glyphs, FUNCS
from transition import (statement_set, expression_relation, multi_expression_relation, truth_at, zero_test, cond_set, diff_set,
                        is_empty, pick_point, limited, certain_sign, R, value_at)

X = sp.Symbol("x", real=True)

# ------------------------------------------------------------------ typed (JSON) expressions
def from_json(n):
    k = n["kind"]
    if k == "variable":
        return sp.Symbol(n["name"], real=True)
    if k == "constant":
        return sp.Rational(Fraction(str(n["value"])))
    if k == "add":
        return sp.Add(*[from_json(t) for t in n["terms"]])
    if k == "multiply":
        return sp.Mul(*[from_json(t) for t in n["factors"]])
    if k == "power":
        e = n["exponent"]
        e = sp.Rational(Fraction(str(e))) if not isinstance(e, dict) else from_json(e)
        return sp.Pow(from_json(n["base"]), e)
    if k == "root":
        return sp.root(from_json(n["radicand"]), int(n["index"]))
    f = {"sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "exp": sp.exp, "log": sp.log, "atan": sp.atan, "abs": sp.Abs,
         "asin": sp.asin, "acos": sp.acos, "sqrt": sp.sqrt}.get(k)
    if f:
        return f(from_json(n["argument"]))
    raise Unreadable(f"typed kind {k}")


def expr_conds(e):
    """Natural-domain conditions of an already-built SymPy expression (problem expressions)."""
    out = []
    for a in sp.preorder_traversal(e):
        if isinstance(a, sp.Pow):
            b, p = a.args
            if p.is_number and p.is_negative:
                out.append(("ne0", b))
            if p.is_Rational and not p.is_Integer and p.q % 2 == 0:
                out.append(("ge0", b))
        elif isinstance(a, sp.log):
            out.append(("gt0", a.args[0]))
        elif isinstance(a, (sp.tan, sp.sec)):
            out.append(("ne0", sp.cos(a.args[0])))
        elif isinstance(a, (sp.cot, sp.csc)):
            out.append(("ne0", sp.sin(a.args[0])))
    return out


# ------------------------------------------------------------------ clause extraction
WORD = re.compile(r"[A-Za-z]{3,}")
FUNC_WORDS = set(FUNCS) | {"log", "pi", "oo", "infinity", "inf", "theta", "ddx", "lim"}
REJECT = re.compile(r"\b(reject\w*|exclud\w*|extraneous|not valid|invalid|discard\w*|outside|impossible|contradict\w*|not <|not >|fails?)\b", re.I)
CHECK = re.compile(r"\b(check\w*|verify|verified|ok|valid|satisf\w*|substitut\w*|differ from)\b", re.I)
CONNECT = re.compile(r"(?:,\s*|\s+)\b(?:so that|so|hence|therefore|thus|then|giving|gives|which gives|which is|which|and so|i\.e\.|this gives|we get|to get)\b\s*|;\s*|\.\s+(?=[A-Z])|\s*:\s+(?=[A-Za-z]*\s*[=]?)", re.I)
EMPTY = re.compile(r"\bno (?:real )?solutions?\b|\bhas no solution|\bempty set\b|\bno x\b", re.I)
SCOPE_LEAD = re.compile(r"^\s*(?:case|if|for|when|suppose|assume|on)\b", re.I)
ASIDE = re.compile(r"^\s*(?:aside|also|note|remark|incidentally|for reference|unrelated|\(unrelated)\b", re.I)
PREMISE_LEAD = re.compile(r"^\s*(?:since|as|because|given|note|where|we need|domain|recall|remark|aside|also|incidentally|for reference)\b", re.I)


class Clause:
    def __init__(self, raw, line_no):
        self.raw, self.line, self.role, self.stmt, self.scope, self.err, self.label = raw, line_no, "", None, None, "", ""

    def __repr__(self):
        return f"<{self.line}:{self.role}:{self.raw!r}:{self.stmt.kind if self.stmt else ''}:{self.err}>"


def strip_words(s: str):
    """Remove leading/trailing English words around a mathematical core. Returns (core, lead_words, trail_words)."""
    toks = s.strip().split()
    lead, trail = [], []
    while toks and _is_word(toks[0]):
        lead.append(toks.pop(0))
    while toks and _is_word(toks[-1]):
        trail.insert(0, toks.pop())
    return " ".join(toks), lead, trail


def _is_word(t):
    t2 = t.strip(",.()").lower()
    if not t2:
        return True
    if re.fullmatch(r"[a-z]{3,}", t2) and t2 not in FUNC_WORDS:
        return True
    return t2 in ("is", "a", "an", "of", "it", "we", "to", "by", "at", "be", "in", "on", "the", "and", "or", "as", "so", "if", "i.e")


def has_math(s):
    return bool(re.search(r"[0-9=<>+\-*/^|]", s)) or bool(re.search(r"\b[a-z]\b", s))


def split_clauses(text: str):
    out = []
    for ln, line in enumerate(text.split("\n"), 1):
        line = glyphs(line.strip())
        if not line:
            continue
        line = re.sub(r"\bd/d([a-z])\b", r"ddx", line)
        scope_text = None
        # 'Case C: rest' / 'If C then rest' / 'for C, rest'
        m = re.match(r"^\s*(?:case|if|when|for|suppose)\s+(.+?)(?::|\bthen\b|,)\s+(.*)$", line, re.I)
        if m and has_math(m.group(1)) and re.search(r"[<>=]|!=", m.group(1)):
            scope_text, line = m.group(1), m.group(2)
        label = ""
        m = re.match(r"^([^:]{1,40}):\s+(.*)$", line)
        if m:
            label, line = m.group(1), m.group(2)
        parts = [p for p in CONNECT.split(line) if p and p.strip()]
        for p in parts:
            c = Clause(p.strip(" ,."), ln)
            c.label = label
            c.scope = scope_text
            out.append(c)
    return out


def clean_math(core: str):
    """Remove 'name =' prefixes (disc = , det = , f'(x) = , dy/dx = ) and trailing '+ C'."""
    core = re.sub(r"^\s*(?:f'\(x\)|f'|y'|dy/dx|f\(x\)|F'\(x\))\s*=\s*", "", core)
    core = re.sub(r"^\s*[A-Za-z][A-Za-z_]*(?:\([^()]*\))?\s*=\s*(?=.)", lambda m: "" if WORD.search(m.group(0)) and not re.search(r"\b(?:sin|cos|tan|ln|sqrt|exp|abs|ddx|lim)\b", m.group(0)) else m.group(0), core)
    plus_c = bool(re.search(r"\+\s*C\s*$", core))
    core = re.sub(r"\s*\+\s*C\s*$", "", core)
    core = core.strip(" ,;.")
    if core.startswith("="):
        core = core[1:].strip()
    return core, plus_c


def parse_clause(c: Clause, ctx: Ctx):
    raw = c.raw
    if EMPTY.search(raw):
        c.role, c.stmt = "empty", Statement("or", parts=[])
        return
    core, lead, trail = strip_words(raw)
    c.lead = " ".join(lead).lower()
    c.trail = " ".join(trail).lower()
    core, c.plus_c = clean_math(core)
    if not core or not has_math(core):
        c.role = "prose"
        return
    try:
        c.stmt = parse_statement(core, ctx)
        c.role = "math"
    except Ambiguous as e:
        c.role, c.err = "ambiguous", str(e)
    except Unreadable as e:
        c.role, c.err = "unparsed", str(e)
    if c.role == "math" and (PREMISE_LEAD.match(raw) or SCOPE_LEAD.match(raw)):
        c.role = "premise"


# ------------------------------------------------------------------ arithmetic grounding (conservative guard)
NUM = re.compile(r"\d+(?:\.\d+)?")
RUN = re.compile(r"(?<![A-Za-z0-9.)^])\d+(?:\.\d+)?(?:\s*[-+*/^\u00b1]\s*\d+(?:\.\d+)?)+(?![0-9.]*\s*[A-Za-z(])")


def _nums(t):
    return {Fraction(m) for m in NUM.findall(glyphs(t))}


def _derivable(v, pool):
    if v in pool:
        return True
    P = list(pool)
    for a in P:
        if a * a == v or (a >= 0 and v * v == a):
            return True
        for b in P:
            if a + b == v or a - b == v or a * b == v or (b != 0 and a / b == v):
                return True
            if b.denominator == 1 and 0 < b <= 6 and a ** int(b) == v:
                return True
    return False


def _run_values(text):
    vals = set()
    for m in RUN.finditer(glyphs(text)):
        try:
            for v in parse_statement(m.group(0).replace("\u00b1", "+")).exprs:
                if v.is_Rational:
                    vals.add(Fraction(int(v.p), int(v.q)))
        except (Unreadable, Ambiguous):
            pass
    return vals


def ungrounded(raw, prior):
    """An operand of a written closed computation (e.g. '8-6', '7*4') that is neither written earlier nor one
    elementary operation away from earlier numbers. Semantic equivalence cannot see 'right value, unrelated arithmetic',
    so such lines are not credited (the case becomes unsupported, never verified)."""
    g = glyphs(raw)
    pool = _nums(prior) | _run_values(prior) | {Fraction(0), Fraction(1)}
    for m in RUN.finditer(g):
        if g[: m.start()].rstrip().endswith("^"):
            continue
        if re.fullmatch(r"\d+\s*/\s*\d+", m.group(0)) and not g[m.end():].lstrip().startswith("="):
            continue  # a written fraction p/q is a number, not a computation (unless it is being evaluated: '12/3 = 4')
        for n in NUM.findall(m.group(0)):
            if Fraction(n) not in pool:
                return n
        pool |= _run_values(m.group(0))
    m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*=", g)
    if m and Fraction(m.group(1)) not in pool:
        return m.group(1)  # a closed claim that starts from a number nobody derived (e.g. '28 = 7*4')
    return None


# ------------------------------------------------------------------ verdict helpers
def V(verdict, reason, **kw):
    d = {"verdict": verdict, "reason": reason}
    d.update(kw)
    return d


def is_solved_form(st: Statement, x):
    if st.kind == "or":
        return all(is_solved_form(p, x) for p in st.parts)
    if st.kind == "and":
        return all(is_solved_form(p, x) for p in st.parts)
    if st.kind != "rel":
        return False
    ex = st.exprs
    if len(ex) == 2:
        a, b = ex
        return (a == x and x not in b.free_symbols) or (b == x and x not in a.free_symbols)
    if len(ex) == 3:
        return ex[1] == x and not (ex[0].free_symbols | ex[2].free_symbols)
    return False


def problem_statement_text(s: str):
    """Instruction and task type from an algebra statement."""
    t = s.strip()
    low = t.lower()
    for pat, task in [(r"^solve the system\s+", "system"), (r"^solve\s+", "solve"), (r"^expand and simplify\s+", "expand"), (r"^expand\s+", "expand"),
                      (r"^simplify\s+", "simplify"), (r"^factori[sz]e\s+|^factor\s+", "factor"), (r"^(?:evaluate|compute|calculate)\s+", "evaluate"),
                      (r"^rationali[sz]e the denominator of\s+", "rationalise"), (r"^show that\s+", "show"), (r"^write\s+", "form")]:
        m = re.match(pat, low)
        if m:
            return task, t[m.end():]
    if re.match(r"^(suppose|assume|let|a |an |the |anna|if )", low):
        return "word", t
    return "solve", t


def strip_conditions(body: str):
    """Split 'E for x > 0' / 'E, where x != 0 and x != -1' / 'Assume x > 0. Simplify E' -> (E, [conditions], extra)."""
    conds, extra = [], ""
    m = re.match(r"^\s*assume\s+(.+?)\.\s*(.*)$", body, re.I)
    if m:
        conds.append(m.group(1))
        body = m.group(2)
        task, body = problem_statement_text(body)
        extra = task
    m = re.search(r",?\s*(?:where|for)\s+(.+)$", body, re.I)
    if m and re.search(r"[<>]|!=|≠", glyphs(m.group(1))):
        conds.extend(re.split(r"\s+and\s+", m.group(1)))
        body = body[: m.start()]
    body = re.sub(r"\s+without a calculator\s*$", "", body, flags=re.I)
    m = re.search(r"\s+and state the values of x that must be excluded\s*$", body, re.I)
    need_excl = False
    if m:
        need_excl = True
        body = body[: m.start()]
    m = re.search(r"\s+in the form\s+(.+)$", body, re.I)
    form = None
    if m:
        form = m.group(1)
        body = body[: m.start()]
    return body.strip(), conds, extra, need_excl, form


# ------------------------------------------------------------------ algebra: solve
def assess_solve(problem_text, conds_text, working):
    ctx = Ctx(allow_e_const=True)
    try:
        P = parse_statement(problem_text, ctx)
    except Ambiguous as e:
        return V("ambiguous", f"problem ambiguous: {e}", stage="parse-problem")
    except Unreadable as e:
        return V("unsupported", f"problem not parsed: {e}", stage="parse-problem")
    syms = sorted(P.free_symbols(), key=str)
    if P.kind == "expr":
        return V("unsupported", "problem is not a statement")
    if len(syms) != 1:
        return assess_system(P, syms, working, ctx)
    x = syms[0]
    D = R
    for ct in conds_text:
        try:
            S = statement_set(parse_statement(ct, ctx), x, R)
        except (Unreadable, Ambiguous):
            S = None
        if S is None:
            return V("unsupported", "condition not representable")
        D = sp.Intersection(D, S)
    T = statement_set(P, x, D)
    if T is None:
        return V("unsupported", "exact solution set of the task not computable", stage="task-set")
    clauses = split_clauses(working)
    for c in clauses:
        parse_clause(c, ctx)
    bad = [c for c in clauses if c.role in ("unparsed", "ambiguous")]
    if bad:
        return V("ambiguous" if all(c.role == "ambiguous" for c in bad) else "unsupported", f"clause not parsed: {bad[0].raw!r} ({bad[0].err})", stage="parse-working", clause=bad[0].raw)
    any_check = bool(CHECK.search(working)) or bool(REJECT.search(working))
    restriction_stated = bool(conds_text) or bool(re.search(r"!=|\u2260|exclud|\bnonzero|not zero", glyphs(working), re.I))
    prev_set, extraneous_seen, chain, n_side = T, False, [], 0
    final, widened, ungrounded_note = None, False, None
    prior = problem_text
    prev_ne = cond_set([k for k in P.conds if k[0] == "ne0"], x, D)
    for c in clauses:
        if c.role in ("prose",):
            prior += " " + c.raw
            continue
        u = None if (ASIDE.match(c.raw) or ASIDE.search(c.label)) else ungrounded(c.raw, prior)
        prior += " " + c.raw + " " + c.label
        if u is not None and ungrounded_note is None:
            ungrounded_note = (u, c.line)
        st = c.stmt
        if c.role == "empty":
            S = sp.S.EmptySet
        else:
            fs = st.free_symbols()
            if not fs:
                tv = truth_at(st, {}) if st.kind != "expr" else True
                if tv is False:
                    return V("invalid", f"false closed claim: {c.raw!r}", line=c.line)
                if tv is None:
                    return V("unsupported", f"closed claim undecided: {c.raw!r}")
                n_side += 1
                continue
            if fs - {x}:
                return V("unsupported", f"other variables in {c.raw!r}")
            if st.kind == "expr":
                continue  # an expression on its own (e.g. a factorisation of the left side) is not a statement about x
            if c.role == "premise" or (c.label and SCOPE_LEAD.match(c.label)):
                continue
            S = statement_set(st, x, D)
            if S is None:
                return V("unsupported", f"solution set not computable for {c.raw!r}", stage="set")
        scope = None
        if c.scope:
            try:
                scope = statement_set(parse_statement(c.scope, ctx), x, D)
            except (Unreadable, Ambiguous):
                return V("unsupported", f"case condition not parsed {c.scope!r}")
            if scope is None:
                return V("unsupported", "case condition set")
        Tloc = T if scope is None else sp.Intersection(T, scope)
        Sloc = S if scope is None else sp.Intersection(S, scope)
        # restriction notes (x != a) entailed by the task domain are domain bookkeeping, not chain steps
        if c.role == "math" and _only_ne(st):
            Dp = cond_set(P.conds, x, D)
            if Dp is not None and is_empty(diff_set(Dp, S)) is True:
                continue
            return V("unsupported", f"restriction {c.raw!r} is not implied by the task domain (an added assumption)")
        lost = diff_set(Tloc, Sloc)
        le = is_empty(lost)
        if le is False:
            pt = pick_point(lost)
            if c.scope is None and REJECT.search(c.raw + " " + c.label):
                continue  # a candidate explicitly rejected in this clause
            ok = pt is not None and truth_at(P, {x: pt}) is True and (c.role == "empty" or truth_at(st, {x: pt}) is False)
            if ok:
                return V("invalid", f"line {c.line} loses the solution x = {pt}", line=c.line, counterexample={str(x): str(pt)})
            return V("unsupported", "lost-solution witness not re-verified")
        if le is None:
            return V("unsupported", "set comparison undecided")
        extra = diff_set(Sloc, Tloc)
        ee = is_empty(extra)
        if ee is False:
            extraneous_seen = True
        if c.role == "math" and st is not None:
            nxt_ne = cond_set([k for k in st.conds if k[0] == "ne0"], x, D)
            if prev_ne is not None and nxt_ne is not None and is_empty(diff_set(nxt_ne, prev_ne)) is False:
                widened = True  # a denominator was cleared: the excluded values become admissible
            prev_ne = nxt_ne
        chain.append((c, S, scope))
        if scope is None:
            final = (c, S, st)
    if final is None:
        return V("incomplete", "no concluding statement about the variable")
    c, S, st = final
    if c.role != "empty" and not is_solved_form(st, x):
        return V("incomplete", f"final statement {c.raw!r} is not in solved form")
    if is_empty(diff_set(S, T)) is not True:
        pt = pick_point(diff_set(S, T))
        if pt is not None and truth_at(P, {x: pt}) is False:
            return V("invalid", f"final answer includes x = {pt}, which is not a solution", counterexample={str(x): str(pt)})
        return V("unsupported", "final set comparison undecided")
    if extraneous_seen and not any_check:
        return V("missing-assumption", "extraneous candidates were dropped without a visible check")
    if widened and not restriction_stated:
        return V("missing-assumption", "a denominator was cleared but the excluded values were never stated")
    if ungrounded_note:
        return V("unsupported", f"written computation uses {ungrounded_note[0]} (line {ungrounded_note[1]}), not grounded in earlier lines; semantic checks cannot credit it", stage="grounding")
    return V("verified", "every step keeps the exact solution set; final answer equals it", side_claims=n_side, steps=len(chain))


def _only_ne(st):
    if st.kind == "rel":
        return all(o == "!=" for o in st.ops)
    if st.kind == "and":
        return all(_only_ne(p) for p in st.parts)
    return False


def assess_system(P, syms, working, ctx):
    eqs = _equations(P)
    if eqs is None:
        return V("unsupported", "system with non-equations")
    sol = limited(lambda: sp.solve(eqs, syms, dict=True), 3.0)
    if not sol or any(set(s.keys()) != set(syms) or any(v.free_symbols for v in s.values()) for s in sol):
        return V("unsupported", "system solution set not finite/exact (parametric or unsolved)")
    clauses = split_clauses(working)
    for c in clauses:
        parse_clause(c, ctx)
    bad = [c for c in clauses if c.role in ("unparsed", "ambiguous")]
    if bad:
        return V("unsupported", f"clause not parsed: {bad[0].raw!r} ({bad[0].err})", stage="parse-working")
    final = None
    for c in clauses:
        if c.role != "math" or c.stmt.kind == "expr":
            continue
        st = c.stmt
        if not st.free_symbols():
            if truth_at(st, {}) is False:
                return V("invalid", f"false closed claim {c.raw!r}")
            continue
        for s in sol:
            tv = truth_at(st, s)
            if tv is False:
                return V("invalid", f"{c.raw!r} is false at the solution {s}", counterexample={str(k): str(v) for k, v in s.items()})
            if tv is None:
                return V("unsupported", "truth undecided")
        final = st
    if final is None:
        return V("incomplete", "no concluding statement")
    # the final statement must pin down every variable to the solution values
    feqs = _equations(final)
    if feqs is None:
        return V("unsupported", "final statement form")
    fs = limited(lambda: sp.solve(feqs, syms, dict=True), 3.0)
    if fs is None:
        return V("unsupported", "final statement not solvable")
    if sorted(map(str, fs)) == sorted(map(str, sol)):
        return V("verified", "every line holds at the unique solution(s) and the final statement determines them")
    return V("incomplete", "final statement does not determine every variable")


def _equations(st):
    if st.kind == "rel" and all(o == "=" for o in st.ops):
        return [sp.Eq(st.exprs[i], st.exprs[i + 1]) for i in range(len(st.ops))]
    if st.kind == "and":
        out = []
        for p in st.parts:
            e = _equations(p)
            if e is None:
                return None
            out += e
        return out
    return None


# ------------------------------------------------------------------ algebra: expressions
def assess_expression(task, body, conds_text, need_excl, form, working):
    ctx = Ctx()
    try:
        P = parse_statement(body, ctx)
    except Ambiguous as e:
        return V("ambiguous", f"problem expression ambiguous: {e}")
    except Unreadable as e:
        return V("unsupported", f"problem expression not parsed: {e}")
    if task == "show":
        if P.kind != "rel" or P.ops != ["="]:
            return V("unsupported", "show-that target is not an identity")
        start, target, pconds = P.exprs[0], P.exprs[1], list(P.conds)
    else:
        if P.kind != "expr" or len(P.exprs) != 1:
            return V("unsupported", "problem is not a single expression")
        start, target, pconds = P.exprs[0], None, list(P.conds)
    syms = sorted(start.free_symbols | (target.free_symbols if target is not None else set()), key=str)
    D = R
    x = syms[0] if len(syms) == 1 else None
    if conds_text and x is not None:
        for ct in conds_text:
            try:
                S = statement_set(parse_statement(ct, ctx), x, R)
            except (Unreadable, Ambiguous):
                S = None
            if S is None:
                return V("unsupported", "condition not representable")
            D = sp.Intersection(D, S)
    elif conds_text:
        return V("unsupported", "conditions on several variables")
    clauses = split_clauses(working)
    for c in clauses:
        parse_clause(c, ctx)
    bad = [c for c in clauses if c.role in ("unparsed", "ambiguous")]
    if bad:
        return V("ambiguous" if all(c.role == "ambiguous" for c in bad) else "unsupported", f"clause not parsed: {bad[0].raw!r} ({bad[0].err})", stage="parse-working", clause=bad[0].raw)
    chain = [(start, pconds)]
    chain_raw = []
    ungrounded_note = None
    restriction_stated = bool(conds_text)
    prior = body
    for c in clauses:
        if c.role in ("prose", "empty"):
            prior += " " + c.raw
            continue
        u = None if ASIDE.match(c.raw) else ungrounded(c.raw, prior)
        prior += " " + c.raw
        if u is not None and ungrounded_note is None:
            ungrounded_note = (u, c.line)
        st = c.stmt
        if c.role == "premise":
            if st.kind == "rel":
                restriction_stated = True
            continue
        if st.kind == "expr":
            if len(st.exprs) != 1:
                return V("unsupported", "± in an expression chain")
            chain.append((st.exprs[0], list(st.conds)))
            chain_raw.append(clean_math(strip_words(c.raw)[0])[0])
        elif st.kind == "rel" and all(o == "=" for o in st.ops):
            if not st.free_symbols() and not any(e.free_symbols for e in st.exprs) and not _continues(chain, st.exprs[0]):
                if truth_at(st, {}) is False:
                    return V("invalid", f"false arithmetic claim {c.raw!r}")
                if truth_at(st, {}) is None:
                    return V("unsupported", f"closed claim undecided {c.raw!r}")
                continue
            head = st.exprs[0]
            cur = chain[-1][0]
            if not zero_test(sp.simplify(head - cur)) and not (len(syms) <= 1 and expression_relation(head, list(st.conds), cur, chain[-1][1], syms[0] if syms else X, D).verdict in ("equivalent", "implication")):
                # a side identity (e.g. '1 + 1/x = (x+1)/x' while simplifying 1/(1+1/x)): check it, do not chain it
                for a_, b_ in zip(st.exprs, st.exprs[1:]):
                    r_ = _expr_rel(a_, list(st.conds), b_, list(st.conds), syms, D)
                    if r_["verdict"] == "invalid":
                        return V("invalid", f"false identity {a_} = {b_}", counterexample=r_.get("counterexample"))
                    if r_["verdict"] == "unresolved":
                        return V("unsupported", f"side identity {a_} = {b_} undecided")
                continue
            for e in st.exprs:
                chain.append((e, list(st.conds)))
            chain_raw.append(clean_math(strip_words(c.raw)[0])[0].split("=")[-1])
        elif st.kind == "and" and all(p.kind == "rel" and p.ops == ["="] for p in st.parts):
            for p in st.parts:  # side identities like  sqrt12 = 2sqrt3 and sqrt27 = 3sqrt3
                r = _expr_rel(p.exprs[0], st.conds, p.exprs[1], st.conds, syms, D)
                if r["verdict"] == "invalid":
                    return V("invalid", f"false identity {p.exprs[0]} = {p.exprs[1]}")
                if r["verdict"] not in ("equivalent", "implication"):
                    return V("unsupported", "side identity undecided")
        elif _only_ne(st) or (st.kind == "rel" and any(o in ("<", ">", "<=", ">=") for o in st.ops)):
            restriction_stated = True
        else:
            return V("unsupported", f"statement {c.raw!r} in an expression task")
    if len(chain) == 1:
        return V("incomplete", "no working expression")
    widened = False
    for (e1, c1), (e2, c2) in zip(chain, chain[1:]):
        r = _expr_rel(e1, c1, e2, c2, syms, D)
        if r["verdict"] == "invalid":
            return V("invalid", f"step {e1} -> {e2}: {r['reason']}", counterexample=r.get("counterexample"))
        if r["verdict"] == "unresolved":
            return V("unsupported", f"step {e1} -> {e2} undecided: {r['reason']}")
        if r["verdict"] == "implication":
            widened = True
    final = chain[-1][0]
    final_raw = chain_raw[-1] if chain_raw else ""
    # the whole chain must also match the original exactly (transitivity of equivalence; implication only widens)
    if target is not None:
        r = _expr_rel(final, [], target, [], syms, D)
        if r["verdict"] not in ("equivalent", "implication"):
            return V("incomplete", "chain does not reach the stated right-hand side")
    if widened and (need_excl or not restriction_stated) and not restriction_stated:
        return V("missing-assumption", "a step widened the domain and the excluded values were not stated")
    if need_excl and not restriction_stated:
        return V("incomplete", "excluded values requested but not stated")
    fv = _form_ok(task, start, final, form, final_raw)
    if fv is not True:
        return V("incomplete", f"final form does not meet the instruction ({task}): {fv}")
    if ungrounded_note:
        return V("unsupported", f"written computation uses {ungrounded_note[0]} (line {ungrounded_note[1]}), not grounded in earlier lines; semantic checks cannot credit it", stage="grounding")
    return V("verified", "exact identity chain; final form meets the instruction", steps=len(chain) - 1)


def _continues(chain, e):
    return bool(chain) and chain[-1][0] == e


def _expr_rel(e1, c1, e2, c2, syms, D):
    if len(syms) <= 1:
        x = syms[0] if syms else X
        return expression_relation(e1, c1, e2, c2, x, D).to_dict()
    return multi_expression_relation(e1, c1, e2, c2, syms).to_dict()


def _written(raw):
    try:
        with sp.evaluate(False):
            st = parse_statement(raw, Ctx())
        return st.exprs[-1] if st.exprs else None
    except (Unreadable, Ambiguous, IndexError):
        return None


def _form_ok(task, start, final, form, final_raw=""):
    w = _written(final_raw) if final_raw else None
    if task == "simplify" and w is not None:
        n, d = sp.fraction(w)
        g = limited(lambda: sp.gcd(sp.expand(n), sp.expand(d)), 1.0)
        if g is not None and g.free_symbols:
            return "a common factor remains in the written fraction"
    if task == "factor" and w is not None:
        if not isinstance(w, (sp.Mul, sp.Pow)):
            return "the written answer is not a product"
        for fct in (w.args if isinstance(w, sp.Mul) else [w]):
            base = fct.base if isinstance(fct, sp.Pow) else fct
            if base.free_symbols and base.is_polynomial() and len(sp.factor_list(sp.expand(base))[1]) > 1:
                return "a written factor is reducible"
    if task == "expand":
        return True if limited(lambda: sp.expand(final) == final, 1.0) else "not expanded"
    if task == "factor":
        if not isinstance(final, sp.Mul) and not isinstance(final, sp.Pow):
            return "not a product"
        f = limited(lambda: sp.factor_list(final), 1.0)
        g = limited(lambda: sp.factor_list(start), 1.0)
        if f is None or g is None:
            return "factorisation undecided"
        return True if sorted(map(str, f[1])) == sorted(map(str, g[1])) else "not fully factorised"
    if task == "evaluate":
        return True if final.is_number and final.is_Rational else "not a number"
    if task == "rationalise":
        den = sp.fraction(sp.together(final))[1]
        return True if not den.has(sp.Pow) or all(not (p.is_Pow and not p.exp.is_Integer) for p in sp.preorder_traversal(den)) else "radical in denominator"
    if task == "simplify":
        return True if sp.count_ops(final) < sp.count_ops(start) or final.is_number else "not simpler than the original"
    if task == "form":
        return True  # structural form check not implemented: accepted only when the identity holds (documented limitation)
    return True


# ------------------------------------------------------------------ calculus
def calc_text_prepare(text):
    return text


def _placeholder_parse(core, ctx, var):
    """Parse a clause core that may contain integrals, [F]_a^b and lim notation, by replacing them with placeholders."""
    holders = {}

    def hold(val):
        name = "zz" + "abcdefghijklmnop"[len(holders)]
        holders[name] = val
        return f" {name} "

    def integrand(s, v):
        st = parse_statement(s, ctx)
        if st.kind != "expr" or len(st.exprs) != 1:
            raise Unreadable("integrand")
        return st.exprs[0]

    s = core
    # [F]_a^b
    s = re.sub(r"\[([^\[\]]+)\]_\{?([^\s^{}]+)\}?\^\{?([^\s{}]+)\}?", lambda m: hold(("evalb", m.group(1), m.group(2), m.group(3))), s)
    s = re.sub(r"∫\s*_\{?([^\s^{}]+)\}?\^\{?([^\s{}]+)\}?\s*d([a-z])\s*/\s*([A-Za-z0-9^()]+)", lambda m: hold(("defint", "1/(" + m.group(4) + ")", m.group(3), m.group(1), m.group(2))), s)
    s = re.sub(r"∫\s*_\{?([^\s^{}]+)\}?\^\{?([^\s{}]+)\}?\s*(.+?)\s*d([a-z])\b", lambda m: hold(("defint", m.group(3), m.group(4), m.group(1), m.group(2))), s)
    s = re.sub(r"∫\s*d([a-z])\s*/\s*([A-Za-z0-9^()]+)", lambda m: hold(("int", "1/(" + m.group(2) + ")", m.group(1))), s)
    s = re.sub(r"∫\s*(.+?)\s*d([a-z])\b", lambda m: hold(("int", m.group(1), m.group(2))), s)
    if "∫" in s:
        raise Unreadable("integral notation")
    if re.search(r"\blim\b", s):
        raise Unreadable("lim notation")
    for name, h in list(holders.items()):
        if h[0] == "evalb":
            F = integrand(h[1], var)
            a, b = parse_statement(h[2], ctx).exprs[0], parse_statement(h[3], ctx).exprs[0]
            holders[name] = F.subs(var, b) - F.subs(var, a)
        elif h[0] == "defint":
            v = ctx.sym(h[2])
            f = integrand(h[1], v)
            a, b = parse_statement(h[3], ctx).exprs[0], parse_statement(h[4], ctx).exprs[0]
            val = limited(lambda: sp.integrate(f, (v, a, b)), 3.0)
            if val is None or val.has(sp.Integral):
                raise Unreadable("definite integral not computable")
            holders[name] = val
        else:
            v = ctx.sym(h[2])
            holders[name] = sp.Integral(integrand(h[1], v), v)
    return s, holders


def assess_calculus(problem, working_text):
    task = problem.get("task")
    if task not in ("derivative", "indefinite-integral", "definite-integral", "limit", "implicit-differentiation", "parametric-derivative"):
        return V("unsupported", f"calculus task '{task}' outside prototype scope (proof-style or unrepresented answer contract)")
    ctx = Ctx(allow_e_const=True)
    var = sp.Symbol(problem.get("variable", "x"), real=True)
    ctx.variables[var.name] = var
    try:
        if task == "derivative":
            f = from_json(problem["expression"])
            target, tconds, mode = sp.diff(f, var), expr_conds(f), "value"
        elif task == "indefinite-integral":
            f = from_json(problem["integrand"])
            target, tconds, mode = f, expr_conds(f), "antiderivative"
        elif task == "definite-integral":
            f = from_json(problem["integrand"])
            a, b = sp.Rational(Fraction(problem["lower"])), sp.Rational(Fraction(problem["upper"]))
            target = limited(lambda: sp.integrate(f, (var, a, b)), 4.0)
            if target is None or target.has(sp.Integral):
                return V("unsupported", "reference value not computable")
            tconds, mode = [], "number"
        elif task == "limit":
            f = from_json(problem["expression"])
            ap = problem.get("approach")
            ap = sp.oo if ap in ("infinity", "+infinity") else (-sp.oo if ap == "-infinity" else sp.Rational(Fraction(ap)))
            side = {"left": "-", "right": "+"}.get(problem.get("side", "both"), "+-")
            target = limited(lambda: sp.limit(f, var, ap, side), 4.0)
            if target is None or target.has(sp.Limit):
                return V("unsupported", "reference limit not computable")
            tconds, mode = [], "limit"
        else:
            return assess_implicit_param(problem, working_text, ctx)
    except Unreadable as e:
        return V("unsupported", f"typed problem: {e}")
    if isinstance(working_text, list):
        return assess_typed_calc(task, problem, working_text, target, tconds, var)
    clauses = split_clauses(working_text)
    exprs, bindings, n_side = [], {}, 0
    for c in clauses:
        if c.scope:
            return V("unsupported", f"case analysis in calculus working ({c.scope!r}) is outside the prototype")
        aside = bool(ASIDE.search(c.label) or ASIDE.match(c.raw))
        core, lead, trail = strip_words(c.raw)
        core, plus_c = clean_math(core)
        if not core or not has_math(core) or EMPTY.search(c.raw):
            continue
        # substitution / parts bindings: u = ..., dv = ..., du = ...
        mb = re.match(r"^(?:let\s+)?([uvt])\s*=\s*(.+)$", core)
        if mb and not re.search(r"∫|ddx", mb.group(2)):
            try:
                bindings[mb.group(1)] = parse_statement(mb.group(2), ctx).exprs[0]
            except (Unreadable, Ambiguous, IndexError) as e:
                return V("unsupported", f"binding not parsed {core!r}: {e}")
            continue
        if re.match(r"^d[uvxt]\s*=", core) or re.match(r"^[uv]\s*=", core):
            continue
        try:
            s, holders = _placeholder_parse(core, ctx, var)
            pctx = ctx
            st = _parse_with_holders(s, holders, pctx)
        except (Unreadable, Ambiguous) as e:
            return V("unsupported" if not isinstance(e, Ambiguous) else "ambiguous", f"clause not parsed: {c.raw!r} ({e})", stage="parse-working", clause=c.raw)
        if st.kind == "or" or st.kind == "and":
            return V("unsupported", f"compound statement in calculus working {c.raw!r}")
        items = st.exprs if st.kind == "expr" else st.exprs
        if st.kind == "rel" and any(o != "=" for o in st.ops):
            continue  # inequalities / restrictions are scope notes here
        items = [_subst_bindings(e, bindings, var) for e in items]
        if st.kind == "rel" and not any(e.free_symbols - {var} for e in items) and all(not e.free_symbols for e in items):
            # closed arithmetic chain
            for a, b in zip(items, items[1:]):
                sg = certain_sign(a - b)
                if sg in (1, -1):
                    return V("invalid", f"false claim {a} = {b}")
                if sg is None:
                    return V("unsupported", "closed claim undecided")
            exprs.append(("closed", items, c))
            n_side += 1
            continue
        if any(e.free_symbols - {var, sp.Symbol("C", real=True)} for e in items):
            return V("unsupported", f"unbound symbol in {c.raw!r}")
        exprs.append(("aside" if aside else "chain", items, c))
    if not exprs:
        return V("incomplete", "no working")
    # every '=' link inside a clause must be an identity for the task mode
    Dtask = cond_set(tconds, var, R) or R
    for kind, items, c in exprs:
        for a, b in zip(items, items[1:]):
            r = _calc_link(a, b, var, mode, Dtask)
            if r is False:
                return V("invalid", f"line {c.line}: {a} = {b} is false")
            if r is None:
                return V("unsupported", f"line {c.line}: {a} = {b} undecided")
    main = [e for e in exprs if e[0] == "chain"]
    if not main:
        return V("incomplete", "no answer line")
    exprs = main + [e for e in exprs if e[0] != "chain"] if False else exprs
    final = main[-1][1][-1]
    last_raw = main[-1][2].raw
    tail = last_raw.split("=")[-1]
    if re.search(r"'|ddx|\u222b|\blim\b", tail):
        return V("incomplete", "the final expression still contains derivative/integral notation")
    r = _calc_final(final, target, tconds, var, mode)
    if r is True and mode == "antiderivative":
        if not (main[-1][2].raw.rstrip().endswith("C") or re.search(r"\+\s*C\b", main[-1][2].raw)):
            return V("missing-assumption", "the constant of integration is omitted")
        dom = _antiderivative_domain_gap(final, target, tconds, var)
        if dom:
            return V("missing-assumption", dom)
    if r is True:
        return V("verified", "every written identity holds and the final answer matches the exact reference")
    if r is False:
        return V("invalid", f"final answer {final} differs from the exact reference")
    return V("unsupported", "final answer comparison undecided")


def _parse_with_holders(s, holders, ctx):
    class HCtx(Ctx):
        pass
    for name, val in holders.items():
        ctx.variables[name] = sp.Symbol(name)
    st = parse_statement(s, ctx)
    rep = {ctx.variables[n]: v for n, v in holders.items()}
    st.exprs = [e.xreplace(rep) for e in st.exprs]
    for n in holders:
        ctx.variables.pop(n, None)
    return st


def _subst_bindings(e, bindings, var):
    """Express u-space integrals and u, v occurrences in terms of x: Integral(g(u), u) -> Integral(g(h(x)) h'(x), x)."""
    if not bindings:
        return e
    rep = {}
    for I in e.atoms(sp.Integral):
        (u,) = I.variables
        if u.name in bindings and u.name != var.name:
            h = bindings[u.name]
            rep[I] = sp.Integral(I.function.subs(u, h) * sp.diff(h, var), var)
    e = e.xreplace(rep)
    sub = {sp.Symbol(k, real=True): v for k, v in bindings.items() if k != var.name}
    return e.subs(sub)


def _calc_link(a, b, var, mode, D=R):
    C = sp.Symbol("C", real=True)
    if a.has(sp.Integral) or b.has(sp.Integral) or a.has(C) or b.has(C):
        da = sp.diff(a.subs(C, 0), var).doit()
        db = sp.diff(b.subs(C, 0), var).doit()
        return True if zero_test(sp.simplify(da - db), var) else (False if _cex(da - db, var) else None)
    if not (a.free_symbols | b.free_symbols) - {var}:
        rel = expression_relation(a, expr_conds(a), b, expr_conds(b), var, D)
        if rel.verdict in ("equivalent", "implication"):
            return True
        if rel.verdict == "invalid" and rel.counterexample and value_at(a - b, {var: sp.sympify(rel.counterexample[var.name])}) is not None:
            return False
        return None
    d = a - b
    if zero_test(d, var):
        return True
    return False if _cex(d, var) else None


def _cex(d, var):
    for c in [sp.Rational(n, 3) for n in range(-7, 8) if n] + [sp.Integer(2), sp.Integer(5)]:
        v = value_at(d, {var: c})
        if v is not None and certain_sign(v) in (1, -1):
            return True
    return False


def _antiderivative_domain_gap(F, f, fconds, var):
    C = sp.Symbol("C", real=True)
    DF = cond_set(expr_conds(F.subs(C, 0)), var, R)
    Df = cond_set(fconds, var, R)
    if DF is None or Df is None:
        return "domain of the antiderivative not computable"
    gap = diff_set(Df, DF)
    if is_empty(gap) is False:
        return f"the antiderivative is defined only on {DF}, not on the whole domain {Df} of the integrand"
    return None


def _calc_final(final, target, tconds, var, mode):
    C = sp.Symbol("C", real=True)
    if mode == "antiderivative":
        F = final.subs(C, 0)
        if F.has(sp.Integral):
            return None
        d = sp.diff(F, var) - target
        if zero_test(d, var):
            return True
        return False if _cex(d, var) else None
    d = final - target
    if final.free_symbols - {var}:
        return None
    if mode in ("number", "limit"):
        if final.free_symbols:
            return None
        if target in (sp.oo, -sp.oo):
            return final == target
        s = certain_sign(d)
        return True if s == 0 else (False if s in (1, -1) else None)
    if zero_test(d, var):
        return True
    return False if _cex(d, var) else None


def assess_implicit_param(problem, text, ctx):
    """dy/dx for an implicit relation or a parametric curve. Every line must be one of: a differentiated relation
    (an equation linear in y', a nonzero constant multiple of the exact derivative), dx/dt = E, dy/dt = E, or a
    y' = E1 = E2 ... chain whose members all equal the exact reference. Anything else -> unsupported."""
    st = problem.get("statement", "")
    task = problem["task"]
    x, y, t, pp, q, r = (sp.Symbol(n, real=True) for n in ("x", "y", "t", "p", "q", "r"))
    if not isinstance(text, str):
        return V("unsupported", "typed working")
    try:
        if task == "implicit-differentiation":
            m = re.search(r"for\s+(.+)$", st)
            rel = parse_statement(m.group(1), Ctx()) if m else None
            if rel is None or rel.kind != "rel" or rel.ops != ["="]:
                return V("unsupported", "relation not parsed")
            F = rel.exprs[0] - rel.exprs[1]
            ref = limited(lambda: sp.idiff(F, y, x), 3.0)
            dF = sp.diff(F, x) + sp.diff(F, y) * pp
            dxdt = dydt = None
        else:
            m = re.search(r"x\s*=\s*([^,]+),\s*y\s*=\s*(.+)$", st)
            if not m:
                return V("unsupported", "parametric form")
            xt, yt = parse_statement(m.group(1), Ctx()).exprs[0], parse_statement(m.group(2), Ctx()).exprs[0]
            dxdt, dydt = sp.diff(xt, t), sp.diff(yt, t)
            ref = dydt / dxdt
            dF = None
    except (Unreadable, Ambiguous, AttributeError) as e:
        return V("unsupported", f"task: {e}")
    if ref is None:
        return V("unsupported", "reference not computable")
    restriction_stated = bool(re.search(r"!=|\u2260|nonzero|not zero", glyphs(text)))
    widened, final_ok, last_member = False, False, None
    for c in split_clauses(text):
        core = clean_math(strip_words(c.raw)[0])[0] if False else strip_words(c.raw)[0]
        core = glyphs(core)
        core = re.sub(r"dy/dx|y'", " p ", core)
        core = re.sub(r"dx/dt", " q ", core)
        core = re.sub(r"dy/dt", " r ", core)
        core = re.sub(r"\(dy/dt\)|\(dx/dt\)", lambda m_: m_.group(0), core)
        core = core.strip(" ,.")
        if not core or not has_math(core):
            continue
        try:
            sts = parse_statement(core, Ctx(variables={"x": x, "y": y, "t": t, "p": pp, "q": q, "r": r}))
        except (Unreadable, Ambiguous) as e:
            return V("unsupported", f"clause not parsed {c.raw!r}: {e}")
        parts = sts.parts if sts.kind == "and" else [sts]
        for stp in parts:
            if stp.kind != "rel" or any(o != "=" for o in stp.ops):
                return V("unsupported", f"clause form {c.raw!r}")
            ex = stp.exprs
            if ex[0] in (pp, q, r) and len(ex) >= 2:
                refv = {pp: ref, q: dxdt, r: dydt}[ex[0]]
                if refv is None:
                    return V("unsupported", "derivative symbol not meaningful for this task")
                members = [e.subs({q: dxdt, r: dydt}) if dxdt is not None else e for e in ex[1:]]
                for e in members:
                    if e.has(pp):
                        return V("unsupported", "y' on both sides")
                    if not zero_test(sp.simplify(e - refv)):
                        if task == "parametric-derivative" and _cex(e - refv, t):
                            return V("invalid", f"{c.raw!r}: {e} differs from the exact value")
                        return V("unsupported", f"{c.raw!r}: equality with the reference not proven")
                for e1, e2 in zip(members, members[1:]):
                    syms = sorted(e1.free_symbols | e2.free_symbols, key=str)
                    rel_ = (expression_relation(e1, expr_conds(e1), e2, expr_conds(e2), syms[0], R) if len(syms) == 1
                            else multi_expression_relation(e1, expr_conds(e1), e2, expr_conds(e2), syms))
                    if rel_.verdict == "implication":
                        widened = True
                if ex[0] == pp:
                    final_ok = True
                    last_member = members[-1]
            elif dF is not None and stp.exprs and len(ex) == 2 and (ex[0] - ex[1]).has(pp):
                g = ex[0] - ex[1]
                k = limited(lambda: sp.cancel(sp.together(g / dF)), 2.0)
                if k is None or not (k.is_number and k != 0):
                    sol = limited(lambda: sp.solve(g, pp), 2.0)
                    if not sol or len(sol) != 1 or not zero_test(sp.simplify(sol[0] - ref)):
                        return V("unsupported", f"{c.raw!r}: not shown to be the differentiated relation")
                final_ok = False
            else:
                return V("unsupported", f"{c.raw!r}: not a recognised line for this task")
    if not final_ok:
        return V("incomplete", "no final dy/dx statement")
    if dxdt is not None:
        # the parametric derivative exists only where dx/dt != 0; a final form defined beyond that needs the restriction
        Dref = limited(lambda: sp.solveset(sp.Ne(dxdt, 0), t, R), 2.0)
        Dfin = cond_set(expr_conds(last_member), t, R) if last_member is not None else None
        if Dref is None or Dfin is None:
            return V("unsupported", "domain of the parametric derivative not computable")
        if is_empty(diff_set(Dfin, Dref)) is False:
            widened = True
    if widened and not restriction_stated:
        return V("missing-assumption", "a factor was cancelled without stating it is nonzero")
    return V("verified", "every line is exactly consistent with the reference derivative")


def assess_typed_calc(task, problem, steps, target, tconds, var):
    """Typed steps: check each claim against the task meaning; method/rule names are not used as evidence."""
    C = sp.Symbol("C", real=True)
    last = None
    for s in steps:
        cl = s.get("claim") or {}
        k = cl.get("kind")
        if "input" in s:
            # a sub-derivation on its own input: its claim must be exactly right for that input
            try:
                inp, e = from_json(s["input"]), (from_json(cl["value"]) if k == "expression" else None)
            except (Unreadable, KeyError) as ex:
                return V("unsupported", f"typed input step: {ex}")
            if e is None:
                r = None
                if task == "limit" and k == "limit" and cl["value"].get("kind") == "finite":
                    apv = problem.get("approach", "0")
                    apv = sp.oo if apv == "infinity" else sp.Rational(Fraction(apv))
                    ref = limited(lambda: sp.limit(inp, var, apv), 3.0)
                    r = None if ref is None else _calc_final(sp.Rational(Fraction(cl["value"]["value"])), ref, [], var, "limit")
            elif task == "derivative":
                r = _calc_final(e, sp.diff(inp, var), expr_conds(inp), var, "value")
            elif task in ("indefinite-integral", "definite-integral"):
                r = _calc_final(e, inp, expr_conds(inp), var, "antiderivative")
            else:
                r = None
            if r is False:
                return V("invalid", f"typed step {s.get('id')}: claim is false for its own input")
            if r is None:
                return V("unsupported", f"typed step {s.get('id')}: sub-derivation undecided")
            continue
        try:
            if k == "expression":
                e = from_json(cl["value"])
                if task == "indefinite-integral":
                    r = _calc_final(e, target, tconds, var, "antiderivative")
                    if r is True and not cl.get("constantIncluded"):
                        return V("missing-assumption", "the constant of integration is omitted")
                    if r is True and _antiderivative_domain_gap(e, target, tconds, var):
                        return V("missing-assumption", "antiderivative valid only on part of the integrand's domain")
                elif task == "definite-integral":
                    r = _calc_final(e, problem_integrand(problem), [], var, "antiderivative")
                elif task == "derivative":
                    r = _calc_final(e, target, tconds, var, "value")
                elif task == "limit":
                    f = from_json(problem["expression"])
                    r = True if zero_test(sp.cancel(f - e), var) else None
                else:
                    r = None
                last = ("expr", r)
            elif k == "value":
                v = sp.Rational(Fraction(cl["value"]))
                r = _calc_final(v, target, [], var, "number")
                last = ("value", r)
            elif k == "limit":
                lv = cl["value"]
                if lv["kind"] == "finite":
                    r = _calc_final(sp.Rational(Fraction(lv["value"])), target, [], var, "limit")
                elif lv["kind"] == "positive-infinity":
                    r = target == sp.oo
                elif lv["kind"] == "does-not-exist":
                    r = None
                else:
                    r = None
                last = ("limit", r)
            else:
                return V("unsupported", f"typed claim kind {k}")
        except (Unreadable, KeyError) as e:
            return V("unsupported", f"typed step: {e}")
        if last[1] is False:
            return V("invalid", f"typed step {s.get('id')} claim is false")
        if last[1] is None:
            return V("unsupported", f"typed step {s.get('id')} undecided")
    if last is None:
        return V("incomplete", "no claims")
    if task == "definite-integral" and last[0] != "value":
        return V("incomplete", "no value stated")
    if task == "limit" and last[0] != "limit":
        return V("incomplete", "no limit stated")
    return V("verified", "every typed claim is exactly correct for the task")


def problem_integrand(problem):
    return from_json(problem["integrand"])


# ------------------------------------------------------------------ symbolic (typed transformation chains)
def assess_symbolic(problem, steps):
    try:
        cur = from_json(problem["start"])
        chain = [cur] + [from_json(s["expression"]) for s in steps]
    except (Unreadable, KeyError) as e:
        return V("unsupported", f"symbolic: {e}")
    syms = sorted(set().union(*[e.free_symbols for e in chain]), key=str)
    for a, b in zip(chain, chain[1:]):
        r = _expr_rel(a, expr_conds(a), b, expr_conds(b), syms, R)
        if r["verdict"] == "invalid":
            return V("invalid", f"{a} -> {b}: {r['reason']}")
        if r["verdict"] != "equivalent":
            return V("unsupported", f"{a} -> {b}: {r['verdict']}")
    return V("verified", "every transformation is an exact identity on the same domain")


# ------------------------------------------------------------------ entry
def assess_case(problem, working):
    dom = problem.get("domain")
    text = working["text"] if isinstance(working, dict) and working.get("format") == "natural" else working
    if isinstance(text, list) and all(isinstance(s, str) for s in text):
        text = "\n".join(text)
    try:
        if dom == "algebra" and "statement" in problem:
            task, body = problem_statement_text(problem["statement"])
            body, conds, extra, need_excl, form = strip_conditions(body)
            if extra:
                task = extra
            if task == "word":
                return V("unsupported", "word problem: no formal task statement")
            if not isinstance(text, str):
                return V("unsupported", "typed algebra working")
            if task in ("solve", "system"):
                return assess_solve(body, conds, text)
            return assess_expression(task, body, conds, need_excl, form, text)
        if dom == "calculus":
            return assess_calculus(problem, text)
        if dom == "symbolic" and isinstance(text, list):
            return assess_symbolic(problem, text)
        return V("unsupported", f"domain '{dom}' has no answer contract in the prototype")
    except (Unreadable, Ambiguous) as e:
        return V("unsupported", f"parse: {e}")
    except RecursionError:
        return V("unsupported", "recursion limit")
