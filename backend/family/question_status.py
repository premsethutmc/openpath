"""question-status@1 on the server: the quarantine registry written by packages/learning/scripts/question-status.ts.

A quarantined question receives no authoritative grade: an answer to it is stored, marked unresolved (source "held"), never
credited and never counted as an attempt or as mastery evidence. Its definition and every historical record are kept."""
import json
from functools import lru_cache

from django.conf import settings
from pathlib import Path


@lru_cache(maxsize=1)
def _registry():
    data = json.loads((Path(settings.BASE_DIR).parent / 'content/learning/question-status.v1.json').read_text())
    if data.get('schema') != 'question-status@1':
        raise RuntimeError('question-status registry has an unknown schema')
    return {e['id']: e for e in data['entries']}


def quarantined(question_id):
    return isinstance(question_id, str) and question_id in _registry()


def entry(question_id):
    return _registry().get(question_id)
