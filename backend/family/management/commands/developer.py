"""Grant, revoke or list developer diagnostics access, or issue a one-time claim code.

    python manage.py developer issue-claim [--hours 24]   print a one-time code (the Codespace does this at start)
    python manage.py developer grant <email>
    python manage.py developer revoke <email>
    python manage.py developer list
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from family.developer import audit, issue_claim
from family.models import DeveloperAccess


class Command(BaseCommand):
    help = "Manage developer diagnostics access (explicit grants only)."

    def add_arguments(self, parser):
        parser.add_argument("action", choices=["issue-claim", "grant", "revoke", "list"])
        parser.add_argument("email", nargs="?")
        parser.add_argument("--hours", type=int, default=None)

    def handle(self, action, email=None, hours=None, **_):
        User = get_user_model()
        if action == "issue-claim":
            self.stdout.write(issue_claim(hours))
            return
        if action == "list":
            for a in DeveloperAccess.objects.select_related("user").order_by("granted_at"):
                self.stdout.write(f"{a.user.email}\t{'active' if a.active else 'revoked'}\tgranted {a.granted_at:%Y-%m-%d} via {a.granted_via}")
            return
        if not email:
            raise CommandError("Give the account's email.")
        user = User.objects.filter(username=email.strip().lower()).first()
        if user is None:
            raise CommandError("No account with that email.")
        if action == "grant":
            access, _ = DeveloperAccess.objects.update_or_create(user=user, defaults={"granted_via": "management command", "revoked_at": None})
            audit(user, "granted_by_command")
            self.stdout.write(f"{email}: developer access granted")
        else:
            DeveloperAccess.objects.filter(user=user, revoked_at__isnull=True).update(revoked_at=timezone.now())
            audit(user, "revoked_by_command")
            self.stdout.write(f"{email}: developer access revoked")
