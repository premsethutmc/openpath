from django.core.management.base import BaseCommand

from evidence import services
from learners.models import Learner


class Command(BaseCommand):
    help = "Rebuild every observation and skill state from the stored raw events."

    def handle(self, *args, **options):
        count = 0
        for learner in Learner.objects.iterator():
            services.reassess(learner)
            count += 1
        self.stdout.write(f"Reassessed {count} learner(s).")
