// React 19 callback-ref cleanup owns the dialog's browser resources.
export function mountMobileMenu(
  panel: HTMLDialogElement,
  header: HTMLElement,
  trigger: HTMLButtonElement | null,
  close: () => void,
  finish: () => void,
) {
  const site = header.closest<HTMLElement>(".site-theme");
  if (!site) return;
  const body = document.body;
  const root = document.documentElement;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const address = location.href;
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
  let released = false;
  const releaseScroll = () => {
    if (released) return;
    released = true;
    body.style.position = saved.position;
    body.style.top = saved.top;
    body.style.left = saved.left;
    body.style.width = saved.width;
    body.style.overflow = saved.overflow;
    root.style.overflow = saved.rootOverflow;
    if (location.href === address) {
      root.style.scrollBehavior = "auto";
      window.scrollTo(scrollX, scrollY);
      root.style.scrollBehavior = saved.scrollBehavior;
    }
  };
  const attributes = ["role", "aria-modal", "aria-label", "data-menu-open"].map(
    (name) => [name, site.getAttribute(name)] as const,
  );
  site.setAttribute("role", "dialog");
  site.setAttribute("aria-modal", "true");
  site.setAttribute("aria-label", "Main navigation");
  site.dataset.menuOpen = "true";
  const background = Array.from(site.children).filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement &&
      node !== header &&
      !node.matches("[data-hero]"),
  );
  const inert = background.map((node) => [node, node.inert] as const);
  for (const node of background) node.inert = true;
  panel.show();
  panel
    .querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')
    ?.focus({ preventScroll: true });
  const key = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const targets = Array.from(
      site.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), [tabindex="0"]',
      ),
    ).filter(
      (node) =>
        node.getClientRects().length > 0 &&
        !node.closest("[inert]") &&
        getComputedStyle(node).visibility !== "hidden",
    );
    const first = targets[0],
      last = targets.at(-1);
    if (
      (event.shiftKey && document.activeElement === first) ||
      (!event.shiftKey && document.activeElement === last) ||
      !site.contains(document.activeElement)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus({ preventScroll: true });
    }
  };
  const desktop = matchMedia("(min-width: 768px)");
  const resize = () => {
    if (desktop.matches) finish();
  };
  document.addEventListener("keydown", key);
  desktop.addEventListener("change", resize);
  resize();
  return {
    releaseForNavigation: releaseScroll,
    dispose() {
      desktop.removeEventListener("change", resize);
      document.removeEventListener("keydown", key);
      panel.close();
      for (const [node, previous] of inert) node.inert = previous;
      for (const [name, value] of attributes) {
        if (value === null) site.removeAttribute(name);
        else site.setAttribute(name, value);
      }
      releaseScroll();
      // Ref cleanup precedes the header's attribute update. Restore focus
      // after the commit, when its Menu button is visible again. Strict Mode
      // may have reattached the dialog by then; keep its focus in that case.
      queueMicrotask(() => {
        if (document.querySelector("#mobile-site-menu[open]")) return;
        if (location.href === address) {
          if (!desktop.matches && trigger?.isConnected)
            trigger.focus({ preventScroll: true });
        } else {
          const main = document.querySelector<HTMLElement>("#main-content");
          if (main) {
            main.tabIndex = -1;
            main.focus({ preventScroll: true });
          }
        }
      });
    },
  };
}
