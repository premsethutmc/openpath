"""Actual arithmetic and authenticated activity protocol; synthetic learner records only."""
import copy
import random
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient
from .tests import FamilyTestCase
from .models import PupilEvent, WritingDraft
from .writing_math import lesson, cycles, check, teaching, probes, CONTRACT


def work(draft_id, spec, answers=None):
    if answers is None:
        if spec['topic'] == 'fraction': answers = {'answer': '2/4'}
        else:
            cs = cycles(spec['parameters']['dividend'], spec['parameters']['divisor'])
            answers = {'quotient': ''.join(str(c['digit']) for c in cs)}
            for i,c in enumerate(cs,1):
                answers[f'product-{i}'] = str(c['product'])
                answers['remainder' if i==len(cs) else f'difference-{i}'] = str(c['difference'])
                if c['bring'] is not None: answers[f'bring-down-{i}'] = str(c['bring'])
    tokens=[]
    for r in spec['layout']['regions']:
        if r['id'] in answers:
            tokens.append({'id':r['id'], 'regionId':r['id'], 'text':answers[r['id']], 'bounds':{k:r[k] for k in ['x','y','width','height']}, 'strokeIds':[], 'confidence':None,'status':'confirmed','origin':'manual','recognizer':None,'revision':1,'createdOrder':r['order']+1})
    return {'contract':CONTRACT,'id':draft_id,'problem':spec['problem'],'layout':spec['layout'],'revision':1,'updatedAt':'2026-10-20T00:00:00Z','paper':'grid','history':[],'future':[],'strokes':[],'erased':[],'tokens':tokens,'corrections':[]}


class DivisionWorkingTests(SimpleTestCase):
    def test_complete_379_over_3_and_arbitrary_operands(self):
        rng=random.Random(382)
        for a,b in [(379,3),(1005,5),(2,3),(0,3),(1000,10),(4008,4)]+[(rng.randrange(100000),rng.randrange(1,999)) for _ in range(200)]:
            spec=lesson('division',{'dividend':a,'divisor':b});cs=cycles(a,b)
            self.assertEqual(int(''.join(str(c['digit']) for c in cs)),a//b)
            self.assertEqual(cs[-1]['difference'],a%b)
            self.assertEqual(check(spec,work('a',spec))['outcome'],'complete')

    def test_every_operation_is_checked_before_later_errors(self):
        spec=lesson('division',{});original=work('a',spec)
        for region,operation in [('product-1','multiplication'),('difference-1','subtraction'),('bring-down-1','bringing down'),('product-2','multiplication'),('remainder','subtraction')]:
            w=copy.deepcopy(original);next(t for t in w['tokens'] if t['regionId']==region)['text']='99'
            r=check(spec,w);self.assertEqual(r['outcome'],'incorrect');self.assertEqual(r['region'],region);self.assertEqual(r['operation'],operation)
        w=copy.deepcopy(original);w['tokens'][0]['text']='136';r=check(spec,w)
        self.assertEqual(r['region'],'quotient');self.assertEqual(r['position'],1);self.assertEqual(r['partial'],7)

    def test_missing_input_and_recognition_uncertainty_are_not_math_errors(self):
        spec=lesson('division',{});w=work('a',spec,{})
        self.assertEqual(check(spec,w)['outcome'],'incomplete')
        w=work('a',spec);w['tokens'][0]['status']='uncertain'
        self.assertEqual(check(spec,w)['outcome'],'input-clarification')

    def test_negative_subtraction_is_mathematically_wrong_not_bad_recognition(self):
        spec=lesson('division',{});w=work('a',spec);w['tokens'][2]['text']='-1'
        self.assertEqual(check(spec,w)['outcome'],'incorrect')

    def test_digit_order_is_horizontal_despite_different_ink_heights(self):
        spec=lesson('division',{});w=work('a',spec);t=w['tokens'].pop(0)
        for i,ch in enumerate('126'):
            w['tokens'].append({**t,'id':f'q{i}','text':ch,'bounds':{'x':325+i*35,'y':55-i*5,'width':20,'height':30}})
        self.assertEqual(check(spec,w)['outcome'],'complete')

    def test_probes_distinguish_possible_support_without_claiming_a_cause(self):
        spec=lesson('division',{});error={'partial':7,'operation':'quotient selection'}
        ps=probes(spec,error);self.assertEqual([p['expected'] for p in ps],[2,6,2])
        all_right=teaching(spec,error,{p['id']:str(p['expected']) for p in ps});self.assertEqual(all_right['status'],'unresolved-possible-slip')
        wrong_fact=teaching(spec,error,{'groups':'2','facts':'9','choose':'2'});self.assertEqual(wrong_fact['possible'],['multiplication facts'])
        self.assertIn('3 groups would use 9',wrong_fact['explanation'])

    def test_fraction_equivalence_is_exact_and_invalid_form_is_clarified(self):
        spec=lesson('fraction',{});self.assertEqual(check(spec,work('a',spec))['outcome'],'complete')
        self.assertEqual(check(spec,work('a',spec,{'answer':'2/3'}))['outcome'],'incorrect')
        self.assertEqual(check(spec,work('a',spec,{'answer':'1/0'}))['outcome'],'input-clarification')

    def test_invalid_problem_parameters_are_refused(self):
        for p in [{'divisor':0},{'dividend':True},{'dividend':-1},{'divisor':1.5},[]]:
            with self.assertRaises(ValidationError):lesson('division',p)


class WritingJourneyApiTests(FamilyTestCase):
    def setUp(self):
        super().setUp();self.client=self.parent();self.pupil_id=str(self.pupil(self.client,'Synthetic writer'))
        self.base=f'/api/pupils/{self.pupil_id}/writing/'
        self.activity=self.client.post(self.base,{'topic':'division'},format='json').json();self.url=self.base+self.activity['id']+'/'

    def next(self):
        r=self.client.post(self.url+'action/',{'action':'next'},format='json');self.assertEqual(r.status_code,200,r.content);self.activity=r.json()

    def save(self,w,version=None):
        r=self.client.put(self.url,{'version':self.activity['version'] if version is None else version,'work':w},format='json')
        if r.status_code==200:self.activity['version']=r.json()['version']
        return r

    def test_real_journey_diagnosis_help_retry_resume_and_single_ledger(self):
        self.next();self.next();w=work(self.activity['id'],self.activity['lesson']);w['tokens'][0]['text']='136'
        self.assertEqual(self.save(w).status_code,200)
        first=self.client.post(self.url+'validate/',{'revision':1},format='json');self.assertEqual(first.status_code,200,first.content)
        data=first.json();self.assertEqual(data['activity']['stage'],'diagnostic');self.assertEqual(data['result']['position'],1)
        before=PupilEvent.objects.count()
        retry=self.client.post(self.url+'validate/',{'revision':1},format='json');self.assertEqual(retry.json()['receipt'],data['receipt']);self.assertEqual(PupilEvent.objects.count(),before)
        # Reload retains the current follow-up; no fresh learner is created.
        self.activity=self.client.get(self.url).json();self.assertEqual(self.activity['probe']['id'],'groups')
        for response in ['2','9','2']:
            r=self.client.post(self.url+'action/',{'action':'probe','probeId':self.activity['probe']['id'],'response':response},format='json');self.assertEqual(r.status_code,200,r.content);self.activity=r.json()
        self.assertEqual(self.activity['stage'],'teaching');self.assertEqual(self.activity['support']['teaching']['possible'],['multiplication facts'])
        r=self.client.post(self.url+'action/',{'action':'resume'},format='json');self.activity=r.json()
        w['revision']=2;w['tokens'][0]['text']='126';self.assertEqual(self.save(w).status_code,200)
        r=self.client.post(self.url+'validate/',{'revision':2},format='json');self.assertEqual(r.status_code,200,r.content);self.assertEqual(r.json()['activity']['stage'],'complete')
        events=self.client.get(f'/api/pupils/{self.pupil_id}/events/?subject=mathematics').json()['events']
        self.assertTrue(all(e['kind']=='math_writing' and e['admissible'] is False for e in events))
        self.assertTrue(events[-1]['assisted']);self.assertTrue(events[-1]['payload']['afterFeedback'])
        self.assertEqual(len(PupilEvent.objects.filter(subject='english')),0)
        self.assertEqual(self.client.get(self.url).json()['work']['tokens'][0]['text'],'126')

    def test_owner_csrf_and_version_conflict(self):
        self.assertEqual(APIClient().get(self.url).status_code,403)
        other=self.parent('other.writer@example.org');self.assertEqual(other.get(self.url).status_code,404)
        self.assertEqual(other.post(self.url+'validate/',{'revision':1},format='json').status_code,404)
        w=work(self.activity['id'],self.activity['lesson']);self.assertEqual(self.save(w).status_code,200)
        self.assertEqual(self.save(w,0).status_code,409)
        csrf=APIClient(enforce_csrf_checks=True);csrf.cookies=self.client.cookies
        # Real session/CSRF refusal is also exercised by the browser-backed test and account regression suite.
        self.assertEqual(csrf.put(self.url,{'version':1,'work':w},format='json').status_code,403)

    def test_uncertainty_does_not_open_diagnosis_or_create_a_mathematical_attempt(self):
        self.next();self.next();w=work(self.activity['id'],self.activity['lesson']);w['tokens'][0]['status']='uncertain';self.assertEqual(self.save(w).status_code,200)
        r=self.client.post(self.url+'validate/',{'revision':1},format='json');self.assertEqual(r.status_code,200,r.content);self.assertEqual(r.json()['result']['outcome'],'input-clarification')
        self.assertEqual(self.client.get(self.url).json()['stage'],'workspace')
        self.assertFalse(PupilEvent.objects.filter(body__action='validation').exists())

    def test_drafts_export_and_delete_with_existing_pupil(self):
        w=work(self.activity['id'],self.activity['lesson']);self.save(w)
        export=self.client.get(f'/api/pupils/{self.pupil_id}/export/').json();self.assertEqual(export['writingDrafts'][0]['work'],w)
        self.assertEqual(self.client.delete(f'/api/pupils/{self.pupil_id}/').status_code,204)
        self.assertFalse(WritingDraft.objects.exists());self.assertFalse(PupilEvent.objects.filter(kind='math_writing').exists())

    def test_corrupt_wrong_identity_and_invalid_layout_are_refused(self):
        w=work(self.activity['id'],self.activity['lesson'])
        for bad in [{**w,'id':'another'}, {**w,'contract':'future@2'}, {**w,'layout':{}}, {**w,'tokens':[{**w['tokens'][0],'bounds':None}]}]:self.assertEqual(self.save(bad).status_code,400)

    def test_fraction_topic_reuses_identity_and_persists_separately(self):
        r=self.client.post(self.base,{'topic':'fraction'},format='json');self.assertEqual(r.status_code,201)
        a=r.json();url=self.base+a['id']+'/'
        for _ in range(2):a=self.client.post(url+'action/',{'action':'next'},format='json').json()
        w=work(a['id'],a['lesson']);r=self.client.put(url,{'version':a['version'],'work':w},format='json');self.assertEqual(r.status_code,200,r.content)
        r=self.client.post(url+'validate/',{'revision':1},format='json');self.assertEqual(r.json()['activity']['stage'],'complete')
        self.assertEqual(WritingDraft.objects.filter(pupil_id=self.pupil_id).count(),2)

    def test_transcription_dispute_returns_to_existing_work_without_a_gap_claim(self):
        self.next();self.next();w=work(self.activity['id'],self.activity['lesson']);w['tokens'][0]['text']='136';self.save(w)
        r=self.client.post(self.url+'validate/',{'revision':1},format='json');source=r.json()['receipt']
        r=self.client.post(self.url+'action/',{'action':'input-correction'},format='json');self.assertEqual(r.status_code,200,r.content);self.assertEqual(r.json()['stage'],'workspace')
        self.assertFalse(r.json()['support']['helpSeen'])
        self.assertEqual(r.json()['work']['tokens'][0]['text'],'136')
        correction=PupilEvent.objects.get(body__action='input-correction');self.assertEqual(correction.body['payload']['receiptId'],source)
