# Remaining human decisions (pilot validation v1)

Nothing below has been decided. Real-child essay access stays disabled until all items in group C and D are decided
and implemented in a reviewed change.

| # | Decision | Who | Blocks |
|---|---|---|---|
| **A. Educator review** | | | |
| H-A1 | Choose two independent reviewers and a third adjudicator: English educators of about Grade 8 in India, outside the development team | Owner | Round 1 |
| H-A2 | Choose the coordinator, who sends each reviewer only their own folder and holds the returned files until both are complete | Owner | Round 1 |
| H-A3 | Educators: decide each of the 63 round-1 records (approve, revise, reject, unable), and the three band-5 targets, descriptors and mappings | Educators | Any pilot content |
| H-A4 | Approve the content-release change that applies the adjudicated decisions (owner approval is not educator review) | Owner | Any pilot content |
| **B. Model benchmark** | | | |
| H-B1 | Approve a live benchmark run: provider, model id, a dedicated key, prices and the cost cap (e.g. Sonnet 5.5 about $0.43 expected, cap $1) | Owner | Any model-accuracy statement |
| H-B2 | Set the accuracy threshold an evaluator must meet on **educator-annotated** essays before any observation is shown to a child or parent (D6) | Owner, with educators | Showing essay observations |
| H-B3 | Arrange educator annotation of the 15 benchmark essays (essay-validation-v1), so accuracy is measured against educators, not the synthetic reference | Owner | H-B2 |
| **C. Policy** | | | |
| H-C1 | Confirm the locked pilot policy (`essay-policy@2-draft`): one later check required where the evidence needs it, up to two more optional, retention at 7 days | Owner, with an educator | Pilot |
| H-C2 | Whether band 5 is the Grade 8 target for each pilot competency (D-5) | Educators (round 1) | Reporting any target |
| **D. Privacy and safeguarding** (PRIVACY_SAFEGUARDING_REQUIREMENTS.md) | | | |
| H-D1 | Essay consent: mechanism (verifiable parental consent), wording, child assent, and which processing steps it covers | Owner, data-protection reviewer (D11) | Real-child essays |
| H-D2 | Names and identifiers in essays: the rule (remove, replace, made-up names, or human review), and whether a flagged essay may be sent | Owner, data-protection reviewer | Real-child essays |
| H-D3 | Retention periods for essay text, analyses and rewrites; whether derived evidence is kept after deletion; where essays live | Owner, data-protection reviewer | Real-child essays |
| H-D4 | Model provider and its data terms (training, retention, location, children's-data agreement), or a pilot without a model | Owner, data-protection reviewer | Real-child essays with a model |
| H-D5 | Whether educators may see children's essays or results; if so, which educators, for how long, under what audit | Owner, host organisation | Educator access |
| H-D6 | Safeguarding: process for disclosures in essays, the safeguarding lead, the screening word list, and the wording a child sees | Host organisation's safeguarding lead, owner | Real-child essays |
| **E. Engineering, after decisions** | | | |
| H-E1 | Approve building the "now" items in PRIVACY_SAFEGUARDING_REQUIREMENTS.md (consent check, identifier flagging, deletion, retention sweep, provider list, safeguarding hold), all behind the disabled switch | Owner | D items |
