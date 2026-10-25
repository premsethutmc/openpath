#!/usr/bin/env python3
"""Acceptance test 7: independent re-check of final answers from the prompt text alone.

  PYTHONPATH=/home/claude/vendor/sympy:/home/claude/vendor/mpmath python3 -I? tools/mathematics/tn5-bank/answer-recheck.py <bank.jsonl>
  (bank.jsonl is written by build-bank.mts; SymPy 1.14.0 offline copy lives in /home/claude/vendor, see engine-trial/README.md)

For a seeded sample (>= 10,000 random items + >= 20 from every family) every question that can be parsed from its own
text is re-computed with SymPy (arithmetic, HCF/LCM, primes, equations) or exact Fractions, with NO use of the family code,
the steps or the claims, and compared with the stated answer. Items whose question needs a picture, table, clock face or
a convention are recorded as not re-derivable from text. Writes results/answer-recheck.json. Deterministic.
"""
import json, re, sys, random, os
from fractions import Fraction as F
from decimal import Decimal, ROUND_HALF_UP
from itertools import permutations
from collections import defaultdict, Counter
import sympy as sp

SEED = 20261025
RANDOM_N = 10000
PER_FAMILY = 30   # >= 20 required; families with fewer items contribute all of them

NUM = r"\d+(?:,\d{2,3})*(?:\.\d+)?"
def n(s): return F(Decimal(s.replace(",", "").replace("₹", "")))
def nums(s): return [n(x) for x in re.findall(NUM, s)]
def ints(s): return [int(x) for x in nums(s)]
def clean(q): return q.replace("−", "-").replace("\u00a0", " ")

def sym(e):  # exact SymPy value of an arithmetic expression string
    return sp.nsimplify(sp.sympify(e, rational=True))
def fr(x):
    x = sp.Rational(x); return F(int(x.p), int(x.q))

# ---------------------------------------------------------------- expected-answer constructors
def NUMV(v): return ("num", F(v))
def LIST(v, ordered=True): return ("list", [F(x) for x in v], ordered)
def OPT(t): return ("opt", t)

def parse_stated(s):
    s = s.strip().replace("−", "-").replace("₹", "")
    m = re.fullmatch(r"(-?)(\d+) (\d+)/(\d+)", s)
    if m: v = F(int(m[2]) * int(m[4]) + int(m[3]), int(m[4])); return -v if m[1] else v
    m = re.fullmatch(r"(-?\d+)/(\d+)", s)
    if m: return F(int(m[1]), int(m[2]))
    return F(Decimal(s.replace(",", "")))
def parse_list(s):
    s = s.strip().strip("(){}[]")
    return [parse_stated(x) for x in re.split(r"\s*,\s*", s)]

def compare(exp, item):
    """True (agree) / False (disagree). Raises on an unreadable stated answer."""
    a, kind = item["answer"], exp[0]
    if kind == "num": return parse_stated(a) == exp[1]
    if kind == "list":
        got = parse_list(a)
        return got == exp[1] if exp[2] else sorted(got) == sorted(exp[1]) and len(got) == len(exp[1])
    if kind == "opt":
        opts = item["options"]; i = "ABCD".index(a)
        hits = [k for k, o in enumerate(opts) if o.strip().lower() == exp[1].strip().lower()]
        if len(hits) != 1: raise ValueError("option not unique")
        return hits[0] == i
    if kind == "optnum":
        opts = item["options"]; i = "ABCD".index(a)
        hits = [k for k, o in enumerate(opts) if re.fullmatch(r"-?[\d.,/ ]+", o.strip().replace("₹", "")) and parse_stated(o) == exp[1]]
        if len(hits) != 1: raise ValueError("option not unique")
        return hits[0] == i
    if kind == "txt": return a.strip().replace(" ", "") == exp[1].replace(" ", "")
    raise ValueError(kind)

# ---------------------------------------------------------------- units
UNIT = {"mm": ("len", 1), "cm": ("len", 10), "m": ("len", 1000), "km": ("len", 10**6), "mg": ("wt", 1), "g": ("wt", 1000), "kg": ("wt", 10**6),
        "mL": ("vol", 1), "L": ("vol", 1000), "ml": ("vol", 1)}
# note: "g" = 1000 mg, "kg" = 1000 g; keep exact via small integers
UNIT = {"mm": ("len", F(1)), "cm": ("len", F(10)), "m": ("len", F(1000)), "km": ("len", F(10**6)),
        "mg": ("wt", F(1)), "g": ("wt", F(1000)), "kg": ("wt", F(10**6)), "mL": ("vol", F(1)), "L": ("vol", F(1000))}
UN = r"(mm|cm|km|m|mg|kg|g|mL|L)\b"
def qty(s):  # "1 kg 600 g" / "3 m 45 cm" / "2.5 km"  -> (kind, size in smallest unit)
    parts = re.findall(rf"({NUM})\s*{UN}", s)
    kinds = {UNIT[u][0] for _, u in parts}
    if len(kinds) != 1: raise ValueError("units")
    return kinds.pop(), sum(n(v) * UNIT[u][1] for v, u in parts)

# ---------------------------------------------------------------- rules: each returns an expected answer or None (not mine)
RULES = []
def rule(fn): RULES.append(fn); return fn

def first_expr(q):
    m = re.match(r"^(?:Work out |Calculate )?([₹\d.,/ +\-×÷()]+?)\s*=\s*\?(?:\s|$)", q)
    return m

@rule
def r_arith(q, it):
    m = re.match(r"^(?:Work out )?([₹\d.,/ +\-×÷()]+?)(?:\s*=\s*\?|\.)(?:\s|$)", q)
    if not m or not re.search(r"\d\s*[+\-×÷]\s*[₹\d]", m[1]): return None
    e = m[1].replace("₹", "").replace("×", "*").replace("÷", "/")
    e = re.sub(r"(\d),(?=\d{2,3}\b)", r"\1", e)
    e = re.sub(r"(\d+/\d+)", r"(\1)", e)
    return NUMV(fr(sym(e)))

@rule
def r_box(q, it):
    m = re.search(r"([\d.,/ +\-×÷□₹]+□[\d.,/ +\-×÷□₹]*|[\d.,/ +\-×÷₹]+=[\d.,/ +\-×÷□₹]*□[\d.,/ +\-×÷□₹]*)", q)
    if "□" not in q or "remainder" in q: return None
    m = re.search(r"([\d.,/ +\-×÷□₹=]+)$", q.split("?")[-1].strip() if "?" in q.split("□")[-1] else q)
    m = re.search(r"((?:[\d.,/ +\-×÷₹]*□[\d.,/ +\-×÷₹=]*|[\d.,/ +\-×÷₹]+=\s*[\d.,/ +\-×÷₹]*□[\d.,/ +\-×÷₹]*))", q[q.index("?") + 1:] if q.startswith("What number") else q)
    if not m: return None
    eqn = m[1].strip().replace("×", "*").replace("÷", "/").replace("₹", "")
    eqn = re.sub(r"(\d+/\d+)", r"(\1)", eqn)
    if "=" not in eqn: return None
    L, R = eqn.split("=")
    x = sp.Symbol("x")
    L = sym(L.replace("□", "x")) if "□" in L else sym(L)
    R = sym(R.replace("□", "x")) if "□" in R else sym(R)
    sol = sp.solve(sp.Eq(L, R), x)
    if len(sol) != 1: return None
    return NUMV(fr(sol[0]))

@rule
def r_compare_numbers(q, it):
    m = re.match(r"Which number is (more|less): (%s) or (%s)\?" % (NUM, NUM), q)
    if m:
        a, b = n(m[2]), n(m[3]); return NUMV(max(a, b) if m[1] == "more" else min(a, b))
    m = re.match(r"Which (?:number|decimal) is (greater|smaller|less|more): (%s) or (%s)\?" % (NUM, NUM), q)
    if m:
        a, b = n(m[2]), n(m[3]); return NUMV(max(a, b) if m[1] in ("greater", "more") else min(a, b))
    m = re.match(r"Which fraction is (greater|smaller): (\d+)/(\d+) or (\d+)/(\d+)\?", q)
    if m:
        a, b = F(int(m[2]), int(m[3])), F(int(m[4]), int(m[5])); return NUMV(max(a, b) if m[1] == "greater" else min(a, b))
    m = re.match(r"Compare the numbers (%s) and (%s)\. Which sentence is true\?" % (NUM, NUM), q)
    if m:
        a, b = n(m[1]), n(m[2]); return OPT(f"{m[1]} is equal to {m[2]}" if a == b else f"{m[1]} is more than {m[2]}" if a > b else f"{m[1]} is less than {m[2]}")

@rule
def r_next(q, it):
    m = re.match(r"Which number comes just (after|before) (%s)\?" % NUM, q)
    if m: return NUMV(n(m[2]) + (1 if m[1] == "after" else -1))

@rule
def r_sign(q, it):
    m = re.match(r"Which sign goes in the box: (.+?) ☐ (.+?)\?", q)
    if m and "Choose" in q:
        if re.search(UN, m[1]):
            k1, a = qty(m[1]); k2, b = qty(m[2]); assert k1 == k2
        else: a, b = fr(sym(re.sub(r"[,₹]", "", m[1]))), fr(sym(re.sub(r"[,₹]", "", m[2])))
        return OPT("<" if a < b else ">" if a > b else "=")
    m = re.match(r"Choose <, > or = to make this true\..*?: (.+?) ○ (.+)$", q)
    if m:
        a = fr(sym(m[1].replace("×", "*").replace("÷", "/"))); b = fr(sym(m[2].replace("×", "*").replace("÷", "/")))
        return OPT("<" if a < b else ">" if a > b else "=")

@rule
def r_order(q, it):
    m = re.match(r"(?:Put|Write) these (?:numbers|decimals|fractions)(?: in (ascending|descending) order)?(?: in order)?(?: from the (smallest|biggest|greatest|largest) to the (smallest|biggest|greatest|largest))?[^:]*?(?:\((?:smallest first|from the smallest to the greatest|from the greatest to the smallest)\))?: (.+?)\. Write", q)
    if not m: return None
    body = m[4]
    asc = (m[1] == "ascending") or (m[2] == "smallest") or ("smallest first" in q.split(":")[0])
    if m[1] == "descending" or m[2] in ("biggest", "greatest", "largest"): asc = False
    items = [x.strip() for x in re.split(r"[;,]\s*|\s+(?=\d)", body) if x.strip()]
    vals = [parse_stated(x) for x in items]
    return LIST(sorted(vals, reverse=not asc))

@rule
def r_digits(q, it):
    m = re.match(r"Use each of the digits ([\d, ]+) exactly once to make the (smallest|greatest) (\d)-digit number", q)
    if m:
        ds = re.findall(r"\d", m[1]); c = [int("".join(p)) for p in set(permutations(ds)) if p[0] != "0"]
        return NUMV(min(c) if m[2] == "smallest" else max(c))

def rnd(x, places):  # places: 0 whole, 1 tenth, -1 ten ...
    q = Decimal(1).scaleb(-places)
    return F(Decimal(x.numerator) / Decimal(x.denominator)).limit_denominator(1) if False else F((Decimal(x.numerator) / Decimal(x.denominator)).quantize(q, rounding=ROUND_HALF_UP))
PL = {"ten": -1, "hundred": -2, "thousand": -3, "whole number": 0, "tenth": 1, "hundredth": 2, "lakh": -5, "ten thousand": -4}
def rnd_dec(s, places):
    d = Decimal(s.replace(",", ""))
    if places >= 0: return F(d.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP))
    f = Decimal(10) ** (-places)
    return F((d / f).quantize(Decimal(1), rounding=ROUND_HALF_UP) * f)
@rule
def r_round(q, it):
    m = re.search(r"Round (%s) to the nearest (ten thousand|thousand|hundredth|hundred|tenth|ten|lakh|whole number)" % NUM, q)
    if m and "estimate" not in q.lower().split("round")[0]: return NUMV(rnd_dec(m[1], PL[m[2]]))
    m = re.search(r"This number .*?", q)

@rule
def r_estimate(q, it):
    m = re.match(r"Estimate (%s) ([+\-×]) (%s)(?::| by)(.*)" % (NUM, NUM), q)
    if not m: return None
    a, op, b, rest = m[1], m[2], m[3], m[4]
    if "nearest ten" in rest and "nearest hundred" not in rest: pa = pb = -1
    elif "nearest hundred first" in rest and "and" not in rest: pa = pb = -2
    elif "greatest place" in rest:
        def gp(s):
            d = Decimal(s.replace(",", "")); e = d.adjusted(); return rnd_dec(s, -e)
        va, vb = gp(a), gp(b); return NUMV(va * vb)
    else:
        m2 = re.search(r"rounding (%s) to the nearest (ten|hundred) and (%s) to the nearest (ten|hundred)" % (NUM, NUM), rest)
        if not m2: return None
        va, vb = rnd_dec(m2[1], PL[m2[2]]), rnd_dec(m2[3], PL[m2[4]]); return NUMV(va * vb)
    va, vb = rnd_dec(a, pa), rnd_dec(b, pb)
    return NUMV(va + vb if op == "+" else va - vb if op == "-" else va * vb)

@rule
def r_hcf_lcm(q, it):
    m = re.search(r"(highest common factor|lowest common multiple) \((?:HCF|LCM)\) of ([\d, and]+)\?", q)
    if m:
        v = [int(x) for x in re.findall(r"\d+", m[2])]
        return NUMV(sp.igcd(*v) if m[1].startswith("highest") else sp.ilcm(*v))
    m = re.match(r"List all the common factors of (\d+) and (\d+)\.", q)
    if m: g = sp.igcd(int(m[1]), int(m[2])); return LIST(sp.divisors(g))
    m = re.match(r"List all the factors of (\d+)\.", q)
    if m: return LIST(sp.divisors(int(m[1])))
    m = re.match(r"List all the prime numbers from (\d+) to (\d+)\.", q)
    if m: return LIST(list(sp.primerange(int(m[1]), int(m[2]) + 1)))
    m = re.match(r"What is the smallest prime factor of (\d+)\?", q)
    if m: return NUMV(min(sp.factorint(int(m[1]))))
    m = re.match(r"The (HCF|LCM) of (\d+) and (\d+) is (\d+)\. Use HCF × LCM = product of the numbers to find their (LCM|HCF)\.", q)
    if m:
        a, b, g = int(m[2]), int(m[3]), int(m[4]); return NUMV(F(a * b, g))
    m = re.match(r"Two numbers have HCF (\d+) and LCM (\d+)\. One of the numbers is (\d+)\. Find the other number\.", q)
    if m: return NUMV(F(int(m[1]) * int(m[2]), int(m[3])))
    m = re.match(r"Two numbers have the same ", q)

@rule
def r_fractions(q, it):
    m = re.match(r"Write (\d+)/(\d+) in its lowest terms\.", q)
    if m: v = sp.Rational(int(m[1]), int(m[2])); return TXT_FRAC(v)
    m = re.match(r"Write the mixed number (\d+) (\d+)/(\d+) as an improper fraction", q)
    if m: v = sp.Rational(int(m[1]) * int(m[3]) + int(m[2]), int(m[3])); return NUMV(fr(v))
    m = re.match(r"Write (\d+)/(\d+) as a mixed number", q)
    if m: return NUMV(F(int(m[1]), int(m[2])))
    m = re.match(r"(\d+)/(\d+) = □/(\d+)$", q)
    if m: return NUMV(F(int(m[1]), int(m[2])) * int(m[3]))
    m = re.match(r"(?:The picture shows \d+ \w+\. )?What is (\d+)/(\d+)(?: \([\w-]+\))? of (\d+)\?", q)
    if m: return NUMV(F(int(m[1]), int(m[2])) * int(m[3]))
    m = re.match(r"How many (minutes|hours|days|seconds|months) are there in (\d+)/(\d+)(?: \([\w-]+\))? of an? (hour|day|week|minute|year)\?", q)
    if m:
        per = {"hour": {"minutes": 60}, "day": {"hours": 24}, "week": {"days": 7}, "minute": {"seconds": 60}, "year": {"months": 12}}[m[4]].get(m[1])
        return NUMV(F(int(m[2]), int(m[3])) * per) if per else None
    m = re.match(r"Each glass holds (\d+)/(\d+) litre of buttermilk\. How many litres do (\d+) such", q)
    if m: return NUMV(F(int(m[1]), int(m[2])) * int(m[3]))
    m = re.match(r"There are (\d+) students in a class and (\d+)/(\d+) of them", q)
    if m: return NUMV(F(int(m[2]), int(m[3])) * int(m[1]))
def TXT_FRAC(v): return NUMV(fr(v))

@rule
def r_money(q, it):
    m = re.match(r"Change (%s) paise into rupees" % NUM, q)
    if m: return NUMV(n(m[1]) / 100)
    m = re.match(r"How many paise make ₹(%s)\?" % NUM, q)
    if m: return NUMV(n(m[1]) * 100)
    m = re.match(r"How many paise are there in ₹(%s) and (%s) paise\?" % (NUM, NUM), q)
    if m: return NUMV(n(m[1]) * 100 + n(m[2]))
    m = re.match(r"One [\w ]+ costs ₹(%s)\. What do (\d+) [\w ]+ cost\?" % NUM, q)
    if m: return NUMV(n(m[1]) * int(m[2]))
    m = re.match(r"(\d+) [\w ]+ cost ₹(%s) altogether\. What does one" % NUM, q)
    if m: return NUMV(n(m[2]) / int(m[1]))
    m = re.match(r"An? [\w -]+ charges ₹(%s) per km\. What is the fare for a ride of (%s) km" % (NUM, NUM), q)
    if m: return NUMV(n(m[1]) * n(m[2]))
    m = re.match(r"A shop sells [\w ]+ at ₹(%s) per (?:metre|kg|litre)\. How much do (%s) (?:metres|kg|litres) of [\w ]+ cost" % (NUM, NUM), q)
    if m: return NUMV(n(m[1]) * n(m[2]))

@rule
def r_units(q, it):
    m = re.match(r"(.+?) = how many (mm|cm|m|mg|g|kg|mL|L)\?$", q)
    if m and re.search(UN, m[1]):
        k, v = qty(m[1]); return NUMV(v / UNIT[m[2]][1])
    m = re.match(r"Write (%s) (mm|cm|m|mg|g|kg|mL|L) in (millimetres|metres|centimetres|kilometres|grams|kilograms|litres|millilitres) \(as a decimal\)" % NUM, q)
    if m:
        tgt = {"metres": "m", "centimetres": "cm", "kilometres": "km", "grams": "g", "kilograms": "kg", "litres": "L", "millilitres": "mL", "millimetres": "mm"}[m[3]]
        return NUMV(n(m[1]) * UNIT[m[2]][1] / UNIT[tgt][1])
    m = re.match(r"(%s) (cm|g|mL|m|mg) = how many (m|kg|L|km|g) and (cm|g|mL|mg)\?.*Write the answer as" % NUM, q)
    if m:
        t = n(m[1]) * UNIT[m[2]][1]; big = UNIT[m[3]][1]; return LIST([t // big, (t % big) / UNIT[m[4]][1]])
    m = re.match(r"(Add|Subtract): (.+?) ([+\-]) (.+?)\. Write the answer as \((\w+), (\w+)\)", q)
    if m:
        k1, a = qty(m[2]); k2, b = qty(m[4]); t = a + b if m[3] == "+" else a - b
        big = UNIT[m[5]][1]; return LIST([t // big, (t % big) / UNIT[m[6]][1]])
    m = re.match(r"Work out (\d+) × (.+?)\. Write the answer as \((\w+), (\w+)\)", q)
    if m:
        k, a = qty(m[2]); t = a * int(m[1]); big = UNIT[m[3]][1]; return LIST([t // big, (t % big) / UNIT[m[4]][1]])
    m = re.match(r"Divide (.+?) into (\d+) equal parts\. How much is each part\? Write the answer as \((\w+), (\w+)\)", q)
    if m:
        k, a = qty(m[1]); t = a / int(m[2]); big = UNIT[m[3]][1]
        return LIST([t // big, (t % big) / UNIT[m[4]][1]])
    m = re.match(r"How many (?:packets|bottles|boxes|cups|jars)? ?(?:of )?(?:[\w ]+? of )?(%s) (g|mL|mg|cm|m) together make (%s) (kg|L|g|m|km)\?" % (NUM, NUM), q)
    if m: return NUMV(n(m[3]) * UNIT[m[4]][1] / (n(m[1]) * UNIT[m[2]][1]))

@rule
def r_time(q, it):
    t = lambda s: (int(s.split(":")[0]), int(s.split(":")[1]))
    m = re.match(r"How much time passes from (\d\d:\d\d) to (\d\d:\d\d) on the same day\?", q)
    if m:
        a, b = t(m[1]), t(m[2]); d = (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]); return LIST([d // 60, d % 60])
    m = re.match(r"A function .*? starts at (\d+:\d+) p\.m\. and ends at (\d+:\d+) p\.m\. How long", q) or re.match(r"[^.]*starts at (\d+:\d+) p\.m\. and ends at (\d+:\d+) p\.m\. How long", q)
    if m:
        a, b = t(m[1]), t(m[2]); d = (b[0] % 12 * 60 + b[1]) - (a[0] % 12 * 60 + a[1]); return LIST([d // 60, d % 60])
    m = re.match(r"[^.]*starts at (\d+):(\d+) p\.m\. and lasts (\d+) hours? (\d+) minutes?\. At what time does it end", q)
    if m:
        tot = int(m[1]) % 12 * 60 + int(m[2]) + int(m[3]) * 60 + int(m[4]); h = tot // 60 % 12 or 12
        return LIST([h, tot % 60])
    m = re.match(r"[^.]*leaves [\w ]+ at (\d\d):(\d\d) and the journey takes (\d+) hours? (\d+) minutes?\. At what time", q)
    if m:
        tot = int(m[1]) * 60 + int(m[2]) + int(m[3]) * 60 + int(m[4]); tot %= 1440; return LIST([tot // 60, tot % 60])
    m = re.match(r"Write (\d+):(\d+) (a\.m\.|p\.m\.) in 24-hour time", q)
    if m:
        h = int(m[1]) % 12 + (12 if m[3] == "p.m." else 0); return LIST([h, int(m[2])])
    m = re.match(r"A railway clock shows (\d\d):(\d\d) \(24-hour time\)\. How is this time written on a 12-hour", q)
    if m:
        h, mi = int(m[1]), int(m[2]); return OPT(f"{h % 12 or 12}:{mi:02d} {'a.m.' if h < 12 else 'p.m.'}")
    m = re.match(r"On a clock face, a hand points at (\d+)\. It turns clockwise until it points at (\d+)\.", q)
    if m: return NUMV(((int(m[2]) - int(m[1])) % 12) * 30)
    m = re.match(r"The hour hand of a clock points to (\d+)\. Where will it point (\d+) hours later\?", q)
    if m: return NUMV((int(m[1]) + int(m[2]) - 1) % 12 + 1)

@rule
def r_place(q, it):
    m = re.match(r"What is the place value of the digit (\d) in (%s)\?" % NUM, q)
    if m:
        s = m[2].replace(",", ""); d = m[1]
        whole, _, frac = s.partition("."); pos = [len(whole) - 1 - i for i, c in enumerate(whole) if c == d] + [-(i + 1) for i, c in enumerate(frac) if c == d]
        if len(pos) != 1: return None
        return ("optnum", F(int(d)) * F(10) ** pos[0])
    m = re.match(r"Which is the expanded form of (%s)\?" % NUM, q)
    if m and it["options"] and "+" in it["options"][0]:
        s = m[1].replace(",", ""); whole, _, frac = s.partition(".")
        terms = [F(int(c)) * F(10) ** (len(whole) - 1 - i) for i, c in enumerate(whole) if c != "0"] + [F(int(c)) * F(10) ** -(i + 1) for i, c in enumerate(frac) if c != "0"]
        good = []
        for o in it["options"]:
            try: ts = [n(x.strip()) for x in o.split("+")]
            except Exception: return None
            if sorted(ts) == sorted(terms): good.append(o)
        if len(good) != 1: return None
        return OPT(good[0])
    m = re.match(r"Which number has (\d+) tens, (\d+) ones, (\d+) tenths, (\d+) hundredths and (\d+) thousandths\?", q)
    if m:
        v = int(m[1]) * 10 + int(m[2]) + F(int(m[3]), 10) + F(int(m[4]), 100) + F(int(m[5]), 1000); return ("optnum", v)

WORDS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split())}
WORDS.update({w: 10 * i for i, w in enumerate("x x twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "x"})
def words_to_int(s):
    tot = cur = 0
    for w in re.split(r"[\s-]+", s.strip().lower()):
        if w in WORDS: cur += WORDS[w]
        elif w == "hundred": cur *= 100
        elif w == "thousand": tot += cur * 1000; cur = 0
        elif w == "lakh": tot += cur * 100000; cur = 0
        elif w == "crore": tot += cur * 10**7; cur = 0
        elif w == "and": pass
        else: raise ValueError(w)
    return tot + cur
@rule
def r_words(q, it):
    m = re.match(r"Write in figures: (.+?)\. \(Write the number", q)
    if m: return NUMV(words_to_int(m[1]))

@rule
def r_misc(q, it):
    m = re.match(r"A number pattern starts at (\d+)\. The rule is: add (\d+) each time\..*What is the (\d+)(?:st|nd|rd|th) number", q)
    if m: return NUMV(int(m[1]) + int(m[2]) * (int(m[3]) - 1))
    m = re.match(r"What is the sum of the (\d+) consecutive numbers starting at (\d+)", q)
    if m: return NUMV(sum(range(int(m[2]), int(m[2]) + int(m[1]))))
    m = re.match(r"(Three|Five|Four|Two|Six|Seven) consecutive numbers add up to (\d+)\. What is the smallest", q)
    if m:
        k = WORDS[m[1].lower()]; s = int(m[2]); lo = F(s - k * (k - 1) // 2, k); return NUMV(lo)
    m = re.match(r"Take (\d+), reverse its digits to get (\d+), and add the two numbers", q)
    if m: return NUMV(int(m[1]) + int(str(int(m[1]))[::-1]))
    m = re.match(r"Start with (\d+)\. Reverse its digits and add\. Keep doing this .* How many reverse-and-add steps", q)
    if m:
        v, k = int(m[1]), 0
        while str(v) != str(v)[::-1]: v += int(str(v)[::-1]); k += 1
        return NUMV(k)
    m = re.match(r"A tap drips (\d+) mL of water every minute\. How many millilitres of water drip out in (\d+) hours?\?", q)
    if m: return NUMV(int(m[1]) * 60 * int(m[2]))
    m = re.match(r"A taxi travels at (\d+) km per hour for (\d+) hours?\. The fare is ₹(\d+) for every kilometre", q)
    if m: return NUMV(int(m[1]) * int(m[2]) * int(m[3]))
    m = re.match(r"A car travels at (\d+) km/h\. What is this speed in metres per second", q)
    if m: return NUMV(F(int(m[1]) * 1000, 3600))
    m = re.match(r"A [\w ]+ (?:runs|goes|moves|flies|travels) at (\d+) m/s\. What is this speed in kilometres per hour", q)
    if m: return NUMV(F(int(m[1]) * 3600, 1000))
    m = re.match(r"A rectangular [\w ]+ is (\d+) m long and (\d+) m wide\. Fencing costs ₹(\d+) per metre", q)
    if m: return NUMV(2 * (int(m[1]) + int(m[2])) * int(m[3]))
    m = re.match(r"A rectangle is (\d+) cm by (\d+) cm\. What is its area", q)
    if m: return NUMV(int(m[1]) * int(m[2]))
    m = re.match(r"A rectangle is (\d+) cm long and (\d+) cm wide\. What is its perimeter", q)
    if m: return NUMV(2 * (int(m[1]) + int(m[2])))
    m = re.match(r"A box is built from (\d+) cm cubes: (\d+) long, (\d+) wide and (\d+) high\. How many cubes", q)
    if m: return NUMV(int(m[2]) * int(m[3]) * int(m[4]))
    m = re.match(r"Use long division to work out (%s) ÷ (%s)\. What is the (quotient|remainder)\?" % (NUM, NUM), q)
    if m:
        a, b = int(n(m[1])), int(n(m[2])); return NUMV(a // b if m[3] == "quotient" else a % b)
    m = re.match(r"A division has divisor (\d+), quotient (\d+) and remainder (\d+)\. .*What is the dividend", q)
    if m: return NUMV(int(m[1]) * int(m[2]) + int(m[3]))
    m = re.match(r"(\d+) ÷ (\d+) = (\d+) remainder □", q)
    if m: return NUMV(int(m[1]) - int(m[2]) * int(m[3]))
    m = re.match(r"Start at (\d+) and take away (\d+) again and again, as long as you can\. How many times", q)
    if m: return NUMV(int(m[1]) // int(m[2]))
    m = re.match(r"Start at (\d+) and keep taking away (\d+) until you cannot take away (\d+) any more\. What number is left", q)
    if m: return NUMV(int(m[1]) % int(m[2]))
    m = re.match(r"Work out (\d+) × (\d+) (?:using|by) .*What is (\d+) × (\d+)\?", q)
    if m: return NUMV(int(m[1]) * int(m[2]))
    m = re.match(r"In (\d+) × (\d+), \d+ is split into (\d+) \+ (\d+)\. What is the partial product (\d+) × (\d+)\?", q)
    if m: return NUMV(int(m[5]) * int(m[6]))
    m = re.match(r"Multiply (\d+) × (\d+) with partial products.*What is (\d+) × (\d+)\?", q)
    if m: return NUMV(int(m[1]) * int(m[2]))
    m = re.match(r"Work out (\d+) ÷ (\d+) in your head .* What is (\d+) ÷ (\d+)\?", q)
    if m: return NUMV(F(int(m[1]), int(m[2])))
    m = re.match(r"Use a shortcut \(take away (\d+) then add (\d+) back\): (\d+) - (\d+) = \?", q)
    if m: return NUMV(int(m[3]) - int(m[4]))
    m = re.match(r"Work it out in your head: (%s) \+ \? = (%s)\. What is the missing" % (NUM, NUM), q)
    if m: return NUMV(n(m[2]) - n(m[1]))
    m = re.match(r"The perimeter of an? (equilateral triangle|square|regular [\w]+) is (\d+) cm\. All its sides are equal\. How long is one side", q)
    if m:
        k = {"equilateral triangle": 3, "square": 4, "regular pentagon": 5, "regular hexagon": 6, "regular octagon": 8}.get(m[1]); return NUMV(F(int(m[2]), k)) if k else None
    m = re.match(r"A (\w+) travels (\d+) (km|metres) in (\d+) (hours|minutes), going the same distance every", q) or None
    if m: return NUMV(F(int(m[2]), int(m[4])))
    m = re.match(r"A \w+ walks (\d+) metres in (\d+) minutes, walking the same distance every minute", q)
    if m: return NUMV(F(int(m[1]), int(m[2])))
    m = re.match(r"(\d+) kg of [\w ]+ cost ₹(\d+)\. What is the cost of 1 kg", q)
    if m: return NUMV(F(int(m[2]), int(m[1])))
    m = re.match(r"A [\w ]+ travels (\d+) km in (\d+) hours at a steady speed\. How many km does it travel in 1 hour", q)
    if m: return NUMV(F(int(m[1]), int(m[2])))
    m = re.match(r"An? [\w -]+ charges ₹(\d+) for a ride of (\d+) km, at a fixed rate per km", q)
    if m: return NUMV(F(int(m[1]), int(m[2])))
    m = re.match(r"Pack A has (\d+) soaps for ₹(\d+)\. Pack B has (\d+) soaps for ₹(\d+)\. Find the price of one soap", q)
    if m: return NUMV(min(F(int(m[2]), int(m[1])), F(int(m[4]), int(m[3]))))
    m = re.match(r"Arun can finish a job in (\d+) days\. Bala can finish the same job in (\d+) days\. Working together", q)
    if m: return NUMV(1 / (F(1, int(m[1])) + F(1, int(m[2]))))
    m = re.match(r"Two angles are (supplementary|complementary)\. One of them is (\d+)°", q)
    if m: return NUMV((180 if m[1] == "supplementary" else 90) - int(m[2]))
    m = re.match(r"Two straight lines cross each other, making four angles\. One of the angles is (\d+)°\. What is the angle opposite it", q)
    if m: return NUMV(int(m[1]))
    m = re.match(r"An angle measures (\d+)°\. What kind of angle is it\?", q)
    if m:
        a = int(m[1]); return OPT("acute" if a < 90 else "right" if a == 90 else "obtuse" if a < 180 else "straight" if a == 180 else "reflex")
    m = re.match(r"A solid with flat faces has (\d+) (vertices|faces|edges) and (\d+) (vertices|faces|edges)\. Using Euler's rule", q)
    if m:
        d = {m[2]: int(m[1]), m[4]: int(m[3])}
        if "faces" not in d: return NUMV(2 - d["faces"] if False else d["edges"] + 2 - d["vertices"] if False else None) if False else None
        miss = ({"vertices", "faces", "edges"} - set(d)).pop()
        if miss == "faces": return NUMV(2 - d["vertices"] + d["edges"])
        if miss == "vertices": return NUMV(2 - d["faces"] + d["edges"])
        return NUMV(d["faces"] + d["vertices"] - 2)
    m = re.match(r"The point P is at \((-?\d+), (-?\d+)\)\. Slide it (\d+) units? to the (left|right) and (\d+) units? (up|down)", q)
    if m:
        x, y = int(m[1]), int(m[2]); dx = int(m[3]) * (1 if m[4] == "right" else -1); dy = int(m[5]) * (1 if m[6] == "up" else -1)
        return LIST([x + dx, y + dy])
    m = re.match(r"Anu starts at the point A, which is at \((-?\d+), (-?\d+)\) on the grid\. She moves (\d+) squares? to the (left|right), then (\d+) squares? (up|down)", q)
    if m:
        x, y = int(m[1]), int(m[2]); return LIST([x + int(m[3]) * (1 if m[4] == "right" else -1), y + int(m[5]) * (1 if m[6] == "up" else -1)])
    m = re.match(r"In the picture, the point P is at \((-?\d+), (-?\d+)\) and the mirror line is (x|y) = (-?\d+)\. Reflect P", q)
    if m:
        x, y, c = int(m[1]), int(m[2]), int(m[4]); return LIST([2 * c - x, y] if m[3] == "x" else [x, 2 * c - y])
    m = re.match(r"Estimate: ", q)
    m = re.match(r"Anu estimated that .* weighs about (\d+) kg\. On the weighing scale it showed (\d+) kg\. By how many", q) or re.match(r"[\w]+ estimated that .* weighs about (\d+) kg\. On the weighing scale it showed (\d+) kg\. By how many", q)
    if m: return NUMV(abs(int(m[1]) - int(m[2])))
    m = re.match(r"A school has ₹(%s) to spend\. It buys (\d+) computers at ₹(%s) each" % (NUM, NUM), q)
    if m: return NUMV(n(m[1]) - int(m[2]) * n(m[3]))
    m = re.match(r"A town had (%s) people\. In one year (%s) babies were born and (%s) people moved away" % (NUM, NUM, NUM), q)
    if m: return NUMV(n(m[1]) + n(m[2]) - n(m[3]))
    m = re.match(r"A truck makes (\d+) trips a week between two cities that are (\d+) km apart \(each trip one way\)\. How many kilometres does it travel in (\d+) weeks", q)
    if m: return NUMV(int(m[1]) * int(m[2]) * int(m[3]))
    m = re.match(r"On one day, (\d+) US dollar is worth ₹(%s)\. How many rupees is (%s) dollars" % (NUM, NUM), q)
    if m: return NUMV(n(m[2]) / int(m[1]) * n(m[3]))
    m = re.match(r"(\d+) (?:mile|foot) is about (%s) (?:km|cm)\. A road sign abroad shows (%s) miles\. About how many kilometres" % (NUM, NUM), q)
    if m: return NUMV(n(m[2]) / int(m[1]) * n(m[3]))
    m = re.match(r"(\d+) foot is about (%s) cm\. About how many centimetres is (%s) feet" % (NUM, NUM), q)
    if m: return NUMV(n(m[2]) / int(m[1]) * n(m[3]))

def derive(it):
    q = clean(it["question"])
    for r in RULES:
        e = r(q, it)
        if e is not None: return r.__name__, e
    return None, None

def main():
    path = sys.argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    items = [json.loads(l) for l in open(path)]
    items.sort(key=lambda d: d["id"])
    rnd = random.Random(SEED)
    by = defaultdict(list)
    for d in items: by[d["family"]].append(d)
    chosen = {}
    for f in sorted(by):
        for d in rnd.sample(by[f], min(PER_FAMILY, len(by[f]))): chosen[d["id"]] = (d, "family")
    for d in rnd.sample(items, RANDOM_N):
        chosen.setdefault(d["id"], (d, "random")); 
    randset = set(d["id"] for d in rnd.sample(items, 0))
    per = defaultdict(lambda: Counter()); dis = []; rules = Counter(); errs = []
    for iid, (d, src) in sorted(chosen.items()):
        f = d["family"]; per[f]["sampled"] += 1
        try: rname, e = derive(d)
        except Exception as ex:
            per[f]["parse_error"] += 1; errs.append((f, d["question"][:80], repr(ex)[:80])); continue
        if e is None: per[f]["not_rederivable_from_text"] += 1; continue
        try: ok = compare(e, d)
        except Exception as ex:
            per[f]["parse_error"] += 1; errs.append((f, d["question"][:80], repr(ex)[:80])); continue
        per[f]["rederived"] += 1; rules[rname] += 1
        if not ok:
            per[f]["disagree"] += 1
            dis.append({"family": f, "id": d["id"], "prompt": d["question"], "options": d["options"], "stated": d["answer"], "recomputed": str(e[1:]), "rule": rname})
    tot = Counter()
    for c in per.values(): tot.update(c)
    out = {"seed": SEED, "sympy": sp.__version__, "bankItems": len(items),
           "summary": {"sampled": tot["sampled"], "rederived": tot["rederived"], "disagree": tot["disagree"], "not_rederivable_from_text": tot["not_rederivable_from_text"], "parse_error": tot["parse_error"],
                       "randomSample": RANDOM_N, "perFamilySample": PER_FAMILY,
                       "familiesWithZeroRederivable": sorted(f for f in by if per[f]["rederived"] == 0),
                       "familiesWithFewerThan20Rederived": sorted(f for f in by if 0 < per[f]["rederived"] < 20)},
           "byRule": dict(rules), "perFamily": {f: dict(per[f]) for f in sorted(by)}, "disagreements": dis[:200], "parseErrors": errs[:50]}
    os.makedirs(os.path.join(here, "results"), exist_ok=True)
    json.dump(out, open(os.path.join(here, "results/answer-recheck.json"), "w"), indent=1, ensure_ascii=False)
    print(json.dumps(out["summary"], ensure_ascii=False)[:1500]); print("disagreements", len(dis))
if __name__ == "__main__": main()
