/** Keep the same navigation within reach without leaving it over the artwork. */
export function mountFollowingNav(header: HTMLElement, chrome: HTMLElement, dock: HTMLElement) {
  let frame = 0,
    anchor = Math.max(0, scrollY),
    upward = false,
    threshold = 0,
    disposed = false;
  const desktop = matchMedia("(min-width: 768px)");
  const flag = (name: string, value: boolean) => {
    if (header.hasAttribute(name) === value) return;
    if (value) header.setAttribute(name, "");
    else header.removeAttribute(name);
  };
  const measure = () => {
    header.removeAttribute("data-nav-floating");
    header.style.setProperty("--header-rest-height", `${header.getBoundingClientRect().height}px`);
    threshold = header.getBoundingClientRect().bottom + Math.max(0, scrollY) + 24;
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
    const nearEnd = y + innerHeight >= document.documentElement.scrollHeight - 32;
    const floating = desktop.matches && y > threshold;
    const keyboardFocus = focused instanceof HTMLElement && focused.matches(":focus-visible");
    const revealed = upward || (keyboardFocus && chrome.contains(focused));
    const docked =
      !desktop.matches &&
      y > threshold &&
      (upward || nearEnd || (keyboardFocus && dock.contains(focused))) &&
      !typing &&
      !keyboard &&
      !document.fullscreenElement;
    flag("data-nav-floating", floating);
    flag("data-nav-revealed", floating && revealed);
    flag("data-nav-dock", docked);
    if (chrome.inert !== (floating && !revealed)) chrome.inert = floating && !revealed;
    if (dock.inert !== !docked) dock.inert = !docked;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resize = () => {
    measure();
    schedule();
  };
  measure();
  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", resize);
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", schedule);
  document.addEventListener("fullscreenchange", schedule);
  visualViewport?.addEventListener("resize", schedule);
  void document.fonts.ready.then(() => {
    if (!disposed) resize();
  });
  const dispose = () => {
    disposed = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", resize);
    document.removeEventListener("focusin", schedule);
    document.removeEventListener("focusout", schedule);
    document.removeEventListener("fullscreenchange", schedule);
    visualViewport?.removeEventListener("resize", schedule);
    chrome.inert = false;
    for (const name of ["data-nav-floating", "data-nav-revealed", "data-nav-dock"])
      header.removeAttribute(name);
    header.style.removeProperty("--header-rest-height");
  };
  return {
    dispose,
    reset() {
      upward = false;
      anchor = Math.max(0, scrollY);
      resize();
    },
  };
}
