"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

// One lifecycle for native home paintings and archive provider players.
// Keep requested sources attached; visibility changes pause instead of reloading.
export function useViewportPlayback(
  container: RefObject<HTMLElement | null>,
  disabled = false,
  onChange?: (playing: boolean) => void,
) {
  const [requested, setRequested] = useState(false);
  const [wanted, setWanted] = useState(false);
  const visible = useRef(false);
  const manual = useRef(false);
  const paused = useRef(false);
  const restricted = useRef(false);
  const desired = useRef(false);
  const listener = useRef(onChange);
  useEffect(() => {
    listener.current = onChange;
  }, [onChange]);
  const sync = useRef(() => {});
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const update = () => {
      const play =
        !disabled &&
        element.isConnected &&
        visible.current &&
        !document.hidden &&
        !document.querySelector("#mobile-site-menu[open]") &&
        !paused.current &&
        (!restricted.current || manual.current);
      desired.current = play;
      listener.current?.(play);
      if (play) setRequested(true);
      setWanted(play);
    };
    sync.current = update;
    const preferences = () => {
      restricted.current = motion.matches || !!connection?.saveData;
      manual.current = false;
      update();
    };
    preferences();
    const observer = new IntersectionObserver(
      (entries) => {
        visible.current =
          !!entries[0]?.isIntersecting && entries[0].intersectionRatio >= 0.1;
        update();
      },
      { threshold: [0, 0.1] },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    document.addEventListener("waambat:media-visibility", update);
    motion.addEventListener("change", preferences);
    connection?.addEventListener("change", preferences);
    return () => {
      desired.current = false;
      listener.current?.(false);
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      document.removeEventListener("waambat:media-visibility", update);
      motion.removeEventListener("change", preferences);
      connection?.removeEventListener("change", preferences);
    };
  }, [container, disabled]);
  return {
    requested,
    wanted,
    desired,
    play() {
      manual.current = true;
      paused.current = false;
      sync.current();
    },
    pause() {
      paused.current = true;
      manual.current = false;
      sync.current();
    },
  };
}
