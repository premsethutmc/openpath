"""Observed usage is not an invoice. No pricing API or estimated missing counts."""


def usage_summary(value):
    provider = value.usage_provider
    i, o = value.input_tokens, value.output_tokens
    cached, created = value.cached_input_tokens, value.cache_creation_input_tokens
    total = None
    if provider == 'openai_compatible':
        total = i  # cached input is already a subset of prompt_tokens
        basis = 'total_includes_cached_input'
    elif provider == 'anthropic':
        basis = 'uncached_input_excludes_cache_read_and_creation'
        if all(n is not None for n in (i, cached, created)):
            total = i + cached + created
    else:
        basis = 'unknown_or_legacy'
    return {'provider': provider or None, 'input_tokens': i, 'input_tokens_basis': basis,
            'total_input_tokens': total, 'output_tokens': o,
            'cached_input_tokens': cached, 'cache_creation_input_tokens': created,
            'reasoning_output_tokens': value.reasoning_output_tokens,
            'reasoning_is_subset_of_output': True,
            'missing_counts': 'unknown, not zero'}


def standard_rate_estimate(usage, input_price, output_price):
    """Undiscounted comparison only: no cache discounts, premiums, fees or invoice claim.

    Reasoning is included in output_tokens; never add it again. If total input or
    output is unknown, return unknown rather than treating missing usage as free.
    """
    i, o = usage['total_input_tokens'], usage['output_tokens']
    return None if i is None or o is None else (i * input_price + o * output_price) / 1e6
