#!/usr/bin/env python3
"""Seeded, deterministic generator for the held-out adversarial corpus (family H). Seed 20261027.
Usage: python3 generate_adversarial_set.py   (writes adversarial.json, dropped.json, FROZEN.md next to this file)"""
import hashlib, json, os, random, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True
import adv_oracle as O
import adv_templates1 as T1
import adv_templates2 as T2

SEED = 20261027
QUOTA = {'domain-change': 41, 'extraneous-root': 41, 'cancellation': 41, 'multiplication-by-zero': 41,
         'invalid-division': 41, 'rational-expressions': 41, 'ambiguous-notation': 44, 'alternative-paths': 41,
         'correct-controls': 41, 'unsupported': 41}
CODE = {'domain-change': 'DC', 'extraneous-root': 'EX', 'cancellation': 'CA', 'multiplication-by-zero': 'MZ',
        'invalid-division': 'ID', 'rational-expressions': 'RE', 'ambiguous-notation': 'AM', 'alternative-paths': 'AP',
        'correct-controls': 'CC', 'unsupported': 'UN'}
STYLES = ['explicit', 'implicit', 'spaced', 'unicode']


def implicit(s):
    out = []
    for i, ch in enumerate(s):
        if ch == '*' and 0 < i < len(s) - 1:
            L, R = s[i - 1], s[i + 1]
            if ((L.isdigit() or L == ')') and R in 'x(') or (L == 'x' and R == '(') or (L == ')' and R.isdigit()):
                continue
        out.append(ch)
    return ''.join(out)


def spaced(s):
    if '==' in s:
        return s
    return re.sub(r'\s+', ' ', re.sub(r'\s*([+\-*/=])\s*', r' \1 ', s)).strip()


def unicode_(s):
    s = spaced(implicit(s))
    return s.replace('-', '−').replace('*', '×').replace('/', '÷').replace('^2', '²').replace('^3', '³')


def render(line, style):
    if style == 'explicit':
        return line
    if style == 'implicit':
        return implicit(line)
    if style == 'spaced':
        return spaced(implicit(line))
    return unicode_(line)


def result_for(problem, lines, mode):
    r = O.analyze(problem, lines, mode)
    return r


def main():
    rng = random.Random(SEED)
    mods = {}
    for m in (T1, T2):
        mods.update({k: v for k, v in vars(m).items() if callable(v)})
    tasks, dropped, seen = [], [], set()
    stats = {}
    for cat in QUOTA:
        names = T2.CATS[cat]
        got, tries = 0, 0
        n_diff = n_agree = 0
        while got < QUOTA[cat] and tries < 20000:
            tries += 1
            name = names[rng.randrange(len(names))]
            t = mods[name](rng)
            if t is None:
                continue
            if cat == 'correct-controls' and t['intent'] != 'valid-complete':
                continue
            am = cat == 'ambiguous-notation'
            style = rng.choice(['explicit', 'spaced']) if am else rng.choice(STYLES)
            lines = [t['lines'][i] if am is False else t['lines'][i] for i in range(len(t['lines']))]
            if cat == 'correct-controls' and t['intent'] == 'valid-complete' and len(t['lines']) >= 2 \
                    and rng.random() < 0.12:
                t = dict(t, lines=t['lines'][:-1], intent='valid-incomplete', tag=t['tag'] + '_stop_early')
                lines = list(t['lines'])
            rendered = [spaced(l) if (am and style == 'spaced') else render(l, style) for l in lines]
            key = (t['problem'], tuple(lines))
            if key in seen:
                continue
            rec = {'category': cat, 'tag': t['tag'], 'problem': t['problem'], 'lines': rendered}
            try:
                rl = result_for(t['problem'], rendered, 'lr')
                rt = result_for(t['problem'], rendered, 'tight')
                tr = O.truth(t['problem'])
            except (O.Unsupported, O.Disagree) as e:
                dropped.append(dict(rec, reason=type(e).__name__, detail=str(e)))
                continue
            except Exception as e:  # any oracle crash is also a drop, logged
                dropped.append(dict(rec, reason='oracle-error', detail=repr(e)))
                continue
            agree = rl == rt
            if am:
                if agree and n_agree >= 14 or (not agree) and n_diff >= 30:
                    continue
            elif not agree:
                dropped.append(dict(rec, reason='readings-disagree-outside-ambiguous', detail=''))
                continue
            if t['intent'] and rl['status'] != t['intent']:
                dropped.append(dict(rec, reason='intent-mismatch', detail='intended %s got %s' % (t['intent'], rl['status'])))
                continue
            seen.add(key)
            if am:
                if agree:
                    exp = dict(rl, readings_agree=True)
                    n_agree += 1
                else:
                    exp = {'status': 'ambiguous', 'first_invalid': None, 'invalid_at': None, 'error_class': 'ambiguous',
                           'final_verdict': None, 'step_flags': [], 'step_labels': None,
                           'readings': {'lr': rl, 'tight': rt}}
                    n_diff += 1
            else:
                exp = rl
            tasks.append({'id': 'H-%s-%03d' % (CODE[cat], got + 1), 'family': 'H', 'category': cat, 'problem': t['problem'],
                          'lines': rendered, 'expected': exp, 'truth': tr,
                          'notes': 'template=%s; style=%s' % (t['tag'], style)})
            got += 1
        stats[cat] = got
    payload = json.dumps({'tasks': tasks}, indent=1, ensure_ascii=False) + '\n'
    with open(os.path.join(HERE, 'adversarial.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(payload)
    with open(os.path.join(HERE, 'dropped.json'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps({'count': len(dropped), 'dropped': dropped}, indent=1, ensure_ascii=False) + '\n')
    sha = hashlib.sha256(payload.encode('utf-8')).hexdigest()
    cat_c, st_c = {}, {}
    for t in tasks:
        cat_c[t['category']] = cat_c.get(t['category'], 0) + 1
        s = t['expected']['status']
        st_c[s] = st_c.get(s, 0) + 1
    with open(os.path.join(HERE, 'FROZEN.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# FROZEN: adversarial.json\n\n- SHA-256: `%s`\n- seed: %d\n- SymPy: %s\n- tasks: %d\n- dropped (logged in dropped.json): %d\n'
                '- per category: %s\n- per status: %s\n\nDo not edit adversarial.json; regenerate only with generate_adversarial_set.py.\n'
                % (sha, SEED, O.sp.__version__, len(tasks), len(dropped), json.dumps(cat_c, sort_keys=True),
                   json.dumps(st_c, sort_keys=True)))
    print(sha, len(tasks), len(dropped), cat_c, st_c)


if __name__ == '__main__':
    main()
