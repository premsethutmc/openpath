# Word lookup from open dictionaries: tried, not shipped

*18 November 2026. Branch `feat/word-lookup`. Negative result, kept so it is not tried again the same way.*

`build_lookup.py` builds a meaning, an example sentence and a syllable count for common words from Open English
WordNet (CC BY 4.0) and CMUdict (BSD), by rule. It produced entries for about 26,000 words. The output was checked
by reading a sample, and **it is not fit to show to children**, so the data file is not committed and nothing in
the app uses it.

What went wrong, with real output:

| Word | Meaning the rules chose | Problem |
|---|---|---|
| dog | "a dull unattractive unpleasant girl or woman" | an offensive minor sense (two-sense fallback) |
| dog | "go after with the intent to catch" | the verb, not the animal (first-sense-only run) |
| quiet | "a period of calm weather" | a rare noun sense |
| ancient | "a very old person" | a rare noun sense |
| bridge | "connect or reduce the distance between" | the verb, not the thing |
| enormous | "extraordinarily large in size or extent or amount or power or degree" | right, but adult wording |
| water, run, promise, courage, because, island | none | the main sense is too long or too technical to pass the filter |

Why: WordNet's definitions are written for adults and its senses are not ordered by how common they are across
parts of speech. A length-and-wording filter throws out the main sense of the commonest words and then falls
through to a rarer one. Example sentences are often fragments ("Honest lawyers.").

What is still usable: the syllable counts from CMUdict.

Meanings for children need a source written for children, or meanings written for OpenPath and checked by rule,
as the word check's 80 words were.
