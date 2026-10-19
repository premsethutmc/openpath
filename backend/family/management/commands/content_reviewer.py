"""Grant, revoke or list content-review roles (educator, release manager). Explicit grants only.

    python manage.py content_reviewer grant <email> --role educator|release-manager
    python manage.py content_reviewer revoke <email> --role educator|release-manager
    python manage.py content_reviewer list
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from family.models import ContentReviewer


class Command(BaseCommand):
    help = "Manage content-review roles (explicit grants only)."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["grant", "revoke", "list"])
        parser.add_argument("email", nargs="?")
        parser.add_argument("--role", choices=["educator", "release-manager"])

    def handle(self, action, email=None, role=None, **_):
        if action == "list":
            for g in ContentReviewer.objects.select_related("user").order_by("granted_at"):
                self.stdout.write(f"{g.user.email}\t{g.role}\t{'active' if g.active else 'revoked'}\tgranted {g.granted_at:%Y-%m-%d} via {g.granted_via}")
            return
        if not email or not role:
            raise CommandError("Give the account's email and --role.")
        user = get_user_model().objects.filter(username=email.strip().lower()).first()
        if user is None:
            raise CommandError("No account with that email.")
        r = role.replace("-", "_")
        if action == "grant":
            ContentReviewer.objects.update_or_create(user=user, role=r, defaults={"granted_via": "management command", "revoked_at": None})
            self.stdout.write(f"Granted {role} to {user.email}.")
        else:
            n = ContentReviewer.objects.filter(user=user, role=r, revoked_at__isnull=True).update(revoked_at=timezone.now())
            self.stdout.write(f"Revoked {role} from {user.email}." if n else "No active grant.")
