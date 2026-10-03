"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type SiteChromeContextValue = {
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
};

const SiteChromeContext = createContext<SiteChromeContextValue | null>(null);

export function SiteChromeProvider({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);

  // IMPORTANT: keep these callbacks stable. The previous version recreated
  // closeMenu/openMenu on every render, which caused SiteHeader's pathname
  // effect to immediately close the menu again after it opened.
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((current) => !current), []);

  const value = useMemo<SiteChromeContextValue>(
    () => ({ menuOpen, openMenu, closeMenu, toggleMenu }),
    [menuOpen, openMenu, closeMenu, toggleMenu],
  );

  return <SiteChromeContext.Provider value={value}>{children}</SiteChromeContext.Provider>;
}

export function useSiteChrome() {
  const context = useContext(SiteChromeContext);
  if (!context) {
    throw new Error("useSiteChrome must be used inside SiteChromeProvider");
  }
  return context;
}
