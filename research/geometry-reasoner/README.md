# Geometry reasoner research prototype

This standalone package explores sound, step-level school geometry assessment. It is deliberately independent of the unmerged mathematics branches.

```bash
cd research/geometry-reasoner
python3 -m unittest discover -s tests -v
```

The committed benchmark is regenerated with:

```bash
python3 benchmark/generate.py
```

The public experiment boundary is `verify_geometry_step(problem, known_facts, student_step)`. A conclusion can be verified, invalid because established facts contradict it, blocked by a named missing assumption, or unsupported by the prototype. Unsupported is never converted into false.

`geometry_reasoner/assessment_contract.py` records the proposed domain-neutral boundary for later comparison with the algebra workstream. It is not wired to learner records or educator marking.
