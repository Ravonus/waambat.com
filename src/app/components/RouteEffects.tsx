"use client";
import { useEffect, useRef, useState } from "react";
import { cursorShapes, cursorStateAt, type CursorState } from "~/lib/cursor";

export default function RouteEffects() {
  const cursor = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const route = () => setPulse((v) => v + 1);
    window.addEventListener("waambat:navigate", route);
    return () => window.removeEventListener("waambat:navigate", route);
  }, []);
  useEffect(() => {
    const pointer = cursor.current;
    const ink = pointer?.firstElementChild as HTMLElement | null;
    if (
      !pointer ||
      !ink ||
      typeof pointer.showPopover !== "function" ||
      !CSS.supports("mask-image", "linear-gradient(black,black)") ||
      !CSS.supports("selector(:has(*))")
    )
      return;
    const root = document.documentElement;
    const capability = matchMedia("(hover: hover) and (pointer: fine)");
    let position: { x: number; y: number } | null = null;
    let dragging = false;
    let held: CursorState | null = null;
    let active: HTMLElement | SVGElement | null = null;
    let savedCursor = "",
      savedPriority = "";
    const overrideObserver = new MutationObserver(() => {
      // An observed application style write replaces our saved declaration.
      // Never restore over it.
      active = null;
      refresh();
    });
    const restore = () => {
      root.removeAttribute("data-waambat-cursor");
      if (overrideObserver.takeRecords().length) active = null;
      overrideObserver.disconnect();
      if (
        active?.style.cursor === "none" &&
        active.style.getPropertyPriority("cursor") === "important"
      ) {
        if (savedCursor)
          active.style.setProperty("cursor", savedCursor, savedPriority);
        else active.style.removeProperty("cursor");
      }
      active = null;
    };
    const hide = () => {
      restore();
      pointer.style.opacity = "0";
      if (pointer.matches(":popover-open")) pointer.hidePopover();
    };
    const refresh = () => {
      // Read authored semantics without our suppression, then commit both the
      // shape and suppression synchronously. No rAF gap or per-route cursor.
      restore();
      try {
        if (
          !position ||
          !capability.matches ||
          dragging ||
          document.hidden ||
          !pointer.isConnected
        ) {
          hide();
          return;
        }
        const { x, y } = position;
        if (x < 0 || y < 0 || x >= root.clientWidth || y >= root.clientHeight) {
          hide();
          return;
        }
        const target = document.elementFromPoint(x, y);
        const semantic = target && cursorStateAt(target, x, y);
        const state = semantic && (held ?? semantic);
        if (!target || !state) {
          hide();
          return;
        }
        const shape = cursorShapes[state];
        ink.style.maskImage = shape.mask;
        ink.style.width = `${shape.width}px`;
        ink.style.height = `${shape.height}px`;
        ink.style.left = `${-shape.x}px`;
        ink.style.top = `${-shape.y}px`;
        pointer.dataset.cursorState = state;
        pointer.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (!pointer.matches(":popover-open")) pointer.showPopover();
        const visual = getComputedStyle(pointer);
        if (
          visual.position !== "fixed" ||
          visual.pointerEvents !== "none" ||
          visual.display === "none" ||
          !ink.getBoundingClientRect().width
        ) {
          hide();
          return;
        }
        pointer.style.opacity = "1";
        root.dataset.waambatCursor = "active";
        // Inline !important beats author stylesheets. Only touch the hit element
        // when necessary and restore its exact declaration on every exit.
        if (
          getComputedStyle(target).cursor !== "none" &&
          (target instanceof HTMLElement || target instanceof SVGElement)
        ) {
          active = target;
          savedCursor = target.style.getPropertyValue("cursor");
          savedPriority = target.style.getPropertyPriority("cursor");
          overrideObserver.observe(target, {
            attributes: true,
            attributeFilter: ["style"],
          });
          target.style.setProperty("cursor", "none", "important");
          overrideObserver.takeRecords();
        }
        if (getComputedStyle(target).cursor !== "none") hide();
      } catch {
        hide();
      }
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        position = null;
        held = null;
        hide();
        return;
      }
      if (!event.buttons) held = null;
      position = { x: event.clientX, y: event.clientY };
      refresh();
    };
    const down = (event: PointerEvent) => {
      move(event);
      const state = pointer.dataset.cursorState as CursorState;
      if (
        pointer.style.opacity === "1" &&
        (state.includes("resize") || state === "text" || state === "grab")
      ) {
        held = state === "grab" ? "grabbing" : state;
        refresh();
      }
    };
    const up = (event: PointerEvent) => {
      held = null;
      move(event);
    };
    const leave = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        position = null;
        hide();
      }
    };
    const suspend = () => {
      position = null;
      held = null;
      dragging = false;
      hide();
    };
    const drag = () => {
      dragging = true;
      held = null;
      hide();
    };
    const dragEnd = () => {
      dragging = false;
      refresh();
    };
    const layer = () => {
      // A manual, non-interactive popover puts the one cursor in viewport
      // coordinates above dialogs, without reparenting or clipping it to art.
      if (pointer.matches(":popover-open")) pointer.hidePopover();
      refresh();
    };
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (r) => r.type === "attributes" && r.attributeName === "open",
        )
      )
        layer();
      else refresh();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open", "hidden", "disabled", "aria-disabled", "inert"],
    });
    // Capture also covers stopped propagation, SVG children and disabled controls.
    document.addEventListener("pointermove", move, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerover", move, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerout", leave, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerdown", down, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointerup", up, {
      passive: true,
      capture: true,
    });
    document.addEventListener("pointercancel", suspend, true);
    document.addEventListener("contextmenu", suspend, true);
    document.addEventListener("dragstart", drag, true);
    document.addEventListener("dragend", dragEnd, true);
    document.addEventListener("scroll", refresh, {
      passive: true,
      capture: true,
    });
    document.addEventListener("visibilitychange", suspend);
    document.addEventListener("fullscreenchange", layer);
    window.addEventListener("blur", suspend);
    window.addEventListener("popstate", refresh);
    window.addEventListener("waambat:navigate", refresh);
    window.addEventListener("resize", refresh);
    capability.addEventListener("change", suspend);
    pointer.dataset.cursorReady = "true";
    return () => {
      observer.disconnect();
      hide();
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerover", move, true);
      document.removeEventListener("pointerout", leave, true);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", suspend, true);
      document.removeEventListener("contextmenu", suspend, true);
      document.removeEventListener("dragstart", drag, true);
      document.removeEventListener("dragend", dragEnd, true);
      document.removeEventListener("scroll", refresh, true);
      document.removeEventListener("visibilitychange", suspend);
      document.removeEventListener("fullscreenchange", layer);
      window.removeEventListener("blur", suspend);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("waambat:navigate", refresh);
      window.removeEventListener("resize", refresh);
      capability.removeEventListener("change", suspend);
    };
  }, []);
  return (
    <>
      <div
        ref={cursor}
        data-pink-cursor
        aria-hidden="true"
        popover="manual"
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
