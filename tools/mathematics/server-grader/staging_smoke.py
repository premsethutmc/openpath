"""Staging smoke test for the shadow deployment (release step: staging verification). Runs against a running deployment through its front
door (the preview password gate and /api/), with a fresh synthetic account. It never touches an existing learner.

Covers: answer submission; authoritative grading (correct / incorrect / unresolved, policy and decidedBy); unresolved answers (invalid input,
quarantined question) keep the response and give no credit; mastery replay (the app's own replay of the saved records); shadow comparison
(the unified decision stored beside the authoritative one; compare_shadow is run separately against the staging database); and, with
--phase after-rollback, that the same records replay identically after the deployment is restarted in legacy mode.

Usage (from the repo root):
  python tools/mathematics/server-grader/staging_smoke.py --base http://127.0.0.1:10000 --password <gate> --phase shadow --state out.json
  ...restart the deployment with OPENPATH_GRADING=legacy...
  python tools/mathematics/server-grader/staging_smoke.py --base ... --password ... --phase after-rollback --state out.json
"""
import argparse
import http.cookiejar
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G4 = json.load(open(os.path.join(ROOT, 'content/learning/curricula/openpath-sample-mathematics-grade-4.v1.0.0.json')))
REG = json.load(open(os.path.join(ROOT, 'content/learning/question-status.v1.json')))
NOW = '2026-10-29T12:00:00Z'
MEAN = ('gen:mean4:1,2,3,6', 'MATH.statistics.averages-intro')   # the mean of 1, 2, 3 and 6 is 3
RECT = ('gen:rect:3,4', None)                                   # area of a 3 by 4 rectangle: "24/2" is equal; the earlier policy cannot read it

checks = []


def check(name, ok, detail=''):
    checks.append({'check': name, 'ok': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + name + (f' — {detail}' if detail and not ok else ''))


class Client:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar), NoRedirect)

    def cookie(self, name):
        return next((c.value for c in self.jar if c.name == name), '')

    def req(self, method, path, body=None, form=False):
        h = {'Origin': self.base, 'Referer': self.base + '/'}
        data = None
        if body is not None:
            data = urllib.parse.urlencode(body).encode() if form else json.dumps(body).encode()
            h['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
        if self.cookie('csrftoken'):
            h['X-CSRFToken'] = self.cookie('csrftoken')
        r = urllib.request.Request(self.base + path, data=data, method=method, headers=h)
        try:
            with self.op.open(r, timeout=60) as resp:
                raw = resp.read()
                return resp.status, (json.loads(raw) if raw and resp.headers.get_content_type() == 'application/json' else raw.decode(errors='replace'))
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, raw.decode(errors='replace')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


GEN = json.load(open(os.path.join(ROOT, 'content/learning/generated.v1.json')))['families']


def competency(qid):
    return GEN[qid.split(':')[1]]['competency']


def replay(got):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(got, f)
    out = subprocess.run(['bun', 'tools/mathematics/server-grader/staging-replay.ts', f.name, NOW], cwd=ROOT, capture_output=True, text=True)
    os.unlink(f.name)
    if out.returncode:
        raise SystemExit('app replay failed: ' + out.stderr[-2000:])
    return json.loads(out.stdout.strip().splitlines()[-1])


def signed_in(c, pw):
    s, _ = c.req('GET', '/healthz')
    check('healthz answers 200', s == 200, s)
    s, _ = c.req('POST', '/login', {'password': pw, 'next': '/'}, form=True)
    check('preview gate accepts the password', s == 303, s)
    c.req('GET', '/api/account/')


def phase_shadow(c, state):
    email = f'staging-smoke-{uuid.uuid4().hex[:8]}@example.org'
    s, b = c.req('POST', '/api/account/register/', {'email': email, 'password': 'staging-smoke-passphrase', 'consent': True})
    check('register a synthetic parent', s == 201, (s, b))
    c.req('GET', '/api/account/')
    s, b = c.req('POST', '/api/pupils/', {'display_name': 'Staging smoke', 'consent': True})
    check('create a synthetic pupil', s == 201, (s, b))
    pid = b['id']
    seq = 0

    def save(record, **extra):
        nonlocal seq
        ev = {'kind': 'learning_record', 'id': extra.pop('id', f'smoke-{seq}'), 'at': '2000-01-01T00:00:00Z', 'learnerId': pid,
              'sessionId': f'learn:{pid}:visit', 'record': record, **extra}
        s, b = c.req('POST', f'/api/pupils/{pid}/events/', {'subject': 'mathematics', 'seq': seq, 'event': ev})
        if s == 201:
            seq += 1
        return s, b

    s, b = save('enrol', grade=4, academicYear='2026-27', curriculum={'id': G4['id'], 'version': G4['version'], 'hash': G4['hash']})
    check('enrol', s == 201, (s, b))
    held = next(e['id'] for e in REG['entries'] if e['reason'] == 'ambiguous-question')
    rect_comp, held_comp = competency(RECT[0]), competency(held)
    plan = [('c1', MEAN[0], MEAN[1], '3'), ('w1', MEAN[0], MEAN[1], '4'), ('u1', MEAN[0], MEAN[1], 'three-ish'), ('d1', RECT[0], rect_comp, '24/2'),
            ('q1', held, held_comp, '1'), ('c2', 'gen:mean4:2,4,6,8', MEAN[1], '5')]
    for rid, qid, comp, resp in plan:
        s, b = save('attempt', id=rid, questionId=qid, response=resp, activity='diagnostic', hints=0, solution=False, competency=comp)
        check(f'submit {rid} ({qid} "{resp}") is saved', s == 201, (s, b))
    s, b = save('attempt', id='c1', questionId=MEAN[0], response='3', activity='diagnostic', hints=0, solution=False, competency=MEAN[1])
    check('a repeated attempt id is refused (no second authoritative outcome)', s == 400, (s, b))
    s, got = c.req('GET', f'/api/pupils/{pid}/events/?subject=mathematics')
    check('records load', s == 200, s)
    check('server reports gradingMode shadow', got.get('gradingMode') == 'shadow', got.get('gradingMode'))
    by = {e['id']: e for e in got['events'] if e.get('record') == 'attempt'}
    want = {'c1': 'correct', 'w1': 'incorrect', 'u1': 'unresolved', 'q1': 'unresolved', 'c2': 'correct'}
    for rid, v in want.items():
        d = by[rid]['decision']
        check(f'{rid}: authoritative decision {v}, decided by the server under the earlier policy',
              (d['verdict'], d['decidedBy'], d['policy']) == (v, 'server', 'legacy-policy@0') or (rid == 'q1' and d['verdict'] == v and d['decidedBy'] == 'server'), d)
    check('u1: unreadable answer kept verbatim', by['u1']['response'] == 'three-ish')
    check('q1: quarantined question gets no grade (unresolved.quarantined), answer kept',
          by['q1']['decision'].get('reason') == 'unresolved.quarantined' and by['q1']['response'] == '1', by['q1']['decision'])
    for rid in ('c1', 'w1', 'u1', 'd1', 'c2'):
        sd = by[rid].get('shadowDecision') or {}
        check(f'{rid}: unified decision stored beside it as shadow', (sd.get('decidedBy'), sd.get('policy')) == ('shadow', 'grading-policy@1'), sd)
    d1 = by['d1']
    check('d1: the policies disagree and the earlier one stays authoritative',
          d1['decision']['verdict'] != 'correct' and d1['shadowDecision']['verdict'] == 'correct', (d1['decision'], d1['shadowDecision']))
    r = replay(got)
    check('app replay runs in shadow mode', r['mode'] == 'shadow', r['mode'])
    check('app replay credits exactly the authoritative correct answers', r['attempts'] == {'c1': True, 'w1': False, 'c2': True}, r['attempts'])
    check('app replay: unresolved answers (u1; d1, which the earlier policy cannot read; q1, quarantined) are kept apart, never attempts (P1)',
          r['unresolved'] == ['d1', 'q1', 'u1'] and not {'u1', 'd1', 'q1'} & set(r['attempts']), r)
    check('app replay derives a skill status for the attempted skill', bool(r['skills']), r['skills'])
    state.update({'base': c.base, 'pupil': pid, 'email': email, 'shadowReplay': r, 'shadowEvents': got['events'], 'decisions': got.get('decisions')})


def phase_after_rollback(c, state):
    s, b = c.req('POST', '/api/account/login/', {'email': state['email'], 'password': 'staging-smoke-passphrase'})
    check('sign in to the same synthetic account', s == 200, (s, b))
    c.req('GET', '/api/account/')
    pid = state['pupil']
    s, got = c.req('GET', f'/api/pupils/{pid}/events/?subject=mathematics')
    check('server reports gradingMode legacy after rollback', got.get('gradingMode') == 'legacy', got.get('gradingMode'))
    check('saved events are byte-identical after rollback', got['events'] == state['shadowEvents'])
    r = replay(got)
    check('mastery replay after rollback: same credit per attempt', r['attempts'] == state['shadowReplay']['attempts'], r['attempts'])
    check('mastery replay after rollback: same unresolved answers', r['unresolved'] == state['shadowReplay']['unresolved'], r['unresolved'])
    check('mastery replay after rollback: same skill status', r['skills'] == state['shadowReplay']['skills'], (r['skills'], state['shadowReplay']['skills']))
    seq = len(got['events'])
    ev = {'kind': 'learning_record', 'id': 'l1', 'at': '2000-01-01T00:00:00Z', 'learnerId': pid, 'sessionId': f'learn:{pid}:visit', 'record': 'attempt',
          'questionId': MEAN[0], 'response': '3', 'activity': 'diagnostic', 'hints': 0, 'solution': False, 'competency': MEAN[1]}
    s, b = c.req('POST', f'/api/pupils/{pid}/events/', {'subject': 'mathematics', 'seq': seq, 'event': ev})
    check('legacy mode still grades new answers', s == 201, (s, b))
    s, got = c.req('GET', f'/api/pupils/{pid}/events/?subject=mathematics')
    l1 = next(e for e in got['events'] if e['id'] == 'l1')
    check('legacy mode: earlier policy decides, no shadow evaluation', l1['decision']['policy'] == 'legacy-policy@0' and 'shadowDecision' not in l1, l1.get('decision'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True)
    ap.add_argument('--password', required=True)
    ap.add_argument('--phase', choices=['shadow', 'after-rollback'], required=True)
    ap.add_argument('--state', required=True)
    a = ap.parse_args()
    state = json.load(open(a.state)) if a.phase == 'after-rollback' else {}
    c = Client(a.base)
    signed_in(c, a.password)
    (phase_shadow if a.phase == 'shadow' else phase_after_rollback)(c, state)
    state.setdefault('results', {})[a.phase] = checks
    json.dump(state, open(a.state, 'w'), indent=1)
    failed = [x for x in checks if not x['ok']]
    print(f"{len(checks) - len(failed)}/{len(checks)} checks passed ({a.phase})")
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
