/**
 * picture-words@1: the integrity of a question's words against its picture. Where the words point at a picture ("the
 * cards in the picture"), a picture is drawn, and it is not a table of data standing in for one: a row of things is
 * drawn as cards. Every family is checked on a spread of its questions.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { question } from "../../../packages/learning/src/content";
import { FAMILIES, pool } from "../../../packages/learning/src/families";
import { pictured, POINTS_AT_PICTURE } from "../../../packages/learning/src/family-kit";

test("a row of things the words call a picture is drawn as cards; a table with real headings stays a table", () => {
  const row = { type: "table" as const, head: ["1", "2", "3"], rows: [[2, 4, "?"]] };
  assert.equal(pictured("The number cards in the picture make a pattern.", row).as, "tiles");
  assert.equal(pictured("The numbers make a pattern.", row).as, undefined);
  assert.equal(pictured("Look at the things in the picture.", { type: "table", head: ["Item", "Price (₹)"], rows: [["bag", 107]] }).as, undefined);
});

test("no family points at a picture and draws none, or shows cards as a table of data", () => {
  const none: string[] = [], cards: string[] = [];
  let tiles = 0;
  for (const f of FAMILIES.values()) {
    if (!f.domain) continue;
    const ids = pool(f.id).items.map((x) => x.id);
    const step = Math.max(1, Math.floor(ids.length / 8));
    for (let i = 0; i < ids.length; i += step) {
      const q = question(ids[i]);
      if (!POINTS_AT_PICTURE.test(q.prompt)) continue;
      const fig = q.figure as { type: string; as?: string } | undefined;
      if (!fig) { none.push(f.id); break; }
      if (fig.as === "tiles") tiles++;
      // a table with real headings (a bill, a price list, a timetable) is a fair picture of itself; cards are not
      if (fig.type === "table" && !fig.as && /\bcards? (?:in|on) the picture\b/i.test(q.prompt)) { cards.push(f.id); break; }
    }
  }
  assert.deepEqual(none, [], "words point at a picture; none is drawn");
  assert.deepEqual(cards, [], "words say cards in the picture; a table of data is drawn");
  assert.ok(tiles > 0);
});
