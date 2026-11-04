#!/usr/bin/env python3
"""Independent SymPy cross-check of HELDOUT5-corpus.json.

Recomputes from the statement and line text alone:
  * malformed detection (lexical rules + parse failure),
  * per-line relation (line i vs line i-1, line 0 vs task),
  * firstInvalid, finalAnswerCorrect, and the coarse expect class
    (malformed / invalid / incomplete / valid*). valid vs valid-jump is a judgement
    about how many operations a line combines and is NOT recomputed (only checked
    to be consistent: firstInvalid null and final answer correct).

Conventions implemented
  Solve tasks: solution sets over the reals inside the domain D (task conditions and
    nonzero task denominators). A line's own denominators remove their zeros from that
    line's set. Relation: equal -> equivalent, prev subset of line -> implies,
    line subset of prev -> implied-by, else neither. A line is invalid if it loses a
    member of (prev set intersect task set); the final line is also invalid if its RAW
    claimed set (no domain intersection) is not a subset of the task set.
  Given x = a, find y: same, as sets in y with x = a.
  Evaluate: values; equal -> equivalent, else neither; first change is invalid.
  Simplify/Expand/Factorise: equality as rational functions; equal -> equivalent, else
    neither; first unequal line is invalid.
  finalAnswerCorrect: null if malformed or the final line is not in answer form;
    otherwise whether it equals the task's answer.
  Malformed items: every relation n/a, firstInvalid null, finalAnswerCorrect null.
"""
import json, re, sys, os
import sympy as sp
from sympy.parsing.sympy_parser import (parse_expr, standard_transformations,
                                        implicit_multiplication, convert_xor, rationalize)

T = standard_transformations + (implicit_multiplication, convert_xor, rationalize)
x, y = sp.Symbol('x', real=True), sp.Symbol('y', real=True)
R = sp.S.Reals
NUM = r'-?\d+(?:\.\d+)?(?:/\d+)?'


class Malformed(Exception):
    pass


def norm(s):
    return (s.replace('×', '*').replace('−', '-').replace('<=', '≤').replace('>=', '≥').strip())


def lex_check(s, vars_):
    if s.count('(') != s.count(')'):
        raise Malformed('unbalanced')
    d = 0
    for ch in s:
        d += ch == '('
        d -= ch == ')'
        if d < 0:
            raise Malformed('unbalanced')
    if re.search(r'[^0-9a-z.+\-*/^()<>=≤≥ ]', s):
        raise Malformed('bad char')
    for w in re.findall(r'[a-z]+', s):
        if w not in vars_:
            raise Malformed('stray word ' + w)
    if re.search(r'[a-z]\d', s):
        raise Malformed('letter-digit (x2)')
    if re.search(r'\d\s+[a-z]\s+\d', s):
        raise Malformed('letter as times sign')
    if re.search(r'/\s*\d+(?:\.\d+)?\s*[a-z(]', s):
        raise Malformed('a/bx ambiguous')
    if re.search(r'/\s*[\w.]+\s*/', s):
        raise Malformed('chained division')
    if re.search(r'[+\-*/^]\s*[+*/^=<>≤≥)]', s) or re.search(r'[=<>≤≥]\s*[=<>≤≥+*/^)]', s):
        raise Malformed('doubled operator')
    if re.search(r'[+\-*/^=<>≤≥(]\s*$', s) or re.search(r'^\s*[+*/^=<>≤≥)]', s):
        raise Malformed('dangling operator')


def pexpr(s, vars_, evaluate=True):
    lex_check(s, vars_)
    if not s.strip():
        raise Malformed('empty')
    try:
        return parse_expr(s, transformations=T, local_dict={'x': x, 'y': y}, evaluate=evaluate)
    except Exception as e:
        raise Malformed('parse: %s' % e)


RELS = ['≤', '≥', '<', '>', '=']


def split_rel(cl):
    found = [(m.start(), m.group()) for m in re.finditer(r'≤|≥|<|>|=', cl)]
    if len(found) != 1:
        raise Malformed('relation count %d' % len(found))
    i, op = found[0]
    return cl[:i], op, cl[i + 1:]


def mk_rel(l, op, r):
    return {'=': sp.Eq, '<': sp.Lt, '>': sp.Gt, '≤': sp.Le, '≥': sp.Ge}[op](l, r, evaluate=False)


def denom_zeros(e_uneval, var):
    z = sp.S.EmptySet
    for p in sp.preorder_traversal(e_uneval):
        if isinstance(p, sp.Pow) and p.exp.is_number and p.exp < 0:
            b = sp.sympify(str(p.base), locals={'x': x, 'y': y})
            if b.has(var):
                z = z | sp.solveset(sp.Eq(b, 0), var, R)
    return z


def clause_set(cl, var, vars_, subs=None):
    l, op, r = split_rel(cl)
    lu, ru = pexpr(l, vars_, False), pexpr(r, vars_, False)
    le, re_ = pexpr(l, vars_), pexpr(r, vars_)
    if subs:
        le, re_, lu, ru = (e.subs(subs) for e in (le, re_, lu, ru))
    excl = denom_zeros(lu, var) | denom_zeros(ru, var)
    rel = {'=': sp.Eq, '<': sp.Lt, '>': sp.Gt, '≤': sp.Le, '≥': sp.Ge}[op](le, re_)
    if rel is sp.true:
        s = R
    elif rel is sp.false:
        s = sp.S.EmptySet
    else:
        s = sp.solveset(rel, var, R)
    return s - excl


def line_set(line, var, vars_, subs=None):
    s = sp.S.EmptySet
    for cl in re.split(r'\s+or\s+', line):
        s = s | clause_set(cl, var, vars_, subs)
    return s


def answer_form(line, var):
    return all(re.fullmatch(r'%s\s*(=|<|>|≤|≥)\s*%s' % (var, NUM), cl.strip())
               for cl in re.split(r'\s+or\s+', line))


def rel_of(prev, cur):
    if prev == cur:
        return 'equivalent'
    if prev.is_subset(cur):
        return 'implies'
    if cur.is_subset(prev):
        return 'implied-by'
    return 'neither'


def parse_task(st):
    st = norm(st)
    m = re.fullmatch(r'Evaluate (.+) when x = (%s)' % NUM, st)
    if m:
        return 'evaluate', m.group(1), sp.Rational(m.group(2)) if '/' in m.group(2) else sp.nsimplify(m.group(2)), R
    m = re.fullmatch(r'Given x = (%s), find y where y = (.+)' % NUM, st)
    if m:
        return 'given', m.group(2), sp.nsimplify(sp.Rational(m.group(1)) if '/' in m.group(1) else m.group(1)), R
    cond = R
    m = re.fullmatch(r'(.+?) for x (≠|<|>|≤|≥) (%s)' % NUM, st)
    if m:
        st, op, a = m.group(1), m.group(2), sp.Rational(m.group(3))
        cond = (R - {a}) if op == '≠' else sp.solveset(mk_rel(x, op, a), x, R)
    m = re.fullmatch(r'(Solve for x:|Solve|Simplify|Expand|Factorise) (.+)', st)
    kind = {'Solve for x:': 'solve', 'Solve': 'solve'}.get(m.group(1), m.group(1).lower())
    return kind, m.group(2), None, cond


def poly_terms(e):
    return len(sp.Add.make_args(sp.expand(e)))


def irreducible_factor(f):
    fe = sp.expand(f)
    if not fe.has(x):
        return True
    c, fl = sp.factor_list(fe)
    return len(fl) == 1 and fl[0][1] == 1


def expr_answer_form(kind, s, task_e):
    u = pexpr(s, 'x', False)
    e = pexpr(s, 'x')
    if kind == 'expand':
        return '(' not in s and len(sp.Add.make_args(u)) == poly_terms(e)
    if kind == 'factorise':
        if isinstance(u, sp.Add):
            return False
        for f in sp.Mul.make_args(u):
            base = f.base if isinstance(f, sp.Pow) and f.exp.is_Integer and f.exp > 0 else f
            if not irreducible_factor(base):
                return False
            # an integer-coefficient factor must be primitive (no common numeric factor left inside);
            # factors with non-integer coefficients such as x - 1.5 are accepted as written
            if base.has(x):
                pb = sp.Poly(sp.expand(base), x)
                if all(c.is_Integer for c in pb.coeffs()) and pb.content() != 1:
                    return False
        return True
    # simplify
    n, d = sp.fraction(sp.together(e))
    if sp.gcd(n, d).has(x):
        return False
    if isinstance(u, sp.Add):
        if any(sp.fraction(sp.together(sp.sympify(str(t), locals={'x': x})))[1].has(x) for t in u.args):
            return False
        return len(u.args) == poly_terms(e)
    return True


def check(item):
    kind, body, a, D = parse_task(item['statement'])
    lines = [norm(l) for l in item['lines']]
    n = len(lines)
    out = {'relation': [], 'firstInvalid': None, 'finalAnswerCorrect': None, 'class': None}
    vars_ = ('x', 'y') if kind == 'given' else ('x',)
    try:
        if kind in ('solve', 'given'):
            var = x if kind == 'solve' else y
            subs = {x: a} if kind == 'given' else None
            if kind == 'solve':
                l, op, r = split_rel(body)
                lu, ru = pexpr(l, 'x', False), pexpr(r, 'x', False)
                D = D - denom_zeros(lu, x) - denom_zeros(ru, x)
                task = line_set(body, x, ('x',)) & D
            else:
                task = line_set('y = ' + body, y, vars_, subs)
            raws = [line_set(l, var, vars_, subs) for l in lines]
            sets = [s & D if kind == 'solve' else s for s in raws]
            prev = task
            for i, s in enumerate(sets):
                out['relation'].append(rel_of(prev, s))
                if out['firstInvalid'] is None and not (prev & task).is_subset(s):
                    out['firstInvalid'] = i
                prev = s
            af = answer_form(lines[-1], 'x' if kind == 'solve' else 'y')
            if af:
                if out['firstInvalid'] is None and not raws[-1].is_subset(task):
                    out['firstInvalid'] = n - 1
                out['finalAnswerCorrect'] = bool(raws[-1] == task)
        else:
            vals = [pexpr(l, 'x') for l in lines]
            if any(re.search(r'[=<>≤≥]', l) for l in lines):
                raise Malformed('relation in expression task')
            if kind == 'evaluate':
                tv = pexpr(body, 'x').subs(x, a)
                vals = [sp.nsimplify(v.subs(x, a)) for v in vals]
                eq = lambda p, q: sp.simplify(p - q) == 0
            else:
                tv = pexpr(body, 'x')
                eq = lambda p, q: sp.cancel(sp.together(p - q)) == 0
            prev = tv
            for i, v in enumerate(vals):
                same = eq(prev, v)
                out['relation'].append('equivalent' if same else 'neither')
                if not same and out['firstInvalid'] is None:
                    out['firstInvalid'] = i
                prev = v
            if kind == 'evaluate':
                af = bool(re.fullmatch(NUM, lines[-1]))
            else:
                af = expr_answer_form(kind, lines[-1], tv)
            if af:
                out['finalAnswerCorrect'] = bool(eq(tv, vals[-1]))
    except Malformed as e:
        out = {'relation': ['n/a'] * n, 'firstInvalid': None, 'finalAnswerCorrect': None,
               'class': 'malformed', 'why': str(e)}
        return out
    if out['firstInvalid'] is not None:
        out['class'] = 'invalid'
    elif out['finalAnswerCorrect'] is None:
        out['class'] = 'incomplete'
    elif out['finalAnswerCorrect']:
        out['class'] = 'valid*'
    else:
        out['class'] = 'invalid'  # wrong answer without a detected step error (should not occur)
    return out


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'HELDOUT5-corpus.json')
    items = json.load(open(path, encoding='utf-8'))
    dis = 0
    for it in items:
        r = check(it)
        exp = it['expect']
        exp_cls = 'valid*' if exp in ('valid', 'valid-jump') else exp
        probs = []
        if r['class'] != exp_cls:
            probs.append('class %s vs %s' % (r['class'], exp))
        if r['relation'] != it['relation']:
            probs.append('relation %s vs %s' % (r['relation'], it['relation']))
        if r['firstInvalid'] != it['firstInvalid']:
            probs.append('firstInvalid %s vs %s' % (r['firstInvalid'], it['firstInvalid']))
        if r['finalAnswerCorrect'] != it['finalAnswerCorrect']:
            probs.append('finalAnswerCorrect %s vs %s' % (r['finalAnswerCorrect'], it['finalAnswerCorrect']))
        tag = 'OK  ' if not probs else 'DIFF'
        dis += bool(probs)
        extra = (' [%s]' % r['why']) if 'why' in r else ''
        print('%s %s %-11s fi=%s fac=%s%s' % (tag, it['id'], exp, r['firstInvalid'], r['finalAnswerCorrect'], extra))
        for p in probs:
            print('     ' + p)
    print('items=%d disagreements=%d' % (len(items), dis))
    return 1 if dis else 0


if __name__ == '__main__':
    sys.exit(main())
