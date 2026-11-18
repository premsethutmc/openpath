"""Shared, allowlisted AI task dispatch; no generic prompt endpoint and no raw-content persistence.

All provider attempts reserve daily global/account/task capacity atomically. Failed attempts stay
charged. No automatic retry: one reservation permits at most one provider transport attempt.
Task-specific views retain their authentication, consent/data-use and response validation.
"""
from dataclasses import replace
import json

from django.conf import settings
from django.db import DatabaseError, transaction
from django.db.models import F
from django.utils import timezone

from . import llm
from .models import AIUsageBucket

TASKS = frozenset({'essay.observe', 'essay.rewrite', 'essay.questions', 'maths.word_problem'})


class GatewayDenied(llm.LLMError):
    """Safe refusal: no provider or request content is included."""


def config_for(task, legacy):
    if task not in TASKS:
        raise GatewayDenied('Unsupported AI task')
    mode = settings.OPENPATH_AI_SHARED_CONFIG
    if mode not in ('on', 'off'):
        raise GatewayDenied('Shared AI configuration is invalid')
    if mode == 'on':
        legacy = replace(legacy, provider=settings.OPENPATH_AI_PROVIDER, model=settings.OPENPATH_AI_MODEL,
                         base_url=settings.OPENPATH_AI_BASE_URL, api_key=settings.OPENPATH_AI_API_KEY)
    return replace(legacy, retries=0)


def reserve(task, user_id):
    """Conditional increments, serialized by the global row; rollback every increment on any failure."""
    if task not in TASKS or not isinstance(user_id, int) or isinstance(user_id, bool) or user_id <= 0:
        raise GatewayDenied('An authenticated account and supported AI task are required')
    caps = [('global', settings.OPENPATH_AI_DAILY_REQUESTS), (f'user:{user_id}', settings.OPENPATH_AI_USER_DAILY_REQUESTS)]
    if task.startswith('essay.'):
        caps += [('essay', settings.OPENPATH_ESSAY_DAILY_REQUESTS)]
    else:
        caps += [('maths', settings.OPENPATH_WORD_PROBLEM_SITE_DAILY), (f'user-maths:{user_id}', settings.OPENPATH_WORD_PROBLEM_DAILY)]
    if any(not isinstance(cap, int) or isinstance(cap, bool) or cap <= 0 for _, cap in caps):
        raise GatewayDenied('AI request limits are not configured safely')
    try:
        with transaction.atomic():
            day = timezone.localdate()
            for scope, cap in caps:
                bucket, _ = AIUsageBucket.objects.get_or_create(day=day, scope=scope)
                # Atomic UPDATE both locks and checks; unlike aggregate-then-increment this cannot overshoot.
                if AIUsageBucket.objects.filter(pk=bucket.pk, requests__lt=cap).update(requests=F('requests') + 1) != 1:
                    raise GatewayDenied('The daily AI request limit has been reached')
    except DatabaseError:
        raise GatewayDenied('AI capacity could not be reserved') from None


def execute(task, request, user_id, *, transport=llm.urllib_transport):
    """Dispatch only registered shapes using server-owned prompts. Caller must authenticate/authorize first."""
    if task not in TASKS:
        raise GatewayDenied('Unsupported AI task')
    if task.startswith('essay.'):
        from . import essay
        if settings.OPENPATH_ESSAY_EVALUATOR != 'llm':
            raise GatewayDenied('The essay evaluator is switched off')
        # Validation is repeated here so this service cannot become an arbitrary prompt proxy.
        cleaned, _ = essay.validate_essay_request(task.split('.')[1], request)
        config = essay._config()
        system = essay.exam.PROMPT if cleaned["rubric"] == essay.exam.RUBRIC else essay._prompt(cleaned["protocol"])
        user = json.dumps(cleaned, ensure_ascii=False)
    else:
        from family import word_problem
        if settings.OPENPATH_WORD_PROBLEMS != 'on':
            raise GatewayDenied('Word problems are switched off')
        if not isinstance(request, dict) or set(request) != {'text'} or not isinstance(request['text'], str) or not request['text'].strip() or len(request['text']) > word_problem.MAX_TEXT:
            raise GatewayDenied('Invalid word problem request')
        config = word_problem._config()
        system = word_problem.PROMPT['system']
        user = f"{word_problem.PROMPT['userPrefix']}{request['text']}{word_problem.PROMPT['userSuffix']}"
    if config.problems() or len(system) + len(user) > config.max_input_chars:
        raise GatewayDenied('AI task configuration or input is invalid')
    reserve(task, user_id)
    return llm.complete(config, system, user, transport=transport)
