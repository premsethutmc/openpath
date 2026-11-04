# FROZEN: H3 held-out adversarial corpus

- file: `adversarial3.json`
- SHA-256: `5a7ab2034d58bcd76a8c5465a363f6e8a0b9e29e0223c752fd776b4f0e5710a5`
- seed: 20261030
- SymPy: 1.14.0 (vendored at /home/claude/vendor/sympy when not installed)
- Python: 3.13
- records: 456 (rejected candidates during generation: 14, see `dropped.json`)
- by status: {'invalid': 144, 'valid-complete': 165, 'valid-incomplete': 45, 'ambiguous': 26, 'unsupported': 76}
- by category: 38 each of divide-by-variable, multiply-by-possibly-zero, cancellation, rational-expressions, removable-singularity,
  explicit-case-split, introduced-denominator, alternative-paths, glyph-variants, ambiguous-notation, broken-evidence-chain, unsupported
- readings_agree controls: 12

Verify: `python3 check_adversarial3.py` (exit 0) and `python3 check_adversarial3.py --regen` (regenerates in a temp dir, requires byte-identical output).
Do not edit the corpus, generator or checker after this point; any change needs a new seed and a new corpus (adversarial4).
