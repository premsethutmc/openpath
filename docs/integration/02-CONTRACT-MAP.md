# 02 — Authoritative contract map (Integration Milestone 1)

One decision, one owner. The slice (`frontend/src/journey/`) records, per step, which authority decided and which real function it called (`contracts.ts` `DECIDES`, enforced by `assertOwns`; `slice.test.ts` asserts no step is attributed to the wrong owner and the renderer never appears as a decider).

| Decision | Owner | Real component | Contract | Never done by |
|---|---|---|---|---|
| Is the answer right | Mathematical grader | `server-grader.gradeRequest` -> `grading/decision.grade`; Django: `family/kernel_grader.grader_decision` (Node bundle, manifest hash) | `grading-decision@1` (verdict correct / incorrect / unresolved / pending-educator) | renderer, evidence, adaptive |
| Is written working a supported derivation | Mathematical grader (P2) | `derivation-interface.authorizeWorking` -> `assessChain` + `replayDerivationChain` | `derivation-authorization@1`: authorized / unsupported / invalid | everything else; E7 process policy stays shadow-only |
| What happened (observations) | Evidence engine | `session.learnerState`, `evidence.evidenceFor`, `records` | attempt records carrying the server decision (`withDecisions`) | renderer |
| Provisional learner hypothesis | Evidence engine | `hypotheses.hypothesesFor`, `investigationTrigger` | `learner-hypothesis@1` (established / resolved / contested / slip / insufficient / unsupported), `resolution-probe@1` | may never grade; never read as mathematical truth |
| Investigate? what to teach? recheck? recovery | Adaptive loop | `intervention.moduleState`, `teachingEligibility` gate | `ModuleState` (explore, chapter, guided, check, verify, retention, recover, pause...) | renderer, hypotheses |
| Retention schedule | Evidence engine computes dates under the adaptive policy | `evidence` retention@2 (`RETENTION_DAYS=7`, `RETENTION_CHECK=2`, `INDEPENDENT_MIN=2`) | `SkillEvidence.retention/retentionDueAt/retentionHistory` | renderer |
| Presentation, interaction events | Renderer | `LearningScreen` + `RenderSpec`/`RendererEvent` | `RenderSpec` (+ M1 additive: `teacherGuide`, `nav.skipLabel`, `WorkingStep.badge`), `ChoiceInput` | decides nothing |

Rules enforced in code
- Renderer feedback level is derived only from a `GradingDecision` (`feedbackFromDecision`); `unresolved` / `pending-educator` render as "not marked", never right or wrong (test).
- Teaching steps are the selected `Strategy.screens` verbatim, `verified:false`, badge "explanation" (a screen is not a derivation).
- `workingEvidence()`: only `authorized` + replayed + certificates is method-verified; `unsupported` is neither verified nor wrong; restatement-only working is unsupported.
- Hypotheses are read for investigation / teaching choice only; no code path maps a hypothesis to a grade.
