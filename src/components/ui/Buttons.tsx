import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Pills carry every text action: outline (secondary), lake (primary on paper) or cream (primary on
 * lake). Book pills add the ember dot — ember is an accent, never a fill. Circles (44 px minimum)
 * carry arrows, menu, dates and the AI launcher.
 */
export type PillVariant = "outline" | "lake" | "cream" | "outline-light";

type PillOwnProps = { variant?: PillVariant; dot?: boolean; arrow?: boolean; children: ReactNode; className?: string };

function PillInner({ dot, arrow, children }: Pick<PillOwnProps, "dot" | "arrow" | "children">) {
  return (
    <>
      {arrow ? <Icon name="arrow-right" size={16} className="tj-pill__arrow" /> : null}
      <span>{children}</span>
      {dot ? <span className="tj-pill__dot" aria-hidden="true" /> : null}
    </>
  );
}

export function PillLink({ variant = "outline", dot, arrow = true, children, className = "", ...rest }: PillOwnProps & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link className={`tj-pill tj-pill--${variant} ${className}`} {...rest}>
      <PillInner dot={dot} arrow={arrow}>{children}</PillInner>
    </Link>
  );
}

export function PillAnchor({ variant = "outline", dot, arrow = true, children, className = "", ...rest }: PillOwnProps & Omit<ComponentProps<"a">, "children" | "className">) {
  return (
    <a className={`tj-pill tj-pill--${variant} ${className}`} {...rest}>
      <PillInner dot={dot} arrow={arrow}>{children}</PillInner>
    </a>
  );
}

export function PillButton({ variant = "outline", dot, arrow = false, children, className = "", type = "button", ...rest }: PillOwnProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button type={type} className={`tj-pill tj-pill--${variant} ${className}`} {...rest}>
      <PillInner dot={dot} arrow={arrow}>{children}</PillInner>
    </button>
  );
}

export function CircleButton({ icon, label, tone = "outline", className = "", type = "button", ...rest }: { icon: IconName; label: string; tone?: "outline" | "lake" | "cream" | "mist" | "outline-light" } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type={type} className={`tj-circle tj-circle--${tone} ${className}`} aria-label={label} {...rest}>
      <Icon name={icon} size={20} />
    </button>
  );
}
