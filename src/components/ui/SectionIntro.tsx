import type { ReactNode } from "react";
import { PillLink } from "./Buttons";
import { Reveal } from "./Motion";
import { Ornament } from "./Waterline";

/**
 * The one repeated section grammar (masterplan §2.7): ornament → caps heading → short centred
 * paragraph → outline pill. Used for every major section so the site reads as one piece.
 */
export function SectionIntro({
  id,
  eyebrow,
  title,
  children,
  action,
  tone = "paper",
  as: Heading = "h2",
  align = "center",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  action?: { href: string; label: string };
  tone?: "paper" | "lake";
  as?: "h1" | "h2";
  align?: "center" | "start";
}) {
  return (
    <Reveal className={`tj-intro tj-intro--${align} tj-intro--${tone}`}>
      <Ornament />
      {eyebrow ? <p className="tj-eyebrow">{eyebrow}</p> : null}
      <Heading id={id} className="tj-heading">
        {title}
      </Heading>
      {children ? <div className="tj-intro__text">{children}</div> : null}
      {action ? (
        <PillLink href={action.href} variant={tone === "lake" ? "outline-light" : "outline"}>
          {action.label}
        </PillLink>
      ) : null}
    </Reveal>
  );
}
