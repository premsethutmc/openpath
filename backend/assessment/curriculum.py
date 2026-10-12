"""Load a curriculum definition (skill graph + mastery policy) from JSON."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=8)
def load_curriculum(path: str | Path) -> dict:
    curriculum = json.loads(Path(path).read_text(encoding="utf-8"))
    validate_curriculum(curriculum)
    return curriculum


def validate_curriculum(curriculum: dict) -> None:
    """Every prerequisite must exist and the graph must have no cycles."""
    skills = {s["key"]: s for s in curriculum["skills"]}
    if len(skills) != len(curriculum["skills"]):
        raise ValueError("duplicate skill key")
    for skill in skills.values():
        for prerequisite in skill["prerequisites"]:
            if prerequisite not in skills:
                raise ValueError(f"{skill['key']} requires unknown skill {prerequisite}")

    visiting: set[str] = set()
    done: set[str] = set()

    def visit(key: str) -> None:
        if key in done:
            return
        if key in visiting:
            raise ValueError(f"prerequisite cycle through {key}")
        visiting.add(key)
        for prerequisite in skills[key]["prerequisites"]:
            visit(prerequisite)
        visiting.discard(key)
        done.add(key)

    for key in skills:
        visit(key)
