export interface SourceImport {
  specifier: string | null;
  selectors: boolean;
}
export interface SelectionBoundaryResult {
  readers: string[];
  violations: string[];
}
export const REGISTERED_SELECTORS: string[];
export const SOURCE_ROOTS: string[];
export function importsOf(text: string, file?: string): SourceImport[];
export function inspectSelectionBoundary(root: string, dirs?: string[]): SelectionBoundaryResult;
