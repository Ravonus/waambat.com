"use client";
import {
  createContext,
  Suspense,
  use,
  useCallback,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "zustand";
import {
  createNavigationStore,
  type NavigationStore,
} from "~/lib/navigation-store";
import {
  routeAddress,
  type NavigationTarget,
  type PageRoute,
} from "~/lib/navigation";
import styles from "./navigation.module.css";

const StoreContext = createContext<NavigationStore | null>(null);
const NavigationContext = createContext<{
  target: NavigationTarget | null;
  navigate: (
    target: NavigationTarget,
    options: { scroll?: boolean; replace?: boolean },
  ) => void;
} | null>(null);
export const PageRoutesContext = createContext<PageRoute[]>([]);

export function useNavigationStoreApi() {
  const store = use(StoreContext);
  if (!store) throw new Error("NavigationProvider is missing");
  return store;
}
export function useMenuPhase() {
  return useStore(useNavigationStoreApi(), (state) => state.menu);
}
export function useRouteAnimations() {
  return useStore(
    useNavigationStoreApi(),
    (state) => state.hasNavigated && state.menu === "closed",
  );
}
export function useNavigation() {
  const navigation = use(NavigationContext);
  if (!navigation) throw new Error("NavigationProvider is missing");
  return navigation;
}

function NavigationCommit() {
  const store = useNavigationStoreApi();
  const pathname = usePathname();
  const search = useSearchParams();
  const address = routeAddress(pathname, search.toString());
  // Callback refs run at the destination commit, including a loading boundary.
  const committed = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      const state = store.getState();
      if (state.menuOrigin !== null && state.menuOrigin !== address) {
        if (document.querySelector("#mobile-site-menu[open]"))
          state.closeMenu();
        else state.finishClose();
      }
    },
    [address, store],
  );
  return <span hidden aria-hidden="true" ref={committed} />;
}

export default function NavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [store] = useState(createNavigationStore);
  const router = useRouter();
  const [target, setTarget] = useOptimistic<NavigationTarget | null>(null);
  const [pending, startNavigation] = useTransition();
  const navigate = useCallback(
    (
      destination: NavigationTarget,
      options: { scroll?: boolean; replace?: boolean },
    ) => {
      if (
        destination.href ===
        `${location.pathname}${location.search}${location.hash}`
      ) {
        store.getState().closeMenu();
        return;
      }
      // Initial streaming should paint immediately. Enable view transitions
      // only once a person actually navigates within this application.
      store.getState().navigationStarted();
      startNavigation(() => {
        setTarget(destination);
        const settings = { scroll: options.scroll };
        if (options.replace) router.replace(destination.href, settings);
        else router.push(destination.href, settings);
      });
    },
    [router, setTarget, store],
  );
  return (
    <StoreContext value={store}>
      <NavigationContext value={{ target, navigate }}>
        <Suspense fallback={null}>
          <NavigationCommit />
        </Suspense>
        {pending && target && (
          <div
            className={styles.progress}
            role="status"
            aria-live="polite"
            data-navigation-pending={target.href}
          >
            <span className="sr-only">Opening {target.label}</span>
            <i aria-hidden="true" />
          </div>
        )}
        {children}
      </NavigationContext>
    </StoreContext>
  );
}
