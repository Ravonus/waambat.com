import type { Content } from "~/lib/content";
import ArtworkCard from "./ArtworkCard";
export default function Gallery({
  content,
  page,
}: {
  content: Content;
  page: string;
}) {
  const sections = content.sections.filter(
    (s) => s.page === page && !s.archived,
  );
  const featured =
    page === "ordinals"
      ? sections.filter((s) => ["lux", "kismet-twist"].includes(s.id))
      : [];
  function render(section: Content["sections"][number], compact = false) {
    return (
      <section key={section.id} aria-label={section.title} className="pb-10">
        {!["nfts", "ordinals"].includes(section.id) && (
          <h1 className="text-waambat-pink mt-10 mb-5 text-center text-3xl">
            {section.title}
          </h1>
        )}
        <p className="mb-10 text-center">{section.intro}</p>
        <div
          className={
            compact
              ? "flex flex-col"
              : "grid grid-cols-1 gap-x-10 md:grid-cols-2"
          }
        >
          {section.items
            .filter((a) => !a.archived)
            .sort((a, b) => Number(b.featured) - Number(a.featured))
            .map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
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
