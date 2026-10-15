/** Right and wrong answers to any code-scored item (shared by the tests). */
import type { Item, Response } from "../../../../packages/english-core/src/index.ts";

export function rightAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: item.answer! };
    case "typed":
      return { kind: "typed", text: item.answers![0] };
    case "order":
      return { kind: "order", order: item.answer_order! };
    case "match":
      return { kind: "match", pairs: item.answer_pairs! };
    case "multi":
      return { kind: "multi", choices: item.answer_set! };
  }
  throw new Error(item.format);
}

export function wrongAnswer(item: Item): Response {
  if (item.kind !== "code") throw new Error("code items only");
  switch (item.format.split(":")[0]) {
    case "choice":
      return { kind: "choice", choice: (item.answer! + 1) % item.options!.length };
    case "typed":
      return { kind: "typed", text: Object.keys(item.wrong ?? {})[0] ?? "zzzz" };
    case "order":
      return { kind: "order", order: [...item.answer_order!].reverse() };
    case "match":
      return { kind: "match", pairs: [...item.answer_pairs!].reverse() };
    case "multi":
      return { kind: "multi", choices: [0] };
  }
  throw new Error(item.format);
}
