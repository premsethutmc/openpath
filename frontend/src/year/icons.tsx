/** Status icons as drawings (font glyphs for half-circles are missing on many phones). */
export function Icon({ glyph }: { glyph: string }) {
  const p = { width: 14, height: 14, viewBox: "0 0 16 16", "aria-hidden": true as const, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (glyph === "✓") return <svg {...p}><path d="M3 8.5l3.2 3L13 4.5" /></svg>;
  if (glyph === "★") return <svg {...p} fill="currentColor" stroke="none"><path d="M8 1.6l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.3-3 4.4-.5z" /></svg>;
  if (glyph === "◐") return <svg {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" /></svg>;
  if (glyph === "↻") return <svg {...p}><path d="M13 8a5 5 0 1 1-1.5-3.6" /><path d="M13 2.5v3h-3" /></svg>;
  if (glyph === "○") return <svg {...p}><circle cx="8" cy="8" r="5" /></svg>;
  if (glyph === "?") return <svg {...p}><path d="M6 6a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2V10" /><circle cx="8" cy="12.5" r=".6" fill="currentColor" /></svg>;
  return <svg {...p}><path d="M4 8h8" /></svg>;
}
