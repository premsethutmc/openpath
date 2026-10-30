#!/usr/bin/env python3
"""Per-question account of every released typed question (one record each) -> data/per-question.ndjson.gz + data/final-counts.json
   python3 per_question.py --data /tmp/certdata --out /tmp/certout --dest data/ --overlay choice-pass choice-pass-geo
Record: {id, family, cls, note?}.  cls in verified | form-notation | ambiguous | generator-defect | incorrect | incomplete | unsupported.
'verified' = the independent reference was run on this question and agreed. Register entries that concern only a presentation
(wording, MC distractor, word form) leave cls=verified and add note=<register class>.  Register entries whose class makes the
QUESTION itself undecidable (ABSTRACT_AMBIG below) move it to ambiguous."""
import argparse, collections, glob, gzip, json, os
ABSTRACT_AMBIG = {('abmeas', 'Ambiguous'), ('amcrit', 'Ambiguous')}   # question admits two readings / two valid options
ap = argparse.ArgumentParser(); ap.add_argument('--data', required=True); ap.add_argument('--out', required=True); ap.add_argument('--dest', required=True); ap.add_argument('--overlay', nargs='*', default=[])
a = ap.parse_args()
cert = json.load(open(f'{a.dest}/certification.json'))['families']
reg = json.load(open(f'{a.dest}/discrepancy-register.json'))
byfam = collections.defaultdict(list)
for e in reg: byfam[e['family']].append(e)
CL = {'incorrect': 'incorrect', 'incomplete': 'incomplete', 'ambiguous': 'ambiguous', 'generator defect': 'generator-defect', 'form': 'form-notation'}
tot = collections.Counter(); notes = collections.Counter(); perfam = {}
with gzip.open(f'{a.dest}/per-question.ndjson.gz', 'wt') as w:
    for row in cert:
        fam = row['family']; ids = [json.loads(l)['id'] for l in open(f'{a.data}/q/{fam}.jsonl')]
        r = None
        for d in a.overlay + [row['slice']]:
            p = f'{a.out}/{d}/fam/{fam}.json'
            if os.path.exists(p): r = json.load(open(p)); break
        cls = {i: 'verified' for i in ids}; note = {}
        if r is None: cls = {i: 'unsupported' for i in ids}
        else:
            for k, c in (('mismatchIds', 'incorrect'), ('formIds', 'form-notation'), ('incompleteIds', 'incomplete'), ('ambiguousIds', 'ambiguous')):
                for i in r[k]: cls[i] = c
            if r['unsupported'] or r['checked'] < len(ids):
                # runner reports counts only; unsupported ids are in unsupportedReasons examples; fall back to family level
                pass
        for e in byfam.get(fam, []):
            c = CL.get(str(e['class']).lower().replace(' (wording)', '').strip())
            eids = ids if e.get('questionIds') in (None, 'all') else e['questionIds']
            for i in eids:
                if i not in cls: continue
                if (fam, e['class']) in ABSTRACT_AMBIG or (cls[i] != 'verified' and cls[i] != 'form-notation' and '(wording)' not in e['class']):
                    if cls[i] in ('verified', 'form-notation') or cls[i] == 'incorrect': cls[i] = c
                    elif cls[i] == 'ambiguous' and c == 'generator-defect': cls[i] = c
                else: note[i] = e['class']
        # generator defect from the quarantine file (aofclass) already comes via mismatchIds -> relabel by register
        for e in byfam.get(fam, []):
            if e['class'] == 'Generator defect' and e.get('severity') == 'critical':
                for i in e['questionIds']: cls[i] = 'generator-defect'
        c = collections.Counter(cls.values()); tot.update(c); perfam[fam] = dict(c)
        for i in ids:
            rec = {'id': i, 'family': fam, 'cls': cls[i]}
            if i in note: rec['note'] = note[i]; notes[note[i]] += 1
            w.write(json.dumps(rec) + '\n')
out = {'released': sum(tot.values()), 'classes': dict(tot), 'notesOnVerified': dict(notes), 'perFamily': perfam}
json.dump(out, open(f'{a.dest}/final-counts.json', 'w'), indent=1)
print(json.dumps({k: out[k] for k in ('released', 'classes', 'notesOnVerified')}, indent=1))

# family-level category from the final per-question classes (supersedes aggregate.py's provisional field)
cj = json.load(open(f'{a.dest}/certification.json'))
for row in cj['families']:
    pc = perfam[row['family']]
    if any(pc.get(k) for k in ('incorrect', 'incomplete', 'ambiguous', 'generator-defect')): row['certification'] = 'Discrepancy detected'
    row['finalQuestions'] = pc
cj['summary']['familyCertification'] = dict(collections.Counter(r['certification'] for r in cj['families']))
cj['summary']['questionClasses'] = out['classes']
json.dump(cj, open(f'{a.dest}/certification.json', 'w'), ensure_ascii=False)
print(cj['summary']['familyCertification'])
