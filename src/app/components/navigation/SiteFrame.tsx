"use client";
import { ViewTransition, type CSSProperties, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Content } from "~/lib/content";
import type { PageRoute } from "~/lib/navigation";
import Header from "../Header";
import { PageRoutesContext, useRouteAnimations } from "./NavigationProvider";

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
  const search = useSearchParams();
  const animate = useRouteAnimations();
  const route = routes.find((entry) => entry.href === pathname);
  const showHero = preview ? !!hero : pathname === "/" && !!hero;
  const routeKey = preview ? `${pathname}?${search.toString()}` : pathname;
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
          {showHero && (
            <ViewTransition
              enter={animate ? "page-enter" : "none"}
              exit={animate ? "page-exit" : "none"}
              default="none"
            >
              {hero}
            </ViewTransition>
          )}
          <main
            id="main-content"
            tabIndex={-1}
            className={`site-main mx-auto w-full flex-grow ${wide || route?.wide ? "site-main-wide" : ""}`}
          >
            <ViewTransition
              name="page-content"
              enter={animate ? "page-enter" : "none"}
              exit={animate ? "page-exit" : "none"}
              share={animate ? "page-change" : "none"}
              update={animate ? "page-change" : "none"}
              default="none"
            >
              <div key={routeKey} data-page-content={routeKey}>
                {children}
              </div>
            </ViewTransition>
          </main>
          {footer}
        </div>
      )}
    </PageRoutesContext>
  );
}
