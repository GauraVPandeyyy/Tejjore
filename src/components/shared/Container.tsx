import type { PropsWithChildren } from "react";

export function Container({ children }: PropsWithChildren) {
  return <div className="site-container">{children}</div>;
}
