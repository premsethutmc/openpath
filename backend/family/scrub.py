"""Deleting a parent's own material for real, on the server: the same rules as the app (frontend/src/english/logic/scrub.ts).

Retention policy, by kind of data:
  1. Source content the parent supplied (a word list's name and words): removed. Every saved version of the list is
     emptied in place: {id, name: "", words: []} and "scrubbed": true.
  2. Historical learning evidence (practice sessions and answers on that list): kept, without the content. Each word id
     becomes "removed-1", "removed-2", ... in order of first appearance; the spelling and the typed answer become "";
     right/wrong, times, plays and review flags stay. Events whose source is anything else are never touched.
  3. Copies outside the current record (an exported backup file, database backups, write-ahead logs): not reachable
     here. They expire on their own schedule; see docs/product/MY_WORDS.md, "Deleting a list".

`fixtures/scrub-fixture.json` holds one record before and after; both implementations are tested against it.
Scrubbing is idempotent. Events keep their position (seq), id and time, so other devices' appends stay in order.
"""

from __future__ import annotations

import re

SOURCES = {"list"}
_REMOVED = re.compile(r"^removed-\d+$")


def _same(source, src) -> bool:
    return isinstance(source, dict) and source.get("type") == src["type"] and source.get("id") == src["id"]


def scrub_events(events: list[dict], src: dict) -> tuple[list[dict], int]:
    """The record with src's content removed, and how many events changed."""
    alias: dict[str, str] = {}

    def name(word_id):
        word_id = str(word_id)
        if word_id not in alias:
            alias[word_id] = word_id if _REMOVED.match(word_id) else f"removed-{len(alias) + 1}"
        return alias[word_id]

    out, changed = [], 0
    for e in events:
        kind, nxt = e.get("kind"), e
        if kind == "word_list" and src["type"] == "list" and isinstance(e.get("list"), dict) and e["list"].get("id") == src["id"]:
            nxt = {**e, "list": {"id": e["list"]["id"], "name": "", "words": []}, "scrubbed": True}
        elif kind == "spell_session" and _same(e.get("source"), src) and isinstance(e.get("words"), list):
            nxt = {**e, "words": [name(w) for w in e["words"]], "scrubbed": True}
        elif kind == "spell_answer" and _same(e.get("source"), src) and isinstance(e.get("word"), dict):
            nxt = {**e, "word": {**e["word"], "id": name(e["word"].get("id")), "text": ""}, "response": "", "scrubbed": True}
        if nxt != e:
            changed += 1
            out.append(nxt)
        else:
            out.append(e)
    return out, changed


def deleted_sources(bodies) -> set[tuple[str, str]]:
    """(type, id) of every list deleted in this record."""
    return {("list", b.get("list")) for b in bodies if b.get("kind") == "word_list_delete"}


def revives_deleted(event: dict, deleted: set[tuple[str, str]]) -> bool:
    """Would this new event put a deleted list's content back (a stale device practising or saving it)?"""
    kind = event.get("kind")
    if kind == "word_list" and isinstance(event.get("list"), dict):
        return ("list", event["list"].get("id")) in deleted and not event.get("scrubbed")
    source = event.get("source")
    if kind in ("spell_session", "spell_answer") and isinstance(source, dict):
        return (source.get("type"), source.get("id")) in deleted and not event.get("scrubbed")
    return False
