"use client";
import { useState, ViewTransition, type ReactNode } from "react";
import { useRouteAnimations } from "./NavigationProvider";

export default function PageTransition({
  children,
  routeKey,
  skeleton = false,
}: {
  children: ReactNode;
  routeKey?: string;
  skeleton?: boolean;
}) {
  // Capture eligibility at route mount. First visits stay plain markup;
  // starting navigation never reparents or remounts the current page.
  const [animate] = useState(useRouteAnimations());
  const content = skeleton ? (
    children
  ) : (
    <div data-page-content={routeKey}>{children}</div>
  );
  return animate ? (
    <ViewTransition
      name={skeleton ? undefined : "page-content"}
      enter={skeleton ? "skeleton-enter" : "page-enter"}
      exit={skeleton ? "skeleton-exit" : "page-exit"}
      share={skeleton ? "none" : "page-change"}
      update={skeleton ? "none" : "page-change"}
      default="none"
    >
      {content}
    </ViewTransition>
  ) : (
    content
  );
}
