"""b27 times tables (amf2510, amf34, amf69, amderive). Independent of production code: the statement is read and the
product (or the missing factor, by trying every whole number) is computed directly."""
import re
from kit import ref, Expect


def fact(q):
    p = q['prompt']
    m = re.fullmatch(r'(\d+) × (\d+) = \?', p)
    if m:
        return Expect(str(int(m.group(1)) * int(m.group(2))))
    m = re.fullmatch(r'(?:(\d+) × \?|\? × (\d+)) = (\d+)\. What is the missing number\?', p)
    t, prod = int(m.group(1) or m.group(2)), int(m.group(3))
    hits = [k for k in range(0, prod + 1) if k * t == prod]
    assert len(hits) == 1, hits
    return Expect(str(hits[0]))


for _fam in ('amf2510', 'amf34', 'amf69'):
    ref(_fam, 'read the two numbers and multiply, or try every whole number for the missing factor', 'exhaustive')(fact)


@ref('amderive', 'read the new fact a × n from the statement and multiply directly (the known fact is not used)', 'exhaustive')
def amderive(q):
    m = re.search(r'Use it to work out (\d+) × (\d+)\.', q['prompt'])
    return Expect(str(int(m.group(1)) * int(m.group(2))))
