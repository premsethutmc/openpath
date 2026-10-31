"""Build the competency-graph expansion (expansion@1) from the curriculum inventory (syllabus@1).

Input:  content/learning/syllabus/<board>-g<NN>.json  (CBSE/NCERT and Tamil Nadu State Board, Grades 1-12)
Output: content/learning/competency-expansion.v1.json (new competencies and their relations)
        the syllabus files themselves, with merged ids rewritten (so every outcome names a competency that exists)

Rules (stated, never guessed around):
- An existing competency id (content/mathematics/curriculum.v1.json, competency-additions) is never changed.
- A proposal that duplicates an existing competency, or another proposal, under different wording is MERGED
  (MERGE below, each with its reason); NCERT and Tamil Nadu wording for one skill gives one competency.
- A proposed prerequisite becomes a "plausible" relation (followed by recovery, pending educator confirmation);
  a "supports" entry a "support" relation (never a gate). A prerequisite whose own grade starts AFTER the target's
  is "disputed" (it would hold a younger learner back) and is listed separately for review, not followed.
- Grade range: the widest range the boards teach it in.
Run: python3 content/learning/src/expansion.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYL = ROOT / 'syllabus'
MERGE = {
    'MATH.reasoning.algorithmic-thinking': ('MATH.reasoning.algorithms-flowcharts', 'the same skill (step-by-step algorithms), Grade 9 CBSE and Grades 6-8 TN wording'),
    'MATH.measurement.quadrilateral-area': ('MATH.measurement.parallelogram-rhombus-area', 'areas of parallelograms and rhombuses, CBSE Grade 8 and TN Grade 7 wording'),
    'MATH.algebra.zeros-coefficients': ('MATH.algebra.polynomial-zeros', 'relation of zeros and coefficients (quadratics are the first case)'),
    'MATH.algebra.function-composition': ('MATH.algebra.function-operations', 'composition is one of the operations on functions'),
    'MATH.geometry.triangle-centres': ('MATH.geometry.triangle-concurrency', 'medians, altitudes, bisectors and their points of concurrency'),
    'MATH.sequences.recursive-sequences': ('MATH.sequences.explicit-recursive-rules', 'recursive rules for sequences (Grade 7 and Grade 9)'),
    'MATH.sequences.special-series-sums': ('MATH.sequences.power-sums', 'sums of k, k squared and k cubed'),
    'MATH.algebra.lp-modelling': ('MATH.algebra.linear-programming', 'formulating a linear programme is part of the existing linear-programming competency'),
    'MATH.probability.axiomatic': ('MATH.probability.events', 'axiomatic probability on a finite sample space is the existing event-algebra competency'),
    'MATH.number.decimal-expansions': ('MATH.number.real-numbers', 'terminating and recurring decimals are part of representing rational and irrational numbers'),
    'MATH.algebra.linear-functions': ('MATH.algebra.linear-two-variables', 'y = ax + b relationships are the existing linear equations in two variables'),
}
# relations INTO existing competencies that the curricula show are needed (curated; each with its reason). They steer
# recovery only; no relation ever gates a learner, and no recorded evidence changes.
INTO_EXISTING = [
    ('MATH.number.addition-regroup', 'MATH.number.place-value-tens', 'plausible', 'regrouping trades ten ones for one ten: it rests on tens and ones'),
    ('MATH.number.subtraction-regroup', 'MATH.number.place-value-tens', 'plausible', 'exchanging a ten for ten ones rests on tens and ones'),
    ('MATH.algebra.linear-equations', 'MATH.number.integer-add', 'plausible', 'solving with negative numbers adds and subtracts integers'),
    ('MATH.algebra.linear-equations', 'MATH.number.integer-multiply', 'support', 'dividing by a negative coefficient uses the sign rules'),
    ('MATH.number.fraction-product', 'MATH.number.multiplication-tables', 'support', 'multiplying fractions multiplies whole numbers top and bottom'),
    ('MATH.number.fraction-multiply', 'MATH.number.multiplication-tables', 'support', 'a fraction of a whole number multiplies and divides whole numbers'),
    ('MATH.algebra.quadratics', 'MATH.algebra.polynomial-zeros', 'support', 'roots of a quadratic are the zeros of the polynomial'),
]
STRAND = {'matrices': 'algebra', 'sets-relations': 'algebra', 'sequences': 'algebra'}


def existing():
    cur = json.loads((ROOT.parent / 'mathematics/curriculum.v1.json').read_text())['competencies']
    add = json.loads((ROOT / 'competency-additions.v1.json').read_text())['competencies']
    return {c['id']: c for c in cur}, {c['id'] for c in add}


def main():
    base, micro = existing()
    known = set(base) | micro
    files = sorted(SYL.glob('*-g*.json'))
    props = defaultdict(list)
    for f in files:
        d = json.loads(f.read_text())
        for ch in d['chapters']:
            for o in ch['outcomes']:
                for p in o.get('proposed', []):
                    props[p['id']].append({**p, 'where': f"{d['board']}-g{d['grade']:02d}:{o['id']}", 'grade': d['grade']})
    target = lambda i: MERGE.get(i, (i, ''))[0]
    new = {}
    for pid, ps in props.items():
        tid = target(pid)
        if tid in base or tid in micro:
            continue  # merged into an existing competency
        e = new.setdefault(tid, {'id': tid, 'names': [], 'strand': None, 'lo': 99, 'hi': 0, 'prereq': set(), 'supports': set(), 'why': [], 'where': [], 'mergedFrom': set()})
        for p in ps:
            e['names'].append(p['name'])
            e['strand'] = e['strand'] or p.get('strand')
            lo, hi = p.get('gradeRange', [p['grade'], p['grade']])
            e['lo'], e['hi'] = min(e['lo'], lo, p['grade']), max(e['hi'], hi, p['grade'])
            e['prereq'] |= {target(x) for x in p.get('prerequisites', [])}
            e['supports'] |= {target(x) for x in p.get('supports', [])}
            if p.get('why'):
                e['why'].append(p['why'])
            e['where'].append(p['where'])
            if pid != tid:
                e['mergedFrom'].add(pid)
    allids = known | set(new)
    grade_of = {i: base[i]['gradeRange'][0] for i in base}
    grade_of.update({i: e['lo'] for i, e in new.items()})
    comps, relations, disputed, dropped = [], [], [], []
    for tid in sorted(new):
        e = new[tid]
        name = max(set(e['names']), key=lambda n: (e['names'].count(n), -len(n)))
        strand = e['strand'] or tid.split('.')[1]
        comps.append({
            'id': tid, 'name': name, 'strand': STRAND.get(strand, strand), 'domain': strand, 'gradeRange': [e['lo'], e['hi']],
            'objectives': sorted(set(e['names']))[:4], 'evidence': sorted(set(e['where'])),
            **({'mergedFrom': sorted(e['mergedFrom'])} if e['mergedFrom'] else {}),
            'status': 'provisional',
        })
        for p in sorted(e['prereq']):
            if p == tid:
                continue
            if p not in allids:
                dropped.append({'target': tid, 'from': p, 'reason': 'unknown competency'})
                continue
            if grade_of.get(p, 0) > e['lo']:
                disputed.append({'target': tid, 'from': p, 'reason': f'the prerequisite starts in Grade {grade_of[p]}, after the competency (Grade {e["lo"]}): it would hold a younger learner back'})
                continue
            relations.append({'target': tid, 'from': p, 'type': 'plausible', 'reason': 'proposed as mathematically required by the curriculum inventory; pending educator confirmation'})
        for s in sorted(e['supports'] - e['prereq']):
            if s == tid or s not in allids:
                continue
            relations.append({'target': tid, 'from': s, 'type': 'support', 'reason': 'helpful background named by the curriculum inventory; never a gate'})
    for t, f, ty, why in INTO_EXISTING:
        if t in allids and f in allids:
            relations.append({'target': t, 'from': f, 'type': ty, 'reason': why})
        else:
            dropped.append({'target': t, 'from': f, 'reason': 'unknown competency'})
    # cycles among followed relations (plausible and support: both are walked for recovery) are refused; the later edge
    # is listed as disputed for review
    graph = defaultdict(set)
    kept = []
    def reaches(a, b, seen=None):
        seen = seen or set()
        if a == b:
            return True
        seen.add(a)
        return any(reaches(n, b, seen) for n in graph[a] if n not in seen)
    for r in relations:
        if r['type'] in ('plausible', 'support') and reaches(r['from'], r['target']):
            disputed.append({**r, 'reason': 'would make a cycle of prerequisites'})
            continue
        if r['type'] in ('plausible', 'support'):
            graph[r['target']].add(r['from'])
        kept.append(r)
    out = {
        'schema': 'competency-expansion@1', 'version': '1.0.0', 'status': 'provisional',
        'note': 'New competencies found by comparing the Grades 1-12 CBSE/NCERT and Tamil Nadu State Board inventories (content/learning/syllabus) with the 200-competency graph. Existing ids are unchanged; no learner evidence is remapped. Written by content/learning/src/expansion.py; AI-assisted, not educator-reviewed.',
        'merged': [{'from': k, 'into': v[0], 'reason': v[1]} for k, v in sorted(MERGE.items())],
        'competencies': comps, 'relations': kept, 'disputed': disputed, 'droppedReferences': dropped,
    }
    (ROOT / 'competency-expansion.v1.json').write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
    # rewrite merged ids in the syllabus files, and move a proposal that is now known into the mapped list
    for f in files:
        d = json.loads(f.read_text())
        for ch in d['chapters']:
            for o in ch['outcomes']:
                keep = []
                for p in o.get('proposed', []):
                    tid = target(p['id'])
                    if tid in base or tid in micro:
                        if not any(m['id'] == tid for m in o.get('competencies', [])):
                            o.setdefault('competencies', []).append({'id': tid, 'fit': 'partial', 'note': f'merged from proposed {p["id"]}'})
                    else:
                        keep.append({**p, 'id': tid})
                o['proposed'] = keep
                # every outcome's competencies, existing or new, in one list for the release builder
                o['mapped'] = sorted({m['id'] for m in o.get('competencies', [])} | {p['id'] for p in keep})
        f.write_text(json.dumps(d, indent=1, ensure_ascii=False) + '\n')
    print(f'{len(comps)} new competencies ({len(base)} existing kept), {len(kept)} relations, {len(disputed)} disputed, {len(dropped)} dropped references, {len(MERGE)} merges')


if __name__ == '__main__':
    main()
