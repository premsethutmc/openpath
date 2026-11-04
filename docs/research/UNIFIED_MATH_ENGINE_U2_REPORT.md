# Unified Mathematics Engine U2

## Recommendation

**REVISE.** U2 closes both U1 revision findings: geometry now runs through a
persistent bounded protocol instead of one interpreter per assessment, and five
explicit proof-carrying transfer families share a typed obligation contract.
The system is suitable for continued integration testing, but the current
single-worker process has head-of-line blocking and is a server-runtime boundary,
not a browser runtime. Production packaging, observability, and multi-process
capacity remain deployment work.

## Base and dependencies

- Branch: `feat/unified-math-engine-u2`
- Base: U1 commit `015c567583f7d342ed2f16594c38b6717658b32c`
- Math core dependency: `93127dd709358982b923c05797405ec0aa539364`
- Geometry G4 dependency: `d1fb0265cd001ae147294d8e334213d2e4e2f966`
- Geometry integration base: `e1bdfcdf3c0dd0428c93da3957f77bceb36a4557`

The public `assessMathematicalWorking(problem, studentWorking, options)` API and
the `openpath-unified-math-assessment@1` envelope remain compatible with U1.
U2 adds optional typed transfer payloads and a `failureKind` distinction.

## Execution model

`geometry_reasoner.worker` is a persistent Python NDJSON worker using protocol
`openpath-geometry-worker@2`. The TypeScript client starts one worker for each
Python/root configuration and multiplexes requests by monotonically increasing
request ID. Concurrent callers share the same process; a request never invokes
a shell and cannot supply executable code.

Bounds and failure behavior:

- 1 MB maximum request and 2 MB maximum response;
- caller-controlled per-request timeout with a five-second default;
- geometry rule-application budget retained from G4;
- 512 MB address-space and 64-file-descriptor limits requested with Unix
  `setrlimit` (best effort on platforms without `resource`);
- deterministic, key-sorted JSON response serialization;
- protocol/version and operation validation on both sides;
- health request returns protocol, PID, status, and maximum RSS;
- malformed responses, writes, exits, timeout, and protocol violations reject
  every affected pending request and retire the worker;
- the next request starts a clean worker;
- transport failure is `unsupported` with `failureKind: transport`; a native
  mathematical unsupported verdict has no transport failure flag.

The worker is intentionally single-process and sequential internally. This
bounds resource use and avoids concurrent mutation in the Python reasoner, at
the cost of head-of-line blocking. A bounded pool can be introduced later
without changing the protocol.

## Mathematical obligation schema

`openpath-mathematical-obligation@2` represents expressions as a typed AST and
supports equality, inequality, nonzero, positivity, nonnegativity, domain
membership, angle equality/sum, segment equality, proportions, polynomial
equations, and Pythagorean relationships. Each obligation carries:

- its typed statement and stable ID;
- originating reasoner and source proof-step IDs;
- dependency references;
- assumptions and domain restrictions;
- asserted/derived/verified/discharged/unsupported status;
- reasoner-specific discharge evidence;
- contract version.

Strings are produced only at the established math-core adapter boundary. They
are not the cross-domain source of truth. Caller-supplied status is not trusted:
the coordinator promotes an obligation to verified only after the structured
geometry goal, proof, bindings, theorem family, and assumptions agree.

## Proof-state coordination and transfers

U2 uses explicit transfer rules rather than open-ended theorem search. It checks
that the geometry conclusion exactly matches the verified goal, quantity
bindings correspond to the relevant angles or sides, cited source steps exist,
dependency references are unique and acyclic, and family-specific assumptions
are present. Geometry evidence is attached before math-core receives the
obligation; math-core evidence is attached only after successful discharge.

Supported transfers:

1. **Triangle angle sum:** three bound angle expressions total 180°.
2. **Isosceles base angles:** a verified equal-angle conclusion transfers the
   two bound angle expressions as an equality.
3. **Similar triangles:** verified similarity transfers ratios of corresponding
   ordered sides; denominator nonzero obligations are mandatory.
4. **Pythagorean theorem:** a verified right-triangle squared-length conclusion
   transfers the typed polynomial relationship. Algebra first retains both
   square roots; a separate proof-state step selects the positive root using the
   nondegenerate segment-length assumption.
5. **Parallel-line angles:** a verified corresponding/alternate-angle theorem
   transfers the two bound angle expressions as an equality.

Alternative algebraic rearrangements remain accepted by math-core. Invalid
geometry blocks algebra dispatch, and correct geometry cannot repair an invalid
algebra step. Missing assumptions, contradictory premises, and unsupported
reasoning retain their separate outcomes.

## Independent U2 validation

The independently authored fixture generator records theorem/formula labels,
not engine-produced expected results. The 250 cases comprise:

| Category | Cases | Mismatches | Mean latency |
| --- | ---: | ---: | ---: |
| Triangle and angle reasoning | 40 | 0 | 2.048 ms |
| Isosceles relationships | 40 | 0 | 1.125 ms |
| Similarity and proportions | 40 | 0 | 1.031 ms |
| Pythagorean reasoning | 40 | 0 | 1.120 ms |
| Parallel-line angles | 40 | 0 | 1.049 ms |
| Cross-domain adversarial | 50 | 0 | 0.944 ms |

The cases include alternative routes, bad theorem citations, bad algebra,
missing nondegeneracy and parallel assumptions, zero-denominator safeguards,
positive-root selection, circular obligation dependencies, mismatched goals,
unknown proof-step sources, resource exhaustion, missing workers, malformed
transfers, and contradictory/unsupported geometry inherited from U1/G4.

- False acceptances: **0**
- False rejections: **0**
- Expected first-invalid-step matches: **250/250**

These figures describe the bounded corpus and are not a claim of general
mathematics coverage.

## Regression results

- `bun test packages/learning`: **779 passed, 0 failed**, 686 assertions across
  32 files. This includes all 775 U1/math-core tests and four U2 tests.
- U2 focused suite: **4 passed, 0 failed**, 268 assertions.
- U1 independent corpus: **200/200 still matches** through the preserved API.
- Geometry G2–G4: **47 passed, 0 failed**.
- `python3 -m compileall -q geometry_reasoner tests`: passed.

## Runtime measurements

Measured in the cloud Linux runtime with Bun 1.4.4 and Python 3:

- Worker cold start and health response: **40.058 ms**.
- 100 warm sequential assessments: **1.223 ms mean**.
- 50 concurrently submitted assessments: **51.057 ms total**.
- Worker PID remained stable across repeated and concurrent requests.
- Worker maximum RSS: **33,380 KB before and after** the benchmark.
- Forced termination was detected; the following request started a new PID and
  succeeded.
- A zero deadline returned an explicit transport timeout; a following algebra
  request remained verified.

The measurements exercise the intended local server runtime. They do not cover
container orchestration, Windows, mobile browsers, or production traffic.

## Unsupported capabilities and risks

- Cross-domain transfer families beyond the five listed above.
- Natural-language or diagram-derived geometry facts.
- Arbitrary theorem search or arbitrary expression functions such as radicals.
- Distributed workers, admission control, request cancellation without retiring
  the single worker, and production telemetry.
- Python address-space enforcement on platforms without Unix `resource`.
- General sign reasoning beyond explicitly carried geometric domain assumptions.

Before merge, exercise the protocol in the exact application container, decide
whether one worker per application process is sufficient, and add operational
metrics. Mathematical rule libraries, mastery logic, UI, and teaching systems
were not changed.
