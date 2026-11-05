#!/usr/bin/env bash
# usage: scripts/batch.sh <variant> <tag> <seedFrom> <seedTo>   (from anywhere; writes results/<variant>-<tag>-<subject>.jsonl.gz)
set -e
cd "$(dirname "$0")/../../../frontend"
for s in MATH.algebra.linear-intro MATH.number.equivalent-fractions MATH.measurement.money-decimals; do
  node --import tsx ../research/learner-state-eval/scripts/run.ts "$1" "$s" "$3" "$4" | gzip -9 > "../research/learner-state-eval/results/$1-$2-$s.jsonl.gz" &
done
wait
