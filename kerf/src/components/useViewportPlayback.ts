import {onCleanup} from "@kerf-js/core";
import { onMount, state, watch } from '@kerf-js/core';
import { navigation } from './navigation/NavigationProvider';
export interface RefObject<T> {
    current: T | null | undefined;
}
export function useViewportPlayback(container: RefObject<HTMLElement>, disabled: boolean | (() => boolean) = false, onChange?: (playing: boolean) => void, minimumVisible = .1) {
    const requested = state(false), wanted = state(false), visible = state(false), intersecting = state(false), manual = state(false), paused = state(false), restricted = state(false), foreground = state(true), desired = { current: false };
    const nav = navigation;
    const sync = () => { const stopped = typeof disabled === 'function' ? disabled() : disabled; const play = !stopped && (visible.value || (manual.value && intersecting.value)) && foreground.value && nav.menu.value === 'closed' && !paused.value && (!restricted.value || manual.value); desired.current = play; wanted.value = play; if (play)
        requested.value = true; onChange?.(play); return play; };
    onMount(() => {
        const el = container.current;
        if (!el)
            return;
        const motion = matchMedia('(prefers-reduced-motion: reduce)');
        const connection = (navigator as Navigator & {
            connection?: EventTarget & {
                saveData?: boolean;
            };
        }).connection;
        const preferences = () => { restricted.value = motion.matches || !!connection?.saveData; manual.value = false; }, visibility = () => { foreground.value = !document.hidden; };
        preferences();
        visibility();
        const observer = new IntersectionObserver(([entry]) => { intersecting.value = !!entry?.isIntersecting; if (!entry) {
            visible.value = false;
            return;
        } const width = Math.min(entry.boundingClientRect.width, entry.rootBounds?.width ?? innerWidth), height = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height ?? innerHeight); visible.value = intersecting.value && entry.intersectionRect.width * entry.intersectionRect.height / Math.max(1, width * height) >= minimumVisible; }, { threshold: minimumVisible > .1 ? Array.from({ length: 21 }, (_, i) => i / 20) : [0, .1] });
        observer.observe(el);
        watch(() => [visible.value, intersecting.value, manual.value, paused.value, restricted.value, foreground.value, nav.menu.value, typeof disabled === 'function' ? disabled() : disabled], () => { sync(); });
        document.addEventListener('visibilitychange', visibility);
        motion.addEventListener('change', preferences);
        connection?.addEventListener('change', preferences);
        onCleanup(() => { desired.current = false; onChange?.(false); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', preferences); connection?.removeEventListener('change', preferences); });
    });
    return { requested, wanted, desired, play() { manual.value = true; paused.value = false; }, pause() { paused.value = true; manual.value = false; } };
}
