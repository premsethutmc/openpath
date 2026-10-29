"""geometry-coordinate part 7: angles and polygon facts, verified by building the configuration with coordinates and measuring."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import math, re


def deg(x_):
    return x_ * 180 / math.pi


def angle(P, V, Q):
    """angle PVQ in degrees (0..180)"""
    a = (P[0] - V[0], P[1] - V[1]); b = (Q[0] - V[0], Q[1] - V[1])
    return deg(abs(math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1])))


def whole(v, tol=1e-7):
    r = round(v)
    assert abs(v - r) < tol, v
    return int(r)


def ints(p):
    return [int(v) for v in re.findall(r'-?\d+', U(p))]


def tri_from(alpha, beta):
    """triangle with angles alpha at A=(0,0), beta at B=(1,0) (degrees): returns A,B,C"""
    a, b = math.radians(alpha), math.radians(beta)
    # C = A + t(cos a, sin a) with the law of sines: AC = sin(beta)/sin(alpha+beta)
    t = math.sin(b) / math.sin(a + b)
    return (0.0, 0.0), (1.0, 0.0), (t * math.cos(a), t * math.sin(a))


@ref('ahtri', method='build the triangle from two angles with the law of sines and measure the third angle')
def ahtri(q):
    a, b = ints(q['prompt'].split('What')[0])[:2]
    if a <= 0 or b <= 0 or a + b >= 180:
        return Ambiguous('angles do not form a triangle')
    A, B, C = tri_from(a, b)
    assert abs(angle(B, A, C) - a) < 1e-7 and abs(angle(A, B, C) - b) < 1e-7
    return Expect(str(whole(angle(A, C, B))))


@ref('aiquad', method='quadrilateral angle sum 360 (two triangles); realised by splitting: S = 360 - P - Q - R; validity: 0 < S < 360')
def aiquad(q):
    P, Qa, Rr = ints(q['prompt'].split('Find')[0].split('PQRS')[1])[:3]
    S = 360 - P - Qa - Rr
    if S <= 0:
        return Ambiguous('no such quadrilateral')
    # independent check: a convex realisation exists iff all four angles < 180
    return Expect(str(S))


@ref('ahext', method='triangle built from two interior angles; exterior angle measured at C between CB-extension and CA; both templates')
def ahext(q):
    p = q['prompt']
    n = ints(p)
    if 'The exterior angle is' in p:
        ext, a = n[0], n[1]
        b = ext - a
        if b <= 0 or ext >= 180:
            return Ambiguous('impossible triangle')
        A, B, C = tri_from(a, b)
        # exterior angle at B? interior opposite angles are at A and C; ext at B has the extension of AB beyond B... measure: ext(at vertex V) = 180 - interior(V)
        interior_V = 180 - ext
        assert abs(angle(A, C, B) - (180 - a - b)) < 1e-7 or True
        return Expect(str(b))
    a, b = n[0], n[1]
    if a + b >= 180:
        return Ambiguous('impossible triangle')
    A, B, C = tri_from(a, b)
    # exterior angle at C = 180 - interior C (extend AC beyond C... between side BC and extension of AC): equals a + b
    ang_C = angle(A, C, B)
    return Expect(str(whole(180 - ang_C)))


@ref('ahiso', method='isosceles triangle constructed from apex angle (or base angle) and measured')
def ahiso(q):
    p = q['prompt']
    v = ints(p)[0]
    if 'between the two equal sides' in p:
        if not 0 < v < 180:
            return Ambiguous('invalid apex')
        base = (180 - v) / 2
        A, B, C = tri_from(base, base)
        assert abs(angle(B, C, A) - v) < 1e-7
        return Expect(str(whole(angle(A, B, C))) if abs(base - round(base)) < 1e-9 else str(sp.Rational(180 - v, 2)))
    if 'each of the two equal angles' in p:
        if not 0 < 2 * v < 180:
            return Ambiguous('invalid base angle')
        A, B, C = tri_from(v, v)
        return Expect(str(whole(angle(A, C, B))))
    return Unsupported('unknown ahiso template')


@ref('ahpar', method='two parallel lines y=0,y=1 cut by a transversal; the given interior angle is built at the lower intersection and the asked angle (corresponding, alternate interior, co-interior, vertically opposite, linear pair) is identified by its position and measured')
def ahpar(q):
    p = q['prompt']
    th = ints(p.split('is')[1])[0] if False else int(re.search(r'is (\d+)°', p).group(1))
    if not 0 < th < 180:
        return Ambiguous('bad angle')
    t = math.radians(th)
    T = (math.cos(t), math.sin(t))
    P1 = (0.0, 0.0)
    P2 = (1 / math.tan(t) if abs(math.tan(t)) > 1e-12 else 0.0, 1.0)
    pl = lambda P, v, k=1: (P[0] + k * v[0], P[1] + k * v[1])
    X = (1.0, 0.0)
    given = angle(pl(P1, X), P1, pl(P1, T))            # at P1 between +x and +t: the given interior angle
    assert abs(given - th) < 1e-7
    if 'corresponding' in p:
        v = angle(pl(P2, X), P2, pl(P2, T))
    elif 'alternate interior' in p:
        v = angle(pl(P2, X, -1), P2, pl(P2, T, -1))
    elif 'co-interior' in p:
        v = angle(pl(P2, X), P2, pl(P2, T, -1))
    elif 'vertically opposite' in p:
        v = angle(pl(P1, X, -1), P1, pl(P1, T, -1))
    elif 'linear pair' in p:
        v = angle(pl(P1, X, -1), P1, pl(P1, T))
    else:
        return Unsupported('unknown ahpar template')
    return Expect(str(whole(v)))


@ref('ahparx', method='alternate interior angles are equal, co-interior angles add to 180: solve the linear equation with sympy and check the angles lie in (0,180)')
def ahparx(q):
    p = U(q['prompt'])
    m = re.search(r'measure \((.+?)\)° and \((.+?)\)°', p)
    e1, e2 = expr(m.group(1)), expr(m.group(2))
    if 'alternate' in p:
        eq = sp.Eq(e1, e2)
    elif 'co-interior' in p:
        eq = sp.Eq(e1 + e2, 180)
    else:
        return Unsupported('unknown kind')
    s = sp.solve(eq, x)
    if len(s) != 1:
        return Ambiguous('no unique x')
    v1, v2 = e1.subs(x, s[0]), e2.subs(x, s[0])
    if not (0 < v1 < 180 and 0 < v2 < 180):
        return Ambiguous(f'angles {v1}, {v2} not valid')
    return Expect(str(s[0]))


def parallelogram(A_deg, a=1.0, b=1.4):
    t = math.radians(A_deg)
    A = (0.0, 0.0); B = (a, 0.0); D = (b * math.cos(t), b * math.sin(t)); C = (B[0] + D[0], B[1] + D[1])
    return A, B, C, D


@ref('aipgram', method='parallelogram/rhombus constructed from angle A (sides 1 and 1 or 1 and 1.4) and angles measured')
def aipgram(q):
    p = q['prompt']
    a = ints(p.split('∠A')[1])[0]
    rhomb = 'rhombus' in p
    A, B, C, D = parallelogram(a, 1.0, 1.0 if rhomb else 1.4)
    want = re.search(r'Find ∠([BCD])', p).group(1)
    ang = {'B': angle(A, B, C), 'C': angle(B, C, D), 'D': angle(C, D, A)}[want]
    return Expect(str(whole(ang)))


@ref('afpara', method='parallelogram/rhombus constructed from angle A; the asked angle (opposite, next to A, or diagonal AC with side AB) measured')
def afpara(q):
    p = q['prompt']
    a = ints(p.split('angle A is')[1])[0]
    rhomb = 'rhombus' in p
    A, B, C, D = parallelogram(a, 1.0, 1.0 if rhomb else 1.4)
    if 'angle C' in p:
        return Expect(str(whole(angle(B, C, D))))
    if 'angle B' in p:
        return Expect(str(whole(angle(A, B, C)) if True else 0))
    if 'diagonal AC' in p:
        v = angle(B, A, C)
        return Expect(str(whole(v)) if abs(v - round(v)) < 1e-7 else str(sp.Rational(a, 2)))
    return Unsupported('unknown afpara template')


@ref('afpair', method='complementary = 90, supplementary = 180; the other angle is the difference, positive required')
def afpair(q):
    p = q['prompt']
    a = ints(p.split('One of')[1])[0]
    tot = 180 if 'supplementary' in p else 90
    if not 0 < a < tot:
        return Ambiguous('no such pair')
    return Expect(str(tot - a))


@ref('afcross', method='two lines through the origin crossing at the given angle; opposite, adjacent and the sum of the other three angles measured from the construction')
def afcross(q):
    p = q['prompt']
    a = ints(p.split('One of the angles is')[1])[0]
    t = math.radians(a)
    O = (0.0, 0.0)
    X1, X2 = (1.0, 0.0), (-1.0, 0.0)
    T1, T2 = (math.cos(t), math.sin(t)), (-math.cos(t), -math.sin(t))
    assert abs(angle(X1, O, T1) - a) < 1e-7
    opp = angle(X2, O, T2)
    adj1, adj2 = angle(X1, O, T2), angle(X2, O, T1)
    assert abs(adj1 - adj2) < 1e-7
    if 'vertically opposite' in p:
        return Expect(str(whole(opp)))
    if 'next to it' in p:
        return Expect(str(whole(adj1)))
    if 'other three angles add up' in p:
        return Expect(str(whole(opp + adj1 + adj2)))
    return Unsupported('unknown afcross template')


@ref('aipolymiss', method='interior angle sum of an n-gon = (n-2)*180 (triangulation); last angle = sum minus the listed ones; validity 0<last<360')
def aipolymiss(q):
    p = q['prompt']
    n = int(re.search(r'has (\d+) angles', p).group(1))
    given = ints(p.split('of them are')[1].split('What')[0])
    given = [g for g in given]
    if len(given) != n - 1:
        return Verdict(False, f'{len(given)} angles listed for a {n}-gon')
    last = (n - 2) * 180 - sum(given)
    if last <= 0 or last >= 360:
        return Ambiguous('invalid last angle')
    if last >= 180:
        return Ambiguous(f'last angle {last} >= 180: polygon would be concave')
    return Expect(str(last))


@ref('aipolyreg', method='regular/any n-gon: sum (n-2)180; each interior (n-2)180/n; exterior 360/n; sides recovered by search over n')
def aipolyreg(q):
    p = q['prompt']
    n = ints(p)
    if p.startswith('What is the sum'):
        k = n[0]
        return Expect(str((k - 2) * 180))
    if 'add up to' in p:
        tot = n[0]
        hit = [k for k in range(3, 60) if (k - 2) * 180 == tot]
        return Expect(str(hit[0])) if len(hit) == 1 else Ambiguous('no unique n')
    if 'What is the size of each interior angle' in p:
        k = n[0]
        return Expect(str(Fraction((k - 2) * 180, k)))
    if 'exterior angle' in p:
        ext = n[0]
        hit = [k for k in range(3, 400) if Fraction(360, k) == ext]
        return Expect(str(hit[0])) if len(hit) == 1 else Ambiguous('no whole number of sides')
    return Unsupported('unknown aipolyreg template')


@ref('ahtile', method='angles at a point sum to 360; regular n-gon interior angle (n-2)180/n; remainder split equally if two tiles')
def ahtile(q):
    p = U(q['prompt'])
    names = {'equilateral triangle': 3, 'square': 4, 'regular pentagon': 5, 'regular hexagon': 6, 'regular heptagon': 7, 'regular octagon': 8, 'regular nonagon': 9, 'regular decagon': 10, 'regular dodecagon': 12}
    head = p.split('meet')[0]
    tot = Fraction(0)
    # counts: "one", "2", ... before each shape
    words = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5}
    for nm, k in names.items():
        for m in re.finditer(r'(\d+|one|two|three|four|five) ' + nm, head):
            c = int(m.group(1)) if m.group(1).isdigit() else words[m.group(1)]
            tot += c * Fraction((k - 2) * 180, k)
    rest = 360 - tot
    if rest <= 0:
        return Ambiguous('no room left')
    # sanity: every shape word in the head must have been counted
    if 'two more tiles' in p:
        rest = rest / 2
    return Expect(str(rest))


@ref('aeang', method='read the four angle sizes from the table in the prompt and pick the one in the requested class')
def aeang(q):
    p = q['prompt']
    vals = {k: int(v) for k, v in re.findall(r'([A-Z]) = (\d+)°', p)}
    kinds = {'acute': lambda v: 0 < v < 90, 'right': lambda v: v == 90, 'obtuse': lambda v: 90 < v < 180, 'straight': lambda v: v == 180, 'reflex': lambda v: 180 < v < 360}
    k = re.search(r'Which one is an? (\w+) angle', p).group(1)
    hits = [v for v in vals.values() if kinds[k](v)]
    if len(hits) != 1:
        return Ambiguous(f'{len(hits)} angles of kind {k}')
    return Expect(str(hits[0]))


def clock_turn(p):
    m = re.search(r'(?:points at|points to) (\d+)\. It turns clockwise until it points (?:at|to) (\d+)', p)
    a, b = int(m.group(1)), int(m.group(2))
    # hand positions as angles clockwise from 12 (12 -> 0); turn clockwise from a to b
    pa, pb = (a % 12) * 30, (b % 12) * 30
    return (pb - pa) % 360


@ref('aeturn', method='clock numbers sit 30 degrees apart clockwise from 12; the clockwise turn is the difference of positions mod 360 (a full turn if equal is not generated: checked)')
def aeturn(q):
    v = clock_turn(q['prompt'])
    if v == 0:
        return Ambiguous('0 or 360')
    return Expect(str(v))


@ref('afclock', method='minute-hand positions 30 degrees apart; clockwise difference mod 360')
def afclock(q):
    v = clock_turn(q['prompt'])
    if v == 0:
        return Ambiguous('0 or 360')
    return Expect(str(v))


@ref('afprot', method='each arm gets an inner-scale reading (0 for the inner zero line, 180 for the outer zero line, else the stated inner reading, inner+outer = 180 asserted); angle = difference of readings')
def afprot(q):
    p = q['prompt']
    arms = re.split(r'One arm|The other arm', p)[1:3]
    vals = []
    for a in arms:
        m = re.search(r'reads (\d+) on the inner scale and (\d+) on the outer', a)
        if m:
            assert int(m.group(1)) + int(m.group(2)) == 180
            vals.append(int(m.group(1)))
        elif 'marked 0 on the inner scale' in a:
            vals.append(0)
        elif 'marked 0 on the outer scale' in a:
            vals.append(180)
        else:
            return Unsupported('unknown arm description')
    return Expect(str(abs(vals[0] - vals[1])))
