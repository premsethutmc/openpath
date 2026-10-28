// Grading audit, step 3: production verdicts from the app's own grading code, in process, for every oracle candidate.
//   client : grade.ts decide()            — what the app shows and records (the browser route)
//   kernel : server-grader.ts gradeRequest — what the trusted Node grader returns to Django (the bundle is checked for parity separately)
// Usage: bun run-client.ts data/oracle data/client   (resumable: a family whose output exists is skipped)
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decide } from "../../../packages/learning/src/grade.ts";
import { gradeRequest } from "../../../packages/learning/src/server-grader.ts";

const [src, dst] = process.argv.slice(2);
mkdirSync(dst, { recursive: true });
const files = readdirSync(src).filter((f) => f.endsWith(".json")).sort();
let n = 0, skipped = 0;
for (const f of files) {
  const out = join(dst, f);
  if (existsSync(out)) { skipped++; continue; }
  const fam = JSON.parse(readFileSync(join(src, f), "utf8"));
  const rows: unknown[] = [];
  for (const q of fam.questions) {
    for (const c of q.candidates) {
      let client: Record<string, unknown>, kernel: Record<string, unknown>;
      try {
        const a = decide(q.qid, c.response, c.working);
        client = { credit: a.credit, source: a.evidence.source, unresolved: a.evidence.unresolved, methodExamined: a.evidence.methodExamined, feedback: a.feedback.kind, recordAs: a.recordAs ?? null };
      } catch (e) { client = { error: String((e as Error).message).slice(0, 200) }; }
      try {
        const k = gradeRequest({ id: q.qid, response: c.response, working: c.working });
        kernel = { verification: k.verification, credit: k.credit, capability: k.capability };
      } catch (e) { kernel = { error: String((e as Error).message).slice(0, 200) }; }
      rows.push({ qid: q.qid, response: c.response, working: c.working, client, kernel });
      n++;
    }
  }
  writeFileSync(out + ".tmp", JSON.stringify({ family: fam.family, rows }));
  renameSync(out + ".tmp", out);
}
console.log(`client verdicts: ${n} candidates, ${files.length - skipped} families run, ${skipped} cached`);
