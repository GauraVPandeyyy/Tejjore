"use client";

import { usePathname } from "next/navigation";
import { useSiteChrome } from "./SiteChromeProvider";
import { useStayPlanner } from "./StayPlanner";
import { Icon } from "@/components/ui/Icon";
import { CONCIERGE_NAME, CONCIERGE_ROLE, ConciergeMark } from "@/components/concierge/ConciergeMark";

/**
 * The one site-wide bottom dock below 1024 px (masterplan §3), merging the old home-only booking
 * dock and the unused MobileActionBar: [Menu] [Ask | Book •] [AI]. It lives in the thumb zone, is
 * 56 px plus the safe area, and a spacer of the same height keeps it from ever covering content.
 */
export function SiteDock() {
  const pathname = usePathname();
  const { menuOpen, toggleMenu } = useSiteChrome();
  const { book, openAskSheet } = useStayPlanner();
  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <div className="tj-dock-spacer" aria-hidden="true" />
      <div className="tj-dock" data-menu-open={menuOpen ? "true" : "false"}>
        <button type="button" className="tj-circle tj-circle--lake tj-dock__menu" onClick={toggleMenu} aria-expanded={menuOpen} aria-controls="site-menu" aria-label={menuOpen ? "Close menu" : "Open menu"}>
          <Icon name={menuOpen ? "close" : "menu"} size={22} />
        </button>
        <div className="tj-dock__pill" role="group" aria-label="Ask or book">
          <button type="button" className="tj-dock__ask" onClick={() => openAskSheet()} aria-haspopup="dialog">
            Ask
          </button>
          <button type="button" className="tj-dock__book" onClick={() => book()}>
            Book <span className="tj-pill__dot" aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="tj-circle tj-circle--mist tj-dock__ai" aria-label={`Ask ${CONCIERGE_NAME}, ${CONCIERGE_ROLE}`} onClick={() => window.dispatchEvent(new Event("tejjora:concierge-open"))}>
          <ConciergeMark size={26} />
        </button>
      </div>
    </>
  );
}
