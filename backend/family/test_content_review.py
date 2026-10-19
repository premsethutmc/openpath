"""Educator review on the server: roles, versions, history, and the server's view of content hashes. Synthetic accounts."""
import json
from pathlib import Path

from django.conf import settings
from django.core.management import call_command

from .content_review import items
from .models import ContentDecision
from .tests import FamilyTestCase

ROOT = Path(settings.BASE_DIR).parent / 'content/learning'


class ContentReviewTests(FamilyTestCase):
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
        for fam in ('family:mmul', 'family:mul'):
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
