from django.conf import settings
from rest_framework import serializers


class ConsentSerializer(serializers.Serializer):
    given_by = serializers.ChoiceField(choices=["guardian", "school"])
    confirmed = serializers.BooleanField()

    def validate_confirmed(self, value):
        if not value:
            raise serializers.ValidationError("Consent is required before a learner record is created.")
        return value


class EnrolSerializer(serializers.Serializer):
    consent = ConsentSerializer()


class EventSerializer(serializers.Serializer):
    seq = serializers.IntegerField(min_value=0)
    type = serializers.RegexField(r"^[a-z][a-z0-9_]{0,39}$")
    t = serializers.IntegerField(min_value=0, max_value=24 * 60 * 60 * 1000)
    round = serializers.CharField(max_length=32, allow_null=True, required=False)
    data = serializers.DictField(required=False)


class SessionSerializer(serializers.Serializer):
    activity = serializers.RegexField(r"^[a-z][a-z0-9-]{0,63}$")
    activity_version = serializers.CharField(max_length=32, required=False, allow_blank=True)
    plan = serializers.DictField(required=False)
    finished = serializers.BooleanField(default=False)
    ended_at = serializers.DateTimeField(required=False)
    events = EventSerializer(many=True, allow_empty=False)

    def validate_events(self, events):
        if len(events) > settings.OPENPATH_MAX_EVENTS_PER_SESSION:
            raise serializers.ValidationError("Too many events for one session.")
        seqs = [e["seq"] for e in events]
        if len(set(seqs)) != len(seqs):
            raise serializers.ValidationError("Event sequence numbers must be unique.")
        return events
