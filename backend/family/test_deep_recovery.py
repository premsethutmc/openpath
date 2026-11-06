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


class DeepRecoveryStateLimitTests(LearningBase):
    """Phase 6: the 600-character allowance and recovery ids apply to deep-recovery entries only; everything else is as before."""
    def setUp(self):
        super().setUp()
        self.assertEqual(self.save(self.enrol()).status_code, 201)

    def deep(self, n_skills, orig='eq-d1'):
        seg = 'MATH.number.equivalent-fractions'
        return f'deep:{orig}|' + '>'.join([seg] * n_skills) + f'@{seg}'

    def test_the_600_character_ceiling_holds_even_for_a_well_formed_deep_context(self):
        ok = self.deep(16)                       # 16 skills on the path
        self.assertLessEqual(len(ok), 600)
        self.assertEqual(self.save(self.attempt('eq-d1', '2', context=ok)).status_code, 201)
        long_orig = 'gen:' + 'x' * 116           # the longest original id the shape allows (120)
        over = f'deep:{long_orig}|' + '>'.join(['MATH.' + 'y' * 75] * 6) + '@MATH.' + 'z' * 75
        self.assertGreater(len(over), 600)
        self.assertEqual(self.save(self.attempt('eq-d2', '2', context=over)).status_code, 400, 'over 600: refused')
        self.assertEqual(self.save(self.attempt('eq-d2', '2', context=self.deep(17))).status_code, 400, 'more than 16 skills on the path')

    def test_malformed_deep_state_is_refused(self):
        for bad in [5, ['deep:eq-d1|A@B'], {'deep': 1}, 'deep:eq d1|A@B', 'deep:eq-d1||A@B', 'deep:eq-d1|A>@B', 'deep:eq-d1|A@', 'deep:eq-d1|A@B\n',
                    'deep:eq-d1|A@B|C', 'deep:eq-d1#x|A@B', 'deep:' + 'q' * 121 + '|A@B']:
            self.assertEqual(self.save(self.attempt('eq-d2', '2', context=bad)).status_code, 400, repr(bad))

    def test_other_records_keep_their_limits_and_fields(self):
        self.assertEqual(self.save(self.attempt('eq-d1', '2', context='study:' + 'x' * 75)).status_code, 400, 'non-deep context over 80')
        self.assertEqual(self.save(self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='strip_model', rule='r' * 41)).status_code, 400, 'teach rule still at most 40')
        self.assertEqual(self.save(self.rec('skip', target='MATH.number.fractions', episode='deep:eq-d1#2026-01-01T00:00:00Z')).status_code, 400, 'only a lesson carries a recovery id')
        self.assertEqual(self.save(self.rec('goal', pathway='jee-advanced', active=True, context='deep:eq-d1|A@B')).status_code, 400, 'no context outside attempts')
        self.assertEqual(self.save(self.attempt('eq-d1', 'x' * 81, context=self.deep(2))).status_code, 400, 'the answer limit is unchanged inside a recovery')

    def test_a_deep_context_does_not_change_how_an_answer_is_decided(self):
        for ctx in (None, self.deep(3)):
            for response in ('2', '3'):
                self.assertEqual(self.save(self.attempt('eq-d2', response, **({'context': ctx} if ctx else {}))).status_code, 201)
        saved = [e for e in self.records() if e['record'] == 'attempt']
        plain, deep = saved[:2], saved[2:]
        for x, y in zip(plain, deep):
            self.assertEqual(x['decision']['verdict'], y['decision']['verdict'])
            self.assertEqual((x['activity'], x['hints'], x['solution']), (y['activity'], y['hints'], y['solution']))
        self.assertEqual({x['decision']['verdict'] for x in plain} >= {'correct'} or {x['decision']['verdict'] for x in plain} >= {'incorrect'}, True)

    def test_old_records_replay_byte_for_byte_after_deep_records(self):
        old = [self.attempt('eq-d1', '2', context='recovery:eq-d1'), self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='strip_model', rule='conceptual')]
        for e in old:
            self.assertEqual(self.save(e).status_code, 201)
        before = [e for e in self.records() if e['record'] in ('attempt', 'teach')]
        first = self.save(self.attempt('eq-d2', '3', context=self.deep(2, 'eq-d2'))).json()
        self.assertEqual(self.save(self.rec('teach', competency='MATH.number.equivalent-fractions', strategy='strip_model', rule='conceptual', episode=f"deep:eq-d2#{first['at']}")).status_code, 201)
        after = [e for e in self.records() if e['record'] in ('attempt', 'teach')]
        self.assertEqual(after[:len(before)], before, 'earlier records are unchanged by later deep-recovery records')
