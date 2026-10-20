/** Spatial input codec; scoring is delegated to the EXISTING mathematics evaluator. */
import {
  evaluate,
  type GeneratedItem,
} from "../../../packages/mathematics/src/generator";
import type { InputPacket } from "./contract";
export function regionExpression(input: InputPacket, regionId: string) {
  const step = input.steps.find((s) => s.regionId === regionId);
  if (!step || step.tokens.some((t) => t.status === "uncertain"))
    throw Error("Clarify the intended input first");
  return [...step.tokens]
    .sort((a, b) => a.bounds.x - b.bounds.x)
    .map((t) => t.text)
    .join("");
}
export function evaluateWithExistingEngine(
  input: InputPacket,
  regionId: string,
  item: GeneratedItem,
) {
  return evaluate(item, regionExpression(input, regionId));
}
