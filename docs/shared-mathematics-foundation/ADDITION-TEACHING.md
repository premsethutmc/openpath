# Addition: teaching responsibility, not a promised learning outcome

This records the initial slice through `49e0e1d`. See [CONNECTED.md](CONNECTED.md) for the subsequent integration, teaching repairs and validation.

The product's responsibility is to offer the concept, intelligible transitions, opportunities to participate, help and a useful next action. Passing an answer checker is not evidence that this responsibility is complete. Real-learner efficacy studies are not a prerequisite for this implementation slice.

The existing families were inspected at the requested examples, not inferred from module counts.

| Example | Existing teaching | Participation/help | Remaining product gap |
| --- | --- | --- | --- |
| `1 + 2 = 3` (`aaadd`) | Explains combining two groups; counts on from 1 to 3; provides number-line and ten-frame alternatives. | Existing question/working input, hint, wrong-answer diagnosis, guided practice and fresh checks. | The visual shows one jump from 1 to 3, not two individual counters being combined. The generic make-ten alternative illustrates 8+5, which is poorly matched to 1+2. The method summary starts at the bigger number while the actual worked example starts at the first. These are content/presentation gaps, not a learner failure. |
| `193 + 678 = 871` (`adcol3`) | Explains ten ones as a ten and ten tens as a hundred. Ones: 3+8=11, retain 1 and carry a ten. Tens: 9+7+1=17, retain 7 and carry a hundred. Hundreds: 1+6+1=8. Alternative number-line route: 193→793→863→871. | Existing input and hints; carry misconceptions are explicitly represented; eligible lesson review remains available after a pause and is recorded as help. | The family trace stops at “8 hundreds”; it does not append the final composition `800+70+1=871`. Consequently `familySteps` correctly refuses to label the complete worked solution verified. The static visual starts from 193 and does not animate each exchange. |

These are distinct teaching demands: combining quantities versus maintaining place value through exchanges. The foundation does not treat success on small addition as evidence of regrouping. Its new addition configuration covers the existing small-addition competency; it does not claim to cover the separate multi-digit competency.

The bounded lesson-review flow is an implemented improvement: it offers one eligible explanation through the existing progressive Lesson component, records `foundation-lesson-review@1`, preserves previous answers, and prevents further answers in that visit from being presented as independent evidence. It does not declare either example's teaching complete. The gaps above are follow-up product work, not requests for an outcome study or excuses to mark a learner wrong.
