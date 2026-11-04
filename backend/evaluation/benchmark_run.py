"""Run the synthetic essay benchmark through the LLM client, with a dry-run cost estimate and a hard spending cap.

Uses the same client (evaluation/llm.py) and the same versioned prompts (content/english/prompts/) as the server's
essay evaluator. Django is not needed. Every essay and rewrite is SYNTHETIC (content/english/essay/benchmark/).

    # 1. the requests, built by OpenPath's core exactly as the app builds them
    node tools/english/essay-benchmark.ts --requests > /tmp/bench-requests.json

    # 2. dry run (the default): no network, no key needed; prints tokens and cost bounds
    cd backend && python3 -m evaluation.benchmark_run --requests /tmp/bench-requests.json \
        --price-input 2 --price-output 10 --max-cost-usd 1.00

    # 3. live run: ONLY with the owner's explicit approval of the key and the cost
    OPENPATH_LLM_PROVIDER=anthropic OPENPATH_LLM_MODEL=<model> OPENPATH_LLM_BASE_URL=https://api.anthropic.com \
    OPENPATH_LLM_API_KEY=<key> python3 -m evaluation.benchmark_run --requests /tmp/bench-requests.json \
        --price-input 2 --price-output 10 --max-cost-usd 1.00 --live --approved-by "<who, date>" --out-dir /tmp/bench-run

    # 4. score the recorded answers with the same validation and metrics as every other evaluator
    node tools/english/essay-benchmark.ts --recorded /tmp/bench-run/recorded.json --md

Spending is bounded three ways:
  - before each call, the run stops if the cost so far plus this call's worst case (its input estimate plus
    max_output_tokens) would exceed --max-cost-usd;
  - max_output_tokens caps every answer;
  - each request is capped in size by the client.
The key is read from the environment only and is never written to any output. Outputs: recorded.json (for the
scorer), runs.jsonl (every answer, every repeat), usage.json (tokens, cost, latency, failures per call), summary.json.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from pathlib import Path

from evaluation import llm

REPO = Path(__file__).resolve().parents[2]
PROMPTS = REPO / "content" / "english" / "prompts"
EVALUATOR = {"id": "openpath-gateway:llm", "version": "essay-llm@1"}
# a conservative character-to-token ratio for English and JSON (real counts come back in usage)
CHARS_PER_TOKEN = 3.5
# expected answer length when estimating (the worst case uses max_output_tokens)
EXPECTED_OUTPUT_TOKENS = {"observe": 1500, "rewrite": 700}


def system_prompt(protocol: str, prompts: Path = PROMPTS) -> str:
    text = (prompts / f"{protocol}.md").read_text(encoding="utf-8")
    return text.split("\nRequest:", 1)[0].strip()


def plan(requests: dict, repeats_observe: int, repeats_rewrite: int, prompts: Path = PROMPTS) -> list[dict]:
    """Every call the run would make, in order, with its system prompt and request."""
    calls = []
    for task, key, repeats in (("observe", "observe", repeats_observe), ("rewrite", "rewrite", repeats_rewrite)):
        for req in requests[key]:
            rid = req["essay"]["id"] if task == "observe" else req["rewrite"]["id"]
            for run in range(1, repeats + 1):
                calls.append({"task": task, "id": rid, "run": run, "system": system_prompt(req["protocol"], prompts), "user": json.dumps(req, ensure_ascii=False)})
    return calls


def estimate(calls: list[dict], max_output_tokens: int, price_in: float | None, price_out: float | None) -> dict:
    inp = sum(math.ceil((len(c["system"]) + len(c["user"])) / CHARS_PER_TOKEN) for c in calls)
    exp_out = sum(EXPECTED_OUTPUT_TOKENS[c["task"]] for c in calls)
    worst_out = max_output_tokens * len(calls)
    out = {"calls": len(calls), "input_tokens_estimate": inp, "output_tokens_expected": exp_out, "output_tokens_worst_case": worst_out}
    if price_in is not None and price_out is not None:
        out["cost_expected_usd"] = round((inp * price_in + exp_out * price_out) / 1e6, 4)
        out["cost_worst_case_usd"] = round((inp * price_in + worst_out * price_out) / 1e6, 4)
    return out


def rewrite_consistency(runs: list[dict]) -> dict:
    """Across repeated judgements of the same rewrite: the share of dimensions rated identically every time."""
    by: dict[str, list[dict]] = {}
    for r in runs:
        if r["task"] == "rewrite" and r.get("output"):
            by.setdefault(r["id"], []).append(r["output"])
    per = {}
    for rid, outs in by.items():
        if len(outs) < 2:
            continue
        dims: dict[str, list[str]] = {}
        for o in outs:
            for d in o.get("dimensions", []) if isinstance(o, dict) else []:
                if isinstance(d, dict) and isinstance(d.get("dimension"), str):
                    dims.setdefault(d["dimension"], []).append(str(d.get("rating")))
        same = [len(set(v)) == 1 and len(v) == len(outs) for v in dims.values()]
        per[rid] = {"repeats": len(outs), "dimensions": len(dims), "identical": sum(same), "share_identical": round(sum(same) / len(same), 3) if same else None}
    shares = [v["share_identical"] for v in per.values() if v["share_identical"] is not None]
    return {"per_rewrite": per, "mean_share_identical": round(sum(shares) / len(shares), 3) if shares else None}


def run(args, transport=llm.urllib_transport, sleep=time.sleep, env=os.environ) -> dict:
    requests = json.loads(Path(args.requests).read_text(encoding="utf-8"))
    config = llm.LLMConfig(
        provider=env.get("OPENPATH_LLM_PROVIDER", "anthropic"),
        model=env.get("OPENPATH_LLM_MODEL", ""),
        base_url=env.get("OPENPATH_LLM_BASE_URL", "https://api.anthropic.com"),
        api_key=env.get("OPENPATH_LLM_API_KEY", ""),
        max_output_tokens=args.max_output_tokens,
        timeout_s=args.timeout_s,
        retries=args.retries,
    )
    calls = plan(requests, args.repeats_observe, args.repeats_rewrite)
    est = estimate(calls, config.max_output_tokens, args.price_input, args.price_output)
    report = {"mode": "live" if args.live else "dry-run", "model": config.model or None, "max_cost_usd": args.max_cost_usd, "estimate": est}
    if not args.live:
        report["note"] = "dry run: no request was sent. A live run needs --live, --approved-by, prices and the key in the environment."
        return report
    problems = []
    if not args.approved_by:
        problems.append("--approved-by is required: a live run needs the owner's explicit approval of the key and the cost")
    if args.price_input is None or args.price_output is None:
        problems.append("--price-input and --price-output (USD per million tokens) are required for a live run")
    if args.max_cost_usd is None or args.max_cost_usd <= 0:
        problems.append("--max-cost-usd must be set above zero for a live run")
    problems += config.problems()
    if problems:
        raise SystemExit("refused: " + "; ".join(problems))
    if est.get("cost_worst_case_usd", 0) > args.max_cost_usd:
        report["warning"] = f"the worst case ({est['cost_worst_case_usd']} USD) exceeds the cap; the run stops at the cap"
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    spent = 0.0
    usage = []
    runs = []
    recorded = {"evaluator": {**EVALUATOR, "model": config.model}, "observations": {}, "rewrites": {}}
    cost = lambda i, o: (i * args.price_input + o * args.price_output) / 1e6  # noqa: E731
    stopped = None
    for c in calls:
        worst = cost(math.ceil((len(c["system"]) + len(c["user"])) / CHARS_PER_TOKEN), config.max_output_tokens)
        if spent + worst > args.max_cost_usd:
            stopped = f"stopped before {c['task']} {c['id']} run {c['run']}: the cap of {args.max_cost_usd} USD could be exceeded (spent {round(spent, 4)})"
            break
        started = time.monotonic()
        rec = {"task": c["task"], "id": c["id"], "run": c["run"]}
        try:
            comp = llm.complete(config, c["system"], c["user"], transport=transport, sleep=sleep)
            spent += cost(comp.input_tokens, comp.output_tokens)
            rec.update(status="answered", input_tokens=comp.input_tokens, output_tokens=comp.output_tokens)
            try:
                output = llm.extract_json(comp.text)
            except llm.LLMError as e:
                output = None
                rec.update(status="unparseable", error=str(e))
        except llm.LLMError as e:
            output = None
            rec.update(status="failed", error=str(e))
        rec["latency_ms"] = int((time.monotonic() - started) * 1000)
        usage.append(rec)
        runs.append({**rec, "output": output})
        # the first answer of each item goes to the scorer; failures are recorded as missing (the scorer counts them)
        target = recorded["observations"] if c["task"] == "observe" else recorded["rewrites"]
        if c["run"] == 1 and output is not None:
            target[c["id"]] = output
    summary = {
        **report,
        "calls_made": len(usage),
        "answered": sum(1 for u in usage if u["status"] == "answered"),
        "failed": sum(1 for u in usage if u["status"] == "failed"),
        "unparseable": sum(1 for u in usage if u["status"] == "unparseable"),
        "input_tokens": sum(u.get("input_tokens", 0) for u in usage),
        "output_tokens": sum(u.get("output_tokens", 0) for u in usage),
        "cost_usd": round(spent, 4),
        "approved_by": args.approved_by,
        "stopped": stopped,
        "rewrite_consistency": rewrite_consistency(runs),
    }
    (out_dir / "recorded.json").write_text(json.dumps(recorded, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    (out_dir / "runs.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in runs), encoding="utf-8")
    (out_dir / "usage.json").write_text(json.dumps(usage, indent=1) + "\n", encoding="utf-8")
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=1) + "\n", encoding="utf-8")
    return summary


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Run the synthetic essay benchmark through the LLM client (dry run by default).")
    p.add_argument("--requests", required=True)
    p.add_argument("--out-dir", default=str(REPO / "tools" / "english" / "out" / "llm-benchmark"))
    p.add_argument("--repeats-observe", type=int, default=1)
    p.add_argument("--repeats-rewrite", type=int, default=3)
    p.add_argument("--max-output-tokens", type=int, default=4000)
    p.add_argument("--timeout-s", type=float, default=60)
    p.add_argument("--retries", type=int, default=1)
    p.add_argument("--price-input", type=float, default=None, help="USD per million input tokens")
    p.add_argument("--price-output", type=float, default=None, help="USD per million output tokens")
    p.add_argument("--max-cost-usd", type=float, default=None)
    p.add_argument("--live", action="store_true")
    p.add_argument("--approved-by", default="")
    return p


if __name__ == "__main__":
    result = run(parser().parse_args())
    json.dump(result, sys.stdout, indent=1)
    print()
