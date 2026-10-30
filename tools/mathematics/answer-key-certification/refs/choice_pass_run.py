#!/usr/bin/env python3
"""Standalone runner for the choice-pass slice (letter-keyed multiple-choice families whose option texts are in $DATA/opts).

  PYTHONPATH=<sympy> python3 -m refs.choice_pass_run --data /tmp/certdata --out /tmp/certout/choice-pass [--family f1,f2] [--force]

For every released question it asks the family's judge which options are correct, derived from the statement/params/figure
(never from the stored key), then requires exactly one correct option and that it is the keyed letter. Writes the same per-family
result JSON as certify.py to <out>/fam/<family>.json, plus register.json, unsupported.json and critical/<family>.md.
"""
import argparse
import json
import os
import re
import sys
import time
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from refs.choice_pass_util import JUDGES, Ambiguous, Defect, Unsupported, nm  # noqa: E402
from refs import choice_pass_a, choice_pass_b  # noqa: E402,F401

FAMS = ("aaday aaddmm aaseason aaspan aaways aaweek ab24h abenough abunit abwunit acmcmp adbartf adrace aeampm aewcmp ajcmpx ajpfdc ajprop ajrcmp ajrcq "
        "akmex akprim akscale akssl amdec amirr amterm anavgav anaxiom anstack ansure anvalid anweek aqrank ascpow asmex atcv atindt atvtype avdfact avdirv "
        "avfold avlike avprop avstatq avvcmp").split()


def load(data, fam):
    qs = [json.loads(l) for l in open(f'{data}/q/{fam}.jsonl') if l.strip()]
    opts = {}
    for l in open(f'{data}/opts/{fam}.jsonl'):
        if l.strip():
            d = json.loads(l); opts[d['id']] = d['options']
    return qs, opts


def run_family(data, fam):
    spec = JUDGES[fam]
    qs, opts = load(data, fam)
    res = {'family': fam, 'released': len(qs), 'method': spec['method'], 'coverage': spec['coverage'], 'assumptions': spec['assumptions'],
           'checked': 0, 'ok': 0, 'mismatch': 0, 'form': 0, 'incomplete': 0, 'ambiguous': 0, 'unsupported': 0, 'refError': 0, 'defect': 0,
           'mcChecked': 0, 'mcBad': 0, 'wordChecked': 0, 'wordBad': 0, 'dupOptionQuestions': 0, 'timedOut': False, 'examples': {},
           'unsupportedReasons': {}, 'mismatchIds': [], 'formIds': [], 'incompleteIds': [], 'ambiguousIds': [], 'defectIds': [], 'unsupportedIds': [], 'refErrorIds': [],
           'noCorrectIds': [], 'multiCorrectIds': [], 'dupIds': []}
    for q in qs:
        o = opts.get(q['id'])
        res['checked'] += 1
        status, detail, derived = 'ok', '', None
        try:
            if o is None:
                raise ValueError('no options exported')
            if len(set(nm(x) for x in o)) != len(o):
                res['dupOptionQuestions'] += 1; res['dupIds'].append(q['id'])
            r = spec['fn'](q, o)
            if isinstance(r, Unsupported):
                status, detail = 'unsupported', r.reason
            elif isinstance(r, Ambiguous):
                status, detail = 'ambiguous', r.reason
            elif isinstance(r, Defect):
                status, detail = 'defect', r.reason
            else:
                res['mcChecked'] += 1
                hits = [i for i, b in enumerate(r) if b]
                key = 'ABCD'.index(q['answer'])
                derived = ''.join('ABCD'[i] for i in hits)
                if len(hits) == 0:
                    status, detail = 'ambiguous', f'no option is correct (key {q["answer"]}); options {o}'
                    res['noCorrectIds'].append(q['id']); res['mcBad'] += 1
                elif len(hits) > 1:
                    status, detail = 'ambiguous', f'{len(hits)} options are correct ({derived}); key {q["answer"]}; options {o}'
                    res['multiCorrectIds'].append(q['id']); res['mcBad'] += 1
                elif hits[0] != key:
                    status, detail = 'mismatch', f'keyed {q["answer"]} = {o[key]!r} but the correct option is {derived} = {o[hits[0]]!r}'
                    res['mcBad'] += 1
        except Exception as e:  # noqa: BLE001
            status, detail = 'refError', f'{type(e).__name__}: {e}'[:200]
        res[status] += 1
        if status == 'unsupported':
            res['unsupportedReasons'][detail[:80]] = res['unsupportedReasons'].get(detail[:80], 0) + 1
            res['unsupportedIds'].append(q['id'])
        elif status != 'ok':
            ids = {'mismatch': 'mismatchIds', 'ambiguous': 'ambiguousIds', 'defect': 'defectIds', 'refError': 'refErrorIds'}[status]
            res[ids].append(q['id'])
            lst = res['examples'].setdefault(status, [])
            if len(lst) < 8:
                lst.append({'id': q['id'], 'params': q['params'], 'prompt': q['prompt'], 'stored': q['answer'], 'options': o, 'derived': derived, 'detail': detail, 'figure': q.get('figure')})
        if q.get('word'):
            res['wordChecked'] += 1
            if q['word']['answer'] != q['answer']:
                res['wordBad'] += 1
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='/tmp/certdata')
    ap.add_argument('--out', default='/tmp/certout/choice-pass')
    ap.add_argument('--family')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    os.makedirs(f'{a.out}/fam', exist_ok=True)
    for fam in (a.family.split(',') if a.family else FAMS):
        dest = f'{a.out}/fam/{fam}.json'
        if os.path.exists(dest) and not a.force:
            continue
        if fam not in JUDGES:
            print('no judge for', fam, file=sys.stderr); continue
        t0 = time.time()
        try:
            res = run_family(a.data, fam)
        except Exception:  # noqa: BLE001
            res = {'family': fam, 'fatal': traceback.format_exc()[-800:]}
        json.dump(res, open(dest + '.tmp', 'w'), ensure_ascii=False)
        os.replace(dest + '.tmp', dest)
        print(fam, {k: res.get(k) for k in ('released', 'ok', 'mismatch', 'ambiguous', 'defect', 'unsupported', 'refError', 'dupOptionQuestions')} if 'fatal' not in res else 'FATAL ' + res['fatal'][-300:], f'{time.time()-t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
