/** One datamosh burst on the control a visitor presses (src/styles/effects.css).
 * Pointer and keyboard activation both count. Returns its own cleanup. */
const pressable =
  'a[href], button:not(:disabled), [role="option"], [role="button"], input[type="checkbox"], input[type="radio"]';

export function installMosh(): () => void {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  // Pending burst ends, so dispose can clear them and strip any burst still showing.
  const timers = new Map<Element, number>();
  const motionAllowed = () =>
    !reduce.matches &&
    (document.querySelector<HTMLElement>(".site-theme")?.dataset.motion ?? "full") === "full";
  const burst = (target: EventTarget | null) => {
    const control = target instanceof Element ? target.closest<HTMLElement>(pressable) : null;
    if (!control || !motionAllowed()) return;
    const repeated = control.hasAttribute("data-mosh-burst");
    control.setAttribute("data-mosh-burst", "");
    if (repeated) for (const animation of control.getAnimations()) {
      if (animation instanceof CSSAnimation && animation.animationName.startsWith('waambat-mosh-')) {
        animation.currentTime = 0;
        animation.play();
      }
    }
    clearTimeout(timers.get(control));
    timers.set(
      control,
      window.setTimeout(() => {
        timers.delete(control);
        control.removeAttribute("data-mosh-burst");
      }, 320),
    );
  };
  const down = (event: PointerEvent) => {
    if (event.button === 0) burst(event.target);
  };
  const key = (event: KeyboardEvent) => {
    if (!event.repeat && (event.key === "Enter" || event.key === " ")) burst(event.target);
  };
  document.addEventListener("pointerdown", down, { capture: true, passive: true });
  document.addEventListener("keydown", key, true);
  return () => {
    document.removeEventListener("pointerdown", down, true);
    document.removeEventListener("keydown", key, true);
    for (const [control, timer] of timers) {
      clearTimeout(timer);
      control.removeAttribute("data-mosh-burst");
    }
    timers.clear();
  };
}
