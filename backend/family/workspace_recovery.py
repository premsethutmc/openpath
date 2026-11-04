"""Persisted, subject-neutral recovery policy; content comes from the problem adapter.

An error is an observation, never a diagnosed misconception or mastery decision.
"""
from rest_framework.exceptions import ValidationError


def record_error(previous, entry):
    state = {**previous, 'errors': dict(previous.get('errors', {}))}
    state['errors'][entry] = state['errors'].get(entry, 0) + 1
    state.update(entry=entry, open=True, message=None, level=0)
    return state


def respond(previous, action, hints):
    if action not in ('retry', 'hint') or not previous.get('entry'):
        raise ValidationError({'recovery': 'Choose a number to retry first.'})
    state = dict(previous)
    if action == 'retry':
        state.update(open=False, message=None)
    else:
        # Repeated attempts unlock deeper support; the learner chooses when to see it.
        limit = min(3, max(1, state.get('errors', {}).get(state['entry'], 1)))
        level = min(limit, state.get('level', 0) + 1)
        state.update(level=level, open=True, message=hints[level - 1])
    return state


def division_hints(role):
    return {
        'quotient': [
            'How many whole groups of the divisor fit in the number you are working with?',
            'For a different example, 8 ÷ 3: two groups make 6; three groups make 9, which is too many.',
            'Try counting equal groups. Stop before the total exceeds your current number, then enter how many groups you counted.',
        ],
        'product': [
            'Multiply your quotient digit by the divisor. You can use equal groups.',
            'For example, with divisor 4 and quotient digit 2: two groups of 4 make 8.',
            'Use your chosen quotient digit as the number of groups. Add the divisor once for each group, then write the total in this row.',
        ],
        'difference': [
            'Subtract the multiplication row from the number above it. Check each place value.',
            'For example, 14 − 12 = 2. There are two left after taking twelve away.',
            'Start at the ones column and subtract, regrouping if needed. Write what remains, including zero. The paper will copy the next printed digit down.',
        ],
    }[role]
