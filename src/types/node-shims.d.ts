declare const process: { env: Record<string,string|undefined>; cwd(): string; pid: number };
declare const Buffer: { from(input: string, encoding?: string): { toString(encoding?: string): string; length: number } };
declare function structuredClone<T>(value: T): T;
declare module "node:fs/promises" {
  export function mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<void>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function writeFile(path: string, data: string, options?: string | { encoding?: string; mode?: number }): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function stat(path: string): Promise<{ mtimeMs: number }>;
}
declare module "node:path" { const path: { join(...parts: string[]): string; dirname(value: string): string }; export default path; }
declare module "node:crypto" {
  export function randomUUID(): string;
  export function createHmac(algorithm: string, key: string): { update(value: string): { digest(encoding: string): string } };
  export function timingSafeEqual(a: { length: number }, b: { length: number }): boolean;
  export function scryptSync(password: string, salt: string, keylen: number): { toString(encoding: string): string };
  export function randomBytes(size: number): { toString(encoding: string): string };
  export function createHash(algorithm: string): { update(value: string): { digest(encoding: string): string } };
}
