"use client";
import { useCallback, useRef, ViewTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Content } from "~/lib/content";
import { routeAddress } from "~/lib/navigation";
import SiteLink from "./navigation/SiteLink";
import {
  useMenuPhase,
  useNavigationStoreApi,
} from "./navigation/NavigationProvider";
import { mountMobileMenu } from "./navigation/mobile-menu";
import styles from "./Header.module.css";

export default function Header({
  preview = false,
  navigation,
  hero = false,
}: {
  preview?: boolean;
  navigation: Content["navigation"];
  hero?: boolean;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const current = preview
    ? params.get("page") === "nfts"
      ? "/"
      : `/${params.get("page") ?? "nfts"}`
    : pathname;
  const routeKey = routeAddress(pathname, params.toString());
  const phase = useMenuPhase();
  const open = phase !== "closed";
  const store = useNavigationStoreApi();
  const header = useRef<HTMLElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const controller = useRef<ReturnType<typeof mountMobileMenu>>(undefined);
  const headerRef = useCallback(
    (node: HTMLElement | null) => {
      header.current = node;
      const state = store.getState();
      if (node && state.menuOrigin !== null && state.menuOrigin !== routeKey) {
        controller.current?.releaseForNavigation();
        state.closeMenu();
      }
    },
    [routeKey, store],
  );
  const menuRef = useCallback(
    (node: HTMLDialogElement | null) => {
      if (!node || !header.current) return;
      const state = store.getState();
      const mounted = mountMobileMenu(
        node,
        header.current,
        button.current,
        state.closeMenu,
        state.finishClose,
      );
      controller.current = mounted;
      return () => {
        mounted?.dispose();
        if (controller.current === mounted) controller.current = undefined;
      };
    },
    [store],
  );
  const home = preview ? "/admin/preview?page=nfts" : "/";
  const links = (mobile: boolean) =>
    navigation
      .filter((item) => !item.archived)
      .map((item) => (
        <SiteLink
          key={item.id}
          href={
            preview && item.href.startsWith("/")
              ? `/admin/preview?page=${item.href === "/" ? "nfts" : item.href.slice(1)}`
              : item.href
          }
          label={item.label}
          aria-current={current === item.href ? "page" : undefined}
          className={`site-nav-link ${styles.link} ${mobile ? styles.mobileLink : ""} leading-[19.503px] tracking-[.06em]`}
        >
          {item.label}
          <span className={styles.linkProgress} aria-hidden="true" />
        </SiteLink>
      ));
  return (
    <header
      ref={headerRef}
      data-menu-open={open || undefined}
      className="site-header mx-auto w-full max-w-none text-center"
      data-with-hero={hero || undefined}
    >
      <SiteLink
        href={home}
        label="NFTs"
        className={`site-logo text-waambat-logo font-brand inline-block font-normal tracking-normal ${styles.logo}`}
        aria-label="waambat home"
      >
        waambat
      </SiteLink>
      <button
        ref={button}
        onClick={() => store.getState().openMenu(routeKey)}
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
        <ViewTransition exit="menu-exit" default="none">
          <dialog
            ref={menuRef}
            id="mobile-site-menu"
            role="presentation"
            className={styles.overlay}
            data-phase={phase}
            onCancel={(event) => {
              event.preventDefault();
              store.getState().closeMenu();
            }}
            onAnimationEnd={(event) => {
              if (
                event.target === event.currentTarget &&
                store.getState().menu === "closing"
              )
                store.getState().finishClose();
            }}
          >
            <div className={styles.overlayHeader}>
              <button
                onClick={() => store.getState().closeMenu()}
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
        </ViewTransition>
      )}
    </header>
  );
}
