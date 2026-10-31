# 03 — Misconception-to-intervention evidence mapping

| Evidence (misconception-evidence@1) | Engine decision | Explanation |
|---|---|---|
| one unexplained wrong answer (policy A) | kept as an observation; no teaching | none |
| established `forgot-divide` (two matching answers) | misconception-specific, ranked first | `fix_finish` |
| established `added-not-subtracted` | 〃 | `fix_inverse` |
| established `divided-first` | 〃 | `fix_divide_all` |
| established `only-one-side` | 〃 | `fix_one_side` |
| established `x-sign-kept` (lboth or lbrk) | 〃 | `fix_sign_move` |
| established `number-sign-kept` | 〃 | `fix_number_sign` |
| established `first-term-only` | 〃 | `fix_distribution` |
| established `bracket-sign` (only predicted for a minus inside the bracket) | 〃 | `fix_bracket_sign` |
| a different misconception established | the explanation is refused (`misconception-evidence` check): it addresses another one | general, or the matching one |
| repeated difficulty, nothing established (starting check or practice) | general explanation, the kind of equation last got wrong first (`relevant` ranking) | `balance` / `two_steps` / `both_sides` / `brackets` |
| repeated difficulty on **one kind** of equation while the skill is otherwise shown (≥ 2 answers alone wrong on that kind, none right since) | that kind's general explanation **once**, then a fresh recheck of that kind; still wrong → pause for a person (`subSkillGap`, new) | `both_sides` / `brackets` / `two_steps` |
| failed delayed check (policy B) | recovery required; earlier achievement kept | recovery work, then a general explanation if needed |
| no prerequisite gap after recovery (policy C) | the skill's own eligible explanation once, recheck | through the same gate |
| no eligible explanation (e.g. supervised mode, nothing approved) | pause, no teaching | none |

Evidence is never fabricated: the specific explanation is eligible only when `addresses` (read from its content) is among the learner's
established misconceptions. Teaching displayed is never evidence; only answers alone count. Retries stay bounded (bounded-retry@1), and
explanations are bounded by those available (each delivered once).

Engine changes (adaptive layer only; learner-state model unchanged):
1. `orderStrategies`: an eligible misconception-specific explanation first; then, in a module whose explanations cover several kinds of
   question, those about the kind the learner last got wrong.
2. `moduleStep`: sub-skill difficulty (`subSkillGap`) — see the table. Only for modules whose explanations span several families (today:
   linear equations), so other modules are unaffected (scenarios, coverage and policy tests unchanged).
