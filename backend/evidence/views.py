from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from learners.models import Learner

from . import services
from .serializers import EnrolSerializer, SessionSerializer


class EnrolThrottle(SimpleRateThrottle):
    scope = "enrol"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class EnrolView(APIView):
    """Create a pseudonymous learner. Returns the access token exactly once."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [EnrolThrottle]

    def post(self, request):
        serializer = EnrolSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        learner, token = Learner.enrol(
            given_by=serializer.validated_data["consent"]["given_by"],
            policy_version=settings.OPENPATH_CONSENT_POLICY_VERSION,
        )
        return Response(
            {"access_token": token, **services.learner_overview(learner)},
            status=status.HTTP_201_CREATED,
        )


class LearnerView(APIView):
    def get(self, request, learner_id):
        return Response(services.learner_overview(request.user))

    def delete(self, request, learner_id):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SessionView(APIView):
    def put(self, request, learner_id, client_session_id):
        serializer = SessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(services.record_session(request.user, client_session_id, serializer.validated_data))


class ExportView(APIView):
    def get(self, request, learner_id):
        response = Response(services.export_learner(request.user))
        response["Content-Disposition"] = f'attachment; filename="openpath-{request.user.pk}.json"'
        return response
