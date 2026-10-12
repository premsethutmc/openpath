from django.apps import AppConfig


class EvaluationConfig(AppConfig):
    name = "evaluation"
    verbose_name = "Free-form evaluation gateway (E3a)"

    def ready(self):
        # Fail at start-up, not on a learner's request, if someone configures an adapter that does not exist.
        from .adapters import check_configuration

        check_configuration()
