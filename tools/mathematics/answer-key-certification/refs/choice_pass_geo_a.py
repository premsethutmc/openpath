"""choice-pass-geo, part A: elementary geometry / spatial-reasoning / vocabulary choice families.
Independent of the generators; the stored letter is never read here. Each judge decides, option by option, whether the option is correct
from the statement and figure, using the certifier's own definitions (stated in the judge docstring/method)."""
import itertools
import math
import re
from fractions import Fraction

from .choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, judge, nm

DIRS8 = ['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West']   # clockwise, 45 degrees apart


# ------------------------------------------------------------------ aawhere
@judge('aawhere', 'inside/outside: point-in-square from the segments of the figure (strict inequalities, boundary points rejected); nearest/farthest: Euclidean distance from the house point of the figure; queue: position in the figure row (front = first)')
def aawhere(q, opts):
    p, fig = q['prompt'], q['figure']
    if p.startswith('The square in the picture is a fence'):
        xs = sorted({s[0][0] for s in fig['segments']} | {s[1][0] for s in fig['segments']}); ys = sorted({s[0][1] for s in fig['segments']} | {s[1][1] for s in fig['segments']})
        if len(xs) != 2 or len(ys) != 2 or xs[1] - xs[0] != ys[1] - ys[0]:
            return Defect('fence is not an axis-parallel square')
        st = {}
        for x, y, name in fig['points']:
            inside_closed = xs[0] <= x <= xs[1] and ys[0] <= y <= ys[1]
            on_edge = inside_closed and (x in xs or y in ys)
            if on_edge:
                return Defect(f'animal {name} on the fence line')
            st[name] = inside_closed
        want_in = 'is inside the fence' in p
        if not want_in and 'is outside the fence' not in p:
            return Unsupported('unparsed prompt')
        return [(st[nm(o)] if want_in else not st[nm(o)]) if nm(o) in st else False for o in opts]
    if p.startswith('In the picture, the house is at the left end'):
        pts = {n: (x, y) for x, y, n in fig['points']}
        h = pts['house']
        others = {n: v for n, v in pts.items() if n != 'house'}
        d = {n: Fraction((v[0] - h[0]) ** 2 + (v[1] - h[1]) ** 2) for n, v in others.items()}
        if any(v[0] <= h[0] for v in others.values()):
            return Defect('house is not at the left end')
        if 'nearest to the house' in p:
            best = min(d.values()); return [d.get(nm(o)) == best and list(d.values()).count(best) == 1 for o in opts]
        if 'farthest from the house' in p:
            best = max(d.values()); return [d.get(nm(o)) == best and list(d.values()).count(best) == 1 for o in opts]
        return Unsupported('unparsed prompt')
    m = re.fullmatch(r'Children stand in a queue at the ticket counter, as in the picture\. The child at the front is next to the counter\. Who stands just (in front of|behind) (\w+)\?', p)
    if m:
        order = [c for c in fig['rows'][0][1:]]
        if fig['head'][1] != 'front of the queue' or fig['head'][-1] != 'back of the queue':
            return Defect('figure does not mark front/back as the prompt says')
        i = order.index(m.group(2))
        j = i - 1 if m.group(1) == 'in front of' else i + 1
        if not (0 <= j < len(order)):
            return Defect('nobody there')
        return [nm(o) == order[j] for o in opts]
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ abdir
@judge('abdir', 'compass headings as angles clockwise from North (N=0,E=90,S=180,W=270); right = +90, left = -90, half turn = 180 (mod 360)')
def abdir(q, opts):
    pr = q['prompt']
    m = re.fullmatch(r'(\w+) stands facing (North|East|South|West)\. Which direction is (on \1\'s left|on \1\'s right|behind \1|in front of \1)\?', pr)
    if m:
        start = {'North': 0, 'East': 90, 'South': 180, 'West': 270}[m.group(2)]
        d = {'on': None}
        k = m.group(3)
        off = -90 if k.endswith('left') else 90 if k.endswith('right') else 180 if k.startswith('behind') else 0
        ans = {0: 'North', 90: 'East', 180: 'South', 270: 'West'}[(start + off) % 360]
        return [nm(o) == ans for o in opts]
    fig = q.get('figure') or {}
    if pr.startswith('In the map, North is at the top.') and fig.get('type') == 'plane':
        pts = {n: (x, y) for x, y, n in fig['points']}
        def dirof(a, b):
            dx, dy = pts[b][0] - pts[a][0], pts[b][1] - pts[a][1]
            if dx == 0 and dy > 0: return 'North'
            if dx == 0 and dy < 0: return 'South'
            if dy == 0 and dx > 0: return 'East'
            if dy == 0 and dx < 0: return 'West'
            return None
        m = re.fullmatch(r'In the map, North is at the top\. Which place is to the (North|East|South|West) of the ([\w ]+)\?', pr)
        if m:
            ref = m.group(2)
            cand = [n for n in pts if n != ref and dirof(ref, n) == m.group(1)]
            if len(cand) != 1:
                return Defect(f'{len(cand)} places lie {m.group(1)} of {ref}')
            return [nm(o) == cand[0] for o in opts]
        m = re.fullmatch(r'In the map, North is at the top\. In which direction is the ([\w ]+) from the ([\w ]+)\?', pr)
        if m:
            d = dirof(m.group(2), m.group(1))
            if d is None:
                return Defect('not exactly on a compass axis')
            return [nm(o) == d for o in opts]
    m = re.fullmatch(r'(\w+) faces (North|East|South|West) and turns (right|left|right round to face the other way) \((?:a )?(quarter|half) turn\)\. Which way does \1 face now\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    start = {'North': 0, 'East': 90, 'South': 180, 'West': 270}[m.group(2)]
    d = {'right': 90, 'left': -90, 'right round to face the other way': 180}[m.group(3)]
    if (m.group(4) == 'half') != (m.group(3).startswith('right round')):
        return Defect('turn size and wording disagree')
    ans = {0: 'North', 90: 'East', 180: 'South', 270: 'West'}[(start + d) % 360]
    return [nm(o) == ans for o in opts]


# ------------------------------------------------------------------ afface
FRAC = {'one eighth of a full turn': 1, 'a quarter turn': 2, 'three eighths of a full turn': 3, 'a half turn': 4, 'five eighths of a full turn': 5, 'a three-quarter turn': 6, 'seven eighths of a full turn': 7}


@judge('afface', 'eight compass points clockwise 45 degrees apart; one eighth turn = 45 degrees; anticlockwise subtracts, clockwise adds (mod 360); figure start marker checked against the prompt')
def afface(q, opts):
    m = re.fullmatch(r'(\w+) is facing ([\w-]+) and makes (.+?) (anticlockwise|clockwise)\. Which direction is \1 facing now\?', q['prompt'])
    if not m:
        return Unsupported('unparsed prompt')
    st = DIRS8.index(m.group(2).replace('North-East', 'North-East'))
    k = FRAC[m.group(3)]
    ang = (st * 45 + (-45 * k if m.group(4) == 'anticlockwise' else 45 * k)) % 360
    ans = DIRS8[ang // 45]
    ab = {'N': 'North', 'NE': 'North-East', 'E': 'East', 'SE': 'South-East', 'S': 'South', 'SW': 'South-West', 'W': 'West', 'NW': 'North-West'}
    cells = [c for c in q['figure']['head']] + [c for r in q['figure']['rows'] for c in r]
    starts = [c for c in cells if '(start)' in c]
    if len(starts) != 1 or ab[starts[0].replace(' (start)', '')] != m.group(2):
        return Defect('figure start marker differs from the prompt')
    return [nm(o) == ans for o in opts]


# ------------------------------------------------------------------ aeangk
@judge('aeangk', 'acute 0<a<90, right a=90, obtuse 90<a<180, straight a=180, reflex 180<a<360; angle read from the statement or from the sector of the figure')
def aeangk(q, opts):
    m = re.fullmatch(r'An angle measures (\d+)°\. What kind of angle is it\?', q['prompt'])
    if m:
        a = int(m.group(1))
    elif q['prompt'] == 'What kind of angle is the shaded angle at the centre of the circle in the picture?' and q.get('figure', {}).get('sector') is not None:
        a = q['figure']['sector']
    else:
        return Unsupported('unparsed prompt')
    if not 0 < a < 360:
        return Defect('angle outside (0,360)')
    k = 'acute' if a < 90 else 'right' if a == 90 else 'obtuse' if a < 180 else 'straight' if a == 180 else 'reflex'
    return [nm(o) == k for o in opts]


# ------------------------------------------------------------------ aearms
@judge('aearms', 'angle ABC: vertex is the middle letter; its arms are the two rays from the vertex through the end letters (a line segment is not an arm); clock turns: size = 30 degrees per hour mark, arm length does not change an angle')
def aearms(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'Which point is the vertex of ∠([A-Z])([A-Z])([A-Z])\?', p)
    if m:
        return [nm(o) == m.group(2) for o in opts]
    m = re.fullmatch(r'What are the arms of ∠([A-Z])([A-Z])([A-Z])\?', p)
    if m:
        a, v, c = m.groups(); res = []
        for o in opts:
            mo = re.fullmatch(r'the rays ([A-Z])([A-Z]) and ([A-Z])([A-Z])', nm(o))
            res.append(bool(mo) and mo.group(1) == v and mo.group(3) == v and {mo.group(2), mo.group(4)} == {a, c})
        return res
    m = re.fullmatch(r'∠([A-Z]) is the turn made by the minute hand of a clock moving from (\d+) to (\d+)\. ∠([A-Z]) is drawn with arms twice as long, and is the turn of the hand moving from (\d+) to (\d+)\. If ∠\1 is placed on top of ∠\4 with the vertices and one arm together, which is true\?', p)
    if m:
        x, y = m.group(1), m.group(4)
        sx = ((int(m.group(3)) - int(m.group(2))) % 12) * 30; sy = ((int(m.group(6)) - int(m.group(5))) % 12) * 30
        if sx == 0 or sy == 0:
            return Defect('zero angle')
        res = []
        for o in opts:
            t = nm(o)
            res.append((t == 'They are the same size' and sx == sy) or (t == f'∠{x} is bigger' and sx > sy) or (t == f'∠{y} is bigger' and sy > sx))
        return res
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ aecpart
@judge('aecpart', 'standard definitions: centre = the point equidistant from all points of the circle; radius = centre to a point of the circle; chord = segment with both ends on the circle; diameter = chord through the centre; arc = curved part; sector = region between two radii and an arc; segment = region between a chord and an arc. A diameter is also a chord: if both are offered the item is multiply correct and is flagged')
def aecpart(q, opts):
    p = nm(q['prompt'])
    truth = None
    if re.search(r'What is the name for the point \w, which is the same distance from every point on the circle\?', p):
        truth = {'the centre'}
    elif re.search(r'line segment \w\w, which joins the centre \w to the point \w on the circle\?', p):
        truth = {'a radius'}
    elif re.search(r'line segment \w\w, which joins two points \w and \w on the circle and passes through the centre \w\?', p):
        truth = {'a diameter', 'a chord'}
    elif re.search(r'line segment \w\w, which joins two points \w and \w on the circle but does not pass through the centre \w\?', p):
        truth = {'a chord'}
    elif re.search(r'name for the curved part of the circle from \w to \w\?', p):
        truth = {'an arc'}
    elif re.search(r'region inside the circle bounded by the two radii \w\w, \w\w and the curved part of the circle from \w to \w\?', p):
        truth = {'a sector'}
    elif re.search(r'region inside the circle between the straight line segment \w\w \(which does not pass through the centre\) and the curved part of the circle from \w to \w\?', p):
        truth = {'a segment'}
    if truth is None:
        return Unsupported('unparsed prompt')
    return [nm(o) in truth for o in opts]


# ------------------------------------------------------------------ aemirror
VSYM = set('AHIMOTUVWXY')      # unchanged by a left-right flip (sans-serif capitals)
HSYM = set('BCDEHIKOX')        # unchanged by an up-down flip


@judge('aemirror', 'standing mirror beside the card = left-right flip: word is unchanged iff every letter is left-right symmetric (A H I M O T U V W X Y) and the word reads the same reversed; still-water reflection = up-down flip: order unchanged, unchanged iff every letter is up-down symmetric (B C D E H I K O X). Letter symmetry sets are the certifier\'s own sans-serif glyph table')
def aemirror(q, opts):
    p = q['prompt']
    if 'mirror standing straight up beside it' in p:
        return [all(c in VSYM for c in nm(o)) and nm(o) == nm(o)[::-1] for o in opts]
    if 'still water below shows its reflection upside down' in p:
        return [all(c in HSYM for c in nm(o)) for o in opts]
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ aertang
CLOCK = {}


def clock_angle(h):
    a = (h % 12) * 30            # hour hand degrees from 12; minute hand at 12
    return min(a, 360 - a)


OBJ = {   # corner / angle sizes of everyday objects (certifier's table)
    'the corner of a notebook page': 90, 'the corner of a postcard': 90, 'the corner of a blackboard': 90, 'the corner of a classroom door': 90,
    'the corner of a square floor tile': 90, 'the corner of a matchbox': 90, 'the corner of a carrom board': 90, 'the corner where a wall meets the flat floor': 90,
    'an open book lying flat on a table': 180, 'the tip of a slice of a pizza cut into 8 equal slices': 45, 'a corner of a honeycomb cell': 120,
    'the point of a sharpened pencil': 30, 'a corner of a samosa': 60, 'the tip of a star in a rangoli': 36,
}


@judge('aertang', 'angle at the centre read from the figure sector (compare with 90); everyday objects: clock-hand angle = 30 degrees x hours (smaller angle), regular-polygon / rectangle corner angles; only angle = 90 is a right angle',
       assumptions='samosa corner taken as the 60 degree corner of an equilateral-triangle pastry, sharpened-pencil point taken as acute, rangoli star tip acute, open book flat = 180 degrees, honeycomb (regular hexagon) corner 120 degrees')
def aertang(q, opts):
    p = q['prompt']
    if p.startswith('Hold the corner of a folded paper'):
        a = q['figure']['sector']
        k = 'smaller than a right angle' if a < 90 else 'exactly a right angle' if a == 90 else 'bigger than a right angle'
        return [nm(o) == k for o in opts]
    if p == 'Which of these makes a right angle (a square corner)?':
        res = []
        for o in opts:
            t = nm(o)
            m = re.fullmatch(r"the hands of a clock at (\d+) o'clock", t)
            if m:
                res.append(clock_angle(int(m.group(1))) == 90)
            elif t in OBJ:
                res.append(OBJ[t] == 90)
            else:
                raise ValueError(f'unknown option {t!r}')
        return res
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ afcube : fold a net by rolling a die over it
def roll_net(cells):
    """cells: set of (r,c). Roll a die over the net; returns {cell: die-face id} if the six cells receive six different faces, else None.
    die faces in the starting frame: 0 bottom,1 top,2 north,3 south,4 east,5 west (opposite pairs: 0-1, 2-3, 4-5)."""
    if len(cells) != 6:
        return None
    start = min(cells)
    # orientation: tuple (bottom, top, north, south, east, west) = ids of the faces currently there
    ori0 = (0, 1, 2, 3, 4, 5)

    def roll(o, dr, dc):
        b, t, n, s, e, w = o
        if dr == -1:   # roll north
            return (n, s, t, b, e, w)
        if dr == 1:    # roll south
            return (s, n, b, t, e, w)
        if dc == 1:    # roll east
            return (e, w, n, s, t, b)
        return (w, e, n, s, b, t)   # roll west

    seen = {start: ori0}
    stack = [start]
    while stack:
        cur = stack.pop()
        for dr, dc in ((-1, 0), (1, 0), (0, 1), (0, -1)):
            nb = (cur[0] + dr, cur[1] + dc)
            if nb in cells and nb not in seen:
                seen[nb] = roll(seen[cur], dr, dc)
                stack.append(nb)
    if len(seen) != 6:
        return None
    face = {c: o[0] for c, o in seen.items()}
    if len(set(face.values())) != 6:
        return None
    return face


@judge('afcube', 'physical fold simulation: roll a die over the squares of the net (each cell receives the face of the die that touches it); a net is valid iff the six cells get six different faces; two cells are opposite iff their die faces are opposite (0-1, 2-3, 4-5)')
def afcube(q, opts):
    fig, p = q['figure'], q['prompt']
    rows = fig['rows']
    m = re.fullmatch(r'The picture shows a net of a cube with its six squares lettered\. When it is folded into a cube, which face is opposite face ([A-F])\?', p)
    if m:
        cells = {(r, c): v for r, row in enumerate(rows) for c, v in enumerate(row) if v}
        if sorted(cells.values()) != list('ABCDEF'):
            return Defect('figure does not hold the letters A-F once each')
        face = roll_net(set(cells))
        if face is None:
            return Defect('the shape in the figure is not a net of a cube')
        inv = {cells[c]: face[c] for c in cells}
        opp = lambda f: f ^ 1
        target = m.group(1)
        return [o in inv and o != target and inv[o] == opp(inv[target]) for o in map(nm, opts)]
    if p == 'The picture shows a shape made of six squares (■). Can it be folded along the lines into a cube, with no two squares overlapping?':
        cells = {(r, c) for r, row in enumerate(rows) for c, v in enumerate(row) if v == '■'}
        ok = roll_net(cells) is not None
        return [(nm(o).startswith('Yes') and ok) or (nm(o).startswith('No') and not ok) for o in opts]
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ afkind
NAME_IMPLIES = {   # name -> names that are also true of it (inclusive definitions, kite = at least one diagonal-symmetric pair of adjacent equal sides)
    'a square': {'a rectangle', 'a rhombus', 'a parallelogram', 'a kite'},
    'a rectangle': {'a parallelogram'},
    'a rhombus': {'a parallelogram', 'a kite'},
    'a parallelogram': set(), 'a kite': set(), 'a trapezium': set(),
}


@judge('afkind', 'read sides, parallel pairs and angles from the table; derive the set of true names from the definitions (parallelogram: two pairs parallel; rhombus: + four equal sides; rectangle: + a right angle; square: both; kite: two pairs of adjacent equal sides; trapezium: exactly one pair parallel); the best name is the true name that implies all other true names')
def afkind(q, opts):
    rows = {r[0]: r[1] for r in q['figure']['rows']}
    sides = dict(re.findall(r'([A-D][A-D]) = (\d+) cm', rows['Sides']))
    if set(sides) != {'AB', 'BC', 'CD', 'DA'}:
        return Unsupported('unparsed sides')
    s = {k: int(v) for k, v in sides.items()}
    par = rows['Parallel sides']
    if 'No two sides are parallel' in par:
        pairs = 0
    elif 'AB ∥ DC and AD ∥ BC' in par:
        pairs = 2
    elif 'only' in par:
        pairs = 1
    else:
        return Unsupported('unparsed parallel text')
    ang = rows['Angles']
    # right angle derivable?
    if pairs == 2:
        if ang == 'All four angles are 90°.' or ang == '∠A = 90°.':
            right = True
        elif ang == '∠A = ∠B = ∠C = ∠D.':
            right = True            # four equal angles sum to 360 -> each 90
        elif re.fullmatch(r'∠A = (\d+)°\.', ang):
            right = int(re.fullmatch(r'∠A = (\d+)°\.', ang).group(1)) == 90
        else:
            m = re.fullmatch(r'∠A = (?:∠C = )?(\d+)°, ∠B = (?:∠D = )?(\d+)°\.', ang)
            if not m:
                return Unsupported('unparsed angles')
            a, b = int(m.group(1)), int(m.group(2))
            if a + b != 180:
                return Defect('co-interior angles of a parallelogram must add to 180')
            right = a == 90
    else:
        right = False
    allsides = len(set(s.values())) == 1
    opp = s['AB'] == s['CD'] and s['BC'] == s['DA']
    adj = (s['AB'] == s['BC'] and s['CD'] == s['DA']) or (s['AB'] == s['DA'] and s['BC'] == s['CD'])
    true = set()
    if pairs == 2:
        if not opp:
            return Defect('parallelogram with unequal opposite sides')
        true.add('a parallelogram')
        if allsides:
            true.add('a rhombus')
        if right:
            true.add('a rectangle')
        if allsides and right:
            true.add('a square')
        if allsides:
            true.add('a kite')
    elif pairs == 1:
        true.add('a trapezium')
    else:
        pass
    if pairs != 2 and adj:
        true.add('a kite')
    best = [t for t in true if all(u == t or u in NAME_IMPLIES.get(t, set()) for u in true)]
    # offered names must all be understood
    if any(nm(o) not in NAME_IMPLIES for o in opts):
        raise ValueError('unknown name in options')
    if len(best) != 1:
        return Ambiguous(f'no unique best name among {sorted(true)}')
    return [nm(o) == best[0] for o in opts]


# ------------------------------------------------------------------ afnet : solids as data (faces, views)
POLY = {3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon'}
ADJ = {3: 'triangular', 4: 'square', 5: 'pentagonal', 6: 'hexagonal', 7: 'heptagonal', 8: 'octagonal'}
SOLIDS = {}
for _n, _p in POLY.items():
    _pn = ADJ[_n]
    _top_pyr = f'a {_p} with lines from its corners to its centre'
    if _n == 4:
        SOLIDS['square pyramid'] = dict(net='1 square and 4 triangles', top={_top_pyr}, front={'a triangle'}, lying=None)
    elif _n == 3:
        SOLIDS['triangular pyramid'] = dict(net='4 triangles', top={_top_pyr}, front={'a triangle'}, lying=None)
    else:
        SOLIDS[f'{_pn} pyramid'] = dict(net=f'1 {_p} and {_n} triangles', top={_top_pyr}, front={'a triangle'}, lying=None)
    if _n != 4:
        SOLIDS[f'{_pn} prism'] = dict(net=f'2 {_p}s and {_n} rectangles' if _n != 3 else '2 triangles and 3 rectangles', top={f'a {_p}'}, front={'a rectangle'}, lying={f'a {_p}'})
SOLIDS['cube'] = dict(net='6 equal squares', top={'a square', 'a rectangle'}, front={'a square', 'a rectangle'}, lying=None)
SOLIDS['cuboid'] = dict(net='6 rectangles, in three matching pairs', top={'a rectangle'}, front={'a rectangle'}, lying=None)
SOLIDS['cylinder'] = dict(net='2 equal circles and 1 rectangle', top={'a circle'}, front={'a rectangle'}, lying={'a circle'})
SOLIDS['cone'] = dict(net='1 circle and 1 fan shape (a sector of a bigger circle)', top={'a circle with a dot at its centre', 'a circle'}, front={'a triangle'}, lying=None)
SOLIDS['sphere'] = dict(net=None, top={'a circle'}, front={'a circle'}, lying=None)
SOLIDS['hemisphere (flat face down)'] = dict(net=None, top={'a circle'}, front={'a semicircle'}, lying=None)
NETS = {v['net']: k for k, v in SOLIDS.items() if v['net']}
ARTICLE = {'an': ('octagonal', 'octagon'), }


def solid_of(text):
    t = nm(text)
    t = re.sub(r'^(a|an) ', '', t)
    return t if t in SOLIDS else None


@judge('afnet', 'each solid is described by its faces (net), its view from above, its front view standing on the base and (prisms/cylinder) the end view when lying; polygons, prisms (2 n-gons + n rectangles), pyramids (1 n-gon + n triangles) generated from the standard definitions; an option is correct iff the solid / net / view satisfies the stem; squares count as rectangles (a cube is a cuboid)')
def afnet(q, opts):
    p = nm(q['prompt'])
    m = re.fullmatch(r'A net is made of (.+)\. Which solid does it fold into\?', p)
    if m:
        d = m.group(1)
        res = []
        for o in opts:
            s = solid_of(o)
            if s is None:
                raise ValueError(f'unknown solid {o!r}')
            net = SOLIDS[s]['net']
            res.append(net == d or (d == '6 equal squares' and s == 'cuboid') or (d == '6 rectangles, in three matching pairs' and False))
        return res
    m = re.fullmatch(r'Which of these nets folds into (?:a|an) (.+)\?', p)
    if m:
        s = m.group(1)
        if s not in SOLIDS:
            return Unsupported('unknown solid')
        res = []
        for o in opts:
            d = nm(o)
            res.append(SOLIDS[s]['net'] == d or (s == 'cuboid' and d == '6 equal squares'))
        return res
    m = re.fullmatch(r'A solid stands on a table\. Seen from straight above it looks like (.+?); seen from the front it looks like (.+?)\. Which solid is it\?', p)
    if m:
        top, front = m.group(1), m.group(2)
        norm = lambda t: t.replace('a octagon', 'an octagon').replace('a hexagon', 'a hexagon')
        top, front = norm(top), norm(front)
        res = []
        for o in opts:
            s = solid_of(o)
            if s is None:
                raise ValueError(f'unknown solid {o!r}')
            tp = {norm(x) for x in SOLIDS[s]['top']}; fr = {norm(x) for x in SOLIDS[s]['front']}
            res.append(top in tp and front in fr)
        return res
    m = re.fullmatch(r'(?:A|An) (.+?) stands on a table(?: on its base)?\. What do you see when you look at it from (straight above|the front, at eye level)\?', p)
    if m:
        s = m.group(1)
        if s not in SOLIDS:
            return Unsupported('unknown solid')
        key = 'top' if m.group(2) == 'straight above' else 'front'
        want = {x.replace('a octagon', 'an octagon') for x in SOLIDS[s][key]}
        return [nm(o).replace('a octagon', 'an octagon') in want for o in opts]
    m = re.fullmatch(r'(?:A|An) (.+?) lies on its side on a table, with one end facing you\. What do you see when you look at it from the front, at eye level\?', p)
    if m:
        s = m.group(1)
        if s not in SOLIDS or SOLIDS[s]['lying'] is None:
            return Unsupported('unknown solid')
        want = {x.replace('a octagon', 'an octagon') for x in SOLIDS[s]['lying']}
        return [nm(o).replace('a octagon', 'an octagon') in want for o in opts]
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ ahcfig
@judge('ahcfig', 'congruence: triangles by SSS (equal multisets of side lengths, valid triangle inequality), rectangles by the unordered pair of dimensions, circles by equal radius (diameter/2)')
def ahcfig(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'Triangle ([A-Z]{3}) has sides ([A-Z]{2}) = (\d+) cm, ([A-Z]{2}) = (\d+) cm and ([A-Z]{2}) = (\d+) cm\. Which of these triangles is congruent to triangle \1\?', p)
    if m:
        t = sorted(int(m.group(i)) for i in (3, 5, 7))
        if t[0] + t[1] <= t[2]:
            return Defect('stem triangle violates the triangle inequality')
        res = []
        for o in opts:
            mo = re.fullmatch(r'a triangle with sides (\d+) cm, (\d+) cm, (\d+) cm', nm(o))
            if not mo:
                raise ValueError(f'unreadable option {o!r}')
            u = sorted(int(mo.group(i)) for i in (1, 2, 3))
            res.append(u == t and u[0] + u[1] > u[2])
        return res
    m = re.fullmatch(r'A rectangle is (\d+) cm long and (\d+) cm wide\. Which of these rectangles is congruent to it\?', p)
    if m:
        t = sorted([int(m.group(1)), int(m.group(2))])
        res = []
        for o in opts:
            mo = re.fullmatch(r'a rectangle (\d+) cm wide and (\d+) cm long', nm(o))
            if not mo:
                raise ValueError(f'unreadable option {o!r}')
            res.append(sorted([int(mo.group(1)), int(mo.group(2))]) == t)
        return res
    m = re.fullmatch(r'A circle has radius (\d+) cm\. Which of these circles is congruent to it\?', p)
    if m:
        r = Fraction(int(m.group(1)))
        res = []
        for o in opts:
            mo = re.fullmatch(r'a circle with (radius|diameter) (\d+) cm', nm(o))
            if not mo:
                raise ValueError(f'unreadable option {o!r}')
            res.append(Fraction(int(mo.group(2))) / (2 if mo.group(1) == 'diameter' else 1) == r)
        return res
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ ahconv
@judge('ahconv', 'angle opposite the longest side from the law of cosines in exact Fractions: right iff cos = 0; degenerate triples (triangle inequality fails) rejected')
def ahconv(q, opts):
    p = q['prompt']
    m = re.fullmatch(r'A triangle has sides (\d+) cm, (\d+) cm and (\d+) cm\. Is it a right-angled triangle\?', p)
    if m:
        a, b, c = sorted(int(m.group(i)) for i in (1, 2, 3))
    else:
        m = re.fullmatch(r'A mason checks the corner of a wall\. He marks a point (\d+) cm from the corner along one wall and a point (\d+) cm from the corner along the other, and the two marks are (\d+) cm apart\. Is the corner a right angle\?', p)
        if not m:
            return Unsupported('unparsed prompt')
        a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))     # the angle at the corner lies between a and b, opposite c
        # right iff cos(corner) = (a^2+b^2-c^2)/(2ab) = 0
        if not (abs(a - b) < c < a + b):
            return Defect('impossible triangle')
        right = Fraction(a * a + b * b - c * c, 2 * a * b) == 0
        return [(nm(o).startswith('Yes') and right) or (nm(o).startswith('No') and not right) for o in opts]
    if not a + b > c:
        return Defect('impossible triangle')
    right = Fraction(a * a + b * b - c * c, 2 * a * b) == 0
    return [(nm(o).startswith('Yes') and right) or (nm(o).startswith('No') and not right) for o in opts]


# ------------------------------------------------------------------ ahname
@judge('ahname', 'each label is placed from the figure table as (line l/m, above/below, left/right of t); corresponding = same above/below and same side of t on the other line; alternate interior = between the lines, opposite sides of t, different lines; co-interior = between the lines, same side of t, different lines; vertically opposite = same line, opposite above/below and opposite sides of t')
def ahname(q, opts):
    fig = q['figure']
    pos = {}
    for r in fig['rows']:
        line, vert = r[0].replace('line ', '').split(', ')
        for side, lab in zip(('left', 'right'), r[1:]):
            pos[lab] = (line, vert, side)

    def rel(a, b):
        (l1, v1, s1), (l2, v2, s2) = pos[a], pos[b]
        if l1 != l2 and v1 == v2 and s1 == s2:
            return 'corresponding'
        if l1 == l2 and v1 != v2 and s1 != s2:
            return 'vertically opposite'
        inter = lambda l, v: (l == 'l' and v == 'below') or (l == 'm' and v == 'above')
        if l1 != l2 and inter(l1, v1) and inter(l2, v2):
            return 'alternate interior' if s1 != s2 else 'co-interior'
        return None
    p = q['prompt']
    m = re.search(r'Which angle is the (corresponding|alternate interior|co-interior|vertically opposite) angle to angle (\w)\?', p)
    if m:
        kind, a = m.group(1), m.group(2)
        cand = [b for b in pos if b != a and rel(a, b) == kind]
        if len(cand) != 1:
            return Defect(f'{len(cand)} angles are the {kind} angle to {a}')
        return [nm(o) == cand[0] for o in opts]
    m = re.search(r'What kind of pair are angles (\w) and (\w)\?', p)
    if m:
        k = rel(m.group(1), m.group(2))
        return [k is not None and nm(o) == k + ' angles' for o in opts]
    return Unsupported('unparsed prompt')


# ------------------------------------------------------------------ aiconvex
def _cross(o, a, b):
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def _seg_cross(p1, p2, p3, p4):
    d1, d2, d3, d4 = _cross(p3, p4, p1), _cross(p3, p4, p2), _cross(p1, p2, p3), _cross(p1, p2, p4)
    return d1 * d2 < 0 and d3 * d4 < 0


@judge('aiconvex', 'angles: the interior angles of a simple quadrilateral add to 360; convex iff all < 180, concave iff exactly one > 180, any angle = 180 degenerates the figure; coordinates: turn directions (cross products) of consecutive edges, crossing test for AB/CD and BC/DA. Degenerate (collinear / 180 degree) cases are reported as Ambiguous (convention-dependent)')
def aiconvex(q, opts):
    p = nm(q['prompt'])
    m = re.fullmatch(r'A closed path goes through four points A, B, C and D in order and back to A\. The angles inside the path at the four points are ∠A = (\d+)°, ∠B = (\d+)°, ∠C = (\d+)°, ∠D = (\d+)°\. What shape does the path make\?', p)
    if m:
        a = [int(m.group(i)) for i in (1, 2, 3, 4)]
        if sum(a) != 360:
            k = 'not'
        elif 180 in a:
            return Ambiguous('an interior angle of exactly 180 degrees: the four points are not in general position (a triangle with an extra point on a side); "not a quadrilateral" (strict definition) vs a degenerate/weakly convex quadrilateral')
        elif max(a) > 180:
            k = 'concave'
        else:
            k = 'convex'
    else:
        m = re.fullmatch(r'The points A\((-?\d+), (-?\d+)\), B\((-?\d+), (-?\d+)\), C\((-?\d+), (-?\d+)\), D\((-?\d+), (-?\d+)\) are joined in order A → B → C → D → A, as in the picture\. What shape do they make\?', p.replace('−', '-'))
        if not m:
            return Unsupported('unparsed prompt')
        v = [int(x) for x in m.groups()]
        P = [(v[0], v[1]), (v[2], v[3]), (v[4], v[5]), (v[6], v[7])]
        fp = {(pt[0], pt[1]) for pt in q['figure']['points'] and [(f[0], f[1]) for f in q['figure']['points']]}
        if fp != set(P):
            return Defect('figure points differ from the statement')
        cr = [_cross(P[i], P[(i + 1) % 4], P[(i + 2) % 4]) for i in range(4)]
        if any(c == 0 for c in cr):
            return Ambiguous('three consecutive vertices are collinear: the path is a triangle with an extra point on a side; "not a quadrilateral" (strict definition) vs a degenerate/weakly convex quadrilateral')
        if _seg_cross(P[0], P[1], P[2], P[3]) or _seg_cross(P[1], P[2], P[3], P[0]):
            k = 'not'
        elif all(c > 0 for c in cr) or all(c < 0 for c in cr):
            k = 'convex'
        else:
            k = 'concave'
    names = {'not': 'not a quadrilateral', 'convex': 'a convex quadrilateral', 'concave': 'a non-convex (concave) quadrilateral'}
    return [nm(o) == names[k] for o in opts]


# ------------------------------------------------------------------ alcvoc
def _vocab_truth(p):
    """set of option texts that are correct for the circle-vocabulary item, from the described properties"""
    p = nm(p)
    chordish = {'a chord'}
    m = re.fullmatch(r'\w\w is a straight line segment joining two points \w and \w of a circle with centre \w, and it does not pass through \w\. What is \w\w called\?', p)
    if m:
        return chordish
    if re.fullmatch(r'A straight steel rod \w\w, \d+ cm long, is fixed across a round window with both ends on the frame; it does not pass through the middle of the window\. In the language of circles, what is the rod\?', p):
        return chordish
    m = re.fullmatch(r'In a circle with centre \w and radius (\d+) cm, \w\w joins two points of the circle, passes through \w and is (\d+) cm long\. What is \w\w called\?', p)
    if m:
        if int(m.group(2)) != 2 * int(m.group(1)):
            raise ValueError('length is not twice the radius')
        return {'a diameter', 'a chord'}
    if re.fullmatch(r'A straight path \w\w crosses a round park of radius \d+ m from one edge to the other, passing through the fountain at its centre\. In the language of circles, what is the path\?', p):
        return {'a diameter', 'a chord'}
    if re.fullmatch(r'\w is the centre of a circle of radius \d+ cm and \w is a point on the circle\. What is the line segment \w\w called\?', p):
        return {'a radius'}
    if re.fullmatch(r'A spoke of a bicycle wheel goes straight from the hub at the centre to the point \w on the rim, \d+ cm away\. In the language of circles, what is the spoke\?', p):
        return {'a radius'}
    if re.fullmatch(r'\w and \w are two points on a circle of radius \d+ cm\. What is the curved part of the circle from \w to \w \(the shorter way round\) called\?', p):
        return {'an arc'}
    if re.fullmatch(r'A round pizza of radius \d+ cm is cut into slices from the centre\. In the language of circles, what is the curved crust edge \w\w of one slice\?', p):
        return {'an arc'}
    if re.fullmatch(r'In a circle with centre \w and radius \d+ cm, what is the region bounded by the two radii \w\w, \w\w and the arc \w\w called\?', p):
        return {'a sector'}
    if re.fullmatch(r'A round cake of radius \d+ cm is cut by two straight cuts \w\w and \w\w from its centre \w to the edge\. In the language of circles, what is the piece between the two cuts\?', p):
        return {'a sector'}
    if re.fullmatch(r'In a circle of radius \d+ cm, \w\w is a chord\. What is the region bounded by the chord \w\w and the arc \w\w called\?', p):
        return {'a segment'}
    if re.fullmatch(r'A round roti of radius \d+ cm is cut once, straight across from \w to \w on its edge, and the cut misses the centre\. In the language of circles, what is the smaller piece cut off\?', p):
        return {'a segment'}
    if re.fullmatch(r'Every point of a circle is exactly \d+ cm from the point \w inside it\. What is the point \w called\?', p):
        return {'the centre'}
    if re.fullmatch(r'What is the name for the complete boundary of the circle with centre \w and radius \d+ cm — the whole curve, whose length is 2π × \d+ cm\?', p):
        return {'the circumference'}
    if re.fullmatch(r'A wire is bent all the way round the edge of a circular well with centre \w and radius \d+ m\. In the language of circles, which part of the circle does the wire follow\?', p):
        return {'the circumference'}
    m = re.fullmatch(r'A line segment \w\w of length (\d+) cm has both its ends on a circle of radius (\d+) cm\. What is \w\w called\?', p)
    if m:
        if not 0 < int(m.group(1)) < 2 * int(m.group(2)):
            raise ValueError('not a non-diameter chord')
        return {'a chord'}
    if re.fullmatch(r'How many lines of symmetry does a circle with centre \w and radius \d+ cm have\?', p):
        return {'infinitely many'}
    if re.fullmatch(r'A circle has centre \w and radius \d+ cm\. Which lines are lines of symmetry of the circle\?', p):
        return {'every line through the centre'}
    if re.fullmatch(r'A circle with centre \w is turned about \w through \d+°\. Does it fit exactly onto itself\?', p):
        return 'YES'
    if re.fullmatch(r'\w is a point on a circle with centre \w and radius \d+ cm\. \w is reflected in a diameter of the circle that does not pass through \w\. Where is the image of \w\?', p):
        return {'on the same circle'}
    return None


@judge('alcvoc', 'standard circle terminology (chord = both ends on the circle; diameter = chord through the centre; radius; arc; sector; segment; circumference; centre) and symmetry facts (a circle maps onto itself under every rotation about its centre and every reflection in a line through its centre; reflection preserves distance from the centre); a diameter is also a chord, so offering both would be flagged')
def alcvoc(q, opts):
    t = _vocab_truth(q['prompt'])
    if t is None:
        return Unsupported('unparsed prompt')
    if t == 'YES':
        return [nm(o).startswith('Yes') for o in opts]
    return [nm(o) in t for o in opts]
