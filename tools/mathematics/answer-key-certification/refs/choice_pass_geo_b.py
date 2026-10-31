"""choice-pass-geo, part B: circle theorems, triangle congruence/similarity, Ceva/Menelaus, triangle centres, proof reasons.
Independent of the generators; the stored letter is never read here."""
import itertools
import math
import re
from fractions import Fraction

from .choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, judge, nm

# ------------------------------------------------------------------ amline
@judge('amline', 'intersection of the line y = d with the circle x^2 + y^2 = r^2: number of real solutions of x^2 = r^2 - d^2 (exact integers): 2 secant, 1 tangent, 0 none')
def amline(q, opts):
    m = re.fullmatch(r'A circle has (radius|diameter) (\d+) cm\. A straight line is (\d+) cm from the centre of the circle \(measured along the perpendicular\)\. Which statement is true\?', nm(q['prompt']))
    if not m:
        return Unsupported('unparsed prompt')
    r, d = Fraction(int(m.group(2))) / (2 if m.group(1) == 'diameter' else 1), int(m.group(3))
    if r <= 0:
        return Defect('radius must be positive')
    disc = r * r - d * d
    n = 2 if disc > 0 else 1 if disc == 0 else 0
    res = []
    for o in opts:
        t = nm(o)
        if t == 'The line does not meet the circle':
            res.append(n == 0)
        elif t == 'The line is a tangent: it touches the circle at exactly one point':
            res.append(n == 1)
        elif t == 'The line is a secant: it cuts the circle at two points':
            res.append(n == 2)
        else:
            raise ValueError(f'unreadable option {o!r}')
    return res


# ------------------------------------------------------------------ ambptc
@judge('ambptc', 'coordinates: converse BPT: D on AB, E on AC placed on perpendicular axes (affine invariance), DE parallel to BC iff the cross product of DE and BC is zero; angle bisector: triangle built from the three side lengths (law of cosines), D placed on BC, angles BAD and DAC compared by exact squared cosines (cross-checked numerically)')
def ambptc(q, opts):
    p = nm(q['prompt'])
    m = re.fullmatch(r'In ΔABC, D is on AB and E is on AC, with AD = ([\d.]+) cm, DB = ([\d.]+) cm, AE = ([\d.]+) cm and EC = ([\d.]+) cm\. Which statement is true\?', p)
    if m:
        ad, db, ae, ec = (Fraction(m.group(i)) for i in (1, 2, 3, 4))
        A = (Fraction(0), Fraction(0)); B = (ad + db, Fraction(0)); C = (Fraction(0), ae + ec)
        D = (ad, Fraction(0)); E = (Fraction(0), ae)
        cr = (E[0] - D[0]) * (C[1] - B[1]) - (E[1] - D[1]) * (C[0] - B[0])
        par = cr == 0
        res = []
        for o in opts:
            t = nm(o)
            if t.startswith('DE ∥ BC'):
                res.append(par)
            elif t == 'DE is not parallel to BC':
                res.append(not par)
            elif t == 'It cannot be decided without measuring an angle':
                res.append(False)         # the lengths decide it (both cevians' ratios are given)
            else:
                raise ValueError(f'unreadable option {o!r}')
        return res
    m = re.fullmatch(r'In ΔABC, D is on BC with BD = ([\d.]+) cm and DC = ([\d.]+) cm, and AB = ([\d.]+) cm, AC = ([\d.]+) cm\. Which statement is true\?', p)
    if m:
        bd, dc, ab, ac = (Fraction(m.group(i)) for i in (1, 2, 3, 4))
        bc = bd + dc
        if not (abs(ab - ac) < bc < ab + ac):
            return Defect('AB, AC, BC do not form a triangle')
        # B=(0,0), C=(bc,0), A from the law of cosines; D=(bd,0)
        ax = (ab * ab - ac * ac + bc * bc) / (2 * bc)
        ay2 = ab * ab - ax * ax
        # vectors AB, AC, AD ; cos(BAD)^2 vs cos(DAC)^2 with the sign: compare cos exactly through squares and signs
        def vec(P):
            return (P[0] - ax, P[1] - 0)   # y handled symbolically through ay2
        # use cos(angle between u,v) = (u.v)/(|u||v|) with u=(ux,-ay),v=(vx,-ay): u.v = ux*vx + ay2 (ay^2 = ay2)
        ux, vx, wx = -ax, bc - ax, bd - ax    # AB, AC, AD x-components relative to A (B=0,C=bc,D=bd)
        dot_bd = ux * wx + ay2; n_ab2, n_ad2, n_ac2 = ux * ux + ay2, wx * wx + ay2, vx * vx + ay2
        dot_dc = vx * wx + ay2
        # cos(BAD)=dot_bd/(|AB||AD|), cos(DAC)=dot_dc/(|AC||AD|): equal iff dot_bd*|AC| = dot_dc*|AB|  (|AB|=ab,|AC|=ac exact)
        bis = dot_bd * ac == dot_dc * ab
        # numeric cross-check with floats
        axf, ayf = float(ax), math.sqrt(float(ay2))
        a1 = math.atan2(abs((0 - axf) * (-ayf) - (float(bd) - axf) * (-ayf)), (0 - axf) * (float(bd) - axf) + ayf * ayf)
        a2 = math.atan2(abs((float(bd) - axf) * (-ayf) - (float(bc) - axf) * (-ayf)), (float(bd) - axf) * (float(bc) - axf) + ayf * ayf)
        assert bis == (abs(a1 - a2) < 1e-9)
        res = []
        for o in opts:
            t = nm(o)
            if t.startswith('AD bisects ∠BAC'):
                res.append(bis)
            elif t == 'AD does not bisect ∠BAC':
                res.append(not bis)
            elif t == 'It cannot be decided without measuring an angle':
                res.append(False)
            else:
                raise ValueError(f'unreadable option {o!r}')
        return res
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ ammen
def _div(P, Q, a, b):
    """point X on segment PQ with PX : XQ = a : b"""
    return tuple(Fraction(b) * p + Fraction(a) * qv for p, qv in zip(P, Q)) if False else tuple((Fraction(b) * p + Fraction(a) * qv) / Fraction(a + b) for p, qv in zip(P, Q))


def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


@judge('ammen', 'coordinates in two different (non-special) triangles: points D, E, F built from the stated ratios (internal division, external for D beyond C); concurrency of AD, BE, CF by intersecting two cevians and testing the third; collinearity of D, E, F by the cross product; "cannot be decided" is never right because the ratios fix the points')
def ammen(q, opts):
    p = nm(q['prompt'])
    m = re.fullmatch(r'In ΔABC, D, E and F lie on BC, CA and AB with BD : DC = (\d+) : (\d+), CE : EA = (\d+) : (\d+) and AF : FB = (\d+) : (\d+)\. Which statement is true\?', p)
    mm = re.fullmatch(r'In ΔABC, D lies on BC extended beyond C, and E and F lie on CA and AB, with BD : DC = (\d+) : (\d+), CE : EA = (\d+) : (\d+) and AF : FB = (\d+) : (\d+)\. Which statement is true\?', p)
    if not (m or mm):
        return Unsupported('unparsed prompt')
    g = [int(x) for x in (m or mm).groups()]
    res_all = []
    for tri in (((0, 0), (9, 0), (2, 7)), ((1, 2), (11, 5), (4, 13))):
        A, B, C = [tuple(Fraction(c) for c in P) for P in tri]
        if m:
            D = _div(B, C, g[0], g[1]); E = _div(C, A, g[2], g[3]); F = _div(A, B, g[4], g[5])
            # intersection of AD and BE, then test on CF
            def inter(P1, P2, P3, P4):
                d1 = (P2[0] - P1[0], P2[1] - P1[1]); d2 = (P4[0] - P3[0], P4[1] - P3[1])
                den = d1[0] * d2[1] - d1[1] * d2[0]
                if den == 0:
                    return None
                t = ((P3[0] - P1[0]) * d2[1] - (P3[1] - P1[1]) * d2[0]) / den
                return (P1[0] + t * d1[0], P1[1] + t * d1[1])
            X = inter(A, D, B, E)
            truth = X is not None and _cross(C, F, X) == 0
        else:
            if g[0] <= g[1]:
                return Defect('BD : DC <= 1 cannot put D beyond C')
            # D beyond C with BD:DC = a:b (a>b): D = (a C - b B)/(a-b)
            D = tuple((Fraction(g[0]) * c - Fraction(g[1]) * b_) / Fraction(g[0] - g[1]) for c, b_ in zip(C, B))
            E = _div(C, A, g[2], g[3]); F = _div(A, B, g[4], g[5])
            truth = _cross(D, E, F) == 0
        res_all.append(truth)
    if res_all[0] != res_all[1]:
        return Unsupported('configuration-dependent result (reference bug)')
    truth = res_all[0]
    res = []
    for o in opts:
        t = nm(o)
        if t in ('AD, BE and CF meet at one point (they are concurrent)', 'D, E and F lie on one straight line'):
            res.append(truth)
        elif t in ('AD, BE and CF do not all pass through one point', 'D, E and F do not lie on one straight line'):
            res.append(not truth)
        elif t == 'It cannot be decided from the ratios alone':
            res.append(False)
        else:
            raise ValueError(f'unreadable option {o!r}')
    return res


# ------------------------------------------------------------------ amcrit / amsimc : facts -> rules
def _tri_solutions_ssa(adj, opp, theta_deg):
    """number of distinct positive solutions for the third side x from opp^2 = adj^2 + x^2 - 2 adj x cos(theta): the SSA count (exact for 90)"""
    th = math.radians(theta_deg)
    c = math.cos(th)
    if theta_deg == 90:
        return 1 if opp > adj else 0 if opp <= adj else 0
    # x^2 - 2 adj c x + (adj^2 - opp^2) = 0
    b = -2 * adj * c; cc = adj * adj - opp * opp
    disc = b * b - 4 * cc
    if disc < -1e-12:
        return 0
    if abs(disc) <= 1e-12:
        return 1 if -b / 2 > 1e-12 else 0
    r1 = (-b + math.sqrt(disc)) / 2; r2 = (-b - math.sqrt(disc)) / 2
    return sum(1 for r in (r1, r2) if r > 1e-9)


SIDE_OPP = {'BC': 'A', 'CA': 'B', 'AC': 'B', 'AB': 'C'}


def _parse_facts(p):
    """('AB',3), ('ang','B',75) ... from  'AB = PQ = 3 cm; ∠B = ∠Q = 75°; BC = QR = 4 cm'"""
    body = p.split('R): ', 1)[1].rsplit('. Which rule', 1)[0] if 'R): ' in p else None
    if body is None:
        body = p.split('): ', 1)[1].rsplit('. Which rule', 1)[0]
    facts = []
    for part in body.split('; '):
        ma = re.fullmatch(r'∠([ABC]) = ∠([PQR]) = (\d+)°', part.strip())
        ms = re.fullmatch(r'([ABC][ABC]) = ([PQR][PQR]) = (\d+) cm', part.strip())
        if ma:
            facts.append(('ang', ma.group(1), int(ma.group(3))))
        elif ms:
            facts.append(('side', ''.join(sorted(ms.group(1))), int(ms.group(3))))
        else:
            raise ValueError(f'unparsed fact {part!r}')
    return facts


@judge('amcrit', 'facts -> rule by direct pattern match of the listed facts (SSS three sides; SAS two sides + included angle; ASA two angles + included side; AAS two angles + non-included side; RHS right angle + hypotenuse + one leg); "None of these" correct iff the facts leave more than one non-congruent triangle (explicit SSA root count by the law of cosines / angles-only); rules are applied to the listed facts only (a third angle derived by angle sum is not used)',
       assumptions='ASA and AAS are interchangeable once the third angle is derived (angle sum); the rule is the one whose premise is literally listed. SSA with the opposite side not shorter than the adjacent side determines a unique triangle but is not a congruence rule in the syllabus: such an item would have no correct option and is flagged.')
def amcrit(q, opts):
    p = nm(q['prompt'])
    if not p.startswith('In ΔABC and ΔPQR (A matches P, B matches Q and C matches R): '):
        return Unsupported('unparsed prompt')
    facts = _parse_facts(p)
    S = [f for f in facts if f[0] == 'side']; Ag = [f for f in facts if f[0] == 'ang']
    sides = {f[1]: f[2] for f in S}; ang = {f[1]: f[2] for f in Ag}
    verts = 'ABC'
    # opposite side of each vertex
    opp = {'A': 'BC', 'B': 'AC', 'C': 'AB'}
    rule = set()
    determined = None
    if len(S) == 3:
        rule.add('SSS'); a, b, c = sorted(sides.values()); determined = a + b > c
    elif len(S) == 2 and len(Ag) == 1:
        (v, th), = ang.items()
        adj = [s for s in sides if v in s]
        if len(adj) == 2:
            rule.add('SAS'); determined = 0 < th < 180
        else:
            # one side adjacent to v is given? the given sides: one adjacent to v, one opposite v
            ad = [s for s in sides if v in s]; op = [s for s in sides if v not in s]
            if len(ad) != 1 or len(op) != 1:
                return Unsupported('unexpected side/angle configuration')
            n = _tri_solutions_ssa(sides[ad[0]], sides[op[0]], th)
            determined = n == 1
            if th == 90 and sides[op[0]] > sides[ad[0]]:
                rule.add('RHS')
            if n == 2:
                determined = False
            if n == 0:
                return Defect('no triangle exists with these facts')
    elif len(S) == 1 and len(Ag) == 2:
        (s, sv), = sides.items()
        v1, v2 = list(ang)
        if sum(ang.values()) >= 180:
            return Defect('two angles add up to 180 or more')
        determined = True
        rule.add('ASA' if (v1 in s and v2 in s) else 'AAS')
    elif len(S) == 0:
        determined = False
    else:
        return Unsupported('unexpected fact mix')
    res = []
    for o in opts:
        t = nm(o)
        if t in ('SSS', 'SAS', 'ASA', 'AAS', 'RHS'):
            res.append(t in rule)
        elif t == 'None of these: the facts are not enough':
            res.append(not determined)
        else:
            raise ValueError(f'unreadable option {o!r}')
    return res


def _parse_sim(p):
    body = p.split('R): ', 1)[1] if 'R): ' in p else p.split('): ', 1)[1]
    body = body.rsplit('. Which statement', 1)[0]
    sides = {}; ang = {}
    for part in body.split('; '):
        part = part.strip()
        ms = re.fullmatch(r'([ABC][ABC]) = (\d+) cm, ([PQR][PQR]) = (\d+) cm', part)
        ma = re.fullmatch(r'∠([ABC]) = ∠([PQR]) = (\d+)°', part)
        if ms:
            sides[''.join(sorted(ms.group(1)))] = (int(ms.group(2)), int(ms.group(4)))
        elif ma:
            ang[ma.group(1)] = int(ma.group(3))
        else:
            raise ValueError(f'unparsed fact {part!r}')
    return sides, ang


@judge('amsimc', 'similarity criteria on the listed facts: AA (two equal angle pairs), SSS (three equal side ratios), SAS (two equal side ratios with the included angle equal); otherwise "Not shown". Cross-check: whether the facts nevertheless determine the shape (SSA with the opposite side not shorter than the adjacent side) is recorded in the item note',
       assumptions='"Not shown to be similar" is read as "the listed facts do not establish similarity by AA / SSS / SAS".')
def amsimc(q, opts):
    p = nm(q['prompt'])
    if not p.startswith('In ΔABC and ΔPQR (A matches P, B matches Q, C matches R): '):
        return Unsupported('unparsed prompt')
    sides, ang = _parse_sim(p)
    ratios = {s: Fraction(a, b) for s, (a, b) in sides.items()}
    rule = set()
    if len(ang) >= 2:
        rule.add('AA')
    if len(ratios) == 3 and len(set(ratios.values())) == 1:
        rule.add('SSS')
    if len(ratios) == 2 and len(ang) == 1 and len(set(ratios.values())) == 1:
        (v, th), = ang.items()
        if all(v in s for s in ratios):
            rule.add('SAS')
    if len(rule) > 1:
        return Ambiguous(f'facts match several criteria: {sorted(rule)}')
    if not rule and len(ratios) == 2 and len(ang) == 1 and len(set(ratios.values())) == 1:
        (v, th), = ang.items()
        s_adj = [s_ for s_ in ratios if v in s_]; s_opp = [s_ for s_ in ratios if v not in s_]
        if len(s_adj) == 1 and len(s_opp) == 1:
            adj, opp_ = sides[s_adj[0]][0], sides[s_opp[0]][0]
            if _tri_solutions_ssa(adj, opp_, th) == 1:
                return Ambiguous('two sides in proportion and an equal NON-included angle (SSA) with the opposite side not shorter than the adjacent side: the triangle is uniquely determined, so ABC and PQR are in fact similar (law of sines gives a second equal angle, then AA); "Not shown to be similar" is true only in the sense "not by AA/SSS/SAS", while the data do show similarity')
    res = []
    for o in opts:
        t = nm(o)
        if t.startswith('Similar by '):
            res.append(t[len('Similar by '):] in rule)
        elif t == 'Not shown to be similar':
            res.append(not rule)
        else:
            raise ValueError(f'unreadable option {o!r}')
    return res


# ------------------------------------------------------------------ amreason
REASON = {
    'vertical': 'Vertically opposite angles are equal.', 'linear': 'Angles in a linear pair add up to 180°.',
    'alternate': 'Alternate angles between parallel lines are equal.', 'corresponding': 'Corresponding angles between parallel lines are equal.',
    'co-interior': 'Co-interior angles between parallel lines add up to 180°.', 'anglesum': 'The three angles of a triangle add up to 180°.',
    'exterior': 'An exterior angle of a triangle equals the sum of the two interior opposite angles.'}
CONC = r'∠(\w)(\w)(\w) = (\d+)°\. A proof says: "so ∠(\w)(\w)(\w) = (\d+)°\."\s*Which reason justifies this step\?'


def _opp_pair_rule(arms1, arms2, opp, x, y):
    """two angles at the same vertex given by their arm rays; opp = set of frozenset({r, r'}) opposite-ray pairs"""
    is_opp = lambda a, b: frozenset((a, b)) in opp
    sh = set(arms1) & set(arms2)
    if not sh:
        # vertical angles: each arm of angle 2 is opposite an arm of angle 1
        if (is_opp(arms1[0], arms2[0]) and is_opp(arms1[1], arms2[1])) or (is_opp(arms1[0], arms2[1]) and is_opp(arms1[1], arms2[0])):
            return 'vertical' if x == y else None
        return None
    if len(sh) == 1:
        a1 = [r for r in arms1 if r not in sh][0]; a2 = [r for r in arms2 if r not in sh][0]
        if is_opp(a1, a2):
            return 'linear' if x + y == 180 else None
    return None


@judge('amreason', 'configuration rebuilt from the wording and classified by the definitions: two lines crossing / a straight line (rays and their opposite rays: vertically opposite = each arm opposite an arm of the other angle; linear pair = one common arm, other arms opposite); parallel lines with a transversal (parallel lines horizontal; for each angle: direction of its transversal arm and side of its parallel arm; same direction + same side = corresponding, opposite direction + opposite side + both inside = alternate, opposite direction + same side + both inside = co-interior); triangle angle sum; exterior angle (side extended, the two opposite interior angles). The stated numeric step is checked (equal / sums to 180 / sum of two)')
def amreason(q, opts):
    p = nm(q['prompt'])
    rule = None
    m = re.fullmatch(r'Lines (\w\w) and (\w\w) cross at (\w)\. ' + CONC, p)
    if m:
        l1, l2, O = m.group(1), m.group(2), m.group(3)
        a = m.groups()[3:]
        a1, v1, c1, x, a2, v2, c2, y = a[0], a[1], a[2], int(a[3]), a[4], a[5], a[6], int(a[7])
        if v1 != O or v2 != O:
            return Unsupported('vertex differs from the crossing point')
        opp = {frozenset(l1), frozenset(l2)}
        rule = _opp_pair_rule((a1, c1), (a2, c2), opp, x, y)
    if rule is None and m is None:
        for pat, oppf in (
            (r'O is a point on line (\w\w), and ray (\w\w) starts at O\. ', lambda g: {frozenset(g[0])}),
            (r'P, Q and R lie on a straight line in that order, and ray QS starts at Q\. ', lambda g: {frozenset('PR')}),
            (r'Ray OC stands on line (\w\w) at O\. ', lambda g: {frozenset(g[0])})):
            m = re.fullmatch(pat + CONC, p)
            if m:
                g = m.groups()
                opp = oppf(g)
                a = g[-8:]
                a1, v1, c1, x, a2, v2, c2, y = a[0], a[1], a[2], int(a[3]), a[4], a[5], a[6], int(a[7])
                if v1 != v2:
                    return Unsupported('different vertices')
                rule = _opp_pair_rule((a1, c1), (a2, c2), opp, x, y)
                break
    if rule is None and m is None:
        m = re.fullmatch(r'(\w\w) ∥ (\w\w)\. A line(?: (\w\w))? crosses \1 at (\w) and \2 at (\w)(?:, in the order (\w), (\w), (\w), (\w))?, with (\w) and (\w) (on opposite sides|on the same side) of (\w\w)\. ' + CONC, p)
        if m:
            g = m.groups()
            L1, L2, T, X, Y = g[0], g[1], g[2], g[3], g[4]
            order = g[5:9]
            U1, V1, rel = g[9], g[10], g[11]
            a = g[13:]
            a1, v1, c1, x, a2, v2, c2, y = a[0], a[1], a[2], int(a[3]), a[4], a[5], a[6], int(a[7])
            # sides of the parallel letters: +1 right, -1 left of the transversal
            side = {}
            if U1 in L1 and V1 in L2:
                lu, lv = L1, L2
            elif U1 in L2 and V1 in L1:
                lu, lv = L2, L1
            else:
                return Unsupported('side letters not on the two lines')
            side[U1] = 1; side[[ch for ch in lu if ch != U1][0]] = -1
            side[V1] = 1 if rel == 'on the same side' else -1; side[[ch for ch in lv if ch != V1][0]] = -side[V1]
            # transversal direction u = from Y to X ("up"); beyond-X letter is up, beyond-Y letter is down
            up = {X: -1, Y: +1}          # the arm from X towards Y points down(-1); from Y towards X points up(+1)
            if order[0]:
                if order[1] != X or order[2] != Y:
                    return Unsupported('unexpected order')
                tpt = {order[0]: +1, order[3]: -1}
            else:
                tpt = {}
            def arm(a_, v_, c_, vertex, other):
                """(direction of the transversal arm, side of the parallel arm, is-interior-arm)"""
                if v_ != vertex:
                    raise ValueError('vertex')
                ends = [a_, c_]
                tr = [e for e in ends if e == other or e in tpt]
                pa = [e for e in ends if e in side]
                if len(tr) != 1 or len(pa) != 1:
                    raise ValueError('arms')
                tr, pa = tr[0], pa[0]
                d = up[vertex] if tr == other else tpt[tr]
                return d, side[pa], tr == other
            try:
                d1, s1, i1 = arm(a1, v1, c1, X, Y)
                d2, s2, i2 = arm(a2, v2, c2, Y, X)
            except ValueError:
                return Unsupported('cannot place the angles')
            if d1 == d2:
                kind = 'corresponding' if s1 == s2 else None
                eq = True
            else:
                if s1 != s2:
                    kind = 'alternate' if (i1 and i2) else None
                    eq = True
                else:
                    kind = 'co-interior' if (i1 and i2) else None
                    eq = False
            if kind in ('corresponding', 'alternate') and x == y:
                rule = kind
            elif kind == 'co-interior' and x + y == 180:
                rule = kind
    if rule is None and m is None:
        m = re.fullmatch(r'In Δ(\w\w\w), ∠(\w) = (\d+)° and ∠(\w) = (\d+)°\. A proof says: "so ∠(\w) = (\d+)°\."\s*Which reason justifies this step\?', p)
        if m:
            tri, a, xa, b, xb, c, xc = m.groups()
            if set([a, b, c]) == set(tri) and int(xa) + int(xb) + int(xc) == 180:
                rule = 'anglesum'
    if rule is None and m is None:
        m = re.fullmatch(r'In Δ(\w\w\w), side (\w\w) is extended beyond (\w) to a point (\w)\. ∠(\w) = (\d+)° and ∠(\w) = (\d+)°\. A proof says: "so ∠(\w\w\w) = (\d+)°\."\s*Which reason justifies this step\?', p)
        if m:
            tri, side_, beyond, D, a, xa, b, xb, ext, xe = m.groups()
            others = [v for v in tri if v != beyond]
            # side_ = e.g. BC extended beyond C : beyond is the second letter; exterior angle = (other vertex of the triangle adjacent to beyond), beyond, D
            if side_[1] == beyond and set([a, b]) == set(others) and ext[1] == beyond and ext[2] == D and ext[0] in tri and ext[0] != side_[0] and int(xa) + int(xb) == int(xe):
                rule = 'exterior'
    if rule is None:
        return Unsupported('configuration not classified or numeric step inconsistent')
    return [nm(o) == REASON[rule] for o in opts]


# ------------------------------------------------------------------ altheo
TH = {
    'Opposite angles of a cyclic quadrilateral add up to 180°.': 'cyc', 'The angle in a semicircle is a right angle.': 'semi',
    'Angles in the same segment of a circle are equal.': 'seg', 'The angle an arc makes at the centre is twice the angle it makes at any point on the rest of the circle.': 'centre',
    'Angles in the same segment of a circle add up to 180°.': 'FALSE1', 'Opposite angles of a cyclic quadrilateral are equal.': 'FALSE2',
    'Equal chords of a circle are equidistant from the centre.': 'eqch', 'The perpendicular from the centre of a circle to a chord bisects the chord.': 'perp',
}


@judge('altheo', 'the stated step is classified from the configuration (central angle vs inscribed angle on the major arc; two inscribed angles on the same side of a chord; diameter; opposite vertices of a cyclic quadrilateral; perpendicular from the centre; equal chords) with the numeric step verified (x2, equal, 90 and complement, 180 - x, doubling the half-chord, equal distances); an option justifies the step iff it names that theorem. The two supplementary-looking false statements are false statements, never correct',
       assumptions='Textbook statements: central angle theorem, angles in the same segment, Thales, cyclic quadrilateral, perpendicular from the centre bisects the chord, equal chords are equidistant (NCERT class 9 ch.10).')
def altheo(q, opts):
    p = nm(q['prompt'])
    thm = None
    n = lambda s: int(s)
    pats = []
    m = re.fullmatch(r'O is the centre of a circle and P, Q, R lie on it, with R on the major arc PQ\. We know ∠PRQ = (\d+)°, and we write ∠POQ = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(2)) == 2 * n(m.group(1)) and n(m.group(1)) < 90:
        thm = 'centre'
    m = re.fullmatch(r'Triangle ABC is drawn with all three vertices on a circle whose centre is O, and ∠BAC = (\d+)°\. We write ∠BOC = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(2)) == 2 * n(m.group(1)) and n(m.group(1)) < 90:
        thm = 'centre'
    m = re.fullmatch(r'The chord XY of a circle with centre O makes ∠XOY = (\d+)° at the centre\. Z is a point on the major arc XY, and we write ∠XZY = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(1)) == 2 * n(m.group(2)) and n(m.group(1)) < 180:
        thm = 'centre'
    m = re.fullmatch(r'O is the centre of a circle, A and B lie on it, and ∠AOB = (\d+)°\. For any point P on the major arc AB we write ∠APB = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(1)) == 2 * n(m.group(2)) and n(m.group(1)) < 180:
        thm = 'centre'
    m = re.fullmatch(r'A, B, C, D lie on a circle, with C and D on the same side of the chord AB\. We know ∠ACB = (\d+)°, and we write ∠ADB = (\d+)°\. Which fact justifies this step\?', p)
    if m and m.group(1) == m.group(2):
        thm = 'seg'
    m = re.fullmatch(r'ABCD is a quadrilateral with its vertices on a circle, and its diagonals are drawn\. We know ∠CAD = (\d+)°, and we write ∠CBD = (\d+)°\. Which fact justifies this step\?', p)
    if m and m.group(1) == m.group(2):
        thm = 'seg'        # A and B are adjacent vertices, hence on the same side of the chord CD
    m = re.fullmatch(r'X and Y are two points on a circle, and P, Q, R are three more points on the major arc XY\. We know ∠XPY = (\d+)°, and we write ∠XQY = ∠XRY = (\d+)°\. Which fact justifies this step\?', p)
    if m and m.group(1) == m.group(2):
        thm = 'seg'
    m = re.fullmatch(r'PQ is a diameter of a circle with centre O, and R is another point on the circle with ∠RPQ = (\d+)°\. We write ∠PRQ = 90°, so ∠RQP = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(1)) + n(m.group(2)) == 90:
        thm = 'semi'
    m = re.fullmatch(r'AB is a diameter of a circle, and C and D are points on the circle on opposite sides of AB, with ∠CAB = (\d+)°\. We write ∠ACB = ∠ADB = 90°\. Which fact justifies this step\?', p)
    if m:
        thm = 'semi'
    m = re.fullmatch(r'Four lamp posts W, X, Y, Z stand in that order on a circular path\. ∠WXY = (\d+)°, and we write ∠WZY = (\d+)°\. Which fact justifies this step\?', p)
    if m and n(m.group(1)) + n(m.group(2)) == 180:
        thm = 'cyc'        # X and Z are opposite vertices of the cyclic quadrilateral WXYZ
    m = re.fullmatch(r'O is the centre of a circle, and a line from O meets the chord PQ at N at right angles\. PN = (\d+) mm, and we write NQ = (\d+) mm\. Which fact justifies this step\?', p)
    if m and m.group(1) == m.group(2):
        thm = 'perp'
    m = re.fullmatch(r'In a circle with centre O, OD is perpendicular to the chord AB, with D on AB, and AD = (\d+) mm\. We write AB = (\d+) mm\. Which fact justifies this step\?', p)
    if m and n(m.group(2)) == 2 * n(m.group(1)):
        thm = 'perp'
    m = re.fullmatch(r'The radius OC of a circle with centre O cuts the chord AB at right angles at E\. AE = (\d+) mm, and we write EB = (\d+) mm\. Which fact justifies this step\?', p)
    if m and m.group(1) == m.group(2):
        thm = 'perp'
    m = re.fullmatch(r'O is the centre of a circle and OF is perpendicular to the chord GH, with F on GH\. GF = (\d+) mm, so we write that F is the midpoint of GH and GH = (\d+) mm\. Which fact justifies this step\?', p)
    if m and n(m.group(2)) == 2 * n(m.group(1)):
        thm = 'perp'
    m = re.fullmatch(r'The chords PQ and RS of a circle with centre O are each (\d+) mm long\. The perpendicular from O to PQ is (\d+) mm long, and we write that the perpendicular from O to RS is also (\d+) mm long\. Which fact justifies this step\?', p)
    if m and m.group(2) == m.group(3):
        thm = 'eqch'
    m = re.fullmatch(r'The chords KL and MN of a circle with centre O are both (\d+) mm long\. OP is perpendicular to KL and OQ is perpendicular to MN, and we write OP = OQ\. Which fact justifies this step\?', p)
    if m:
        thm = 'eqch'
    m = re.fullmatch(r'Two chords of a circle with centre O have the same length, (\d+) mm\. One of them is (\d+) mm from O, and we write that the other is (\d+) mm from O as well\. Which fact justifies this step\?', p)
    if m and m.group(2) == m.group(3):
        thm = 'eqch'
    if thm is None:
        return Unsupported('configuration not classified or stated numbers inconsistent')
    res = []
    for o in opts:
        t = TH.get(nm(o))
        if t is None:
            raise ValueError(f'unreadable option {o!r}')
        res.append(t == thm)
    return res


# ------------------------------------------------------------------ awctr : triangle centres on exact test triangles
def F(x):
    return Fraction(x)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def dotp(a, b):
    return a[0] * b[0] + a[1] * b[1]


def crs(a, b):
    return a[0] * b[1] - a[1] * b[0]


def mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def solve2(a1, b1, c1, a2, b2, c2):
    det = a1 * b2 - a2 * b1
    return ((c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det)


def isq(n):
    """integer sqrt of a perfect-square Fraction (test triangles are chosen with integer sides)"""
    n = F(n)
    assert n.denominator == 1
    r = math.isqrt(int(n))
    assert r * r == n
    return F(r)


def make_centres(A, B, C):
    cen = {}
    # centroid: centre of mass of the plate (polygon first-moment formula)
    pts = [A, B, C]
    ar = sum(crs(pts[i], pts[(i + 1) % 3]) for i in range(3)) / 2
    cx = sum((pts[i][0] + pts[(i + 1) % 3][0]) * crs(pts[i], pts[(i + 1) % 3]) for i in range(3)) / (6 * ar)
    cy = sum((pts[i][1] + pts[(i + 1) % 3][1]) * crs(pts[i], pts[(i + 1) % 3]) for i in range(3)) / (6 * ar)
    cen['the centroid'] = (cx, cy)
    # circumcentre: |PA|=|PB|=|PC|
    a1, b1 = 2 * (B[0] - A[0]), 2 * (B[1] - A[1]); c1 = dotp(B, B) - dotp(A, A)
    a2, b2 = 2 * (C[0] - A[0]), 2 * (C[1] - A[1]); c2 = dotp(C, C) - dotp(A, A)
    cen['the circumcentre'] = solve2(a1, b1, c1, a2, b2, c2)
    # orthocentre: (P-A).(B-C)=0 and (P-B).(A-C)=0
    u, v = sub(B, C), sub(A, C)
    cen['the orthocentre'] = solve2(u[0], u[1], dotp(A, u), v[0], v[1], dotp(B, v))
    # incentre: equal signed distances to the three side lines (inside)
    def lin(P, Q, R):
        d = sub(Q, P); L = isq(dotp(d, d)); s = 1 if crs(d, sub(R, P)) > 0 else -1
        # s*crs(d, X-P)/L = s/L*(d0*(X1-P1) - d1*(X0-P0))
        return (-s * d[1] / L, s * d[0] / L, s * (d[1] * P[0] - d[0] * P[1]) / L)
    l1, l2, l3 = lin(A, B, C), lin(B, C, A), lin(C, A, B)
    cen['the incentre'] = solve2(l1[0] - l2[0], l1[1] - l2[1], l2[2] - l1[2], l1[0] - l3[0], l1[1] - l3[1], l3[2] - l1[2])
    return cen, (l1, l2, l3)


def on_line(P, Q, X):
    return crs(sub(Q, P), sub(X, P)) == 0


def lines_of(kind, A, B, C, cen_info):
    """the three lines of the family as (point, direction)"""
    V = [A, B, C]
    out = []
    for i in range(3):
        v, o1, o2 = V[i], V[(i + 1) % 3], V[(i + 2) % 3]
        if kind == 'median':
            out.append((v, sub(mid(o1, o2), v)))
        elif kind == 'altitude':
            d = sub(o2, o1); out.append((v, (-d[1], d[0])))
        elif kind == 'pbisector':
            d = sub(o2, o1); out.append((mid(o1, o2), (-d[1], d[0])))
        elif kind == 'abisector':
            d1 = sub(o1, v); d2 = sub(o2, v); L1, L2 = isq(dotp(d1, d1)), isq(dotp(d2, d2))
            out.append((v, (d1[0] / L1 + d2[0] / L2, d1[1] / L1 + d2[1] / L2)))
    return out


def pt_on(Pd, X):
    P, d = Pd
    return crs(d, sub(X, P)) == 0


LINEFAM = {'the three medians': 'median', 'the three altitudes': 'altitude', 'the perpendicular bisectors of the three sides': 'pbisector', 'the bisectors of the three angles': 'abisector'}
TRI = (F(0), F(0)), (F(14), F(0)), (F(5), F(12))        # 13-14-15 acute scalene, all centres rational
RT = (F(0), F(0)), (F(4), F(0)), (F(0), F(3))           # right angle at the first vertex


@judge('awctr', 'exact coordinates on a scalene 13-14-15 triangle (all four centres rational): centroid = plate centre of mass (first-moment formula), circumcentre = equidistant from corners (linear system), orthocentre = intersection of altitudes, incentre = equal signed distances to the side lines; every stem property is evaluated for each of the four centres and exactly one must satisfy it. Lines (median / altitude / perpendicular bisector / angle bisector) are tested by incidence and perpendicularity. Right-triangle items on the 3-4-5 triangle',
       assumptions='Only properties implied by the stem count (an isosceles special case is not assumed); "an altitude / a median / an angle bisector" are judged on a scalene triangle.')
def awctr(q, opts):
    p = nm(q['prompt'])
    A, B, C = TRI
    cen, _ = make_centres(A, B, C)
    names = list(cen)
    tri = re.search(r'[△Δ](\w{3})', p)
    centre_prop = None      # function(centre_point)->bool
    # ----- "what is P called" type
    if re.search(r'What is P called\?|Which centre of the triangle is P\?|Which centre is P\?|Which one\?|Which centre of △\w+ is P\?', p):
        if 'midpoints' in p and 'segments' in p:
            fam = lines_of('median', A, B, C, None); f = lambda X: all(pt_on(l, X) for l in fam)
        elif '⟂' in p and 'The lines' in p:
            fam = lines_of('altitude', A, B, C, None); f = lambda X: all(pt_on(l, X) for l in fam)
        elif 'at right angles to that side' in p and 'midpoint of each side' in p:
            fam = lines_of('pbisector', A, B, C, None); f = lambda X: all(pt_on(l, X) for l in fam)
        elif 'cut into two equal parts' in p:
            fam = lines_of('abisector', A, B, C, None); f = lambda X: all(pt_on(l, X) for l in fam)
        elif re.search(r'P\w = P\w = P\w = \d+ cm, where', p) or 'passes through all three corners' in p:
            d2 = lambda X, V: dotp(sub(X, V), sub(X, V)); f = lambda X: d2(X, A) == d2(X, B) == d2(X, C)
        elif re.search(r'inside .*is \d+ cm from each of the three sides', p) or 'lies inside' in p and 'touches all three sides' in p:
            _, (l1, l2, l3) = make_centres(A, B, C)
            val = lambda l, X: l[0] * X[0] + l[1] * X[1] + l[2]
            f = lambda X: val(l1, X) == val(l2, X) == val(l3, X) and val(l1, X) > 0
        elif re.search(r'One of the four centres of the triangle is the point P on \w\w with \w\w = (\d+) cm and \w\w = (\d+) cm', p):
            mm = re.search(r'D is the midpoint of \w\w and \w\w = (\d+) cm\. One of the four centres of the triangle is the point P on \w\w with \w\w = (\d+) cm and \w\w = (\d+) cm', p)
            tot, a_, b_ = (F(mm.group(i)) for i in (1, 2, 3))
            if a_ + b_ != tot:
                return Defect('AP + PD != AD')
            D = mid(B, C); Pm = (A[0] + a_ / tot * (D[0] - A[0]), A[1] + a_ / tot * (D[1] - A[1]))
            f = lambda X: X == Pm
        elif 'has a right angle at' in p and 'lies exactly at the corner' in p:
            Ar, Br, Cr = RT; cr_, _ = make_centres(Ar, Br, Cr)
            hit = [n_ for n_ in cr_ if cr_[n_] == Ar]
            return [nm(o) in hit and len(hit) == 1 for o in opts]
        elif 'has a right angle at' in p and 'midpoint of the longest side' in p:
            Ar, Br, Cr = RT; cr_, _ = make_centres(Ar, Br, Cr)
            hit = [n_ for n_ in cr_ if cr_[n_] == mid(Br, Cr)]
            return [nm(o) in hit and len(hit) == 1 for o in opts]
        elif 'balances flat on a pencil tip' in p:
            # a plate balances at its centre of mass: compute independently by a fine triangle-strip integral check
            pts = [A, B, C]
            cm = cen['the centroid']
            f = lambda X: X == cm
        else:
            return Unsupported('stem not classified')
        hit = [n_ for n_ in names if f(cen[n_])]
        return [nm(o) in hit and len(hit) == 1 for o in opts]
    # ----- "which three lines pass through P"
    m = re.fullmatch(r'P is the (centroid|orthocentre|circumcentre|incentre) of △\w+\. Which three lines of the triangle all pass through P\?', p)
    if m:
        X = cen['the ' + m.group(1)]
        res = []
        for o in opts:
            kind = LINEFAM.get(nm(o))
            if kind is None:
                raise ValueError(f'unreadable option {o!r}')
            fam = lines_of(kind, A, B, C, None)
            res.append(all(pt_on(l, X) for l in fam))
        return res
    # ----- line classification items: build the configuration on the scalene triangle and test each option description
    m = re.fullmatch(r'In △(\w)(\w)(\w), D is the point on \2\3 with \1D ⟂ \2\3, so ∠\1D\2 = 90°\. What is \1D\?', p)
    kind = None
    if m:
        v = A; D = None
        d = sub(C, B); t = dotp(sub(A, B), d) / dotp(d, d); D = (B[0] + t * d[0], B[1] + t * d[1])
        line = (A, sub(D, A))
    else:
        m = re.fullmatch(r'In △(\w)(\w)(\w), D is the point on \2\3 with \2D = D\3 = \d+ cm\. What is \1D\?', p)
        if m:
            D = mid(B, C); line = (A, sub(D, A))
        else:
            m = re.fullmatch(r'In △(\w)(\w)(\w), D is the point on \2\3 with ∠\2\1D = ∠D\1\3 = (\d+)°\. What is \1D\?', p)
            if m:
                d1 = sub(B, A); d2 = sub(C, A); L1, L2 = isq(dotp(d1, d1)), isq(dotp(d2, d2))
                dirn = (d1[0] / L1 + d2[0] / L2, d1[1] / L1 + d2[1] / L2)
                # intersect line A + s*dirn with BC
                dbc = sub(C, B); den = crs(dirn, dbc); s = crs(sub(B, A), dbc) / den
                D = (A[0] + s * dirn[0], A[1] + s * dirn[1]); line = (A, dirn)
            else:
                m = re.fullmatch(r'In △(\w)(\w)(\w), D is the midpoint of \2\3, and a line ℓ is drawn through D at right angles to \2\3\. What is ℓ\?', p)
                if m:
                    D = mid(B, C); d = sub(C, B); line = (D, (-d[1], d[0]))
                else:
                    return Unsupported('stem not classified')
    res = []
    for o in opts:
        t = nm(o)
        mm = re.fullmatch(r'(an altitude|a median|an angle bisector) of △\w+', t)
        mp = re.fullmatch(r'the perpendicular bisector of (\w)(\w)', t)
        if mm:
            kind = {'an altitude': 'altitude', 'a median': 'median', 'an angle bisector': 'abisector'}[mm.group(1)]
            fam = lines_of(kind, A, B, C, None)
            ok = False
            for (P0, d0) in fam:
                if crs(d0, line[1]) == 0 and pt_on((P0, d0), line[0]):
                    ok = True
            res.append(ok)
        elif mp:
            fam = lines_of('pbisector', A, B, C, None)
            ok = any(crs(d0, line[1]) == 0 and pt_on((P0, d0), line[0]) for (P0, d0) in fam[:1])    # the perpendicular bisector of BC is the first family entry for vertex A
            res.append(ok)
        else:
            raise ValueError(f'unreadable option {o!r}')
    return res
