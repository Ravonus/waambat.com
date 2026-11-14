export type SkeletonKind =
  | "gallery"
  | "ordinals"
  | "archive"
  | "contact"
  | "article"
  | "studio";
export type PageRoute = {
  href: string;
  label: string;
  kind: SkeletonKind;
  wide?: boolean;
  splash?: boolean;
};
export type NavigationTarget = { href: string; label: string };

export function routeAddress(pathname: string, search = "") {
  return `${pathname}${search ? `?${search}` : ""}`;
}

export function fallbackRoute(pathname: string): PageRoute {
  if (pathname.startsWith("/admin"))
    return { href: pathname, label: "Content studio", kind: "studio" };
  if (pathname === "/") return { href: "/", label: "NFTs", kind: "gallery" };
  if (pathname === "/ordinals")
    return { href: pathname, label: "ORDINALS", kind: "ordinals", wide: true };
  return {
    href: pathname,
    label: pathname.slice(1).replaceAll("-", " "),
    kind:
      pathname === "/contact-waambat"
        ? "contact"
        : pathname === "/art-by-waambat"
          ? "archive"
          : "article",
  };
}
