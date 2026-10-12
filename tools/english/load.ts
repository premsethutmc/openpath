/** Node-side loading of the English framework and content (the core itself never touches the file system). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ContentBundle, type Context, type Framework, type Item, indexContent, indexFramework } from "../../packages/english-core/src/index.ts";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONTENT = join(REPO, "content", "english");
export const FRAMEWORK_FILE = join(CONTENT, "framework", "en-0.1.0.json");

const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

export function loadFramework(path = FRAMEWORK_FILE): Framework {
  return json<Framework>(path);
}

export function loadBundle(): ContentBundle {
  return {
    items: [...json<Item[]>(join(CONTENT, "items", "code-items.json")), ...json<Item[]>(join(CONTENT, "writing", "tasks.json"))],
    passages: json(join(CONTENT, "items", "passages.json")),
    goals: json(join(CONTENT, "goals.json")),
    misspellings: json(join(CONTENT, "signals", "misspellings.json")),
  };
}

export function loadContext(): Context {
  const index = indexFramework(loadFramework());
  return { index, content: indexContent(loadBundle(), index) };
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}
