"use client";
import { useCallback, useSyncExternalStore } from "react";

const unmeasured = () => undefined;
export function useMediaPreference(query: string) {
  const subscribe = useCallback(
    (changed: () => void) => {
      const media = matchMedia(query);
      media.addEventListener("change", changed);
      return () => media.removeEventListener("change", changed);
    },
    [query],
  );
  const snapshot = useCallback(() => matchMedia(query).matches, [query]);
  return useSyncExternalStore<boolean | undefined>(
    subscribe,
    snapshot,
    unmeasured,
  );
}

type Connection = EventTarget & { saveData?: boolean };
const connection = () =>
  (navigator as Navigator & { connection?: Connection }).connection;
const subscribeData = (changed: () => void) => {
  const source = connection();
  source?.addEventListener("change", changed);
  return () => source?.removeEventListener("change", changed);
};
const dataSnapshot = () => !!connection()?.saveData;
const noSaveData = () => false;
export function useSaveData() {
  return useSyncExternalStore(subscribeData, dataSnapshot, noSaveData);
}
