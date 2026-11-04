# 5. Grading-to-adaptive evidence mapping

## What each part of the decision feeds

| Decision part | Recorded where | Read by | Effect on adaptive decisions |
|---|---|---|---|
| `verdict` `correct` / `incorrect` | Attempt record: `credit` (the server's decision) | `evidence.ts` (independent and assisted counts, status, retention), `intervention.ts` | Unchanged. This is the only input to learner-state credit. |
| `verdict` `unresolved` (incl. a partial derivation with no final answer, or unsupported working with no answer) | `unresolved` record, not an attempt | `UNREADABLE_LIMIT` (bounded) | No credit, no mastery, no attempt number. Partial working F is never counted. |
| Answer values matching a modelled misconception | Attempt `response` | `hypotheses.ts` (investigation, then `established`) | Unchanged. A misconception is established only by the existing investigation policy, from answers. The working assessment never names one. |
| `working` (working-assessment@1) | Inside the stored decision (event body + decision log); journey trace `derivation-interface.authorizeWorking` | The feedback, the trace, replay | **None on credit or teaching selection.** It is recorded evidence about the method, shown to the learner and to the trace. It is never turned into credit, a misconception or mastery. |
| `teaching` events | `teach` record | `evidence.ts`, `intervention.ts` | Unchanged. An explanation is delivered only through the content gate (doc 7). |

Why the working does not drive adaptation in D1:

- the learner-state estimator may not be redesigned (boundary);
- A3's policies are defined on answer evidence;
- making method evidence an adaptive input is a learner-state change.

The minimum version of that change is proposed below, not implemented.

## Adaptive behaviour observed in the integrated journeys (doc 6)

| Situation | Policy result (real components) | Journey |
|---|---|---|
| Wrong bare answer, then repeated difficulty, no misconception | General instruction `balance`, basis `repeated-difficulty` (`misconceptionEvidence: false`), then a fresh recheck alone (`gen:lin:2,15,1`): credit true, working `method-verified` | D1-01 |
| Verified misconception (forgot-divide, established by investigation) | Its own explanation `fix_finish`, basis `verified-misconception`, then a fresh recheck (`gen:lin:3,3,4`): credit true, `method-verified` | D1-08, D1-11 |
| Isolated slip | No teaching. Status still reached `transfer`. | D1-09 |
| One wrong answer with an identified invalid step (D) | No remediation: one wrong answer is a slip under the A3 policy. The invalid step is shown in the feedback only. | D1-05 |
| Repeated difficulty, always wrong | 2 explanations (`balance`, `two_steps`), both rechecks failed, then a pause. No mastery. | D1-10 |
| Failed recheck after teaching | A second explanation (`balance`) follows. The recheck after it is right. | D1-12 |
| Failed delayed retention | History `failed`, then `pending`. Recovery required, then shown again on the learner's own. `verified` stays false. | D1-13 |
| Assisted answers | Guided answers are never independent (M2 property 7 holds on every journey) | all |

## Learner-state semantics (A3 gap, made explicit)

The evidence for `MATH.algebra.linear-equations` is competency-level. Family (sub-skill) identity is kept and visible:

- every attempt's `questionId` names its family (`lin`, `lboth`, `lbrk`, `auleq`, `aulwp`, `authored`);
- each D1 trace lists `familiesInEvidence` and each submission's `family`.

The status itself does not distinguish families.

### Cases where the current state can overgeneralise

1. **One family can carry the whole competency.**
   - Measured: a learner who answers four `ax + b = c` questions (`lin` only) right on their own reaches status **independent** ("Shown on your own").
   - Retention is then scheduled for the competency. The engine's next step is `verify` with another `lin` question.
   - No both-sides (`lboth`) or bracket (`lbrk`) evidence exists.
   - If that delayed check passes, `verified` would be claimed for the whole competency.
   - This is pre-existing: A3 doc 10 already reported it. D1 neither creates nor widens it.
   - In every D1 journey that reached `transfer`, the evidence did include `lboth` and `lbrk` answers, because the module's practice list contains them.
2. **Correct answer, invalid working** (D1-04, case X).
   - The answer is right, so it counts as a correct independent answer.
   - The decision records `method-false-step` and the learner is told which step is wrong, but learner-state credit does not read it.
   - A run of such answers could build "independent" status on answers whose shown method is false. The status claims answer competence, not method; it never claims "method verified".
3. **Method evidence is never required for status.** A learner can reach `transfer` with bare answers only (D1-02). This is consistent with OpenPath's answer-based status vocabulary, but it means the status says nothing about method.

D1 adds no claim of bracket-equation or both-sides mastery:

- no new text says so;
- teaching selection is unchanged;
- feedback names only the lines the learner wrote.

The competency-level overgeneralisation in (1) is an existing semantic, documented and unchanged here, because the estimator may not be redesigned. It is not an incorrect mastery update introduced by the integration: every status change in the journeys follows the unchanged policy from the trusted verdicts.

### Minimum learner-state change for future sub-skill verification (proposal, not implemented)

1. Give each linear-equations family a sub-skill key in evidence: `exposureKey`'s family, mapped in the module (`lin` → two-step, `lboth` → both sides, `lbrk` → brackets). `skillEvidence` would compute status per key as well as for the competency.
2. Claim "independent" or "verified" for the competency only when every required sub-skill key has its own independent and retention evidence. Otherwise report the sub-skills shown.
3. Record `decision.working.methodEvidence` on the attempt as a read-only field. A future, separately approved policy could exclude `method-false-step` correct answers from the independent count, or require `method-verified` for a "method" claim.
4. No change to the shadow estimator; it stays inactive.
