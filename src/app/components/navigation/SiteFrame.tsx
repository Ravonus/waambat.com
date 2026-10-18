"use client";
import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Content } from "~/lib/content";
import type { PageRoute } from "~/lib/navigation";
import Header from "../Header";
import { PageRoutesContext } from "./NavigationProvider";

export default function SiteFrame({
  children,
  navigation,
  style,
  motion,
  routes = [],
  hero,
  footer,
  preview = false,
  wide = false,
}: {
  children: ReactNode;
  navigation: Content["navigation"];
  style: CSSProperties;
  motion: string;
  routes?: PageRoute[];
  hero?: ReactNode;
  footer: ReactNode;
  preview?: boolean;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const route = routes.find((entry) => entry.href === pathname);
  const showHero = preview ? !!hero : pathname === "/" && !!hero;
  return (
    <PageRoutesContext value={routes}>
      {route?.splash ? (
        children
      ) : (
        <div
          className="site-theme flex min-h-screen flex-col"
          data-motion={motion}
          style={style}
        >
          <Header preview={preview} navigation={navigation} hero={showHero} />
          {showHero && hero}
          <main
            id="main-content"
            tabIndex={-1}
            className={`site-main mx-auto w-full flex-grow ${wide || route?.wide ? "site-main-wide" : ""}`}
          >
            {children}
          </main>
          {footer}
        </div>
      )}
    </PageRoutesContext>
  );
}
