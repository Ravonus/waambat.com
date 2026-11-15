import {onCleanup} from "@kerf-js/core";
import { onMount, state } from '@kerf-js/core';
export function useMediaPreference(query: string) {
    const matches = state<boolean | undefined>(undefined);
    onMount(() => { const m = matchMedia(query); const sync = () => { matches.value = m.matches; }; sync(); m.addEventListener('change', sync); onCleanup(() => m.removeEventListener('change', sync)); });
    return matches;
}
export function useSaveData() {
    const saving = state(false);
    onMount(() => { const connection = (navigator as Navigator & {
        connection?: EventTarget & {
            saveData?: boolean;
        };
    }).connection; const sync = () => { saving.value = !!connection?.saveData; }; sync(); connection?.addEventListener('change', sync); onCleanup(() => connection?.removeEventListener('change', sync)); });
    return saving;
}
