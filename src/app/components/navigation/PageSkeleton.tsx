"use client";
import { use } from "react";
import { usePathname } from "next/navigation";
import { fallbackRoute, type SkeletonKind } from "~/lib/navigation";
import { PageRoutesContext, useNavigation } from "./NavigationProvider";
import styles from "./navigation.module.css";
import PageTransition from "./PageTransition";

export default function PageSkeleton({ kind }: { kind?: SkeletonKind }) {
  const pathname = usePathname();
  const { target } = useNavigation();
  const routes = use(PageRoutesContext);
  const address = target?.href.split(/[?#]/)[0] ?? pathname;
  const route =
    routes.find((entry) => entry.href === address) ?? fallbackRoute(address);
  const layout = kind ?? route.kind;
  return (
    <PageTransition skeleton>
      <section
        className={styles.skeleton}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={`Loading ${target?.label ?? route.label}`}
        data-route-skeleton={layout}
      >
        <span className={styles.caption}>
          Loading {target?.label ?? route.label}
        </span>
        <div aria-hidden="true" className={styles.placeholder}>
          <div className={`${styles.bone} ${styles.heading}`} />
          {layout === "gallery" ? (
            <>
              <div className={`${styles.bone} ${styles.hero}`} />
              <div className={`${styles.bone} ${styles.artwork}`} />
            </>
          ) : layout === "archive" || layout === "ordinals" ? (
            <div
              className={
                layout === "archive" ? styles.mosaic : styles.collection
              }
            >
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className={`${styles.bone} ${styles.tile}`} />
              ))}
            </div>
          ) : layout === "contact" ? (
            <>
              <div className={styles.lines}>
                <i className={styles.bone} />
                <i className={styles.bone} />
                <i className={styles.bone} />
              </div>
              <div className={`${styles.bone} ${styles.artwork}`} />
              <div className={styles.fields}>
                <i className={styles.bone} />
                <i className={styles.bone} />
                <i className={styles.bone} />
              </div>
            </>
          ) : layout === "studio" ? (
            <div className={styles.fields}>
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} className={styles.bone} />
              ))}
            </div>
          ) : (
            <>
              <div className={styles.lines}>
                {Array.from({ length: 5 }, (_, index) => (
                  <i key={index} className={styles.bone} />
                ))}
              </div>
              <div className={`${styles.bone} ${styles.artwork}`} />
            </>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
