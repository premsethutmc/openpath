"""The server's use of the trusted grader (the TypeScript grading package, bundled to grader/grader.mjs and run by Node).

The browser's verdict is never an input: the grader is given a question id, the student's response and permitted working, rebuilds the
question's contract from its own definition and runs THE grading decision (grading/decision.ts), the same code the app runs. It answers
for every known question (generated or authored). This module accepts a reply only when the grader's stored answer is exactly the answer
this server stores for the question (parity); otherwise, or when the grader cannot run, it returns None (the caller's failure path).

Standard library only (no Django), so it can be tested on its own.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import signal
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


def run(requests, geometry=False):
    """Raw replies for a list of {id, response, working?} (None if the grader could not run)."""
    if not enabled():
        return None
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
    w = [x for x in (working or []) if isinstance(x, str)][:8]
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
