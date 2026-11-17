"""The server's use of the trusted grader (the TypeScript grading package, bundled to grader/grader.mjs and run by Node).

The browser's verdict is never an input: the grader is given a question id, the student's response and permitted working, rebuilds the
question's contract from its own definition and runs THE grading decision (grading/decision.ts), the same code the app runs. It answers
for every known question (generated or authored). This module accepts a reply only when the grader's stored answer is exactly the answer
this server stores for the question (parity); otherwise, or when the grader cannot run, it returns None (the caller's failure path).

Standard library only (no Django), so it can be tested on its own.
"""
import atexit
import hashlib
import json
import os
import re
import select
import shutil
import subprocess
import sys
import signal
import threading
import time
from functools import lru_cache
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent / 'grader' / 'grader.mjs'
MANIFEST = BUNDLE.with_name('grader.manifest.json')
QUESTION_ID = re.compile(r'^(?:gen:[a-z0-9]+:-?\d+(?:,-?\d+)*(?::mc|:w)?|(?:program|foundation):[a-z0-9-]{1,60}:[A-Za-z0-9._-]{1,60}|[a-z][a-z0-9]*(?:[-.][a-z0-9]+){0,6})$')
SOURCES = {'kernel', 'verifier', 'parser', 'held', 'educator'}


def _timeout():
    try:
        return max(0.5, float(os.environ.get('OPENPATH_GRADER_TIMEOUT', '8')))
    except ValueError:
        return 8.0


def node_path():
    return os.environ.get('OPENPATH_NODE') or shutil.which('node')


@lru_cache(maxsize=1)
def bundle_intact():
    """The bundle is the code that decides credit: it must be exactly the one recorded in the manifest."""
    try:
        want = json.loads(MANIFEST.read_text())['sha256']
        return hashlib.sha256(BUNDLE.read_bytes()).hexdigest() == want
    except (OSError, ValueError, KeyError, TypeError):
        return False


def enabled():
    return os.environ.get('OPENPATH_GRADER', 'on') != 'off' and bool(node_path()) and bundle_intact()


# grader-serve@1: the grader kept running between answers. Starting it afresh for every answer means starting a program
# and reading the whole bundle each time (most of a second on a fast machine, several on a small server). The same bundle is
# started once with --serve and asked one line at a time; the decisions come from exactly the same code. It is stopped after
# a quiet spell (so a sleeping site holds no memory for it) and restarted now and then. Anything unexpected (no reply in
# time, a reply that is not a list of the right length, a dead process) falls back to the one-shot run below, so an answer
# is never lost or decided differently. Geometry working needs its own environment and always uses the one-shot run.
_SERVE = {'child': None, 'count': 0, 'timer': None, 'buffer': b'', 'node': None}
_SERVE_LOCK = threading.Lock()


def _number(name, default, low):
    try:
        return max(low, float(os.environ.get(name, default)))
    except ValueError:
        return float(default)


def serve_enabled():
    return os.name == 'posix' and os.environ.get('OPENPATH_GRADER_SERVE', 'on') != 'off'


def _stop_server():
    child, _SERVE['child'], _SERVE['count'], _SERVE['buffer'] = _SERVE['child'], None, 0, b''
    if _SERVE['timer'] is not None:
        _SERVE['timer'].cancel()
        _SERVE['timer'] = None
    if child is not None:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError, OSError):
            pass
        try:
            child.wait(timeout=2)
        except (subprocess.SubprocessError, OSError):
            pass
        for stream in (child.stdin, child.stdout):
            try:
                stream.close()
            except (OSError, ValueError, AttributeError):
                pass


def stop_server():
    """Stop the kept grader (used when it has been quiet, at exit, and by tests)."""
    with _SERVE_LOCK:
        _stop_server()


def _quiet(child):
    with _SERVE_LOCK:
        if _SERVE['child'] is child:
            _stop_server()


def _ask_server(requests):
    """The kept grader's replies for one list of requests, or None (then the caller runs the grader once, as before)."""
    with _SERVE_LOCK:
        try:
            child, node, fresh = _SERVE['child'], node_path(), False
            # the kept grader belongs to the Node it was started with: a different one (or none) starts afresh
            if child is None or child.poll() is not None or _SERVE['node'] != node:
                _stop_server()
                _SERVE['node'] = node
                child = subprocess.Popen([node, str(BUNDLE), '--serve'], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                         stderr=subprocess.DEVNULL, env={'PATH': os.environ.get('PATH', '')}, start_new_session=True)
                _SERVE['child'] = child
                fresh = True
            if _SERVE['timer'] is not None:
                _SERVE['timer'].cancel()
            child.stdin.write(json.dumps(requests).encode() + b'\n')
            child.stdin.flush()
            # a grader just started has the whole bundle to read first (seconds on a small server); a one-shot run would
            # take as long, so it is given that time instead of being stopped and started again
            # (the longer allowance for a fresh start is not applied yet: OPENPATH_GRADER_START is read only when set, while the
            # cause of the Grade 10/12 browser journey timing out with this branch is being separated)
            allowed = max(_timeout(), _number('OPENPATH_GRADER_START', '0', 0)) if fresh else _timeout()
            fd, deadline, buffer = child.stdout.fileno(), time.monotonic() + allowed, _SERVE['buffer']
            while b'\n' not in buffer:
                left = deadline - time.monotonic()
                if left <= 0 or not select.select([fd], [], [], left)[0]:
                    _stop_server()
                    return None
                chunk = os.read(fd, 65536)
                if not chunk:
                    _stop_server()
                    return None
                buffer += chunk
            line, _, _SERVE['buffer'] = buffer.partition(b'\n')
            out = json.loads(line)
            _SERVE['count'] += 1
            if _SERVE['count'] >= _number('OPENPATH_GRADER_RECYCLE', '300', 1):
                _stop_server()
            else:
                timer = threading.Timer(_number('OPENPATH_GRADER_IDLE', '1200', 1), _quiet, args=(child,))
                timer.daemon = True
                timer.start()
                _SERVE['timer'] = timer
            return out
        except Exception:  # noqa: BLE001 - whatever went wrong with the kept grader, the one-shot run decides instead
            _stop_server()
            return None


atexit.register(stop_server)


_WARMED = {'at': None}


def warm():
    """grader-warm@1: start the kept grader ahead of the first answer, in the background. Called when a learner's work is
    opened, so the seconds it takes to start are spent while they read the lesson and not while their first answer is
    "Saving". It asks the grader nothing (an empty list), decides nothing, and any failure is ignored: the first answer then
    starts it as before.

    It is tried at most once in `OPENPATH_GRADER_WARM_EVERY` seconds (300): where the kept grader cannot stay up (it is
    stopped for every one-shot run, such as geometry working), opening a ledger must not start a program each time."""
    try:
        if not (enabled() and serve_enabled()):
            return False
        child = _SERVE['child']
        if child is not None and child.poll() is None:
            return False
        now = time.monotonic()
        if _WARMED['at'] is not None and now - _WARMED['at'] < _number('OPENPATH_GRADER_WARM_EVERY', '300', 0):
            return False
        _WARMED['at'] = now
        thread = threading.Thread(target=_ask_server, args=([],), daemon=True)
        thread.start()
        return True
    except Exception:  # noqa: BLE001 - warming is a convenience and never gets in the way of a request
        return False


def run(requests, geometry=False):
    """Raw replies for a list of {id, response, working?} (None if the grader could not run)."""
    if not enabled():
        return None
    if not geometry and serve_enabled():
        out = _ask_server(requests)
        if isinstance(out, list) and len(out) == len(requests) and all(isinstance(r, dict) for r in out):
            return out
    # a one-shot run follows: the kept grader is stopped first, so the two are never in memory together
    stop_server()
    try:
        env = {'PATH': os.environ.get('PATH', '')}
        if geometry and geometry_intact():
            env.update(OPENPATH_GEOMETRY_ROOT=str(BUNDLE.parents[3] / 'research/geometry-reasoner'), OPENPATH_GEOMETRY_PYTHON=sys.executable)
        with subprocess.Popen([node_path(), str(BUNDLE)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True, env=env, start_new_session=(os.name == 'posix')) as child:
            try:
                stdout, _ = child.communicate(json.dumps(requests), timeout=_timeout())
            except subprocess.TimeoutExpired:
                # Node may be waiting on Python: terminate the whole private request group.
                if os.name == 'posix':
                    try: os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError: pass
                else:
                    child.kill()
                child.communicate()
                return None
            out = json.loads(stdout) if child.returncode == 0 else None
    except (OSError, ValueError, subprocess.SubprocessError):
        return None
    return out if isinstance(out, list) and len(out) == len(requests) else None


def _reply_ok(reply, question_id, stored_answer):
    return (isinstance(reply, dict) and reply.get('v') == 2 and reply.get('id') == question_id and reply.get('known') is True
            and reply.get('credit') in (True, False, None) and isinstance(reply.get('credit'), (bool, type(None)))
            and reply.get('expected') == stored_answer and reply.get('source') in SOURCES
            and reply.get('verdict') in ('correct', 'incorrect', 'unresolved', 'pending-educator')
            and (reply['verdict'] == 'correct') == (reply['credit'] is True) and (reply['verdict'] == 'incorrect') == (reply['credit'] is False)
            and isinstance(reply.get('reason'), str)
            # grading-decision@1 (stage 7): the reply must carry the decision itself, and it must say the same verdict
            and isinstance(reply.get('decision'), dict) and reply['decision'].get('schema') == 'grading-decision@1'
            and reply['decision'].get('verdict') == reply['verdict'] and reply['decision'].get('reason') == reply['reason'])


def grader_decision(question_id, response, stored_answer, working=None, geometry=False):
    """{'credit': True|False|None, 'source': str, 'reason': str, 'verdict': str} from the trusted grader, or None if it could not decide here
    (not runnable, failed, or its stored answer differs from this server's). credit None = undecided (never wrong)."""
    if not isinstance(question_id, str) or not QUESTION_ID.match(question_id) or not isinstance(response, str):
        return None
    w = [x for x in (working or []) if isinstance(x, str)][:100]  # the grader itself keeps 8 lines, or 100 for calculus
    out = run([{'id': question_id, 'response': response, 'working': w}], geometry=True) if geometry else run([{'id': question_id, 'response': response, 'working': w}])
    if out is None or not _reply_ok(out[0], question_id, stored_answer):
        return None
    d = {k: out[0][k] for k in ('credit', 'source', 'reason', 'verdict')}
    if isinstance(out[0].get('decision'), dict):
        d['decision'] = out[0]['decision']
    return d


def bundle_sha256():
    """the sha256 of the grader bundle (as recorded in its manifest), or None"""
    try:
        return json.loads(MANIFEST.read_text())['sha256']
    except (OSError, ValueError, KeyError, TypeError):
        return None


def kernel_decision(question_id, response, stored_answer, working=None, geometry=False):
    """Compatibility name (assessment@1 callers): the trusted grader's decision, now for every known question."""
    return grader_decision(question_id, response, stored_answer, working, geometry=geometry)


def geometry_intact():
    """Pin executable Python authority beside the bundled TS adapter; drift fails to neutral working."""
    try:
        inputs = json.loads(MANIFEST.read_text())['geometryInputs']
        root = BUNDLE.parents[3]
        expected = {str(p.relative_to(root)) for p in (root / 'research/geometry-reasoner/geometry_reasoner').glob('*.py')}
        return bool(expected) and set(inputs) == expected and all(hashlib.sha256((root / p).read_bytes()).hexdigest() == h for p, h in inputs.items())
    except (OSError, ValueError, KeyError, TypeError):
        return False
