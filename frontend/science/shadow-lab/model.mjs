export const ROOM = Object.freeze({ near: 64, far: 226, start: 132, object: 288, wall: 455, halfHeight: 12 });
export const MATERIALS = Object.freeze({
  cardboard: Object.freeze({ label: 'Cardboard', kind: 'Opaque', transmission: 0, blur: 0.35, note: 'Cardboard blocks the beam. Its shadow is dark and sharp.' }),
  tracing: Object.freeze({ label: 'Tracing paper', kind: 'Translucent', transmission: 0.56, blur: 3.8, note: 'Tracing paper scatters some of the light. The shadow is softer and lighter.' }),
  clear: Object.freeze({ label: 'Clear plastic', kind: 'Transparent', transmission: 0.96, blur: 0.35, note: 'Clear plastic lets almost all the light through. The shadow nearly disappears.' }),
});

export function shadowAt(torchX) {
  const x = Math.max(ROOM.near, Math.min(ROOM.far, Number.isFinite(torchX) ? torchX : ROOM.start));
  // Similar triangles from a centered point source through the cutout to the wall.
  const lightToObject = ROOM.object - x;
  const scale = (ROOM.wall - x) / lightToObject;
  return { x, lightToObject, scale, wallHalfHeight: ROOM.halfHeight * scale };
}
