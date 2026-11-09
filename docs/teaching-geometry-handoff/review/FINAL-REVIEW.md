# Independent mathematics and teaching review — 9 November 2026

Engineering/content review only. **No educator approval is given.** This supersedes the earlier preliminary notes. Scope: selected triangle `worked_steps` source, geometry implementation, focused learner screenshots and teacher packet; not a claim of production or physical-device validation.

| Rubric | Judgment | Evidence |
|---|---|---|
| Mathematical correctness | Pass | Actual angle implementation checked independently against cosine law at 549 valid positions (maximum difference 1.67e-12 degrees); ten invalid inputs rejected. All three angles are computed independently. Exact default is 30°,90°,60°. |
| Clarity at intended prior knowledge | Pass, educator decision pending | Interior angle and straight angle are defined. Parallel lines and alternate interior angles are explained and mapped by A/B labels and left/middle/right text. Educator should check learners can follow the alternate-angle prerequisite. |
| Conceptual explanation | Pass | Parallel through C copies A/B and gives a straight angle; measurement explicitly distinguished from proof. Invalid/flat state does not present a numerical total or proof paragraph. |
| Worked steps | Pass | 30+90=120;180−120=60;sum180. Retained historical example56+85=141;180−141=39. Learner told to use stated values rather than moved-picture readings. |
| Task alignment | Pass | Existing ahtri third-angle task throughout; guided56,82→42; fresh24,57→99. Distinct problem and answer; no duplication of shown examples. |
| Unsupported claims | Pass | Approximate measurements and rounding limitation explicit. Domain is planar triangles above a fixed base, not every orientation. Review remains pending, supervised evaluation eligibility false; interaction does not establish mastery. |

## Source and compatibility findings

Previously reported source issues are resolved: async initialization uses current C; static caption follows proof visibility; invalid geometry hides the proof; copied sectors have letter labels and text mapping.

The implementation now replaces the selected existing `worked_steps` rather than adding an unused alternative. It retains procedural kind and exact `triangle-properties.angle-sum@1` scope. Replacement guard requires an existing ID, same family and scope. Its exception for reserved screen exposures allows only that strategy's own previous exposure. Original56,85 example is retained so historical teaching continues to count as exposure.

Reviewed regression source retains old guided56,29→95 and check25,65→90, round-trips records and decisions, and checks no invented verified status. This supports historical answer/record integrity; it is not proof of byte-identical old-versus-new decision execution. Parent runs the final regenerated checks.

## Learner-visible inspection

Independently viewed corrected desktop-diagram.png, mobile-proof.png, mobile-shallow-diagram.png and earlier lesson-0-1.png/mobile-degenerate.png under /tmp/geometry-quality/screens. Default geometry and copied sectors agree with stated30/90/60. Corrected desktop picture no longer has prior clipping/blank-area defect. Mobile proof text is readable and complete. Flat state is an honest stop. Very shallow valid geometry has necessarily crowded labels; the separate named text mapping and numerical readouts make this non-blocking. Sliders supply keyboard/non-drag interaction. Parent reports successful touch-emulated drag/reset/guided42/fresh99 journey; this review does not relabel that as a physical touch-device test.

## Teacher packet — pending correction at initial inspection

Initial9-page PDF had correct arithmetic and separated answers, but omitted the latest fourth learner screen's56/85→39 example while including that example in teacher answers. It also contained a blank eighth page. Requested regeneration from final content and blank-page removal. Packet cannot be called exact until corrected PDF inspected. Pending-review labels are clear and repeated. Practice page contains no42/99 answer leakage.

## Preserved calculus and remaining decisions

Calculus revision b5ebe187 was retained during source inspection: quadratic first principles show expansion, cancellation with h≠0 and limit; substitution explains du and transformed limits. Existing radical/rational follow-up alignment after quadratic teaching remains an educator decision and is disclosed in the packet, not claimed solved.

No additional mathematical blocker found. Educator review/approval remains outstanding; browser evidence is synthetic, not learner-outcome research. Production release/default-off, backend consent, security and full-suite results belong to parent/sibling checks, not this independent math review.

## Final regenerated source check

Independently ran `cd frontend && node --import tsx --test src/geometry/triangle.test.ts`: exit0, six passed, zero failed/skipped. Covers cosine-law invariants, negative/flat inputs and reset, exact scoped practice/check alignment, replacement guard, old teach/answer resume and historical exposure, pending review/evaluation ineligibility.

Updated eight-page PDF has the correct fourth-screen39 example and no blank page. Rendered pages5–7 are readable, with teacher answers on a separate page. However practice page6 omits both diagrams despite both prompts saying “as in the picture”; requested embedding the already captured exact question SVGs before final acceptance.

## Packet closure — final inspection

**Pass: source, focused visual and packet review complete, pending educator review.** Final eight-page PDF regenerated with both exact question SVGs. Independently rendered practice page6 at1100px: both56°/82° and24°/57° diagrams are visible, labelled with unknown `?`, match prompts, explicitly not to scale, and leak neither42 nor99. Layout is readable without clipping; answer material stays on the next teacher-only page. This resolves all packet correction requests above. Fourth-screen worked39 example, pending-review labels, provenance and disclosed calculus limitation remain present. No mathematical or packet blocker remains in this bounded review. Real educator review and physical-device/user research are not completed by these checks.
