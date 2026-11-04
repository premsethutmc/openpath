"""Session choices are account-owned append-only metadata, never mastery evidence."""
import json
from .test_learning import LearningBase, ROOT

G7 = json.loads((ROOT/'curricula/cbse-ncert-mathematics-grade-7.v1.1.0.json').read_text())
class TopicSessionTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.save(self.enrol(7,G7)).status_code,201)
        self.ref={'id':G7['id'],'version':G7['version'],'hash':G7['hash']}
    def entry(self,**values):
        return self.rec('topic_session',academicYear='2026-27',stage='plan',target='MATH.algebra.variables',minutes=30,curriculum=self.ref,**values)
    def test_start_and_all_three_budgets_round_trip_without_touching_enrolment_or_goals(self):
        before=self.records()
        start=self.rec('topic_session',academicYear='2026-27',stage='diagnostic',target='MATH.algebra.variables',curriculum=self.ref)
        self.assertEqual(self.save(start).status_code,201)
        for minutes in [15,30,60]:
            e=self.entry();e['minutes']=minutes;self.assertEqual(self.save(e).status_code,201)
        after=self.records();self.assertEqual(after[:len(before)],before)
        self.assertTrue(all(e['record']=='topic_session' for e in after[len(before):]))
        self.assertTrue(all('response' not in e and 'mastery' not in e for e in after[len(before):]))
    def test_invalid_duration_stage_curriculum_and_unknown_targets_are_rejected(self):
        for key,value in [('academicYear','2025-26'),('minutes',0),('minutes',True),('minutes',20),('stage','complete'),('target','invented'),('curriculum',{**self.ref,'hash':'wrong'})]:
            e=self.entry();e[key]=value;self.assertEqual(self.save(e).status_code,400)
        e=self.entry();e['stage']='diagnostic';self.assertEqual(self.save(e).status_code,400)
        e=self.entry();e['mastery']='verified';self.assertEqual(self.save(e).status_code,400)
    def test_owner_cannot_write_a_plan_into_another_learner_record(self):
        other=self.parent('other-topic-parent@example.org')
        e=self.entry();r=self.append(other,self.pupil_id,self.seq,e,subject='mathematics');self.assertEqual(r.status_code,404)
