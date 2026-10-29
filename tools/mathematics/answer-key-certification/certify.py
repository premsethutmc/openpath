#!/usr/bin/env python3
"""Deterministic, resumable answer-key certification runner.

  eval "$(backend/vendor-deps.sh --audit)"        # SymPy 1.14 / mpmath without a package index
  python3 certify.py --data DIR --out DIR [--family f1,f2] [--module refs.number_a] [--force]

DIR/q/<family>.jsonl comes from export.ts. One result file per family (written atomically): DIR_OUT/fam/<family>.json.
A family with a result file is skipped (resume) unless --force. Reference modules live in refs/ and are imported by name.
"""
import argparse
import importlib
import json
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kit  # noqa: E402


def load(data, fam):
    with open(f'{data}/q/{fam}.jsonl') as f:
        return [json.loads(l) for l in f if l.strip()]


def run_family(data, fam, budget):
    spec = kit.REFS[fam]
    items = load(data, fam)
    idx = list(range(len(items))) if spec['coverage'] == 'exhaustive' else kit.sample_indices(items, spec['sample'])
    res = {'family': fam, 'released': len(items), 'method': spec['method'], 'coverage': spec['coverage'], 'assumptions': spec['assumptions'],
           'checked': 0, 'ok': 0, 'mismatch': 0, 'form': 0, 'incomplete': 0, 'ambiguous': 0, 'unsupported': 0, 'refError': 0,
           'mcChecked': 0, 'mcBad': 0, 'wordChecked': 0, 'wordBad': 0, 'timedOut': False, 'examples': {}, 'unsupportedReasons': {}, 'mismatchIds': [], 'formIds': [], 'incompleteIds': [], 'ambiguousIds': [], 'unsupportedIds': []}
    t0 = time.time()
    for i in idx:
        if time.time() - t0 > budget:
            res['timedOut'] = True
            break
        q = items[i]
        res['checked'] += 1
        try:
            r = spec['fn'](q)
            if isinstance(r, kit.Expect):
                status, detail = kit.compare(q, r)
                expected = r.text
            elif isinstance(r, kit.Verdict):
                status, detail, expected = ('ok' if r.ok else 'mismatch'), r.note, None
            elif isinstance(r, kit.Ambiguous):
                status, detail, expected = 'ambiguous', r.reason, None
            elif isinstance(r, kit.Unsupported):
                status, detail, expected = 'unsupported', r.reason, None
            else:
                raise TypeError(f'reference returned {type(r).__name__}')
        except Exception as e:  # noqa: BLE001 - a reference bug must be visible, not silently counted as verified
            status, detail, expected = 'refError', f'{type(e).__name__}: {e}'[:200], None
        res[status] += 1
        if status == 'unsupported':
            key = detail[:80]
            res['unsupportedReasons'][key] = res['unsupportedReasons'].get(key, 0) + 1
            res['unsupportedIds'].append(q['id'])
        elif status in ('mismatch', 'form', 'incomplete', 'ambiguous'):
            res[{'mismatch': 'mismatchIds', 'form': 'formIds', 'incomplete': 'incompleteIds', 'ambiguous': 'ambiguousIds'}[status]].append(q['id'])
        if status not in ('ok', 'unsupported'):
            lst = res['examples'].setdefault(status, [])
            if len(lst) < 12:
                lst.append({'id': q['id'], 'params': q['params'], 'prompt': q['prompt'], 'stored': q['answer'], 'derived': expected, 'detail': detail, 'figure': q.get('figure')})
        # the multiple-choice form: exactly one option may equal the derived answer, and it must be the keyed one
        if status in ('ok',) and q.get('mc') and isinstance(r, kit.Expect):
            res['mcChecked'] += 1
            try:
                ctx = kit.context(q)
                target = kit.oracle.meaning(q['type'], r.text, ctx)
                hits = [j for j, o in enumerate(q['mc']['options']) if kit.oracle.equal(q['type'], kit.oracle.meaning(q['type'], o, ctx), target, ctx) is True]
                key = 'ABCD'.index(q['mc']['key'])
                if hits != [key]:
                    res['mcBad'] += 1
                    lst = res['examples'].setdefault('mc', [])
                    if len(lst) < 8:
                        lst.append({'id': q['id'], 'options': q['mc']['options'], 'key': q['mc']['key'], 'equalOptions': hits})
            except Exception:  # noqa: BLE001
                pass
        if q.get('word'):
            res['wordChecked'] += 1
            if q['word']['answer'] != q['answer']:
                res['wordBad'] += 1
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--family')
    ap.add_argument('--module', action='append', default=[])
    ap.add_argument('--budget', type=float, default=300)
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    for m in a.module:
        importlib.import_module(m)
    if not a.module:  # every module in refs/
        for f in sorted(os.listdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refs'))):
            if f.endswith('.py') and not f.startswith('_'):
                importlib.import_module('refs.' + f[:-3])
    os.makedirs(f'{a.out}/fam', exist_ok=True)
    fams = a.family.split(',') if a.family else sorted(kit.REFS)
    for fam in fams:
        dest = f'{a.out}/fam/{fam}.json'
        if os.path.exists(dest) and not a.force:
            continue
        if fam not in kit.REFS:
            print('no reference for', fam, file=sys.stderr)
            continue
        try:
            res = run_family(a.data, fam, a.budget)
        except Exception:  # noqa: BLE001
            res = {'family': fam, 'fatal': traceback.format_exc()[-800:]}
        tmp = dest + '.tmp'
        json.dump(res, open(tmp, 'w'), ensure_ascii=False)
        os.replace(tmp, dest)
        print(fam, {k: res.get(k) for k in ('released', 'checked', 'ok', 'mismatch', 'form', 'incomplete', 'ambiguous', 'unsupported', 'refError', 'mcBad', 'wordBad')} if 'fatal' not in res else 'FATAL', flush=True)


if __name__ == '__main__':
    main()
