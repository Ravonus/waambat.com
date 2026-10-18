import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublishedContent } from "~/server/content";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const content = await getPublishedContent();
  const page = content.pages.find(
    (item) => item.slug === slug && !item.archived,
  );
  if (!page && !["home", "ordinals"].includes(slug))
    return new Response("Not found", { status: 404 });
  const title =
    slug === "home"
      ? "Video paintings.\nInfinite loops."
      : slug === "ordinals"
        ? "Art on Bitcoin.\nOrdinals."
        : page!.seo.title || page!.title;
  const poster = await readFile(
    join(process.cwd(), "public/social/artwork-1.jpg"),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "58px 48px",
            width: 570,
            height: 630,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: "#ff94b2",
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: 8,
            }}
          >
            WAAMBAT
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                fontSize: title.length > 65 ? 38 : 52,
                fontWeight: 700,
                lineHeight: 1.14,
                whiteSpace: "pre-wrap",
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 24, color: "#e1bcc2" }}>
              Lindsay Scoggins
            </div>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 5, color: "#ff94b2" }}>
            WAAMB.AT
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- Server-rendered social card uses the artist's bundled poster. */}
        <img
          alt=""
          src={`data:image/jpeg;base64,${poster.toString("base64")}`}
          width={630}
          height={630}
          style={{ objectFit: "cover", flexShrink: 0 }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
