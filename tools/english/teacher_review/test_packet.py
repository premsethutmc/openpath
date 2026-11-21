import json
from pathlib import Path
import tempfile
import unittest

from packet import SOURCE, FORM, ROOT, build_packet, write_packet


class PacketTests(unittest.TestCase):
    def setUp(self):
        self.raw = SOURCE.read_bytes()

    def test_all_existing_cases_preserved_without_labels(self):
        original = json.loads(self.raw)["cases"]
        reviewer, key = build_packet(self.raw, 42)
        self.assertEqual(len(reviewer["cases"]), len(original))
        by_id = {case["id"]: case for case in original}
        for case, mapping in zip(reviewer["cases"], key["cases"]):
            self.assertEqual(set(case), {
                "case_id", "task", "text", "goal", "difficulty_preference"})
            self.assertEqual(case["text"], by_id[mapping["source_id"]]["text"])
            self.assertEqual(case["task"], by_id[mapping["source_id"]]["prompt"])
        self.assertEqual(reviewer["source_sha256"], key["source_sha256"])
        self.assertFalse(reviewer["educator_review_completed"])

    def test_seed_reproducibility_and_shuffle(self):
        a = build_packet(self.raw, 42)
        self.assertEqual(a, build_packet(self.raw, 42))
        self.assertNotEqual(a[1]["cases"], build_packet(self.raw, 43)[1]["cases"])
        self.assertEqual(a[0]["packet_id"], a[1]["packet_id"])
        self.assertNotEqual(a[0]["packet_id"], build_packet(self.raw, 43)[0]["packet_id"])

    def test_unknown_metadata_not_exposed(self):
        fixture = json.loads(self.raw)
        fixture["cases"][0]["engine_name"] = "must-not-leak"
        packet, _ = build_packet(json.dumps(fixture).encode(), 42)
        self.assertNotIn("must-not-leak", json.dumps(packet))

    def test_duplicate_ids_rejected(self):
        fixture = json.loads(self.raw)
        fixture["cases"].append(fixture["cases"][0])
        with self.assertRaises(ValueError):
            build_packet(json.dumps(fixture).encode(), 42)

    def test_missing_task_rejected(self):
        fixture = json.loads(self.raw)
        fixture["cases"][0]["prompt"] = ""
        with self.assertRaises(ValueError):
            build_packet(json.dumps(fixture).encode(), 42)

    def test_local_files_private_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory) / "packet"
            write_packet(out, self.raw, 42, FORM.read_text())
            self.assertEqual(out.stat().st_mode & 0o777, 0o700)
            for file in out.iterdir():
                self.assertEqual(file.stat().st_mode & 0o777, 0o600)
            before = (out / "reviewer.json").read_bytes()
            with self.assertRaises(FileExistsError):
                write_packet(out, self.raw, 99, FORM.read_text())
            self.assertEqual(before, (out / "reviewer.json").read_bytes())

    def test_original_sampling_bank_has_unique_ids_and_three_tasks_per_family(self):
        bank = json.loads((ROOT / "docs/product/english/teacher-review/sampling-prompts.json").read_text())
        ids = []
        for family in bank["families"]:
            self.assertEqual(len(family["prompts"]), 3)
            ids.extend(task["id"] for task in family["prompts"])
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(ids), 9)


if __name__ == "__main__":
    unittest.main()
