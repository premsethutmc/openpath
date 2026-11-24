"""python manage.py placements_log [--days 14]: real placements as lines for the server log (see family/placements.py)."""
from django.core.management.base import BaseCommand

from family.placements import log_lines


class Command(BaseCommand):
    help = "Word check and Find my level sittings, without names, for checking placements against real people."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=14)

    def handle(self, *args, days: int, **options):
        for line in log_lines(days):
            self.stdout.write(line)
