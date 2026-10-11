"use client";
import { useEffect, useRef, useState } from "react";
export default function RouteEffects() {
  const cursor = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const route = () => setPulse((v) => v + 1);
    window.addEventListener("waambat:navigate", route);
    return () => window.removeEventListener("waambat:navigate", route);
  }, []);
  useEffect(() => {
    const capability = matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let active: HTMLElement | null = null;
    let savedCursor = "",
      savedPriority = "";
    const restore = () => {
      if (
        active?.style.getPropertyValue("cursor") === "none" &&
        active.style.getPropertyPriority("cursor") === "important"
      ) {
        if (savedCursor)
          active.style.setProperty("cursor", savedCursor, savedPriority);
        else active.style.removeProperty("cursor");
      }
      active = null;
    };
    const hide = () => {
      cancelAnimationFrame(frame);
      restore();
      if (cursor.current) cursor.current.style.opacity = "0";
    };
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        restore();
        const target =
          event.target instanceof HTMLElement
            ? event.target
            : (event.target as Element)?.parentElement;
        const functional =
          target &&
          !["auto", "default", "pointer"].includes(
            getComputedStyle(target).cursor,
          );
        const text =
          target?.closest(
            "p,h1,h2,h3,h4,h5,h6,li,label,blockquote,figcaption",
          ) && !target?.closest("a,button,[role=button]");
        if (
          !capability.matches ||
          event.pointerType === "touch" ||
          event.buttons ||
          location.pathname.startsWith("/admin") ||
          functional ||
          text ||
          target?.closest(
            "input,textarea,select,[contenteditable],pre,code,[draggable=true]",
          )
        ) {
          hide();
          return;
        }
        if (target && cursor.current) {
          active = target;
          savedCursor = target.style.getPropertyValue("cursor");
          savedPriority = target.style.getPropertyPriority("cursor");
          target.style.setProperty("cursor", "none", "important");
          cursor.current.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
          cursor.current.style.opacity = "1";
        }
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    if (cursor.current) cursor.current.dataset.cursorReady = "true";
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("popstate", hide);
    window.addEventListener("waambat:navigate", hide);
    document.addEventListener("pointerdown", hide, { passive: true });
    capability.addEventListener("change", hide);
    return () => {
      hide();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("popstate", hide);
      window.removeEventListener("waambat:navigate", hide);
      document.removeEventListener("pointerdown", hide);
      capability.removeEventListener("change", hide);
    };
  }, []);
  return (
    <>
      <div
        ref={cursor}
        data-pink-cursor
        aria-hidden="true"
        className="waambat-cursor"
      >
        <span />
      </div>
      {pulse > 0 && (
        <div
          key={pulse}
          data-route-pulse
          aria-hidden="true"
          className="route-pulse"
        >
          <i />
          <i />
          <i />
        </div>
      )}
    </>
  );
}
