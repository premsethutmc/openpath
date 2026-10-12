"""Identifier removal, kept in step with the core (scrubIdentifiers and scrubForEvaluation in
packages/english-core/src). Both are tested against content/english/signals/scrub-cases.json."""

import re

_V1 = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[removed]"),
    (re.compile(r"https?://\S+"), "[removed]"),
    (re.compile(r"(?:\+?\d[\d\s-]{6,}\d)"), "[removed]"),
    (re.compile(r"@\w{2,}"), "[removed]"),
]
_NAME = r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?"
_SIGNOFF = r"[Yy]ours (?:faithfully|sincerely|truly)|[Ll]ove|[Rr]egards|[Bb]est wishes"
_E3 = [
    (re.compile(r"\b(Mr|Mrs|Ms|Miss|Dr|Sir|Madam)\.?\s+" + _NAME), r"\1 [name]"),
    (re.compile(r"\b([Mm]y name is|I am called|I'm called|[Tt]his is)\s+" + _NAME), r"\1 [name]"),
    (
        re.compile(
            r"((?:" + _SIGNOFF + r"|[Tt]hank you|[Tt]hanks|[Ff]rom|[Yy]our (?:friend|student|son|daughter)),?\s*\n\s*)" + _NAME
        ),
        r"\1[name]",
    ),
    (
        re.compile(r"\b((?:" + _SIGNOFF + r"|[Ss]ee you soon|[Yy]our (?:friend|student|son|daughter)),[ \t]*)" + _NAME),
        r"\1[name]",
    ),
    (re.compile(r"\b(class|grade|std\.?)\s*\d{1,2}(?:[A-Za-z]\b)?", re.IGNORECASE), r"\1 [removed]"),
]


def scrub_identifiers(text: str) -> str:
    for pattern, repl in _V1:
        text = pattern.sub(repl, text)
    return text


def scrub_for_evaluation(text: str) -> str:
    text = scrub_identifiers(text)
    for pattern, repl in _E3:
        text = pattern.sub(repl, text)
    return text
