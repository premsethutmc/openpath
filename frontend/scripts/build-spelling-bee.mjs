import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
const root = fileURLToPath(new URL("..", import.meta.url));
execFileSync(
  process.execPath,
  [
    `${root}/scripts/build-english.mjs`,
    "--spelling-only",
    "--out=dist-english-bee",
  ],
  { cwd: root, stdio: "inherit" },
);
const html = await readFile(`${root}/dist-english-bee/index.html`, "utf8");
await writeFile(
  `${root}/dist-english-bee/index.html`,
  html.replace(/<title>.*?<\/title>/, "<title>OpenPath Spelling Bee</title>"),
);
console.log(
  "Built standalone Spelling Bee in dist-english-bee; no general subject navigation.",
);

const manifest = JSON.parse(
  await readFile(`${root}/dist-english-bee/manifest.webmanifest`, "utf8"),
);
await writeFile(
  `${root}/dist-english-bee/manifest.webmanifest`,
  JSON.stringify(
    { ...manifest, name: "OpenPath Spelling Bee", short_name: "Spelling Bee" },
    null,
    2,
  ),
);
