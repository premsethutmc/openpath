from django.test import SimpleTestCase
from .scrub import scrub_events, revives_deleted
from .developer import redact_parent_content

class SpellingLearningPrivacyTests(SimpleTestCase):
    def event(self):
        return {'kind': 'spell_learning', 'id': 'learning-1', 'at': '2026-10-19T00:00:00Z', 'session': 'sp:1', 'source': {'type': 'list', 'id': 'list:1'}, 'word': 'castle', 'action': 'draft', 'response': 'casle'}

    def test_delete_scrubs_instruction_ids_and_typed_drafts_idempotently(self):
        original = self.event()
        out, count = scrub_events([original], {'type': 'list', 'id': 'list:1'})
        self.assertEqual(count, 1)
        self.assertEqual(out[0]['id'], original['id'])
        self.assertEqual(out[0]['word'], 'removed-1')
        self.assertEqual(out[0]['response'], '')
        self.assertEqual(original['response'], 'casle')
        self.assertEqual(scrub_events(out, {'type': 'list', 'id': 'list:1'}), (out, 0))

    def test_stale_learning_actions_cannot_restore_deleted_parent_content(self):
        self.assertTrue(revives_deleted(self.event(), {('list', 'list:1')}))
        self.assertFalse(revives_deleted({**self.event(), 'scrubbed': True}, {('list', 'list:1')}))

    def test_shared_diagnostics_redact_new_instructional_content(self):
        redacted = redact_parent_content(self.event())
        self.assertNotEqual(redacted['word'], 'castle')
        self.assertEqual(redacted['response'], '')
        self.assertEqual(redacted['action'], 'draft')
        other = {**self.event(), 'source': {'type': 'bank', 'id': 'spelling-bee'}}
        self.assertEqual(redact_parent_content(other), other)
