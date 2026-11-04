"""Safe mathematical text parser for the isolated SymPy transition verifier.

No eval/exec/sympify/parse_expr: a hand-written tokenizer + Pratt parser builds SymPy objects
directly from a closed whitelist of constructors. Untrusted text can only produce the objects below.

Resource bounds: input length, token count, nesting depth, integer size and exponent size are capped;
violations raise Unreadable("resource: ...").
"""
from __future__ import annotations
import re
from dataclasses import dataclass, field
from fractions import Fraction
import sympy as sp

MAX_LEN, MAX_TOKENS, MAX_DEPTH, MAX_EXP, MAX_INT_DIGITS = 600, 400, 60, 64, 40


class Unreadable(Exception):
    pass


class Ambiguous(Unreadable):
    pass


FUNCS = {
    "sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "sec": sp.sec, "csc": sp.csc, "cot": sp.cot,
    "asin": sp.asin, "acos": sp.acos, "atan": sp.atan, "arcsin": sp.asin, "arccos": sp.acos, "arctan": sp.atan,
    "sinh": sp.sinh, "cosh": sp.cosh, "tanh": sp.tanh,
    "ln": sp.log, "exp": sp.exp, "sqrt": sp.sqrt, "abs": sp.Abs,
    "cbrt": lambda a: sp.real_root(a, 3), "ddx": lambda a: sp.diff(a, sp.Symbol("x", real=True)), "log2": lambda a: sp.log(a, 2), "log10": lambda a: sp.log(a, 10),
}
CONSTS = {"pi": sp.pi, "oo": sp.oo, "infinity": sp.oo, "inf": sp.oo}
REL = {"=", "!=", "<", ">", "<=", ">="}

GLYPHS = [("−", "-"), ("–", "-"), ("×", "*"), ("·", "*"), ("⋅", "*"), ("÷", "/"),
          ("≤", "<="), ("≥", ">="), ("≠", "!="), ("√", " sqrt "), ("∛", " cbrt "),
          ("π", " pi "), ("²", "^2"), ("³", "^3"), ("∞", " oo "), ("→", "->"),
          ("θ", " theta "), ("′", "'"), ("**", "^"), ("∗", "*")]

TOKEN = re.compile(r"\s*(?:(?P<num>\d+(?:\.\d+)?|\.\d+)|(?P<id>[A-Za-z][A-Za-z0-9_]*)|(?P<op><=|>=|!=|->|[+\-*/^()\[\]{}|,=<>!'±]))")


def glyphs(s: str) -> str:
    for a, b in GLYPHS:
        s = s.replace(a, b)
    return re.sub(r"\bd/dx\b", " ddx ", s)


@dataclass
class Tok:
    kind: str
    val: str


def tokenize(s: str) -> list[Tok]:
    if len(s) > MAX_LEN:
        raise Unreadable("resource: input too long")
    s = glyphs(s)
    out, i = [], 0
    while i < len(s):
        if s[i:].strip() == "":
            break
        m = TOKEN.match(s, i)
        if not m or m.end() == i:
            raise Unreadable(f"unexpected character {s[i:].strip()[:1]!r}")
        i = m.end()
        if m.group("num") is not None:
            v = m.group("num")
            if len(v.replace(".", "")) > MAX_INT_DIGITS:
                raise Unreadable("resource: number too long")
            out.append(Tok("num", v))
        elif m.group("id") is not None:
            out.append(Tok("id", m.group("id")))
        else:
            out.append(Tok("op", m.group("op")))
    if len(out) > MAX_TOKENS:
        raise Unreadable("resource: too many tokens")
    return out


@dataclass
class Ctx:
    """Parse context. variables: names treated as real symbols; complex_i: 'i' is the imaginary unit."""
    variables: dict = field(default_factory=dict)  # name -> sympy Symbol
    complex_i: bool = False
    allow_e_const: bool = True
    allow_div_juxtaposition: bool = False
    flags: set = field(default_factory=set)
    conds: list = field(default_factory=list)  # natural-domain conditions recorded while parsing, before any auto-simplification

    def note(self, kind, e):
        if not (e.is_number and e.is_nonzero is not False and kind == "ne0" and e != 0):
            self.conds.append((kind, e))

    def sym(self, name: str) -> sp.Symbol:
        if name not in self.variables:
            self.variables[name] = sp.Symbol(name, real=True)
        return self.variables[name]


class PM:
    """a ± b, expanded later into two branches."""
    def __init__(self, a, b):
        self.a, self.b = a, b


def expand_pm(e):
    """Return the list of SymPy expressions represented by a tree possibly containing PM nodes (as sympy Function wrapper)."""
    return e  # PM handled at parse time via branch lists


class Parser:
    def __init__(self, toks: list[Tok], ctx: Ctx):
        self.t, self.i, self.ctx, self.depth = toks, 0, ctx, 0
        self.abs_open = 0

    # ---- token helpers
    def peek(self, k=0):
        j = self.i + k
        return self.t[j] if j < len(self.t) else None

    def take(self):
        tok = self.peek()
        if tok is None:
            raise Unreadable("unexpected end")
        self.i += 1
        return tok

    def at_op(self, v, k=0):
        tok = self.peek(k)
        return tok is not None and tok.kind == "op" and tok.val == v

    def expect(self, v):
        if not self.at_op(v):
            got = self.peek()
            raise Unreadable(f"expected {v!r}, got {got.val if got else 'end'!r}")
        self.i += 1

    def enter(self):
        self.depth += 1
        if self.depth > MAX_DEPTH:
            raise Unreadable("resource: nesting too deep")

    def leave(self):
        self.depth -= 1

    # ---- grammar. Every expression-level method returns a list of branches (for ±).
    def expr(self):
        self.enter()
        try:
            if self.at_op("±"):
                self.take()
                b = self.term()
                left = [x for v in b for x in (v, -v)]
            elif self.at_op("-"):
                self.take()
                left = [-v for v in self.term()]
            else:
                if self.at_op("+"):
                    self.take()
                left = self.term()
            while self.peek() is not None and self.peek().kind == "op" and self.peek().val in ("+", "-", "±"):
                op = self.take().val
                right = self.term()
                if op == "+":
                    left = [a + b for a in left for b in right]
                elif op == "-":
                    left = [a - b for a in left for b in right]
                else:
                    left = [x for a in left for b in right for x in (a + b, a - b)]
                if len(left) > 8:
                    raise Unreadable("resource: too many ± branches")
            return left
        finally:
            self.leave()

    def starts_atom(self, tok):
        if tok is None:
            return False
        if tok.kind in ("num", "id"):
            return True
        if tok.kind == "op" and tok.val in ("(", "["):
            return True
        if tok.kind == "op" and tok.val == "|" and self.abs_open == 0:
            return True
        return False

    def term(self):
        left = self.unary()
        after_div = False
        while True:
            tok = self.peek()
            if tok is not None and tok.kind == "op" and tok.val in ("*", "/"):
                self.take()
                right = self.unary()
                if tok.val == "*":
                    left = [a * b for a in left for b in right]
                    after_div = False
                else:
                    for b in right:
                        self.ctx.note("ne0", b)
                    left = [a / b for a in left for b in right]
                    after_div = True
            elif self.starts_atom(tok) and not (tok.kind == "num" and self.prev_was_num()):
                if after_div and not self.ctx.allow_div_juxtaposition:
                    # 1/2x : (1/2)x or 1/(2x)? Conventions differ; refuse to choose.
                    raise Ambiguous("implicit product after a division (a/bc)")
                right = self.power()  # implicit multiplication binds like *
                left = [a * b for a in left for b in right]
            else:
                return left

    def prev_was_num(self):
        p = self.t[self.i - 1] if self.i > 0 else None
        return p is not None and p.kind == "num"

    def unary(self):
        if self.at_op("-"):
            self.take()
            return [-v for v in self.unary()]
        if self.at_op("+"):
            self.take()
            return self.unary()
        return self.power()

    def power(self):
        base = self.postfix()
        if self.at_op("^"):
            self.take()
            exp = self.unary_for_exponent()
            out = []
            for b in base:
                for e in exp:
                    if e.is_Integer and abs(int(e)) > MAX_EXP:
                        raise Unreadable("resource: exponent too large")
                    if e.free_symbols and b.is_Number and abs(b) > 10**6:
                        raise Unreadable("resource: symbolic power of a large base")
                    if e.is_number and e.is_negative:
                        self.ctx.note("ne0", b)
                    if e.is_Rational and not e.is_Integer and e.q % 2 == 0:
                        self.ctx.note("ge0", b)
                    if not e.is_number:
                        self.ctx.note("powsym", b)
                    out.append(sp.Pow(b, e))
            return out
        return base

    def unary_for_exponent(self):
        if self.at_op("-"):
            self.take()
            return [-v for v in self.unary_for_exponent()]
        return self.power()

    def postfix(self):
        vals = self.atom()
        while True:
            if self.at_op("!") and not self.at_op("=", 1):
                self.take()
                nv = []
                for v in vals:
                    if not (v.is_Integer and 0 <= v <= 200):
                        raise Unreadable("factorial of a non-small-integer")
                    nv.append(sp.factorial(v))
                vals = nv
            elif self.at_op("'"):
                self.take()
                var = self.ctx.variables.get("x") or self.ctx.sym("x")
                vals = [sp.diff(v, var) for v in vals]
                self.ctx.flags.add("prime-notation")
            else:
                return vals

    def group(self, close):
        inner = self.expr()
        self.expect(close)
        return inner

    def atom(self):
        tok = self.take()
        if tok.kind == "num":
            return [sp.Rational(Fraction(tok.val))]
        if tok.kind == "op":
            if tok.val == "(":
                return self.group(")")
            if tok.val == "[":
                return self.group("]")
            if tok.val == "{":
                return self.group("}")
            if tok.val == "|":
                self.abs_open += 1
                inner = self.expr()
                self.abs_open -= 1
                self.expect("|")
                return [sp.Abs(v) for v in inner]
            raise Unreadable(f"unexpected {tok.val!r}")
        name = tok.val
        if name in FUNCS or name in ("log",):
            return self.func(name)
        if name in CONSTS:
            return [CONSTS[name]]
        if name == "e" and self.ctx.allow_e_const and "e" not in self.ctx.variables:
            return [sp.E]
        if name == "i" and self.ctx.complex_i:
            return [sp.I]
        if "_" in name:
            raise Unreadable(f"subscripted name {name!r}")
        if len(name) == 1 or name == "theta":
            return [self.ctx.sym(name)]
        if len(name) == 2 and name.isalpha() and name not in ("dx", "dt", "du", "dy", "dv"):
            # two adjacent letters: implicit product (xy, ab)
            self.ctx.flags.add("implicit-letter-product")
            return [self.ctx.sym(name[0]) * self.ctx.sym(name[1])]
        if re.fullmatch(r"[a-z]\d", name):
            raise Unreadable(f"name with digit {name!r}")
        raise Unreadable(f"word {name!r}")

    def func(self, name):
        if name == "log":
            # log with an explicit base: log_b(x) is tokenised as id 'log_b'; bare log is ambiguous (base e or 10)
            raise Ambiguous("bare 'log' (base e or 10?)")
        f = FUNCS[name]
        if name == "ddx":
            # d/dx applies to the whole following product term: d/dx (3x+1)^5, d/dx[x^6], d/dx x^2 sin x
            self.ctx.flags.add("derivative-operator")
            return [f(a) for a in self.term()]
        power = None
        if self.at_op("^"):  # sin^2 x
            self.take()
            power = self.unary_for_exponent()
        if self.at_op("("):
            self.take()
            args = self.group(")")
        elif self.at_op("|"):
            args = self.atom()
        else:
            # function without brackets: argument is one implicit-product run of atoms (no operators)
            self.ctx.flags.add("unbracketed-function")
            args = self.bare_arg()
        for a in args:
            if name == "sqrt":
                self.ctx.note("ge0", a)
            elif name in ("ln", "log2", "log10") or name.startswith("log"):
                self.ctx.note("gt0", a)
            elif name in ("tan", "sec"):
                self.ctx.note("ne0", sp.cos(a))
            elif name in ("cot", "csc"):
                self.ctx.note("ne0", sp.sin(a))
            elif name in ("asin", "acos", "arcsin", "arccos"):
                self.ctx.note("ge0", 1 - a**2)
        out = [f(a) for a in args]
        if power is not None:
            out = [o ** p for o in out for p in power]
        return out

    def bare_arg(self):
        vals = self.power_no_func()
        while True:
            tok = self.peek()
            if tok is not None and tok.kind == "id" and tok.val not in FUNCS and tok.val not in ("log",) and tok.val not in ("dx", "du", "dt"):
                nxt = self.power_no_func()
                vals = [a * b for a in vals for b in nxt]
            else:
                return vals

    def power_no_func(self):
        tok = self.peek()
        if tok is None:
            raise Unreadable("missing function argument")
        if tok.kind == "id" and tok.val in FUNCS:
            return self.power()
        return self.power()


def parse_expression(text: str, ctx: Ctx | None = None) -> list:
    """Parse one expression; returns its branches (more than one only with ±)."""
    ctx = ctx or Ctx()
    ctx.conds = []
    toks = preprocess(tokenize(text))
    p = Parser(toks, ctx)
    vals = p.expr()
    if p.peek() is not None:
        raise Unreadable(f"trailing text at {p.peek().val!r}")
    for v in vals:
        if v.has(sp.zoo, sp.nan):
            raise Unreadable("undefined value (division by zero)")
    return vals


def preprocess(toks: list[Tok]) -> list[Tok]:
    """log_b / log b (x): merge 'log' '_' forms already tokenised as ids like log_2 into FUNC tokens."""
    out = []
    for tk in toks:
        if tk.kind == "id" and re.fullmatch(r"log_?(\d+|e)", tk.val):
            base = tk.val.replace("log", "").lstrip("_")
            FUNCS.setdefault(f"log{base}", (lambda b: (lambda a: sp.log(a, sp.E if b == "e" else int(b))))(base))
            out.append(Tok("id", f"log{base}"))
        else:
            out.append(tk)
    return out


# ---------------------------------------------------------------- statements
@dataclass
class Statement:
    """A parsed mathematical statement.
    kind: 'expr' (a bare expression), 'rel' (relation chain), 'or' / 'and' (of sub-statements)."""
    kind: str
    exprs: list = field(default_factory=list)   # for expr: branches; for rel: chain of expressions (single branch each)
    ops: list = field(default_factory=list)     # relation operators of a chain
    parts: list = field(default_factory=list)   # sub-statements for or/and
    text: str = ""
    conds: list = field(default_factory=list)

    def free_symbols(self):
        s = set()
        for e in self.exprs:
            s |= e.free_symbols
        for p in self.parts:
            s |= p.free_symbols()
        return s


def _split_top(toks: list[Tok], seps: set[str], words: set[str] = frozenset()):
    """Split at top-level separators (ops in seps or id words in words). Returns (pieces, separators)."""
    pieces, cur, depth, abs_open, sep_list = [], [], 0, 0, []
    for tk in toks:
        if tk.kind == "op" and tk.val in "([{":
            depth += 1
        elif tk.kind == "op" and tk.val in ")]}":
            depth -= 1
        elif tk.kind == "op" and tk.val == "|":
            abs_open ^= 1
        if depth == 0 and not abs_open and ((tk.kind == "op" and tk.val in seps) or (tk.kind == "id" and tk.val in words)):
            pieces.append(cur)
            sep_list.append(tk.val)
            cur = []
        else:
            cur.append(tk)
    pieces.append(cur)
    return pieces, sep_list


def _parse_tokens_expr(toks, ctx):
    p = Parser(toks, ctx)
    v = p.expr()
    if p.peek() is not None:
        raise Unreadable(f"trailing text at {p.peek().val!r}")
    for x in v:
        if x.has(sp.zoo, sp.nan):
            raise Unreadable("undefined value")
    return v


def _parse_chain(toks, ctx) -> Statement:
    pieces, ops = _split_top(toks, REL)
    if any(not p for p in pieces):
        raise Unreadable("empty side of a relation")
    sides = [_parse_tokens_expr(p, ctx) for p in pieces]
    if not ops:
        return Statement("expr", exprs=sides[0])
    # ± on a side of a relation: x = 3 ± 2  ->  x = 5 or x = 1 (only one side may branch)
    branching = [k for k, s in enumerate(sides) if len(s) > 1]
    if len(branching) > 1:
        raise Unreadable("± on more than one side")
    if branching:
        k = branching[0]
        parts = []
        for b in sides[k]:
            ch = [s[0] if j != k else b for j, s in enumerate(sides)]
            parts.append(Statement("rel", exprs=ch, ops=list(ops)))
        return Statement("or", parts=parts)
    return Statement("rel", exprs=[s[0] for s in sides], ops=list(ops))


def parse_statement(text: str, ctx: Ctx | None = None) -> Statement:
    """Parse a statement: expression, relation chain, or 'or'/'and'/',' combinations.
    'x = 1, 2 or -2' : bare values after a 'var = value' inherit its left side."""
    ctx = ctx or Ctx()
    ctx.conds = []
    toks = preprocess(tokenize(text))
    if not toks:
        raise Unreadable("empty")
    or_pieces, _ = _split_top(toks, set(), {"or"})
    or_parts = []
    for op_toks in or_pieces:
        and_pieces, seps = _split_top(op_toks, {","}, {"and"})
        sub = [_parse_chain(p, ctx) for p in and_pieces if p]
        if len(and_pieces) != len(sub):
            raise Unreadable("empty clause")
        if len(sub) == 1:
            or_parts.append(sub[0])
        elif all(s.kind == "expr" for s in sub[1:]) and sub[0].kind == "rel" and sub[0].ops == ["="] and sub[0].exprs[0].is_Symbol and "," in seps:
            # x = 1, 2  -> list of values for x (a comma list continues the same left side)
            var = sub[0].exprs[0]
            or_parts.extend([sub[0]] + [Statement("rel", exprs=[var, e], ops=["="]) for s in sub[1:] for e in s.exprs])
        else:
            or_parts.append(Statement("and", parts=sub))
    # bare values after 'x = a or b' inherit the variable
    fixed = []
    last_var = None
    for p in or_parts:
        if p.kind == "rel" and p.ops == ["="] and p.exprs[0].is_Symbol:
            last_var = p.exprs[0]
            fixed.append(p)
        elif p.kind == "expr" and last_var is not None:
            fixed.extend(Statement("rel", exprs=[last_var, e], ops=["="]) for e in p.exprs)
        else:
            fixed.append(p)
    st = fixed[0] if len(fixed) == 1 else Statement("or", parts=fixed)
    st.text = text
    st.conds = list(ctx.conds)
    return st
