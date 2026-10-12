from django.urls import path

from . import views

urlpatterns = [
    path("learners/<uuid:learner_id>/consents/", views.PurposeConsentView.as_view(), name="purpose-consents"),
    path("learners/<uuid:learner_id>/evaluations/", views.EvaluationView.as_view(), name="evaluations"),
]
