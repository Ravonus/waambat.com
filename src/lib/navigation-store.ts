import { createStore } from "zustand/vanilla";

export type MenuPhase = "closed" | "open" | "closing";

// One store per mounted application. Only transient UI state belongs here;
// page data, drafts, and navigation completion stay with Next and React.
export function createNavigationStore() {
  return createStore<{
    menu: MenuPhase;
    menuOrigin: string | null;
    hasNavigated: boolean;
    navigationStarted: () => void;
    openMenu: (route: string) => void;
    closeMenu: () => void;
    finishClose: () => void;
  }>((set, get) => ({
    menu: "closed",
    menuOrigin: null,
    hasNavigated: false,
    navigationStarted: () => {
      if (!get().hasNavigated) set({ hasNavigated: true });
    },
    openMenu: (route) => set({ menu: "open", menuOrigin: route }),
    closeMenu: () => {
      if (get().menu === "open") set({ menu: "closing" });
    },
    finishClose: () => {
      if (get().menu !== "closed") set({ menu: "closed", menuOrigin: null });
    },
  }));
}

export type NavigationStore = ReturnType<typeof createNavigationStore>;
