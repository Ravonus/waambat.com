import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";
import {
  artworkSchema,
  contentSchema,
  mediaReferences,
  type Content,
} from "../src/lib/content";
import {
  inscriptionPage,
  isOrdinalPiece,
  marketplace,
} from "../src/lib/ordinal-page";
import {
  GAMMA_PLAYER,
  KISMET_PLAYER,
  LUX_PLAYER,
  opensLive,
  PREVIEWS,
} from "../src/lib/ordinal-sources";
import { videoSource } from "../src/lib/video-source";

async function seed() {
  return contentSchema.parse(
    JSON.parse(await readFile("src/content/site.json", "utf8")),
  );
}
const section = (content: Content, id: string) =>
  content.sections.find((s) => s.id === id)!;

test("each live piece has a cached loop and a still, both named by a hash of their bytes", async () => {
  for (const [name, paths] of Object.entries(PREVIEWS)) {
    for (const [kind, path] of [
      ["loop", paths.loop],
      ["poster", paths.poster],
    ] as const) {
      const match = path.match(
        /^\/previews\/([a-z]+)-([a-f0-9]{10})\.(mp4|webp)$/,
      );
      assert.ok(match, path);
      assert.equal(match[1], name);
      const bytes = await readFile(`public${path}`);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex").slice(0, 10),
        match[2],
        `${path} is not named by its own hash, so it could not be cached forever`,
      );
      // Small enough to arrive at once, and under the studio's 4 MB upload cap.
      assert.ok(
        bytes.length <= (kind === "loop" ? 2_000_000 : 100_000),
        `${path} is ${bytes.length} bytes`,
      );
    }
  }
  // Nothing else is shipped there, so a stale render cannot linger unreferenced.
  const shipped = new Set<string>(
    Object.values(PREVIEWS).flatMap((p) => [p.loop, p.poster]),
  );
  for (const file of await readdir("public/previews"))
    assert.ok(
      shipped.has(`/previews/${file}`),
      `unreferenced /previews/${file}`,
    );
});

test("the shipped Ordinals content points at those loops and stills", async () => {
  const content = await seed();
  for (const [id, key] of [
    ["lux", "lux"],
    ["kismet-twist", "kismet"],
    ["gamma-artwork", "gamma"],
  ] as const) {
    const item = section(content, id).items.find((i) => i.kind === "embed")!;
    assert.equal(item.previewSrc, PREVIEWS[key].loop, id);
    assert.equal(item.poster, PREVIEWS[key].poster, id);
    assert.equal(videoSource(item.videoSrc)?.provider, "ordinals", id);
    assert.equal(item.aspectRatio, 1, id);
  }
  const references = mediaReferences(content);
  for (const paths of Object.values(PREVIEWS))
    for (const path of [paths.loop, paths.poster])
      assert.ok(references.has(path), path);
  assert.equal(
    section(content, "gamma-artwork").items[0]!.tokenLink,
    "https://gamma.io/ordinals/inscriptions/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0",
  );
});

test("the loops and stills are kept forever by the CDN and by Next", async () => {
  const toml = await readFile("netlify.toml", "utf8");
  assert.match(
    toml,
    /for = "\/previews\/\*"\s+\[headers\.values\]\s+Cache-Control = "public, max-age=31536000, immutable"/,
  );
  const config = await readFile("next.config.js", "utf8");
  assert.match(
    config,
    /source: "\/previews\/:path\*",\s+headers: \[\s+\{\s+key: "Cache-Control",\s+value: "public, max-age=31536000, immutable"/,
  );
});

test("preview loops are same-origin files; lookalikes and traversal are refused", () => {
  for (const ok of [
    PREVIEWS.lux.loop,
    "/previews/a.webm",
    "/api/media/" + "a".repeat(64),
  ])
    assert.equal(videoSource(ok)?.direct, true, ok);
  for (const bad of [
    "/previews/../etc/passwd.mp4",
    "/previews/a.exe",
    "/previews/A.mp4",
    "/previews/sub/a.mp4",
    "//evil.example/previews/a.mp4",
    "/previews/a.mp4?x=1",
    "/preview/a.mp4",
  ])
    assert.equal(videoSource(bad)?.direct === true, false, bad);
});

test("a preview loop must be a direct video file, on any kind of item", async () => {
  const base = section(await seed(), "lux").items[0]!;
  const ok = artworkSchema.safeParse({
    ...base,
    previewSrc: PREVIEWS.lux.loop,
  });
  assert.equal(ok.success, true);
  for (const previewSrc of [
    "https://ordinals.com/content/" + "a".repeat(64) + "i0",
    "https://www.youtube.com/watch?v=aaaaaaaaaaa",
    "/previews/page.html",
  ])
    assert.equal(
      artworkSchema.safeParse({ ...base, previewSrc }).success,
      false,
      previewSrc,
    );
  assert.equal(
    artworkSchema.safeParse({ ...base, previewSrc: "" }).success,
    true,
  );
});

test("live pieces are recognised by their inscription or loop; the early GIFs and ordinary sections are not", async () => {
  const content = await seed();
  assert.equal(isOrdinalPiece(section(content, "lux")), true);
  assert.equal(isOrdinalPiece(section(content, "kismet-twist")), true);
  assert.equal(isOrdinalPiece(section(content, "gamma-artwork")), true);
  assert.equal(isOrdinalPiece(section(content, "ordinals")), false);
  // Gamma left as a plain link (an artist's choice) keeps the ordinary layout instead of vanishing.
  const link = structuredClone(section(content, "gamma-artwork"));
  Object.assign(link.items[0]!, { kind: "link", videoSrc: "", previewSrc: "" });
  assert.equal(isOrdinalPiece(link), false);
  // A section mixing a piece with other media is not flattened into the grid.
  const mixed = structuredClone(section(content, "lux"));
  mixed.items.push({ ...mixed.items[0]!, id: "extra", kind: "video" });
  assert.equal(isOrdinalPiece(mixed), false);
  // Archived items do not count.
  const archived = structuredClone(section(content, "lux"));
  archived.items[0]!.archived = true;
  assert.equal(isOrdinalPiece(archived), false);
});

test("marketplace links are named for people, other hosts by their hostname", () => {
  assert.equal(
    marketplace("https://www.satflow.com/ordinals/kismettwist"),
    "Satflow",
  );
  assert.equal(
    marketplace("https://gamma.io/ordinals/inscriptions/x"),
    "Gamma",
  );
  assert.equal(marketplace("https://www.example.org/x"), "example.org");
  assert.equal(marketplace("not a url"), "");
});

test("the stored size budget for the whole Ordinals page media stays small", async () => {
  let total = 0;
  for (const file of await readdir("public/previews"))
    total += (await stat(`public/previews/${file}`)).size;
  assert.ok(total <= 5_000_000, `previews total ${total} bytes`);
});

test("only LUX is interactive; Kismet Twist and Edge Corporeal are videos shown as their loops", () => {
  assert.equal(opensLive(LUX_PLAYER, true), true);
  assert.equal(opensLive(KISMET_PLAYER, true), false);
  assert.equal(opensLive(GAMMA_PLAYER, true), false);
  // With no loop there is nothing else to show, so a piece still opens live.
  assert.equal(opensLive(KISMET_PLAYER, false), true);
  assert.equal(opensLive("", false), false);
});
test("the videos link to their own inscription page, only for exact inscription URLs", () => {
  assert.equal(
    inscriptionPage(GAMMA_PLAYER),
    "https://ordinals.com/inscription/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0",
  );
  assert.equal(
    inscriptionPage(
      "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98",
    ),
    "https://ordinals.com/inscription/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98",
  );
  for (const bad of [
    "",
    GAMMA_PLAYER + "?x=1",
    GAMMA_PLAYER.replace("ordinals.com", "ordinals.com.evil.test"),
    "https://evil.test/content/" + "a".repeat(64) + "i0",
  ])
    assert.equal(inscriptionPage(bad), "", bad);
});
