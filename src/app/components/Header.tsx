"use client";
import { useEffect, useRef, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <span role="status" aria-live="polite" className="ml-1 inline-block w-3">
      {pending ? (
        <>
          <span aria-hidden="true">…</span>
          <span className="sr-only">Loading page</span>
        </>
      ) : null}
    </span>
  );
}
import { defaultNavigation, type Content } from "~/lib/content";
export default function Header({
  preview = false,
  navigation = defaultNavigation,
}: {
  preview?: boolean;
  navigation?: Content["navigation"];
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = preview
    ? params.get("page") === "nfts"
      ? "/"
      : `/${params.get("page") ?? "nfts"}`
    : pathname;
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="mx-auto max-w-[1080px] px-5 pt-10 pb-8 text-center md:px-[60px] md:pt-[60px]">
      <Link
        href="/"
        className="text-waambat-logo font-brand inline-block text-[37px] leading-tight font-normal tracking-[.03em]"
        aria-label="waambat home"
      >
        waambat
      </Link>
      <button
        ref={button}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="site-menu"
        className="absolute top-12 right-5 text-sm md:hidden"
      >
        {open ? "× Close" : "Menu"}
      </button>
      <nav
        id="site-menu"
        aria-label="Main navigation"
        className={`${open ? "flex" : "hidden"} mt-7 flex-col items-center gap-x-6 gap-y-2 md:flex md:flex-row md:flex-wrap md:justify-center`}
      >
        {navigation
          .filter((item) => !item.archived)
          .map((item) => (
            <Link
              key={item.id}
              href={
                preview && item.href.startsWith("/")
                  ? `/admin/preview?page=${item.href === "/" ? "nfts" : item.href.slice(1)}`
                  : item.href
              }
              onClick={() => setOpen(false)}
              onNavigate={() => {
                if (!preview)
                  window.dispatchEvent(new Event("waambat:navigate"));
              }}
              aria-current={current === item.href ? "page" : undefined}
              className={`hover:text-waambat-hover py-1 text-[14px] ${current === item.href ? "text-white" : "text-[#9c9c9c]"}`}
            >
              {item.label}
              <NavigationHint />
            </Link>
          ))}
      </nav>
    </header>
  );
}
