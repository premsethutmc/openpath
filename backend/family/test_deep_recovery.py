"""deep-recovery@0 (research, flag-gated in the app): the optional recovery id on lessons and the longer `deep:` attempt context.
Only that shape gets the longer limit; every other record validates and reads back exactly as before. Synthetic pupils only."""
from .test_learning import LearningBase

TEACH = dict(competency='MATH.number.equivalent-fractions', strategy='strip_model', rule='conceptual')
PATH = 'MATH.number.equivalent-fractions>MATH.number.fractions>MATH.number.multiplication-facts@MATH.number.division-facts'


class DeepRecoveryRecordTests(LearningBase):
    def setUp(self):
        super().setUp()
        self.assertEqual(self.save(self.enrol()).status_code, 201)

    def first(self):
        r = self.save(self.attempt('eq-d1', '2', context='deep:eq-d1|MATH.number.equivalent-fractions@MATH.number.equivalent-fractions'))
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()['at']

    def test_old_records_validate_and_read_back_unchanged(self):
        old = [self.attempt('eq-d1', '2'), self.attempt('eq-d2', '3', context='recovery:eq-d1'), self.attempt('eq-d3', '1', context='investigate:eq-d1'), self.rec('teach', **TEACH)]
        for e in old:
            self.assertEqual(self.save(e).status_code, 201, e)
        saved = [e for e in self.records() if e['record'] in ('attempt', 'teach')]
        self.assertEqual([e.get('context') for e in saved], [None, 'recovery:eq-d1', 'investigate:eq-d1', None])
        self.assertNotIn('episode', saved[-1], 'a lesson without a recovery id is stored without one')
        for k in ('questionId', 'response', 'activity', 'hints', 'solution', 'competency'):
            self.assertEqual([e.get(k) for e in saved[:3]], [x.get(k) for x in old[:3]])

    def test_the_old_context_limit_stays_for_every_other_context(self):
        self.assertEqual(self.save(self.attempt('eq-d1', '2', context='recovery:' + 'x' * 71)).status_code, 201, '80 characters')
        self.assertEqual(self.save(self.attempt('eq-d2', '2', context='recovery:' + 'x' * 72)).status_code, 400, '81 characters')
        self.assertEqual(self.save(self.attempt('eq-d2', '2', context='Deep:eq-d1|' + PATH)).status_code, 400, 'only the exact deep: prefix')

    def test_a_deep_context_with_a_long_path_is_accepted_only_in_its_shape(self):
        ctx = f'deep:gen:aupfr:1,-3,3,-2,-4|{PATH}'
        self.assertGreater(len(ctx), 80)
        self.assertEqual(self.save(self.attempt('eq-d1', '2', context=ctx)).status_code, 201)
        self.assertEqual([e.get('context') for e in self.records() if e['record'] == 'attempt'], [ctx])
        for bad in ['deep:', 'deep:eq-d1', 'deep:eq-d1|', f'deep:eq-d1|{PATH} ', 'deep:eq-d1|A@B; drop table', f'deep:eq-d1|{PATH}@x@y',
                    'deep:eq-d1|' + '>'.join(['MATH.number.fractions'] * 20) + '@MATH.number.fractions']:
            self.assertEqual(self.save(self.attempt('eq-d2', '2', context=bad)).status_code, 400, bad)

    def test_a_lesson_may_carry_the_id_of_an_existing_recovery(self):
        at = self.first()
        r = self.save(self.rec('teach', **TEACH, episode=f'deep:eq-d1#{at}'))
        self.assertEqual(r.status_code, 201, r.content)
        lesson = [e for e in self.records() if e['record'] == 'teach'][-1]
        self.assertEqual(lesson['episode'], f'deep:eq-d1#{at}')
        self.assertEqual(self.save(self.rec('teach', **TEACH)).status_code, 201, 'still optional')

    def test_an_unknown_or_malformed_recovery_id_is_refused(self):
        at = self.first()
        for bad in [f'deep:eq-d2#{at}', 'deep:eq-d1#2000-01-01T00:00:00Z', f'recovery:eq-d1#{at}', '', 'deep:eq-d1', 7, None, f'deep:eq-d1#{at}' + 'x' * 200]:
            self.assertEqual(self.save(self.rec('teach', **TEACH, episode=bad)).status_code, 400, bad)
        self.assertEqual(self.save(self.rec('attempt', questionId='eq-d1', response='2', activity='practice', hints=0, solution=False,
                                            competency='MATH.number.equivalent-fractions', episode=f'deep:eq-d1#{at}')).status_code, 400, 'only lessons carry it')
