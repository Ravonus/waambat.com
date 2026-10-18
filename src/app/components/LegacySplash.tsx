import type { Content, SitePage } from "~/lib/content";
import { themeStyle } from "~/lib/theme";
import SourceImage from "./SourceImage";
import SourceLink from "./SourceLink";
import { newTabProps } from "~/lib/new-tab";
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
            <SourceLink
              className="legacy-foundation-button"
              href={links[0].href}
              {...newTabProps(links[0].href)}
            >
              On Foundation
            </SourceLink>
          )}
          <div className="legacy-socials">{socials()}</div>
        </section>
      ) : (
        <>
          <div className="legacy-contact">
            {links.map((b) => (
              <SourceLink
                key={b.id}
                className="legacy-contact-pill"
                href={b.href}
                {...newTabProps(b.href)}
              >
                {b.text}
              </SourceLink>
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
      <SourceLink
        href="https://www.youtube.com/waambat"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube"
      >
        ▶
      </SourceLink>
      <SourceLink
        href="http://instagram.com/waambat"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
      >
        ◎
      </SourceLink>
      <SourceLink
        href="https://foundation.app/waambat"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Foundation"
      >
        FND
      </SourceLink>
    </>
  );
}
