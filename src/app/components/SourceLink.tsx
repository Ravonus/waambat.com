import type { AnchorHTMLAttributes } from "react";
import SiteLink from "./navigation/SiteLink";

export default function SourceLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return href?.startsWith("/") && !href.startsWith("//") ? (
    <SiteLink {...props} href={href}>
      {children}
    </SiteLink>
  ) : (
    <a {...props} href={href}>
      {children}
    </a>
  );
}
