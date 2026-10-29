"""measurement slice, part 4: am* (mensuration of solids, sectors, Heron), av*, rect, rperim, vol. Derived from the statement/figure."""
import re
from fractions import Fraction

import sympy as sp

from kit import ref, Expect, Verdict, Unsupported, Ambiguous
from refs.measurement_util import nums, fmt, dec

NOOPT = 'multiple-choice letter: the option texts and their order are not in the exported data (typed form has only the letter), so the keyed letter cannot be checked'
NUMRE = r'\d+(?:\.\d+)?'


def R(s):
    return sp.Rational(str(s).replace(',', ''))


def N(p):
    return [R(x) for x in re.findall(NUMRE, p.replace(',', ''))]


def PI(p):
    m = re.search(r'π = (\d+(?:\.\d+)?)(?:/(\d+))?', p)
    return R(m.group(1)) / (int(m.group(2)) if m.group(2) else 1)


def txt(e):
    return str(e if isinstance(e, (sp.Rational, sp.Integer)) else sp.simplify(e))


def sq(x):
    """exact square root of a nonnegative Rational as a sympy expression"""
    return sp.sqrt(x)


def heron2(a, b, c):
    s = (a + b + c) / 2
    return s * (s - a) * (s - b) * (s - c)


def tri_ok(a, b, c):
    return a + b > c and a + c > b and b + c > a


def ang(a, b, c):
    return None


# ---------------------------------------------------------------- Heron / Brahmagupta
@ref('amheron', "Heron's formula; cross-checked with area^2 = (4a^2b^2 - (a^2+b^2-c^2)^2)/16 (law of cosines); triangle inequality required", 'exhaustive')
def amheron(q):
    a, b, c = N(q['prompt'])[:3]
    if not tri_ok(a, b, c):
        return Verdict(False, 'no such triangle')
    A2 = heron2(a, b, c)
    assert A2 == (4 * a * a * b * b - (a * a + b * b - c * c) ** 2) / 16
    return Expect(txt(sq(A2)))


@ref('ambrahma', "Brahmagupta; cross-checked by splitting along a diagonal: cos B = (a^2+b^2-c^2-d^2)/(2(ab+cd)), area = (ab+cd) sin B / 2", 'exhaustive')
def ambrahma(q):
    a, b, c, d = N(q['prompt'])[:4]
    if max(a, b, c, d) * 2 >= a + b + c + d:
        return Verdict(False, 'no quadrilateral with these sides')
    s = (a + b + c + d) / 2
    A2 = (s - a) * (s - b) * (s - c) * (s - d)
    cosB = (a * a + b * b - c * c - d * d) / (2 * (a * b + c * d))
    A2b = ((a * b + c * d) ** 2 * (1 - cosB ** 2)) / 4
    assert A2 == A2b, (A2, A2b)
    return Expect(txt(sq(A2)))


@ref('amherq', 'split along the diagonal and add the two Heron triangle areas (exact)', 'exhaustive')
def amherq(q):
    p = q['prompt']
    ab, bc, cd, da, ac = [R(x) for x in re.search(r'AB = (\d+(?:\.\d+)?) m, BC = (\d+(?:\.\d+)?) m, CD = (\d+(?:\.\d+)?) m and DA = (\d+(?:\.\d+)?) m\. The diagonal AC is (\d+(?:\.\d+)?) m', p).groups()]
    if not (tri_ok(ab, bc, ac) and tri_ok(cd, da, ac)):
        return Verdict(False, 'one of the two triangles does not exist')
    return Expect(txt(sq(heron2(ab, bc, ac)) + sq(heron2(cd, da, ac))))


# ---------------------------------------------------------------- clocks, sectors
@ref('amclock', 'sector swept: angle/360 x pi r^2; arc length angle/360 x 2 pi r; hands: minute 6 degrees per minute, hour 30 degrees per hour', 'exhaustive')
def amclock(q):
    p = q['prompt']
    pi = PI(p)
    r = R(re.search(r'hand of a clock is (\d+(?:\.\d+)?) cm long', p).group(1))
    n = R(re.search(r'(?:sweeps|travels) in (\d+(?:\.\d+)?) (?:minutes?|hours?)', p).group(1))
    deg = n * 6 if p.startswith('The minute hand') else n * 30
    if 'area it sweeps' in p:
        return Expect(txt(deg / 360 * pi * r * r))
    return Expect(txt(deg / 360 * 2 * pi * r))


@ref('amsecinv', 'invert the sector formulas: theta = 360 arc/(2 pi r) or 360 A/(pi r^2); r = sqrt(360 A/(pi theta))', 'exhaustive')
def amsecinv(q):
    p = q['prompt']
    pi = PI(p)
    if p.startswith('An arc of a circle of radius'):
        r, arc = N(p)[:2]
        th = 360 * arc / (2 * pi * r)
        if not (0 < th < 360):
            return Verdict(False, f'impossible arc: angle {th}')
        return Expect(txt(th))
    if p.startswith('A sector of a circle of radius'):
        r, A = N(p)[:2]
        th = 360 * A / (pi * r * r)
        if not (0 < th < 360):
            return Verdict(False, f'impossible sector: angle {th}')
        return Expect(txt(th))
    if p.startswith('A sector with an angle'):
        th, A = N(p)[:2]
        r2 = 360 * A / (pi * th)
        return Expect(txt(sq(r2)))
    raise ValueError(p)


@ref('amseg', 'segment = sector - triangle (1/2 r^2 sin theta using the stated sqrt3 / sin 90 = 1); major = circle - minor', 'exhaustive')
def amseg(q):
    p = q['prompt']
    pi = PI(p)
    r = R(re.search(r'radius (?:of )?(\d+(?:\.\d+)?) cm', p).group(1))
    th = int(re.search(r'angle of (\d+)°', p).group(1))
    if th == 90:
        sin = sp.Integer(1)
    elif th in (60, 120):
        m = re.search(r'√3 = (\d+(?:\.\d+)?)', p)
        sin = R(m.group(1)) / 2
    else:
        return Unsupported(f'angle {th}')
    minor = sp.Rational(th, 360) * pi * r * r - r * r * sin / 2
    if 'minor segment' in p:
        return Expect(txt(minor))
    return Expect(txt(pi * r * r - minor))


# ---------------------------------------------------------------- cones, spheres, frustum
def cone_slant(r, h):
    return sq(r * r + h * h)


@ref('amcone', 'slant l = sqrt(r^2 + h^2); CSA = pi r l; TSA = pi r (l + r) (exact)', 'exhaustive')
def amcone(q):
    p = q['prompt']
    r, h = N(p)[:2]
    l = cone_slant(r, h)
    if 'slant height, in cm' in p:
        return Expect(txt(l))
    pi = PI(p)
    if 'curved surface area' in p:
        return Expect(txt(pi * r * l))
    if 'total surface area' in p:
        return Expect(txt(pi * r * (l + r)))
    raise ValueError(p)


@ref('amconev', 'volume = pi r^2 h / 3, with h = sqrt(l^2 - r^2) when the slant height is given', 'exhaustive')
def amconev(q):
    p = q['prompt']
    pi = PI(p)
    r, x = N(p)[:2]
    if 'slant height of' in p:
        if x <= r:
            return Verdict(False, 'slant height not longer than the radius')
        h = sq(x * x - r * r)
    else:
        h = x
    return Expect(txt(pi * r * r * h / 3))


@ref('amsph', 'sphere 4 pi r^2, 4/3 pi r^3; hemisphere 3 pi r^2 total and 2/3 pi r^3 (diameter halved)', 'exhaustive')
def amsph(q):
    p = q['prompt']
    pi = PI(p)
    m = re.search(r'(radius|diameter) of (\d+(?:\.\d+)?) cm', p)
    r = R(m.group(2)) / (2 if m.group(1) == 'diameter' else 1)
    if p.startswith('A sphere'):
        return Expect(txt(4 * pi * r * r if 'surface area' in p else sp.Rational(4, 3) * pi * r ** 3))
    if p.startswith('A solid hemisphere'):
        return Expect(txt(2 * pi * r * r + pi * r * r if 'total surface area' in p else sp.Rational(2, 3) * pi * r ** 3))
    raise ValueError(p)


@ref('amshell', 'metal in a hollow ball 4/3 (R^3 - r^3) (x pi), bowl 2/3 (R^3 - r^3); bowl surface = 2 pi r^2 + 2 pi R^2 + pi (R^2 - r^2)', 'exhaustive')
def amshell(q):
    p = q['prompt']
    r, Rr = N(p)[:2]
    if Rr <= r:
        return Verdict(False, 'outer radius is not larger')
    if p.startswith('A hollow metal ball'):
        return Expect(txt(sp.Rational(4, 3) * (Rr ** 3 - r ** 3)))
    if p.startswith('A hemispherical metal bowl'):
        return Expect(txt(sp.Rational(2, 3) * (Rr ** 3 - r ** 3)))
    if p.startswith('A hemispherical bowl') and 'total surface area' in p:
        return Expect(txt(2 * r * r + 2 * Rr * Rr + (Rr * Rr - r * r)))
    raise ValueError(p)


@ref('amfrust', 'frustum: V = pi h (R^2 + R r + r^2)/3; l = sqrt(h^2 + (R - r)^2); CSA = pi (R + r) l; TSA adds both ends', 'exhaustive')
def amfrust(q):
    p = q['prompt']
    pi = PI(p)
    R1, r1, h = N(p)[:3]
    l = sq(h * h + (R1 - r1) ** 2)
    if 'volume' in p:
        return Expect(txt(pi * h * (R1 * R1 + R1 * r1 + r1 * r1) / 3))
    csa = pi * (R1 + r1) * l
    if 'curved surface area' in p:
        return Expect(txt(csa))
    if 'total surface area' in p:
        return Expect(txt(csa + pi * R1 * R1 + pi * r1 * r1))
    raise ValueError(p)


@ref('ampyrs', 'square pyramid: l = sqrt(h^2 + (a/2)^2) when height given; lateral = 4 x (1/2) a l; total adds a^2', 'exhaustive')
def ampyrs(q):
    p = q['prompt']
    a, x = N(p)[:2]
    f = q['figure']['dims']
    fa = [R(v) for v in re.findall(NUMRE, ' '.join(f))]
    if fa != [a, x]:
        return Verdict(False, 'figure dims differ from the statement')
    if 'slant height' in p and x <= a / 2:
        return Verdict(False, 'slant height not longer than half the base side')
    l = x if 'slant height' in p else sq(x * x + (a / 2) ** 2)
    lat = 4 * a * l / 2
    return Expect(txt(lat if 'lateral' in p else lat + a * a))


@ref('ampyrv', 'volume = 1/3 base area x height; bases: square, rectangle, right triangle', 'exhaustive')
def ampyrv(q):
    p = q['prompt']
    n = N(p)
    if 'square base of side' in p:
        a, h = n[:2]
        base = a * a
    elif 'rectangular base' in p:
        a, b, h = n[:3]
        base = a * b
    elif 'right-angled triangle' in p:
        a, b, h = n[:3]
        base = a * b / 2
    else:
        raise ValueError(p)
    return Expect(txt(base * h / 3))


POLY = {'triangle': 3, 'pentagon': 5, 'hexagon': 6, 'octagon': 8}


@ref('ampyrp', 'faces by hand: rectangular base two pairs of triangles; regular n-gon base n triangles + base area n a^2 cot(pi/n)/4 (sympy exact cot)', 'exhaustive')
def ampyrp(q):
    p = q['prompt']
    if 'rectangular base' in p:
        m = re.search(r'base (\d+(?:\.\d+)?) cm by (\d+(?:\.\d+)?) cm\. The slant height of each triangular face on a (\d+(?:\.\d+)?) cm edge is (\d+(?:\.\d+)?) cm, and of each face on a (\d+(?:\.\d+)?) cm edge is (\d+(?:\.\d+)?) cm', p)
        a, b, ea, sa, eb, sb = [R(x) for x in m.groups()]
        if (ea, eb) != (a, b):
            return Verdict(False, 'edges named in the slant heights are not the base edges')
        # a right pyramid: height^2 = sa^2 - (b/2)^2 (face on an a-edge) = sb^2 - (a/2)^2 (face on a b-edge)
        h2a, h2b = sa * sa - (b / 2) ** 2, sb * sb - (a / 2) ** 2
        if h2a != h2b or h2a <= 0:
            return Verdict(False, f'slant heights are inconsistent with one apex: h^2 = {h2a} from one pair, {h2b} from the other')
        return Expect(txt(2 * (a * sa / 2) + 2 * (b * sb / 2) + a * b))
    m = re.search(r'regular (\w+)(?: \(equilateral\))? as its base, with edges of (\d+(?:\.\d+)?) cm, and the slant height of each sloping face is (\d+(?:\.\d+)?) cm', p)
    n = POLY[m.group(1)]
    a, s = R(m.group(2)), R(m.group(3))
    if s <= a * sp.cot(sp.pi / n) / 2:
        return Verdict(False, 'slant height is not longer than the base apothem: no such pyramid')
    lat = n * a * s / 2
    if 'lateral surface area' in p:
        return Expect(txt(lat))
    base = n * a * a * sp.cot(sp.pi / n) / 4
    return Expect(txt(sp.expand(lat + base)))


# ---------------------------------------------------------------- composite solids
@ref('amcombs', 'surface of combined solids: add the exposed pieces (hemisphere 2 pi r^2, cone pi r l, cylinder side 2 pi r h, flat circle pi r^2)', 'exhaustive')
def amcombs(q):
    p = q['prompt']
    pi = PI(p)
    n = N(p)
    if p.startswith('A solid toy is a cone of height'):
        h, r = n[:2]
        return Expect(txt(2 * pi * r * r + pi * r * cone_slant(r, h)))
    if p.startswith('A solid is a cylinder of radius') and 'cone of the same radius' in p:
        r, hc, h = n[:3]
        return Expect(txt(pi * r * r + 2 * pi * r * hc + pi * r * cone_slant(r, h)))
    if p.startswith('A solid capsule'):
        r, L = n[:2]
        return Expect(txt(2 * pi * r * L + 2 * (2 * pi * r * r)))
    if p.startswith('A solid is a cylinder of radius') and 'hemisphere' in p:
        r, h = n[:2]
        return Expect(txt(pi * r * r + 2 * pi * r * h + 2 * pi * r * r))
    raise ValueError(p)


@ref('amcombv', 'volumes of the parts added: cone 1/3 pi r^2 h, hemisphere 2/3 pi r^3, cylinder pi r^2 h', 'exhaustive')
def amcombv(q):
    p = q['prompt']
    pi = PI(p)
    n = N(p)
    if p.startswith('A toy is a cone standing on a hemisphere'):
        r, h = n[:2]
        return Expect(txt(sp.Rational(2, 3) * pi * r ** 3 + pi * r * r * h / 3))
    if p.startswith('A solid is a cylinder of radius') and 'cone' in p:
        r, hc, h = n[:3]
        return Expect(txt(pi * r * r * hc + pi * r * r * h / 3))
    if p.startswith('A capsule'):
        r, L = n[:2]
        return Expect(txt(pi * r * r * L + sp.Rational(4, 3) * pi * r ** 3))
    if p.startswith('A solid is a cylinder of radius') and 'hemisphere' in p:
        r, h = n[:2]
        return Expect(txt(pi * r * r * h + sp.Rational(2, 3) * pi * r ** 3))
    raise ValueError(p)


@ref('amcshape', 'composite plane figures by adding / subtracting rectangle, triangle, trapezium, semicircle, quadrant', 'exhaustive')
def amcshape(q):
    p = q['prompt']
    n = N(p)
    if p.startswith('A garden is a rectangle'):
        pi = PI(p)
        a, b = n[:2]  # a long, b wide, semicircle on a side of length b
        side = n[2]
        if side not in (a, b):
            return Verdict(False, 'semicircle side is not a side of the rectangle')
        other = a if side == b else b
        d = side
        if 'area' in p.split('Find')[1][:20]:
            return Expect(txt(a * b + pi * (d / 2) ** 2 / 2))
        return Expect(txt(2 * other + d + pi * d / 2))
    if p.startswith('A rectangular card'):
        pi = PI(p)
        a, b, r = n[:3]
        if r > min(a, b):
            return Verdict(False, 'quadrant larger than the card')
        return Expect(txt(a * b - pi * r * r / 4))
    if p.startswith('The front of a hut'):
        w, h, tb, th = n[:4]
        return Expect(txt(w * h + tb * th / 2))
    if p.startswith('A plot is a trapezium'):
        pi = PI(p)
        a, b, h, side = n[:4]
        return Expect(txt((a + b) * h / 2 + pi * (side / 2) ** 2 / 2))
    raise ValueError(p)


@ref('amcube', 'cube combined with hemisphere / cylinder: exposed surface = cube faces - covered circle + added surface; volumes added or subtracted', 'exhaustive')
def amcube(q):
    p = q['prompt']
    pi = PI(p)
    n = N(p)
    vol = 'volume' in p.split('find')[1]
    if p.startswith('A solid is a cube of edge') and 'hemisphere' in p:
        a, r = n[:2]
        return Expect(txt(a ** 3 + sp.Rational(2, 3) * pi * r ** 3) if vol else txt(6 * a * a - pi * r * r + 2 * pi * r * r))
    if p.startswith('A solid is a cube of edge') and 'cylinder' in p:
        a, r, h = n[:3]
        return Expect(txt(a ** 3 + pi * r * r * h) if vol else txt(6 * a * a - pi * r * r + 2 * pi * r * h + pi * r * r))
    if p.startswith('A hemispherical hollow'):
        r, a = n[:2]
        if 2 * r > a:
            return Verdict(False, 'hollow wider than the cube face')
        return Expect(txt(a ** 3 - sp.Rational(2, 3) * pi * r ** 3) if vol else txt(6 * a * a - pi * r * r + 2 * pi * r * r))
    raise ValueError(p)


@ref('ammodel', 'modelling: tent = cylinder wall + cone roof, bowl = half ball, tank = cylinder + dome, cone + scoop', 'exhaustive')
def ammodel(q):
    p = q['prompt']
    pi = PI(p)
    n = N(p)
    if p.startswith('A tent'):
        d, hw, l = n[:3]
        r = d / 2
        if l <= r:
            return Verdict(False, 'roof slope shorter than the floor radius: no such tent')
        return Expect(txt(2 * pi * r * hw + pi * r * l))
    if p.startswith('A bowl'):
        r = n[0]
        return Expect(txt(sp.Rational(2, 3) * pi * r ** 3))
    if p.startswith('A water tank'):
        r, h = n[:2]
        return Expect(txt(pi * r * r * h + sp.Rational(2, 3) * pi * r ** 3))
    if p.startswith('An ice-cream cone'):
        r, h = n[:2]
        return Expect(txt(pi * r * r * h / 3 + sp.Rational(2, 3) * pi * r ** 3))
    raise ValueError(p)


@ref('amrecast', 'equal-volume recasting: ratio of volumes (sphere 4/3 pi r^3, hemisphere 2/3, cylinder pi r^2 h, cone 1/3 pi r^2 h); counts must be whole', 'exhaustive')
def amrecast(q):
    p = q['prompt']
    n = N(p)
    V = {'sphere': lambda r, h=None: sp.Rational(4, 3) * r ** 3, 'hemisphere': lambda r, h=None: sp.Rational(2, 3) * r ** 3}
    m = re.match(r'A solid metal (sphere|hemisphere|cylinder) of radius', p)
    src = m.group(1)
    if src in ('sphere', 'hemisphere') and 'small solid' in p:
        r1, r2 = n[:2]
        dst = 'hemisphere' if 'hemispheres' in p else 'sphere'
        cnt = V[src](r1) / V[dst](r2)
        return Expect(txt(cnt)) if cnt == int(cnt) else Ambiguous('not a whole number of pieces')
    if src == 'sphere' and 'rod' in p:
        r1, r2 = n[:2]
        return Expect(txt(V['sphere'](r1) / r2 ** 2))
    if src == 'cylinder':
        r1, h1, r2, h2 = n[:4]
        cnt = (r1 * r1 * h1) / (r2 * r2 * h2 / 3)
        return Expect(txt(cnt)) if cnt == int(cnt) else Ambiguous('not a whole number of cones')
    raise ValueError(p)


# ---------------------------------------------------------------- simple ones
@ref('avfence', 'perimeter of the garden x price per metre; figure sides checked', 'exhaustive')
def avfence(q):
    l, w, price = [int(x) for x in nums(q['prompt'])[:3]]
    fl = [int(x) for x in nums(' '.join(q['figure']['lengths']))]
    if sorted(fl) != sorted([l, w, l, w]):
        return Verdict(False, 'figure sides differ from statement')
    return Expect(str((l + w + l + w) * price))


@ref('avvcmp', 'choice: letter not checkable (options not exported); table compared with the statement', 'exhaustive')
def avvcmp(q):
    n = [int(x) for x in nums(q['prompt'])]
    a, b = n[1:4], n[5:8]
    rows = q['figure']['rows']
    fa = [int(x.split()[0]) for x in rows[0][1:]]
    fb = [int(x.split()[0]) for x in rows[1][1:]]
    if fa != a or fb != b:
        return Verdict(False, 'table differs from statement')
    return Unsupported(NOOPT)


@ref('rect', 'area as a count of unit squares row by row', 'exhaustive')
def rect(q):
    l, w = [int(x) for x in nums(q['prompt'])[:2]]
    return Expect(str(sum(l for _ in range(w))))


@ref('rperim', 'perimeter by adding the four sides', 'exhaustive')
def rperim(q):
    l, w = [int(x) for x in nums(q['prompt'])[:2]]
    return Expect(str(l + w + l + w))


@ref('vol', 'cubes counted layer by layer', 'exhaustive')
def vol(q):
    l, w, h = [int(x) for x in nums(q['prompt'])[1:4]]
    return Expect(str(sum(l * w for _ in range(h))))
