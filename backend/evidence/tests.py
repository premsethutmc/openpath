"""API behaviour: evidence in, profile out, and who is allowed to see what."""

import uuid
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from assessment.scenarios import Script, perfect_session
from evidence import services
from evidence.models import ActivitySession, InteractionEvent, Observation, SkillState
from learners.models import ConsentRecord, Learner

CARDINALITY = "math.counting.cardinality"
LATER = perfect_session((4, 6, 3), ("pear", "apple", "orange"))


class ApiTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.learner_id, self.token = self.enrol()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def enrol(self):
        response = APIClient().post(
            "/api/learners/", {"consent": {"given_by": "guardian", "confirmed": True}}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.data["learner_id"], response.data["access_token"]

    def upload(self, events, *, session_id=None, finished=True, days_from_now=0, client=None):
        session_id = session_id or uuid.uuid4()
        return (client or self.client).put(
            f"/api/learners/{self.learner_id}/sessions/{session_id}/",
            {
                "activity": "apple-shopping",
                "activity_version": "1",
                "finished": finished,
                "ended_at": (timezone.now() + timedelta(days=days_from_now)).isoformat(),
                "events": events,
            },
            format="json",
        )

    def statuses(self, response):
        return {s["key"]: s["status"] for s in response.data["profile"]["skills"]}


class EnrolmentTests(ApiTestCase):
    def test_enrolment_returns_a_pseudonym_a_token_and_the_first_session_plan(self):
        response = APIClient().post(
            "/api/learners/", {"consent": {"given_by": "guardian", "confirmed": True}}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        uuid.UUID(response.data["learner_id"])
        self.assertGreaterEqual(len(response.data["access_token"]), 40)
        self.assertEqual(response.data["next_session"]["rounds"][0]["target"], 5)

    def test_no_learner_record_without_consent(self):
        before = Learner.objects.count()
        for body in ({}, {"consent": {"given_by": "guardian", "confirmed": False}}):
            self.assertEqual(APIClient().post("/api/learners/", body, format="json").status_code, 400)
        self.assertEqual(Learner.objects.count(), before)

    def test_consent_is_recorded_with_who_gave_it_and_which_policy(self):
        consent = ConsentRecord.objects.get(learner_id=self.learner_id)
        self.assertEqual(consent.given_by, "guardian")
        self.assertTrue(consent.policy_version)

    def test_the_token_itself_is_never_stored(self):
        learner = Learner.objects.get(pk=self.learner_id)
        self.assertNotEqual(learner.token_hash, self.token)
        self.assertNotIn(self.token, str(Learner.objects.filter(pk=self.learner_id).values()))

    def test_the_learner_table_has_nowhere_to_put_a_name(self):
        fields = {f.name for f in Learner._meta.get_fields() if not f.is_relation}
        self.assertEqual(fields, {"id", "token_hash", "created_at"})

    def test_enrolment_is_rate_limited(self):
        from evidence.views import EnrolThrottle

        original = EnrolThrottle.THROTTLE_RATES
        EnrolThrottle.THROTTLE_RATES = {"enrol": "2/hour"}
        try:
            cache.clear()
            body = {"consent": {"given_by": "guardian", "confirmed": True}}
            codes = [APIClient().post("/api/learners/", body, format="json").status_code for _ in range(3)]
        finally:
            EnrolThrottle.THROTTLE_RATES = original
        self.assertEqual(codes, [201, 201, 429])


class AccessControlTests(ApiTestCase):
    def test_requests_without_a_token_are_refused(self):
        anonymous = APIClient()
        self.assertEqual(anonymous.get(f"/api/learners/{self.learner_id}/").status_code, 401)
        self.assertEqual(anonymous.get(f"/api/learners/{self.learner_id}/export/").status_code, 401)
        self.assertEqual(self.upload(perfect_session(), client=anonymous).status_code, 401)

    def test_a_made_up_token_is_refused(self):
        stranger = APIClient()
        stranger.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(stranger.get(f"/api/learners/{self.learner_id}/").status_code, 401)

    def test_one_family_cannot_read_write_export_or_delete_another_learner(self):
        _, other_token = self.enrol()
        other = APIClient()
        other.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")
        self.assertEqual(other.get(f"/api/learners/{self.learner_id}/").status_code, 403)
        self.assertEqual(other.get(f"/api/learners/{self.learner_id}/export/").status_code, 403)
        self.assertEqual(other.delete(f"/api/learners/{self.learner_id}/").status_code, 403)
        self.assertEqual(self.upload(perfect_session(), client=other).status_code, 403)
        self.assertFalse(ActivitySession.objects.exists())


class EvidenceTests(ApiTestCase):
    def test_a_session_is_stored_as_raw_events_and_derived_observations(self):
        events = perfect_session()
        response = self.upload(events)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["session"]["integrity"], "ok")
        self.assertEqual(InteractionEvent.objects.count(), len(events))
        self.assertEqual(Observation.objects.count(), 9)
        self.assertEqual(len(response.data["observations"]), 9)
        self.assertEqual(response.data["sessions_completed"], 1)

    def test_the_first_session_moves_the_profile_but_masters_nothing(self):
        response = self.upload(perfect_session())
        statuses = self.statuses(response)
        self.assertEqual(statuses[CARDINALITY], "developing")
        self.assertEqual(statuses["math.counting.one_to_one"], "secure_pending_retention")
        self.assertNotIn("mastered", statuses.values())
        self.assertIn({"skill": CARDINALITY, "from": "no_evidence", "to": "developing"}, response.data["changes"])
        self.assertEqual(SkillState.objects.get(learner_id=self.learner_id, skill=CARDINALITY).status, "developing")

    def test_a_second_session_the_same_day_still_masters_nothing(self):
        self.upload(perfect_session())
        response = self.upload(LATER)
        self.assertEqual(self.statuses(response)[CARDINALITY], "secure_pending_retention")

    def test_success_again_days_later_is_mastery_and_opens_the_next_skills(self):
        self.upload(perfect_session())
        response = self.upload(LATER, days_from_now=3)
        self.assertEqual(self.statuses(response)[CARDINALITY], "mastered")
        self.assertEqual(
            response.data["profile"]["ready_next"], ["math.quantity.compare", "math.operations.combine_sets"]
        )
        self.assertEqual(response.data["next_session"]["band"], "stretch")

    def test_a_struggling_session_leads_to_a_gentler_next_plan(self):
        events = Script().round("r1", 5).add(8).check().hint(1).remove(3).check().complete().events
        response = self.upload(events)
        self.assertEqual(self.statuses(response)[CARDINALITY], "emerging")
        self.assertEqual(response.data["next_session"]["band"], "support")

    def test_uploading_a_session_again_replaces_it_rather_than_double_counting(self):
        session_id = uuid.uuid4()
        partial = Script().solve("r1", 5).events
        first = self.upload(partial, session_id=session_id, finished=False)
        self.assertEqual(first.data["sessions_completed"], 0)
        again = self.upload(perfect_session(), session_id=session_id)
        final = self.upload(perfect_session(), session_id=session_id)
        self.assertEqual(
            [(s["key"], s["status"], s["counts"]) for s in again.data["profile"]["skills"]],
            [(s["key"], s["status"], s["counts"]) for s in final.data["profile"]["skills"]],
        )
        self.assertEqual(ActivitySession.objects.count(), 1)
        self.assertEqual(Observation.objects.count(), 9)
        self.assertEqual(final.data["sessions_completed"], 1)

    def test_a_session_that_does_not_replay_is_kept_but_never_assessed(self):
        events = Script().round("r1", 5).add(2).check({"apple": 5}).complete().events
        response = self.upload(events)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["session"]["integrity"], "inconsistent")
        self.assertEqual(Observation.objects.count(), 0)
        self.assertEqual(InteractionEvent.objects.count(), len(events))
        self.assertEqual(set(self.statuses(response).values()), {"no_evidence"})
        self.assertEqual(response.data["sessions_completed"], 0)

    def test_malformed_uploads_are_refused(self):
        events = perfect_session()
        duplicate_seq = [dict(events[0]), dict(events[0])]
        bad_type = [{**events[0], "type": "DROP TABLE"}]
        for bad in ([], duplicate_seq, bad_type):
            self.assertEqual(self.upload(bad).status_code, 400)
        self.assertFalse(ActivitySession.objects.exists())

    @override_settings(OPENPATH_TRUST_CLIENT_CLOCK=False)
    def test_in_production_a_client_cannot_backdate_or_postdate_its_way_to_mastery(self):
        self.upload(perfect_session())
        response = self.upload(LATER, days_from_now=30)
        self.assertEqual(self.statuses(response)[CARDINALITY], "secure_pending_retention")

    def test_observations_can_be_rebuilt_from_raw_events(self):
        self.upload(perfect_session())
        before = self.client.get(f"/api/learners/{self.learner_id}/").data["profile"]
        Observation.objects.all().delete()
        SkillState.objects.all().delete()
        services.reassess(Learner.objects.get(pk=self.learner_id))
        after = self.client.get(f"/api/learners/{self.learner_id}/").data["profile"]
        self.assertEqual(Observation.objects.count(), 9)
        self.assertEqual(
            [(s["key"], s["status"], s["counts"]) for s in before["skills"]],
            [(s["key"], s["status"], s["counts"]) for s in after["skills"]],
        )


class DataRightsTests(ApiTestCase):
    def test_export_contains_everything_held_about_the_learner(self):
        events = perfect_session()
        self.upload(events)
        response = self.client.get(f"/api/learners/{self.learner_id}/export/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        export = response.data
        self.assertEqual(export["learner_id"], self.learner_id)
        self.assertEqual(len(export["consents"]), 1)
        self.assertEqual(len(export["sessions"][0]["events"]), len(events))
        self.assertEqual(len(export["sessions"][0]["observations"]), 9)
        self.assertEqual(len(export["profile"]["skills"]), 6)

    def test_delete_erases_the_learner_and_all_their_evidence(self):
        self.upload(perfect_session())
        self.assertEqual(self.client.delete(f"/api/learners/{self.learner_id}/").status_code, 204)
        for model in (Learner, ConsentRecord, ActivitySession, InteractionEvent, Observation, SkillState):
            self.assertEqual(model.objects.count(), 0, model.__name__)
        self.assertEqual(self.client.get(f"/api/learners/{self.learner_id}/").status_code, 401)
