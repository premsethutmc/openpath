/** Public integration surface. Capture/input only; host owns maths and evidence decisions. */
export { WritingWorkspace, type WorkspaceProps } from "./Workspace";
export * from "./contract";
export {
  createWork,
  divisionLayout,
  freeLayout,
  packet,
  blockers,
} from "./model";
export { BrowserWorkStore, unavailableRecognizer, restore } from "./adapters";

export { LocalDigitRecognizer } from "./digit-recognizer";
export { WritingLessonRepo } from "./lesson-service";
export { writingEvidence } from "./evidence";
export { regionExpression, evaluateWithExistingEngine } from "./engine-adapter";
