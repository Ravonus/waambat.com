/** Keep the same navigation within reach without leaving it over the artwork. */
export function mountFollowingNav(header: HTMLElement, chrome: HTMLElement, dock: HTMLElement) {
  let frame = 0,
    motionFrame = 0,
    anchor = Math.max(0, scrollY),
    upward = false,
    idle = false,
    pointing = false,
    idleTimer = 0,
    threshold = 0,
    disposed = false;
  const desktop = matchMedia("(min-width: 768px)");
  const flag = (name: string, value: boolean) => {
    if (header.hasAttribute(name) === value) return;
    if (value) header.setAttribute(name, "");
    else header.removeAttribute(name);
  };
  const measure = () => {
    flag('data-nav-animate', false);
    cancelAnimationFrame(motionFrame);
    header.removeAttribute("data-nav-ready");
    header.removeAttribute("data-nav-floating");
    const bounds = header.getBoundingClientRect(),
      style = getComputedStyle(header);
    header.style.setProperty("--header-rest-height", `${bounds.height}px`);
    header.style.setProperty("--header-rest-top", style.paddingTop);
    header.style.setProperty("--header-rest-bottom", style.paddingBottom);
    threshold = bounds.bottom + Math.max(0, scrollY) + 24;
    flag("data-nav-ready", desktop.matches);
    motionFrame = requestAnimationFrame(() => {
      // Settle the initial fixed padding before enabling compact/expanded motion.
      motionFrame = requestAnimationFrame(() => flag('data-nav-animate', true));
    });
  };
  const update = () => {
    frame = 0;
    if (disposed || header.dataset.menuOpen) return;
    const y = Math.max(0, scrollY),
      distance = y - anchor;
    if (Math.abs(distance) > 10) {
      upward = distance < 0;
      anchor = y;
    }
    const focused = document.activeElement;
    const typing =
      focused instanceof HTMLElement &&
      focused.matches('input, textarea, select, [contenteditable="true"]');
    const keyboard = !!visualViewport && visualViewport.height < innerHeight * 0.72;
    const floating = desktop.matches && y > threshold;
    const keyboardFocus = focused instanceof HTMLElement && focused.matches(":focus-visible");
    const revealed =
      y <= 4 || (upward && !idle) || pointing || (keyboardFocus && chrome.contains(focused));
    const docked =
      !desktop.matches &&
      y > threshold &&
      ((upward && !idle) || (keyboardFocus && dock.contains(focused))) &&
      !typing &&
      !keyboard &&
      !document.fullscreenElement;
    flag("data-nav-floating", floating);
    flag("data-nav-revealed", desktop.matches && revealed);
    flag("data-nav-dock", docked);
    if (chrome.inert !== (desktop.matches && !revealed))
      chrome.inert = desktop.matches && !revealed;
    if (dock.inert !== !docked) dock.inert = !docked;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const rest = () => {
    clearTimeout(idleTimer);
    if (scrollY <= 4) return;
    idleTimer = window.setTimeout(() => {
      idle = true;
      pointing = false;
      schedule();
    }, 2000);
  };
  const scroll = () => {
    idle = false;
    pointing = false;
    rest();
    schedule();
  };
  const enter = () => {
    if (!header.hasAttribute("data-nav-revealed")) return;
    idle = false;
    pointing = true;
    rest();
  };
  const leave = () => {
    pointing = false;
    rest();
    schedule();
  };
  const resize = () => {
    measure();
    schedule();
  };
  measure();
  update();
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", schedule);
  document.addEventListener("fullscreenchange", schedule);
  visualViewport?.addEventListener("resize", schedule);
  chrome.addEventListener("pointermove", enter);
  chrome.addEventListener("pointerleave", leave);
  void document.fonts.ready.then(() => {
    if (!disposed) resize();
  });
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(motionFrame);
    clearTimeout(idleTimer);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("resize", resize);
    document.removeEventListener("focusin", schedule);
    document.removeEventListener("focusout", schedule);
    document.removeEventListener("fullscreenchange", schedule);
    visualViewport?.removeEventListener("resize", schedule);
    chrome.removeEventListener("pointermove", enter);
    chrome.removeEventListener("pointerleave", leave);
    chrome.inert = false;
    for (const name of [
      "data-nav-ready",
      "data-nav-animate",
      "data-nav-floating",
      "data-nav-revealed",
      "data-nav-dock",
    ])
      header.removeAttribute(name);
    header.style.removeProperty("--header-rest-height");
    header.style.removeProperty("--header-rest-top");
    header.style.removeProperty("--header-rest-bottom");
  };
  return {
    dispose,
    reset() {
      upward = false;
      idle = pointing = false;
      clearTimeout(idleTimer);
      anchor = Math.max(0, scrollY);
      resize();
    },
  };
}
