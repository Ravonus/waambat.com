"use client";
import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { useNavigation } from "./NavigationProvider";

// Keep Next's anchors, modifier-click behavior, accessibility, and prefetch
// scheduler. React owns optimistic feedback for the same router transition.
export default function SiteLink({
  href,
  label,
  children,
  prefetch,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  label?: string;
}) {
  const { target, navigate } = useNavigation();
  const [intent, setIntent] = useState(false);
  const warm = () => {
    if (
      !(navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData
    )
      setIntent(true);
  };
  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch ?? (intent ? true : null)}
      data-pending={target?.href === href || undefined}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
      onNavigate={(event) => {
        if (!href.startsWith("/") || href.startsWith("//")) return;
        event.preventDefault();
        navigate(
          {
            href,
            label: label ?? (typeof children === "string" ? children : "page"),
          },
          { scroll: props.scroll, replace: props.replace },
        );
      }}
    >
      {children}
    </Link>
  );
}
