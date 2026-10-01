declare module "next/server" {
  export const NextResponse: {
    json(body: unknown, init?: { status?: number; headers?: Record<string, string> }): any;
  };
}
declare module "next/headers" { export function cookies(): Promise<any>; }
declare module "next/navigation" { export function redirect(path: string): never; }
