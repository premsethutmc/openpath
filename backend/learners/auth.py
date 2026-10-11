"""Bearer-token authentication scoped to a single learner record."""

from rest_framework import authentication, exceptions, permissions

from .models import Learner, hash_token


class LearnerTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("latin-1").split()
        if not header or header[0] != self.keyword:
            return None
        if len(header) != 2:
            raise exceptions.AuthenticationFailed("Malformed Authorization header.")
        learner = Learner.objects.filter(token_hash=hash_token(header[1])).first()
        if learner is None:
            raise exceptions.AuthenticationFailed("Unknown access token.")
        return learner, None

    def authenticate_header(self, request):
        return self.keyword


class IsThisLearner(permissions.BasePermission):
    """The token must belong to the learner named in the URL."""

    def has_permission(self, request, view):
        learner = request.user
        return isinstance(learner, Learner) and str(learner.pk) == str(view.kwargs.get("learner_id"))
