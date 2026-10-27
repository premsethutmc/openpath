"""Persistent bounded NDJSON worker for the geometry assessment adapter."""
from __future__ import annotations
import json
import os
import sys
import time
from typing import Any
from .unified_api import assess_unified

PROTOCOL = "openpath-geometry-worker@2"
MAX_REQUEST_BYTES = 1_000_000
MAX_RESPONSE_BYTES = 2_000_000

def _limits() -> None:
    try:
        import resource
        memory = int(os.environ.get("OPENPATH_GEOMETRY_MEMORY_BYTES", str(512 * 1024 * 1024)))
        resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    except (ImportError, OSError, ValueError):
        pass

def _response(request_id: object, *, ok: bool, result: Any = None, error: str | None = None) -> dict[str, Any]:
    value: dict[str, Any] = {"protocol": PROTOCOL, "id": request_id, "ok": ok}
    if ok: value["result"] = result
    else: value["transport_error"] = error or "worker request failed"
    return value

def _handle(message: object) -> dict[str, Any]:
    if not isinstance(message, dict): return _response(None, ok=False, error="request must be an object")
    request_id = message.get("id")
    if message.get("protocol") != PROTOCOL: return _response(request_id, ok=False, error="unsupported protocol")
    operation = message.get("operation")
    if operation == "health":
        try:
            import resource
            rss_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        except (ImportError, OSError): rss_kb = None
        return _response(request_id, ok=True, result={"status":"ok","pid":os.getpid(),"protocol":PROTOCOL,"max_rss_kb":rss_kb})
    if operation != "assess": return _response(request_id, ok=False, error="unsupported operation")
    payload = message.get("payload")
    if not isinstance(payload, dict): return _response(request_id, ok=False, error="payload must be an object")
    # Operator-controlled fault injection for transport tests. Student input cannot enable it.
    delayed_id=os.environ.get("OPENPATH_GEOMETRY_TEST_DELAY_ID")
    if delayed_id and payload.get("problem",{}).get("id")==delayed_id:
        time.sleep(min(5.0,max(0.0,float(os.environ.get("OPENPATH_GEOMETRY_TEST_DELAY_MS","0"))/1000)))
    return _response(request_id, ok=True, result=assess_unified(payload))

def main() -> None:
    _limits()
    for raw in sys.stdin.buffer:
        if len(raw) > MAX_REQUEST_BYTES:
            answer = _response(None, ok=False, error="request exceeds maximum size")
        else:
            try: answer = _handle(json.loads(raw))
            except (json.JSONDecodeError, UnicodeDecodeError): answer = _response(None, ok=False, error="malformed JSON")
            except Exception: answer = _response(None, ok=False, error="worker failed safely")
        encoded = json.dumps(answer, sort_keys=True, separators=(",", ":"), default=str).encode() + b"\n"
        if len(encoded) > MAX_RESPONSE_BYTES:
            encoded = json.dumps(_response(answer.get("id"), ok=False, error="response exceeds maximum size"), sort_keys=True, separators=(",", ":")).encode() + b"\n"
        sys.stdout.buffer.write(encoded); sys.stdout.buffer.flush()

if __name__ == "__main__": main()
