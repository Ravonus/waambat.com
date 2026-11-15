import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { Content, SitePage } from "~/lib/content";
import { themeStyle } from "~/lib/theme";
import SourceImage from "./SourceImage";
import SourceLink from "./SourceLink";
import { newTabProps } from "~/lib/new-tab";
export default function LegacySplash({ page, theme, }: {
    page: SitePage;
    theme: Content["theme"];
}) {
    const blocks = derived(() => page.blocks.filter((b) => !b.archived));
    const image = derived(() => blocks.value.find((b) => b.type === "image"));
    const heading = derived(() => blocks.value.find((b) => b.type === "heading"));
    const split = derived(() => page.layout === "split-splash");
    const links = derived(() => blocks.value.filter((b) => b.type === "link"));
    return (<main id="main-content" style={themeStyle(theme)} className={`site-theme legacy-splash ${split.value ? "legacy-split" : "legacy-cover"}`}>
      {image.value && (<SourceImage src={image.value.src} alt={image.value.text} eager className="legacy-background"/>)}
      {split.value ? (<section className="legacy-panel">
          {blocks.value.filter((b) => b.type === "image" && b !== image.value)
                .map((b) => (<SourceImage key={b.id} src={b.src} alt={b.text} eager className="legacy-foundation-logo"/>))}
          <h1>{heading.value?.text}</h1>
          {blocks.value.filter((b) => b.type === "paragraph")
                .map((b) => (<p key={b.id}>{b.text}</p>))}
          {links.value[0] && (<SourceLink className="legacy-foundation-button" href={links.value[0].href} {...newTabProps(links.value[0].href)}>
              On OpenSea
            </SourceLink>)}
          <div className="legacy-socials">{socials()}</div>
        </section>) : (<>
          <div className="legacy-contact">
            {links.value.map((b) => (<SourceLink key={b.id} className="legacy-contact-pill" href={b.href} {...newTabProps(b.href)}>
                {b.text}
              </SourceLink>))}
            <div className="legacy-socials">{socials()}</div>
          </div>
          <h1>{heading.value?.text}</h1>
        </>)}
    </main>);
}
function socials() {
    return (<>
      <SourceLink href="https://www.youtube.com/waambat" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
        ▶
      </SourceLink>
      <SourceLink href="http://instagram.com/waambat" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        ◎
      </SourceLink>
      <SourceLink href="https://opensea.io/waambat" target="_blank" rel="noopener noreferrer" aria-label="OpenSea">
        OpenSea
      </SourceLink>
    </>);
}
