import random
from django.test import SimpleTestCase
from .writing_math import final_answer, lesson
from .test_writing import work
from .tests import FamilyTestCase
from .models import PupilEvent

class FinalAnswerTests(SimpleTestCase):
    def test_division_formats_incomplete_invalid_and_wrong(self):
        spec=lesson('division',{})
        for text in ['126 R 1','126 remainder 1',' 126r1 ','126 REMAINDER 1']:
            self.assertEqual(final_answer(spec,text)['outcome'],'complete')
        for text in ['', '126']:self.assertEqual(final_answer(spec,text)['outcome'],'incomplete')
        for text in ['126.3','126 R','words','126 R 1 junk']:self.assertEqual(final_answer(spec,text)['outcome'],'format')
        for text in ['126 R 0','125 R 4','127 R -2']:self.assertEqual(final_answer(spec,text)['outcome'],'incorrect')
    def test_reproducible_arbitrary_division_and_equivalence(self):
        rng=random.Random(921)
        for _ in range(200):
            a,b=rng.randrange(1000000),rng.randrange(1,999)
            q,r=divmod(a,b)
            self.assertEqual(final_answer(lesson('division',{'dividend':a,'divisor':b}),f'{q} R {r}')['outcome'],'complete')
        for text in ['2/4','3/6','5/10']:self.assertEqual(final_answer(lesson('fraction',{}),text)['outcome'],'complete')
        self.assertEqual(final_answer(lesson('fraction',{}),'1/0')['outcome'],'format')
        self.assertEqual(final_answer(lesson('fraction',{}),'2/3')['outcome'],'incorrect')
        self.assertEqual(final_answer(lesson('multiplication',{}),'24')['outcome'],'complete')

class OneAnswerPersistenceTests(FamilyTestCase):
    def setUp(self):
        super().setUp();self.c=self.parent();self.p=str(self.pupil(self.c,'Synthetic single answer'))
        self.base=f'/api/pupils/{self.p}/writing/'
        self.a=self.c.post(self.base,{'topic':'division'},format='json').json()
        self.url=self.base+self.a['id']+'/'
    def act(self,action,**extra):
        r=self.c.post(self.url+'action/',{'action':action,'version':self.a['version'],**extra},format='json')
        self.assertEqual(r.status_code,200,r.content);self.a=r.json();return self.a
    def test_immediate_retry_persistence_and_no_mastery(self):
        self.act('answer-draft',answer='126')
        self.assertEqual(self.c.get(self.url).json()['support']['simple']['answer'],'126')
        self.act('check-answer',answer='126');self.assertEqual(self.a['support']['simple']['result']['outcome'],'incomplete')
        self.act('check-answer',answer='125 R 1');self.assertNotEqual(self.a['stage'],'diagnostic')
        self.act('answer-help');self.act('check-answer',answer='126 remainder 1')
        self.assertEqual(self.a['stage'],'complete')
        rows=list(PupilEvent.objects.filter(pupil_id=self.p).values_list('body',flat=True))
        self.assertTrue(all(e['admissible'] is False for e in rows))
        self.assertTrue(rows[-1]['assisted'])
        self.act('answer-draft',answer='12')
        self.assertNotIn('result',self.c.get(self.url).json()['support']['simple'])
    def test_stale_answer_and_other_learner_are_rejected(self):
        self.act('answer-draft',answer='12')
        self.assertEqual(self.c.post(self.url+'action/',{'action':'answer-draft','version':0,'answer':'old'},format='json').status_code,409)
        other=self.parent('other.synthetic@example.org')
        self.assertEqual(other.get(self.url).status_code,404)
    def test_ink_is_separate_and_uses_the_existing_input_contract(self):
        spec={**self.a['lesson'],'layout':self.a['lesson']['answerLayout']}
        ink=work(self.a['id'],spec,{'answer':'126'})
        self.act('answer-draft',answer='126',ink=ink)
        self.assertEqual(self.c.get(self.url).json()['support']['simple']['ink'],ink)
        self.act('guided');self.assertIsNone(self.a['work'])
        self.assertEqual(self.a['support']['simple']['ink'],ink)
        self.act('check-answer',answer='126 R 1',method='ink')
        self.assertEqual(self.a['support']['simple']['result']['outcome'],'complete')
