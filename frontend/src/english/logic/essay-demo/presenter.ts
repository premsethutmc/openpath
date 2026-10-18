/** UI storyboard presenter using Claude's imported essay-contract@1 projections.
 * No live intelligence service is connected; keep assessment/policy out of React. */
import {
  CAPABILITIES,
  FIXTURE_VERSION,
  type DemoCompetencyId,
  type DemoScene,
  type PresentationStatus,
} from "./fixtures";
import { sharedFixture, presentationStatus } from "./shared-fixture";
export type DemoScreen =
  | "submission"
  | "dashboard"
  | "diagnostic"
  | "journey"
  | "rewrite"
  | "profile";
export type DemoStep = "explain" | "guided" | "independent";
export interface DemoRecord {
  version: typeof FIXTURE_VERSION;
  screen: DemoScreen;
  original: string;
  rewrite: string;
  analysed: boolean;
  rewritten: boolean;
  selected: DemoCompetencyId;
  expanded: DemoCompetencyId[];
  scenes: Partial<Record<DemoCompetencyId, DemoScene>>;
  step: DemoStep;
  answers: Record<string, string>;
  drafts: Record<string, string>;
  hintShown: boolean;
  pending: boolean;
}
export interface EssayPresentation {
  shared: ReturnType<typeof sharedFixture>;
  mode: "fixture";
  record: DemoRecord;
  interrupted: boolean;
  competencies: {
    id: DemoCompetencyId;
    status: PresentationStatus;
    tree: ReturnType<typeof sharedFixture>["journey"]["trees"][number];
    signal: string;
    evidence: ReturnType<typeof sharedFixture>["analysis"]["observations"];
  }[];
  finalChallenge: ReturnType<typeof sharedFixture>["journey"]["finalRewrite"];
}
export type DemoCommand =
  | { type: "analyse" }
  | { type: "diagnostic"; answer: string }
  | { type: "guided"; answer: string }
  | { type: "independent"; answer: string }
  | { type: "rewrite" };
export interface EssayPresenter {
  readonly mode: "fixture";
  load(): EssayPresentation;
  edit(kind: "original" | "rewrite", text: string): EssayPresentation;
  navigate(
    screen: DemoScreen,
    competency?: DemoCompetencyId,
  ): EssayPresentation;
  expand(id: DemoCompetencyId): EssayPresentation;
  lesson(): EssayPresentation;
  independent(): EssayPresentation;
  hint(): EssayPresentation;
  answerDraft(text: string): EssayPresentation;
  simulateFailure(): void;
  run(command: DemoCommand, signal: AbortSignal): Promise<EssayPresentation>;
  reset(): EssayPresentation;
}
export const STORAGE_KEY = "openpath.essay-ux.fixture.v1";
export const wordCount = (text: string) =>
  text.trim() ? text.trim().split(/\s+/u).length : 0;
const ids = CAPABILITIES.map((c) => c.id);
const blank = (): DemoRecord => ({
  version: FIXTURE_VERSION,
  screen: "submission",
  original: "",
  rewrite: "",
  analysed: false,
  rewritten: false,
  selected: "grammar",
  expanded: [],
  scenes: {},
  step: "explain",
  answers: {},
  drafts: {},
  hintShown: false,
  pending: false,
});
export function parseDemo(raw: string): DemoRecord {
  const r = JSON.parse(raw) as DemoRecord;
  if (
    !r ||
    r.version !== FIXTURE_VERSION ||
    ![
      "submission",
      "dashboard",
      "diagnostic",
      "journey",
      "rewrite",
      "profile",
    ].includes(r.screen) ||
    typeof r.original !== "string" ||
    r.original.length > 10000 ||
    typeof r.rewrite !== "string" ||
    r.rewrite.length > 2000 ||
    !ids.includes(r.selected) ||
    !Array.isArray(r.expanded) ||
    r.expanded.some((id) => !ids.includes(id)) ||
    !r.scenes ||
    Object.entries(r.scenes).some(
      ([id, scene]) =>
        !ids.includes(id as DemoCompetencyId) ||
        !["introduced", "diagnosed", "guided", "independent"].includes(scene),
    ) ||
    !["explain", "guided", "independent"].includes(r.step) ||
    typeof r.analysed !== "boolean" ||
    typeof r.rewritten !== "boolean" ||
    typeof r.pending !== "boolean" ||
    typeof r.hintShown !== "boolean" ||
    !r.drafts ||
    Object.values(r.drafts).some(
      (a) => typeof a !== "string" || a.length > 2000,
    ) ||
    !r.answers ||
    Object.values(r.answers).some(
      (a) => typeof a !== "string" || a.length > 2000,
    )
  )
    throw Error("The saved demo cannot be read. It has not been overwritten.");
  if (!r.analysed && r.screen !== "submission")
    throw Error("The saved demo has an invalid position.");
  return r;
}
function project(record: DemoRecord, interrupted = false): EssayPresentation {
  const shared = sharedFixture(record.scenes, record.rewritten);
  return {
    mode: "fixture",
    record,
    interrupted,
    shared,
    competencies: CAPABILITIES.map((c, index) => ({
      id: c.id,
      status: presentationStatus(shared.profile.competencies[index]),
      signal:
        shared.profile.competencies[index].gap?.basis[0] ??
        "Synthetic sample evidence only.",
      tree: shared.journey.trees[index],
      evidence: shared.analysis.observations.filter(
        (o) => o.competency === shared.profile.competencies[index].competency,
      ),
    })),
    finalChallenge: shared.journey.finalRewrite,
  };
}
/** Never turn an unverified projection or a fixture into a green competency. */
export const visibleStatus = (
  status: PresentationStatus,
  source: "fixture" | "shared-contract",
  verification: ReturnType<
    typeof sharedFixture
  >["profile"]["competencies"][number]["engine"]["verification"] = "not_demonstrated",
): PresentationStatus =>
  status === "verified" &&
  (source !== "shared-contract" || verification !== "verified")
    ? "needs-verification"
    : status;
export function createFixturePresenter(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  delayMs = 600,
): EssayPresenter {
  let record: DemoRecord | undefined;
  let interrupted = false;
  const read = () => {
    if (!record) {
      const raw = storage.getItem(STORAGE_KEY);
      record = raw ? parseDemo(raw) : blank();
      if (record.pending) {
        interrupted = true;
        record = { ...record, pending: false };
        storage.setItem(STORAGE_KEY, JSON.stringify(record));
      }
    }
    return record;
  };
  const write = (next: DemoRecord) => {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    record = next;
    return project(next, interrupted);
  };
  let active = false;
  let failNext = false;
  return {
    mode: "fixture",
    load: () => project(read(), interrupted),
    edit(kind, text) {
      const r = read();
      if (text.length > (kind === "original" ? 10000 : 2000))
        throw Error("This draft is too long for the demo.");
      if (active) throw Error("Wait for the current sample step.");
      if (kind === "original" && text !== r.original)
        return write({ ...blank(), original: text });
      return write({
        ...r,
        [kind]: text,
        rewritten: kind === "rewrite" ? false : r.rewritten,
      });
    },
    navigate(screen, competency) {
      const r = read();
      if (active) throw Error("Wait for the current sample step.");
      if (screen !== "submission" && !r.analysed)
        throw Error("Open the sample feedback first.");
      if (screen === "rewrite" && !project(r).finalChallenge.available)
        throw Error("The final challenge is not available yet.");
      if (screen === "profile" && !r.rewritten)
        throw Error("Finish the sample rewrite first.");
      const selected = competency ?? r.selected;
      if (!ids.includes(selected)) throw Error("Unknown competency");
      const scene = r.scenes[selected];
      return write({
        ...r,
        screen,
        selected,
        step:
          screen === "journey"
            ? selected === r.selected
              ? r.step
              : scene === "guided" || scene === "independent"
                ? "independent"
                : "explain"
            : r.step,
      });
    },
    expand(id) {
      const r = read();
      return write({
        ...r,
        expanded: r.expanded.includes(id)
          ? r.expanded.filter((x) => x !== id)
          : [...r.expanded, id],
      });
    },
    lesson() {
      const r = read();
      if (r.screen !== "journey") throw Error("No open lesson");
      return write({ ...r, step: "guided" });
    },
    independent() {
      const r = read();
      if (r.scenes[r.selected] !== "guided")
        throw Error("Try the guided example first.");
      return write({ ...r, step: "independent", hintShown: false });
    },
    hint() {
      const r = read();
      return write({ ...r, hintShown: true });
    },
    answerDraft(text) {
      const r = read();
      if (text.length > 2000)
        throw Error("This response is too long for the demo.");
      return write({
        ...r,
        drafts: { ...r.drafts, [`${r.selected}.${r.screen}.${r.step}`]: text },
      });
    },
    simulateFailure() {
      failNext = true;
    },
    async run(command, signal) {
      if (active) throw Error("A sample step is already open.");
      const r = read();
      if (signal.aborted) throw new DOMException("Interrupted", "AbortError");
      if (command.type === "diagnostic" && r.screen !== "diagnostic")
        throw Error("Open a diagnostic first.");
      if (
        command.type === "guided" &&
        (r.screen !== "journey" || r.step !== "guided" || !r.scenes[r.selected])
      )
        throw Error("Open the guided step first.");
      if (
        command.type === "independent" &&
        (r.screen !== "journey" ||
          r.step !== "independent" ||
          r.scenes[r.selected] !== "guided")
      )
        throw Error("Try the guided example first.");
      if (command.type === "analyse" && !wordCount(r.original))
        throw Error("Write or paste some sample text first.");
      if (
        command.type === "rewrite" &&
        (!project(r).finalChallenge.available || wordCount(r.rewrite) !== 50)
      )
        throw Error("Use exactly 50 words before requesting sample feedback.");
      if ("answer" in command && !command.answer.trim())
        throw Error("Add a response first.");
      write({ ...r, pending: true });
      active = true;
      try {
        await new Promise<void>((resolve, reject) => {
          const stop = () => {
            clearTimeout(timer);
            reject(new DOMException("Interrupted", "AbortError"));
          };
          const timer = setTimeout(() => {
            signal.removeEventListener("abort", stop);
            resolve();
          }, delayMs);
          signal.addEventListener("abort", stop, { once: true });
        });
        if (signal.aborted) throw new DOMException("Interrupted", "AbortError");
        if (failNext) {
          failNext = false;
          throw Error(
            "The sample feedback could not be loaded. No analysis was performed.",
          );
        }
        interrupted = false;
        // These commands select prewritten storyboard frames. There is no answer evaluation here.
        if (command.type === "analyse")
          return write({
            ...r,
            analysed: true,
            screen: "dashboard",
            pending: false,
          });
        if (command.type === "rewrite")
          return write({
            ...r,
            rewritten: true,
            screen: "profile",
            pending: false,
          });
        const scene =
          command.type === "diagnostic"
            ? "diagnosed"
            : command.type === "guided"
              ? "guided"
              : "independent";
        return write({
          ...r,
          pending: false,
          scenes: { ...r.scenes, [r.selected]: scene },
          answers: {
            ...r.answers,
            [`${r.selected}.${command.type}`]: command.answer,
          },
          expanded: [...new Set([...r.expanded, r.selected])],
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError"))
          write({ ...r, pending: false });
        throw error;
      } finally {
        active = false;
      }
    },
    reset() {
      if (active) throw Error("Wait for the current sample step.");
      storage.removeItem(STORAGE_KEY);
      record = blank();
      interrupted = false;
      return project(record);
    },
  };
}
