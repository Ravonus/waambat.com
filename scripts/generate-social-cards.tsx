import { ImageResponse } from "next/og";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import stored from "../src/content/site.json";
import { contentSchema } from "../src/lib/content";

// Generate and visually verify these cards before committing. Hosting serves the
// resulting JPEG bytes directly, with no runtime font or image rendering dependency.
const sharp = createRequire(import.meta.resolve("next/package.json"))("sharp");
const content = contentSchema.parse(stored);
const [poster, font] = await Promise.all([
  readFile(join(process.cwd(), "public/social/artwork-1.jpg")),
  readFile(join(process.cwd(), "public/social/Geist-Regular.ttf")),
]);
function card(title: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          fontFamily: "Geist",
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
      fonts: [{ name: "Geist", data: font, weight: 400, style: "normal" }],
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
const entries: [string, string][] = [
  ["home", "Video paintings.\nInfinite loops."],
  ["ordinals", "Art on Bitcoin.\nOrdinals."],
  ...content.pages
    .filter(
      (page) =>
        !page.archived &&
        !page.seo.noIndex &&
        !["splash", "split-splash"].includes(page.layout),
    )
    .map(
      (page) => [page.slug, page.seo.title || page.title] as [string, string],
    ),
];
const manifest: Record<string, string> = {};
await mkdir("public/social/cards", { recursive: true });
for (const [slug, title] of entries) {
  const pixels = Buffer.from(await card(title).arrayBuffer());
  const bytes = (await sharp(pixels)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer()) as Buffer;
  for (const top of [58, 540]) {
    const label: Buffer = await sharp(bytes)
      .extract({ left: 48, top, width: 450, height: 64 })
      .removeAlpha()
      .raw()
      .toBuffer();
    let pink = 0;
    for (let i = 0; i < label.length; i += 3)
      if (
        label[i]! > 160 &&
        label[i]! > label[i + 1]! + 20 &&
        label[i + 2]! > label[i + 1]!
      )
        pink++;
    if (pink < 100) throw new Error(`Missing sharing-card label: ${slug}`);
  }
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 24);
  const image = `/social/cards/${hash}.jpg`;
  await writeFile(`public${image}`, bytes);
  manifest[slug] = image;
  console.log(`${slug}: ${image} (${bytes.length} bytes)`);
}
await writeFile(
  "src/content/social-images.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
