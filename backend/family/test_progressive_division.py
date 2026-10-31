import random
from django.test import SimpleTestCase
from .writing_math import lesson, cycles, check
from .progressive_division import plan,update,work
from .tests import FamilyTestCase
from .models import PupilEvent

CASES=[(84,4),(379,3),(125,5),(1005,5),(432,12),(7,3),(7,12),(0,3),(1000,10)]
def entries(a,b):
    out=[]
    for c in cycles(a,b):out.extend([str(c['digit']),str(c['product']),str(c['difference'])])
    return out

class ProgressiveArithmeticTests(SimpleTestCase):
    def test_cases_and_seeded_replay_through_existing_validator(self):
        rng=random.Random(1983)
        for a,b in CASES+[(rng.randrange(100000),rng.randrange(1,999)) for _ in range(100)]:
            spec=lesson('division',{'dividend':a,'divisor':b});p=plan(spec);state={}
            for field,number in zip(p['fields'],entries(a,b)):
                for digit in number:
                    state,result=update(spec,'test',state,field['id'],'digit',digit)
            self.assertTrue(state['complete'],(a,b,state))
            w=work(spec,'test',state['entries']);self.assertEqual(check(spec,w)['outcome'],'complete')
            self.assertEqual(''.join(state['entries'][f['id']] for f in p['fields'] if f['role']=='quotient'),str(a//b))
            self.assertEqual(state['entries'][p['fields'][-1]['id']],str(a%b))
    def test_variable_width_product_does_not_advance_on_first_digit(self):
        spec=lesson('division',{'dividend':432,'divisor':12})
        s,_=update(spec,'a',{},'quotient:0','digit','3')
        s,_=update(spec,'a',s,'product:0','digit','3')
        self.assertEqual(s['active'],'product:0');self.assertEqual(s['visible'],1)
        s,_=update(spec,'a',s,'product:0','digit','6')
        self.assertEqual(s['active'],'difference:0')
        s,_=update(spec,'a',s,'difference:0','digit','0')
        self.assertEqual(s['feedback']['outcome'],'pending')
        s,_=update(spec,'a',s,'difference:0','finish')
        self.assertEqual(s['feedback']['outcome'],'incorrect')
        self.assertNotIn('expected',str(s));self.assertNotIn('7',s['feedback']['message'])
    def test_zero_is_child_entered_bring_down_only_copies_printed_digit(self):
        spec=lesson('division',{})
        s,_=update(spec,'a',{},'quotient:0','digit','1')
        s,_=update(spec,'a',s,'product:0','digit','3')
        self.assertNotIn('difference:0',s['entries'])
        self.assertEqual(s['visible'],2)
        s,_=update(spec,'a',s,'difference:0','digit','0')
        w=work(spec,'a',s['entries'])
        self.assertEqual(next(t['text'] for t in w['tokens'] if t['regionId']=='bring-down-1'),'07')
        self.assertEqual(s['active'],'quotient:1')
    def test_edit_does_not_erase_later_work_or_retain_completion(self):
        spec=lesson('division',{});s={};p=plan(spec)
        for field,number in zip(p['fields'],entries(379,3)):
            for digit in number:s,_=update(spec,'a',s,field['id'],'digit',digit)
        s,_=update(spec,'a',s,'quotient:0','replace','2')
        self.assertFalse(s['complete']);self.assertEqual(s['entries']['product:2'],'18')
        self.assertNotIn('expected',str(s))
        s,_=update(spec,'a',s,'quotient:0','replace','1')
        self.assertTrue(s['complete'])
        s,_=update(spec,'a',s,'quotient:1','backspace')
        self.assertFalse(s['complete']);self.assertEqual(s['entries']['quotient:1'],'')
        s,_=update(spec,'a',s,'quotient:1','backspace')
        self.assertEqual(s['active'],'difference:0')
    def test_alignment_and_no_hidden_answers_in_plan(self):
        p=plan(lesson('division',{'dividend':432,'divisor':12}))
        self.assertEqual(p['fields'][0]['column'],1)
        self.assertEqual(p['fields'][1]['width'],2)
        self.assertEqual(p['fields'][3]['column'],2)
        self.assertNotIn('expected',str(p));self.assertNotIn('correct',str(p))

class ProgressiveApiTests(FamilyTestCase):
    def setUp(self):
        super().setUp();self.c=self.parent();self.p=str(self.pupil(self.c,'Synthetic paper'))
        self.base=f'/api/pupils/{self.p}/writing/'
        self.a=self.c.post(self.base,{'topic':'division'},format='json').json();self.url=self.base+self.a['id']+'/'
    def send(self,entry,digit):
        r=self.c.post(self.url+'action/',{'action':'division-input','version':self.a['version'],'entry':entry,'operation':'digit','digit':digit},format='json')
        self.assertEqual(r.status_code,200,r.content);self.a=r.json()
    def test_resume_ownership_cas_and_canonical_formative_evidence(self):
        self.send('quotient:0','1');self.send('product:0','3');self.send('difference:0','0')
        saved=self.c.get(self.url).json();self.assertEqual(saved['support']['divisionPaper']['active'],'quotient:1')
        other=self.parent('synthetic-other@example.org');self.assertEqual(other.get(self.url).status_code,404)
        r=self.c.post(self.url+'action/',{'action':'division-input','version':0,'entry':'quotient:0','operation':'digit','digit':'1'},format='json');self.assertEqual(r.status_code,409)
        for f,n in zip(plan(self.a['lesson'])['fields'][3:],entries(379,3)[3:]):
            for d in n:self.send(f['id'],d)
        self.assertEqual(self.a['stage'],'complete')
        events=list(PupilEvent.objects.filter(pupil_id=self.p).values_list('body',flat=True))
        self.assertTrue(all(e['admissible'] is False for e in events))
        self.assertEqual(events[-1]['payload']['result']['outcome'],'complete')
        self.assertEqual(events[-1]['payload']['input']['contract'],'openpath-math-input@1')
