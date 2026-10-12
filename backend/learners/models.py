"""Pseudonymous learners.

The central system knows a learner only as a random UUID. There is
deliberately no name, birth date, email, school or free-text field here: the
mapping from a real child to a learner ID stays with the family (on their
device) or with the school. A pseudonym is still personal data - a long
behavioural record can be re-identified - so it gets the same care: consent,
access control, export and erasure.
"""

import hashlib
import secrets
import uuid

from django.db import models


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class Learner(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @classmethod
    def enrol(cls, *, given_by: str, policy_version: str) -> tuple["Learner", str]:
        """Create a learner and return it with its access token.

        The token is shown once and only its hash is stored. It is 256 bits of
        randomness, so a fast hash is appropriate (nothing to brute-force).
        """
        token = secrets.token_urlsafe(32)
        learner = cls.objects.create(token_hash=hash_token(token))
        ConsentRecord.objects.create(learner=learner, given_by=given_by, policy_version=policy_version)
        return learner, token

    @property
    def is_authenticated(self) -> bool:
        return True


class ConsentRecord(models.Model):
    GIVEN_BY = [("guardian", "Parent or guardian"), ("school", "School")]

    learner = models.ForeignKey(Learner, on_delete=models.CASCADE, related_name="consents")
    given_by = models.CharField(max_length=16, choices=GIVEN_BY)
    policy_version = models.CharField(max_length=40)
    given_at = models.DateTimeField(auto_now_add=True)
