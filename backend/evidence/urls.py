from django.urls import path

from . import views

urlpatterns = [
    path("learners/", views.EnrolView.as_view(), name="enrol"),
    path("learners/<uuid:learner_id>/", views.LearnerView.as_view(), name="learner"),
    path("learners/<uuid:learner_id>/export/", views.ExportView.as_view(), name="export"),
    path(
        "learners/<uuid:learner_id>/sessions/<uuid:client_session_id>/",
        views.SessionView.as_view(),
        name="session",
    ),
]
