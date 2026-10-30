#!/usr/bin/env python3
"""Reference-validation: write a copy of the export whose stored typed answers are deliberately wrong.
   python3 mutate.py --data /tmp/certdata --out /tmp/certmut [--per 40]
Mutation: integer/decimal/fraction/expression -> first number in the answer +1 (or text 'zz' if none); sets/tuples likewise.
Choice-letter families are skipped (they get a key-shift test in choice_pass_run.py --shift).  MC and word forms are dropped.
Then:  python3 certify.py --data /tmp/certmut --out /tmp/certmut-res --module refs.<m>   -> every checked question must NOT be 'ok'."""
import argparse, json, os, re
ap = argparse.ArgumentParser(); ap.add_argument('--data', required=True); ap.add_argument('--out', required=True); ap.add_argument('--per', type=int, default=40)
a = ap.parse_args(); os.makedirs(f'{a.out}/q', exist_ok=True)
fams = json.load(open(f'{a.data}/families.json')); json.dump(fams, open(f'{a.out}/families.json', 'w'))
def bump(s):
    m = re.search(r'\d+', s)
    return s[:m.start()] + str(int(m.group()) + 1) + s[m.end():] if m else s + ' zz'
n = 0
for f in fams:
    if f['type'] == 'choice': continue
    rows = [json.loads(l) for l in open(f'{a.data}/q/{f["family"]}.jsonl')]
    step = max(1, len(rows) // a.per); out = []
    for r in rows[::step][:a.per]:
        r.pop('mc', None); r.pop('word', None); r['answer'] = bump(str(r['answer'])); out.append(json.dumps(r, ensure_ascii=False)); n += 1
    open(f'{a.out}/q/{f["family"]}.jsonl', 'w').write('\n'.join(out) + '\n')
print(n, 'mutated questions')
