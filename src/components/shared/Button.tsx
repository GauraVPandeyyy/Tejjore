import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
  }
>;

export function Button({ children, className = "", variant = "primary", ...props }: Props) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} {...props}>
      <span>{children}</span>
      <span aria-hidden="true" className="button__arrow">↗</span>
    </button>
  );
}
