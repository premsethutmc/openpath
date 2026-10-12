from django.urls import include, path

urlpatterns = [
    path("api/", include("evidence.urls")),
    path("api/", include("evaluation.urls")),
]
