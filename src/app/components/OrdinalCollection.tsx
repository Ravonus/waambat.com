import type { Content } from "~/lib/content";
import OrdinalPlayer from "./OrdinalPlayer";
import SourceImage from "./SourceImage";
import styles from "./OrdinalCollection.module.css";
export default function OrdinalCollection({
  section,
}: {
  section: Content["sections"][number];
}) {
  const items = section.items
    .filter((item) => !item.archived)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <section aria-label={section.title} className={styles.collection}>
      <h1>{section.title}</h1>
      {section.intro && <p className={styles.intro}>{section.intro}</p>}
      {items.map((item) =>
        item.kind === "link" ? (
          <p key={item.id} className={styles.resource}>
            <a href={item.tokenLink} target="_blank" rel="noopener noreferrer">
              {item.title} ↗
            </a>
          </p>
        ) : (
          <article
            key={item.id}
            data-artwork={item.id}
            className={styles.artwork}
          >
            <div className={styles.media}>
              {["video", "embed"].includes(item.kind) && item.videoSrc ? (
                <OrdinalPlayer artwork={item} />
              ) : (
                <a
                  href={item.tokenLink}
                  aria-label={`Open ${item.title} on Satflow`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SourceImage
                    src={item.poster}
                    alt={item.title}
                    sizes="(max-width: 767px) calc(100vw - 40px), 640px"
                    className="block h-auto w-full object-contain"
                  />
                </a>
              )}
            </div>
            <div className={styles.caption}>
              {item.title !== section.title && <h2>{item.title}</h2>}
              {item.description && (
                <details className={styles.details}>
                  <summary>About this artwork</summary>
                  <p>{item.description}</p>
                </details>
              )}
              <a
                href={item.tokenLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View {section.title} on Satflow ↗
              </a>
            </div>
          </article>
        ),
      )}
    </section>
  );
}
