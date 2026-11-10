#!/usr/bin/env python3
"""Check provisional TN mappings against immutable statements and real family definitions.

No lexical match is promoted automatically. Decisions live in the review JSON.
This audits references and reports existing resources, not learning effectiveness.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path
from validate_tn_primary import ROOT, validate, require

REVIEW = ROOT / 'content/learning/ingestion/tn-primary-mapping-review.json'
FAMILIES = ROOT / 'content/learning/family-specs.v1.json'


def load_outcomes():
    outcomes = {}
    for term in (1, 2):
        data = json.loads((ROOT / f'content/learning/ingestion/tn-primary-2026-term{term}.json').read_text())
        validate(data)
        for book in data['books']:
            for lesson in book['lessons']:
                for outcome in lesson['outcomes']:
                    require(outcome['id'] not in outcomes, 'duplicate cross-term outcome')
                    outcomes[outcome['id']] = outcome
    return outcomes


def audit(review, outcomes, families):
    require(review['schema'] == 'intake-mapping-review@1', 'wrong review schema')
    require(review['capabilitySourceSha256'] == hashlib.sha256(FAMILIES.read_bytes()).hexdigest(), 'capability catalogue changed; re-review required')
    seen = set()
    for record in review['outcomes']:
        oid = record['outcomeId']
        require(oid in outcomes and oid not in seen, 'unknown or duplicate reviewed outcome')
        seen.add(oid)
        require(record['statementSha256'] == hashlib.sha256(outcomes[oid]['statement'].encode()).hexdigest(), 'stale statement mapping')
        require(record['status'] == 'proposed' and record['educatorReviewed'] is False and record['learnerReadiness'] == 'not-established', 'mapping must remain provisional')
        require(record['fit'] in ('aligned', 'partial', 'unmatched') and record['reason'].strip(), 'missing fit/reason')
        fs = record['familyIds']
        require(len(fs) == len(set(fs)) and all(f in families for f in fs), 'unknown or duplicate family')
        require(bool(fs) == (record['fit'] != 'unmatched'), 'unmatched must have no invented target')
        require(record['competencyIds'] == sorted({families[f]['competency'] for f in fs}), 'family/competency mismatch')
    require(seen == set(outcomes), 'review omits observed outcomes')
    return dict(Counter(r['fit'] for r in review['outcomes']))


def main():
    review = json.loads(REVIEW.read_text())
    families = {f['id']: f for f in json.loads(FAMILIES.read_text())['families']}
    outcomes = load_outcomes()
    counts = audit(review, outcomes, families)
    referenced = sorted({f for r in review['outcomes'] for f in r['familyIds']})
    competencies = sorted({c for r in review['outcomes'] for c in r['competencyIds']})
    graph_ids = set()
    for path in ('content/mathematics/curriculum.v1.json', 'content/learning/competency-additions.v1.json', 'content/learning/competency-expansion.v1.json'):
        graph_ids.update(c['id'] for c in json.loads((ROOT / path).read_text())['competencies'])
    require(set(competencies) <= graph_ids, 'target absent from graph definitions')
    module_ids = set()
    for path in ('content/learning/modules.v1.json', 'content/learning/library.v1.json'):
        module_ids.update(m['competency'] for m in json.loads((ROOT / path).read_text())['modules'])
    print(json.dumps({'observedOutcomes': len(outcomes), 'conceptualFits': counts,
        'candidateCompetencies': len(competencies), 'referencedFamilies': len(referenced),
        'targetsWithoutModuleRecord': sorted(set(competencies) - module_ids),
        'acceptedMappings': 0, 'educatorReviewed': False, 'annualCoverage': 'unknown',
        'note': 'Family/module presence does not prove outcome coverage, suitable numeric ranges, teaching method or grade-level readiness.'}, sort_keys=True))


if __name__ == '__main__':
    main()
