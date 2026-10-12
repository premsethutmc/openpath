/** Node-side loading of the English framework and content (the core itself never touches the file system). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ContentBundle, type Context, type Framework, type Item, indexContent, indexFramework } from "../../packages/english-core/src/index.ts";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONTENT = join(REPO, "content", "english");
/**
 * The framework version the engine runs on. 0.2.0 (E2a) specifies 39 more capabilities, but their items
 * arrive in E2b; until the bank covers a version's specified capabilities, that version is validated,
 * checked and migrated to, but is not the runtime default.
 */
export const RUNTIME_FRAMEWORK = "0.1.0";
export const FRAMEWORK_VERSIONS = ["0.1.0", "0.2.0"] as const;
export type FrameworkVersion = (typeof FRAMEWORK_VERSIONS)[number];
export const frameworkFile = (version: string) => join(CONTENT, "framework", `en-${version}.json`);
export const FRAMEWORK_FILE = frameworkFile(RUNTIME_FRAMEWORK);

const json = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

export function loadFramework(path = FRAMEWORK_FILE): Framework {
  return json<Framework>(path);
}

/**
 * "current" is the live bank. "e1" is the E1 bank exactly as merged (content/english/baselines/e1),
 * kept so E1 results stay reproducible: the frozen simulation on it reproduces E1's fingerprint.
 */
export type Bank = "current" | "e1";
export const E1_BASELINE = join(CONTENT, "baselines", "e1");

export function loadBundle(bank: Bank = "current"): ContentBundle {
  const items =
    bank === "e1"
      ? json<Item[]>(join(E1_BASELINE, "code-items.json"))
      : [
          ...json<Item[]>(join(CONTENT, "items", "code-items.json")),
          // E2a: items added for the 17 skeleton capabilities (candidate content)
          ...json<Item[]>(join(CONTENT, "items", "e2a-items.json")),
        ];
  return {
    items: [...items, ...json<Item[]>(join(CONTENT, "writing", "tasks.json"))],
    passages: json(join(bank === "e1" ? E1_BASELINE : join(CONTENT, "items"), "passages.json")),
    goals: json(join(CONTENT, "goals.json")),
    misspellings: json(join(CONTENT, "signals", "misspellings.json")),
  };
}

/** `allowCandidateAnchors` is for the simulator, demo and tests only: no educator-scored anchors exist yet (D-4). */
export function loadContext(opts: { allowCandidateAnchors?: boolean; framework?: FrameworkVersion; bank?: Bank } = {}): Context {
  const index = indexFramework(loadFramework(frameworkFile(opts.framework ?? RUNTIME_FRAMEWORK)));
  return { index, content: indexContent(loadBundle(opts.bank), index), allowCandidateAnchors: opts.allowCandidateAnchors ?? false };
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}
