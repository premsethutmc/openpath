# 4. Learner journey traces

There are twenty journeys through the real components:

- the trusted grader (D1: answer verdict and working verdict, recorded by the server);
- records, evidence and session;
- the adaptive flow, for J08 and J09.

The E1 projection is computed afterwards over the stored events. Only learner responses are scripted (`frontend/src/journey/d1e1-journeys.ts`). The assertions are in `d1e1-journeys.test.ts`, which passed 17 / 17 in the final run. The records come from the final regression run on `2c221bd`; [`journey-traces.json`](journey-traces.json) holds the complete machine-readable records, stored events included.

## Summary

| Journey | Authoritative (unchanged) | Projection (shadow): sub-skill status [method: verified / false step / unsupported / bare / partial without answer / not recorded / historical; contradicted] | Unknown | Discrepancy |
|---|---|---|---|---|
| J01 Correct bare answer | guided; check none | **two-step** insufficient-evidence [0/0/0/0/0/0/0; c0] | — | no |
| J02 Correct answer with verified working | guided; check none | **two-step** insufficient-evidence [1/0/0/0/0/0/0; c0] | — | no |
| J03 Correct answer with invalid working | independent; check scheduled | **two-step** insufficient-evidence [0/3/0/0/0/0/0; c3] | — | yes |
| J04 Incorrect answer with the first invalid step identified | exposure; check none | **two-step** insufficient-evidence [0/1/0/0/0/0/0; c0] | — | no |
| J05 Valid partial working | not_started; check none | **two-step** not-attempted [0/0/0/0/1/0/0; c0] | — | no |
| J06 Unsupported working | guided; check none | **two-step** insufficient-evidence [0/0/1/0/0/0/0; c0] | — | no |
| J07 Assisted success (hints, guided) | guided; check none | **brackets** insufficient-evidence [0/0/0/0/0/0/0; c0] | — | no |
| J08 Independent recheck success | transfer; check scheduled | **two-step** independently-demonstrated [7/0/0/0/0/0/0; c0]<br>**both-sides** independently-demonstrated [5/0/0/0/0/0/0; c0]<br>**brackets** independently-demonstrated [4/0/0/0/0/0/0; c0]<br>**modelling** independently-demonstrated [0/0/0/0/0/0/0; c0] | {"not-a-generated-question":1} | no |
| J09 Independent recheck failure | transfer; check scheduled | **two-step** independently-demonstrated [6/0/0/0/0/0/0; c0]<br>**both-sides** independently-demonstrated [5/0/0/0/0/0/0; c0]<br>**brackets** independently-demonstrated [4/0/0/0/0/0/0; c0]<br>**modelling** independently-demonstrated [0/0/0/0/0/0/0; c0] | {"not-a-generated-question":1} | no |
| J10 Two-step-only success | independent; check scheduled | **two-step** independently-demonstrated [4/0/0/0/0/0/0; c0] | — | yes |
| J11 Both-sides-only success | independent; check scheduled | **both-sides** independently-demonstrated [3/0/0/0/0/0/0; c0] | — | yes |
| J12 Bracket-equation success | independent; check scheduled | **brackets** independently-demonstrated [3/0/0/0/0/0/0; c0] | — | yes |
| J13 Mixed-family success | independent; check scheduled | **two-step** independently-demonstrated [2/0/0/0/0/0/0; c0]<br>**both-sides** independently-demonstrated [2/0/0/0/0/0/0; c0]<br>**brackets** independently-demonstrated [2/0/0/0/0/0/0; c0] | — | no |
| J14 Delayed retention success | independent; check passed | **two-step** independently-demonstrated [3/0/0/0/0/0/0; c0]<br>**modelling** insufficient-evidence [0/0/0/0/0/0/0; c0] | — | yes |
| J15 Delayed retention failure, then recovery | independent; check scheduled | **two-step** independently-demonstrated [4/0/0/0/0/0/0; c0] | — | yes |
| J16 Cross-family recovery | independent; check scheduled | **two-step** independently-demonstrated [4/0/0/0/0/0/0; c0]<br>**both-sides** recovery-required [2/0/0/0/0/0/0; c0] | — | yes |
| J17 Historical event replay | independent; check scheduled | **two-step** insufficient-evidence [0/3/0/0/0/0/0; c3] | — | yes |
| J18 Restart and persistence | independent; check scheduled | **two-step** independently-demonstrated [2/0/0/0/0/0/0; c0]<br>**both-sides** insufficient-evidence [0/0/1/0/0/0/0; c0]<br>**brackets** insufficient-evidence [0/1/0/0/0/0/0; c0] | — | yes |
| J19 Forged client verification | independent; check scheduled | **two-step** insufficient-evidence [0/3/0/0/0/0/0; c3] | — | yes |
| J20 Unknown question-family identifiers | independent; check scheduled | **two-step** independently-demonstrated [2/0/0/0/0/0/0; c0] | {"unmapped-family":1,"excluded-by-existing-reader":3} | yes |

Checks recorded with the journeys:

- **J15**: `{"beforeRecovery":{"twoStep":"recovery-required","authoritative":{"status":"review","verified":false,"retention":"failed","recoveryRequired":true}}}`
- **J17**: `{"current":{"falseStep":3,"status":"insufficient-evidence"},"preD1":{"notRecorded":3,"falseStep":0,"status":"independently-demonstrated"},"authority3":{"historical":3,"falseStep":3,"status":"insufficient-evidence"},"preD1Repeatable":true}`
- **J18**: `{"identicalAfterRestart":true,"authoritativeEqual":true}`
- **J19**: `{"forgedByClient":{"verified":0,"falseStep":0,"unsupported":0,"noMethodEvidence":0,"noWorking":0,"partial":0,"partialWorking":0,"notRecorded":3,"historical":0,"historicalVerified":0,"status":"not-established"},"inconsistentVerdict":{"verified":0,"falseStep":0,"unsupported":3,"noMethodEvidence":0,"noWorking":0,"partial":0,"partialWorking":0,"notRecorded":0,"historical":0,"historicalVerified":0,"status":"not-established"}}`

## Full per-submission traces


### J01 Correct bare answer

Learner `de1-J01`. Authoritative (unchanged): guided, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | — | correct | none (no-method-evidence) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 1 / 1 | 0 / 0 | 0 | 0 / 0 / 0 / 0 / 1 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: none.

### J02 Correct answer with verified working

Learner `de1-J02`. Authoritative (unchanged): guided, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 1 / 1 | 0 / 0 | 0 | 1 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: none.

### J03 Correct answer with invalid working

Learner `de1-J03`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 12; x = 2` | correct | invalid (method-false-step, first invalid line 1) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 56; x = 11` | correct | invalid (method-false-step, first invalid line 1) |
| 3 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 99; x = 9` | correct | invalid (method-false-step, first invalid line 1) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 0 / 0 | 0 / 0 | 3 | 0 / 3 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J04 Incorrect answer with the first invalid step identified

Learner `de1-J04`. Authoritative (unchanged): exposure, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 3` | `3x = 6; x = 3` | incorrect | invalid (method-false-step, first invalid line 2) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 0 / 1 | 0 / 0 | 0 | 0 / 1 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: none.

### J05 Valid partial working

Learner `de1-J05`. Authoritative (unchanged): not_started, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `` | `3x = 6` | unresolved | partial (no-method-evidence) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | not-attempted | 0 / 0 | 0 / 0 | 0 | 0 / 0 / 0 / 0 / 0 / 1 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: none.

### J06 Unsupported working

Learner `de1-J06`. Authoritative (unchanged): guided, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `take away and divide so x is 2; x = 2` | correct | unsupported (no-method-evidence) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 1 / 1 | 0 / 0 | 0 | 0 / 0 / 1 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: none.

### J07 Assisted success (hints, guided)

Learner `de1-J07`. Authoritative (unchanged): guided, verified false, delayed check none.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lbrk:5,-4,2,1 (lbrk) | practice, hint | `x = 1` | `3x - 20 = -17; 3x = 3; x = 1` | correct | verified (method-verified) |
| 2 | gen:lbrk:5,-5,1,10 (lbrk) | guided | `x = 10` | `4x - 25 = 15; 4x = 40; x = 10` | correct | verified (method-verified) |
| 3 | gen:lbrk:4,4,2,2 (lbrk) | practice, hint | `x = 2` | `2x + 16 = 20; 2x = 4; x = 2` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| brackets | insufficient-evidence | 0 / 0 | 3 / 3 | 0 | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | none (2; false; —) | false |

Unknown: {}. Discrepancies: none.

### J08 Independent recheck success

Learner `synthetic-m2-D1-11`. Authoritative (unchanged): transfer, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | le-ref-3x-19-4 (unknown) | diagnostic | `x = 5` | `3x = 15; x = 5` | correct | verified (method-verified) |
| 2 | gen:lin:3,3,2 (lin) | diagnostic | `6` | — | incorrect | none (no-method-evidence) |
| 3 | gen:lin:3,9,8 (lin) | diagnostic | `24` | — | incorrect | none (no-method-evidence) |
| 4 | gen:lin:2,2,1 (lin) | diagnostic | `2` | — | incorrect | none (no-method-evidence) |
| 5 | gen:lin:9,20,9 (lin) | guided | `x = 9` | `9x = 81; x = 9` | correct | verified (method-verified) |
| 6 | gen:lin:3,3,4 (lin) | check | `x = 4` | `3x = 12; x = 4` | correct | verified (method-verified) |
| 7 | gen:lin:3,3,2 (lin) | original | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 8 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 9 | gen:lin:7,9,11:mc (lin) | practice | `B` | — | correct | none (no-method-evidence) |
| 10 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 63; x = 9` | correct | verified (method-verified) |
| 11 | gen:auleq:1,2,9,10 (auleq) | practice | `C` | — | correct | — |
| 12 | gen:aulwp:1,5,2,7 (aulwp) | practice | `7` | — | correct | — |
| 13 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `x + 7 = 9; x = 2` | correct | verified (method-verified) |
| 14 | gen:lbrk:5,-4,2,1 (lbrk) | practice | `x = 1` | `3x − 20 = −17; 3x = 3; x = 1` | correct | verified (method-verified) |
| 15 | gen:lin:2,4,7:mc (lin) | transfer | `B` | — | correct | none (no-method-evidence) |
| 16 | gen:aulwp:1,5,2,9:w (aulwp) | transfer | `9` | — | correct | — |
| 17 | gen:lin:2,15,1 (lin) | check | `x = 1` | `2x = 2; x = 1` | correct | verified (method-verified) |
| 18 | gen:lin:5,6,5 (lin) | check | `x = 5` | `5x = 25; x = 5` | correct | verified (method-verified) |
| 19 | gen:lboth:8,3,4,3 (lboth) | check | `x = 3` | `4x + 3 = 15; 4x = 12; x = 3` | correct | verified (method-verified) |
| 20 | gen:lbrk:4,4,2,2 (lbrk) | check | `x = 2` | `2x + 16 = 20; 2x = 4; x = 2` | correct | verified (method-verified) |
| 21 | gen:lin:3,9,1 (lin) | check | `x = 1` | `3x = 3; x = 1` | correct | verified (method-verified) |
| 22 | gen:lin:5,10,2 (lin) | check | `x = 2` | `5x = 10; x = 2` | correct | verified (method-verified) |
| 23 | gen:lboth:5,20,4,4 (lboth) | check | `x = 4` | `x + 20 = 24; x = 4` | correct | verified (method-verified) |
| 24 | gen:lboth:7,16,5,6 (lboth) | check | `x = 6` | `2x + 16 = 28; 2x = 12; x = 6` | correct | verified (method-verified) |
| 25 | gen:lboth:8,18,7,8 (lboth) | check | `x = 8` | `x + 18 = 26; x = 8` | correct | verified (method-verified) |
| 26 | gen:lbrk:4,3,3,4 (lbrk) | check | `x = 4` | `x + 12 = 16; x = 4` | correct | verified (method-verified) |
| 27 | gen:lbrk:6,-5,3,9 (lbrk) | check | `x = 9` | `3x − 30 = −3; 3x = 27; x = 9` | correct | verified (method-verified) |
| 28 | wr:eq:find-mistakes (unknown) | practice | `written:marked-correct` | — | pending-educator | — |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 9 / 12 | 2 / 2 | 0 | 7 / 0 / 0 / 0 / 5 / 0 / 0 / 0 | scheduled (1; true; pending) | true |
| both-sides | independently-demonstrated | 5 / 5 | 0 / 0 | 0 | 5 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |
| brackets | independently-demonstrated | 4 / 4 | 0 / 0 | 0 | 4 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |
| modelling | independently-demonstrated | 3 / 3 | 0 / 0 | 0 | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |

Unknown: {"not-a-generated-question":1}. Discrepancies: none.

### J09 Independent recheck failure

Learner `synthetic-m2-D1-12`. Authoritative (unchanged): transfer, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | le-ref-3x-19-4 (unknown) | diagnostic | `x = 5` | `3x = 15; x = 5` | correct | verified (method-verified) |
| 2 | gen:lin:3,3,2 (lin) | diagnostic | `6` | — | incorrect | none (no-method-evidence) |
| 3 | gen:lin:3,9,8 (lin) | diagnostic | `24` | — | incorrect | none (no-method-evidence) |
| 4 | gen:lin:2,2,1 (lin) | diagnostic | `2` | — | incorrect | none (no-method-evidence) |
| 5 | gen:lin:9,20,9 (lin) | guided | `81` | — | incorrect | none (no-method-evidence) |
| 6 | gen:lin:3,3,4 (lin) | check | `12` | — | incorrect | none (no-method-evidence) |
| 7 | gen:lin:7,5,10 (lin) | guided | `x = 10` | `7x = 70; x = 10` | correct | verified (method-verified) |
| 8 | gen:lin:2,15,1 (lin) | check | `x = 1` | `2x = 2; x = 1` | correct | verified (method-verified) |
| 9 | gen:lin:3,3,2 (lin) | original | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 10 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 11 | gen:lin:7,9,11:mc (lin) | practice | `B` | — | correct | none (no-method-evidence) |
| 12 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 63; x = 9` | correct | verified (method-verified) |
| 13 | gen:auleq:1,2,9,10 (auleq) | practice | `C` | — | correct | — |
| 14 | gen:aulwp:1,5,2,7 (aulwp) | practice | `7` | — | correct | — |
| 15 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `x + 7 = 9; x = 2` | correct | verified (method-verified) |
| 16 | gen:lbrk:5,-4,2,1 (lbrk) | practice | `x = 1` | `3x − 20 = −17; 3x = 3; x = 1` | correct | verified (method-verified) |
| 17 | gen:lin:2,4,7:mc (lin) | transfer | `B` | — | correct | none (no-method-evidence) |
| 18 | gen:aulwp:1,5,2,9:w (aulwp) | transfer | `9` | — | correct | — |
| 19 | gen:lin:5,6,5 (lin) | check | `x = 5` | `5x = 25; x = 5` | correct | verified (method-verified) |
| 20 | gen:lboth:8,3,4,3 (lboth) | check | `x = 3` | `4x + 3 = 15; 4x = 12; x = 3` | correct | verified (method-verified) |
| 21 | gen:lbrk:4,4,2,2 (lbrk) | check | `x = 2` | `2x + 16 = 20; 2x = 4; x = 2` | correct | verified (method-verified) |
| 22 | gen:lin:3,9,1 (lin) | check | `x = 1` | `3x = 3; x = 1` | correct | verified (method-verified) |
| 23 | gen:lin:5,10,2 (lin) | check | `x = 2` | `5x = 10; x = 2` | correct | verified (method-verified) |
| 24 | gen:lboth:5,20,4,4 (lboth) | check | `x = 4` | `x + 20 = 24; x = 4` | correct | verified (method-verified) |
| 25 | gen:lboth:7,16,5,6 (lboth) | check | `x = 6` | `2x + 16 = 28; 2x = 12; x = 6` | correct | verified (method-verified) |
| 26 | gen:lboth:8,18,7,8 (lboth) | check | `x = 8` | `x + 18 = 26; x = 8` | correct | verified (method-verified) |
| 27 | gen:lbrk:4,3,3,4 (lbrk) | check | `x = 4` | `x + 12 = 16; x = 4` | correct | verified (method-verified) |
| 28 | gen:lbrk:6,-5,3,9 (lbrk) | check | `x = 9` | `3x − 30 = −3; 3x = 27; x = 9` | correct | verified (method-verified) |
| 29 | wr:eq:find-mistakes (unknown) | practice | `written:marked-correct` | — | pending-educator | — |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 8 / 12 | 2 / 3 | 0 | 6 / 0 / 0 / 0 / 7 / 0 / 0 / 0 | scheduled (1; true; pending) | true |
| both-sides | independently-demonstrated | 5 / 5 | 0 / 0 | 0 | 5 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |
| brackets | independently-demonstrated | 4 / 4 | 0 / 0 | 0 | 4 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |
| modelling | independently-demonstrated | 3 / 3 | 0 / 0 | 0 | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |

Unknown: {"not-a-generated-question":1}. Discrepancies: none.

### J10 Two-step-only success

Learner `de1-J10`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 63; x = 9` | correct | verified (method-verified) |
| 4 | gen:lin:5,6,5 (lin) | practice | `x = 5` | `5x = 25; x = 5` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 4 / 4 | 0 / 0 | 0 | 4 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J11 Both-sides-only success

Learner `de1-J11`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `x + 7 = 9; x = 2` | correct | verified (method-verified) |
| 2 | gen:lboth:7,15,3,5 (lboth) | practice | `x = 5` | `4x + 15 = 35; 4x = 20; x = 5` | correct | verified (method-verified) |
| 3 | gen:lboth:8,3,4,3 (lboth) | practice | `x = 3` | `4x + 3 = 15; 4x = 12; x = 3` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| both-sides | independently-demonstrated | 3 / 3 | 0 / 0 | 0 | 3 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J12 Bracket-equation success

Learner `de1-J12`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lbrk:5,-4,2,1 (lbrk) | practice | `x = 1` | `3x - 20 = -17; 3x = 3; x = 1` | correct | verified (method-verified) |
| 2 | gen:lbrk:5,-5,1,10 (lbrk) | practice | `x = 10` | `4x - 25 = 15; 4x = 40; x = 10` | correct | verified (method-verified) |
| 3 | gen:lbrk:4,4,2,2 (lbrk) | practice | `x = 2` | `2x + 16 = 20; 2x = 4; x = 2` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| brackets | independently-demonstrated | 3 / 3 | 0 / 0 | 0 | 3 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J13 Mixed-family success

Learner `de1-J13`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `x + 7 = 9; x = 2` | correct | verified (method-verified) |
| 4 | gen:lboth:7,15,3,5 (lboth) | practice | `x = 5` | `4x + 15 = 35; 4x = 20; x = 5` | correct | verified (method-verified) |
| 5 | gen:lbrk:5,-4,2,1 (lbrk) | practice | `x = 1` | `3x - 20 = -17; 3x = 3; x = 1` | correct | verified (method-verified) |
| 6 | gen:lbrk:5,-5,1,10 (lbrk) | practice | `x = 10` | `4x - 25 = 15; 4x = 40; x = 10` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 2 / 2 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |
| both-sides | independently-demonstrated | 2 / 2 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |
| brackets | independently-demonstrated | 2 / 2 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (2; false; pending) | true |

Unknown: {}. Discrepancies: none.

### J14 Delayed retention success

Learner `de1-J14`. Authoritative (unchanged): independent, verified false, delayed check passed.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lin:6,17,2 (lin) | retention | `x = 2` | `6x = 12; x = 2` | correct | verified (method-verified) |
| 4 | gen:auleq:2,9,19,11 (auleq) | retention | `C` | — | correct | — |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 3 / 3 | 0 / 0 | 0 | 3 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | passed (1; true; passed) | true |
| modelling | insufficient-evidence | 1 / 1 | 0 / 0 | 0 | 0 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J15 Delayed retention failure, then recovery

Learner `de1-J15`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lin:6,17,2 (lin) | retention | `x = 3` | — | incorrect | none (no-method-evidence) |
| 4 | gen:lin:4,7,3 (lin) | practice | `x = 3` | `4x = 12; x = 3` | correct | verified (method-verified) |
| 5 | gen:lin:6,5,4 (lin) | practice | `x = 4` | `6x = 24; x = 4` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 4 / 5 | 0 / 0 | 0 | 4 / 0 / 0 / 0 / 1 / 0 / 0 / 0 | scheduled (1; true; failed→recovered, pending) | true |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

Checks: `{"beforeRecovery":{"twoStep":"recovery-required","authoritative":{"status":"review","verified":false,"retention":"failed","recoveryRequired":true}}}`

### J16 Cross-family recovery

Learner `de1-J16`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `x + 7 = 9; x = 2` | correct | verified (method-verified) |
| 4 | gen:lboth:7,15,3,5 (lboth) | practice | `x = 5` | `4x + 15 = 35; 4x = 20; x = 5` | correct | verified (method-verified) |
| 5 | gen:lin:6,17,2 (lin) | retention | `x = 3` | — | incorrect | none (no-method-evidence) |
| 6 | gen:lboth:8,3,4,3 (lboth) | retention | `x = 4` | — | incorrect | none (no-method-evidence) |
| 7 | gen:lin:4,7,3 (lin) | practice | `x = 3` | `4x = 12; x = 3` | correct | verified (method-verified) |
| 8 | gen:lin:6,5,4 (lin) | practice | `x = 4` | `6x = 24; x = 4` | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 4 / 5 | 0 / 0 | 0 | 4 / 0 / 0 / 0 / 1 / 0 / 0 / 0 | scheduled (1; true; failed→recovered, pending) | true |
| both-sides | recovery-required | 2 / 3 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 1 / 0 / 0 / 0 | failed (2; false; failed) | true |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

### J17 Historical event replay

Learner `de1-J17`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 12; x = 2` | correct | invalid (method-false-step, first invalid line 1) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 56; x = 11` | correct | invalid (method-false-step, first invalid line 1) |
| 3 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 99; x = 9` | correct | invalid (method-false-step, first invalid line 1) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 0 / 0 | 0 / 0 | 3 | 0 / 3 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

Checks: `{"current":{"falseStep":3,"status":"insufficient-evidence"},"preD1":{"notRecorded":3,"falseStep":0,"status":"independently-demonstrated"},"authority3":{"historical":3,"falseStep":3,"status":"insufficient-evidence"},"preD1Repeatable":true}`

### J18 Restart and persistence

Learner `de1-J18`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:lboth:9,7,8,2 (lboth) | practice | `x = 2` | `take away and divide; x = 2` | correct | unsupported (no-method-evidence) |
| 4 | gen:lbrk:5,-4,2,1 (lbrk) | practice | `x = 2` | `3x - 20 = -17; x = 2` | incorrect | invalid (method-false-step, first invalid line 2) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 2 / 2 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |
| both-sides | insufficient-evidence | 1 / 1 | 0 / 0 | 0 | 0 / 0 / 1 / 0 / 0 / 0 / 0 / 0 | none (2; false; —) | false |
| brackets | insufficient-evidence | 0 / 1 | 0 / 0 | 0 | 0 / 1 / 0 / 0 / 0 / 0 / 0 / 0 | none (2; false; —) | false |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

Checks: `{"identicalAfterRestart":true,"authoritativeEqual":true}`

### J19 Forged client verification

Learner `de1-J19`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 12; x = 2` | correct | invalid (method-false-step, first invalid line 1) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 56; x = 11` | correct | invalid (method-false-step, first invalid line 1) |
| 3 | gen:lin:7,18,9 (lin) | practice | `x = 9` | `7x = 99; x = 9` | correct | invalid (method-false-step, first invalid line 1) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | insufficient-evidence | 0 / 0 | 0 / 0 | 3 | 0 / 3 / 0 / 0 / 0 / 0 / 0 / 0 | none (1; true; —) | false |

Unknown: {}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

Checks: `{"forgedByClient":{"verified":0,"falseStep":0,"unsupported":0,"noMethodEvidence":0,"noWorking":0,"partial":0,"partialWorking":0,"notRecorded":3,"historical":0,"historicalVerified":0,"status":"not-established"},"inconsistentVerdict":{"verified":0,"falseStep":0,"unsupported":3,"noMethodEvidence":0,"noWorking":0,"partial":0,"partialWorking":0,"notRecorded":0,"historical":0,"historicalVerified":0,"status":"not-established"}}`

### J20 Unknown question-family identifiers

Learner `de1-J20`. Authoritative (unchanged): independent, verified false, delayed check scheduled.

| # | Question (family) | Activity | Response | Working | Answer verdict | Working verdict (method evidence) |
|---|---|---|---|---|---|---|
| 1 | gen:lin:3,3,2 (lin) | practice | `x = 2` | `3x = 6; x = 2` | correct | verified (method-verified) |
| 2 | gen:lin:2,17,11 (lin) | practice | `x = 11` | `2x = 22; x = 11` | correct | verified (method-verified) |
| 3 | gen:meet:3,0 (meet) | practice | `5` | — | correct | verified (method-verified) |
| 4 | gen:zzz:1,2 (unknown) | practice | `5` | — | correct | verified (method-verified) |
| 5 | gen:lin:1,1,1 (unknown) | practice | `5` | — | correct | verified (method-verified) |
| 6 | Solve 2x + 5 = 17 (unknown) | practice | `5` | — | correct | verified (method-verified) |

| Sub-skill (shadow) | Status | Alone right / total | Assisted right / total | Contradicted | Method: verified / false step / unsupported / bare / no working / partial (no answer) / not recorded / historical | Delayed check (need; sampled; history) | Ever shown |
|---|---|---|---|---|---|---|---|
| two-step | independently-demonstrated | 2 / 2 | 0 / 0 | 0 | 2 / 0 / 0 / 0 / 0 / 0 / 0 / 0 | scheduled (1; true; pending) | true |

Unknown: {"unmapped-family":1,"excluded-by-existing-reader":3}. Discrepancies: the competency reads "independent" (shown alone) for every kind of linear equation.

