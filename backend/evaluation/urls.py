from django.urls import path

from . import essay, views

urlpatterns = [
    path("learners/<uuid:learner_id>/consents/", views.PurposeConsentView.as_view(), name="purpose-consents"),
    path("learners/<uuid:learner_id>/evaluations/", views.EvaluationView.as_view(), name="evaluations"),
    # Essay Intelligence v2: developer accounts, synthetic test essays only
    path("evaluation/essays/status/", essay.EssayEvaluatorStatusView.as_view(), name="essay-evaluator-status"),
    path("evaluation/essays/", essay.EssayEvaluationView.as_view(), name="essay-evaluations"),
]
