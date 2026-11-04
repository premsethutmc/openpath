"""The generator must retain audited graph semantics, not undo generated-file repairs."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('expansion', Path(__file__).with_name('expansion.py'))
expansion = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(expansion)


class ExpansionTests(unittest.TestCase):
    def test_regeneration_preserves_committed_graph_and_all_syllabi(self):
        writes = {}

        def capture(path, text):
            self.assertEqual(text, path.read_text(), str(path))
            writes[path] = text
            return len(text)

        with patch.object(Path, 'write_text', capture):
            expansion.main()
        self.assertEqual(len(writes), 25)
        graph = json.loads(writes[expansion.ROOT / 'competency-expansion.v1.json'])
        self.assertEqual(graph['version'], '1.0.2')
        edges = {(r['target'], r['from']): r['type'] for r in graph['relations']}
        for skill in ('MATH.coordinate.distance-intro', 'MATH.trigonometry.ratios'):
            self.assertEqual(edges['MATH.geometry.pythagoras', skill], 'disputed')
            self.assertEqual(edges[skill, 'MATH.geometry.pythagoras'], 'support')
        # missing-digit puzzles rest on column regrouping (the generator's own carry and exchange steps): support, never a gate
        for regroup in ('MATH.number.addition-regroup', 'MATH.number.subtraction-regroup'):
            self.assertEqual(edges['MATH.reasoning.puzzle-strategy', regroup], 'support')

    def test_stale_audit_refuses_silent_overwrite(self):
        read = Path.read_text

        def changed(path, *args, **kwargs):
            text = read(path, *args, **kwargs)
            if path.name == 'expansion-audit.v1.json':
                data = json.loads(text)
                data['replace'][0]['from'] = 'MATH.not-a-real-competency'
                return json.dumps(data)
            return text

        with patch.object(Path, 'read_text', changed), patch.object(Path, 'write_text') as write:
            with self.assertRaisesRegex(ValueError, 'match exactly once'):
                expansion.main()
            write.assert_not_called()


if __name__ == '__main__':
    unittest.main()
