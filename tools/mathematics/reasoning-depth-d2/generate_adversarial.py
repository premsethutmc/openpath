import json
from pathlib import Path

categories = [
    ("incorrect-cross-domain-assumption", 20, "malformed", 0),
    ("invalid-substitution", 20, "invalid", 2),
    ("missing-domain-restriction", 20, "missing-assumption", None),
    ("circular-reasoning", 20, "malformed", 0),
    ("incorrect-method-transition", 20, "unsupported", None),
    ("correct-final-after-invalid", 20, "invalid", 2),
    ("valid-unconventional-route", 20, "verified", None),
    ("resource-exhaustion", 10, "resource-exhausted", None),
]
cases = []
for category, count, classification, first in categories:
    for index in range(count):
        cases.append({
            "id": f"d2-adversarial-{category}-{index:02d}",
            "category": category,
            "variant": index,
            "expected": {"classification": classification, "firstInvalidStep": first},
            "oracle": "independently authored proof-state and exact-domain expectation",
        })
payload = {"version": "openpath-d2-adversarial@1", "cases": cases}
Path(__file__).with_name("adversarial-cases.v1.json").write_text(json.dumps(payload, indent=2) + "\n")
print(len(cases))
