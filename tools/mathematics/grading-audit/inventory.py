"""Grading audit: the machine-readable per-family grading inventory (the 15 required facts per released family).

Inputs (all produced by this harness from the live code): data/family-meta.json, data/question-policies.json,
data/results/per-family.json, data/oracle/<family>.json, backend/family/learning_families.py (server-side mirror generators).
Usage: python inventory.py data/inventory.json
"""
import json
import os
import re
import sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
meta = json.load(open(os.path.join(D, 'family-meta.json')))
pol = json.load(open(os.path.join(D, 'question-policies.json')))['families']
res = {r['family']: r for r in json.load(open(os.path.join(D, 'results', 'per-family.json')))}
lf = open(os.path.join(D, '..', '..', '..', '..', 'backend', 'family', 'learning_families.py')).read()
mirror = set(re.findall(r"'([a-z0-9]+)': \(\d+, _", lf))

SEMANTICS = {
    'integer': 'an exact integer value', 'fraction': 'an exact rational value', 'mixed': 'an exact rational value in a stated number form (mixed / improper / lowest terms)',
    'set': 'an unordered set of exact rational values', 'choice': 'one option label (A-D) whose option text is the answer', 'exact': 'an exact real value or exact expression (radicals, π, polynomials)',
    'roots': 'an unordered multiset of exact values', 'tuple': 'an ordered tuple of exact values', 'matrix': 'a matrix of exact values', 'interval': 'a subset of the real line (interval notation or inequalities)',
    'ratio': 'a ratio a:b', 'expression': 'a function of the variable(s), equal on the common domain', 'antiderivative': 'a function whose derivative is the integrand (up to a constant)',
    'polynomial': 'a polynomial in x', 'written': 'free text marked by an educator',
}
LEGACY_METHOD = {
    'integer': 'canonical integer (exact)', 'fraction': 'canonical rational (exact)', 'set': 'sorted canonical rationals, no duplicates', 'choice': 'option letter',
    'polynomial': 'canonical polynomial', 'exact': 'canonical exact polynomial over radicals/π', 'roots': 'sorted canonical exact values', 'tuple': 'canonical tuple',
    'matrix': 'canonical matrix', 'interval': 'canonical interval', 'ratio': 'canonical ratio', 'mixed': 'canonical mixed/rational',
    'expression': 'numeric sampling at fixed points', 'antiderivative': 'numeric sampling of derivative-equivalence (+C stripped)',
}
SYMBOLIC = {'expression', 'antiderivative'}


def counts(r, route, keys):
    return sum(r.get(route, {}).get(k, 0) for k in keys)


rows = []
for fam, m in sorted(meta.items()):
    r = res.get(fam, {})
    types = sorted(m['answerTypes'])
    forms = pol[fam]
    policies = {f: {'policy': v['policy'], 'count': v['count'], 'exceptions': len(v['exceptions'])} for f, v in forms.items()}
    fa = {rt: counts(r, rt, ['FALSE_ACCEPTANCE']) for rt in ('client', 'backend')}
    fr = {rt: counts(r, rt, ['FALSE_REJECTION']) for rt in ('client', 'backend')}
    inv = {rt: counts(r, rt, ['INVALID_MARKED_INCORRECT']) for rt in ('client', 'backend')}
    risks = []
    if fa['client'] or fa['backend']:
        risks.append(f"false acceptances (client {fa['client']}, backend {fa['backend']})")
    if fr['client'] or fr['backend']:
        risks.append(f"false rejections (client {fr['client']}, backend {fr['backend']})")
    for k, label in (('FORM_VIOLATION_ACCEPTED', 'stated form not enforced'), ('FORM_POLICY_REJECTION', 'equal answer in an unstated form rejected'),
                     ('AMBIGUITY_CREDITED', 'ambiguous text credited'), ('UNRESOLVED_ON_CORRECT', 'equal answer left unresolved')):
        n = max(counts(r, 'client', [k]), counts(r, 'backend', [k]))
        if n:
            risks.append(f'{label} ({n})')
    if inv['client'] or inv['backend']:
        risks.append(f"invalid input marked incorrect (client {inv['client']}, backend {inv['backend']})")
    if r.get('disagreements'):
        risks.append(f"client/backend disagreement ({r['disagreements']})")
    if any(v['policy'] == 'held' or 'held' in str(pol[fam][f]['exceptions'].values()) for f, v in forms.items()):
        risks.append('held presentations are served (client never decides, server credits by legacy comparison)')
    kernel_req = 'symbolic equivalence needed' if set(types) & SYMBOLIC else ('exact canonical comparison is in principle sufficient' if set(types) <= {'integer', 'fraction', 'choice', 'set', 'mixed', 'ratio', 'matrix', 'tuple', 'interval'} else 'exact arithmetic over radicals/π (canonical form or exact kernel)')
    sufficient = None if not r else (fa['client'] == fa['backend'] == fr['client'] == fr['backend'] == 0)
    rows.append({
        'family': fam,
        '1_location': {'competency': m['competency'], 'skill': m['skill'], 'title': m['title'], 'gradeRange': m['gradeRange'], 'modules': m['modules']},
        '2_released': m['released'],
        '3_generator': {'source': f"packages/learning/src/{m['source']}" if m['source'] else None, 'answerTypes': m['answerTypes'], 'serverMirrorGenerator': fam in mirror},
        '4_expectedSemantics': {t: SEMANTICS.get(t) for t in types},
        '5_responseFormats': {'typed': [f'typed text, {t}' for t in types], 'mc': 'option letter' if m['released']['mc'] else None, 'word': 'typed text in an everyday-situation prompt' if m['released']['word'] else None},
        '6_frontendRoute': {f: ('grade.ts decide -> ' + ('exact checker (assessAnswerFirst)' if v['policy'] == 'kernel-exact' else 'typed kernel (typed-contract.ts)' if v['policy'] == 'kernel-typed' else 'pending (held: never decides)' if v['policy'] == 'held' else 'legacy comparison (content.ts isCorrect: ' + ', '.join(LEGACY_METHOD.get(t, '?') for t in types) + ')')) for f, v in forms.items()},
        '7_backendRoute': {f: ('trusted Node grader (kernel_grader.py -> grader.mjs); Python mirror if the grader is unavailable' if v['policy'].startswith('kernel') else 'Python stored-answer mirror (learning.right' + (', form@1 expanded' if m['expanded'] else '') + ')') for f, v in forms.items()},
        '8_generatorContract': m['contract'],
        '9_kernelRequired': kernel_req,
        '10_existingComparisonSufficient': {'onAuditSample': sufficient, 'basis': 'no false acceptance and no false rejection on either route' if sufficient else ('see risks' if r else 'not audited')},
        '11_equalFormsAccepted': sorted(r.get('acceptedEqualForms', {})), '11_equalFormsRejected': sorted(r.get('rejectedEqualForms', {})), '11_equalFormsUnresolved': sorted(r.get('unresolvedEqualForms', {})),
        '12_restrictions': {'formRulesInPrompts': r.get('formRules', []), 'expandedFormEnforced': m['expanded'], 'contractAssumptions': (m['contract'] or {}).get('assumptions', []), 'formRulesRepresentedInContract': False},
        '13_working': 'optional (answer-only: working never changes answer credit; read only for diagnosis after a wrong answer on kernel-exact routes)',
        '14_unreadableSafelyUnresolved': {'client': inv['client'] == 0 and counts(r, 'client', ['FALSE_ACCEPTANCE']) == 0, 'backend': inv['backend'] == 0} if r else None,
        '15_evidence': {'sampledQuestions': r.get('questions', 0), 'cases': r.get('cases', 0), 'unverified': r.get('unverified', 0), 'client': r.get('client', {}), 'backend': r.get('backend', {}),
                        'answerKeyIndependentlyVerified': f"{m['verification'].get('verified', 0)} of {m['released']['typed']} typed questions (generator contract)", 'risks': risks},
        'policies': policies,
    })
json.dump({'inventory': 'grading-inventory@1', 'families': rows}, open(sys.argv[1], 'w'), indent=None)
print(len(rows), 'families inventoried')
