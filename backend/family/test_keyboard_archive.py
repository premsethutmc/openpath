"""Deferred input must not delete archived strokes or rewrite historical evidence."""
import copy
from .tests import FamilyTestCase
from .test_writing import work
from .models import WritingDraft, PupilEvent


class KeyboardArchiveTests(FamilyTestCase):
    def test_open_resume_and_export_preserve_archived_handwriting_exactly(self):
        client = self.parent()
        pupil = self.pupil(client, 'Synthetic archive')
        base = f'/api/pupils/{pupil}/writing/'
        initial = client.post(base, {'topic': 'division'}, format='json').json()
        archived = work(initial['id'], initial['lesson'])
        archived['strokes'] = [{'id': 'historical-pen', 'pointerType': 'pen', 'points': [{'x': 351.5, 'y': 44.25, 't': 20, 'pressure': .7, 'tiltX': 10, 'tiltY': 4, 'twist': 0}], 'startedAt': '2026-10-19T10:00:00Z', 'regionId': 'quotient', 'width': 3, 'tool': 'ink'}]
        archived['corrections'] = [{'id': 'historical-correction', 'from': '136', 'to': '126', 'method': 'keyboard'}]
        archived['history'] = [{'id': 'historical-event', 'kind': 'recognition', 'provider': 'archived-provider'}]
        draft = WritingDraft.objects.get(pk=initial['id'])
        draft.work = copy.deepcopy(archived)
        draft.save()
        before = list(PupilEvent.objects.filter(pupil_id=pupil).values_list('body', flat=True))
        resumed = client.post(base, {'topic': 'division'}, format='json')
        self.assertEqual(resumed.status_code, 200)
        self.assertEqual(resumed.json()['work'], archived)
        self.assertEqual(client.get(base + initial['id'] + '/').json()['work'], archived)
        exported = client.get(f'/api/pupils/{pupil}/export/').json()
        self.assertEqual(exported['writingDrafts'][0]['work'], archived)
        draft.refresh_from_db()
        self.assertEqual(draft.work, archived)
        self.assertEqual(list(PupilEvent.objects.filter(pupil_id=pupil).values_list('body', flat=True)), before)

        # Progressive keyboard state lives beside the archived contract, never replacing it.
        changed = client.post(base + initial['id'] + '/action/', {'version': draft.version, 'action': 'division-input', 'entry': 'quotient:0', 'operation': 'digit', 'digit': '1'}, format='json')
        self.assertEqual(changed.status_code, 200, changed.content)
        draft.refresh_from_db()
        self.assertEqual(draft.work, archived)
        after = list(PupilEvent.objects.filter(pupil_id=pupil).order_by('seq').values_list('body', flat=True))
        self.assertEqual(after[:len(before)], before)
        self.assertEqual(after[-1]['admissible'], False)
