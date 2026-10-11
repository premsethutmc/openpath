"""Regenerate shared/golden/cases.json:  python -m assessment.export_golden"""

import json
from pathlib import Path

from .curriculum import load_curriculum
from .scenarios import golden

REPO = Path(__file__).resolve().parents[2]
CURRICULUM = REPO / "shared" / "curriculum" / "math-early-number.json"
GOLDEN = REPO / "shared" / "golden" / "cases.json"


def render() -> str:
    return json.dumps(golden(load_curriculum(str(CURRICULUM))), indent=1, sort_keys=True) + "\n"


if __name__ == "__main__":
    GOLDEN.write_text(render(), encoding="utf-8")
    print(f"wrote {GOLDEN.relative_to(REPO)}")
