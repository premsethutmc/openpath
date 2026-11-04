"""measurement slice, part 3: af*, ag*, ai* (area, perimeter, volume, circles, speed). Derived from the statement/figure; geometric cross-checks by coordinates."""
import re
from fractions import Fraction
from decimal import Decimal, ROUND_HALF_UP

from kit import ref, Expect, Verdict, Unsupported, Ambiguous
from refs.measurement_util import nums, fmt, dec


def D(s):
    return Fraction(s.replace(',', ''))


def PI(p):
    m = re.search(r'π = (\d+(?:\.\d+)?)(?:/(\d+))?', p)
    if not m:
        return None
    return D(m.group(1)) / (int(m.group(2)) if m.group(2) else 1)


def out(fr):
    """exact value as decimal text when it terminates, else a fraction"""
    fr = Fraction(fr)
    d = fr.denominator
    for p in (2, 5):
        while d % p == 0:
            d //= p
    return dec(fr) if d == 1 else fmt(fr)


def shoelace(pts):
    s = Fraction(0)
    for i in range(len(pts)):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % len(pts)]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2


def rnd(fr, places):
    return Decimal(fr.numerator) / Decimal(fr.denominator)


def round_dp(fr, places):
    """round half up to `places` decimals, exact, as text with exactly that many places"""
    q = fr * 10 ** places
    n = q.numerator // q.denominator
    rem = q - n
    if rem >= Fraction(1, 2):
        n += 1
    return dec(Fraction(n, 10 ** places), places)


# ---------------------------------------------------------------- af / ag
@ref('afapr', 'the other rectangle is found from the equal-area / equal-perimeter condition; whole-number sides checked; area also counted square by square', 'exhaustive')
def afapr(q):
    p = q['prompt']
    L, W, u, _, s = [int(x) for x in nums(p)][:5]
    f = q['figure']
    if (f['rows'], f['cols']) != (W, L) and (f['rows'], f['cols']) != (L, W):
        return Verdict(False, 'grid drawn differs from the statement')
    if 'same area' in p:
        area = sum(1 for _ in range(L) for _ in range(W))
        if area % s:
            return Ambiguous('other side is not a whole number')
        o = area // s
        return Expect(str(2 * (s + o)))
    per = 2 * (L + W)
    o = per // 2 - s
    return Expect(str(s * o)) if o > 0 else Ambiguous('no rectangle with that side')


@ref('agspd', 'unit rate = distance / time (exact); figure end point compared with the distance', 'exhaustive')
def agspd(q):
    d, t = [int(x) for x in nums(q['prompt'])][:2]
    if q['figure']['to'] != d:
        return Verdict(False, 'number line end differs from the distance')
    r = Fraction(d, t)
    return Expect(fmt(r)) if r.denominator == 1 else Ambiguous('rate is not a whole number')


@ref('agspdc', 'speed of each child = distance / time (exact); the larger one', 'exhaustive')
def agspdc(q):
    rows = q['figure']['rows']
    sp = [Fraction(int(r[1]), int(r[2])) for r in rows]
    if sp[0] == sp[1]:
        return Ambiguous('equal speeds')
    m = max(sp)
    return Expect(fmt(m)) if m.denominator == 1 else Ambiguous('speed not a whole number')


# ---------------------------------------------------------------- volumes / areas of solids
def dims3(q):
    d = [int(x) for x in nums(' '.join(q['figure']['dims']))]
    return d * 3 if len(d) == 1 else d


@ref('aicap', 'volume of the tank in cm3 (or m3) converted with the stated 1 litre = 1000 cm3 / 1 m3 = 1000 litres', 'exhaustive')
def aicap(q):
    p = q['prompt']
    a, b, c = [int(x) for x in nums(p)[:3]]
    if sorted(dims3(q)) != sorted([a, b, c]):
        return Verdict(False, 'figure dims differ from statement')
    v = a * b * c
    if re.search(r'\bm long', p) and 'cm long' not in p:
        return Expect(str(v * 1000))
    return Expect(fmt(Fraction(v, 1000)))


@ref('aicarea', 'area from the circle with the stated pi: pi r^2 (exact Fractions); diameter halved', 'exhaustive')
def aicarea(q):
    p = q['prompt']
    n = D(re.search(r'(radius|diameter) of (\d+(?:\.\d+)?) cm', p).group(2))
    r = n / 2 if 'diameter' in p else n
    return Expect(out(PI(p) * r * r))


@ref('aicircum', 'circumference 2 pi r = pi d with the stated pi (exact)', 'exhaustive')
def aicircum(q):
    p = q['prompt']
    n = D(re.search(r'(radius|diameter) of (\d+(?:\.\d+)?) cm', p).group(2))
    d = n * 2 if 'radius' in p else n
    return Expect(out(PI(p) * d))


@ref('aicvol', 'unit cubes counted layer by layer: layer = l x w, layers = h', 'exhaustive')
def aicvol(q):
    n = [int(x) for x in nums(q['prompt'])]
    if 'cube has edges' in q['prompt']:
        n = n * 3
    l, w, h = n[:3]
    if sorted(dims3(q)) != sorted([l, w, h]):
        return Verdict(False, 'figure dims differ from statement')
    return Expect(str(sum(l * w for _ in range(h))))


@ref('aicyls', 'curved surface = circumference x height; total = curved + two circular ends (exact)', 'exhaustive')
def aicyls(q):
    p = q['prompt']
    r, h = D(re.search(r'radius of (\d+(?:\.\d+)?) cm', p).group(1)), D(re.search(r'height of (\d+(?:\.\d+)?) cm', p).group(1))
    pi = PI(p)
    curved = (2 * pi * r) * h
    if 'curved surface area' in p:
        return Expect(out(curved))
    return Expect(out(curved + 2 * pi * r * r))


@ref('aicylv', 'volume = base area x height (exact)', 'exhaustive')
def aicylv(q):
    p = q['prompt']
    m = re.search(r'(radius|diameter) of (\d+(?:\.\d+)?) cm and a height of (\d+(?:\.\d+)?) cm', p)
    r = D(m.group(2)) / (2 if m.group(1) == 'diameter' else 1)
    return Expect(out(PI(p) * r * r * D(m.group(3))))


@ref('aihollow', 'pipe: curved = 2 pi (R + r) h; ring ends 2 x pi (R^2 - r^2); volume = pi (R^2 - r^2) h', 'exhaustive')
def aihollow(q):
    p = q['prompt']
    h, R, r = [D(x) for x in re.search(r'pipe is (\d+(?:\.\d+)?) cm long\. Its outer radius is (\d+(?:\.\d+)?) cm and its inner radius is (\d+(?:\.\d+)?) cm', p).groups()]
    pi = PI(p)
    if r >= R:
        return Verdict(False, 'inner radius is not smaller than outer')
    curved = 2 * pi * R * h + 2 * pi * r * h
    if 'curved surface area' in p:
        return Expect(out(curved))
    if 'total surface area' in p:
        return Expect(out(curved + 2 * (pi * R * R - pi * r * r)))
    if 'volume of metal' in p:
        return Expect(out(pi * R * R * h - pi * r * r * h))
    raise ValueError(p)


@ref('ailsa', 'four walls = perimeter of the floor x height; cross-check by adding the four rectangles', 'exhaustive')
def ailsa(q):
    l, w, h = [int(x) for x in nums(q['prompt'])[:3]]
    if sorted(dims3(q)) != sorted([l, w, h]):
        return Verdict(False, 'figure dims differ from statement')
    return Expect(str(l * h + w * h + l * h + w * h))


@ref('ailshape', 'rectangle minus the cut corner; perimeter = sum of the six listed sides (also equals 2(a+b))', 'exhaustive')
def ailshape(q):
    p = q['prompt']
    n = [int(x) for x in nums(p)]
    a, b, c, d = n[:4]
    sides = n[4:10]
    if c >= a and d >= a or (c >= a and c >= b) or d >= b and d >= a:
        pass
    per = sum(sides)
    ok1 = c < a and d < b and sorted(sides) == sorted([a, b, c, d, a - c, b - d])
    ok2 = d < a and c < b and sorted(sides) == sorted([a, b, c, d, a - d, b - c])
    if not (ok1 or ok2):
        return Verdict(False, f'listed sides {sides} do not outline a {a} by {b} rectangle with a {c} by {d} corner removed')
    if per != 2 * (a + b):
        return Verdict(False, f'listed sides add to {per} but the outline of the stated shape has perimeter {2 * (a + b)}')
    # area with coordinates: corner cut of c (along x) by d (along y), or the other way round; both give the same area
    area = a * b - c * d
    if 'perimeter' in p.split('Find')[1]:
        return Expect(str(per))
    return Expect(str(area)) if c <= a and d <= b or c <= b and d <= a else Ambiguous('cut larger than the rectangle')


@ref('aipack', 'count lattice positions: cubes fit along an edge while k*e <= edge; product over the three edges', 'exhaustive')
def aipack(q):
    e, l, w, h = [int(x) for x in nums(q['prompt'])[:4]]
    def fit(L):
        k = 0
        while (k + 1) * e <= L:
            k += 1
        return k
    return Expect(str(fit(l) * fit(w) * fit(h)))


@ref('aipara', 'area = base x height; perimeter = 2(base + slant); height = area / base. Realisability: slant side >= height (shoelace on the coordinates cross-checks the area)', 'exhaustive')
def aipara(q):
    p = q['prompt']
    if 'has an area of' in p:
        A, b = [int(x) for x in nums(p)[:2]]
        return Expect(fmt(Fraction(A, b)))
    b, s, h = [int(x) for x in nums(p)[:3]]
    if s < h:
        return Verdict(False, f'impossible parallelogram: slanting side {s} is shorter than its height {h}')
    # coordinates: (0,0),(b,0),(b+x,h),(x,h) with x = sqrt(s^2-h^2) (area independent of x)
    area = shoelace([(Fraction(0), Fraction(0)), (Fraction(b), Fraction(0)), (Fraction(b + 1), Fraction(h)), (Fraction(1), Fraction(h))])
    if 'perimeter' in p.split('Find')[1]:
        return Expect(str(2 * (b + s)))
    return Expect(fmt(area))


@ref('aipath', 'path area = area of outer rectangle - area of inner rectangle (both measured), inside path requires 2w < each side', 'exhaustive')
def aipath(q):
    p = q['prompt']
    L, W, w = [int(x) for x in nums(p)[:3]]
    if 'just inside' in p:
        if 2 * w >= min(L, W):
            return Verdict(False, 'path as wide as half the garden: no inner rectangle')
        return Expect(str(L * W - (L - 2 * w) * (W - 2 * w)))
    return Expect(str((L + 2 * w) * (W + 2 * w) - L * W))


FRACS = {'62832/20000': Fraction(62832, 20000), '256/81': Fraction(256, 81), '22/7': Fraction(22, 7), '355/113': Fraction(355, 113), '3927/1250': Fraction(3927, 1250)}


@ref('aipi', 'ratios computed exactly and rounded half-up to the stated number of decimals', 'exhaustive')
def aipi(q):
    p = q['prompt']
    if 'circumference is' in p:
        c, d = [int(x) for x in nums(p)[:2]]
        return Expect(round_dp(Fraction(c, d), 2), form=True)
    m = re.search(r'used (\d+/\d+) for π\.', p)
    pi = FRACS[m.group(1)]
    if 'correct to four decimal places' in p and 'circumference' not in p:
        return Expect(round_dp(pi, 4), form=True)
    d = int(re.search(r'diameter (\d+) mm', p).group(1)) if 'diameter of' not in p else int(re.search(r'diameter of (\d+) mm', p).group(1))
    return Expect(round_dp(pi * d, 2), form=True)


@ref('airad', 'radius = circumference / (2 pi) with the stated pi; wheel: circumference = distance / turns', 'exhaustive')
def airad(q):
    p = q['prompt']
    pi = PI(p)
    if 'cart wheel' in p:
        dist, turns = D(re.search(r'rolls (\d+(?:\.\d+)?) m along a road in (\d+) full turns', p).group(1)), int(re.search(r'in (\d+) full turns', p).group(1))
        c = dist * 100 / turns
        return Expect(out(c / (2 * pi)))
    c = D(re.search(r'circumference of a circle is (\d+(?:\.\d+)?) cm', p).group(1))
    r = c / (2 * pi)
    return Expect(out(r * 2 if 'diameter' in p.split('find')[1] else r))


@ref('airhomb', 'rhombus area = d1 d2 / 2 (shoelace on the four vertices as cross-check); missing diagonal = 2 A / d', 'exhaustive')
def airhomb(q):
    p = q['prompt']
    n = [D(x) for x in re.findall(r'\d+(?:\.\d+)?', p)]
    if 'has an area of' in p:
        A, d1 = n[0], n[1]
        return Expect(out(2 * A / d1))
    d1, d2 = n[0], n[1]
    area = shoelace([(d1 / 2, Fraction(0)), (Fraction(0), d2 / 2), (-d1 / 2, Fraction(0)), (Fraction(0), -d2 / 2)])
    return Expect(out(area))


@ref('airing', 'path = pi (r + w)^2 - pi r^2 (exact)', 'exhaustive')
def airing(q):
    p = q['prompt']
    r, w = [D(x) for x in re.search(r'radius of (\d+(?:\.\d+)?) m\. A path (\d+(?:\.\d+)?) m wide', p).groups()]
    pi = PI(p)
    return Expect(out(pi * (r + w) ** 2 - pi * r * r))


@ref('aisector', 'arc = (theta/360) 2 pi r; area = (theta/360) pi r^2; perimeter = arc + 2r (exact)', 'exhaustive')
def aisector(q):
    p = q['prompt']
    r, t = [D(x) for x in re.search(r'radius of (\d+(?:\.\d+)?) cm and an angle of (\d+(?:\.\d+)?)°', p).groups()]
    pi = PI(p)
    arc = t / 360 * 2 * pi * r
    if 'arc length' in p:
        return Expect(out(arc))
    if 'its area' in p:
        return Expect(out(t / 360 * pi * r * r))
    if 'its perimeter' in p:
        return Expect(out(arc + 2 * r))
    raise ValueError(p)


@ref('aisplit', 'composite areas: triangles 1/2 b h, rectangle b h, trapezium 1/2 (a+b) h; shoelace cross-check for the trapezium', 'exhaustive')
def aisplit(q):
    p = q['prompt']
    n = [D(x) for x in re.findall(r'\d+(?:\.\d+)?', p)]
    if p.startswith('A field ABCD is split'):
        ac, hb, hd = n[:3]
        return Expect(out(ac * hb / 2 + ac * hd / 2))
    if p.startswith('The end wall of a hut'):
        w, h, th = n[:3]
        return Expect(out(w * h + w * th / 2))
    if 'Levelling the field costs' in p:
        a, b, d, cost = n[:4]
        area = shoelace([(Fraction(0), Fraction(0)), (a, Fraction(0)), (b + (a - b) / 2, d), ((a - b) / 2, d)])
        return Expect(out(area * cost))
    if 'has an area of' in p:
        A, a, b = n[:3]
        return Expect(out(2 * A / (a + b)))
    raise ValueError(p)


@ref('aitrap', 'trapezium area 1/2 (a + b) h; shoelace on an isosceles trapezium as cross-check', 'exhaustive')
def aitrap(q):
    a, b, h = [D(x) for x in re.findall(r'\d+(?:\.\d+)?', q['prompt'])[:3]]
    big, small = max(a, b), min(a, b)
    area = shoelace([(Fraction(0), Fraction(0)), (big, Fraction(0)), (big - (big - small) / 2, h), ((big - small) / 2, h)])
    return Expect(out(area))


@ref('aitri', 'triangle area 1/2 b h; right triangle on its legs', 'exhaustive')
def aitri(q):
    a, b = [D(x) for x in re.findall(r'\d+(?:\.\d+)?', q['prompt'])[:2]]
    return Expect(out(shoelace([(Fraction(0), Fraction(0)), (a, Fraction(0)), (Fraction(0), b)])))


@ref('aitrih', 'area = 1/2 b h solved for the unknown', 'exhaustive')
def aitrih(q):
    A, x = [D(v) for v in re.findall(r'\d+(?:\.\d+)?', q['prompt'])[:2]]
    return Expect(out(2 * A / x))


@ref('aitsa', 'surface area as the sum of the six faces', 'exhaustive')
def aitsa(q):
    p = q['prompt']
    n = [int(x) for x in nums(p)]
    if 'cube has edges' in p:
        n = n * 3
    l, w, h = n[:3]
    return Expect(str(2 * (l * w) + 2 * (w * h) + 2 * (l * h)))


@ref('aiwheel', 'distance = turns x pi d (cm) converted to m; turns = distance / (pi d)', 'exhaustive')
def aiwheel(q):
    p = q['prompt']
    pi = PI(p)
    d = D(re.search(r'diameter of (\d+(?:\.\d+)?) cm', p).group(1))
    n = D(re.search(r'(\d+) full turns|rolling (\d+(?:\.\d+)?) m', p).group(1) or re.search(r'rolling (\d+(?:\.\d+)?) m', p).group(1))
    if 'How far' in p:
        return Expect(out(n * pi * d / 100))
    t = D(re.search(r'rolling (\d+(?:\.\d+)?) m', p).group(1)) * 100 / (pi * d)
    return Expect(out(t)) if t.denominator == 1 else Ambiguous('not a whole number of turns')


@ref('aiwiper', 'sector / annulus / square-minus-quarters / lens areas with the stated pi (exact)', 'exhaustive')
def aiwiper(q):
    p = q['prompt']
    pi = PI(p)
    if p.startswith("A car's wiper"):
        a, b, t = [D(x) for x in re.search(r'between (\d+(?:\.\d+)?) cm and (\d+(?:\.\d+)?) cm from its pivot as it sweeps through (\d+(?:\.\d+)?)°', p).groups()]
        return Expect(out(t / 360 * pi * (b * b - a * a)))
    if p.startswith('A square tile'):
        s, r = [D(x) for x in re.search(r'sides of (\d+(?:\.\d+)?) cm\. At each corner a quarter circle of radius (\d+(?:\.\d+)?) cm', p).groups()]
        return Expect(out(s * s - 4 * (pi * r * r / 4)))
    if p.startswith('In a square of side'):
        s, r = [D(x) for x in re.search(r'side (\d+(?:\.\d+)?) cm, two quarter circles of radius (\d+(?:\.\d+)?) cm', p).groups()]
        if s != r:
            return Ambiguous('lens formula assumes radius = side')
        return Expect(out(2 * (pi * r * r / 4) - s * s))
    if p.startswith('A lighthouse'):
        t, r = [D(x) for x in re.search(r'angle (\d+(?:\.\d+)?)° out to a distance of (\d+(?:\.\d+)?) km', p).groups()]
        return Expect(out(t / 360 * pi * r * r))
    raise ValueError(p)
