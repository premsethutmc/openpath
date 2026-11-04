"""student_oracle.py - the labelling engine of the student-working corpus (SymPy, exact arithmetic, no floats).

Shared by generate_student_set.py and check_student_set.py.  It is deliberately independent of every other
component of the repository (own normalisation, own domain handling, own step relation).

What it decides, from TEXT alone:
  * normalise(): student surface text -> a SymPy-parseable string (documented in README.md)
  * line_sets(): the exact real solution set of a line on the problem's domain (R minus the zeros of every
    x-containing denominator of the ORIGINAL problem and of the line itself), as a Sol
  * the relation of a step prev -> cur:  equivalent | obligation (cur strictly larger) | discharge | invalid
  * the final claim of a working and whether it is right
  * analyse(): all of the above for a whole working, under a chosen reading of implicit division
"""
import os
import re
import sys

try:
    import sympy  # noqa: F401
except ImportError:  # run without PYTHONPATH: fall back to the vendored copy
    for _p in ("/home/claude/vendor/sympy", "/home/claude/vendor/mpmath"):
        sys.path.insert(0, _p)
from sympy import (Symbol, Rational, Poly, together, fraction, factor_list, Integer, expand, cancel, lcm, S, Add, Mul)
from sympy.parsing.sympy_parser import parse_expr, standard_transformations

X = Symbol("x")
TR = standard_transformations


class Unreadable(Exception):
    """Text that cannot be read as an equation at all (garbled)."""


class Unsupported(Exception):
    """Readable but outside what exact rational analysis can certify (sqrt, trig, irrational roots, ...)."""


# --------------------------------------------------------------------------- solution sets
class Sol:
    """Either a finite set of rationals (cof=False) or R minus a finite set of rationals (cof=True)."""

    def __init__(self, cof, pts=()):
        self.cof = bool(cof)
        self.pts = frozenset(Rational(p) for p in pts)

    def minus(self, E):
        E = frozenset(E)
        return Sol(True, self.pts | E) if self.cof else Sol(False, self.pts - E)

    def subset(self, o):
        if not self.cof:
            return (not (self.pts & o.pts)) if o.cof else self.pts <= o.pts
        if not o.cof:
            return False
        return o.pts <= self.pts

    def __eq__(self, o):
        return self.cof == o.cof and self.pts == o.pts

    def __hash__(self):
        return hash((self.cof, self.pts))

    def union(self, o):
        if not self.cof and not o.cof:
            return Sol(False, self.pts | o.pts)
        if self.cof and o.cof:
            return Sol(True, self.pts & o.pts)
        c, f = (self, o) if self.cof else (o, self)
        return Sol(True, c.pts - f.pts)

    def to_json(self):
        return {"kind": "all-but" if self.cof else "finite", "points": [str(p) for p in sorted(self.pts)]}

    def __repr__(self):
        s = "{" + ",".join(str(p) for p in sorted(self.pts)) + "}"
        return ("R\\" + s) if self.cof else s


EMPTY = Sol(False)


# --------------------------------------------------------------------------- normalisation
UNI = {"−": "-", "–": "-", "—": "-", "‒": "-", "×": "*", "·": "*", "⋅": "*",
       "÷": "/", "∕": "/", "＝": "=", "²": "^2", "³": "^3", " ": " "}
UNSUP = re.compile(r"sqrt|√|sin|cos|tan|cot|sec|csc|log|ln\b|exp|π|\bpi\b|abs|\||\bi\b", re.I)
TOK = re.compile(r"\s*(?:(\d+\.\d+|\d+)|(x)|([-+*/^()=]))")


def _unicode(s):
    for k, v in UNI.items():
        s = s.replace(k, v)
    return s.strip()


def _tokens(side):
    """-> list of ('n',str) ('x',) ('o',ch) ; raises Unreadable on any other character."""
    out, pos = [], 0
    side = side.strip()
    while pos < len(side):
        m = TOK.match(side, pos)
        if not m or m.end() == pos:
            if side[pos:].strip() == "":
                break
            raise Unreadable("unexpected character %r" % side[pos:pos + 1])
        if m.group(1) is not None:
            out.append(("n", m.group(1)))
        elif m.group(2):
            out.append(("x", "x"))
        else:
            out.append(("o", m.group(3)))
        pos = m.end()
    return out


def _is_val_end(t):
    return t[0] in ("n", "x") or t == ("o", ")")


def _is_val_start(t):
    return t[0] in ("n", "x") or t == ("o", "(")


def _atom_end(tk, i):
    """index just after the atom (number | x | bracket group, with optional ^exponent) starting at i."""
    if tk[i][0] in ("n", "x"):
        j = i + 1
    elif tk[i] == ("o", "("):
        d = 0
        j = i
        while j < len(tk):
            if tk[j] == ("o", "("):
                d += 1
            elif tk[j] == ("o", ")"):
                d -= 1
                if d == 0:
                    break
            j += 1
        if d != 0:
            raise Unreadable("unbalanced brackets")
        j += 1
    else:
        raise Unreadable("operand expected")
    if j < len(tk) and tk[j] == ("o", "^"):
        j += 1
        if j < len(tk) and tk[j] == ("o", "-"):
            j += 1
        if j >= len(tk):
            raise Unreadable("exponent expected")
        j = _atom_end(tk, j)
    return j


def _implicit(tk, tight):
    """Insert the implicit multiplications.  tight=True makes a juxtaposed product that follows '/' part of the
    denominator (1/2x -> 1/(2*x)); tight=False reads strictly left to right (1/2x -> (1/2)*x)."""
    # adjacency validity
    for a, b in zip(tk, tk[1:]):
        if a[0] == "n" and b[0] == "n":
            raise Unreadable("two numbers side by side")
        if a[0] == "x" and b[0] in ("n", "x"):
            raise Unreadable("x followed by number/x")
        if a == ("o", ")") and b[0] == "n" and False:
            pass
    out = []
    i = 0
    n = len(tk)
    while i < n:
        t = tk[i]
        if tight and t == ("o", "/") and i + 1 < n and _is_val_start(tk[i + 1]):
            j = _atom_end(tk, i + 1)
            if j < n and _is_val_start(tk[j]) and tk[j][0] != "n":
                k = j
                while k < n and _is_val_start(tk[k]) and tk[k][0] != "n":
                    k = _atom_end(tk, k)
                chain = tk[i + 1:k]
                parts, p = [], 0
                while p < len(chain):
                    q = _atom_end(chain, p)
                    parts.append(chain[p:q])
                    p = q
                out.append(("o", "/"))
                out.append(("o", "("))
                for pi, part in enumerate(parts):
                    if pi:
                        out.append(("o", "*"))
                    out.extend(part)
                out.append(("o", ")"))
                i = k
                continue
        out.append(t)
        if i + 1 < n and _is_val_end(t) and _is_val_start(tk[i + 1]):
            out.append(("o", "*"))
        i += 1
    return out


def _to_py(tk):
    parts = []
    for i, t in enumerate(tk):
        if t[0] == "n":
            if "." in t[1]:
                a, b = t[1].split(".")
                parts.append("(%d/%d)" % (int(a + b), 10 ** len(b)))
            else:
                parts.append(str(int(t[1])))
        elif t[0] == "x":
            parts.append("x")
        else:
            parts.append("**" if t[1] == "^" else t[1])
    return "".join(parts)


def _check_exponents(tk):
    for i, t in enumerate(tk):
        if t == ("o", "^"):
            nxt = tk[i + 1:i + 2]
            if not nxt or nxt[0][0] != "n" or "." in nxt[0][1]:
                raise Unsupported("non-integer or non-literal exponent")


def normalise_side(side, reading="lr"):
    tk = _tokens(side)
    if not tk:
        raise Unreadable("empty side")
    _check_exponents(tk)
    tk = _implicit(tk, reading == "tight")
    return _to_py(tk)


def split_equation(text):
    t = _unicode(text)
    if t.count("=") != 1:
        raise Unreadable("need exactly one '='")
    l, r = t.split("=")
    return l, r


def normalise(text, reading="lr"):
    """text of one equation -> 'L=R' string that SymPy's parse_expr accepts (documented normalisation)."""
    l, r = split_equation(text)
    return normalise_side(l, reading) + "=" + normalise_side(r, reading)


def readings_differ(text):
    """True when the left-to-right and tight readings of any equation in the line differ."""
    t = _unicode(text)
    if re.search(UNSUP, t):
        return False
    try:
        return parse_line_strings(t, "lr") != parse_line_strings(t, "tight")
    except (Unreadable, Unsupported):
        return False


def parse_line_strings(t, reading):
    return [normalise(p, reading) for p in re.split(r"\s+or\s+", t)]


# --------------------------------------------------------------------------- parsing a line
def _parse(s, evaluate):
    try:
        return parse_expr(s, local_dict={"x": X}, transformations=TR, evaluate=evaluate)
    except Exception as e:  # SyntaxError, TypeError, ...
        raise Unreadable("sympy cannot parse %r (%s)" % (s, type(e).__name__))


def _den_bases(e, out):
    if e.is_Pow and e.exp.is_Number and e.exp.is_negative and e.base.has(X):
        out.append(e.base)
    for a in e.args:
        _den_bases(a, out)


def _zeros(base):
    b = expand(base)
    try:
        P = Poly(b, X)
    except Exception:
        raise Unsupported("denominator is not a polynomial")
    if P.is_zero:
        raise Unsupported("denominator identically zero")
    if P.degree() == 0:
        return set()
    z = set()
    c, fl = factor_list(P.as_expr(), X)
    for f, _m in fl:
        Pf = Poly(f, X)
        if Pf.degree() == 1:
            p1, p0 = Pf.all_coeffs()
            z.add(Rational(-p0, p1))
        elif Pf.count_roots() > 0:
            raise Unsupported("irrational excluded value")
    return z


def _roots_of_numerator(num):
    P = Poly(num, X)
    if P.is_zero:
        return None  # identity
    if P.degree() == 0:
        return set()
    r = set()
    c, fl = factor_list(P.as_expr(), X)
    for f, _m in fl:
        Pf = Poly(f, X)
        if Pf.degree() == 1:
            p1, p0 = Pf.all_coeffs()
            r.add(Rational(-p0, p1))
        else:
            raise Unsupported("irreducible factor of degree %d (irrational or complex roots)" % Pf.degree())
    return r


class Line:
    """A parsed student line."""

    def __init__(self, text, reading="lr"):
        self.text = text
        t = _unicode(text)
        self.kind = None
        self.claim = None  # literal claim set for text claims
        low = t.lower().strip().rstrip(".")
        if re.search(UNSUP, low) and not re.fullmatch(r"all real numbers.*|no (real )?solutions?", low):
            raise Unsupported("function/radical notation")
        if re.fullmatch(r"no (real )?solutions?|empty set|∅", low):
            self.kind, self.claim, self.members, self.own = "claim", EMPTY, [], set()
            return
        m = re.fullmatch(r"all real numbers(?:\s+except\s+(.+))?", low)
        if m:
            pts = []
            if m.group(1):
                for piece in re.split(r"\s*(?:,|and)\s*", m.group(1).strip()):
                    if piece:
                        try:
                            pts.append(Rational(piece.replace(" ", "")))
                        except Exception:
                            raise Unreadable("bad exception list")
            self.kind, self.claim, self.members, self.own = "claim", Sol(True, pts), [], set()
            return
        parts = re.split(r"\s+or\s+", t)
        self.kind = "or" if len(parts) > 1 else "eq"
        self.members = []
        self.own = set()
        for p in parts:
            s = normalise(p, reading)
            ls, rs = s.split("=")
            Lu, Ru = _parse(ls, False), _parse(rs, False)
            Le, Re = _parse(ls, True), _parse(rs, True)
            bases = []
            _den_bases(Lu, bases)
            _den_bases(Ru, bases)
            for b in bases:
                self.own |= _zeros(b)
            self.members.append((Le, Re))

    def solution_form_values(self):
        """If every member reads 'x = number' (either side), the claimed values; else None."""
        vals = []
        for Le, Re in self.members:
            if Le == X and not Re.has(X) and Re.is_Rational:
                vals.append(Rational(Re))
            elif Re == X and not Le.has(X) and Le.is_Rational:
                vals.append(Rational(Le))
            else:
                return None
        return vals

    def sol(self, E_orig):
        """Exact solution set on the domain R \\ (E_orig U own denominators)."""
        E = set(E_orig) | self.own
        if self.kind == "claim":
            return self.claim.minus(E_orig)
        total = EMPTY
        for Le, Re in self.members:
            f = together(Le - Re)
            num, _den = fraction(f)
            roots = _roots_of_numerator(num)
            s = Sol(True, E) if roots is None else Sol(False, roots).minus(E)
            total = total.union(s)
        return total

    def claim_set(self):
        """The literal claim made if this line is a final answer, else None."""
        if self.kind == "claim":
            return self.claim
        v = self.solution_form_values()
        return None if v is None else Sol(False, v)


# --------------------------------------------------------------------------- analysis of a working
def problem_domain(problem, reading="lr"):
    ln = Line(problem, reading)
    return set(ln.own), ln


def relation(prev, cur, truth, ob_open):
    if prev == cur:
        return "equivalent"
    if prev.subset(cur):
        return "valid-with-obligation"
    if ob_open and cur.subset(prev) and truth.subset(cur):
        return "valid-discharge"
    return "invalid"


def analyse(problem, lines, reading="lr"):
    """Full analysis of one working.  Returns a dict with the expected block and diagnostics."""
    E, pl = problem_domain(problem, reading)
    truth = pl.sol(E)
    labels, sets, unsup, claims = [], [], [], []
    parsed = []
    for i, t in enumerate(lines, 1):
        try:
            ln = Line(t, reading)
            s = ln.sol(E)
            parsed.append(ln)
            sets.append(s)
        except (Unreadable, Unsupported) as e:
            parsed.append(None)
            sets.append(None)
            unsup.append({"line": i, "reason": "%s: %s" % (type(e).__name__, e)})
    prev = truth
    ob_open = False
    first_invalid = None
    for i, s in enumerate(sets, 1):
        if s is None:
            labels.append("unsupported")
            prev = None
            continue
        if prev is None:
            labels.append("not-assessed")
            prev = s
            continue
        rel = relation(prev, s, truth, ob_open)
        if rel == "valid-with-obligation":
            ob_open = True
        elif rel == "valid-discharge":
            ob_open = s != truth
        elif rel == "equivalent" and ob_open:
            ob_open = s != truth
        labels.append(rel)
        if rel == "invalid" and first_invalid is None:
            first_invalid = i
        prev = s
    last = parsed[-1] if parsed else None
    claim = last.claim_set() if last is not None else None
    verdict = "n/a"
    if claim is not None:
        verdict = "correct" if claim == truth else "incorrect"
    if unsup:
        status, invalid_at = "unsupported", None
    elif first_invalid is not None:
        status, invalid_at = "invalid", "step"
    elif claim is None:
        status, invalid_at = "valid-incomplete", None
    elif verdict == "correct":
        status, invalid_at = "valid-complete", None
    else:
        status, invalid_at = "invalid", "final-claim"
    if status == "unsupported":
        first_invalid_out = None
        verdict = "n/a"
    else:
        first_invalid_out = first_invalid
    return {
        "status": status, "first_invalid": first_invalid_out, "invalid_at": invalid_at, "final_verdict": verdict,
        "step_labels": labels, "unsupported_lines": unsup, "truth": truth, "excluded": sorted(E),
        "step_flags": {str(i): l for i, l in enumerate(labels, 1) if l in ("valid-with-obligation", "valid-discharge")},
    }


def verdict_key(a):
    return (a["status"], a["first_invalid"], a["invalid_at"], a["final_verdict"])
