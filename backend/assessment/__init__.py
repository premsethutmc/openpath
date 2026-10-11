"""OpenPath assessment engine.

Pure Python, no Django imports. Everything here is a deterministic function of
its inputs so that every judgement about a learner can be re-derived from the
stored raw evidence and audited.

    events  --evaluate_session-->  observations  --compute_skill_state-->  profile

`frontend/src/core/engine` mirrors this package for on-device use. The two are
kept in step by the golden cases in `shared/golden/`.
"""

ENGINE_VERSION = "0.1.0"

from .evaluate import evaluate_session  # noqa: E402
from .mastery import compute_skill_state  # noqa: E402
from .progression import build_profile, plan_next_session  # noqa: E402

__all__ = [
    "ENGINE_VERSION",
    "evaluate_session",
    "compute_skill_state",
    "build_profile",
    "plan_next_session",
]
