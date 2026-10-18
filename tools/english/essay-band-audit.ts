/**
 * Grade 8 target-band audit: why does a learner who completes the essay journey stay below band 5?
 *
 * For every specified competency in the Grade 8 profile it reports the question bank's difficulty coverage and
 * simulates, with the real ledger and estimator (no shortcuts), how much independent evidence it takes to
 * reach the draft target:
 *   journey    the acceptance path: 2 wrong + 1 right diagnostic, 3 assisted practice (held), 2 right checks
 *   all-right  a learner who answers every unseen question right, 3 per session on separate days
 *   easy-only  the same, using only questions below the target band
 *
 *   node tools/english/essay-band-audit.ts            prints JSON
 *   node tools/english/essay-band-audit.ts --md       prints the Markdown table used in the docs
 */
import { type CodeItem, contentStatus, type EvidenceEvent, type Item, Ledger, type LedgerEvent, leafView, type Response, scoreCode } from "../../packages/english-core/src/index.ts";
import { loadEssayContext } from "./essay-load.ts";

const ectx = loadEssayContext();
const DAY = 86_400_000;
const T0 = Date.parse("2026-10-18T09:00:00.000Z");

function respond(item: CodeItem, right: boolean): Response {
  const kind = item.format.split(":")[0];
  const tries: Response[] =
    kind === "choice" ? [...Array(item.options?.length ?? 4).keys()].map((choice) => ({ kind: "choice" as const, choice }))
    : kind === "typed" ? [{ kind: "typed", text: item.answers![0] }, { kind: "typed", text: "qqqq" }]
    : kind === "multi" ? [{ kind: "multi", choices: [...(item.answer_set ?? [])] }, { kind: "multi", choices: [] }]
    : kind === "match" ? [{ kind: "match", pairs: [...(item.answer_pairs ?? [])] }, { kind: "match", pairs: [...(item.answer_pairs ?? [])].reverse() }]
    : [{ kind: "order", order: [...(item.answer_order ?? [])] }, { kind: "order", order: [...(item.answer_order ?? [])].reverse() }];
  return tries.find((r) => scoreCode(item, r).correct === right)!;
}

let n = 0;
const ev = (item: Item & CodeItem, right: boolean, day: number, session: string, assisted = false): EvidenceEvent => ({
  kind: "evidence",
  id: `a${++n}`,
  at: new Date(T0 + day * DAY + n * 1000).toISOString(),
  session,
  item: { id: item.id, version: item.version },
  response: respond(item, right),
  use: assisted ? "practice" : "assessment",
  provenance: { schema: "provenance@1", attempt: 1, hints: assisted ? ["h"] : [], afterFeedback: false, policies: ["passage@1"] },
});

const level = (events: LedgerEvent[], cap: string) => {
  const l = Ledger.rebuild(ectx.ctx, "audit", events);
  const v = leafView(l.composite, ectx.ctx.index, cap, events.at(-1)?.at ?? new Date(T0).toISOString());
  return { level: v.verification.currentLevel, status: v.verification.status, mean: Math.round(v.direct.mean * 100) / 100, sd: Math.round(v.direct.sd * 100) / 100, n: v.direct.n };
};

/** Answer questions right, 3 per session on separate days, until the target is reached. */
function climb(cap: string, pool: (Item & CodeItem)[], target: number) {
  const events: LedgerEvent[] = [];
  let day = 0;
  for (let i = 0; i < pool.length; i++) {
    events.push(ev(pool[i], true, day, `d${day}`));
    if (i % 3 === 2) day++;
    const l = level(events, cap);
    if (l.level !== null && l.level >= target) return { reached: true, answers: i + 1, sessions: day + 1, ...l };
  }
  return { reached: false, answers: pool.length, sessions: day + 1, ...level(events, cap) };
}

const rows = ectx.profile.profile.competencies
  .filter((c) => c.specified)
  .map((c) => {
    const target = c.expectedBand!;
    const pool = (ectx.ctx.content.byCapability.get(c.capability) ?? [])
      .filter((i): i is Item & CodeItem & { kind: "code" } => i.kind === "code" && contentStatus(i) !== "practice")
      .sort((a, b) => a.b - b.b || a.id.localeCompare(b.id));
    const bs = pool.map((i) => i.b);
    // the acceptance journey: diagnostic (2 wrong, 1 right), practice (assisted), checks (2 right) in a later session
    const j: LedgerEvent[] = [];
    const mid = pool.slice(Math.floor(pool.length / 3));
    [false, false, true].forEach((r, k) => mid[k] && j.push(ev(mid[k], r, 0, "s1")));
    mid.slice(3, 6).forEach((it) => j.push(ev(it, true, 0, "s1", true)));
    mid.slice(6, 8).forEach((it) => j.push(ev(it, true, 1, "s2")));
    // after the journey: further independent right answers on unseen questions at or above the target, one per day
    const after = [...j];
    const usedIds = new Set(j.map((e) => (e as EvidenceEvent).item.id));
    let extra = 0;
    let reachedAfter = false;
    for (const it of pool.filter((i) => i.b >= target && !usedIds.has(i.id))) {
      after.push(ev(it, true, 2 + extra, `x${extra}`));
      extra++;
      const l = level(after, c.capability);
      if (l.level !== null && l.level >= target) {
        reachedAfter = true;
        break;
      }
    }
    const leaf = ectx.ctx.index.leaves.get(c.capability)!;
    return {
      capability: c.capability,
      name: c.name,
      target,
      items: pool.length,
      b: { min: Math.min(...bs), median: bs[Math.floor(bs.length / 2)], max: Math.max(...bs) },
      atOrAboveTarget: bs.filter((b) => b >= target).length,
      journey: level(j, c.capability),
      afterJourney: { reached: reachedAfter, extraAnswers: extra },
      allRight: climb(c.capability, pool.slice().sort((a, b) => b.b - a.b), target),
      easyOnly: climb(c.capability, pool.filter((i) => i.b < target), target),
      band4: leaf.bands?.["4"] ?? null,
      band5: leaf.bands?.["5"] ?? null,
      cefr: leaf.references?.cefr ?? [],
      cbse: leaf.references?.cbse ?? null,
    };
  });

if (process.argv.includes("--md")) {
  const lines = [
    "| Competency | Questions (b ≥ 5) | b range | Journey path → level | Then: right answers at b ≥ 5 to reach 5 | From scratch, all right | Easy questions only (b < 5) |",
    "|---|---:|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.name} | ${r.items} (${r.atOrAboveTarget}) | ${r.b.min}–${r.b.max} | ${r.journey.level ?? "—"} (${r.journey.status}) | ${r.afterJourney.reached ? `${r.afterJourney.extraAnswers} more` : `not reached with ${r.afterJourney.extraAnswers}`} | ${r.allRight.reached ? `${r.allRight.answers} answers, ${r.allRight.sessions} sessions` : `not reached (level ${r.allRight.level ?? "—"})`} | ${r.easyOnly.reached ? `${r.easyOnly.answers} answers` : `never (stops at ${r.easyOnly.level ?? "—"})`} |`,
    ),
  ];
  console.log(lines.join("\n"));
} else console.log(JSON.stringify(rows, null, 2));
