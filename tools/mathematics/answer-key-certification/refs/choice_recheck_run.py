#!/usr/bin/env python3
"""Runner for choice-recheck. PYTHONPATH=<sympy> python3 -m refs.choice_recheck_run [--out /tmp/certout/choice-recheck] [--force]
Runs every family against the real options, then a key-shift mutation, then compares with the old inferred-map / assumed-order results."""
import argparse
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from refs import choice_pass_run as base  # noqa: E402
from refs.choice_pass_util import JUDGES, nm  # noqa: E402
from refs import choice_recheck_geo, choice_recheck_num  # noqa: E402,F401

FAMS = "accoll altri arconicid aslrel aspar alcyc alnear ajcrcmp akscmp amclass".split()
DATA = '/tmp/certdata'
_load = base.load


def load_shift(data, fam):
    qs, opts = _load(data, fam)
    for q in qs:
        q['answer'] = 'ABCD'[('ABCD'.index(q['answer']) + 1) % len(opts[q['id']])]
    return qs, opts


def per_question(fam, shift=False):
    """{id: (status, derivedLetters)} via the same logic as run_family"""
    base.load = load_shift if shift else _load
    try:
        return base.run_family(DATA, fam)
    finally:
        base.load = _load


def old_letters(fam):
    """letter implied by the OLD method (inferred map / assumed order), per question id"""
    from refs import geometry_coordinate_6 as g6, geometry_coordinate_10 as g10, geometry_coordinate_util as gu
    from refs import number_b2, number_b5
    from kit import Expect
    out = {}
    qs = [json.loads(l) for l in open(f'{DATA}/q/{fam}.jsonl') if l.strip()]
    for q in qs:
        try:
            if fam in ('ajcrcmp', 'akscmp', 'amclass'):
                from kit import REFS
                r = REFS[fam]['fn'](q)
            else:
                cl = {**g6.CLS, **g10.CLS}[fam](q)
                m = gu.CHOICE_MAPS[fam]
                r = Expect(m[cl]) if not hasattr(cl, 'reason') and cl in m else cl
            out[q['id']] = r.text if isinstance(r, Expect) else None
        except Exception:  # noqa: BLE001
            out[q['id']] = None
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='/tmp/certout/choice-recheck')
    ap.add_argument('--family')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    base.JUDGES.update(JUDGES)
    os.makedirs(f'{a.out}/fam', exist_ok=True); os.makedirs(f'{a.out}/critical', exist_ok=True)
    summary = {}
    for fam in (a.family.split(',') if a.family else FAMS):
        dest = f'{a.out}/fam/{fam}.json'
        if os.path.exists(dest) and not a.force:
            continue
        t0 = time.time()
        res = per_question(fam)
        # mutation: shifted keys must be flagged for every question the judge decided as ok
        sh = per_question(fam, True)
        res['mutation'] = {'shiftedMismatch': sh['mismatch'], 'unshiftedOk': res['ok'], 'shiftedOk': sh['ok'], 'nonVacuous': sh['ok'] == 0 and sh['mismatch'] == res['ok']}
        # comparison with the old method
        old = old_letters(fam)
        qs = [json.loads(l) for l in open(f'{DATA}/q/{fam}.jsonl') if l.strip()]
        newbad = set(res['mismatchIds'] + res['ambiguousIds'] + res['defectIds'] + res['unsupportedIds'] + res['refErrorIds'])
        dis = []
        for q in qs:
            oldok = old.get(q['id']) == q['answer']
            newok = q['id'] not in newbad
            if oldok != newok:
                dis.append({'id': q['id'], 'oldLetter': old.get(q['id']), 'key': q['answer'], 'newOk': newok})
        res['oldVsNew'] = {'disagreements': len(dis), 'examples': dis[:10], 'oldOk': sum(old.get(q['id']) == q['answer'] for q in qs)}
        json.dump(res, open(dest + '.tmp', 'w'), ensure_ascii=False)
        os.replace(dest + '.tmp', dest)
        summary[fam] = {k: res[k] for k in ('released', 'ok', 'mismatch', 'ambiguous', 'defect', 'unsupported', 'refError')}
        print(fam, summary[fam], res['mutation'], res['oldVsNew']['disagreements'], f'{time.time()-t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
