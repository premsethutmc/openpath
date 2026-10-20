from django.test import SimpleTestCase
from .workspace_recovery import record_error, respond, division_hints
from .progressive_division import update
from .writing_math import lesson

class RecoveryTests(SimpleTestCase):
    def test_opt_in_escalation_and_retry_preserve_counts(self):
        s={}
        for n in range(1,5):
            s=record_error(s,'quotient:0')
            self.assertIsNone(s['message'])
            for i in range(1,4):
                s=respond(s,'hint',division_hints('quotient'))
                self.assertEqual(s['level'],min(n,i,3))
            s=respond(s,'retry',[])
            self.assertFalse(s['open'])
            self.assertEqual(s['errors']['quotient:0'],n)
    def test_incomplete_is_not_error_and_work_survives(self):
        spec=lesson('division',{'dividend':432,'divisor':12})
        s,_=update(spec,'x',{},'quotient:0','digit','3')
        s,result=update(spec,'x',s,'product:0','digit','3')
        self.assertIsNone(result)
        self.assertEqual(s['feedback']['outcome'],'pending')
        s,result=update(spec,'x',s,'product:0','digit','9')
        self.assertEqual(result['outcome'],'incorrect')
        self.assertEqual(s['entries'],{'quotient:0':'3','product:0':'39'})
        s,_=update(spec,'x',s,'product:0','replace','3')
        s,_=update(spec,'x',s,'product:0','digit','6')
        self.assertEqual(s['active'],'difference:0')

from . import test_progressive_division as paper_tests
from .test_progressive_division import entries, plan
from .tests import FamilyTestCase

class RecoveryApiTests(FamilyTestCase):
    def setUp(self):
        super().setUp()
        self.c=self.parent();self.p=str(self.pupil(self.c,'Synthetic recovery'))
        self.base=f'/api/pupils/{self.p}/writing/'
        self.a=self.c.post(self.base,{'topic':'division'},format='json').json()
        self.url=self.base+self.a['id']+'/' 
    send = paper_tests.ProgressiveApiTests.send
    def test_help_persists_and_assisted_success_remains_ineligible(self):
        self.send('quotient:0','2')
        r=self.c.post(self.url+'action/',{'action':'workspace-recovery','version':0,'choice':'hint'},format='json')
        self.assertEqual(r.status_code,409)
        for choice in ['hint','retry']:
            r=self.c.post(self.url+'action/',{'action':'workspace-recovery','version':self.a['version'],'choice':choice},format='json')
            self.assertEqual(r.status_code,200,r.content);self.a=r.json()
        self.assertTrue(self.c.get(self.url).json()['support']['helpSeen'])
        r=self.c.post(self.url+'action/',{'action':'division-input','version':self.a['version'],'entry':'quotient:0','operation':'replace','digit':'1'},format='json')
        self.a=r.json()
        for field,number in zip(plan(self.a['lesson'])['fields'][1:],entries(379,3)[1:]):
            for digit in number:self.send(field['id'],digit)
        self.assertEqual(self.a['stage'],'complete')
        self.assertTrue(self.a['receipts'][-1]['assisted'])
        self.assertTrue(all(not r['admissible'] for r in self.a['receipts']))
        self.assertIn('workspace-help',[r['action'] for r in self.a['receipts']])
