import type { Content } from "./content";

/** Public readers never need archived work, notification addresses or email configuration. */
export function publicContent(content: Content): Content {
  return {
    ...content,
    sections: content.sections
      .filter((section) => !section.archived)
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.archived),
      })),
    pages: content.pages
      .filter((page) => !page.archived)
      .map((page) => ({
        ...page,
        blocks: page.blocks.filter((block) => !block.archived),
        archive: page.archive.filter((art) => !art.archived),
      })),
    email: { ...content.email, from: "", replyTo: "", enabled: false },
    forms: content.forms.map((form) => ({ ...form, recipient: "", emailNotifications: false })),
  };
}

/** The persistent frame gets navigation, theme and hero data without every page's body. */
export function shellContent(content: Content) {
  return {
    navigation: content.navigation,
    theme: content.theme,
    integrations: content.integrations,
    seo: content.seo,
    sections: content.sections.filter((section) => section.presentation === "hero"),
    pages: content.pages.map(({ slug, title, layout, seo, archived }) => ({
      slug,
      title,
      layout,
      seo,
      archived,
    })),
  };
}

/** A route carries its own gallery; its page and form are already separate loader fields. */
export function routeContent(content: Content, page: string) {
  return {
    theme: content.theme,
    seo: content.seo,
    sections: content.sections.filter((section) => section.page === page),
  };
}
