from django.urls import path

from . import developer, views

urlpatterns = [
    path("account/", views.AccountView.as_view(), name="account"),
    path("account/register/", views.RegisterView.as_view(), name="account-register"),
    path("account/login/", views.LoginView.as_view(), name="account-login"),
    path("account/logout/", views.LogoutView.as_view(), name="account-logout"),
    path("account/password/", views.ChangePasswordView.as_view(), name="account-password"),
    path("account/password-reset/", views.PasswordResetView.as_view(), name="account-password-reset"),
    path("account/password-reset/confirm/", views.PasswordResetConfirmView.as_view(), name="account-password-reset-confirm"),
    path("account/delete/", views.DeleteAccountView.as_view(), name="account-delete"),
    path("pupils/", views.PupilsView.as_view(), name="pupils"),
    path("pupils/<uuid:pupil_id>/", views.PupilView.as_view(), name="pupil"),
    path("pupils/<uuid:pupil_id>/events/", views.PupilEventsView.as_view(), name="pupil-events"),
    path("pupils/<uuid:pupil_id>/events/scrub/", views.PupilScrubView.as_view(), name="pupil-events-scrub"),
    path("pupils/<uuid:pupil_id>/export/", views.PupilExportView.as_view(), name="pupil-export"),
    path("telemetry/", developer.TelemetryView.as_view(), name="telemetry"),
    path("developer/status/", developer.DeveloperStatusView.as_view(), name="developer-status"),
    path("developer/claim/", developer.DeveloperClaimView.as_view(), name="developer-claim"),
    path("developer/overview/", developer.DeveloperOverviewView.as_view(), name="developer-overview"),
    path("developer/pupils/", developer.DeveloperPupilsView.as_view(), name="developer-pupils"),
    path("developer/pupils/<uuid:pupil_id>/events/", developer.DeveloperPupilEventsView.as_view(), name="developer-pupil-events"),
    path("developer/audit/", developer.DeveloperAuditView.as_view(), name="developer-audit"),
]
