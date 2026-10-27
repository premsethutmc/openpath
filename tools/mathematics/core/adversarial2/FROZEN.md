# FROZEN: H2 held-out adversarial corpus

- file: `adversarial2.json`
- SHA-256: `2f14c5e1a13fe4dc0316991c97229ddf08a3b4684f73170e27462dcda921c5dc`
- seed: 20261028
- SymPy: 1.14.0 (vendored at /home/claude/vendor/sympy when not installed)
- Python: 3.13
- records: 440 (dropped during generation: 0, see `dropped.json`)
- by status: {'invalid': 178, 'valid-complete': 164, 'valid-incomplete': 26, 'ambiguous': 28, 'unsupported': 44}
- by category: {'domain-change': 44, 'extraneous-root': 44, 'cancellation': 44, 'multiplication-by-zero': 44, 'invalid-division': 44, 'rational-expressions': 44, 'alternative-paths': 44, 'correct-controls': 44, 'ambiguous-notation': 44, 'unsupported': 44}
- readings_agree controls: 16

Verify: `python3 check_adversarial2.py` (exit 0) and `python3 check_adversarial2.py --regen` (regenerates in a temp dir, requires byte-identical output).
Do not edit the corpus, generator or checker after this point; any change needs a new seed and a new corpus (adversarial3).
