"""python manage.py english_usage [--days 30]: English usage, counts only (see family/english_usage.py)."""
from django.core.management.base import BaseCommand

from family.english_usage import as_text, usage


class Command(BaseCommand):
    help = "English usage by activity: children, sittings started and finished, right %, median minutes. Counts only."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30)

    def handle(self, *args, days: int, **options):
        self.stdout.write(as_text(usage(days)))
