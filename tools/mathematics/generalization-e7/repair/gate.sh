#!/bin/bash
# Stage gate: runs every regression suite and prints one compact summary. Usage: gate.sh <stage-label>   (run from the repo root)
L=${1:-gate}; R=tools/mathematics/generalization-e7; O=$R/repair/out-$L; mkdir -p $O
bun test packages/learning/src 2>&1 | grep -E "^ *[0-9]+ (pass|fail)|^Ran " | tr '\n' ' ' > $O/tests.txt; echo "tests: $(cat $O/tests.txt)"
bun $R/phase6/scan.ts $O/scan.json 2>&1 | tail -1 | cut -c1-420
(cd $R/phase2 && bun injection-battery.ts > ../repair/out-$L/injection.json 2>/dev/null)
python3 -c "
import json;d=json.load(open('$O/injection.json'));print('injection: falseRuns',d['falseRuns'],'falseVerified',len(d['falseVerified']),'trueRuns',d['trueRuns'],'trueVerified',d['trueVerified'],'trueInvalid',len(d['trueInvalid']))"
bun $R/phase6/battery-p6.ts > $O/battery.json 2>/dev/null
python3 -c "
import json;d=json.load(open('$O/battery.json'));print('battery-p6: cases',d['cases'],'mismatches',d['mismatches'],[r['id'] for r in d['results'] if not r['ok']][:6])"
bun $R/repair/holdout-diag.ts $O/holdout-diag.json $L | cut -c1-760
