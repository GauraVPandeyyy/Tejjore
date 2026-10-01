declare namespace React {
  type SetStateAction<S> = S | ((prevState: S) => S);
  type Dispatch<A> = (value: A) => void;
}
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module "react" {
  export type FormEvent = { preventDefault(): void };
  export function useState<T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>];
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps: readonly unknown[]): void;
}
declare module "next/image" { const Image: any; export default Image; }

declare module "next/link" { const Link: any; export default Link; }
