import { preconnect, preload } from "react-dom";
import type { Content } from "~/lib/content";
import { inscriptionPage, isPiece, marketplace } from "~/lib/ordinal-page";
import { opensLive } from "~/lib/ordinal-sources";
import { videoSource } from "~/lib/video-source";
import OrdinalPiece from "./OrdinalPiece";
import SourceImage from "./SourceImage";
import styles from "./OrdinalCollection.module.css";

type Section = Content["sections"][number];

export default function OrdinalCollection({
  title,
  pieces,
  early,
}: {
  title: string;
  pieces: Section[];
  early?: Section;
}) {
  const cards = pieces.flatMap((section) => {
    const items = section.items.filter((item) => !item.archived);
    const links = items.filter((item) => item.kind === "link");
    return items.filter(isPiece).map((item, index) => ({
      section,
      item,
      intro: index === 0 ? section.intro : "",
      links: index === 0 ? links : [],
    }));
  });
  // The first pieces are what the page is for: their stills are fetched first, and the live
  // inscription host is warmed so opening a piece does not wait on a handshake.
  preconnect("https://ordinals.com");
  for (const { item } of cards.slice(0, 2))
    if (item.poster.startsWith("/"))
      preload(item.poster, { as: "image", fetchPriority: "high" });
  const gifs = early?.items.filter((item) => !item.archived) ?? [];
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      {cards.length > 0 && (
        <div className={styles.pieces} aria-label="Live Ordinals artworks">
          {cards.map(({ section, item, intro, links }, index) => {
            const market = marketplace(item.tokenLink);
            // The videos have no live piece to open, so their inscription is one click away instead.
            const player = videoSource(item.videoSrc)?.player ?? "";
            const original = opensLive(player, !!item.previewSrc)
              ? ""
              : inscriptionPage(player);
            const kicker = item.title
              .toLowerCase()
              .includes(section.title.toLowerCase())
              ? ""
              : section.title;
            return (
              <article
                key={item.id}
                data-artwork={item.id}
                className={styles.piece}
              >
                <OrdinalPiece artwork={item} priority={index < 2} />
                <div className={styles.caption}>
                  {kicker && <p className={styles.kicker}>{kicker}</p>}
                  <h2>{item.title}</h2>
                  {intro && <p>{intro}</p>}
                  {item.description && <p>{item.description}</p>}
                  <p className={styles.links}>
                    <a
                      href={item.tokenLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {market ? `View on ${market}` : "View collection"} ↗
                    </a>
                    {original && (
                      <a
                        href={original}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Original inscription ↗
                      </a>
                    )}
                    {links.map((link) => (
                      <a
                        key={link.id}
                        href={link.tokenLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.description || undefined}
                      >
                        {link.title} ↗
                      </a>
                    ))}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {early && !early.archived && gifs.length > 0 && (
        <section aria-label={early.title} className={styles.early}>
          {early.intro && <p className={styles.lead}>{early.intro}</p>}
          <div className={styles.gifs}>
            {gifs.map((item) => (
              <article
                key={item.id}
                data-artwork={item.id}
                className={styles.gif}
              >
                <a
                  href={item.tokenLink}
                  aria-label={`Open ${item.title} original inscription page`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.gifImage}
                >
                  <SourceImage
                    src={item.poster}
                    alt={item.title}
                    sizes="300px"
                    className={styles.gifPicture}
                  />
                </a>
                <h3>
                  <a
                    href={item.tokenLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>
                </h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
