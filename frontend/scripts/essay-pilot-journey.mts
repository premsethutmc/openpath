/** Pilot validation v1, task E: run the synthetic journey and write its report (see src/english/logic/essay-live/pilot-journey.ts). */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/english/logic/content.ts";
import { journeyMarkdown, runPilotJourney } from "../src/english/logic/essay-live/pilot-journey.ts";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "product", "essay-learning", "pilot-validation-v1");
const report = await runPilotJourney(loadContent());
writeFileSync(join(out, "SYNTHETIC_JOURNEY.md"), journeyMarkdown(report));
console.log(report.stages.map((s) => `${s.n}. ${s.stage}: ${s.status}`).join("\n"));
