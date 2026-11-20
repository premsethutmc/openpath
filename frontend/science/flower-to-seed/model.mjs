export const seeds = {
  dandelion: { name: 'Dandelion', carrier: 'wind', reason: 'plume', feature: 'Its light, feathery tuft catches moving air.' },
  coconut: { name: 'Coconut', carrier: 'water', reason: 'float', feature: 'Its fibrous husk helps the fruit float and protects the seed inside.' },
  burdock: { name: 'Burdock', carrier: 'animal', reason: 'hook', feature: 'Tiny hooks on the burr catch on fur and travel with the animal.' },
};

export const days = [
  { step: 0, title: 'Pollen lands', detail: 'Pollination means pollen reached the stigma. No seed has formed yet.' },
  { step: 1, title: 'The ovule is fertilised', detail: 'A tube grows from a pollen grain towards an ovule. A male cell joins the egg cell in the ovule. This is fertilisation.' },
  { step: 2, title: 'Seeds develop', detail: 'Fertilised ovules develop into seeds. In this mustard flower the ovary becomes a pod.' },
  { step: 3, title: 'The pod ripens', detail: 'The mature pod can split and scatter its seeds. A seed can grow into a new plant if conditions are right.' },
];
export function pollenPath(from, to, part) {
  if (![0,1].includes(from) || ![0,1].includes(to)) return 'empty';
  if (part !== 'stigma') return 'miss';
  return from === to ? 'self' : 'cross';
}
export function cycle(path, stage) {
  return path !== 'cross' || !Number.isInteger(stage) || stage < 0 ? null : days[stage] ?? null;
}
export function disperse(seed, carrier) {
  const data = seeds[seed];
  if (!data || !['wind','water','animal'].includes(carrier)) return null;
  return data.carrier === carrier;
}
const solutions = { carrier:'animal', reason:'hook', propagation:'potato-eye' };
export function checkTransfer(answers) {
  return Object.fromEntries(Object.entries(solutions).map(([key, value]) => [key,
    !answers[key] ? 'unanswered' : answers[key] === value ? 'correct' : 'try-again']));
}
