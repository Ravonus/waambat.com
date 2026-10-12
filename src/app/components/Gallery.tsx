import type { Content } from "~/lib/content";
import ArtworkCard from "./ArtworkCard";
import { isOrdinalPiece } from "~/lib/ordinal-page";
import OrdinalCollection from "./OrdinalCollection";
export default function Gallery({
  content,
  page,
}: {
  content: Content;
  page: string;
}) {
  const sections = content.sections
    .filter((s) => s.page === page && !s.archived && s.presentation !== "hero")
    .sort(
      (a, b) =>
        Number(b.presentation === "trailer") -
        Number(a.presentation === "trailer"),
    );
  // The Ordinals page is its own layout: the live pieces, then the early GIF inscriptions.
  const pieces = page === "ordinals" ? sections.filter(isOrdinalPiece) : [];
  const early =
    page === "ordinals" ? sections.find((s) => s.id === "ordinals") : undefined;
  const claimed = new Set([...pieces, ...(early ? [early] : [])]);
  function render(section: Content["sections"][number], compact = false) {
    return (
      <section
        key={section.id}
        aria-label={section.title}
        className={page === "nfts" ? "original-home pb-10" : "pb-10"}
      >
        {section.presentation !== "trailer" &&
          !["nfts", "ordinals"].includes(section.id) && (
            <h1 className="text-waambat-pink mt-10 mb-5 text-center text-3xl">
              {section.title}
            </h1>
          )}
        {section.intro &&
          (page === "nfts" ? (
            <h3 className="home-intro text-center">{section.intro}</h3>
          ) : (
            <p className="mb-10 text-center">{section.intro}</p>
          ))}
        <div
          className={
            compact
              ? "flex flex-col"
              : page === "nfts"
                ? "flex flex-col"
                : "flex flex-col"
          }
        >
          {section.items
            .filter((a) => !a.archived)
            .sort((a, b) => Number(b.featured) - Number(a.featured))
            .map((a) => (
              <ArtworkCard
                key={a.id}
                artwork={a}
                originalFlow={
                  page === "nfts" && section.presentation !== "trailer"
                }
                trailer={section.presentation === "trailer"}
                ratio={
                  a.aspectRatio ??
                  (section.presentation === "trailer" ? 16 / 9 : undefined)
                }
              />
            ))}
        </div>
      </section>
    );
  }
  return (
    <>
      {page === "ordinals" && (
        <OrdinalCollection
          title={early?.title ?? "ORDINALS"}
          pieces={pieces}
          early={early}
        />
      )}
      {sections.filter((s) => !claimed.has(s)).map((s) => render(s))}
    </>
  );
}
