/** Transport-only contract: never a mathematical correctness or learner mastery decision. */
export const CONTRACT = "openpath-math-input@1" as const;
export type Rect = { x: number; y: number; width: number; height: number };
export interface Point {
  x: number;
  y: number;
  t: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  twist: number;
  tangentialPressure?: number;
  altitudeAngle?: number;
  azimuthAngle?: number;
}
export interface Stroke {
  id: string;
  pointerType: "mouse" | "touch" | "pen";
  startedAt: string;
  timeOrigin?: number;
  pointerId?: number;
  contact?: { width: number; height: number };
  points: Point[];
  regionId: string | null;
  width: number;
  tool: "ink";
  synthetic?: boolean;
}
export interface Region extends Rect {
  id: string;
  label: string;
  order: number;
  role: string;
}
export interface Layout {
  id: string;
  version: 1;
  width: number;
  height: number;
  regions: Region[];
  guides?: { text: string; x: number; y: number; letterSpacing?: number }[];
  rules?: { x1: number; y1: number; x2: number; y2: number }[];
}
export interface Candidate {
  id: string;
  text: string;
  bounds: Rect;
  strokeIds: string[];
  regionId: string;
  confidence: number | null;
  alternatives?: string[];
}
export interface Correction {
  id: string;
  at: string;
  tokenId: string;
  from: string;
  to: string;
  strokeIds: string[];
  reason: "clarification" | "student-edit";
  method: "keyboard" | "keypad";
}
export interface Token extends Candidate {
  status: "accepted" | "uncertain" | "confirmed";
  origin: "recognition" | "manual";
  recognizer: string | null;
  revision: number;
  createdOrder: number;
}
export interface Snapshot {
  strokes: Stroke[];
  erased: string[];
  tokens: Token[];
  corrections: Correction[];
}
export interface Work extends Snapshot {
  contract: typeof CONTRACT;
  id: string;
  problem: { id: string; statement: string };
  layout: Layout;
  revision: number;
  updatedAt: string;
  paper: "blank" | "grid" | "ruled";
  history: Snapshot[];
  future: Snapshot[];
}
export interface InputPacket {
  contract: typeof CONTRACT;
  workId: string;
  revision: number;
  problem: Work["problem"];
  layout: Layout;
  strokes: Stroke[];
  erasedStrokeIds: string[];
  steps: {
    regionId: string;
    role: string;
    order: number;
    tokens: Token[];
    /** Display serialization only; spatial tokens are authoritative input. */
    text: string;
  }[];
  corrections: Correction[];
  entrySequence: { tokenId: string; regionId: string; order: number }[];
  provenance: {
    purpose: "formative-input";
    recognitionIsNotMathematicalValidation: true;
    synthetic: boolean;
    updatedAt: string;
  };
}
export interface RecognitionRequest {
  contract: typeof CONTRACT;
  workId: string;
  revision: number;
  strokes: Stroke[];
  regions: Region[];
}
export interface RecognitionResult {
  revision: number;
  candidates: Candidate[];
  provider: string;
}
export interface Recognizer {
  id: string;
  available(): boolean;
  recognize(
    request: RecognitionRequest,
    signal: AbortSignal,
  ): Promise<RecognitionResult>;
}
export interface ValidationFeedback {
  contract: typeof CONTRACT;
  workId: string;
  revision: number;
  status: "received" | "clarification" | "feedback";
  messages: {
    regionId: string;
    tokenId?: string;
    text: string;
    kind: "information" | "mathematical-feedback" | "input-clarification";
  }[];
}
export interface Validator {
  submit(packet: InputPacket, signal: AbortSignal): Promise<ValidationFeedback>;
}
export interface WorkStore {
  load(id: string): Promise<Work | null>;
  save(work: Work): Promise<void>;
}
