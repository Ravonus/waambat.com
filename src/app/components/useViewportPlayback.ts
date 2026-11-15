"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject,
} from "react";
import {observeMediaViewport} from '@kerf-js/media/browser';
import { useNavigationStoreApi } from "./navigation/NavigationProvider";

// One lifecycle for native home paintings and archive provider players.
// Keep requested sources attached; visibility changes pause instead of reloading.
export function useViewportPlayback(
  container: RefObject<HTMLElement | null>,
  disabled = false,
  onChange?: (playing: boolean) => void,
  minimumVisible = 0.1,
) {
  const [requested, setRequested] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [preparing,setPreparing]=useState(false);
  const ahead=useRef(false),near=useRef(false);
  const visible = useRef(false);
  const intersecting = useRef(false);
  const manual = useRef(false);
  const paused = useRef(false);
  const restricted = useRef(false);
  const desired = useRef(false);
  const navigation = useNavigationStoreApi();
  const notify = useEffectEvent((playing: boolean) => onChange?.(playing));
  const sync = useRef<() => boolean>(() => false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (
      navigator as Navigator & {
        connection?: EventTarget & { saveData?: boolean };
      }
    ).connection;
    const compute = () => {
      const play =
        !disabled &&
        element.isConnected &&
        (visible.current || ahead.current || (manual.current && intersecting.current)) &&
        !document.hidden &&
        navigation.getState().menu === "closed" &&
        !paused.current &&
        (!restricted.current || manual.current);
      desired.current = play;
      const prepare=!disabled&&element.isConnected&&!document.hidden&&navigation.getState().menu==='closed'&&!paused.current&&!restricted.current&&near.current;
      setPreparing(prepare);
      if (play||prepare) setRequested(true);
      setWanted(play);
      return play;
    };
    sync.current = compute;
    const update = () => notify(compute());
    const unsubscribeMenu = navigation.subscribe(update);
    const preferences = () => {
      restricted.current = motion.matches || !!connection?.saveData;
      manual.current = false;
      update();
    };
    preferences();
    const stop=observeMediaViewport(element,state=>{visible.current=state.visible;intersecting.current=state.intersecting;ahead.current=state.anticipating;near.current=state.preparing;update();},minimumVisible);
    document.addEventListener("visibilitychange", update);
    motion.addEventListener("change", preferences);
    connection?.addEventListener("change", preferences);
    return () => {
      desired.current = false;
      notify(false);
      unsubscribeMenu();
      stop();
      document.removeEventListener("visibilitychange", update);
      motion.removeEventListener("change", preferences);
      connection?.removeEventListener("change", preferences);
    };
  }, [container, disabled, minimumVisible, navigation]);
  return {
    requested,
    wanted,
    preparing,
    desired,
    play() {
      manual.current = true;
      paused.current = false;
      onChange?.(sync.current());
    },
    pause() {
      paused.current = true;
      manual.current = false;
      onChange?.(sync.current());
    },
  };
}
