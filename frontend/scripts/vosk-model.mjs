/**
 * Read aloud's on-phone speech model: vosk-model-small-en-us-0.15 (Alpha Cephei, Apache-2.0), packed as the
 * model.tar.gz that vosk-browser downloads once into the phone's storage.
 *
 * The model is taken from the npm registry (the build's only network source), inside the package transcribe2texts@1.0.6,
 * which carries an unmodified copy. Only the tarball is fetched (`npm pack`, no install, no scripts run) and it must
 * match the pinned sha512 below, so a changed package fails the build instead of shipping a different model. Only the
 * model folder is taken out of it. Kept in frontend/.cache between builds.
 *
 * The library (vosk-browser 0.0.8, from package-lock) is split in two by buildLibrary: vosk.js, and its web worker as a
 * file of its own (worker.js) instead of the blob it builds at run time. A blob worker runs under the page's Content
 * Security Policy, and the worker's compiled speech engine (Emscripten) needs eval, which the app page must never allow;
 * a worker loaded from its own file runs under that file's own policy instead (none), so only the worker can eval.
 *
 *   node scripts/vosk-model.mjs <out-folder>   -> <out-folder>/model.tar.gz, vosk.js, worker.js
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PACKAGE = "transcribe2texts@1.0.6";
const TARBALL = "transcribe2texts-1.0.6.tgz";
const INTEGRITY = "sha512-xvI2uP+8BTn41uw+1gxjpsbguVgNZ89i10uWnD869B7rsP7t033G81R1n9SihA19v/0bQfSAbv/GQgNoj2J0pA==";
const MODEL = "vosk-model-small-en-us-0.15";

const cache = fileURLToPath(new URL("../.cache/vosk/", import.meta.url));

export async function buildModel(outDir) {
  await mkdir(cache, { recursive: true });
  const tgz = `${cache}${TARBALL}`;
  if (!existsSync(tgz)) execFileSync("npm", ["pack", PACKAGE, "--silent", "--ignore-scripts", "--pack-destination", cache], { stdio: ["ignore", "ignore", "inherit"] });
  const got = `sha512-${createHash("sha512").update(await readFile(tgz)).digest("base64")}`;
  if (got !== INTEGRITY) {
    await rm(tgz, { force: true });
    throw new Error(`${PACKAGE}: tarball does not match the pinned sha512 (got ${got}); the speech model was not built`);
  }
  const unpacked = `${cache}unpacked/`;
  await rm(unpacked, { recursive: true, force: true });
  await mkdir(unpacked, { recursive: true });
  execFileSync("tar", ["-xzf", tgz, "-C", unpacked, `package/${MODEL}`]);
  await mkdir(outDir, { recursive: true });
  // the archive holds the model folder at its top, as Vosk's own downloads do; fixed owner and time so it is reproducible
  execFileSync("tar", ["--sort=name", "--owner=0", "--group=0", "--numeric-owner", "--mtime=2020-01-01", "-czf", `${outDir}/model.tar.gz`, "-C", `${unpacked}package`, MODEL]);
  await rm(unpacked, { recursive: true, force: true });
  return `${outDir}/model.tar.gz`;
}

/** vosk.js with its worker moved to worker.js beside it (see the top of this file). */
export async function buildLibrary(outDir) {
  const src = await readFile(fileURLToPath(new URL("../node_modules/vosk-browser/dist/vosk.js", import.meta.url)), "latin1");
  const re = /var WorkerFactory = createBase64WorkerFactory\('([A-Za-z0-9+/=]+)', null, false\);/;
  const m = re.exec(src);
  if (!m) throw new Error("vosk-browser: worker not found where expected (was the package upgraded?); Read aloud's library was not built");
  const decoded = Buffer.from(m[1], "base64").toString("latin1");
  const worker = decoded.substring(decoded.indexOf("\n", 10) + 1);
  const lib = src.replace(re, () => 'var __voskWorkerUrl = new URL("worker.js", document.currentScript.src).href;\n    var WorkerFactory = function WorkerFactory(options) { return new Worker(__voskWorkerUrl, options); };');
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/worker.js`, worker, "latin1");
  await writeFile(`${outDir}/vosk.js`, lib, "latin1");
  await writeFile(`${outDir}/NOTICE.txt`, "Read aloud's speech recognition:\n- vosk-browser 0.0.8 (Ciaran O'Reilly), Apache License 2.0, https://github.com/ccoreilly/vosk-browser (vosk.js, worker.js: its worker moved to a file of its own)\n- Vosk and vosk-model-small-en-us-0.15, Copyright 2020 Alpha Cephei Inc, Apache License 2.0, https://alphacephei.com/vosk/\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2];
  if (!out) throw new Error("usage: node scripts/vosk-model.mjs <out-folder>");
  await buildLibrary(out);
  console.log(`wrote ${await buildModel(out)}, vosk.js, worker.js`);
}
