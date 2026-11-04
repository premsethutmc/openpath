# 02 — Content review schema (explanation-review@1)

Registry: `content/learning/explanation-review.v1.json` (+ `explanation-blocklist.v1.json`). Code: `packages/learning/src/explanation-review.ts`. Tooling:
`packages/learning/scripts/explanation-review.ts` (`status`, `sync`, `screen`, `decide`, `check`). It extends the existing review@2
registry (`review.v1.json`, families and whole modules, Django `ContentDecision`) down to single explanations; review@2 is unchanged.

## Record (one per explanation)

| Field | Meaning |
|---|---|
| `id` | stable explanation identifier `<competency>#<strategy>`; a module's concept section is `<competency>#chapter` |
| `subject` | `mathematics` |
| `competency` | the skill the explanation teaches |
| `strategy` | the module strategy id |
| `intervention` | intervention type = strategy kind (`conceptual`, `procedural`, `recall`, `prerequisite`) |
| `misconceptionSpecific` | true when a section presents a particular wrong answer (role `misconception`) |
| `addresses` | the misconception (family diagnosis id) it is about, read from its content; all 300 misconception-specific explanations resolve |
| `revisions[]` | one decision per exact content revision |

## Revision

| Field | Meaning |
|---|---|
| `contentHash` | `sha256:` of the canonical JSON of everything shown and the recheck: competency, id, title, kind, needs, screens (text, math, pictures, roles, instance), guided and check question ids **and their prompt, answer and options** |
| `status` | `approved` · `pending_review` · `revision_required` · `demo_only` · `blocked` |
| `provenance` | `{ source: registry \| ai-screening \| machine-check \| engineering \| educator, by, at, note, ref }` |
| `reviewerRole` | `none` · `ai-reviewer` · `engineer` · `educator` |
| `reviewer`, `reviewedAt` | authorised reviewer identifier and date (educator decisions only) |
| `knownIssues[]` | known safety or quality issues (required for `blocked`) |
| `scope[]` | allowed usage: `demonstration`, `supervised-evaluation` |
| `supersedes` | hash of the revision this one replaced |
| `approvalDigest` | `sha256:` over (id, contentHash, status, reviewer, reviewedAt, scope, provenance source) — approvals only |

`reviewers[]`: authorised educator identifiers `{ id, role: "educator", addedAt, addedBy, note }`. **Empty.** A reviewer is added only by a
reviewed change from the product owner; the tooling never adds one.

## Rules

- **Approval is per revision.** A decision applies to one `contentHash`. Any edit changes the hash; the old decision stays in the history but
  no longer applies. `sync` registers the new revision as `pending_review` with `supersedes`. Re-approval = an educator `decide` on the new
  revision (auditable: a registry diff in a pull request).
- **Only an educator approves.** `approved` requires provenance `educator`, role `educator`, a listed reviewer with role `educator`, a review
  date not before the reviewer was authorised, and a matching `approvalDigest`. Anything else is an integrity failure: refused in every mode.
- **AI screening is never approval.** The Milestone 2 closure classifications populate the 64 audited explanations (`ai-screening`):
  ready → `pending_review`, revision → `revision_required`, demo-only → `demo_only`, wrong or broken → `blocked`.
- **Blocked is sticky per revision.** The four known-invalid revisions are recorded as `blocked` and listed in a separate blocklist
  (`content/learning/explanation-blocklist.v1.json`), which is refused in every mode whatever the registry says; reverting an
  explanation to one of them restores the block; `decide` refuses to change a blocked revision (correct the content instead); the
  registry check requires registry and blocklist to agree.
- **Fail closed.** An explanation without a record, or whose current revision is not registered, is refused in every mode.
- `check` (and test 0) validates: every explanation has a record for its current revision; record metadata matches the content; no
  revision has two decisions; blocked has an issue; approval integrity.

## Limits (stated, not hidden)

- The registry is a repository file. Its integrity rests on pull-request review of the file and of `reviewers`; the digest detects
  inconsistent edits, not a malicious maintainer who recomputes it. Server-side recording of explanation decisions (as review@2 has in
  Django) is not built.
- Registry size: 1515 records (1179 explanations + 336 concept sections), about 1.1 MB in the app bundle.
