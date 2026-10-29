"""Process-isolated verifier service (prototype of option A/C integration shape).

Worker: `python3 -I service.py --worker` reads one JSON request per line on stdin and writes one JSON response per line.
  request  {"id": ..., "op": "transition" | "case", "payload": {...}}
  response {"id": ..., "ok": true, "result": {...}} | {"id": ..., "ok": false, "error": "..."}
Limits inside the worker: address space (RLIMIT_AS), CPU seconds (RLIMIT_CPU), per-SymPy-call alarms (transition.limited).
Client: VerifierClient(timeout_s) supervises one worker; on timeout or crash it kills and restarts it and returns
  verdict 'unresolved' (reason 'timeout' / 'worker-crash') -- a resource failure is never a mathematical verdict.
"""
from __future__ import annotations
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def worker_main():
    import resource
    sys.path.insert(0, HERE)
    sys.setrecursionlimit(4000)
    mem = int(os.environ.get("VERIFIER_MEM_MB", "1536")) * 1024 * 1024
    resource.setrlimit(resource.RLIMIT_AS, (mem, mem))
    cpu = int(os.environ.get("VERIFIER_CPU_S", "3600"))
    resource.setrlimit(resource.RLIMIT_CPU, (cpu, cpu))
    from transition import verify_transition
    import cases
    for line in sys.stdin:
        try:
            req = json.loads(line)
            p = req.get("payload", {})
            if req["op"] == "transition":
                res = verify_transition(p["prev"], p["next"], p.get("variables"), p.get("assumptions"), p.get("task", "auto")).to_dict()
            elif req["op"] == "case":
                res = cases.assess_case(p["problem"], p["working"])
            elif req["op"] == "ping":
                res = {"pong": True}
            else:
                raise ValueError("unknown op")
            out = {"id": req.get("id"), "ok": True, "result": res}
        except Exception as e:  # noqa: BLE001
            out = {"id": None, "ok": False, "error": f"{type(e).__name__}: {e}"[:300]}
        sys.stdout.write(json.dumps(out, default=str) + "\n")
        sys.stdout.flush()


class VerifierClient:
    def __init__(self, timeout_s: float = 10.0):
        self.timeout_s = timeout_s
        self.p = None
        self.restarts = 0
        self._start()

    def _start(self):
        env = {"PATH": os.environ.get("PATH", ""), "VERIFIER_MEM_MB": os.environ.get("VERIFIER_MEM_MB", "1536")}
        self.p = subprocess.Popen([sys.executable, "-I", os.path.join(HERE, "service.py"), "--worker"], stdin=subprocess.PIPE,
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1, env=env)
        self.call("ping", {}, warm=True)

    def _kill(self):
        try:
            self.p.kill()
            self.p.wait(2)
        except Exception:  # noqa: BLE001
            pass

    def call(self, op, payload, warm=False):
        import select
        t0 = time.perf_counter()
        try:
            self.p.stdin.write(json.dumps({"id": 1, "op": op, "payload": payload}) + "\n")
            self.p.stdin.flush()
            r, _, _ = select.select([self.p.stdout], [], [], 60 if warm else self.timeout_s)
            if not r:
                raise TimeoutError
            line = self.p.stdout.readline()
            if not line:
                raise ChildProcessError
            out = json.loads(line)
        except TimeoutError:
            self._kill(); self.restarts += 1; self._start()
            return {"ok": True, "result": {"verdict": "unresolved", "reason": "timeout"}, "ms": (time.perf_counter() - t0) * 1000, "timeout": True}
        except (ChildProcessError, BrokenPipeError, ValueError):
            self._kill(); self.restarts += 1; self._start()
            return {"ok": True, "result": {"verdict": "unresolved", "reason": "worker-crash"}, "ms": (time.perf_counter() - t0) * 1000, "crash": True}
        out["ms"] = (time.perf_counter() - t0) * 1000
        return out

    def close(self):
        self._kill()


if __name__ == "__main__" and "--worker" in sys.argv:
    worker_main()
