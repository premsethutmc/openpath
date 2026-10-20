"""Readiness is deliberately separate from production URLs and reveals no account information."""
from django.db import connection
from django.http import HttpResponse
from django.urls import path
from django.views.decorators.http import require_safe
from .urls import urlpatterns as application_urls

@require_safe
def readiness(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        return HttpResponse('unavailable', status=503, content_type='text/plain')
    return HttpResponse('ok', content_type='text/plain')

urlpatterns = [path('healthz/', readiness)] + application_urls

from . import demo_student
urlpatterns = [
    path('api/preview-demo/bootstrap/', demo_student.bootstrap),
    path('api/preview-demo/start/', demo_student.start),
    path('api/preview-demo/reset/', demo_student.start),
    path('api/preview-demo/status/', demo_student.status),
] + urlpatterns
