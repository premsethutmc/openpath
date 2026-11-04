#!/usr/bin/env python3
"""Recompute every label in adversarial.json from scratch with SymPy (adv_oracle, two routes per line)
and exit 1 on any mismatch, duplicate, small category, or hash drift. Does not import the generator."""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import adv_oracle as O

STYLE_FIELDS = ['status', 'first_invalid', 'invalid_at', 'error_class', 'final_verdict', 'step_flags', 'step_labels']


def main():
    raw = open(os.path.join(HERE, 'adversarial.json'), encoding='utf-8').read()
    tasks = json.loads(raw)['tasks']
    bad, seen, cats = [], set(), {}
    for t in tasks:
        cats[t['category']] = cats.get(t['category'], 0) + 1
        k = (t['problem'], tuple(t['lines']))
        if k in seen:
            bad.append((t['id'], 'duplicate'))
        seen.add(k)
        try:
            lr = O.analyze(t['problem'], t['lines'], 'lr')
            ti = O.analyze(t['problem'], t['lines'], 'tight')
            tr = O.truth(t['problem'])
        except Exception as e:
            bad.append((t['id'], 'oracle failure %r' % e))
            continue
        e = t['expected']
        if tr != t['truth']:
            bad.append((t['id'], 'truth mismatch'))
        if t['category'] == 'ambiguous-notation':
            if lr == ti:
                want = dict(lr, readings_agree=True)
            else:
                if e.get('status') != 'ambiguous' or e.get('readings') != {'lr': lr, 'tight': ti}:
                    bad.append((t['id'], 'readings mismatch'))
                continue
            if e != want:
                bad.append((t['id'], 'agree-case mismatch'))
        else:
            if lr != ti:
                bad.append((t['id'], 'readings differ outside ambiguous category'))
            if e != lr:
                bad.append((t['id'], 'expected mismatch: got %s want %s' % (lr, e)))
        if t.get('family') != 'H':
            bad.append((t['id'], 'family'))
    for c, n in cats.items():
        if n < 30:
            bad.append((c, 'category below 30: %d' % n))
    if len(cats) != 10:
        bad.append(('categories', 'expected 10, got %d' % len(cats)))
    fz = open(os.path.join(HERE, 'FROZEN.md'), encoding='utf-8').read()
    sha = hashlib.sha256(raw.encode('utf-8')).hexdigest()
    if sha not in fz:
        bad.append(('FROZEN.md', 'sha mismatch (file %s)' % sha))
    for b in bad:
        print('MISMATCH', b)
    print('checked %d tasks; %d problems; sha256 %s' % (len(tasks), len(bad), sha))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
