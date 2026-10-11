import type { Content } from "~/lib/content";
import ArtworkCard from "./ArtworkCard";
export default function Gallery({
  content,
  page,
}: {
  content: Content;
  page: "nfts" | "ordinals";
}) {
  return content.sections
    .filter((s) => s.page === page && !s.archived)
    .map((section) => (
      <section key={section.id} aria-label={section.title} className="pb-10">
        {!["nfts", "ordinals"].includes(section.id) && (
          <h1 className="text-waambat-pink mt-10 mb-5 text-center text-3xl">
            {section.title}
          </h1>
        )}
        <p className="mb-10 text-center">{section.intro}</p>
        <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {section.items
            .filter((a) => !a.archived)
            .map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
        </div>
      </section>
    ));
}
