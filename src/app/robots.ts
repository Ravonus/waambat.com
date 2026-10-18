import type { MetadataRoute } from "next";
import { indexableSite, siteOrigin } from "~/lib/seo";
export default function robots(): MetadataRoute.Robots {
  return indexableSite()
    ? {
        rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
        sitemap: `${siteOrigin}/sitemap.xml`,
        host: siteOrigin,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
