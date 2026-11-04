"""statistics-probability-vectors-matrices, part A: pictographs, bar charts, tables, pie charts, histograms, simple descriptive stats.
Every reference reads the exported figure (tables / label lists) and the prompt statement only; never the stored answer."""
import re
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401

DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']


def names(label):
    """words that stand for a figure label inside a sentence (abbreviations expanded by a fixed calendar table)"""
    l = str(label).lower()
    out = {l, l + 's', l + 'es'}
    for full in DAYS + MONTHS:
        if len(l) == 3 and full.startswith(l):
            out.add(full)
    return out


def mentions(sentence, labels):
    s = sentence.lower()
    hits = []
    for i, lab in enumerate(labels):
        for n in names(lab):
            for m in re.finditer(r'(?<![a-z])' + re.escape(n) + r'(?![a-z])', s):
                hits.append((m.start(), i))
    hits.sort()
    order = []
    for _, i in hits:
        if i not in order:
            order.append(i)
    return order


def last_sentence(p):
    # the question sentence = text after the last '. ' that precedes a sentence starting 'How'/'What'/'Find'
    m = list(re.finditer(r'(How many|What|Find)[^.?]*\?', p))
    return m[-1].group(0) if m else p


def num(x):
    return int(x) if float(x) == int(float(x)) else Fraction(x)


def bar_answer(sent, labels, vals):
    s = sent.lower()
    if 'tallest' in s and 'shortest' in s:
        return max(vals) - min(vals)
    if 'in all' in s or 'altogether' in s:
        return sum(vals)
    ids = mentions(sent, labels)
    if 'together' in s:
        if len(ids) != 2:
            raise ValueError('together needs 2 labels %r' % ids)
        return vals[ids[0]] + vals[ids[1]]
    if 'more' in s and ' than ' in s:
        if len(ids) != 2:
            raise ValueError('more-than needs 2 labels %r %s' % (ids, sent))
        # first mentioned is the larger-side quantity
        return vals[ids[0]] - vals[ids[1]]
    if len(ids) != 1:
        raise ValueError('one label needed %r %s' % (ids, sent))
    return vals[ids[0]]


def fig_bars_check(q, f):
    sc = f.get('scale', 1)
    bad = [v for v in f['values'] if v % sc]
    m = re.search(r'scale is (\d+)\)', q['prompt'])
    if m and int(m.group(1)) != sc:
        return 'prompt scale %s != figure scale %s' % (m.group(1), sc)
    if bad:
        return 'bar values %r are not multiples of the scale %s' % (bad, sc)
    return None


@ref('abpic', 'read the pictograph counts from the exported figure; most-of = max over the counts')
def abpic(q):
    f = q['figure']; c = f['counts']
    if f['key'] != 1 or 'One ● is one toy' not in q['prompt']:
        return Verdict(False, 'key mismatch')
    if 'most of' in q['prompt']:
        return Expect(str(max(c)))
    ids = mentions(last_sentence(q['prompt']), f['labels'])
    return Expect(str(c[ids[0]])) if len(ids) == 1 else Unsupported('label parse')


@ref('abpicmore', 'difference of two pictograph counts')
def abpicmore(q):
    f = q['figure']; c = f['counts']
    ids = mentions(last_sentence(q['prompt']), f['labels'])
    assert len(ids) == 2
    return Expect(str(c[ids[0]] - c[ids[1]]))


def picto_key(q, f):
    m = re.search(r'Each ● stands for (\d+) child', q['prompt'])
    if not m or int(m.group(1)) != f['key']:
        return 'prompt key %s vs figure key %s' % (m and m.group(1), f['key'])
    return None


def picto_core(q, half=False):
    f = q['figure']
    err = picto_key(q, f)
    if err:
        return Verdict(False, err)
    unit = Fraction(f['key'], 2) if half else f['key']
    if half:
        m = re.search(r'half ● stands for (\d+)', q['prompt'])
        if not m or int(m.group(1)) != unit:
            return Verdict(False, 'half key mismatch')
    bad = [c for c in f['counts'] if c % unit]
    if bad:
        return Verdict(False, 'counts %r not whole multiples of the picture unit %s' % (bad, unit))
    s = last_sentence(q['prompt']); c = f['counts']
    if 'in all' in s:
        return Expect(str(sum(c)))
    if 'largest group' in s:
        return Expect(str(max(c)))
    ids = mentions(s, f['labels'])
    if 'more' in s:
        assert len(ids) == 2, (ids, s)
        return Expect(str(c[ids[0]] - c[ids[1]]))
    assert len(ids) == 1, (ids, s)
    return Expect(str(c[ids[0]]))


@ref('acpict', 'read the pictograph counts (quantity = number of pictures x key) from the figure')
def acpict(q):
    return picto_core(q)


@ref('acpicthalf', 'pictograph with half pictures: counts checked to be multiples of key/2; read the count / sum')
def acpicthalf(q):
    return picto_core(q, True)


@ref('acpictmore', 'difference of two pictograph counts')
def acpictmore(q):
    return picto_core(q)


@ref('acpicttab', 'pictograph/table reading: table value / key pictures; total; largest')
def acpicttab(q):
    f = q['figure']; s = last_sentence(q['prompt'])
    if f['type'] == 'table':
        m = re.search(r'standing for (\d+)', q['prompt']); key = int(m.group(1))
        rows = {str(r[0]).lower(): r[1] for r in f['rows']}
        ids = [k for k in rows if re.search(r'(?<![a-z])' + k + r'(?![a-z])', s.lower())]
        assert len(ids) == 1, (ids, s)
        v = rows[ids[0]]
        if v % key:
            return Verdict(False, 'table value %s not a multiple of key %s' % (v, key))
        return Expect(str(v // key))
    return picto_core(q)


def bars_generic(q):
    f = q['figure']
    err = fig_bars_check(q, f)
    if err:
        return Verdict(False, err)
    return Expect(str(bar_answer(last_sentence(q['prompt']), f['labels'], f['values'])))


@ref('adbar', 'read bar values from the figure; sum, difference, max-min')
def adbar(q):
    return bars_generic(q)


@ref('afbar', 'read bar values from the figure (scale checked); sums/differences')
def afbar(q):
    return bars_generic(q)


@ref('adrec', 'tally the child list in the figure by gender and food')
def adrec(q):
    rows = q['figure']['rows']
    s = last_sentence(q['prompt']).lower()
    sex = 'Boy' if 'boys' in s else 'Girl' if 'girls' in s else None
    food = 'Idli' if 'idli' in s else 'Dosa' if 'dosa' in s else None
    if 'in all' in s and 'chose' in s:
        return Expect(str(sum(1 for r in rows if r[2] == food)))
    if 'are there in all' in s:
        return Expect(str(sum(1 for r in rows if r[1] == sex)))
    return Expect(str(sum(1 for r in rows if r[1] == sex and r[2] == food)))


def tally_count(cell):
    n = 0
    for tok in cell.split():
        if tok == '||||/':
            n += 5
        elif set(tok) == {'|'} and len(tok) <= 4:
            n += len(tok)
        else:
            raise ValueError('bad tally token ' + tok)
    return n


@ref('adtally', 'count tally marks from the figure (||||/ = 5)')
def adtally(q):
    rows = q['figure']['rows']
    labels = [r[0] for r in rows]; vals = [tally_count(r[1]) for r in rows]
    s = last_sentence(q['prompt']).lower()
    if 'altogether' in s:
        return Expect(str(sum(vals)))
    ids = mentions(s, labels)
    if 'more' in s:
        return Expect(str(vals[ids[0]] - vals[ids[1]]))
    assert len(ids) == 1
    return Expect(str(vals[ids[0]]))


@ref('adtwo', 'missing entry of a 2x2 table with totals, found from the row sum and cross-checked with the column sum')
def adtwo(q):
    rows = q['figure']['rows']
    t = [list(r[1:]) for r in rows]
    pos = [(i, j) for i, r in enumerate(t) for j, v in enumerate(r) if v == '?']
    assert len(pos) == 1
    i, j = pos[0]
    # unknown from the row relation (row: a + b = total) or, for the last row, the column relation
    vals = []
    if i < 2:
        others = [t[i][k] for k in range(3) if k != j]
        vals.append(others[1] - others[0] if j < 2 else others[0] + others[1])
    else:
        others = [t[k][j] for k in range(3) if k != i]
        vals.append(others[0] + others[1])
    # second route
    if j < 2:
        c = [t[k][j] for k in range(3) if k != i]
        vals.append(c[1] - c[0] if i < 2 else c[0] + c[1])
    else:
        c = [t[k][j] for k in range(3) if k != i]
        vals.append(c[1] - c[0] if i < 2 else c[0] + c[1])
    if vals[0] != vals[1]:
        return Verdict(False, 'table inconsistent: %r' % vals)
    return Expect(str(vals[0]))


@ref('advenn', '2x2 table as a Venn partition: both / cricket only / kho only / neither')
def advenn(q):
    r = q['figure']['rows']
    both, c_only, k_only, none = r[0][1], r[0][2], r[1][1], r[1][2]
    s = last_sentence(q['prompt']).lower()
    if 'at least one' in s:
        return Expect(str(both + c_only + k_only))
    if 'exactly one' in s:
        return Expect(str(c_only + k_only))
    if 'in the class' in s:
        return Expect(str(both + c_only + k_only + none))
    if 'play cricket' in s:
        return Expect(str(both + c_only))
    if 'play kho' in s:
        return Expect(str(both + k_only))
    raise ValueError(s)


@ref('afpie', 'children in a sector = n x angle/360 (angles in the figure; missing fraction from the other angles)')
def afpie(q):
    f = q['figure']
    n = int(re.search(r'the (\d+) ', q['prompt']).group(1))
    labs = [re.sub(r'\s*\(.*\)', '', l) for l in f['labels']]
    ang = f['values']
    if sum(ang) != 360:
        return Verdict(False, 'angles do not sum to 360')
    # cross-check each written fraction against its angle
    for l, a in zip(f['labels'], ang):
        m = re.search(r'\((\d+)/(\d+)\)', l)
        if m and Fraction(int(m.group(1)), int(m.group(2))) * 360 != a:
            return Verdict(False, 'label fraction %s vs angle %s' % (l, a))
    s = last_sentence(q['prompt'])
    ids = mentions(s, labs)
    assert len(ids) == 1, (ids, s)
    v = Fraction(n * ang[ids[0]], 360)
    return Expect(str(v))


@ref('afpieang', 'angle = 360 k / n, or k = n angle / 360')
def afpieang(q):
    p = q['prompt']
    if p.startswith('In a class of'):
        n, k = map(int, re.findall(r'\d+', p)[:2])
        return Expect(str(Fraction(360 * k, n)))
    n, ang = map(int, re.findall(r'\d+', p)[:2])
    return Expect(str(Fraction(n * ang, 360)))


@ref('akbarpct', 'bar value / sum of bars x 100')
def akbarpct(q):
    f = q['figure']
    err = fig_bars_check(q, f)
    if err:
        return Verdict(False, err)
    ids = mentions(last_sentence(q['prompt']), f['labels'])
    assert len(ids) == 1, (ids, q['prompt'])
    return Expect(str(Fraction(100 * f['values'][ids[0]], sum(f['values']))))


@ref('akfmean', 'sum(x f) / sum(f) from the frequency table in the figure')
def akfmean(q):
    r = q['figure']['rows']
    return Expect(str(Fraction(sum(x * f for x, f in r), sum(f for _, f in r))))


@ref('akfreq', 'count the raw data in the figure grid')
def akfreq(q):
    data = [v for r in q['figure']['rows'] for v in r]
    n = int(re.search(r'of (\d+) students', q['prompt']).group(1))
    if len(data) != n:
        return Verdict(False, 'grid has %d values, prompt says %d' % (len(data), n))
    s = last_sentence(q['prompt'])
    k = int(re.findall(r'\d+', s)[-1])
    if 'more than' in s or 'bigger than' in s:
        return Expect(str(sum(1 for v in data if v > k)))
    return Expect(str(sum(1 for v in data if v == k)))


@ref('akgroup', 'bin the raw marks in the figure grid into [lo, hi) classes')
def akgroup(q):
    data = [v for r in q['figure']['rows'] for v in r]
    p = q['prompt']
    n = int(re.search(r'of (\d+) students', p).group(1))
    top = int(re.search(r'out of (\d+)', p).group(1))
    cls = [(int(a), int(b)) for a, b in re.findall(r'(\d+)–(\d+)', p.split('where')[0])]
    if len(data) != n:
        return Verdict(False, 'grid size %d != %d' % (len(data), n))
    tot = sum(1 for v in data for a, b in cls if a <= v < b)
    if tot != n:
        return Verdict(False, 'data outside classes: %r' % [v for v in data if not any(a <= v < b for a, b in cls)])
    a, b = map(int, re.findall(r'(\d+)–(\d+)', p.split('How many')[1])[0])
    return Expect(str(sum(1 for v in data if a <= v < b)))


@ref('akhist', 'histogram bars read from the figure; class boundaries from the labels')
def akhist(q):
    f = q['figure']
    cls = [tuple(map(int, l.split('–'))) for l in f['labels']]
    v = f['values']
    s = last_sentence(q['prompt'])
    if 'in all' in s:
        return Expect(str(sum(v)))
    m = re.search(r'(\d+)–(\d+)\?', s)
    if m:
        return Expect(str(v[cls.index((int(m.group(1)), int(m.group(2))))]))
    k = int(re.search(r'(\d+)', s).group(1))
    if 'or more' in s:
        return Expect(str(sum(c for (a, b), c in zip(cls, v) if a >= k)))
    if 'less than' in s:
        return Expect(str(sum(c for (a, b), c in zip(cls, v) if b <= k)))
    raise ValueError(s)


@ref('akmed', 'sort and take the middle / mean of the two middle values')
def akmed(q):
    xs = sorted(int(x) for x in re.findall(r'-?\d+', q['prompt'].split(':')[1]))
    n = len(xs)
    return Expect(str(Fraction(xs[n // 2]) if n % 2 else Fraction(xs[n // 2 - 1] + xs[n // 2], 2)))


@ref('akmode', 'most frequent value; flags ties')
def akmode(q):
    xs = [int(x) for x in re.findall(r'\d+', q['prompt'].split(':')[1].split('What')[0])]
    from collections import Counter
    c = Counter(xs); top = max(c.values()); modes = [k for k, v in c.items() if v == top]
    if len(modes) != 1:
        return Ambiguous('data have modes %r' % modes)
    return Expect(str(modes[0]))
