// Imagined conversations, not quotations or transcripts.
export const people = Object.freeze({ raman: 'Raman', dev: 'Dev' });
export const lines = Object.freeze({
  salt: { speaker: 'raman', prompt: 'Why salt?', text: 'You need salt just as much as I do. But under British rule we aren’t free to gather our own, even on the shore. A law about salt reaches every kitchen.' },
  walk: { speaker: 'dev', prompt: 'Why walk all this way?', text: 'So people along the road can see us and ask what we’re doing. You stopped to ask, didn’t you? Some people watch. Some walk beside us for a while.' },
  shore: { speaker: 'raman', prompt: 'What will you do at the shore?', text: 'Look for salt left by the sea. Gandhi will pick some up in front of everyone. It’s a small thing to hold in your hand, but the law says he cannot take it.' },
  peaceful: { speaker: 'dev', prompt: 'Why keep it peaceful?', text: 'We want to change the law, not hurt anybody. We’ll break this one law openly and without violence. They may arrest us, but everyone will know why we did it.' },
});
export const stages = Object.freeze([
  { place: 'Sabarmati Ashram', date: '12 March 1930', hint: 'Fall into step. Gandhi is up ahead.' },
  { place: 'On the road through Gujarat', date: 'Later that March', hint: 'Walk beside Raman and Dev, or ask them something.' },
  { place: 'Dandi shore', date: '6 April 1930', hint: 'Follow the marchers down to the water.' },
  { place: 'Dandi shore', date: '6 April 1930', hint: 'A handful of salt. A law broken in public, without violence.' },
]);
export const initial = () => ({ position: 0, stage: 0 });
export function advance(state, distance) {
  const position = Math.min(3, Math.round((state.position + Math.max(0, Number.isFinite(distance) ? distance : 0)) * 1e6) / 1e6);
  return { position, stage: Math.floor(position) };
}
export function answer(id, stage) {
  return stage === 1 && Object.hasOwn(lines, id) ? lines[id] : null;
}
