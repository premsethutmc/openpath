"""geometry-coordinate part 9: early-grade shape/position families read from the prompt and the exported figure."""
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp
from refs.geometry_coordinate_util import *
import re, math, itertools

CLS9 = {}


def ints(p):
    return [int(v) for v in re.findall(r'\d+', p)]


# ---------------------------------------------------------------- shape glyph tables
TRI = set('▲▼◀▶△▽◁▷')
SQ = set('■□◼◻▪▫')
RECT = set('▮▬▯▭')
CIRC = set('●○◯⚫⚪')
HALF = set('◗◖◐◑◒◓')


def glyph_row(q):
    return [g for g in q['figure']['rows'][0]]


@ref('aaflat', method='classify every glyph of the figure row (triangle in any rotation/fill, square, non-square rectangle, circle) and count the asked kind')
def aaflat(q):
    p = q['prompt']
    row = glyph_row(q)
    unknown = [g for g in row if not (g in TRI or g in SQ or g in RECT or g in CIRC or g in HALF)]
    if unknown:
        return Unsupported(f'unclassified glyphs {unknown}')
    if 'triangles' in p.split('?')[0]:
        return Expect(str(sum(g in TRI for g in row)))
    if 'squares' in p.split('?')[0] and 'not squares' not in p:
        return Expect(str(sum(g in SQ for g in row)))
    if 'circles' in p.split('?')[0]:
        return Expect(str(sum(g in CIRC for g in row)))
    if 'rectangles that are not squares' in p:
        return Expect(str(sum(g in RECT for g in row)))
    return Unsupported('unknown aaflat question')


@ref('abcurve', method='classify glyphs: triangles/squares/rectangles straight only; circles curved only; half-circles straight+curved')
def abcurve(q):
    p = q['prompt']
    row = glyph_row(q)
    straight = lambda g: g in TRI or g in SQ or g in RECT
    curved = lambda g: g in CIRC
    both = lambda g: g in HALF
    if any(not (straight(g) or curved(g) or both(g)) for g in row):
        return Unsupported('unclassified glyph')
    if 'only straight sides' in p:
        return Expect(str(sum(straight(g) for g in row)))
    if 'at least one curved side' in p:
        return Expect(str(sum(curved(g) or both(g) for g in row)))
    if 'both straight and curved' in p:
        return Expect(str(sum(both(g) for g in row)))
    return Unsupported('unknown abcurve question')


@ref('aarow', method='read the animal row from the figure; place from the left/right, or the number of animals on one side of the named animal')
def aarow(q):
    p = q['prompt']
    row = q['figure']['rows'][0]
    m = re.search(r'in which place is the (\w+)', p)
    if m:
        i = row.index(m.group(1))
        return Expect(str(i + 1 if 'from the left' in p else len(row) - i))
    m = re.search(r'How many animals are to the (left|right) of the (\w+)', p)
    if m:
        i = row.index(m.group(2))
        return Expect(str(i if m.group(1) == 'left' else len(row) - 1 - i))
    return Unsupported('unknown aarow question')


@ref('aashelf', method='parse the shelf table top to bottom; the count on the shelf immediately above/below the shelf holding the named things')
def aashelf(q):
    p = q['prompt']
    rows = q['figure']['rows']
    items = []
    for name, txt in rows:
        m = re.match(r'(\d+) (.+)', txt)
        items.append((int(m.group(1)), m.group(2)))
    m = re.search(r'just (above|below) the ([\w ]+)\?', p)
    sing = lambda t: t.rstrip('s')
    idx = [i for i, (_, nm) in enumerate(items) if sing(nm) == sing(m.group(2))]
    if len(idx) != 1:
        return Ambiguous(f'{m.group(2)} appears on {len(idx)} shelves')
    j = idx[0] + (-1 if m.group(1) == 'above' else 1)
    if not 0 <= j < len(items):
        return Ambiguous('no shelf there')
    return Expect(str(items[j][0]))


SOLID_CLS = {'a ball': 'sphere', 'a battery': 'cylinder', 'a birthday cap': 'cone', 'a book': 'cuboid', 'a brick': 'cuboid', 'a candle': 'cylinder', 'a dice': 'cube',
             'a drum': 'cylinder', 'a duster': 'cuboid', 'a globe': 'sphere', 'a laddu': 'sphere', 'a marble': 'sphere', 'a matchbox': 'cuboid', 'a mehndi cone': 'cone',
             'a paneer cube': 'cube', 'a pencil box': 'cuboid', 'a pipe': 'cylinder', 'a tin of oil': 'cylinder', 'a traffic cone': 'cone', 'an ice cube': 'cube',
             'an ice-cream cone': 'cone', 'an orange': 'sphere'}
SOLID_ALT = {'a tin of oil': ['cylinder', 'cuboid'], 'a pencil box': ['cuboid', 'cylinder']}


@ref('aasolid', method='independent object->solid dictionary (everyday shapes); count of the asked solid among the listed things; answers that change under a plausible alternative reading of an everyday object (oil tin, pencil box) are flagged ambiguous')
def aasolid(q):
    p = q['prompt']
    things = re.split(r', (?:and )?', re.search(r'Here are some things: (.+?)\. How many', p).group(1))
    want = re.search(r'shaped like an? (\w+)', p).group(1)
    base = sum(SOLID_CLS[t] == want for t in things)
    alts = {t: SOLID_ALT[t] for t in things if t in SOLID_ALT}
    outs = set()
    for combo in itertools.product(*[alts[t] for t in alts]) if alts else [()]:
        d = dict(zip(alts, combo))
        outs.add(sum((d.get(t) or SOLID_CLS[t]) == want for t in things))
    if len(outs) > 1:
        return Ambiguous(f'answer depends on how an everyday object is read: counts {sorted(outs)} (ambiguous objects: {sorted(alts)})')
    return Expect(str(base))


SOL = {  # (flat faces, curved surfaces, edges, corners)
    'sphere': (0, 1, 0, 0), 'cone': (1, 1, 1, 1), 'cylinder': (2, 1, 2, 0), 'cube': (6, 0, 12, 8), 'cuboid': (6, 0, 12, 8),
    'square pyramid': (5, 0, 8, 5), 'triangular pyramid': (4, 0, 6, 4), 'triangular prism': (5, 0, 9, 6), 'tetrahedron': (4, 0, 6, 4)}


def solid_names(s):
    out = []
    for nm in sorted(SOL, key=len, reverse=True):
        pass
    return out


def parse_solids(p):
    """[(count, solid)] from  'has 2 cones and 1 cube' / 'There are...'; plural forms handled"""
    res = []
    body = re.sub(r'\. How many.*$', '', p)
    body = re.sub(r'^[A-Z]\w+ has ', '', body)
    parts = re.split(r', | and ', body)
    for part in parts:
        m = re.match(r'(\d+) (.+?)s?$', part.strip())
        if not m:
            continue
        nm = m.group(2)
        nm = nm.replace('cones', 'cone').replace('pyramids', 'pyramid')
        cand = [k for k in SOL if nm == k or nm == k + 's' or nm.rstrip('s') == k or nm.replace('es', '') == k]
        if not cand:
            return None
        res.append((int(m.group(1)), cand[0]))
    return res


@ref('abcurved', method='per-solid table (flat faces, curved surfaces, edges, corners; cone/cylinder edges counted as the circular rims) applied to the counts in the prompt; singular "in the picture" kind read from the solid named')
def abcurved(q):
    p = q['prompt']
    m = re.search(r'does the (\w+(?: \w+)?) in the picture have', p)
    if m:
        nm = m.group(1)
        items = [(1, nm)]
    else:
        items = parse_solids(p)
        if items is None:
            return Unsupported('unparsed solid list')
    if any(nm not in SOL for _, nm in items):
        return Unsupported('unknown solid')
    if 'both a flat face and a curved surface' in p:
        return Expect(str(sum(c for c, nm in items if SOL[nm][0] > 0 and SOL[nm][1] > 0)))
    idx = None
    if 'flat faces' in p:
        idx = 0
    elif 'curved surfaces' in p:
        idx = 1
    elif 'edges' in p:
        idx = 2
    elif 'corners' in p:
        idx = 3
    if idx is None:
        return Unsupported('unknown abcurved question')
    return Expect(str(sum(c * SOL[nm][idx] for c, nm in items)))


@ref('absolid', method='faces/edges/corners table of solids (Euler check F+V-E=2 for polyhedra) applied to the counts in the prompt/figure')
def absolid(q):
    p = q['prompt']
    rows = q['figure']['rows'] if q.get('figure') and q['figure'].get('rows') else None
    if rows:
        items = [(int(r[1]), r[0].rstrip('s') if r[0].rstrip('s') in SOL else r[0].replace('pyramids', 'pyramid').replace('cuboids', 'cuboid')) for r in rows]
    else:
        m = re.search(r'does the ([\w ]+?) in the picture', p)
        items = [(1, m.group(1))]
    for c, nm in items:
        if nm not in SOL:
            return Unsupported(f'unknown solid {nm}')
        f_, cs, e_, v_ = SOL[nm]
        if cs == 0:
            assert f_ + v_ - e_ == 2
    if 'flat faces' in p:
        i = 0
    elif 'edges' in p:
        i = 2
    elif 'corners' in p:
        i = 3
    else:
        return Unsupported('unknown absolid question')
    return Expect(str(sum(c * SOL[nm][i] for c, nm in items)))


SHAPE = {'triangle': (3, 3, 0), 'square': (4, 4, 2), 'rectangle': (4, 4, 2), 'pentagon': (5, 5, 5), 'hexagon': (6, 6, 9), 'circle': (0, 0, 0)}


def diag_count(n):
    return n * (n - 3) // 2


@ref('abdiag', method='sides/corners n and diagonals n(n-3)/2 per shape (circle 0) cross-checked by counting vertex pairs that are not adjacent; applied to the listed or counted shapes')
def abdiag(q):
    p = q['prompt']
    for nm, (s, c, d) in SHAPE.items():
        if nm != 'circle':
            # brute force: diagonals = vertex pairs minus edges
            assert d == (c * (c - 1) // 2 - s if c else 0), nm
    m = re.search(r'Here are \w+ shapes: (.+?)\. How many of them (.+?)\? ', p + ' ')
    if m:
        shapes = [re.sub(r'^an? ', '', t) for t in re.split(r', ', m.group(1))]
        cond = m.group(2)
        if cond.startswith('have exactly 2 diagonals'):
            return Expect(str(sum(SHAPE[s][2] == 2 for s in shapes)))
        if cond.startswith('have no diagonals'):
            return Expect(str(sum(SHAPE[s][2] == 0 for s in shapes)))
        if cond.startswith('have more than 4 corners'):
            return Expect(str(sum(SHAPE[s][1] > 4 for s in shapes)))
        if cond.startswith('have exactly 4 sides'):
            return Expect(str(sum(SHAPE[s][0] == 4 for s in shapes)))
        return Unsupported('unknown condition')
    m = re.search(r'How many (corners|diagonals|sides) does an? (\w+) have', p)
    if m:
        k = {'sides': 0, 'corners': 1, 'diagonals': 2}[m.group(1)]
        return Expect(str(SHAPE[m.group(2)][k]))
    m = re.search(r'There (?:is|are) (.+?)\. How many (sides|corners|diagonals) do they have', p)
    if m:
        k = {'sides': 0, 'corners': 1, 'diagonals': 2}[m.group(2)]
        tot = 0
        for part in re.split(r' and ', m.group(1)):
            mm = re.match(r'(\d+) (\w+?)s?$', part.strip())
            nm = mm.group(2)
            tot += int(mm.group(1)) * SHAPE[nm][k]
        return Expect(str(tot))
    return Unsupported('unknown abdiag template')


@ref('abside', method='sides/corners per shape (circle 0) times the counts in the figure table')
def abside(q):
    p = q['prompt']
    k = 0 if 'sides' in p else (1 if 'corners' in p else None)
    if k is None:
        return Unsupported('unknown abside question')
    if q['figure'].get('type') == 'shape':
        nm = re.search(r'does the (\w+) in the picture', p).group(1)
        if q['figure'].get('sides') != SHAPE[nm][0] or q['figure'].get('name') != nm:
            return Verdict(False, 'figure shape differs from the statement')
        return Expect(str(SHAPE[nm][k]))
    rows = q['figure']['rows']
    tot = 0
    for nm, n in rows:
        nm = nm.rstrip('s')
        tot += int(n) * SHAPE[nm][k]
    return Expect(str(tot))


@ref('abgrid', method='shortest path along grid lines = BFS over the integer grid from S to E (no obstacles in the figure)')
def abgrid(q):
    pts = {p_[2]: (p_[0], p_[1]) for p_ in q['figure']['points']}
    S, E = pts['S'], pts['E']
    # BFS (independent of the Manhattan formula)
    from collections import deque
    R_ = q['figure'].get('range', 10) + 2
    seen = {S: 0}
    dq = deque([S])
    while dq:
        u = dq.popleft()
        if u == E:
            break
        for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            v = (u[0] + d[0], u[1] + d[1])
            if abs(v[0]) <= R_ + 10 and abs(v[1]) <= R_ + 10 and v not in seen:
                seen[v] = seen[u] + 1
                dq.append(v)
    return Expect(str(seen[E]))


CURVED_LET = set('BCDGJOPQRSU')
STRAIGHT_LET = set('AEFHIKLMNTVWXYZ')
VSYM = set('AHIMOTUVWXY')
HSYM = set('BCDEHIKOX')


@ref('abline', method='each capital letter of the word in the figure classified (straight-only vs has a curve) with a fixed alphabet table')
def abline(q):
    word = ''.join(c for c in q['figure']['rows'][0][0] if c.isalpha())
    if 'only of straight lines' in q['prompt'] or 'made only of straight lines' in q['prompt']:
        return Expect(str(sum(c in STRAIGHT_LET for c in word)))
    if 'curved line' in q['prompt']:
        return Expect(str(sum(c in CURVED_LET for c in word)))
    return Unsupported('unknown abline question')


@ref('absym', method='letters with a vertical or horizontal fold line (sans-serif capitals); counts of symmetrical / not symmetrical letters of the word')
def absym(q):
    word = ''.join(c for c in q['figure']['rows'][0][0] if c.isalpha())
    sym = lambda c: c in VSYM or c in HSYM
    if 'NOT symmetrical' in q['prompt']:
        return Expect(str(sum(not sym(c) for c in word)))
    if 'are symmetrical' in q['prompt']:
        return Expect(str(sum(sym(c) for c in word)))
    return Unsupported('unknown absym question')


@ref('aesym', method='sans-serif capital letters with a vertical (A H I M O T U V W X Y) / horizontal (B C D E H I K O X) fold line; count in the listed letters')
def aesym(q):
    p = q['prompt']
    letters = re.search(r'capital letters: (.+?)\. How many', p).group(1).split()
    if 'vertical line of symmetry' in p:
        return Expect(str(sum(c in VSYM for c in letters)))
    if 'horizontal line of symmetry' in p:
        return Expect(str(sum(c in HSYM for c in letters)))
    return Unsupported('unknown aesym question')


OBJ_STRAIGHT = {'a blackboard': True, 'a kite': True, 'a ladder': True, 'a ruler': True, 'a window frame': True, 'a brick': True, 'a book': True, 'a door': True, 'a matchbox': True, 'a carrom board': True,
                'a ball': False, 'a ring': False, 'a dosa': False, 'a full moon': False, 'a bangle': False, 'a plate': False, 'a rainbow': False, 'a laddu': False, 'a wheel': False, 'a ₹5 coin': False}


@ref('abobj', method='independent object table: outline made only of straight segments (blackboard, kite, ladder, ruler, window frame, brick, book, door, matchbox, carrom board) vs curved outline; count in the listed things')
def abobj(q):
    p = q['prompt']
    things = re.split(r', (?:and )?', re.search(r'these things: (.+?)\. How many', p).group(1))
    if 'only straight lines' in p:
        return Expect(str(sum(OBJ_STRAIGHT[t] for t in things)))
    if 'curved' in p:
        return Expect(str(sum(not OBJ_STRAIGHT[t] for t in things)))
    return Unsupported('unknown abobj question')


ROLL = {'round all over': (True, False), 'box shape: only flat faces': (False, True), 'cube: only flat faces': (False, True), 'two flat ends and a curved side': (True, True)}


@ref('abroll', method='sphere rolls only; box/cube slides only; cylinder rolls (on its curved side) and slides (on a flat end); counted over the table rows')
def abroll(q):
    p = q['prompt']
    rows = q['figure']['rows']
    roll = [ROLL[r[1]][0] for r in rows]
    slide = [ROLL[r[1]][1] for r in rows]
    if 'can both roll and slide' in p:
        return Expect(str(sum(a and b for a, b in zip(roll, slide))))
    if 'can roll' in p:
        return Expect(str(sum(roll)))
    if 'can slide' in p:
        return Expect(str(sum(slide)))
    return Unsupported('unknown abroll question')


@ref('abroute', method='road table: minimum over the three routes (via Belur, via Chettipalayam, direct); map walk: squares times scale, with the figure start/end checked')
def abroute(q):
    p = q['prompt']
    fig = q['figure']
    if fig.get('type') == 'table':
        d = {}
        for name, ln in fig['rows']:
            d[name] = int(ln)
        names = list(d)
        m = re.search(r'from (\w+) to (\w+)', p)
        a, b = m.group(1), m.group(2)
        direct = [v for k, v in d.items() if '(direct)' in k][0]
        mids = {}
        for k, v in d.items():
            if '(direct)' in k:
                continue
            u, w = [t.strip() for t in k.split('–')]
            mids[(u, w)] = v
        routes = [direct]
        for (u, w), v in mids.items():
            if u == a:
                for (u2, w2), v2 in mids.items():
                    if u2 == w and w2 == b:
                        routes.append(v + v2)
        if len(routes) != 3:
            return Ambiguous(f'{len(routes)} routes found')
        if 'shortest' in p:
            return Expect(str(min(routes)))
        if 'longest' in p:
            return Expect(str(max(routes)))
        return Unsupported('unknown route question')
    m = re.search(r'side of a square stands for (\d+) (km|m)\b', p)
    scale = int(m.group(1))
    sq_ = [int(v) for v in re.findall(r'walks (\d+) squares? \w+ and then (\d+) squares?', p)[0]]
    pts = {p_[2]: (p_[0], p_[1]) for p_ in fig['points']}
    dx = abs(pts['E'][0] - pts['S'][0]); dy = abs(pts['E'][1] - pts['S'][1])
    if sorted([dx, dy]) != sorted(sq_):
        return Verdict(False, 'figure displacement differs from the stated walk')
    return Expect(str(sum(sq_) * scale))


def collinear(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]) == 0


@ref('aclines', method='count distinct segments / lines from the point coordinates of the figure (lines merged when three points are collinear)')
def aclines(q):
    pts = [(p_[0], p_[1]) for p_ in q['figure']['points']]
    n = len(pts)
    stated = int(re.search(r'The (\d+) points', q['prompt']).group(1))
    if stated != n:
        return Verdict(False, 'figure has a different number of points')
    lines = set()
    for i, j in itertools.combinations(range(n), 2):
        s = frozenset(k for k in range(n) if collinear(pts[i], pts[j], pts[k]))
        lines.add(s)
    allcol = len(lines) == 1
    if 'marked on one straight line' in q['prompt']:
        if not allcol:
            return Verdict(False, 'points are not collinear in the figure')
        return Expect(str(n * (n - 1) // 2))   # segments with endpoints among them
    if 'no three of them are on one straight line' in q['prompt']:
        if any(len(s) > 2 for s in lines):
            return Verdict(False, 'three points are collinear in the figure')
        return Expect(str(len(lines)))
    return Unsupported('unknown aclines question')


@ref('actile', method='grid rows x columns; tile = shaded cells with the shape described (domino vertical/horizontal, row of k, block); tiling feasibility by dimensions; tiles = cells / tile cells')
def actile(q):
    p = q['prompt']
    fig = q['figure']
    rows, cols, sh = fig['rows'], fig['cols'], fig['shaded']
    m = re.search(r'grid of (\d+) rows? and (\d+) columns?', p)
    frows, fcols = int(m.group(1)), int(m.group(2))
    if 'The picture shows one tile' in p:
        # the figure is the tile itself: its size is rows x cols with all cells shaded
        if rows * cols != sh:
            return Verdict(False, 'tile picture not fully shaded')
        th, tw = rows, cols
        rows, cols = frows, fcols
    elif (frows, fcols) != (rows, cols):
        return Verdict(False, 'figure grid differs from the statement')
    else:
        th = tw = None
    if 'one above the other' in p:
        h, w = int(re.search(r'covers (\d+) squares', p).group(1)), 1
    elif 'side by side' in p:
        h, w = 1, int(re.search(r'covers (\d+) squares', p).group(1))
    elif 'block of' in p:
        mm = re.search(r'block of (\d+) rows? of (\d+) squares', p)
        h, w = int(mm.group(1)), int(mm.group(2))
    else:
        return Unsupported('unknown actile tile description')
    if th is not None and (h, w) != (th, tw):
        return Verdict(False, f'tile {h}x{w} in the statement differs from the picture {th}x{tw}')
    if th is None and h * w != sh:
        return Verdict(False, f'tile {h}x{w} does not match shaded count {sh}')
    if rows % h or cols % w:
        return Ambiguous('tile does not fit the grid without gaps in the stated orientation')
    return Expect(str(rows * cols // (h * w)))


@ref('aecirc', method='diameter = 2 radius; radius = diameter / 2')
def aecirc(q):
    p = q['prompt']
    v = Fraction(re.search(r'(?:radius|diameter) of (\d+(?:\.\d+)?) cm', p).group(1))
    if 'How long is its diameter' in p:
        return Expect(str(2 * v))
    if 'How long is its radius' in p:
        return Expect(str(v / 2))
    return Unsupported('unknown aecirc')


SEG = {'0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'}
MIR = {'a': 'a', 'b': 'f', 'c': 'e', 'd': 'd', 'e': 'c', 'f': 'b', 'g': 'g'}   # left-right mirror of a segment
FLIP = {'a': 'd', 'b': 'c', 'c': 'b', 'd': 'a', 'e': 'f', 'f': 'e', 'g': 'g'}    # top-bottom flip of a segment


@ref('aedigsym', method='seven-segment display model of each number; vertical fold: mirror the whole display (digits reversed, segments mirrored) and compare; horizontal fold: flip each digit top-bottom and compare')
def aedigsym(q):
    p = q['prompt']
    nums = re.search(r'straight bars: (.+?)\. How many', p).group(1).split(', ')
    def disp(n):
        return [frozenset(SEG[d]) for d in n]
    def vsym(n):
        d = disp(n)
        m = [frozenset(MIR[s] for s in dg) for dg in reversed(d)]
        return m == d
    def hsym(n):
        d = disp(n)
        return [frozenset(FLIP[s] for s in dg) for dg in d] == d
    if 'vertical line of symmetry' in p:
        return Expect(str(sum(vsym(n) for n in nums)))
    if 'horizontal line of symmetry' in p:
        return Expect(str(sum(hsym(n) for n in nums)))
    return Unsupported('unknown aedigsym question')


SHAPE_LINES = {'equilateral triangle': 3, 'square': 4, 'rectangle': 2, 'rhombus': 2, 'parallelogram': 0, 'kite': 1, 'circle': None, 'trapezium with equal slanting sides': 1,
               'isosceles triangle': 1, 'scalene triangle': 0, 'regular pentagon': 5, 'regular hexagon': 6,
               'regular octagon': 8, 'rectangle (not a square)': 2, 'rhombus (not a square)': 2, 'parallelogram (not a rectangle or rhombus)': 0,
               'triangle with three different sides': 0, 'right-angled triangle with two different shorter sides': 0}


@ref('aedsym', method='grid design: count the symmetries among horizontal, vertical, two diagonal flips by comparing the flipped grid with the original; named shapes from a fixed table of fold lines')
def aedsym(q):
    fig = q['figure']
    p = q['prompt']
    if fig.get('type') == 'table' and 'rows' in fig and not fig.get('head'):
        g = [list(r) for r in fig['rows']]
        n = len(g)
        if any(len(r) != n for r in g):
            return Unsupported('non-square grid')
        flips = [lambda g: [r[::-1] for r in g], lambda g: g[::-1], lambda g: [list(r) for r in zip(*g)], lambda g: [list(r) for r in zip(*[r[::-1] for r in g[::-1]])]]
        return Expect(str(sum(f(g) == g for f in flips)))
    m = re.search(r'does an? (.+?) have\?', p)
    if m and m.group(1) in SHAPE_LINES and SHAPE_LINES[m.group(1)] is not None:
        return Expect(str(SHAPE_LINES[m.group(1)]))
    return Unsupported('shape not in the table: ' + (m.group(1) if m else p[:40]))
