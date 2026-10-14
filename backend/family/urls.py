from django.urls import path

from . import views

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
    path("pupils/<uuid:pupil_id>/export/", views.PupilExportView.as_view(), name="pupil-export"),
]
