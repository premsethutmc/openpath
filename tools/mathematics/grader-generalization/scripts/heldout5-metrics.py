import json,sys,collections
corp=json.load(open('/home/claude/p2g/tools/mathematics/grader-generalization/heldout5/HELDOUT5-corpus.json'))
def run(path,tag):
    R={r['id']:r for r in json.load(open(path))}
    m=collections.Counter(); fa=[]; fr=[]; tfa=[]; fiw=[]
    for c in corp:
        r=R[c['id']]; e=c['expect']; g=r['got']
        m[f'{e}->{g}']+=1
        if g=='verified' and e in('invalid','malformed'): fa.append(c['id'])
        if g=='invalid' and e in('valid','valid-jump','incomplete'): fr.append((c['id'],r['gotInvalid'],r['reason'][:70]))
        if e=='invalid' and g=='invalid':
            m['invalid_detected']+=1
            if r['gotInvalid']==c['firstInvalid']: m['firstInvalid_exact']+=1
            else: fiw.append((c['id'],c['firstInvalid'],r['gotInvalid']))
        if e=='invalid': m['invalid_total']+=1
        if e in('valid',): m['valid_total']+=1; m['valid_verified']+= g=='verified'
        ev=r.get('evidence')
        if ev:
            for k,t in enumerate(ev['transitions']):
                lab=c['relation'][k] if k < len(c['relation']) else None
                if t['status'].startswith('certified') and t['status']!='certified-candidate-check' and lab in('implied-by','neither'): tfa.append((c['id'],k,lab,t['status']))
                if t['relation'] and lab and lab!='n/a': m['rel_compared']+=1; m['rel_agree']+= t['relation']==lab
            fa_ok = ev['finalAnswer']['correct']
            if c.get('finalAnswerCorrect') is not None and fa_ok is not None: m['final_compared']+=1; m['final_agree']+= fa_ok==c['finalAnswerCorrect']
            if c.get('finalAnswerCorrect') is not None and fa_ok is None: m['final_undecided']+=1
            if e=='incomplete': m['incomplete_total']+=1; m['incomplete_reported']+= ev['completeness']=='incomplete'
    print(f'== {tag}'); 
    for k in sorted(m): print(f'   {k:28} {m[k]}')
    print('   FALSE ACCEPTS (verified, labelled invalid/malformed):',fa)
    print('   transition-level false certifications:',tfa)
    print('   FALSE REJECTS (invalid, labelled valid/jump/incomplete):',fr)
    print('   first-invalid mismatches:',fiw)
for tag,p in zip(sys.argv[1::2],sys.argv[2::2]): run(p,tag)
