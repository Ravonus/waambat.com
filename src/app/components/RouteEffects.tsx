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
    const hide = () => {
      if (cursor.current) cursor.current.style.opacity = "0";
    };
    const move = (event: PointerEvent) => {
      if (
        !capability.matches ||
        event.pointerType === "touch" ||
        location.pathname.startsWith("/admin") ||
        (event.target as Element)?.closest(
          "input,textarea,select,[contenteditable],pre,code",
        )
      ) {
        hide();
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (cursor.current) {
          cursor.current.style.transform = `translate3d(${event.clientX}px,${event.clientY}px,0)`;
          cursor.current.style.opacity = "1";
        }
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    if (cursor.current) cursor.current.dataset.cursorReady = "true";
    document.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
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
