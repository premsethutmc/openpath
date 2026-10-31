"""HELDOUT6 metrics (written before the first HELDOUT6 run; labels are the corpus author's and are never edited here).
usage: python3 heldout6-metrics.py <corpus.json> <baseline-trace.json> <new-trace.json>
"""
import json,sys,collections
corp={c['id']:c for c in json.load(open(sys.argv[1]))}
runs={'baseline (eca220f0)':json.load(open(sys.argv[2])),'B2':json.load(open(sys.argv[3]))}
VALID=('valid','valid-jump')
def fam(c): return c.get('category') or c.get('family') or '?'
for tag,res in runs.items():
    s=collections.Counter(); fa=[]; fr=[]; unsup=collections.Counter(); fx=collections.Counter(); amb=collections.Counter()
    for r in res:
        c=corp[r['id']]; e=c['expect']; g=r['got']; p2=r.get('p2') or {}
        s['items']+=1
        if g=='verified' and e not in VALID: fa.append((r['id'],e,c['statement'],c['lines']))
        if e in VALID:
            s['valid_total']+=1; s['valid_certified']+= g=='verified'
            if e=='valid': s['valid_strict_total']+=1; s['valid_strict_certified']+= g=='verified'
            if g=='invalid': fr.append((r['id'],'reported invalid'))
            elif g in('ambiguous','malformed'): fr.append((r['id'],f'reported {g}'))
            elif g=='incomplete': fr.append((r['id'],'reported incomplete'))
            elif g!='verified': unsup[fam(c)]+=1
        if e=='invalid':
            s['invalid_total']+=1; s['invalid_detected']+= g=='invalid'
            if g=='invalid': s['first_invalid_exact']+= r.get('gotInvalid')==c.get('firstInvalid')
            elif g!='verified': unsup[fam(c)+' (invalid item not detected)']+=1
        if e=='incomplete': s['incomplete_total']+=1; s['incomplete_reported_incomplete']+= g=='incomplete'
        if e=='ambiguous': s['ambiguous_total']+=1; amb[g]+=1; s['ambiguous_refused']+= g=='ambiguous'
        if e=='malformed': s['malformed_total']+=1; s['malformed_not_judged']+= g not in('verified','invalid','incomplete')
        if e in('ambiguous','malformed') and g in('verified','invalid','incomplete'): s['notation_judged_mathematically']+=1
        # final answer, judged on its own by the P2 evidence (independent of the method verdict)
        if c.get('finalAnswerCorrect') is not None and p2.get('final') is not None:
            fx['decided']+=1; fx['agrees_with_label']+= p2['final']==c['finalAnswerCorrect']
        # parser reach: the engine's verdict is the P2 authority's verdict on an item P2 decides
        if p2.get('status') in('verified','invalid'):
            s['p2_decides']+=1; s['engine_reaches_p2']+= (g=='verified' and p2['status']=='verified') or (g=='invalid' and p2['status']=='invalid')
    print(f'== {tag}')
    for k in sorted(s): print(f'   {k:36} {s[k]}')
    print(f'   false mathematical accepts            {len(fa)}')
    for x in fa: print('      ',x)
    print(f'   false rejects (valid not certified, by kind)  {collections.Counter(k for _,k in fr)}  {fr[:10]}')
    print(f'   valid/invalid items left unsupported by family: {dict(sorted(unsup.items()))}')
    print(f'   ambiguous items reported as: {dict(amb)}')
    print(f'   final answer (P2 evidence vs label): {dict(fx)}')
