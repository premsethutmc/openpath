/** Synthetic D2 method-stage adapter v2. Frozen corpus, labels and historical default stay unchanged. */
import methods from './u2.method.v2.json';
import { fixture, type D2BenchmarkCase } from '../reasoning-depth-d2/benchmark-fixtures';
const geometryStage = methods.cases.find(c => c.problem.transfer.family === 'triangle-angle-sum' && c.expected.classification === 'verified');
if (!geometryStage) throw new Error('method v2 needs an authored triangle-sum stage');
export function methodFixture(item: D2BenchmarkCase) { return fixture(item, geometryStage); }
