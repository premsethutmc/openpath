/**
 * Minimal React type declarations for type-checking in environments
 * where @types/react is not installable. The full @types/react package
 * should be used when npm install is available.
 */

declare module "react" {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
  export interface ReactElement { type: any; props: any; key: string | null; }
  export type FC<P = {}> = (props: P) => ReactNode;
  export type Dispatch<A> = (action: A) => void;
  export type Reducer<S, A> = (state: S, action: A) => S;
  export type SetStateAction<S> = S | ((prevState: S) => S);

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useReducer<S, A>(reducer: Reducer<S, A>, initialState: S): [S, Dispatch<A>];
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };

  export type ChangeEvent<T = Element> = { target: T & { value: string } };
  export type FormEvent<T = Element> = { preventDefault: () => void };
  export type KeyboardEvent<T = Element> = { key: string };
  export type MouseEvent<T = Element> = { preventDefault: () => void };
}

declare module "react/jsx-runtime" {
  export function jsx(type: any, props: any, key?: string): any;
  export function jsxs(type: any, props: any, key?: string): any;
  export const Fragment: unique symbol;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | null): {
    render(element: any): void;
    unmount(): void;
  };
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  type Element = any;
}
