"""Create a source-only, label-blind packet from the existing synthetic fixture.

No user-supplied dataset path, feedback import, network, provider or learner data.
The coordinator key must not be sent to reviewers before independent judgments.
"""
import argparse
import hashlib
import json
from pathlib import Path
import random
import secrets

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "content/english/essay/benchmark/workspace-writing-acceptance-v1.json"
FORM = ROOT / "docs/product/english/teacher-review/annotation-template.md"
INSTRUCTIONS = ROOT / "docs/product/english/teacher-review/reviewer-instructions.md"
PROTOCOL = "english-teacher-review@1"


def build_packet(raw, seed):
    fixture = json.loads(raw)
    cases = fixture["cases"]
    ids = [case["id"] for case in cases]
    if not cases or len(ids) != len(set(ids)):
        raise ValueError("Synthetic case IDs must be nonempty and unique")
    order = list(cases)
    random.Random(seed).shuffle(order)
    digest = hashlib.sha256(raw).hexdigest()
    reviewer, key = [], []
    for index, case in enumerate(order, 1):
        if not all(isinstance(case.get(field), str) and case[field].strip()
                   for field in ("id", "prompt", "text", "goal", "difficulty")):
            raise ValueError("Synthetic case is missing required text")
        opaque_id = f"R{index:03d}"
        # Strict allowlist: even future fixture metadata cannot leak labels.
        reviewer.append({
            "case_id": opaque_id,
            "task": case["prompt"],
            "text": case["text"],
            "goal": case["goal"],
            "difficulty_preference": case["difficulty"],
        })
        key.append({"case_id": opaque_id, "source_id": case["id"],
                    "candidate_annotations": case.get("annotations", []),
                    "candidate_protected": case.get("protected", [])})
    packet_id = hashlib.sha256(f"{digest}:{seed}".encode()).hexdigest()[:24]
    metadata = {"packet_id": packet_id, "protocol": PROTOCOL, "source_sha256": digest,
                "synthetic_only": True, "educator_review_completed": False}
    return ({**metadata, "cases": reviewer},
            {**metadata, "seed": seed, "cases": key})


def write_packet(out, raw, seed, form):
    reviewer, key = build_packet(raw, seed)
    out.mkdir(mode=0o700, parents=False, exist_ok=False)
    for name, value in (("reviewer.json", reviewer), ("coordinator-key.json", key)):
        target = out / name
        with target.open("x", encoding="utf-8") as stream:
            target.chmod(0o600)
            json.dump(value, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
    target = out / "annotation-template.md"
    with target.open("x", encoding="utf-8") as stream:
        target.chmod(0o600)
        stream.write(form)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True,
                        help="New local output directory; parent must exist")
    args = parser.parse_args()
    write_packet(args.out, SOURCE.read_bytes(), secrets.randbits(128),
                 FORM.read_text(encoding="utf-8"))
    target = args.out / "reviewer-instructions.md"
    with target.open("x", encoding="utf-8") as stream:
        target.chmod(0o600)
        stream.write(INSTRUCTIONS.read_text(encoding="utf-8"))
    print("Synthetic packet created. Keep coordinator-key.json separate from reviewers.")


if __name__ == "__main__":
    main()
