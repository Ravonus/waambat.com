import type { Content, SitePage } from "~/lib/content";
import { themeStyle } from "~/lib/theme";
import SourceImage from "./SourceImage";
export default function LegacySplash({
  page,
  theme,
}: {
  page: SitePage;
  theme: Content["theme"];
}) {
  const blocks = page.blocks.filter((b) => !b.archived);
  const image = blocks.find((b) => b.type === "image");
  const heading = blocks.find((b) => b.type === "heading");
  const split = page.layout === "split-splash";
  const links = blocks.filter((b) => b.type === "link");
  return (
    <main
      id="main-content"
      style={themeStyle(theme)}
      className={`site-theme legacy-splash ${split ? "legacy-split" : "legacy-cover"}`}
    >
      {image && (
        <SourceImage
          src={image.src}
          alt={image.text}
          eager
          className="legacy-background"
        />
      )}
      {split ? (
        <section className="legacy-panel">
          {blocks
            .filter((b) => b.type === "image" && b !== image)
            .map((b) => (
              <SourceImage
                key={b.id}
                src={b.src}
                alt={b.text}
                eager
                className="legacy-foundation-logo"
              />
            ))}
          <h1>{heading?.text}</h1>
          {blocks
            .filter((b) => b.type === "paragraph")
            .map((b) => (
              <p key={b.id}>{b.text}</p>
            ))}
          {links[0] && (
            <a className="legacy-foundation-button" href={links[0].href}>
              On Foundation
            </a>
          )}
          <div className="legacy-socials">{socials()}</div>
        </section>
      ) : (
        <>
          <div className="legacy-contact">
            {links.map((b) => (
              <a key={b.id} className="legacy-contact-pill" href={b.href}>
                {b.text}
              </a>
            ))}
            <div className="legacy-socials">{socials()}</div>
          </div>
          <h1>{heading?.text}</h1>
        </>
      )}
    </main>
  );
}
function socials() {
  return (
    <>
      <a href="https://www.youtube.com/waambat" aria-label="YouTube">
        ▶
      </a>
      <a href="http://instagram.com/waambat" aria-label="Instagram">
        ◎
      </a>
      <a href="https://foundation.app/waambat" aria-label="Foundation">
        FND
      </a>
    </>
  );
}
