import test from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "../../../packages/english-core/src/updater";
import { MemoryStore } from "../../../packages/english-core/src/store";
import {
  scoreCode,
  contentStatus,
} from "../../../packages/english-core/src/content";
import { loadContext } from "../../../tools/english/load";
import type { ProfileEvent } from "../english/logic/events";
import { competencies } from "../../../packages/mathematics/src/curriculum";
import {
  generate,
  families,
  type Family,
} from "../../../packages/mathematics/src/generator";
import {
  programFor,
  startProgram,
  updateProgram,
  programKey,
  completion,
  type ProgramRecord,
} from "../../../packages/mathematics/src/program";
import {
  preparePractice,
  contentWithPractice,
  sharedProfile,
  canonicalItemId,
} from "../../../packages/mathematics/src/canonical";
import {
  startExamJourney,
  schoolProgramLink,
} from "../../../packages/mathematics/src/exams";
const at = "2026-10-18T12:00:00.000Z";
const profile: ProfileEvent = {
  kind: "profile",
  id: "existing-profile:synthetic-karthik",
  name: "Synthetic Karthik",
  at,
  consent: { by: "guardian", scope: "this_device_only" },
  app: "test",
};
const identity = { learnerId: profile.id };
/** Explicit host-registration fixture, NOT a production MATH framework loader or new policy.
 * The unchanged core still loads EN only. Extend its index in memory for gate contract tests.
 */
function host() {
  const base = loadContext();
  const index = {
    ...base.index,
    leaves: new Map(base.index.leaves),
    leafIds: [...base.index.leafIds],
    names: new Map(base.index.names),
  };
  for (const c of competencies) {
    index.leaves.set(c.id, {
      id: c.id,
      name: c.name,
      tier: "planned",
      weight: 1,
    });
    index.leafIds.push(c.id);
    index.names.set(c.id, c.name);
  }
  return { ...base, index };
}
function attempt(
  family: Family,
  journey = "school",
  seed = 19,
  response?: string,
  id = "attempt-1",
) {
  const item = generate(family, seed),
    c = competencies.find((c) => c.id === item.competencyId)!,
    def = programFor(c);
  let r = startProgram(profile.id, journey, def);
  r = updateProgram(def, r, { kind: "complete", stage: "concept" });
  r = updateProgram(def, r, { kind: "complete", stage: "worked" });
  r = updateProgram(def, r, {
    kind: "attempt",
    receipt: {
      id,
      itemId: item.id,
      familyId: family,
      seed,
      stage: "guided",
      at,
      response: response ?? item.answer.value,
      correct: false,
      hints: 0,
      solutionSeen: false,
      elapsedMs: 8000,
    },
  });
  return { record: r, def, item };
}
async function commit(
  ledger: Ledger,
  store: MemoryStore,
  r: ProgramRecord,
  id = "attempt-1",
) {
  const packet = preparePractice(
    identity,
    ledger,
    r,
    id,
    `${r.journeyId}:session`,
  );
  ledger.ctx.content = contentWithPractice(ledger.ctx, [packet]);
  await store.append(packet.event);
  const decisions = ledger.apply(packet.event);
  return { packet, decisions };
}
test("one canonical learner: school fractions -> GRE Quant shares history, separate resume and zero mastery from generated practice", async () => {
  const ledger = new Ledger(host(), profile.id),
    store = new MemoryStore();
  const school = attempt("comparison"),
    competency = school.item.competencyId;
  const before = structuredClone(ledger.composite.nodes),
    schoolSaved = JSON.parse(JSON.stringify(school.record)) as ProgramRecord;
  const first = await commit(ledger, store, schoolSaved);
  assert.equal(first.decisions[0].verdict, "held");
  assert.match(first.decisions[0].reasons.join(), /provisional/);
  assert.equal(first.packet.sidecar.correct, true); // client correctness was false: recomputed
  assert.equal(first.packet.item.evidence_status, "provisional");
  assert.equal(first.packet.sidecar.admissible, false);
  const gre = startExamJourney(profile.id, "gre-quant");
  assert.ok(gre.programKeys.some((k) => JSON.parse(k)[2] === competency));
  assert.equal(
    schoolProgramLink(profile.id, competency),
    programKey(schoolSaved),
  );
  const exam = attempt("comparison", "gre-quant", 20),
    examSaved = JSON.parse(JSON.stringify(exam.record)) as ProgramRecord;
  const second = await commit(ledger, store, examSaved);
  assert.equal(second.decisions[0].observation?.exposure, "variant");
  assert.equal(second.decisions[0].verdict, "held");
  const completedSchool = updateProgram(school.def, schoolSaved, {
    kind: "complete",
    stage: "guided",
  });
  assert.equal(completion(school.def, completedSchool), 43);
  assert.equal(completion(exam.def, examSaved), 29);
  assert.equal(examSaved.current, "guided");
  assert.equal(completedSchool.current, "independent");
  assert.notEqual(programKey(completedSchool), programKey(examSaved));
  const persisted = JSON.stringify({
    [programKey(completedSchool)]: completedSchool,
    [programKey(examSaved)]: examSaved,
  });
  const resumed = JSON.parse(persisted);
  assert.equal(resumed[programKey(completedSchool)].current, "independent");
  assert.equal(resumed[programKey(examSaved)].current, "guided");
  assert.equal(Object.keys(resumed).length, 2);
  const repeat = await commit(
    ledger,
    store,
    attempt("comparison", "gre-quant", 19, undefined, "repeat").record,
    "repeat",
  );
  assert.equal(repeat.decisions[0].observation?.exposure, "repeat");
  assert.deepEqual(ledger.composite.nodes, before);
  assert.equal(
    sharedProfile(identity, ledger, competency, at).status,
    "unavailable",
  );
  assert.deepEqual(
    sharedProfile(identity, ledger, competency, at).evidenceIds,
    [],
  );
  assert.equal(gre.readiness, "not-estimated");
  const replay = Ledger.rebuild(ledger.ctx, profile.id, await store.events());
  assert.deepEqual(replay.composite, ledger.composite);
  assert.deepEqual(replay.decisions, ledger.decisions);
  assert.equal((await store.events()).length, 3);
  const duplicate = ledger.apply(first.packet.event);
  assert.equal(duplicate[0].verdict, "ignored");
  assert.deepEqual(ledger.composite.nodes, before);
});
test("all 14 families use native scoring and native provisional eligibility, including equivalent answers", () => {
  for (const family of Object.keys(families) as Family[]) {
    const ledger = new Ledger(host(), profile.id),
      a = attempt(family);
    const packet = preparePractice(
      identity,
      ledger,
      a.record,
      "attempt-1",
      "session",
    );
    ledger.ctx.content = contentWithPractice(ledger.ctx, [packet]);
    assert.equal(contentStatus(packet.item), "provisional");
    assert.equal(scoreCode(packet.item, packet.event.response).correct, true);
    const before = structuredClone(ledger.composite.nodes);
    assert.equal(ledger.apply(packet.event)[0].verdict, "held");
    assert.deepEqual(ledger.composite.nodes, before);
  }
  const ledger = new Ledger(host(), profile.id),
    a = attempt("trigonometry", "school", 2, "0.6");
  const packet = preparePractice(
    identity,
    ledger,
    a.record,
    "attempt-1",
    "session",
  );
  assert.equal(scoreCode(packet.item, packet.event.response).correct, true);
  assert.equal(packet.sidecar.receipt.response, "0.6");
});
test("same parameter variants retain native identity even when shuffled choice positions change", () => {
  const ledger = new Ledger(host(), profile.id),
    seen = new Map<string, ReturnType<typeof attempt>>();
  let checked = false;
  for (let seed = 1; seed < 10000; seed++) {
    const a = attempt("coordinate", "school", seed),
      previous = seen.get(a.item.fingerprint);
    if (previous && previous.item.answer.value !== a.item.answer.value) {
      const p = preparePractice(
          identity,
          ledger,
          previous.record,
          "attempt-1",
          "s",
        ),
        q = preparePractice(identity, ledger, a.record, "attempt-1", "s");
      assert.equal(p.item.id, q.item.id);
      assert.deepEqual(p.item, q.item);
      assert.deepEqual(p.event.response, q.event.response);
      checked = true;
      break;
    }
    seen.set(a.item.fingerprint, a);
  }
  assert.ok(checked);
});
test("identity, registration, version, receipt integrity and unsupported syntax fail before append", () => {
  const a = attempt("linear"),
    ledger = new Ledger(host(), profile.id);
  assert.throws(
    () =>
      preparePractice(
        { learnerId: "other" },
        ledger,
        a.record,
        "attempt-1",
        "s",
      ),
    /identity/,
  );
  assert.throws(
    () =>
      preparePractice(
        identity,
        new Ledger(loadContext(), profile.id),
        a.record,
        "attempt-1",
        "s",
      ),
    /not registered/,
  );
  assert.throws(
    () =>
      preparePractice(
        identity,
        ledger,
        { ...a.record, learnerId: "other" },
        "attempt-1",
        "s",
      ),
    /learner/,
  );
  assert.throws(
    () =>
      preparePractice(
        identity,
        ledger,
        { ...a.record, programVersion: "99" },
        "attempt-1",
        "s",
      ),
    /version/,
  );
  assert.throws(
    () =>
      preparePractice(
        identity,
        ledger,
        { ...a.record, journeyId: "unknown-track" },
        "attempt-1",
        "s",
      ),
    /Unregistered exam/,
  );
  const bad = structuredClone(a.record);
  bad.attempts[0].itemId = "untrusted";
  assert.throws(
    () => preparePractice(identity, ledger, bad, "attempt-1", "s"),
    /mismatch/,
  );
  const unsupported = attempt("polynomial", "school", 19, "sin(x)");
  assert.throws(
    () =>
      preparePractice(identity, ledger, unsupported.record, "attempt-1", "s"),
    /Unsupported/,
  );
  assert.equal(ledger.events.length, 0);
  assert.equal(
    sharedProfile(identity, ledger, "unregistered", at).status,
    "unavailable",
  );
});
test("hint and solution counts remain sidecar facts; unknown provenance is never fabricated as independent", () => {
  const a = attempt("linear"),
    ledger = new Ledger(host(), profile.id);
  a.record.attempts[0].hints = 2;
  a.record.attempts[0].solutionSeen = true;
  const packet = preparePractice(identity, ledger, a.record, "attempt-1", "s");
  assert.equal(packet.event.provenance, undefined);
  assert.equal(packet.sidecar.independence, "unknown");
  assert.equal(packet.sidecar.receipt.hints, 2);
  assert.equal(packet.sidecar.receipt.solutionSeen, true);
  assert.throws(
    () =>
      preparePractice(identity, ledger, a.record, "attempt-1", "s", {
        schema: "provenance@1",
        attempt: 1,
        hints: [],
        afterFeedback: false,
      }),
    /provenance/,
  );
  ledger.ctx.content = contentWithPractice(ledger.ctx, [packet]);
  assert.match(ledger.apply(packet.event)[0].reasons.join(), /provisional/);
});
test("real host presentation/hint provenance is linked and held; forged eligibility upgrade is rejected", () => {
  const a = attempt("linear"),
    ledger = new Ledger(host(), profile.id);
  a.record.attempts[0].hints = 1;
  const item = { id: canonicalItemId(a.item), version: 1 };
  ledger.apply({
    kind: "presented",
    id: "shown",
    at,
    session: "s",
    item,
    purpose: "practice",
  });
  ledger.apply({
    kind: "hint",
    id: "hint",
    at,
    session: "s",
    item,
    presented: "shown",
    level: 1,
    hintType: "host-example",
  });
  const packet = preparePractice(identity, ledger, a.record, "attempt-1", "s", {
    schema: "provenance@1",
    presented: "shown",
    attempt: 1,
    hints: ["hint"],
    afterFeedback: false,
  });
  ledger.ctx.content = contentWithPractice(ledger.ctx, [packet]);
  assert.equal(ledger.apply(packet.event)[0].verdict, "held");
  assert.equal(packet.sidecar.independence, "host-provenance");
  const bad = structuredClone(packet);
  (bad.item as { evidence_status: string }).evidence_status = "validated";
  assert.throws(() => contentWithPractice(ledger.ctx, [bad]), /upgraded/);
});
test("activity percentages deduplicate completion receipts and never use answer correctness", () => {
  const a = attempt("comparison");
  const duplicate = {
    ...a.record,
    completed: [...a.record.completed, ...a.record.completed],
  };
  assert.equal(completion(a.def, duplicate), 29);
  assert.deepEqual(a.record.independentEvidenceIds, []);
});

test("v1 inventory stays byte-for-byte frozen and audits cover all executable programs and families", async () => {
  const { readFileSync } = await import("node:fs");
  const { createHash } = await import("node:crypto");
  const raw = readFileSync(
    new URL("../../../content/mathematics/curriculum.v1.json", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "e4c17772945ff4ad1892b8839d99d3f1a5d149cebdaeb8d138ecfcc112df44d4",
  );
  const audit = JSON.parse(
    readFileSync(
      new URL("../../../docs/mathematics/audit.v1.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(audit.competencies, 200);
  assert.equal(audit.executableProgramAudit.length, 12);
  assert.equal(audit.familyAudit.length, 14);
  assert.ok(
    audit.executableProgramAudit.every(
      (p: { completeInstructionalProgram: boolean }) =>
        p.completeInstructionalProgram === false,
    ),
  );
});
test("identical stems with unused parameter changes replay as repeats, not fresh assessment", () => {
  const ledger = new Ledger(host(), profile.id),
    seen = new Map<string, ReturnType<typeof attempt>>();
  let checked = false;
  for (let seed = 1; seed < 4096; seed++) {
    const a = attempt("percent", "school", seed),
      previous = seen.get(a.item.statement);
    if (previous && previous.item.fingerprint !== a.item.fingerprint) {
      const p = preparePractice(
          identity,
          ledger,
          previous.record,
          "attempt-1",
          "school",
        ),
        q = preparePractice(
          identity,
          ledger,
          { ...a.record, journeyId: "gre-quant" },
          "attempt-1",
          "gre",
        );
      assert.equal(p.item.id, q.item.id);
      ledger.ctx.content = contentWithPractice(ledger.ctx, [p, q]);
      ledger.apply(p.event);
      assert.equal(ledger.apply(q.event)[0].observation?.exposure, "repeat");
      assert.equal(q.sidecar.admissible, false);
      checked = true;
      break;
    }
    seen.set(a.item.statement, a);
  }
  assert.ok(checked);
});

test("supported wrong answers remain wrong under the native codec for every family", () => {
  for (const family of Object.keys(families) as Family[]) {
    const item = generate(family, 19),
      wrong =
        item.answer.kind === "choice"
          ? item.answer.value === "A"
            ? "B"
            : "A"
          : item.answer.kind === "polynomial"
            ? "x^6"
            : "0";
    const a = attempt(family, "school", 19, wrong),
      ledger = new Ledger(host(), profile.id),
      packet = preparePractice(identity, ledger, a.record, "attempt-1", "s");
    assert.equal(packet.sidecar.correct, false);
    assert.equal(scoreCode(packet.item, packet.event.response).correct, false);
    ledger.ctx.content = contentWithPractice(ledger.ctx, [packet]);
    const before = structuredClone(ledger.composite.nodes);
    assert.equal(ledger.apply(packet.event)[0].verdict, "held");
    assert.deepEqual(ledger.composite.nodes, before);
  }
});

test("sharedProfile uses the canonical verification definition: schedule 'verified' on unreviewed answers is not verified mastery", async () => {
  // English agreement answered right across sessions far enough apart that the engine's schedule reads "verified":
  // none of these questions is educator-validated and released, so the one definition (H-V1–H-V3) does not verify
  const ctx = host();
  const ledger = new Ledger(ctx, profile.id);
  const SVA = "EN.GRM.VERB.sva";
  type C = { id: string; version: number; format: string; answer?: number; answers?: string[]; passage?: string };
  const pool = ([...ctx.content.items.values()] as unknown as (C & { kind: string; target: string })[]).filter((i) => i.kind === "code" && i.target === SVA && !i.passage && ((i.format.startsWith("choice") && i.answer !== undefined) || (i.format.startsWith("typed") && i.answers?.length)));
  const right = (it: C) => (it.format.startsWith("typed") ? { kind: "typed" as const, text: it.answers![0] } : { kind: "choice" as const, choice: it.answer! });
  let k = 0;
  for (const d of [0, 1, 9, 10, 25]) {
    for (let n = 0; n < 3 && k < pool.length; n++, k++) {
      const it = pool[k];
      const t = new Date(Date.parse("2026-09-01T09:00:00.000Z") + d * 86_400_000 + n * 60_000).toISOString();
      ledger.apply({ kind: "evidence", id: `sva:${d}:${n}`, at: t, session: `d${d}`, item: { id: it.id, version: it.version }, response: right(it), use: "assessment", provenance: { schema: "provenance@1", attempt: 1, hints: [], afterFeedback: false, policies: ["passage@1", "assisted@1"] } });
    }
  }
  const now = "2026-09-27T09:00:00.000Z";
  const view = (await import("../../../packages/english-core/src/composite")).leafView(ledger.composite, ctx.index, SVA, now);
  assert.equal(view.verification.status, "verified", "the engine's schedule passed its checks");
  const p = sharedProfile(identity, ledger, SVA, now);
  assert.notEqual(p.status, "verified", "but not on reviewed, released questions: not verified mastery");
  assert.equal(p.status, "demonstrated");
});

test("provisional mathematics practice never verifies mastery, however long and however right", async () => {
  const ledger = new Ledger(host(), profile.id),
    store = new MemoryStore();
  let competency = "";
  for (let d = 0; d < 30; d += 3) {
    const a = attempt("comparison", "school", 100 + d, undefined, `attempt-${d}`);
    competency = a.item.competencyId;
    const receipt = a.record.attempts[0];
    receipt.at = new Date(Date.parse(at) + d * 86_400_000).toISOString();
    const { decisions } = await commit(ledger, store, a.record, `attempt-${d}`);
    assert.equal(decisions[0].verdict, "held", "provisional: no estimate changes");
  }
  const later = new Date(Date.parse(at) + 40 * 86_400_000).toISOString();
  assert.notEqual(sharedProfile(identity, ledger, competency, later).status, "verified");
  const { verificationEligibility } = await import("../../../packages/english-core/src/verification");
  const elig = [...verificationEligibility(ledger.ctx, ledger.events).values()];
  assert.ok(elig.length >= 10 && elig.every((e) => e === "unreviewed"), "never eligible for verification");
});
