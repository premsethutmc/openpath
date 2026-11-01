/** frozen-replay-runtime@1: reproduce the original E1/E2A numerical runtime, without changing model or hashes.
 * Usage: node tools/english/research/frozen-runtime.mjs --test <tests...>
 *        node tools/english/research/frozen-runtime.mjs tools/mathematics/fingerprint-portability.mts /tmp/result.json
 * This launcher is for tests/research replay only; production inference does not import it.
 */
import { spawnSync } from 'node:child_process';
const options = spawnSync(process.execPath, ['--v8-options'], { encoding: 'utf8' });
if (options.status !== 0) throw Error('Cannot inspect the frozen-replay runtime');
// Node 24 changed fractional powers to std::pow. Its legacy V8 implementation preserves the recorded results.
const flags = options.stdout.includes('--use-std-math-pow') ? ['--no-use-std-math-pow'] : [];
const probe = spawnSync(process.execPath, [...flags, '-p', '0.5 ** (14 / 30)'], { encoding: 'utf8' });
if (probe.status !== 0 || probe.stdout.trim() !== '0.723634618720189') {
  throw Error(`Unsupported frozen-replay-runtime@1: ${process.version}; historical power behavior unavailable`);
}
const args = process.argv.slice(2);
if (!args.length) throw Error('Provide a replay script or test arguments');
console.error(`frozen-replay-runtime@1 node=${process.version} v8=${process.versions.v8} flags=${flags.join(' ') || '(historical default)'}`);
const result = spawnSync(process.execPath, [...flags, ...args], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.signal) throw Error(`Frozen replay terminated by ${result.signal}`);
process.exitCode = result.status ?? 1;
