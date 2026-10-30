"""part B: means, medians, modes, dispersion, mixtures (statistics). Reads tables from the exported figure / numbers from the prompt."""
import re
from collections import Counter
from kit import ref, Expect, Verdict, Unsupported, Ambiguous, Fraction, sp  # noqa: F401


def fr(x):
    return Fraction(str(x))


def freq_table(q):
    f = q['figure']
    xs = [fr(x) for x in f['head'][1:]]
    fs = [fr(x) for x in f['rows'][0][1:]]
    return xs, fs


def grouped_table(q):
    rows = q['figure']['rows']
    cls = []
    for r in rows:
        a, b = str(r[0]).split('–')
        cls.append((fr(a), fr(b), fr(r[1])))
    return cls


def expand(xs, fs):
    out = []
    for x, f in zip(xs, fs):
        out += [x] * int(f)
    return out


def median_list(v):
    v = sorted(v); n = len(v)
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2


@ref('anaddv', 'exact arithmetic: (n m +/- x)/(n +/- 1)')
def anaddv(q):
    n, m, x = map(int, re.findall(r'-?\d+', q['prompt'])[:3])
    if 'added' in q['prompt']:
        return Expect(str(Fraction(n * m + x, n + 1)))
    return Expect(str(Fraction(n * m - x, n - 1)))


@ref('anempir', 'mode of a discrete table = value with the largest frequency; empirical relation mode = 3 median - 2 mean (textbook)')
def anempir(q):
    p = q['prompt']
    if p.startswith('The table'):
        xs, fs = freq_table(q)
        top = max(fs); ms = [x for x, f in zip(xs, fs) if f == top]
        if len(ms) != 1:
            return Ambiguous('bimodal table %r' % ms)
        return Expect(str(ms[0]))
    a, b = map(int, re.findall(r'-?\d+', p)[:2])
    if 'mean is' in p and 'median is' in p:
        return Expect(str(3 * b - 2 * a))                       # mode
    if 'mean is' in p and 'mode is' in p:
        return Expect(str(Fraction(b + 2 * a, 3)))              # median
    if 'median is' in p and 'mode is' in p:
        return Expect(str(Fraction(3 * a - b, 2)))              # mean
    raise ValueError(p)


@ref('anfmed', 'expand the frequency table into the full ordered list and take the middle')
def anfmed(q):
    xs, fs = freq_table(q)
    return Expect(str(median_list(expand(xs, fs))))


@ref('anfreq', 'bin the raw data into [lo,hi) classes')
def anfreq(q):
    p = q['prompt']
    n = int(re.search(r'of (\d+) students|(\d+) students', p).group(0).split()[-2] if False else re.search(r'(\d+) students', p).group(1))
    data = [fr(x) for x in re.findall(r'-?\d+(?:\.\d+)?', p.split('are:')[1].split('They are grouped')[0])]
    if len(data) != n:
        return Verdict(False, 'data count %d != %d' % (len(data), n))
    cls = [(fr(a), fr(b)) for a, b in re.findall(r'(\d+)–(\d+)', p.split('where')[0])]
    if sum(1 for v in data for a, b in cls if a <= v < b) != n:
        return Verdict(False, 'data outside classes')
    a, b = re.findall(r'(\d+)–(\d+)', p.split('frequency of the class')[1])[0]
    return Expect(str(sum(1 for v in data if fr(a) <= v < fr(b))))


@ref('angmean', 'mean via class marks: sum(f x_mid)/sum(f)')
def angmean(q):
    c = grouped_table(q)
    return Expect(str(sum(f * (a + b) / 2 for a, b, f in c) / sum(f for _, _, f in c)))


@ref('angmedian', 'median read from the ogive: linear interpolation of the cumulative frequency polygon at n/2')
def angmedian(q):
    c = grouped_table(q)
    n = sum(f for _, _, f in c); cum = 0
    for a, b, f in c:
        if cum + f >= n / 2:
            return Expect(str(a + (b - a) * (n / 2 - cum) / f))
        cum += f


@ref('angmode', 'modal class interpolation: l + (f1-f0)/(2 f1 - f0 - f2) h (textbook formula); modal class unique check',
     assumptions='textbook grouped-mode formula; a modal class tie is reported ambiguous')
def angmode(q):
    c = grouped_table(q)
    fs = [f for _, _, f in c]
    top = max(fs)
    if fs.count(top) != 1:
        return Ambiguous('tied modal classes')
    i = fs.index(top)
    f0 = fs[i - 1] if i > 0 else 0
    f2 = fs[i + 1] if i + 1 < len(fs) else 0
    a, b, f1 = c[i]
    d = 2 * f1 - f0 - f2
    if d == 0:
        return Ambiguous('zero denominator')
    return Expect(str(a + (f1 - f0) / d * (b - a)))


@ref('angstep', 'direct sum over classes of f (x_mid - a) [/h]')
def angstep(q):
    c = grouped_table(q)
    p = q['prompt']
    a = fr(re.search(r'assumed mean a = ([\d.]+)', p).group(1))
    cls = re.search(r'class mark of (\d+)–(\d+)', p)
    if (fr(cls.group(1)) + fr(cls.group(2))) / 2 != a:
        return Verdict(False, 'a is not the class mark of the named class')
    tot = sum(f * ((x_a + x_b) / 2 - a) for x_a, x_b, f in c)
    if 'step-deviation' in p:
        h = fr(re.search(r'class width h = ([\d.]+)', p).group(1))
        if any(b - a_ != h for a_, b, _ in c):
            return Verdict(False, 'class width inconsistent')
        tot /= h
    return Expect(str(tot))


@ref('anpct', 'part / total x 100 from the bar values; total checked against the prompt')
def anpct(q):
    f = q['figure']; v = f['values']
    n = int(re.search(r'the (\d+) children', q['prompt']).group(1))
    if sum(v) != n:
        return Verdict(False, 'bars sum %d != %d' % (sum(v), n))
    s = q['prompt'].split('part for children who')[1].split('?')[0].lower()
    hit = [i for i, l in enumerate(f['labels']) if re.search(r'\b' + l[:4], s)]
    assert len(hit) == 1, (s, hit)
    return Expect(str(Fraction(100 * v[hit[0]], n)))


@ref('anumean', 'sum(xf)/sum(f) from the table')
def anumean(q):
    xs, fs = freq_table(q)
    return Expect(str(sum(x * f for x, f in zip(xs, fs)) / sum(fs)))


@ref('anwmean', 'combined mean = total marks / total students')
def anwmean(q):
    n1, m1, n2, m2 = map(int, re.findall(r'\d+', q['prompt'])[:4])
    tot = int(re.search(r'all (\d+) students', q['prompt']).group(1))
    if tot != n1 + n2:
        return Verdict(False, 'total count wrong')
    return Expect(str(Fraction(n1 * m1 + n2 * m2, n1 + n2)))


@ref('atgvar', 'variance of grouped data: direct sum f(x - mean)^2/n; sums of f u^2, f d^2 directly')
def atgvar(q):
    c = grouped_table(q)
    mids = [(a + b) / 2 for a, b, _ in c]; fs = [f for _, _, f in c]
    A = mids[len(c) // 2]
    h = c[0][1] - c[0][0]
    p = q['prompt']
    if len(c) % 2 == 0:
        return Ambiguous('even number of classes: middle class undefined')
    if 'find Σfu' in p or 'Σfu²' in p:
        return Expect(str(sum(f * ((m - A) / h) ** 2 for m, f in zip(mids, fs))))
    if 'Σfd²' in p:
        return Expect(str(sum(f * (m - A) ** 2 for m, f in zip(mids, fs))))
    n = sum(fs); mean = sum(m * f for m, f in zip(mids, fs)) / n
    return Expect(str(sum(f * (m - mean) ** 2 for m, f in zip(mids, fs)) / n))


@ref('atmdf', 'mean deviation from the expanded list of observations (mean or median; grouped: class marks)')
def atmdf(q):
    p = q['prompt']
    if 'grouped' in p:
        c = grouped_table(q)
        data = expand([(a + b) / 2 for a, b, _ in c], [f for _, _, f in c])
    else:
        xs, fs = freq_table(q)
        data = expand(xs, fs)
    centre = sum(data) / len(data) if 'about the mean' in p else median_list(data)
    return Expect(str(sum(abs(x - centre) for x in data) / len(data)))


@ref('atmdmean', 'mean deviation about the mean of the data')
def atmdmean(q):
    xs = [Fraction(x) for x in re.findall(r'-?\d+', q['prompt'].split('data')[1])]
    m = sum(xs) / len(xs)
    return Expect(str(sum(abs(x - m) for x in xs) / len(xs)))


@ref('atmdmed', 'mean deviation about the median of the data')
def atmdmed(q):
    xs = [Fraction(x) for x in re.findall(r'-?\d+', q['prompt'].split('data')[1])]
    m = median_list(xs)
    return Expect(str(sum(abs(x - m) for x in xs) / len(xs)))


@ref('atsd', 'population standard deviation sqrt(sum (x-mean)^2 / n), exact surd via SymPy')
def atsd(q):
    xs = [Fraction(x) for x in re.findall(r'-?\d+', q['prompt'].split('data')[1].split('Give')[0])]
    m = sum(xs) / len(xs)
    var = sum((x - m) ** 2 for x in xs) / len(xs)
    e = sp.sqrt(sp.Rational(var.numerator, var.denominator))
    return Expect(str(e))


@ref('atvar', 'population variance of a frequency table = sum f (x - mean)^2 / sum f')
def atvar(q):
    xs, fs = freq_table(q)
    n = sum(fs); m = sum(x * f for x, f in zip(xs, fs)) / n
    return Expect(str(sum(f * (x - m) ** 2 for x, f in zip(xs, fs)) / n))


@ref('avfmed', 'expand the table and take the middle observation')
def avfmed(q):
    rows = q['figure']['rows']
    data = expand([fr(r[0]) for r in rows], [fr(r[1]) for r in rows])
    return Expect(str(median_list(data)))


@ref('avmiss', 'missing value = 5 mean - sum of the others; deviation = missing - mean')
def avmiss(q):
    nums = [int(x) for x in re.findall(r'-?\d+', q['prompt'])]
    mean, four = nums[0], nums[1:5]
    if 'deviation' in q['prompt']:
        # deviations of all five sum to the stated total (read from the prompt): fifth = total - sum of the four deviations
        total = nums[5]
        return Expect(str(total - sum(x - mean for x in four)))
    return Expect(str(5 * mean - sum(four)))


@ref('avmix', 'weighted mean of the two components')
def avmix(q):
    p = q['prompt']
    a, b, c, d = map(int, re.findall(r'\d+', p)[:4]) if 'grocer' in p else (None,) * 4
    if 'grocer' in p:
        return Expect(str(Fraction(a * b + c * d, a + c)))
    nums = re.findall(r'\d+', p)
    n1, p1, n2, p2 = map(int, nums[:4])
    return Expect(str(Fraction(n1 * p1 + n2 * p2, n1 + n2)))


@ref('mean4', 'sum / 4')
def mean4(q):
    xs = [int(x) for x in re.findall(r'\d+', q['prompt'])]
    return Expect(str(Fraction(sum(xs), len(xs))))
