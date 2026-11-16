"""Independent references for the drawing families of 2026-11-15 (draw@1, packages/learning/src/fam/b31.ts).
Written by the same author as the families; each derives the answer from the printed question by its own method.
"""
import re

from kit import Expect, Unsupported, Verdict, ref


@ref('afmkang', 'the angle between an arm on 0 and an arm turned to the stated mark on the same scale is the stated size; checked against the 180 − reading on the other scale')
def afmkang(q):
    m = re.match(r'Make an angle of (\d+)° on the protractor\. One arm lies along the line marked 0 on the (inner|outer) scale\.', q['prompt'])
    if not m:
        return Unsupported('prompt form')
    d = int(m[1])
    fixed_inner = 0 if m[2] == 'inner' else 180
    arm_inner = d if fixed_inner == 0 else 180 - d
    angle = abs((180 - arm_inner) - (180 - fixed_inner))
    return Expect(str(angle))


@ref('adbarmk', 'read each value from the pictured table, in order; every value must lie on a line of the stated scale')
def adbarmk(q):
    m = re.search(r'each line is (\d+) ', q['prompt'])
    fig = q.get('figure') or {}
    if not m or fig.get('type') != 'table':
        return Unsupported('prompt or picture form')
    step = int(m[1])
    vals = [int(r[1]) for r in fig['rows']]
    if any(v % step for v in vals):
        return Verdict(False, 'a value is not on a line of the scale')
    return Expect('(' + ', '.join(map(str, vals)) + ')')
