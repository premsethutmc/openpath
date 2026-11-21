# Simulated children: Tamil (20 of each, 30 days)

Behaviour of the product only: placement, difficulty of daily rounds, and whether the progress shown matches what the child knows.

| child | board | school class | placed | should start | off by | questions to place | too hard | too easy | topics | ended in class | shown done | truly known | step-backs | stuck days |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tn-class5-average | tn | 5 | 6.0 | 5.0 | 1.1 | 9.4 | 2% | 23% | 6.8 | 5.0 | 87% | 84% | 0.1 | 0.0 |
| tn-class8-strong | tn | 8 | 9.2 | 9.0 | 0.6 | 9.8 | 0% | 42% | 9.5 | 8.0 | 91% | 89% | 0.0 | 0.0 |
| tn-class8-behind | tn | 8 | 4.0 | 4.0 | 0.5 | 23.8 | 12% | 25% | 5.0 | 4.0 | 73% | 83% | 3.4 | 0.0 |
| icse-class5-second-lang | icse | 5 | 3.0 | 3.0 | 0.8 | 16.0 | 25% | 26% | 5.3 | 3.0 | 72% | 69% | 3.6 | 0.0 |
| icse-class9-average | icse | 9 | 7.5 | 7.0 | 0.8 | 13.8 | 25% | 19% | 6.0 | 7.7 | 66% | 66% | 8.8 | 0.0 |
| adult-beginner | icse | 1 | 2.0 | 1.0 | 1.0 | 8.0 | 21% | 7% | 3.0 | 1.0 | 70% | 82% | 0.0 | 0.0 |
| careless | tn | 5 | 5.2 | 5.0 | 1.1 | 10.2 | 6% | 8% | 5.3 | 4.5 | 76% | 87% | 0.3 | 0.0 |
| guesser | tn | 5 | 2.0 | 1.0 | 1.0 | 17.6 | 78% | 0% | 1.3 | 1.8 | 23% | 0% | 3.4 | 0.0 |

No problems found by the checks.

## What the simulated children changed (sim-tamil@1)

Before → after, 20 children of each kind, 30 days:

| finding | before | after | change made |
|---|---|---|---|
| a child who only guesses, shown as done | 85% | 23% | a question counts as known only after two right in a row, with more right than wrong |
| progress shown vs truly known (TN Class 5 average) | 94% vs 65% | 87% vs 84% | same |
| "where should I start?" off by (behind / careless / average) | 1.7 / 1.6 / 1.6 classes | 0.5 / 1.1 / 1.1 | 4 questions a class, 3 to pass; starts at the school class; coming down needs 4 of 4 |
| questions to place a strong Class 8 child | 38 | 10 | starts at the school class |
| rounds too hard (TN Class 8 behind / ICSE Class 5 / ICSE Class 9) | 62% / 74% / 69% | 12% / 25% / 25% | "Next for you": two rounds under half right → a step back to the same strand one class lower |
