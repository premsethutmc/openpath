const [root, out] = process.argv.slice(2);
const fs = await import("node:fs"); fs.mkdirSync(out, { recursive: true });
const m = await import(root + "/frontend/src/learning/phase4-scenarios.ts");
for (const [k, f] of Object.entries(m.PHASE4_SCENARIOS)) { const t0 = Date.now(); try { const r = await f(); fs.writeFileSync(`${out}/${k}.json`, JSON.stringify(r, null, 1) + "\n"); console.log(k, "ok", Date.now() - t0, "ms"); } catch (e) { console.log(k, "ERROR", String(e).slice(0, 200)); } }
process.exit(0);
