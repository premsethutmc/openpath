"""Educator review on the server: roles, versions, history, and the server's view of content hashes. Synthetic accounts."""
import json
from pathlib import Path

from django.conf import settings
from unittest import mock

from django.core.management import call_command

from .content_review import items
from .models import ContentDecision
from .tests import FamilyTestCase

ROOT = Path(settings.BASE_DIR).parent / 'content/learning'


class ReviewBase(FamilyTestCase):
    def setUp(self):
        super().setUp()
        emails = ['educator@example.org', 'release@example.org']
        self.educator = self.parent(emails[0])
        self.manager = self.parent(emails[1])
        self.learner_parent = self.parent('parent@example.org')
        call_command('content_reviewer', 'grant', emails[0], role='educator', stdout=open('/dev/null', 'w'))
        call_command('content_reviewer', 'grant', emails[1], role='release-manager', stdout=open('/dev/null', 'w'))

    def decide(self, client, item, decision, note='checked the spec, examples and validation'):
        h = next(e for e in client.get('/api/content-review/').json()['registry']['entries'] if e['item'] == item)['contentHash']
        return client.post('/api/content-review/decisions/', {'item': item, 'decision': decision, 'contentHash': h, 'note': note}, format='json')

    def state(self, item, client=None):
        return next(e for e in (client or self.learner_parent).get('/api/content-review/').json()['registry']['entries'] if e['item'] == item)


class ContentReviewTests(ReviewBase):

    def test_the_server_hashes_content_exactly_as_the_app_does(self):
        repo = {e['item']: e['contentHash'] for e in json.loads((ROOT / 'review.v1.json').read_text())['entries']}
        here = items()
        self.assertGreater(len(here), 60)
        for item, meta in here.items():
            if item.startswith('curriculum:'):
                continue  # a release's hash is its own (checked by the release tests); not in the repository registry
            self.assertEqual(meta['hash'], repo.get(item), item)

    def test_roles_workflow_and_history(self):
        fam = 'family:mmul'
        self.assertEqual(self.decide(self.learner_parent, fam, 'submit').status_code, 403, 'a learner\'s parent has no review role')
        self.assertEqual(self.decide(self.educator, fam, 'approve').status_code, 409, 'a draft cannot be approved')
        self.assertEqual(self.decide(self.educator, fam, 'submit').status_code, 201)
        self.assertEqual(self.decide(self.manager, fam, 'approve').status_code, 403, 'a release manager cannot approve')
        self.assertEqual(self.decide(self.educator, fam, 'approve', note='').status_code, 400, 'an approval needs a note')
        self.assertEqual(self.decide(self.educator, fam, 'approve').status_code, 201)
        self.assertEqual(self.decide(self.educator, fam, 'release').status_code, 403, 'an educator cannot release')
        self.assertEqual(self.decide(self.manager, fam, 'release').status_code, 201)
        e = self.state(fam)
        self.assertEqual(e['state'], 'released')
        self.assertTrue(e['releasedAt'])
        self.assertEqual([h['state'] for h in e['history']], ['submitted', 'approved', 'released'])
        self.assertTrue(all(h['by'] and h['contentHash'] == e['contentHash'] for h in e['history']), 'who decided, on which version')

    def test_a_stale_version_cannot_be_decided_and_old_decisions_do_not_apply(self):
        fam = 'family:lin'
        self.assertEqual(self.decide(self.educator, fam, 'submit').status_code, 201)
        r = self.educator.post('/api/content-review/decisions/', {'item': fam, 'decision': 'approve', 'contentHash': '00000000', 'note': 'x'}, format='json')
        self.assertEqual(r.status_code, 409)
        # a decision recorded on an earlier version (as after a generator change) no longer applies
        ContentDecision.objects.create(item='family:apn', content_hash='deadbeef', decision='submit', reviewer_label='old', role='educator')
        ContentDecision.objects.create(item='family:apn', content_hash='deadbeef', decision='approve', reviewer_label='old', role='educator')
        e = self.state('family:apn')
        self.assertEqual(e['state'], 'draft')
        self.assertEqual([h['current'] for h in e['history']], [False, False])

    def test_a_module_is_released_only_after_its_families(self):
        mod = 'module:MATH.number.multi-multiplication'
        for d in ('submit', 'approve'):
            self.assertEqual(self.decide(self.educator, mod, d).status_code, 201)
        r = self.decide(self.manager, mod, 'release')
        self.assertEqual(r.status_code, 409)
        self.assertIn('mmul', r.json()['detail'])
        # every family the module uses (its pools@1 pools and listed questions), as the server lists them
        from . import content_review
        uses = content_review.items()[mod]['families']
        self.assertIn('mmul', uses)
        for fam in [f'family:{f}' for f in uses]:
            for who, d in ((self.educator, 'submit'), (self.educator, 'approve'), (self.manager, 'release')):
                self.assertEqual(self.decide(who, fam, d).status_code, 201, (fam, d))
        self.assertEqual(self.decide(self.manager, mod, 'release').status_code, 201)
        self.assertEqual(self.state(mod)['state'], 'released')

    def test_decisions_are_append_only_and_unknown_items_refused(self):
        self.assertEqual(self.educator.post('/api/content-review/decisions/', {'item': 'family:nope', 'decision': 'submit', 'contentHash': 'x'}, format='json').status_code, 400)
        self.decide(self.educator, 'family:hcf', 'submit')
        d = ContentDecision.objects.first()
        d.note = 'changed'
        with self.assertRaises(ValueError):
            d.save()
        with self.assertRaises(ValueError):
            d.delete()
        with self.assertRaises(ValueError):
            ContentDecision.objects.filter(item='family:hcf').update(note='x')
        with self.assertRaises(ValueError):
            ContentDecision.objects.all().delete()

    def test_four_eyes_and_reviewer_names_only_for_reviewers(self):
        both = self.parent('both@example.org')
        call_command('content_reviewer', 'grant', 'both@example.org', role='educator', stdout=open('/dev/null', 'w'))
        call_command('content_reviewer', 'grant', 'both@example.org', role='release-manager', stdout=open('/dev/null', 'w'))
        for d in ('submit', 'approve'):
            self.assertEqual(self.decide(both, 'family:vol', d).status_code, 201)
        r = self.decide(both, 'family:vol', 'release')
        self.assertEqual(r.status_code, 409, 'the approver cannot also release')
        self.assertEqual(self.decide(self.manager, 'family:vol', 'release').status_code, 201)
        seen = self.state('family:vol', self.learner_parent)['history']
        self.assertTrue(all('@' not in h['by'] for h in seen), 'a learner\'s parent sees roles, not reviewers\' emails')
        self.assertTrue(any('@' in h['by'] for h in self.state('family:vol', self.educator)['history']))

    def test_a_released_module_is_suspended_when_a_family_it_uses_is_no_longer_released(self):
        from . import content_review
        mod = 'module:MATH.number.multi-multiplication'
        for item in [*(f'family:{f}' for f in content_review.items()[mod]['families']), mod]:
            for who, d in ((self.educator, 'submit'), (self.educator, 'approve'), (self.manager, 'release')):
                self.assertEqual(self.decide(who, item, d).status_code, 201, (item, d))
        self.assertEqual(self.state(mod)['state'], 'released')
        real = content_review.items()
        changed = {**real, 'family:mmul': {**real['family:mmul'], 'hash': 'changed0'}}
        with mock.patch.object(content_review, 'items', return_value=changed):
            e = self.state(mod)
        self.assertEqual(e['state'], 'approved')
        self.assertIn('no longer released', e['suspended'])


class ReleasedContentEvidenceTests(ReviewBase):
    """Rejection, out-of-pool questions and repeated exposure, through the server."""

    def test_a_rejected_version_cannot_be_approved_or_released(self):
        fam = 'family:pct'
        self.assertEqual(self.decide(self.educator, fam, 'submit').status_code, 201)
        self.assertEqual(self.decide(self.educator, fam, 'reject', note='the 5% wording is unclear').status_code, 201)
        self.assertEqual(self.state(fam)['state'], 'rejected')
        self.assertEqual(self.decide(self.educator, fam, 'approve').status_code, 409)
        self.assertEqual(self.decide(self.manager, fam, 'release').status_code, 409)
        self.assertEqual(self.decide(self.educator, fam, 'submit').status_code, 409, 'a rejected version stays rejected: only a new version can be submitted')

    def _pupil(self):
        from .test_learning import G4
        pid = str(self.pupil(self.learner_parent, 'Synthetic pool pupil'))
        seq = [0]
        n = [0]

        def save(record, **extra):
            n[0] += 1
            ev = {'kind': 'learning_record', 'id': f'pp-{n[0]}', 'at': '2000-01-01T00:00:00Z', 'learnerId': pid, 'sessionId': f'learn:{pid}:v', 'record': record, **extra}
            r = self.append(self.learner_parent, pid, seq[0], ev, subject='mathematics')
            if r.status_code == 201:
                seq[0] += 1
            return r
        save('enrol', grade=4, academicYear='2026-27', curriculum={'id': G4['id'], 'version': G4['version'], 'hash': G4['hash']})
        return pid, save

    def test_questions_outside_an_approved_pool_are_refused(self):
        _, save = self._pupil()
        ok = dict(response='282', activity='practice', hints=0, solution=False, competency='MATH.number.multi-multiplication')
        self.assertEqual(save('attempt', questionId='gen:mmul:47,6', **ok).status_code, 201)
        self.assertEqual(save('attempt', questionId='gen:mmul:47,1', **(ok | {'response': '47'})).status_code, 400, 'outside the domain')
        self.assertEqual(save('attempt', questionId='gen:mmul:40,6', **(ok | {'response': '240'})).status_code, 400, 'excluded by the specification')
        self.assertEqual(save('attempt', questionId='gen:mmul:47,6:mc', **(ok | {'response': 'Z'})).status_code, 400, 'not an option letter')

    def test_a_repeated_problem_never_makes_a_delayed_check_due(self):
        pid, save = self._pupil()
        ok = dict(activity='check', hints=0, solution=False, competency='MATH.number.multi-multiplication')
        from .learning_families import generated
        # the same problem twice (typed, then multiple choice), both right: one exposure, so not two distinct answers
        self.assertEqual(save('attempt', questionId='gen:mmul:47,6', response='282', **ok).status_code, 201)
        self.assertEqual(save('attempt', questionId='gen:mmul:47,6:mc', response=generated('gen:mmul:47,6:mc')['answer'], **ok).status_code, 201)
        from datetime import timedelta
        from django.utils import timezone as tz
        later = tz.now() + timedelta(days=8)
        with mock.patch('family.learning.timezone.now', return_value=later):
            r = save('attempt', questionId='gen:mmul:51,4', response='204', activity='retention', hints=0, solution=False, competency='MATH.number.multi-multiplication')
        self.assertEqual(r.status_code, 400, 'one problem seen twice is not independent success')
        # the control: a second, different problem right makes it due seven full days later
        self.assertEqual(save('attempt', questionId='gen:mmul:58,3', response='174', **ok).status_code, 201)
        with mock.patch('family.learning.timezone.now', return_value=tz.now() + timedelta(days=6, hours=23)):
            self.assertEqual(save('attempt', questionId='gen:mmul:51,4', response='204', activity='retention', hints=0, solution=False, competency='MATH.number.multi-multiplication').status_code, 400, 'not before seven full days')
        with mock.patch('family.learning.timezone.now', return_value=tz.now() + timedelta(days=7, minutes=5)):
            self.assertEqual(save('attempt', questionId='gen:mmul:51,4', response='204', activity='retention', hints=0, solution=False, competency='MATH.number.multi-multiplication').status_code, 201)
