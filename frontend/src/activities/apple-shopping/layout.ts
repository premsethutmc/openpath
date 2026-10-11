/** Where everything sits, for wide and tall screens. Units are viewBox units. */

export interface Point {
  x: number;
  y: number;
}

export interface Layout {
  portrait: boolean;
  w: number;
  h: number;
  shop: {
    shelfPerRow: number;
    shelfSpacing: number;
    shelfRows: Record<number, number[]>;
    shelfPanel: { y: number; h: number };
    basket: { cx: number; rows: number[]; perRow: number; spacing: number; width: number; y: number };
    dropZone: { x1: number; y1: number; x2: number; y2: number };
    mom: Point & { scale: number };
    list: Point & { w: number; h: number };
    button: Point;
    floorY: number;
  };
  home: {
    mom: Point & { scale: number };
    list: Point & { w: number; h: number };
    button: Point;
    floorY: number;
    table: { y: number; cx: number; width: number; perRow: number; spacing: number; rows: number[] };
  };
}

export const FRUIT_R = 36;

const LANDSCAPE: Layout = {
  portrait: false,
  w: 1000,
  h: 640,
  shop: {
    shelfPerRow: 9,
    shelfSpacing: 100,
    shelfRows: { 1: [238], 2: [190, 292] },
    shelfPanel: { y: 100, h: 250 },
    basket: { cx: 310, rows: [546, 486, 426], perRow: 6, spacing: 68, width: 470, y: 528 },
    dropZone: { x1: 40, y1: 372, x2: 580, y2: 640 },
    mom: { x: 690, y: 628, scale: 0.92 },
    list: { x: 872, y: 425, w: 176, h: 196 },
    button: { x: 872, y: 590 },
    floorY: 560,
  },
  home: {
    mom: { x: 210, y: 612, scale: 1.22 },
    list: { x: 590, y: 280, w: 310, h: 360 },
    button: { x: 590, y: 566 },
    floorY: 520,
    table: { y: 430, cx: 630, width: 660, perRow: 10, spacing: 112, rows: [392] },
  },
};

const PORTRAIT: Layout = {
  portrait: true,
  w: 640,
  h: 1000,
  shop: {
    shelfPerRow: 6,
    shelfSpacing: 98,
    shelfRows: { 1: [262], 2: [212, 314], 3: [168, 264, 360] },
    shelfPanel: { y: 100, h: 320 },
    basket: { cx: 212, rows: [846, 786, 726], perRow: 6, spacing: 64, width: 430, y: 828 },
    dropZone: { x1: 0, y1: 650, x2: 430, y2: 1000 },
    mom: { x: 520, y: 886, scale: 0.78 },
    list: { x: 520, y: 552, w: 176, h: 196 },
    button: { x: 510, y: 944 },
    floorY: 860,
  },
  home: {
    mom: { x: 150, y: 930, scale: 1.02 },
    list: { x: 320, y: 300, w: 330, h: 380 },
    button: { x: 448, y: 800 },
    floorY: 820,
    table: { y: 470, cx: 320, width: 580, perRow: 5, spacing: 112, rows: [470, 580] },
  },
};

export const layoutFor = (width: number, height: number): Layout => (width / height < 0.95 ? PORTRAIT : LANDSCAPE);

/** Centre n things into rows of at most perRow. */
export function rowsOf(n: number, perRow: number, spacing: number, cx: number, ys: number[]): Point[] {
  const points: Point[] = [];
  const rowCount = Math.ceil(n / perRow);
  for (let row = 0; row < rowCount; row++) {
    const count = Math.min(perRow, n - row * perRow);
    for (let i = 0; i < count; i++) points.push({ x: cx + (i - (count - 1) / 2) * spacing, y: ys[row] });
  }
  return points;
}

export function shelfSlots(layout: Layout, n: number): Point[] {
  const { shelfPerRow, shelfSpacing, shelfRows } = layout.shop;
  const rows = Math.max(1, Math.ceil(n / shelfPerRow));
  // Spread items evenly over the rows rather than leaving a short last row.
  const perRow = Math.ceil(n / rows);
  return rowsOf(n, perRow, shelfSpacing, layout.w / 2, shelfRows[rows]);
}

export function basketSlot(layout: Layout, index: number): Point {
  const { cx, rows, perRow, spacing } = layout.shop.basket;
  const row = Math.min(rows.length - 1, Math.floor(index / perRow));
  const column = index % perRow;
  // Each higher row is nudged sideways so the fruit looks piled, not gridded.
  return { x: cx + (column - (perRow - 1) / 2) * spacing + (row % 2 ? spacing / 2 : 0) * 0.5, y: rows[row] };
}
