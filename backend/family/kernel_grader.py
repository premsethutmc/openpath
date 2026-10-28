"""The server's use of the trusted exact grader (the TypeScript assessment package, bundled to grader/grader.mjs and run by Node).

The browser's verdict is never an input: the grader is given a question id, the student's response and permitted working, and
rebuilds the question's contract from the generator's own definition. This module answers only for questions the grader reports
as `verified`, and only when the grader's expected answer is exactly the answer this server stores for the question; in every
other case it returns None and the caller keeps its stored-answer comparison and labels it `legacy`.

Standard library only (no Django), so it can be tested on its own.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent / 'grader' / 'grader.mjs'
MANIFEST = BUNDLE.with_name('grader.manifest.json')
QUESTION_ID = re.compile(r'^gen:[a-z0-9]+:-?\d+(?:,-?\d+)*(?::mc|:w)?$')


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


def run(requests):
    """Raw replies for a list of {id, response, working?} (None if the grader could not run)."""
    if not enabled():
        return None
    try:
        done = subprocess.run([node_path(), str(BUNDLE)], input=json.dumps(requests), capture_output=True, text=True, timeout=_timeout(), env={'PATH': os.environ.get('PATH', '')}, check=False)
        out = json.loads(done.stdout) if done.returncode == 0 else None
    except (OSError, ValueError, subprocess.SubprocessError):
        return None
    return out if isinstance(out, list) and len(out) == len(requests) else None


def _reply_ok(reply, question_id, stored_answer):
    return (isinstance(reply, dict) and reply.get('v') == 1 and reply.get('id') == question_id and reply.get('verification') == 'verified'
            and reply.get('credit') in (True, False, None) and isinstance(reply.get('credit'), (bool, type(None)))
            and reply.get('expected') == stored_answer and isinstance(reply.get('capability'), str))


def kernel_decision(question_id, response, stored_answer, working=None):
    """{'credit': True|False|None, 'capability': str} when the trusted grader verified this question and decided it; otherwise None.
    credit None = the grader could not establish the answer (unreadable or unsupported form): undecided, never wrong."""
    if not isinstance(question_id, str) or not QUESTION_ID.match(question_id) or not isinstance(response, str):
        return None
    w = [x for x in (working or []) if isinstance(x, str)][:8]
    out = run([{'id': question_id, 'response': response, 'working': w}])
    if out is None or not _reply_ok(out[0], question_id, stored_answer):
        return None
    return {'credit': out[0]['credit'], 'capability': out[0]['capability']}
