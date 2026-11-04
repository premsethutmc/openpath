# 10. Independent review and remaining limitations

A separate AI agent reviewed the code. It had not written it, read the code and existing modules, and probed edge cases with its own scripts. **AI review does not establish educational validity, and nothing here is calibrated against real student outcomes.**

## Findings and what was done

| # | Finding | Label | Action |
|---|---|---|---|
| 1 | `classifyQuestion` accepted ids the generator would never produce (`gen:lin:1,1,1`, `:w` on a family without a word form) | **DEFECT** | **Fixed.** The generator must accept the parameters and the format. Test added. |
| 2 | A contradicted answer (right answer, false-step working) counted as a *wrong* answer in status@2 and the delayed check, so it could fail a check the trusted credit passed | RISK | **Fixed.** Contradicted answers are neutral: neither credited nor wrong. Test added. |
| 3 | `need` was 1 for sub-skills the module's check never samples, a lower bar than the competency's 2 | RISK | **Fixed.** Unsampled sub-skills keep `RETENTION_CHECK`. Test added. Gap documented (doc 7). |
| 4 | Families exercise more than their sub-skill (lbrk also has x on both sides; aulwp also solves, sometimes expands) | LIMITATION | Documented (docs 1, 5). Credit stays with one sub-skill. |
| 5 | Modelling credit does not show an equation was formed (auleq is a choice; aulwp credits the number); mc can be guessed | LIMITATION | Documented. The authority has the same exposure. |
| 6 | Provenance relies on the backend refusing a client-sent `decision` (key allowlist in `family/learning.py`) | LIMITATION | Documented (doc 11). |
| 7 | Ordering by `at` text (offset timestamps, sub-second precision) | RISK | **Fixed.** Every comparison and sort is by instant, then id in code-unit order. Test added. |
| 8 | One malformed event (numeric `questionId`) made the existing reader throw | RISK | **Fixed.** The outcome is `unreadable-events`; nothing projected. Test added. |
| 9 | Sub-skill delayed check starts from the sub-skill's own first demonstration, not the shared engine's | LIMITATION | Documented. The authority's `engineShownAt` is a competency-level value. |
| 10 | Quadratic cost in the retention lookup | minor | **Fixed** (map lookup). |
| — | Mapping, provenance, no leakage, assisted vs independent, retention fidelity, no authoritative change | OK | — |

A later check found one more issue: reversed **event** delivery changed first-exposure counting through the existing reader. **Fixed** in the projection by putting events in canonical order (doc 8).

## Remaining measurement limitations

1. **The sub-skill is the family's kind.**
   - A bracket question also has x on both sides; a word problem also involves solving.
   - Evidence is about families, not isolated cognitive skills.
2. **Delayed-check coverage.** The module's check samples two-step and modelling only. Both sides and brackets cannot pass a delayed check through it, and stay `retention-due`.
3. **Method evidence is sparse.**
   - It exists only where a learner typed working, on families with an equation contract.
   - Being shown is decided by answers, as in the authority.
   - mc and word answers carry no method evidence.
4. **One-step evidence comes from the prerequisite competency.** That evidence is `ahone`, `linear-intro`; the competency has no one-step family of its own.
5. **Thresholds are inherited, not calibrated.** `INDEPENDENT_MIN = 2` and `RETENTION_DAYS = 7` are existing policy constants, applied per sub-skill. Whether two variants suffice for a sub-skill is an educational question no review here answers.
6. **Guessing.** Two right mc answers out of 4 options happens about 1 time in 16 per sub-skill.
7. **Shadow only.** The projection does not feed adaptive selection, teaching or mastery. Its discrepancies are reported, not acted on.
