"""Combine one audit run into the machine-readable deliverable. Usage: python3 build-data.py <auditDir> <outDir>
Inputs: <auditDir>/fam/*.json (audit-run.ts), server-compare.json (server_compare.py), consistency.json, form-scan.json, coverage-audit/data/inv-final.json (1,080-family inventory)."""
import json, glob, os, sys, collections, statistics
A, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
inv = {r['family']: r for r in json.load(open(os.path.join(HERE, '..', 'coverage-audit', 'data', 'inv-final.json')))}
fam = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(A + '/fam/*.json')}
srv = json.load(open(A + '/server-compare.json')) if os.path.exists(A + '/server-compare.json') else None
cons = {r['family']: r for r in json.load(open(A + '/consistency.json'))} if os.path.exists(A + '/consistency.json') else {}
scan = {r['family']: r for r in json.load(open(A + '/form-scan.json'))} if os.path.exists(A + '/form-scan.json') else {}
cov = {r['family']: r for r in json.load(open(os.path.join(HERE, '..', 'coverage-audit', 'data', 'typed-kernel-coverage.json')))['rows']}
norm = lambda s: s.replace(' ', '').replace('−', '-')
rows = []
tot = collections.Counter(); cat = collections.defaultdict(collections.Counter); bysrc = collections.defaultdict(collections.Counter)
for fid in sorted(inv):
    i, r = inv[fid], fam.get(fid)
    if r is None:
        rows.append({'family': fid, 'releasedQuestions': i['releasedQuestions'], 'classification': 'Insufficient evidence', 'reason': 'not run'}); continue
    sub = [json.loads(l) for l in open(f'{A}/subs/{fid}.jsonl').read().split('\n') if l]
    subst = sum(1 for s in sub if s[3] == 'equiv' and norm(s[4]) != norm(s[2]) and not s[4].lower() == s[2].lower())
    sv = (srv or {}).get('families', {}).get(fid, {}) if srv else {}
    verified = r['verification'].get('verified', 0); sampled = sum(r['verification'].values())
    route = 'kernel+legacy' if verified and verified < sampled else 'kernel' if verified else 'legacy'
    c = cons.get(fid, {}); s = scan.get(fid)
    defects = []
    if r['falseAcceptances']: defects.append('False acceptance')
    if r['falseRejections']: defects.append('False rejection')
    if r['unresolvedDefects'] or r['wrongLeftUnresolved']: defects.append('Unresolved handling defect')
    if sv.get('disagree') or sv.get('serverFalseAcceptance'): defects.append('Server disagreement')
    if r['parity']['mismatches']: defects.append('Server disagreement')
    if r['answerType'] == 'written': klass, why = 'Not applicable', 'educator-marked'
    elif defects: klass, why = defects[0], '; '.join(defects)
    elif r['timedOut'] or r['questionsTested'] < 10 or 'wrong' not in r['categories']: klass, why = 'Insufficient evidence', 'fewer than 10 questions or no wrong-answer test constructed'
    else: klass, why = 'Reliable in tested scope', ''
    evidence = 'substantive-equivalents' if subst else 'surface-forms-only'
    row = {'family': fid, 'releasedQuestions': i['releasedQuestions'], 'subject': i['topic']['strand'], 'topic': i['topic']['topic'], 'answerType': i['answerType'], 'studentInput': i['studentInput'], 'generatorOutput': 'Problem{params, prompt, answer, type, options?, figure?, bugs, steps}', 'expectedAnswerRepresentation': i['answerForm'],
           'gradingRoute': route, 'kernelCapability': (cov.get(fid) or {}).get('verifierCapability') or i['verificationRoute'], 'kernelVerifiedShareOfSample': round(verified / max(sampled, 1), 3),
           'serverRoute': 'trusted Node grader for verified questions, python stored-answer comparison otherwise (Django view not executed)', 'serverEquivalentSemantics': (not sv.get('disagree')) if sv else None, 'typedInputMeaningful': r['answerType'] != 'written',
           'questionsTested': r['questionsTested'], 'questionsByForm': r['forms'], 'submissions': r['submissions'], 'seedRule': 'typed: floor(i*released/20), i<20; :mc and :w forms of the first 6 of those', 'oracle': r['oracle'], 'equivalenceEvidence': evidence, 'categories': r['categories'], 'notApplicable': r['notApplicable'],
           'falseAcceptances': r['falseAcceptances'], 'falseRejections': r['falseRejections'], 'unresolvedDefects': r['unresolvedDefects'], 'wrongLeftUnresolved': r['wrongLeftUnresolved'], 'serverDisagreements': sv.get('disagree', 0) if sv else None, 'serverComparedSubmissions': sv.get('n', 0) if sv else None,
           'storedAnswerParityMismatches': r['parity']['mismatches'], 'mcDuplicateValueOptions': c.get('dupOptions', 0), 'contractHeldQuestions': (sum(s[k]['held'] for k in ('typed', 'mc', 'word')) if s else 0),
           'classification': klass, 'reason': why, 'failures': r['failures'][:5], 'latencyMs': r['ms']}
    rows.append(row)
    tot['families'] += 1; tot['released'] += i['releasedQuestions']; tot['questions'] += r['questionsTested']; tot['subs'] += r['submissions']
    cat[klass]['families'] += 1; cat[klass]['released'] += i['releasedQuestions']
    for k, v in r['categories'].items():
        for kk in ('n', 'credit', 'noCredit', 'unresolved', 'ok'): bysrc[k][kk] += v[kk]
    bysrc['_route'][route] += 1
    for k in ('kernelSubs', 'legacySubs'): tot[k] += r[k]
lat = []
for f in glob.glob(A + '/lat/*.json'): lat += json.load(open(f))
lat.sort(); q = lambda p: round(lat[int(len(lat) * p)], 3) if lat else None
eq = bysrc.get('equiv', {}); summary = {
    'familiesAudited': tot['families'], 'releasedQuestionsAccountedFor': tot['released'], 'questionsGeneratedForTesting': tot['questions'], 'submissionsTested': tot['subs'], 'classification': {k: dict(v) for k, v in cat.items()},
    'falseAcceptances': sum(r.get('falseAcceptances', 0) for r in rows), 'falseRejections': sum(r.get('falseRejections', 0) for r in rows), 'incorrectUnresolvedDecisions': sum(r.get('unresolvedDefects', 0) + r.get('wrongLeftUnresolved', 0) for r in rows),
    'equivalentAnswerAcceptance': {'submissions': eq.get('n'), 'credited': eq.get('credit'), 'rate': round(eq['credit'] / eq['n'], 4) if eq.get('n') else None, 'note': 'justified equivalents only; unsimplified-fraction forms are policy-dependent and reported separately (equiv-policy)'},
    'equivPolicyUnsimplified': dict(bysrc.get('equiv-policy', {})), 'serverClientDisagreements': (srv or {}).get('disagreements'), 'serverCompared': (srv or {}).get('comparedSubmissions'),
    'kernelVsLegacySubmissions': {'kernel': tot['kernelSubs'], 'legacy': tot['legacySubs']}, 'byCategory': {k: dict(v) for k, v in bysrc.items() if not k.startswith('_')}, 'routeFamilies': dict(bysrc['_route']),
    'assessmentLatencyMs': {'n': len(lat), 'median': q(0.5), 'p95': q(0.95), 'p99': q(0.99), 'max': round(lat[-1], 3) if lat else None},
    'timedOutFamilies': sum(1 for r in fam.values() if r['timedOut']), 'untestedFamilies': [r['family'] for r in rows if r.get('questionsTested', 0) == 0],
    'caveat': 'Zero errors in a sample is not proof of universal correctness. The expected answer of a legacy-route question is the generator\'s stored answer (generator-derived, not independently verified); only the kernel-verified questions have an independent confirmation of it.'}
os.makedirs(OUT, exist_ok=True)
json.dump({'summary': summary, 'families': rows}, open(OUT + '/grading-audit-families.json', 'w'), ensure_ascii=False)
print(json.dumps(summary, ensure_ascii=False, indent=1))
