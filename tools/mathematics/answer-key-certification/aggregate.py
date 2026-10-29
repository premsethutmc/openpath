#!/usr/bin/env python3
"""Join the per-slice results into one per-family certification table and a question-level account of all released questions.
   python3 aggregate.py --out /tmp/certout --meta ../grading-audit/data/family-meta.json --dest data/
Question classes (each released typed question lands in exactly one):
  verified-exhaustive   its family's reference ran over every released question and agreed
  verified-sampled      this question was among a deterministic sample the reference verified (family not fully certified)
  incorrect | incomplete | ambiguous | generator-defect   confirmed in the discrepancy register (affected ids)
  form-notation         equal in value, but not in the form the statement requires (not a maths error)
  unsupported           no independent verification (no reference, reference declined, or not in the sample)
"""
import argparse
import collections
import glob
import json
import os

CLS = {'incorrect': 'incorrect', 'incomplete': 'incomplete', 'ambiguous': 'ambiguous', 'generator defect': 'generator-defect', 'generator-defect': 'generator-defect', 'form': 'form-notation', 'form-notation': 'form-notation', 'notation': 'form-notation'}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--meta', required=True)
    ap.add_argument('--slices', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slices.json'))
    ap.add_argument('--dest', required=True)
    a = ap.parse_args()
    meta = json.load(open(a.meta))
    slices = json.load(open(a.slices))
    owner = {f: s for s, fs in slices.items() for f in fs}
    rows, register, totals = [], [], collections.Counter()
    for s in slices:
        d = f'{a.out}/{s}'
        res = {os.path.basename(p)[:-5]: json.load(open(p)) for p in glob.glob(f'{d}/fam/*.json')}
        reg = json.load(open(f'{d}/register.json')) if os.path.exists(f'{d}/register.json') else []
        uns = json.load(open(f'{d}/unsupported.json')) if os.path.exists(f'{d}/unsupported.json') else {}
        for e in reg:
            e['slice'] = s
        register += reg
        regf = collections.defaultdict(list)
        for e in reg:
            regf[e['family']].append(e)
        for fam in slices[s]:
            m = meta[fam]; released = m['released']['typed']
            r = res.get(fam)
            row = {'family': fam, 'slice': s, 'title': m['title'], 'competency': m['competency'], 'released': released, 'answerType': list(m['answerTypes'])[0] if m['answerTypes'] else None,
                   'graderVerification': {k: v for k, v in m['verification'].items()}, 'presentations': {'mc': m['released']['mc'], 'word': m['released']['word']}}
            q = collections.Counter()
            if r is None or 'fatal' in r:
                reason = uns.get(fam)
                row.update(status='Unsupported' if reason else 'Not covered', method=None, coverage=None, reason=reason or ('reference crashed: ' + r['fatal'][-200:] if r else 'no reference and no unsupported entry'))
                q['unsupported'] = released
            else:
                flagged = {'mismatch': set(r['mismatchIds']), 'form': set(r['formIds']), 'incomplete': set(r['incompleteIds']), 'ambiguous': set(r['ambiguousIds'])}
                assigned = {}
                for e in regf.get(fam, []):
                    c = CLS.get(str(e['class']).lower().strip())
                    ids = e.get('questionIds')
                    pool = set().union(*flagged.values()) if ids in (None, 'all') else set(ids)
                    for i in pool:
                        assigned[i] = c
                for kind, ids in flagged.items():
                    for i in ids:
                        q[assigned.get(i) or ('form-notation' if kind == 'form' else 'untriaged')] += 1
                q['unsupported'] += r['unsupported'] + (released - r['checked'] if not r['timedOut'] else released - r['checked'])
                if r['coverage'] == 'exhaustive':
                    q['verified-exhaustive'] += r['ok']
                else:
                    q['verified-sampled'] += r['ok']
                    q['unsupported'] += 0
                bad = sum(q[k] for k in ('incorrect', 'incomplete', 'ambiguous', 'generator-defect', 'untriaged'))
                if r['refError']:
                    status = 'Reference error'
                elif q['untriaged']:
                    status = 'Untriaged discrepancy'
                elif bad:
                    status = 'Defect found'
                elif r['coverage'] == 'exhaustive' and r['checked'] == released and r['unsupported'] == 0 and not r['timedOut'] and r['mcBad'] == 0 and r['wordBad'] == 0:
                    status = 'Verified (exhaustive)' + (' with notation issues' if q['form-notation'] else '')
                elif r['coverage'] == 'sampled' and r['unsupported'] == 0 and r['mcBad'] == 0:
                    status = 'Verified (sampled)'
                else:
                    status = 'Partially verified'
                row.update(status=status, method=r['method'], coverage=r['coverage'], assumptions=r['assumptions'], checked=r['checked'], ok=r['ok'], mismatch=r['mismatch'], form=r['form'], incomplete=r['incomplete'], ambiguous=r['ambiguous'],
                           unsupportedItems=r['unsupported'], refError=r['refError'], mcChecked=r['mcChecked'], mcBad=r['mcBad'], wordChecked=r['wordChecked'], wordBad=r['wordBad'], timedOut=r['timedOut'], unsupportedReasons=r['unsupportedReasons'], examples=r['examples'])
            row['questions'] = dict(q)
            assert sum(q.values()) == released, (fam, dict(q), released)
            totals.update(q); totals['released'] += released
            rows.append(row)
    st = collections.Counter(r['status'] for r in rows)
    verified_by_kernel = sum(r['graderVerification'].get('verified', 0) for r in rows)
    summary = {'families': len(rows), 'released': totals['released'], 'questionClasses': {k: v for k, v in totals.items() if k != 'released'}, 'familyStatus': dict(st), 'kernelVerifiedByGraderContracts': verified_by_kernel, 'register': len(register)}
    os.makedirs(a.dest, exist_ok=True)
    json.dump({'summary': summary, 'families': rows}, open(f'{a.dest}/certification.json', 'w'), ensure_ascii=False)
    json.dump(register, open(f'{a.dest}/discrepancy-register.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
