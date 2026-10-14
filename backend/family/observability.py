"""Application performance and errors, recorded without request bodies, ids or child data.

MetricsMiddleware times every /api/ request and stores the route's *name* (for example "pupil-events"), the method,
the status and the duration; never the path (it contains pupil ids) or any body. An unhandled exception is stored as
the route and the error's class and first line. Old rows are pruned, so the tables stay small.
"""

import time
from datetime import timedelta

from django.utils import timezone

from .models import ApiMetric, ClientMetric, ServerError

KEEP_DAYS = 14


def prune() -> None:
    cutoff = timezone.now() - timedelta(days=KEEP_DAYS)
    for model in (ApiMetric, ServerError, ClientMetric):
        model.objects.filter(at__lt=cutoff).delete()


def _route(request) -> str:
    match = getattr(request, "resolver_match", None)
    return (match.url_name or match.view_name or "unnamed")[:60] if match else "unmatched"


class MetricsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.count = 0

    def __call__(self, request):
        if not request.path.startswith("/api/"):
            return self.get_response(request)
        start = time.perf_counter()
        response = self.get_response(request)
        try:
            ApiMetric.objects.create(route=_route(request), method=request.method[:8], status=response.status_code, ms=round((time.perf_counter() - start) * 1000, 2))
            self.count += 1
            if self.count % 500 == 0:
                prune()
        except Exception:  # observability must never break the request
            pass
        return response

    def process_exception(self, request, exception):
        if request.path.startswith("/api/"):
            try:
                first = str(exception).splitlines()[0][:120] if str(exception) else ""
                ServerError.objects.create(route=_route(request), method=request.method[:8], error=f"{type(exception).__name__}: {first}"[:200])
            except Exception:
                pass
        return None
