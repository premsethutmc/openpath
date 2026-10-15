/**
 * Deleting a parent's own material for real: remove its source content from the learner's stored record, while
 * keeping the learning history that does not reveal it. The same rules run on the server for a record kept in a
 * parent account (backend/family/scrub.py); `scrub-fixture.json` (backend/family/fixtures) holds one record before and
 * after, and both implementations are tested against it.
 *
 * Retention policy, by kind of data:
 *   1. Source content the parent supplied: removed.
 *      - A word list's name and words: every saved version is emptied in place, { id, name: "", words: [] }.
 *      - A book's title and text: every saved version is emptied, { id, title: "", text: "" }; its reviews lose the
 *        approved activity ids and the text's fingerprint (ids name words and characters); the activities generated
 *        from it disappear with the text, since they are only ever computed from it.
 *      Each changed event is marked scrubbed: true.
 *   2. Historical learning evidence (the practice sessions and answers on that list or book): kept, without the content.
 *      Each word's id becomes "removed-1", "removed-2", … (by first appearance, so the same word stays the same word),
 *      a book question's id becomes "removed-question-1", …, the spelling and the typed or chosen answer become "", and
 *      right/wrong, the time, plays and review flags stay. Progress elsewhere (the Spelling Bee, other lists and books)
 *      is never touched, because only events whose source is this list or book change.
 *   3. Backups and other copies outside the current record: not reachable from here. A backup file exported before the
 *      deletion still holds the list; server database backups and browser storage keep old pages until they expire or
 *      are compacted. See docs/product/MY_WORDS.md, "Deleting a list", and docs/product/MY_BOOKS.md.
 *
 * Scrubbing is idempotent: running it again changes nothing.
 */
import type { AppEvent, SpellSource } from "./events.ts";

export type ScrubSource = { type: "list" | "book"; id: string };

const sameSource = (s: SpellSource | undefined, src: ScrubSource) => !!s && s.type === src.type && s.id === src.id;

/** The record with `src`'s content removed, and how many events changed. Events keep their ids, order and times. */
export function scrubEvents(events: readonly AppEvent[], src: ScrubSource): { events: AppEvent[]; changed: number } {
  const alias = new Map<string, string>();
  const name = (id: string) => {
    if (!alias.has(id)) alias.set(id, /^removed-\d+$/.test(id) ? id : `removed-${alias.size + 1}`);
    return alias.get(id)!;
  };
  const questions = new Map<string, string>();
  const question = (id: string) => {
    if (!questions.has(id)) questions.set(id, /^removed-question-\d+$/.test(id) ? id : `removed-question-${questions.size + 1}`);
    return questions.get(id)!;
  };
  const book = src.type === "book";
  let changed = 0;
  const out = events.map((e): AppEvent => {
    let next: AppEvent = e;
    if (e.kind === "word_list" && src.type === "list" && e.list.id === src.id) next = { ...e, list: { id: e.list.id, name: "", words: [] }, scrubbed: true };
    else if (e.kind === "book" && book && e.book.id === src.id) next = { ...e, book: { id: e.book.id, title: "", text: "" }, scrubbed: true };
    else if (e.kind === "book_review" && book && e.book === src.id) next = { ...e, fingerprint: "", approved: [], scrubbed: true };
    else if (e.kind === "book_answer" && book && e.book === src.id) next = { ...e, question: question(e.question), response: "", scrubbed: true };
    else if (e.kind === "spell_session" && sameSource(e.source, src)) next = { ...e, words: e.words.map(name), scrubbed: true };
    else if (e.kind === "spell_answer" && sameSource(e.source, src)) next = { ...e, word: { ...e.word, id: name(e.word.id), text: "" }, response: "", scrubbed: true };
    if (next !== e && JSON.stringify(next) !== JSON.stringify(e)) changed++;
    return next === e || JSON.stringify(next) === JSON.stringify(e) ? e : next;
  });
  return { events: out, changed };
}

/** Whether a list's content was removed (its latest saved version is a scrubbed one). */
export const isScrubbed = (e: AppEvent) => (e as { scrubbed?: boolean }).scrubbed === true;
