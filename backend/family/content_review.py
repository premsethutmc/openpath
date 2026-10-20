"""Educator review of learning content on the server (review@2, packages/learning/src/review.ts).

Reviewable items and their current content hash come from the generated content files: a FAMILY's fingerprint
(content/learning/family-specs.v1.json) and a MODULE's content hash (modules.v1.json and library.v1.json, hashed as the
app hashes them). Decisions are append-only (ContentDecision). The state of an item is replayed from the decisions made
on its CURRENT hash only: when content changes, earlier decisions stay in the history but no longer apply, so a
changed family or module must be reviewed again.

Roles (ContentReviewer, granted by `manage.py content_reviewer`): an educator approves, rejects or requests changes; a
release manager releases approved content; any reviewer may submit a draft. Learners' apps read the registry to know
which questions are released (only released content can contribute to verified mastery).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.response import Response

from .learning import hash_of
from .models import ContentDecision, ContentReviewer
from .views import AccountBase

ROOT = Path(settings.BASE_DIR).parent / 'content/learning'
NEXT = {'draft': {'submit'}, 'changes_requested': {'submit'}, 'submitted': {'approve', 'request_changes', 'reject'}, 'approved': {'release'}, 'rejected': set(), 'released': set()}
STATE_AFTER = {'submit': 'submitted', 'approve': 'approved', 'request_changes': 'changes_requested', 'reject': 'rejected', 'release': 'released'}
ROLE_FOR = {'submit': {'educator', 'release_manager'}, 'approve': {'educator'}, 'request_changes': {'educator'}, 'reject': {'educator'}, 'release': {'release_manager'}}


def _load(name):
    return json.loads((ROOT / name).read_text())


@lru_cache
def items():
    """Every reviewable item now: {item: {hash, version, kind, competency, families, title, author}}: question families,
    modules, and curriculum releases (their mappings)."""
    out = {}
    for f in _load('family-specs.v1.json')['families']:
        out[f"family:{f['id']}"] = {'hash': f['fingerprint'], 'version': f['version'], 'kind': 'family', 'competency': f['competency'], 'families': [], 'title': f['title'], 'author': 'OpenPath engineering (generator code, written with AI assistance)', 'valid': f['validation']['ok']}
    for r in _load('curricula/index.json')['releases']:
        out[f"curriculum:{r['id']}@{r['version']}"] = {'hash': r['hash'], 'version': r['version'], 'kind': 'curriculum', 'competency': '', 'families': [], 'title': r['title'], 'author': 'OpenPath sample review (not an educator)', 'valid': True}
    lib = _load('library.v1.json')
    pools = lib.get('authoredPools', {})
    mods = []
    for m in [*_load('modules.v1.json')['modules'], *_load('written-modules.v1.json')['modules']]:
        a = pools.get(m['competency'])
        # as the app builds it (content.ts): the main family as pool, every family as pools (pools@1)
        mods.append(({**m, 'pool': {'family': a['family'], 'version': a['version']}, **({'pools': a['pools']} if a.get('pools') else {})} if a else m, 'authored'))
    authored = {m['competency'] for m, _ in mods}
    for m in lib['modules']:
        if m['competency'] in authored:
            continue  # an authored module stands in for the synthesised one (content.ts)
        mods.append(({k: v for k, v in m.items() if k != 'provenance'}, m.get('provenance', {}).get('author', 'OpenPath')))
    # written@2: a module answered automatically also offers the competency's written tasks it does not ask itself
    tasks = _load('written.v1.json')['tasks']
    for i, (m, author) in enumerate(mods):
        if not m.get('pool'):
            continue
        own = {*m['diagnostics'], *m['practice'], *m['transfer'], *m['retention']}
        w = [t['id'] for t in tasks if t['competency'] == m['competency'] and t['id'] not in own]
        if w:
            mods[i] = ({**m, 'written': w}, author)
    for m, author in mods:
        listed = [q for q in [*m['diagnostics'], *m['practice'], *m['transfer'], *m['retention'], *m['probes'], *[x for s in m['strategies'] for x in (s['guided'], s['check'])]] if q.startswith('gen:')]
        fams = sorted({*([m['pool']['family']] if m.get('pool') else []), *(p['family'] for p in m.get('pools', [])), *(q.split(':')[1] for q in listed)})
        out[f"module:{m['competency']}"] = {'hash': hash_of(m), 'version': '', 'kind': 'module', 'competency': m['competency'], 'families': fams, 'title': m['title'], 'author': author if author != 'authored' else 'OpenPath (written with AI assistance; not educator-reviewed)', 'valid': True}
    return out


def replay(item, current_hash, decisions):
    """The state of an item from the decisions on its current hash (and when it was released)."""
    state, released_at = 'draft', None
    for d in decisions:
        if d.content_hash != current_hash:
            continue
        if d.decision in NEXT[state]:
            state = STATE_AFTER[d.decision]
            if state == 'released':
                released_at = d.at
    return state, released_at


def registry(show_reviewers=True):
    """The registry in the app's shape (review.ts Registry): one entry per current item, with its full history.
    A module stays released only while every family it uses is released (a changed family suspends it). Reviewer
    names are shown to reviewers only; anyone else sees the role."""
    by_item = {}
    for d in ContentDecision.objects.select_related(None).all():
        by_item.setdefault(d.item, []).append(d)
    entries = []
    for item, meta in items().items():
        ds = by_item.get(item, [])
        state, released_at = replay(item, meta['hash'], ds)
        entries.append({
            'item': item, 'kind': meta['kind'], 'competency': meta['competency'], **({'family': item[7:]} if meta['kind'] == 'family' else {}),
            'version': meta['version'], 'origin': meta['kind'] if meta['kind'] != 'module' else 'synthesised', 'author': meta['author'],
            'contentHash': meta['hash'], 'state': state, **({'releasedAt': released_at.isoformat().replace('+00:00', 'Z')} if released_at else {}),
            'history': [{'state': STATE_AFTER[d.decision], 'by': d.reviewer_label if show_reviewers else {'release_manager': 'a release manager'}.get(d.role, f'an {d.role}'), 'role': {'release_manager': 'release-manager'}.get(d.role, d.role), 'at': d.at.isoformat().replace('+00:00', 'Z'), 'contentHash': d.content_hash, 'note': d.note, 'current': d.content_hash == meta['hash']} for d in ds],
        })
    fam_state = {e['family']: e['state'] for e in entries if e['kind'] == 'family'}
    for e in entries:
        meta = items()[e['item']]
        if e['kind'] == 'module' and e['state'] == 'released' and any(fam_state.get(f) != 'released' for f in meta['families']):
            e['state'], e['suspended'] = 'approved', 'A question family it uses is no longer released (it changed or was withdrawn): release it again after review.'
            e.pop('releasedAt', None)
    return {'schema': 'content-review@2', 'note': 'The server registry (backend/family/content_review.py).', 'entries': entries}


def roles_of(user):
    return sorted(r.role for r in ContentReviewer.objects.filter(user=user, revoked_at__isnull=True))


class ContentReviewView(AccountBase):
    """GET: the registry (any signed-in account: learners' apps need to know what is released) and your roles."""

    def get(self, request):
        roles = roles_of(request.user)
        return Response({'roles': roles, 'registry': registry(show_reviewers=bool(roles))})


class ContentDecisionView(AccountBase):
    """POST {item, decision, contentHash, note}: one decision by a reviewer with the role it needs, on the current
    version of the item only."""

    def post(self, request):
        body = request.data if isinstance(request.data, dict) else {}
        item, decision, h, note = body.get('item'), body.get('decision'), body.get('contentHash'), str(body.get('note') or '').strip()
        meta = items().get(item) if isinstance(item, str) else None
        if not meta:
            return Response({'detail': 'Unknown item.'}, status=status.HTTP_400_BAD_REQUEST)
        if decision not in STATE_AFTER:
            return Response({'detail': 'Unknown decision.'}, status=status.HTTP_400_BAD_REQUEST)
        roles = set(roles_of(request.user))
        role = next((r for r in ('educator', 'release_manager') if r in roles and r in ROLE_FOR[decision]), None)
        if role is None:
            return Response({'detail': 'You do not have the role this decision needs (educator to approve, reject or request changes; release manager to release).'}, status=status.HTTP_403_FORBIDDEN)
        if h != meta['hash']:
            return Response({'detail': 'This is not the current version of the item: reload and review the current one.'}, status=status.HTTP_409_CONFLICT)
        if decision in ('approve', 'request_changes', 'reject') and not note:
            return Response({'detail': 'A review needs a note: what was checked, or what to change.'}, status=status.HTTP_400_BAD_REQUEST)
        if decision == 'submit' and not meta['valid']:
            return Response({'detail': 'This item does not pass its validation, so it cannot be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            ds = list(ContentDecision.objects.select_for_update().filter(item=item))
            state, _ = replay(item, meta['hash'], ds)
            if decision not in NEXT[state]:
                return Response({'detail': f'The item is {state.replace("_", " ")}: it cannot be {STATE_AFTER[decision].replace("_", " ")} now.'}, status=status.HTTP_409_CONFLICT)
            # four eyes: the person who releases is not the person who approved this version
            if decision == 'release':
                approver = next((x.reviewer_id for x in reversed(ds) if x.content_hash == h and x.decision == 'approve'), None)
                if approver == request.user.id:
                    return Response({'detail': 'You approved this version: another release manager must release it.'}, status=status.HTTP_409_CONFLICT)
            if decision == 'release' and meta['kind'] == 'module':
                reg = {e['item']: e for e in registry()['entries']}
                missing = [f for f in meta['families'] if reg.get(f'family:{f}', {}).get('state') != 'released']
                if missing:
                    return Response({'detail': f'Release these question families first: {", ".join(missing)}.'}, status=status.HTTP_409_CONFLICT)
            label = (request.user.get_full_name() or request.user.email or request.user.username)[:160]
            d = ContentDecision.objects.create(item=item, content_hash=h, version=meta['version'], decision=decision, reviewer=request.user, reviewer_label=label, role=role, note=note[:2000])
        return Response({'decision': d.id, 'state': STATE_AFTER[decision]}, status=status.HTTP_201_CREATED)
