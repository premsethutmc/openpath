/** Node-side loading of the English framework and content (the core itself never touches the file system). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ContentBundle, type Context, type Framework, type FrameworkIndex, type Item, indexContent, indexFramework, isSpecified } from "../../packages/english-core/src/index.ts";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CONTENT = join(REPO, "content", "english");
/**
 * The framework version the engine runs on: 0.2.0 from E2b, when its bank covers every capability it
 * specifies (56). A framework version only ever sees the items and writing tasks for capabilities it
 * specifies, so loading 0.1.0 gives exactly the 17-capability view E1 and E2a were built on.
 */
export const RUNTIME_FRAMEWORK = "0.2.0";
/**
 * The framework the frozen ten-learner simulation and the E1 demonstration are defined on. Their
 * simulated learners have true levels for the 17 skeleton capabilities only, so they keep running on
 * 0.1.0 (its view of the bank); pass levels and procedure are unchanged.
 */
export const FROZEN_FRAMEWORK = "0.1.0";
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
export type Bank = "current" | "e1" | "e2a";
export const E1_BASELINE = join(CONTENT, "baselines", "e1");
/** The bank exactly as merged in E2a (PR #8); the frozen simulation on it reproduces E2a's fingerprint. */
export const E2A_BASELINE = join(CONTENT, "baselines", "e2a");

export function loadBundle(bank: Bank = "current"): ContentBundle {
  const items =
    bank === "e1"
      ? json<Item[]>(join(E1_BASELINE, "code-items.json"))
      : bank === "e2a"
        ? [...json<Item[]>(join(E2A_BASELINE, "code-items.json")), ...json<Item[]>(join(E2A_BASELINE, "e2a-items.json"))]
        : [
          ...json<Item[]>(join(CONTENT, "items", "code-items.json")),
          // E2a: items added for the 17 skeleton capabilities (candidate content)
          ...json<Item[]>(join(CONTENT, "items", "e2a-items.json")),
          // E2b: items for the 39 core capabilities (candidate content)
          ...json<Item[]>(join(CONTENT, "items", "e2b-items.json")),
        ];
  const writing = [
    ...json<Item[]>(join(CONTENT, "writing", "tasks.json")),
    // E2b: writing tasks for the core writing capabilities (candidate rubrics and anchors)
    ...(bank === "current" ? json<Item[]>(join(CONTENT, "writing", "e2b-tasks.json")) : []),
  ];
  // E3: short written responses (candidate key points, guards and anchors); offered only when an evaluator is available
  const short = bank === "current" ? json<Item[]>(join(CONTENT, "short", "short-items.json")) : [];
  return {
    items: [...items, ...writing, ...short],
    // earlier versions of revised items, so evidence recorded against them is still scored as answered
    retired: bank === "current" ? json<Item[]>(join(CONTENT, "items", "retired-versions.json")) : [],
    grammarSignals: json(join(CONTENT, "signals", "grammar.json")),
    passages: json(join(bank === "e1" ? E1_BASELINE : bank === "e2a" ? E2A_BASELINE : join(CONTENT, "items"), "passages.json")),
    goals: json(join(CONTENT, "goals.json")),
    misspellings: json(join(CONTENT, "signals", "misspellings.json")),
  };
}

/** `allowCandidateAnchors` is for the simulator, demo and tests only: no educator-scored anchors exist yet (D-4). */
/** The part of a bank a framework version can use: items and tasks whose capabilities it all specifies. */
export function viewFor(bundle: ContentBundle, index: FrameworkIndex): ContentBundle {
  const ok = (cap: string) => {
    const c = index.leaves.get(cap);
    return !!c && isSpecified(c);
  };
  const usable = (i: Item) => (i.kind === "writing" ? [...i.targets, ...i.secondary].every(ok) : ok(i.target));
  return { ...bundle, items: bundle.items.filter(usable), retired: (bundle.retired ?? []).filter(usable) };
}

export function loadContext(opts: { allowCandidateAnchors?: boolean; framework?: FrameworkVersion; bank?: Bank } = {}): Context {
  const index = indexFramework(loadFramework(frameworkFile(opts.framework ?? RUNTIME_FRAMEWORK)));
  return { index, content: indexContent(viewFor(loadBundle(opts.bank), index), index), allowCandidateAnchors: opts.allowCandidateAnchors ?? false };
}

export function readText(path: string): string {
  return readFileSync(path, "utf8");
}
