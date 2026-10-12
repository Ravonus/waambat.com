"use client";
import { useEffect, useRef, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { defaultNavigation, type Content } from "~/lib/content";
import styles from "./Header.module.css";

function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {pending ? "Loading page" : null}
    </span>
  );
}

export default function Header({
  preview = false,
  navigation = defaultNavigation,
  hero = false,
}: {
  preview?: boolean;
  navigation?: Content["navigation"];
  hero?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = preview
    ? params.get("page") === "nfts"
      ? "/"
      : `/${params.get("page") ?? "nfts"}`
    : pathname;
  const routeKey = `${pathname}?${params.toString()}`;
  // A click starts navigation; only a committed route dismisses the menu.
  // An interrupted request leaves the close control and links available.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [observedRoute, setObservedRoute] = useState(routeKey);
  if (observedRoute !== routeKey) {
    setObservedRoute(routeKey);
    setOpenedAt(null);
  }
  const open = openedAt === routeKey;
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open || !dialog.current) return;
    const panel = dialog.current;
    const trigger = button.current;
    const body = document.body;
    const root = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const location = window.location.href;
    const saved = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      rootOverflow: root.style.overflow,
      scrollBehavior: root.style.scrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `${-scrollY}px`;
    body.style.left = `${-scrollX}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    panel.showModal();
    document.dispatchEvent(new Event("waambat:media-visibility"));
    closeButton.current?.focus({ preventScroll: true });
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const targets = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets.at(-1);
      if (
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last) ||
        !panel.contains(document.activeElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", trapFocus);
    const desktop = window.matchMedia("(min-width: 768px)");
    const resize = () => {
      if (desktop.matches) setOpenedAt(null);
    };
    desktop.addEventListener("change", resize);
    resize();
    return () => {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", trapFocus);
      panel.close();
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.left = saved.left;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      root.style.overflow = saved.rootOverflow;
      // Dismissal restores the underlying page. Successful navigation keeps
      // Next's destination scroll position instead of reviving the old one.
      if (window.location.href === location) {
        root.style.scrollBehavior = "auto";
        window.scrollTo(scrollX, scrollY);
        root.style.scrollBehavior = saved.scrollBehavior;
        if (!desktop.matches) trigger?.focus({ preventScroll: true });
      }
      document.dispatchEvent(new Event("waambat:media-visibility"));
    };
  }, [open]);

  const links = (mobile: boolean) =>
    navigation
      .filter((item) => !item.archived)
      .map((item) => (
        <Link
          key={item.id}
          href={
            preview && item.href.startsWith("/")
              ? `/admin/preview?page=${item.href === "/" ? "nfts" : item.href.slice(1)}`
              : item.href
          }
          onNavigate={() => {
            if (mobile && current === item.href) setOpenedAt(null);
            if (!preview) window.dispatchEvent(new Event("waambat:navigate"));
          }}
          aria-current={current === item.href ? "page" : undefined}
          className={`site-nav-link ${styles.link} ${mobile ? styles.mobileLink : ""} leading-[19.503px] tracking-[.06em]`}
        >
          {item.label}
          <NavigationHint />
        </Link>
      ));

  return (
    <header
      className="site-header mx-auto w-full max-w-none text-center"
      data-with-hero={hero || undefined}
    >
      <Link
        href="/"
        className={`site-logo text-waambat-logo font-brand inline-block font-normal tracking-normal ${styles.logo}`}
        aria-label="waambat home"
      >
        waambat
      </Link>
      <button
        ref={button}
        onClick={() => setOpenedAt(routeKey)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="mobile-site-menu"
        aria-label="Menu"
        className={styles.menuButton}
      >
        <svg
          aria-hidden="true"
          width="26"
          height="22"
          viewBox="0 0 26 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M2 3h22M2 11h22M2 19h22" />
        </svg>
      </button>
      <nav
        aria-label="Main navigation"
        className="mt-[20px] hidden flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 md:flex"
      >
        {links(false)}
      </nav>
      {open && (
        <dialog
          ref={dialog}
          id="mobile-site-menu"
          aria-label="Main navigation"
          className={styles.overlay}
          onCancel={(event) => {
            event.preventDefault();
            setOpenedAt(null);
          }}
        >
          <div className={styles.overlayHeader}>
            <span className={`font-brand ${styles.overlayWordmark}`}>
              waambat
            </span>
            <button
              ref={closeButton}
              onClick={() => setOpenedAt(null)}
              className={styles.closeButton}
              aria-label="Close menu"
            >
              <span aria-hidden="true">×</span> Close
            </button>
          </div>
          <nav className={styles.mobileNav} aria-label="Mobile navigation">
            {links(true)}
          </nav>
        </dialog>
      )}
    </header>
  );
}
