from django.conf import settings
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .adapters import AdapterFailed, AdapterUnavailable, get_adapter
from .models import AI_EVALUATION, EvaluationRecord, PurposeConsent
from .protocol import fingerprint, validate_request

FALLBACK = "use code-scored activities, self-checking against a model answer, or teacher marking"


def has_consent(learner, purpose=AI_EVALUATION) -> bool:
    latest = learner.purpose_consents.filter(purpose=purpose).order_by("-recorded_at", "-id").first()
    return bool(latest and latest.granted)


class ConsentSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(choices=[p for p, _ in PurposeConsent.PURPOSES])
    granted = serializers.BooleanField()
    given_by = serializers.ChoiceField(choices=[g for g, _ in PurposeConsent.GIVEN_BY])


class PurposeConsentView(APIView):
    """Record or read consent for a specific purpose. The latest record wins, so it can be withdrawn."""

    def get(self, request, learner_id):
        return Response(
            {
                "consents": list(
                    request.user.purpose_consents.values("purpose", "granted", "given_by", "policy_version", "recorded_at")
                ),
                "ai_evaluation": has_consent(request.user),
            }
        )

    def post(self, request, learner_id):
        s = ConsentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        PurposeConsent.objects.create(
            learner=request.user, policy_version=settings.OPENPATH_CONSENT_POLICY_VERSION, **s.validated_data
        )
        return Response({"ai_evaluation": has_consent(request.user)}, status=status.HTTP_201_CREATED)


class EvaluationView(APIView):
    """The gateway: consent, identifier removal, validation, an adapter, and a record of all of it.
    It returns the adapter's raw proposal, which the device's controlled updater then checks."""

    def post(self, request, learner_id):
        learner = request.user
        if not has_consent(learner):
            return Response(
                {"error": "no consent for AI evaluation of written answers", "fallback": FALLBACK},
                status=status.HTTP_403_FORBIDDEN,
            )
        req = validate_request(request.data.get("request"))
        item = req.get("task") or req.get("item")
        record = EvaluationRecord(
            learner=learner,
            protocol=req["prompt_version"],
            item_id=item["id"],
            item_version=item["version"],
            fingerprint=fingerprint(req),
            request=req,
        )
        try:
            adapter = get_adapter()
        except AdapterUnavailable as e:
            record.adapter, record.status, record.reason = "disabled", "refused", str(e)
            record.save()
            return Response({"error": str(e), "fallback": FALLBACK}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        record.adapter = adapter.name
        try:
            proposal = adapter.evaluate(req)
        except AdapterFailed as e:
            record.status, record.reason = "failed", str(e)[:200]
            record.save()
            return Response({"error": str(e), "fallback": FALLBACK}, status=status.HTTP_502_BAD_GATEWAY)
        record.status, record.proposal = "answered", proposal
        record.save()
        return Response(
            {
                "proposal": proposal,
                "evaluator": {"id": f"gateway:{adapter.name}", "model": adapter.name, "prompt": req["prompt_version"]},
                "record": record.pk,
            }
        )
