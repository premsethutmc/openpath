import copy
import json
from .test_learning import LearningBase, ROOT

G7 = json.loads((ROOT / 'curricula/openpath-sample-mathematics-grade-7.v1.1.0.json').read_text())


class JourneyTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.save(self.enrol(7, G7)).status_code, 201)
        self.plan = {'id': 'plan-1', 'scope': 'school', 'curriculum': {'id': G7['id'], 'version': G7['version'], 'hash': G7['hash']}, 'budgetMinutes': 30, 'modules': [{'competency': 'MATH.number.percentage', 'estimatedMs': 720000, 'source': 'default'}]}

    def receipt(self, action, **extra):
        self.serial += 1
        return {'kind': 'math_session', 'version': 'math-session@1', 'id': f'session-{self.serial}', 'at': '2000-01-01T00:00:00Z', 'learnerId': self.pupil_id, 'sessionId': f'learn:{self.pupil_id}:visit', 'planId': self.plan['id'], 'action': action, **extra}

    def start(self):
        self.assertEqual(self.save(self.receipt('plan', plan=self.plan)).status_code, 201)

    def test_save_resume_usage_and_separate_exam_session_in_same_private_stream(self):
        self.start()
        comp = 'MATH.number.percentage'
        draft = {'gen:pct:20,220': {'value': '4', 'working': '20/100 × 220', 'hint': True}}
        self.assertEqual(self.save(self.receipt('checkpoint', competency=comp, drafts=draft)).status_code, 201)
        self.assertEqual(self.save(self.receipt('time', competency=comp, usage={'activeMs': 7000, 'idleMs': 1000, 'solvingMs': 5000, 'helpCount': 1})).status_code, 201)
        rows = self.records()
        self.assertEqual(rows[-2]['drafts'], draft)
        self.assertFalse(rows[-1]['at'].startswith('2000'))
        self.assertEqual(self.save(self.receipt('finish', competency=comp)).status_code, 201)
        self.plan = {**self.plan, 'id': 'gre-plan', 'scope': 'gre-quant'}
        self.start()
        self.assertEqual(len([r for r in self.records() if r.get('action') == 'finish' and r.get('planId') == 'gre-plan']), 0)
        self.assertEqual([r for r in self.records() if r.get('record') == 'attempt'], [])
        other = self.parent("other.journey@example.org")
        self.assertEqual(other.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').status_code, 404)

    def test_no_claimed_mastery_unknown_references_or_impossible_time(self):
        self.start()
        for extra in [{'mastery': True}, {'competency': 'MATH.unknown'}, {'usage': {'activeMs': 1, 'idleMs': 0, 'solvingMs': 2, 'helpCount': 0}}, {'usage': {'activeMs': True, 'idleMs': 0, 'solvingMs': 0, 'helpCount': 0}}, {'usage': {'activeMs': 86400001, 'idleMs': 0, 'solvingMs': 0, 'helpCount': 0}}]:
            event = self.receipt('checkpoint', competency='MATH.number.percentage', drafts={})
            event.update(extra)
            r = self.save(event)
            self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(self.save(self.receipt('time', competency='MATH.number.percentage')).status_code, 400)
        self.assertEqual(self.save(self.receipt('checkpoint', drafts={'q': {'value': 'x', 'working': '', 'hint': 'false'}})).status_code, 400)

    def test_plan_is_immutable_hash_pinned_and_budget_bounded(self):
        for change in [{'budgetMinutes': 1}, {'curriculum': {**self.plan['curriculum'], 'hash': 'bad'}}, {'modules': [{'competency': 'missing', 'estimatedMs': 720000, 'source': 'default'}]}, {'scope': 'upsc'}, {'modules': self.plan['modules'] * 2}]:
            p = {**copy.deepcopy(self.plan), **change}
            self.assertEqual(self.save(self.receipt('plan', plan=p)).status_code, 400)
        self.start()
        self.assertEqual(self.save(self.receipt('plan', plan=self.plan)).status_code, 400)
        self.assertEqual(self.save(self.receipt('checkpoint', competency='MATH.number.percentage', drafts={}, plan=self.plan)).status_code, 400)
        r = self.receipt('checkpoint', learnerId='another-child')
        self.assertEqual(self.save(r).status_code, 400)

    def test_malformed_json_is_rejected_without_server_errors(self):
        self.start()
        for extra in [{'action': []}, {'competency': {}}, {'usage': []}, {'drafts': []}, {'finished': [{}]}]:
            event = self.receipt('checkpoint', competency='MATH.number.percentage', drafts={})
            event.update(extra)
            self.assertEqual(self.save(event).status_code, 400)
        self.plan['id'] = 'another-plan'
        for field, value in [('scope', []), ('modules', [{}])]:
            plan = {**self.plan, field: value}
            self.assertEqual(self.save(self.receipt('plan', plan=plan)).status_code, 400)

    def test_time_validation_rejects_impossible_and_non_numeric_intervals(self):
        self.start()
        valid = {'activeMs': 5000, 'idleMs': 0, 'solvingMs': 4000, 'helpCount': 1}
        for key, value in [('activeMs', True), ('activeMs', -1), ('activeMs', 86400001), ('idleMs', 31536000001), ('solvingMs', 5001), ('helpCount', -1)]:
            usage = {**valid, key: value}
            self.assertEqual(self.save(self.receipt('time', competency='MATH.number.percentage', usage=usage)).status_code, 400)
        self.assertEqual(self.save(self.receipt('time', competency='MATH.number.percentage', usage=valid)).status_code, 201)
