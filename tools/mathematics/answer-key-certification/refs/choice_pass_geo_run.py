#!/usr/bin/env python3
"""Runner for the choice-pass-geo slice: same logic and result JSON as choice_pass_run.py, own family list, optional key-shift mutation.

  PYTHONPATH=<sympy> python3 -m refs.choice_pass_geo_run --data /tmp/certdata --out /tmp/certout/choice-pass-geo [--family f] [--force] [--shift]
--shift: every keyed letter is moved to the next option (mutation test; a non-vacuous judge must flag every decidable question).
"""
import argparse
import json
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from refs import choice_pass_run as base  # noqa: E402
from refs.choice_pass_util import JUDGES  # noqa: E402
from refs import choice_pass_geo_a, choice_pass_geo_b, choice_pass_geo_c  # noqa: E402,F401

FAMS = ("aawhere abdir acparl aeangk aearms aecpart aemirror aertang afcube afface afkind afnet ahcfig ahconv ahname aiconvex alcvoc altheo ambptc "
        "amcrit amline ammen amreason amsimc arcircpos arcone arxyconic asoct asside au3cl awctr").split()

_load = base.load


def load_shift(data, fam):
    qs, opts = _load(data, fam)
    for q in qs:
        n = len(opts[q['id']])
        q['answer'] = 'ABCD'[('ABCD'.index(q['answer']) + 1) % n]
    return qs, opts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='/tmp/certdata')
    ap.add_argument('--out', default='/tmp/certout/choice-pass-geo')
    ap.add_argument('--family')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--shift', action='store_true')
    a = ap.parse_args()
    if a.shift:
        base.load = load_shift
    base.JUDGES.update(JUDGES)
    os.makedirs(f'{a.out}/fam', exist_ok=True)
    for fam in (a.family.split(',') if a.family else FAMS):
        dest = f'{a.out}/fam/{fam}.json'
        if os.path.exists(dest) and not a.force:
            continue
        if fam not in JUDGES:
            print('no judge for', fam, file=sys.stderr); continue
        t0 = time.time()
        try:
            res = base.run_family(a.data, fam)
        except Exception:  # noqa: BLE001
            res = {'family': fam, 'fatal': traceback.format_exc()[-800:]}
        json.dump(res, open(dest + '.tmp', 'w'), ensure_ascii=False)
        os.replace(dest + '.tmp', dest)
        print(fam, {k: res.get(k) for k in ('released', 'ok', 'mismatch', 'ambiguous', 'defect', 'unsupported', 'refError', 'dupOptionQuestions')} if 'fatal' not in res else 'FATAL ' + res['fatal'][-300:], f'{time.time()-t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
