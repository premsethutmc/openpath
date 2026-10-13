# Evidence provenance: schema and migration

How the core ledger records **how** an answer was given, not only what it was: the question shown, the
first response, hints, later attempts, teaching delivered and what the learner did afterwards. The aim is a
record from which the engine can tell independent achievement from assisted achievement, for any subject.

Written before the implementation, as requested. Scoring, thresholds and `composite@1` do not change.

## The problem today

The core ledger holds `evidence` events only. The app writes one for the first unaided answer to a
question, and keeps hints, second tries, lessons and sessions as app-only events. So the engine cannot see
assisted work at all, and an `evidence` event does not itself say whether it was independent: that rests
on the app having filtered correctly.

## Principles

1. **Independence is stated, never assumed.** An answer is confirmed independent only when its event says
   so under the provenance schema and nothing recorded contradicts it.
2. **Assisted work is recorded, never promoted.** Hinted answers, second tries and answers to an item just
   shown in teaching are kept as assisted responses. They can never change an estimate or count as
   independent proficiency evidence.
3. **Unknown stays unknown.** Evidence recorded before this schema has assistance status *unknown*. It keeps
   its effect on `composite@1` (so estimates stay byte-identical), but rule-level statuses do not treat it
   as confirmed independent performance. It is reported separately.
4. **Derived, not asserted.** Delayed recall and transfer to unfamiliar questions are worked out from time,
   sessions and the learner's history on replay. A client may record its *purpose* ("this was a retention
   check"), but the engine decides what the evidence shows.
5. **Append-only, by id.** New events reference earlier ones by id. Replaying the same log always gives the
   same state.

## Events

All events share `kind`, `id`, `at` and `session`. Items are referenced as `{ id, version }`, as today.

| Event | New? | Records | Changes an estimate? |
|---|---|---|---|
| `presented` | New | A question was shown: item, purpose (`assessment`, `practice`, `retention`, `transfer`, `teaching`), and the intervention it belongs to, if any | No |
| `evidence` | Existing, plus optional `provenance` | The first response. With `provenance`, it states the attempt number, the hints and feedback before it, and the intervention it follows | Yes, only if independent (unchanged rule for legacy evidence) |
| `hint` | New | A hint shown for a presented item: level (1, 2, 3...) and a subject-defined hint type | No |
| `assisted_response` | New | Any later or helped answer: attempt number, hints used, whether feedback came first, intervention | No |
| `intervention` | New | Teaching delivered: capability, rule, subject-defined strategy id, content shown, the items it displayed, and the planner decision behind it | No |

### `provenance` on `evidence`

```ts
interface Provenance {
  schema: "provenance@1";
  presented?: string;      // id of the presented event
  attempt: number;         // 1 for a first answer
  hints: string[];         // ids of hint events for this item before this answer
  afterFeedback: boolean;  // the learner had already seen feedback on this item
  intervention?: string;   // the intervention this answer follows, if any
}
```

An `evidence` event is **confirmed independent** when it has `provenance`, `attempt` is 1, there are no
hints, no feedback came first, and the intervention it follows did not display this item. If a client sends
an `evidence` event that is not independent under these rules, the updater records it as *held* ("assisted
answers are not evidence") and changes no estimate. Legacy evidence (no `provenance`) is handled exactly as
today.

## How the rule projection uses it

| Answer | Rule-level track | Counts towards status? |
|---|---|---|
| Evidence, confirmed independent, reviewed item | independent | Yes |
| Evidence without provenance (legacy) | unknown | No: reported as "assistance not recorded" |
| `assisted_response`, or evidence held as assisted | assisted | No: reported with hint counts |
| Evidence on a generated, unchecked item | practice | No |
| Evidence on an item seen before | repeat | No |

- A **delayed check** for a rule ends as soon as that rule is practised, hinted, helped or taught in the
  session; later answers in that session are not delayed recall.
- For each **intervention** the projection reports what happened during it (assisted answers, hints) and
  the next independent answers on the rule after it. It does not judge whether the intervention "worked":
  that definition belongs to the planner proposal and must be configurable.
- A learner who is right only with help is reported as such: weak (or insufficient) on independent
  evidence, with the assisted record beside it.

## Migration and compatibility

- **No rewrite.** Existing logs replay unchanged. `composite@1` is byte-identical for any log without the
  new events, and its estimates are identical with them (the new events never reach the update).
- **Legacy evidence** has assistance status *unknown*. It is never upgraded automatically. Upgrading old
  pilot records (for example from the app's own attempt events) would be a separate, explicit and
  reviewable migration step; it is not part of this change and needs your decision.
- **Event identity.** Ids stay unique per learner; duplicates are ignored as today. A reference to an id
  that does not exist is kept but treated as no reference (it cannot make an answer independent).
- **Readers.** Code that only knows the old event kinds (the app's import check, the file store) keeps
  working; new kinds are additions to the `LedgerEvent` union.
- **The app** does not yet write the new events. Until it does, everything it records is legacy (unknown).
  Wiring the app is the next increment.

## Privacy

The new events carry ids, times, item references, response text (as `evidence` already does) and
subject-defined codes for hint types and strategies. No names, free-text notes or identifiers are added,
nothing is sent anywhere, and storage stays on the device as today.
