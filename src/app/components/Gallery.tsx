import type { Content } from "~/lib/content";
import ArtworkCard from "./ArtworkCard";
import SourceImage from "./SourceImage";
export default function Gallery({
  content,
  page,
}: {
  content: Content;
  page: string;
}) {
  const sections = content.sections
    .filter((s) => s.page === page && !s.archived)
    .sort(
      (a, b) =>
        Number(b.presentation === "trailer") -
        Number(a.presentation === "trailer"),
    );
  const featured =
    page === "ordinals"
      ? sections.filter((s) => ["lux", "kismet-twist"].includes(s.id))
      : [];
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
            .map((a) =>
              section.id === "ordinals" ? (
                <article
                  key={a.id}
                  data-artwork={a.id}
                  className="original-ordinal-row"
                >
                  <div>
                    <a
                      href={a.tokenLink}
                      aria-label={`Open ${a.title} original inscription page`}
                    >
                      <SourceImage
                        src={a.poster}
                        alt={a.title}
                        sizes="300px"
                        className="mx-auto max-w-full"
                      />
                    </a>
                  </div>
                  <div>
                    <h2>
                      <a href={a.tokenLink}>{a.title}</a>
                    </h2>
                    <p>{a.description}</p>
                  </div>
                </article>
              ) : (
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
              ),
            )}
        </div>
      </section>
    );
  }
  return (
    <>
      {featured.length > 0 && (
        <div
          aria-label="Featured Ordinals collections"
          className="grid grid-cols-1 gap-x-10 md:grid-cols-2"
        >
          {featured.map((s) => render(s, true))}
        </div>
      )}
      {sections.filter((s) => !featured.includes(s)).map((s) => render(s))}
    </>
  );
}
