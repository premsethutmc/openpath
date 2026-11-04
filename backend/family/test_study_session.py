"""Cumulative study bookkeeping; no estimator, curriculum or evidence-policy changes."""
import json
from .test_learning import LearningBase, ROOT

G7 = json.loads((ROOT/'curricula/cbse-ncert-mathematics-grade-7.v1.1.0.json').read_text())

class StudySessionTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.save(self.enrol(7,G7)).status_code,201)
        self.plan=self.rec('topic_session',academicYear='2026-27',stage='plan',target='MATH.algebra.variables',minutes=30,curriculum={'id':G7['id'],'version':G7['version'],'hash':G7['hash']})
        self.assertEqual(self.save(self.plan).status_code,201)
        self.advice={'gaps':[],'morePractice':['MATH.number.multiplication-tables'],'next':{'competency':'MATH.algebra.variables','reason':'Continue the existing module.'}}
    def checkpoint(self,revision=0,phase='start',active=0,solving=0,idle=0):
        e=self.rec('study_session',planId=self.plan['id'],revision=revision,phase=phase,time={'activeMs':active,'solvingMs':solving,'idleMs':idle})
        if phase=='ended': e['advice']=self.advice
        return e
    def test_summary_is_counted_from_server_attempts_not_client_claims_and_saved_once(self):
        before=self.records();self.assertEqual(self.save(self.checkpoint()).status_code,201)
        a=self.attempt('mt-d1','55',context=f"study:{self.plan['id']}");self.assertEqual(self.save(a).status_code,201)
        b=self.attempt('mt-d1','56',context=f"study:{self.plan['id']}");b['hints']=1;self.assertEqual(self.save(b).status_code,201)
        other=self.attempt('mt-d1','56');self.assertEqual(self.save(other).status_code,201)
        self.assertEqual(self.save(self.checkpoint(1,'active',1000,500,200)).status_code,201)
        end=self.checkpoint(2,'ended',2000,1000,300);self.assertEqual(self.save(end).status_code,201)
        records=self.records();self.assertEqual(records[:len(before)],before)
        summary=records[-1]['summary'];self.assertEqual(summary['attemptIds'],[a['id'],b['id']]);self.assertEqual(summary['incorrectIds'],[a['id']]);self.assertEqual(summary['correctIds'],[b['id']]);self.assertEqual(summary['pendingIds'],[])
        self.assertEqual(summary['competencies'],['MATH.number.multiplication-tables']);self.assertNotIn('mastery',summary)
        self.assertEqual(self.save(end).status_code,400)
        self.assertEqual(self.save(self.checkpoint(3,'ended',2000,1000,300)).status_code,400)
        self.assertEqual(len([r for r in self.records() if r.get('record')=='study_session' and r['phase']=='ended']),1)
        after=self.attempt('mt-d1','56',context=f"study:{self.plan['id']}");self.assertEqual(self.save(after).status_code,400)
        self.assertEqual(self.save(self.attempt('mt-d1','56')).status_code,201,'normal practice is not globally blocked')
    def test_invalid_checkpoints_and_fabricated_summary_fields_are_rejected(self):
        self.assertEqual(self.save(self.checkpoint(0,'active')).status_code,400)
        self.assertEqual(self.save(self.checkpoint(0,'start',1)).status_code,400)
        self.assertEqual(self.save(self.checkpoint()).status_code,201)
        for field,value in [('activeMs',True),('activeMs',-1),('activeMs',1.5),('idleMs',86_400_001),('solvingMs',1)]:
            e=self.checkpoint(1,'active');e['time'][field]=value;self.assertEqual(self.save(e).status_code,400)
        e=self.checkpoint(1,'ended');e['summary']={'correctIds':['fabricated']};self.assertEqual(self.save(e).status_code,400)
        e=self.checkpoint(1,'ended');e['advice']={**self.advice,'mastery':100};self.assertEqual(self.save(e).status_code,400)
        self.assertEqual(self.save(self.checkpoint(1,'active',100,50,10)).status_code,201)
        self.assertEqual(self.save(self.checkpoint(2,'active',99,50,10)).status_code,400)
        self.assertEqual(self.save(self.checkpoint(2,'active',100,51,10)).status_code,400)
        self.assertEqual(self.save(self.checkpoint(3,'active',101,51,10)).status_code,400)
    def test_owner_plan_and_gap_source_are_validated(self):
        e=self.checkpoint();e['planId']='unknown';self.assertEqual(self.save(e).status_code,400)
        other=self.parent('other-study-parent@example.org');self.assertEqual(self.append(other,self.pupil_id,self.seq,self.checkpoint(),subject='mathematics').status_code,404)
        self.assertEqual(self.save(self.checkpoint()).status_code,201)
        e=self.checkpoint(1,'ended');e['advice']={**self.advice,'gaps':[{'competency':'MATH.number.multiplication-tables','reason':'Existing diagnostic suggestion.','sourceQuestion':'mt-d1'}]};self.assertEqual(self.save(e).status_code,400)
    def test_selected_budgets_are_preserved_and_reload_uses_absolute_snapshots(self):
        for minutes in [15,30,60]:
            plan={**self.plan,'id':f'plan-{minutes}','minutes':minutes};self.assertEqual(self.save(plan).status_code,201);self.plan=plan
            self.assertEqual(self.save(self.checkpoint()).status_code,201)
            self.assertEqual(self.save(self.checkpoint(1,'active',1000,800,100)).status_code,201)
            self.assertEqual(self.save(self.checkpoint(2,'active',1500,1000,300)).status_code,201)
            self.assertEqual(self.save(self.checkpoint(3,'ended',1500,1000,300)).status_code,201)
            records=self.records();self.assertEqual(records[-1]['time'],{'activeMs':1500,'solvingMs':1000,'idleMs':300});self.assertEqual(next(e for e in records if e['id']==plan['id'])['minutes'],minutes)
    def test_existing_diagnostic_finding_is_preserved_without_recounting_old_answers(self):
        a=self.attempt('mt-d1','55');self.assertEqual(self.save(a).status_code,201)
        self.assertEqual(self.save(self.checkpoint()).status_code,201)
        end=self.checkpoint(1,'ended')
        end['advice']={**self.advice,'gaps':[{'competency':'MATH.number.multiplication-tables','reason':'Earlier diagnostic: an existing finding.','sourceQuestion':'mt-d1'}]}
        self.assertEqual(self.save(end).status_code,201)
        summary=self.records()[-1]['summary'];self.assertEqual(summary['attemptIds'],[]);self.assertEqual(summary['correctIds'],[]);self.assertEqual(summary['incorrectIds'],[]);self.assertEqual(summary['gaps'],end['advice']['gaps'])
