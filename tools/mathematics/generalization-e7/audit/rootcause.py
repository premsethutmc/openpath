# Groups the 678 frozen-holdout outcomes by the engine's own per-step messages (diagnostic only; run diag.ts first to create diag-steps.json). Primary cause = first match in the listed order.
import json,re,collections,sys
H='tools/mathematics/generalization-e7/holdout/'; D=json.load(open(sys.argv[1])); L={l['id']:l for l in json.load(open(H+'labels.json'))}
R={r['id']:r for r in json.load(open(H+'results-raw.json'))['rows']}
PAT=[('N1 notation/syntax',r"unsupported character|unexpected trailing|expected expression|comma suffix|solution branches|conjunction may only|plus-or-minus|malformed|closing parenthesis|could not read|unreadable|power exponent|without a closing differential|a line must state an equality|parse_error|missing closing"),
('B binder/IR coverage',r"outside the exact|could not be interpreted into|no lossless natural adapter|in a limit|not in the problem variable|a function of the variable cannot|ln needs|inner series|could not be translated|geometry line must be|outside bounded|transport failed"),
('G task-grounding/binding',r"not bound|not connected|nothing in it comes|not justified by them|consistent with the facts"),
('K rule-form kernel',r"not justified by the selected exact calculus rule"),('V kernel judged invalid',r"not an identity|mathematically invalid|step \d+ is invalid"),('S solution-set completeness',r"loses solutions|lost solutions")]
tab=collections.Counter()
for i,l in L.items():
    f=D[i].get('final')
    if f==l['exp'] or f in l['alt']: continue
    msgs=' '.join([s[2] for s in D[i]['steps'] if s[0]!='verified']+[R[i]['just']]).lower()
    c=[n for n,p in PAT if re.search(p,msgs)]
    tab[('exp-verified' if l['exp']=='verified' else 'exp-nonverified', c[0] if c else 'X other/class-only')]+=1
for k,v in sorted(tab.items()): print(v,k)
