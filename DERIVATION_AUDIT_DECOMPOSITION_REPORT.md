# General Mathematical Derivation Audit — the legitimate-decomposition false negative

> **Erratum (design review, see `DERIVATION_GROUNDING_DESIGN_DECISION.md`):** §4's rule and its "13/13" prototype result held only for the cases I chose. Adversarial probing of the prototype found it **explains `37+59 → 96*1` and `2*48`** (its multiplicative branch covers numerals unconditionally, an answer-smuggling hole) and **refuses the legitimate shown-shift transfer `(37+3)+(59−3)`**. §4 is superseded by the registry design in the decision document; §§1-3 (reproduction, root cause, answers) stand.

Branch `feat/math-answer-key-certification`. **No production code, protected semantics or test was changed.** Evidence: `tools/mathematics/answer-key-certification/derivation-audit/` (`probe.ts` + `probe-output.txt` reproduce every outcome below against the unmodified engine; `prototype-rule.ts` + `prototype-cases.ts` are a standalone prototype of the proposed rule, imported by nothing). Nothing merged or deployed.

## 1. Reproduction (existing engine, one complete equality per line)

| Case | Outcome today | Reported earlier |
|---|---|---|
| `37+59=8+16` / `8+16=816` | invalid (line 1) | ✔ |
| `37+59=816` | invalid (line 1) | ✔ |
| correct place-value decomposition ending 96 | **unsupported** (every line individually `verified`) | ✔ |
| decomposition ending 86 / slip ending 95 | invalid | ✔ |

All reproduced exactly (`probe-output.txt`, last line "all reproduced as reported").

## 2. Root cause

**Two different questions are answered by two different obligations, and only one of them knows about rewriting.**

- *Truth of the step* — obligation `derivation` ("equal in value to the previous line (exact arithmetic)") is **proven** for every line of the correct decomposition. The kernel's verdict is right and is preserved down the chain (`dependsOn`).
- *Provenance of the numerals* — obligation `grounding` ("its numbers come from the premises or from proved facts") is **unresolved** at line 1 because `30, 50, 7, 9` are classified `free-literal`. That literal is then propagated: line 2 "rests on line 1" (`proof-obligations.ts:113-116`, `usesIt`/`gbadDep`), line 3's `80, 16` become free because line 2 was never accepted into the pool of established facts (`unified-math-engine.ts:456`), and the `answer` obligation stays unresolved. Line 2 and 3 are **cascade failures**; the only primary defect is line 1.

Why line 1 fails: `literalProvenanceOne` (`claim-grounding.ts:160-203`) explains a numeral only if it is (i) a task numeral, (ii) established by an earlier accepted line, (iii) licensed by the rule in force, (iv) the value of a computation shown on the line whose operands are already explained, (v) in the previous line's closure (its numerals, its closed sub-results, one operation between two of them), or (vi) the parameter of a balance operation. `30, 50, 7, 9` are none of these: they are not task numerals, not values of computations over explained operands, and not one operation from two of `{37, 59, 96}`.

The symbolic route avoids this by an exemption that does not exist for constants: in `algebraGroundings` (`unified-math-engine.ts:451`) a line that is **the same polynomial statement as the previous line** (`polynomialKey` equality, `key !== "0"`) is an exact rewrite whose numerals are certified by the identity. A true equality of two constant expressions has `polynomialKey === "0"`, so it is excluded by construction; the exemption is additionally switched off when a literal `num op num` appears in the line (`/\d+\s*[+\-*/]\s*\d+/`). The numeric chain route has its own variant of the same rule (`e6-numbers.ts:653-656`) and the geometry-calculation route a third call (`natural-geocalc-e5.ts:171`); all three share `literalProvenance`.

## 3. The five questions

1. **Ungrounded quantities.** Line 1: `30, 50, 7, 9`. Line 2: the same four (not pooled because line 1 was refused) plus nothing new. Line 3: `80, 16` (cascade). Other cases: `10` (12×4), `100, 2` (7×98), `2, 3` (5/6 = 1/2+1/3).
2. **Why the equality is insufficient.** Value-equality is *necessary, not sufficient*: `37+59 = (96+17)−17` and `37+59 = 40+56` are equally true. An equality proves the line is a correct statement; it does not say which of the numerals the student wrote are *determined by* the previous expression and which are arbitrary parameters or unrelated facts. The existing safeguard exists precisely because a true line can say nothing about the task (`derivation-e7.test.ts`, "a correct number is not a derivation").
3. **Does the proof state preserve verified equivalence?** Yes for validity: the `derivation` obligations are proven and chained. What it does **not** preserve is the *rewrite relation as a structure*: the engine records "line n equals line n−1" but never records *which subterm of line n−1 was replaced by what*, so it cannot tell a replacement from a restatement.
4. **Can a verified transformation legitimately introduce new terms?** Mathematically always (an equality chain proves its endpoints equal whatever lies between). Pedagogically/for anti-laundering only when the new terms are *determined by a rewrite of a grounded subterm*. Expansion, factorisation and common-denominator scaling already pass (cases P4–P6) for exactly this reason; numeric place-value, distributive, and fraction decompositions are the same operation and do not.
5. **Justified decomposition vs unsupported assertion.** Three properties separate them, each mechanically checkable on the parsed line: (a) *locality* — the new expression replaces a subterm that is actually present in the previous line; (b) *conservation* — each introduced term belongs to a group of terms whose signed sum (or product / quotient for scaling) equals a value **visible in that subterm** (30+7 = 37, 50+9 = 59; 10+2 = 12; 100−2 = 98; 3/6 = 1/2); (c) *no padding* — the group contains no sub-multiset that sums to zero (+k −k) and does not partition the answer. Padding and unrelated partitions fail (b)/(c); new premises ("x is even") are never rewrites of a subterm and still fail.

## 4. Proposed general proof rule (proposal — not applied)

**Conservation-preserving replacement.** Let `P` be the expression being rewritten (the previous accepted line, or the task statement) and `S` the new right-hand side, exact-equal to `P` as decided by the existing kernel. Numerals of `S` that are not already explained are explained (provenance `derived-fact`, `rule: "replacement"`, `from: <line>`) iff, for each maximal additive group of `S` (descending into factors, and treating a written fraction as a term):
1. it is zero-sum-free (no sub-multiset of ≤ 8 signed terms sums to 0);
2. every term not already visible lies in a sub-multiset of ≥ 2 terms whose signed sum equals a visible value, or is an equivalent fraction (same value) of a visible fraction;
3. "visible" = numerals and proper sub-expression values of `P`; **never the value of the whole of `P`** (that is the answer; the existing principle already says the answer is not an explanation).

Integration point: inside `literalProvenanceOne` (`claim-grounding.ts`), via a new optional `env.rewriting?: string` supplied by the three callers — one shared change, so all domains and routes benefit. Recording the rule in `GroundingSource` also gives the claim ledger and proof context the missing structure from Q3. Soundness is untouched: the rule can only turn `free-literal` into `derived-fact`; value truth is still decided by the exact kernel, so no false line becomes true.

**Prototype results** (`bun derivation-audit/prototype-cases.ts`, 13/13 as designed): explained — `(30+50)+(7+9)`, `(10+2)*4`, `7*(100−2)`, `3/6+2/6` for `1/2+1/3`, `1/2+1/3` for `5/6`, `(31+49)+(6+10)`; refused — `(96+17)−17`, `37+59+(5−5)`, `150−(150−96)`, `(37+22)+(59−22)`, `100−4` for `37+59`, `40+56`, and the false equality.

**Deliberately conservative (false negatives remain):** the legitimate "transfer" strategy `(37+22)+(59−22)` and the answer-only compensation `100−4` are still refused. A false negative costs credit; a false positive would cost the anti-laundering guarantee, so the prototype errs towards refusal. The prototype also is not claimed to cover every strategy; it should be widened only against failing cases.

## 5. Separate finding (a leak, not part of the requested change)

`2x + 6 = 12` → `(2x + 17) − 11 = 12` is classified **verified** (probe L1) while the equivalent `2x + 6 + 17 − 17 = 12` is **unsupported**. Cause: the symbolic rewrite exemption's guard is *syntactic* (`num op num` adjacency), so a cancelling pair split across a bracket escapes it. The zero-sum-free condition above closes it uniformly; `(2x+17)−11` (terms 17, −11, sum 6, a visible value) would be explained as a conserving partition of `6`, and padding like `(2x+17)−17+6` would be refused. This is a tightening; whether it is wanted is a decision for the engine owner.

## 6. Minimal regression tests (to add after approval; expected outcome in the "after" column)

Add to `derivation-e7.test.ts`-style suite (`assessMathematicalWorking`, one equality per line; the cases and today's outcomes are in `derivation-audit/probe.ts`):

| Test | Statement / lines | Now | After |
|---|---|---|---|
| place-value add | `37+59` / `=(30+50)+(7+9)`, `=80+16`, `=96` | unsupported | **verified** |
| place-value multiply | `12*4` / `=(10+2)*4`, `=40+8`, `=48` | unsupported | **verified** |
| distributive | `7*98` / `=7*(100-2)`, `=700-14`, `=686` | unsupported | **verified** |
| fraction split | `5/6` / `=1/2+1/3`, `=5/6` | unsupported | **verified** |
| must stay rejected | add-zero `(96+17)-17`; unrelated parts `40+56`; false `(30+50)+(7+8)`; invented premise "because x is even" | unsupported / unsupported / invalid / unsupported | unchanged |
| error localisation | decomposition ending 86 and 95 | invalid | invalid, `firstInvalidStep` = the wrong line (not line 1) |
| existing | all of `derivation-e7.test.ts`, `proof-integrity-e2`, `proof-obligations-e7` | pass | must still pass |
| symbolic leak | `(2x+17)−11 = 12` after `2x+6 = 12` | verified | decision pending (§5) |

Each is a pure function of text, so the tests need no fixtures beyond the strings above.

## 7. What was not done

No production edit; no change to `buildObligations`, `assessRelevance` or any threshold; the prototype operates on constant expressions only (symbolic rewrites already pass through `polynomialKey`); equal-value tolerance and the ≤ 8-term subset search bound are prototype choices to be revisited in a real implementation; multi-line chains (`a = b = c`) are rejected as malformed by the parser contract and were not touched.
