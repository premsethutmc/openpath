"""feedback@1: a signed-in tester ticks what is wrong; only a developer reads the list."""

from rest_framework.test import APIClient

from .test_developer import DevTestCase


class FeedbackTests(DevTestCase):
    def test_send_and_read(self):
        tester = self.parent("tester@example.org")
        r = tester.post("/api/feedback/", {"where": "gen:afprot:8,29", "kinds": ["wrong", "cluttered", "nonsense"], "note": "write to me at a@b.com", "width": 390}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        # a tester cannot read the list; a developer can, and sees no email
        self.assertEqual(tester.get("/api/feedback/").status_code, 403)
        rows = self.developer().get("/api/feedback/").json()["feedback"]
        self.assertEqual(rows[0]["where"], "gen:afprot:8,29")
        self.assertEqual(rows[0]["kinds"], ["cluttered", "wrong"])
        self.assertNotIn("a@b.com", rows[0]["note"])

    def test_refusals(self):
        self.assertIn(APIClient().post("/api/feedback/", {"where": "x", "kinds": ["wrong"]}, format="json").status_code, (401, 403))
        tester = self.parent("tester2@example.org")
        self.assertEqual(tester.post("/api/feedback/", {"where": "gen:x:1", "kinds": []}, format="json").status_code, 400)
        self.assertEqual(tester.post("/api/feedback/", {"where": "<script>", "kinds": ["wrong"]}, format="json").status_code, 400)
