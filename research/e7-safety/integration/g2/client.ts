// The app's stored-answer comparison (content.ts canonical): readable = canonical(response) !== null; credit = equal canonical forms.
import { readFileSync, writeFileSync } from "node:fs";
const { canonical } = await import(process.argv[2] + "/packages/learning/src/content.ts");
const out = JSON.parse(readFileSync("cases.json", "utf8")).map((c: any) => { let cr: string | null = null, ca: string | null = null; try { cr = canonical({ type: c.type }, c.response); } catch { cr = null; } try { ca = canonical({ type: c.type }, c.stored); } catch { ca = null; } return { ...c, readable: cr !== null, credit: cr === null ? null : cr === ca }; });
writeFileSync(process.argv[3], JSON.stringify(out)); process.exit(0);
