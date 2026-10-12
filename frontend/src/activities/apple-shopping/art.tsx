/** Cut-paper artwork for the fruit shop. Every piece is drawn around (0, 0). */
import type { ReactNode } from "react";

export const INK = "#33254A";

export function Fruit({ kind, r = 36 }: { kind: string; r?: number }) {
  const s = r / 36;
  return <g transform={`scale(${s})`}>{FRUITS[kind] ?? FRUITS.apple}</g>;
}

const FRUITS: Record<string, ReactNode> = {
  apple: (
    <>
      <path
        d="M0 -22 C-10 -34 -36 -28 -36 0 C-36 22 -18 36 -6 36 C-2 36 -2 33 0 33 C2 33 2 36 6 36 C18 36 36 22 36 0 C36 -28 10 -34 0 -22Z"
        fill="#E0352B"
      />
      <path d="M-24 -6 C-24 -16 -16 -22 -10 -22" fill="none" stroke="#FF8A7A" strokeWidth="5" strokeLinecap="round" />
      <path d="M0 -22 C0 -30 3 -36 8 -40" fill="none" stroke="#6B3F1D" strokeWidth="5" strokeLinecap="round" />
      <path d="M6 -32 C14 -44 28 -42 30 -34 C22 -28 12 -28 6 -32Z" fill="#2E8B57" />
    </>
  ),
  orange: (
    <>
      <circle r="35" fill="#F28C1B" />
      <path d="M-24 -8 C-22 -18 -14 -24 -6 -26" fill="none" stroke="#FFC078" strokeWidth="5" strokeLinecap="round" />
      <circle cx="2" cy="-27" r="4" fill="#B85F06" />
      <path d="M4 -30 C12 -42 26 -40 28 -33 C20 -27 10 -27 4 -30Z" fill="#2E8B57" />
      <g fill="#D97706" opacity=".55">
        <circle cx="12" cy="10" r="2" />
        <circle cx="-8" cy="16" r="2" />
        <circle cx="18" cy="-6" r="2" />
        <circle cx="-16" cy="2" r="2" />
      </g>
    </>
  ),
  pear: (
    <>
      <path
        d="M0 -34 C-12 -34 -13 -20 -15 -10 C-18 2 -32 6 -32 20 C-32 31 -18 37 0 37 C18 37 32 31 32 20 C32 6 18 2 15 -10 C13 -20 12 -34 0 -34Z"
        fill="#B5C938"
      />
      <path d="M-20 16 C-21 8 -15 3 -11 -3" fill="none" stroke="#E4F08A" strokeWidth="5" strokeLinecap="round" />
      <path d="M0 -34 C0 -40 2 -43 6 -46" fill="none" stroke="#6B3F1D" strokeWidth="5" strokeLinecap="round" />
      <path d="M4 -38 C12 -48 24 -45 25 -39 C18 -34 9 -35 4 -38Z" fill="#2E8B57" />
    </>
  ),
};

export type Mood = "happy" | "thinking" | "cheer";

/** Mom, anchored at her feet. About 260 units tall at scale 1. */
export function Mom({ mood = "happy", bag = true }: { mood?: Mood; bag?: boolean }) {
  const cheer = mood === "cheer";
  return (
    <g className={`mom mom-${mood}`}>
      <ellipse cx="0" cy="2" rx="70" ry="9" fill="#000" opacity=".12" />
      <ellipse cx="-22" cy="-6" rx="19" ry="9" fill={INK} />
      <ellipse cx="22" cy="-6" rx="19" ry="9" fill={INK} />
      {/* arms sit behind the dress */}
      <g stroke="#C98B5E" strokeWidth="17" strokeLinecap="round" fill="none">
        {cheer ? (
          <>
            <path d="M-36 -160 L-78 -212" />
            <path d="M36 -160 L78 -212" />
          </>
        ) : (
          <>
            <path d="M-38 -158 L-62 -92" />
            <path d="M38 -158 L72 -118" />
          </>
        )}
      </g>
      {bag && !cheer && (
        <g transform="translate(-66 -62)">
          <path d="M-14 -28 C-14 -48 14 -48 14 -28" fill="none" stroke="#8A5328" strokeWidth="5" />
          <path d="M-24 -28 H24 L19 22 H-19Z" fill="#FFC83D" />
          <path d="M-24 -28 H24 L23 -18 H-23Z" fill="#E9A800" />
        </g>
      )}
      <path d="M-40 -178 H40 L64 -24 C30 -12 -30 -12 -64 -24Z" fill="#1F8A7A" />
      <path d="M-40 -178 H40 L44 -150 C20 -138 -20 -138 -44 -150Z" fill="#F6F1E4" />
      <g fill="#F6F1E4" opacity=".9">
        <circle cx="-22" cy="-96" r="5" />
        <circle cx="18" cy="-70" r="5" />
        <circle cx="-6" cy="-48" r="5" />
        <circle cx="30" cy="-112" r="5" />
        <circle cx="-34" cy="-60" r="5" />
      </g>
      <rect x="-9" y="-190" width="18" height="18" fill="#C98B5E" />
      <circle cx="30" cy="-250" r="17" fill="#2B1D3A" />
      <circle cx="0" cy="-214" r="38" fill="#D9A273" />
      <path d="M-39 -214 C-42 -252 -12 -262 6 -256 C28 -258 42 -240 39 -212 C30 -230 14 -240 -6 -238 C-22 -236 -34 -228 -39 -214Z" fill="#2B1D3A" />
      <circle cx="-25" cy="-200" r="7" fill="#E8785F" opacity=".45" />
      <circle cx="25" cy="-200" r="7" fill="#E8785F" opacity=".45" />
      {mood === "thinking" ? (
        <>
          <circle cx="-13" cy="-216" r="4.5" fill={INK} />
          <circle cx="15" cy="-218" r="4.5" fill={INK} />
          <path d="M-22 -228 L-6 -231 M8 -233 L24 -228" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="2" cy="-196" rx="6" ry="5" fill={INK} />
        </>
      ) : (
        <>
          <path d="M-19 -216 q6 -8 12 0 M8 -216 q6 -8 12 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path
            d={cheer ? "M-15 -202 Q0 -180 15 -202Z" : "M-13 -200 Q0 -188 13 -200"}
            fill={cheer ? INK : "none"}
            stroke={INK}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </g>
  );
}

export function Plate({ r = 30 }: { r?: number }) {
  return (
    <g>
      <ellipse rx={r} ry={r * 0.92} fill="#FFFFFF" stroke="#9DB7C4" strokeWidth={r * 0.1} />
      <ellipse rx={r * 0.62} ry={r * 0.56} fill="none" stroke="#C9DBE3" strokeWidth={r * 0.08} />
    </g>
  );
}

/** Where to put n plates inside a box centred on (0, 0). */
export function plateSpots(n: number, perRow: number, spacing: number): { x: number; y: number }[] {
  const rows: number[] = [];
  for (let left = n; left > 0; left -= perRow) rows.push(Math.min(perRow, left));
  const spots: { x: number; y: number }[] = [];
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i++) {
      spots.push({
        x: (i - (count - 1) / 2) * spacing,
        y: (row - (rows.length - 1) / 2) * spacing * 0.95,
      });
    }
  });
  return spots;
}

/** Mom's shopping list: a numeral with a fruit, or a picture of plates to fill. */
export function ShoppingList({
  w,
  h,
  target,
  kind,
  representation,
  pulse = false,
  counted = 0,
}: {
  w: number;
  h: number;
  target: number;
  kind: string;
  representation: "numeral" | "set";
  pulse?: boolean;
  /** How many plates currently show their count (count-together hint). */
  counted?: number;
}) {
  const perRow = target <= 4 ? 2 : target <= 9 ? 3 : 4;
  const spacing = Math.min((w - 40) / perRow, (h - 90) / Math.ceil(target / perRow) / 0.95);
  const plateR = spacing * 0.42;
  return (
    <g className={pulse ? "list list-pulse" : "list"}>
      <rect x={-w / 2 + 6} y={-h / 2 + 8} width={w} height={h} rx="10" fill="#000" opacity=".12" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="10" fill="#FFFDF5" stroke="#E5DCC3" strokeWidth="3" />
      <rect x={-w * 0.16} y={-h / 2 - 12} width={w * 0.32} height="26" rx="8" fill="#9DB7C4" />
      {representation === "numeral" ? (
        <>
          <text
            x={target >= 10 ? -w * 0.17 : -w * 0.14}
            y={h * (target >= 10 ? 0.15 : 0.2)}
            textAnchor="middle"
            fontSize={h * (target >= 10 ? 0.4 : 0.62)}
            fontWeight="800"
            fill={INK}
            className="numeral"
          >
            {target}
          </text>
          <g transform={`translate(${w * 0.27} ${h * 0.06})`}>
            <Fruit kind={kind} r={w * 0.13} />
          </g>
        </>
      ) : (
        <>
          <g transform={`translate(0 ${-h / 2 + 40})`}>
            <g transform="translate(-34 0)">
              <Fruit kind={kind} r={15} />
            </g>
            <path d="M-12 0 H10 M3 -7 L11 0 L3 7" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <g transform="translate(34 0)">
              <Plate r={15} />
            </g>
          </g>
          <g transform="translate(0 26)">
            {plateSpots(target, perRow, spacing).map((spot, i) => (
              <g key={i} transform={`translate(${spot.x} ${spot.y})`}>
                <Plate r={plateR} />
                {i < counted && (
                  <text y={plateR * 0.4} textAnchor="middle" fontSize={plateR * 1.15} fontWeight="800" fill="#1F8A7A" className="numeral">
                    {i + 1}
                  </text>
                )}
              </g>
            ))}
          </g>
        </>
      )}
    </g>
  );
}

export function Awning({ width }: { width: number }) {
  const stripe = 80;
  const count = Math.ceil(width / stripe) + 8;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const x = (i - 4) * stripe;
        const fill = i % 2 ? "#FFFDF5" : "#E2463A";
        return (
          <g key={i} fill={fill}>
            <rect x={x} y="-400" width={stripe + 1} height="472" />
            <circle cx={x + stripe / 2} cy="72" r={stripe / 2} />
          </g>
        );
      })}
      <rect x={-4 * stripe} y="-400" width={count * stripe} height="408" fill="#000" opacity=".06" />
    </g>
  );
}

export function Basket({ cx, y, width }: { cx: number; y: number; width: number }) {
  const half = width / 2;
  return (
    <g transform={`translate(${cx} ${y})`}>
      <path d={`M${-half * 0.72} 0 C${-half * 0.72} -150 ${half * 0.72} -150 ${half * 0.72} 0`} fill="none" stroke="#8A5328" strokeWidth="16" strokeLinecap="round" />
      <path d={`M${-half} -8 H${half} L${half - 34} 96 H${-half + 34}Z`} fill="#C98F4E" />
    </g>
  );
}

/** Front of the basket, drawn over the fruit so it looks like they are inside. */
export function BasketFront({ cx, y, width }: { cx: number; y: number; width: number }) {
  const half = width / 2;
  const top = 62;
  const edge = (yy: number) => half - (34 * (yy + 8)) / 104;
  return (
    <g className="basket-front" transform={`translate(${cx} ${y})`} pointerEvents="none">
      <path d={`M${-edge(top)} ${top} H${edge(top)} L${half - 34} 96 H${-half + 34}Z`} fill="#B9773F" />
      <g stroke="#8A5328" strokeWidth="4" opacity=".55">
        <path d={`M${-edge(79)} 79 H${edge(79)}`} />
        {Array.from({ length: 9 }, (_, i) => {
          const x = ((i - 4) / 4) * (half - 60);
          return <path key={i} d={`M${x} ${top} V96`} />;
        })}
      </g>
      <rect x={-edge(top) - 6} y={top - 9} width={edge(top) * 2 + 12} height="18" rx="9" fill="#8A5328" />
    </g>
  );
}

export function Star({ r = 16, fill = "#FFC83D" }: { r?: number; fill?: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? r * 0.45 : r;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    return `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`;
  });
  return <polygon points={points.join(" ")} fill={fill} />;
}
