# Unified Mathematics Engine U2.1 Hardening

## Recommendation

**MERGE READY for the execution-boundary scope.** The bounded worker pool
removes U2's single-worker head-of-line failure while preserving all U1/U2
mathematical verdicts. The representative container passes, but production
orchestrator limits and monitoring export still need application-level wiring.

## Architecture audit

U2 sent every request to one persistent Python process. The worker's stdin loop
is synchronous, so request N+1 could not be read until request N completed. The
TypeScript client allowed multiple pending IDs, but concurrency existed only in
the transport map; execution remained serial. A slow proof therefore delayed
every unrelated geometry request.

U2.1 creates a configurable pool (default 2, range 1–16). Each worker accepts
one active request. A central FIFO queue is bounded (default 128, maximum
10,000), and dispatches only to idle workers. No request spawns a process;
workers persist and are replaced lazily after failure.

Configuration:

- `OPENPATH_GEOMETRY_WORKERS`, or `geometryWorkerCount` per API call;
- `OPENPATH_GEOMETRY_QUEUE`, or `geometryQueueLimit` per API call;
- `OPENPATH_GEOMETRY_MEMORY_BYTES` for the Python address-space limit;
- `geometryTimeoutMs` covers queue wait plus execution;
- `signal` supports cancellation without changing the public function.

`assessMathematicalWorking(problem, studentWorking, options)` remains the public
entry point. Mathematical rules and obligation semantics were not changed.

## Queue, deadlines, and lifecycle

Every queued job receives an absolute monotonic deadline at admission. Expired
jobs are rejected before dispatch. Execution receives only the remaining time.
A running timeout or cancellation kills that worker because synchronous Python
cannot safely interrupt one proof in-process; other workers continue. A queued
cancellation removes only that job.

Queue capacity excludes currently executing jobs. When all workers are busy and
the pending bound is reached, admission returns `queue-full` immediately.
Shutdown rejects queued work as `shutdown`, permits active work to drain for the
configured grace interval, then sends SIGTERM. Tests verify that child PIDs are
gone afterward.

There is no automatic assessment retry. Assessment is read-only, but an
indeterminate worker crash may occur after computation, so silently retrying
would hide operational failure and distort latency. The failed request returns
its infrastructure outcome; the next request uses a replacement worker.

## Failure taxonomy

Mathematical `invalid`, mathematical `unsupported`, and mathematical
`resource-exhausted` retain their U2 meanings. Infrastructure failure returns
classification `unsupported`, `failureKind: transport`, and one explicit
`infrastructureFailure` value:

- `transport`, `worker-crash`, `timeout`, `queue-full`, `shutdown`, `cancelled`,
  `request-too-large`, `response-too-large`, or `protocol`.

Infrastructure failure is never student-error evidence. Failure of a geometry
worker does not mutate or disable math-core.

## Resource and security controls

- Request and response limits remain 1 MB and 2 MB.
- Worker address space defaults to 512 MB with Unix `setrlimit`; file
  descriptors are limited to 64.
- Rule applications and wall-clock deadlines bound computation.
- Submitted proofs are limited to 2,048 steps and dependency graphs to 8,192
  cited edges; excess returns mathematical resource exhaustion.
- Workers are separate unprivileged processes in the test container.
- `spawn` receives a fixed module argv without a shell. Student text is JSON
  data and is never evaluated or interpolated into a command.
- Protocol, operation, response ID, serialization, and payload shape are
  checked. Request-response correlation is exact per worker.
- The operator-only delay hook used by fault tests requires a matching
  environment variable; student data alone cannot enable it and delay is capped
  at five seconds.

For a persistent process, an OS CPU limit would be cumulative rather than
per-request. U2.1 therefore uses theorem-operation budgets plus a wall deadline;
timeout retires the process. Container CPU quotas remain an orchestrator concern.

## Operational metrics

The pool records aggregate values only; it does not record mathematical content,
student identifiers, or problem text:

- admitted and completed requests;
- native outcome counts and infrastructure failure counts;
- current and high-water queue depth;
- queue-wait samples and p50/p95/p99;
- execution-latency samples and p50/p95/p99;
- busy workers, starts, crashes/restarts, and PIDs;
- maximum worker RSS returned by health checks.

Metrics are available through `geometryWorkerDiagnostics`. Export to the
application's telemetry backend is deliberately outside this engine change.

## Independent concurrency and fault validation

The dedicated suite passes **6 tests / 19 assertions**:

- 100 simultaneous short assessments: all verified through two persistent
  workers;
- mixed slow/short: a 300 ms request on one worker did not prevent a short
  request meeting its 200 ms deadline on the other;
- one active plus one queued request saturated a one-worker/one-queue pool;
- queued cancellation returned `cancelled` and preserved the active request;
- three repeated worker terminations were isolated and replacement requests
  verified; algebra remained operational;
- graceful shutdown drained an in-flight request and left no live child PID;
- a 2,049-step proof returned resource exhaustion.

The existing suites also cover malformed payloads, cyclic and repeated proof
dependencies, contradictory premises, oversized algebra, computation budgets,
and unsupported relations.

## Performance

Cloud Linux, Bun 1.4.4, Python 3.12, four workers:

- cold four-worker health startup: **52.990 ms**;
- 500 concurrent assessments: **500 verified in 511.434 ms**;
- throughput: **977.64 assessments/s**;
- worker execution latency: **p50 3.671 ms, p95 6.589 ms, p99 8.989 ms**;
- queue wait under the 500-request burst: **p50 295.791 ms, p95 486.968 ms,
  p99 501.360 ms**;
- queue high-water: **496**;
- worker RSS: **32,740–35,172 KB**;
- forced-worker replacement and verified response: **40.234 ms**.

The burst intentionally queues almost all work at once; queue wait therefore
dominates end-to-end latency. Capacity and admission bounds must be configured
for the service's target latency and memory budget.

## Mathematical regression results

- Full TypeScript/math-core/unified suite: **785 passed, 0 failed** across 33
  files after adding six hardening tests.
- U1 independently labelled corpus: **200/200 unchanged**.
- U2 independently labelled corpus: **250/250 unchanged**, with zero false
  acceptances and zero false rejections.
- Geometry G2–G4: **47 passed, 0 failed**.
- Python compilation: passed.

## Representative container validation

`deploy/unified-math-engine/Dockerfile` uses the published Bun 1.4.4 runtime and
Python 3.12 slim image, copies the Bun executable into the Python runtime, runs
as UID 10001, and contains no application secrets or database.

Verified locally without deployment:

- image build completed;
- Bun and Python worker started with repository-relative paths and readable
  permissions;
- protocol health check passed;
- a real proof-carrying assessment returned `verified`;
- a second fresh container health run passed;
- SIGTERM through `docker stop` triggered graceful pool shutdown and the
  container exited with status 0; its worker children were reaped.

This is representative rather than full production validation because the
production scheduler, CPU/memory quotas, replica count, load balancer, and
telemetry backend are not defined in this repository task.

## Remaining risks

- Metrics are in-process and reset on application restart until exported.
- FIFO has no priority classes; a full queue rejects new work by design.
- Cancelling active synchronous work retires its whole worker.
- Each application replica owns its own pool and queue; global admission control
  requires infrastructure configuration.
- Unix address-space enforcement is best effort on platforms without `resource`.
- Queue sizing and worker count require production load objectives.

Within these explicit limits, the acceptance criterion is met: a stalled,
crashed, cancelled, or exhausted worker does not block independent requests
when another worker has capacity, and mathematical outputs remain identical.
