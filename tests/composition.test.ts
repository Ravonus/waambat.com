import test from "node:test";
import assert from "node:assert/strict";
import {
  contentSchema,
  pageSchema,
  pageSlug,
  mediaReferences,
} from "../src/lib/content";
import { seedContent } from "../src/content/seed";
import { videoSource } from "../src/lib/video-source";
import { removedContent } from "../src/lib/content-change";
test("supported provider URLs keep originals and build fixed safe players", () => {
  const inputs = [
    [
      "https://www.youtube.com/watch?v=T5i24dLZ9Ds",
      "youtube",
      "https://www.youtube-nocookie.com/embed/T5i24dLZ9Ds",
    ],
    [
      "https://youtu.be/T5i24dLZ9Ds",
      "youtube",
      "https://www.youtube-nocookie.com/embed/T5i24dLZ9Ds",
    ],
    [
      "https://vimeo.com/12345678/abcdef1234",
      "vimeo",
      "https://player.vimeo.com/video/12345678?h=abcdef1234",
    ],
    [
      "https://i.imgur.com/abcDEF1.mp4",
      "imgur",
      "https://i.imgur.com/abcDEF1.mp4",
    ],
    ["https://imgur.com/abcDEF1", "imgur", "https://imgur.com/abcDEF1/embed"],
    [
      "https://www.instagram.com/reel/ABCdef123/",
      "instagram",
      "https://www.instagram.com/reel/ABCdef123/embed/",
    ],
    [
      "https://media.example.com/art.mp4?signature=x",
      "direct",
      "https://media.example.com/art.mp4?signature=x",
    ],
  ];
  for (const [input, provider, player] of inputs) {
    const value = videoSource(input!);
    assert.equal(value?.provider, provider);
    assert.equal(value?.player, player);
    assert.equal(value?.original, input);
  }
  for (const input of [
    "http://media.example.com/art.mp4",
    "https://localhost/art.mp4",
    "https://127.0.0.1/art.mp4",
    "https://player.vimeo.com.evil.test/video/123",
    "https://youtube.com/watch?v=<iframe>",
    "https://imgur.com/a/album123",
    "https://user:pass@vimeo.com/123",
    '<iframe src="https://vimeo.com/123"></iframe>',
  ])
    assert.equal(videoSource(input), null);
});
test("new mixed pages require unique routes and valid references; archival retains content", () => {
  const doc = structuredClone(seedContent);
  const page = pageSchema.parse({
    slug: "mixed-study",
    title: "Mixed study",
    layout: "gallery",
    blocks: [
      { id: "mixed-text", type: "paragraph", text: "Owner supplied text" },
      { id: "mixed-video", type: "embed", src: "https://youtu.be/T5i24dLZ9Ds" },
    ],
  });
  doc.pages.push(page);
  doc.navigation.push({
    id: "mixed-nav",
    label: "Mixed study",
    href: "/mixed-study",
    archived: false,
  });
  doc.sections.push({
    id: "mixed-gallery",
    title: "Mixed gallery",
    intro: "",
    page: page.slug,
    items: [],
    archived: false,
  });
  assert.ok(contentSchema.safeParse(doc).success);
  for (const slug of [
    "admin",
    "api",
    "ordinals",
    "../bad",
    "two words",
    "UPPER",
  ])
    assert.equal(pageSlug.safeParse(slug).success, false);
  const broken = structuredClone(doc);
  broken.navigation.at(-1)!.href = "/missing";
  assert.equal(contentSchema.safeParse(broken).success, false);
  const duplicate = structuredClone(doc);
  duplicate.pages.push(page);
  assert.equal(contentSchema.safeParse(duplicate).success, false);
  doc.pages.at(-1)!.archived = true;
  assert.ok(contentSchema.safeParse(doc).success);
  assert.deepEqual(removedContent(seedContent, doc), []);
  const deleted = structuredClone(doc);
  deleted.pages = deleted.pages.filter((p) => p.slug !== "mixed-study");
  assert.ok(removedContent(doc, deleted).includes("page /mixed-study"));
  const archivedPage = doc.pages.find((p) => p.slug === "bio-waambat")!;
  const image = archivedPage.blocks.find((b) => b.type === "image")!;
  image.src = "/api/media/test-reference";
  assert.ok(mediaReferences(doc).has(image.src));
  archivedPage.archived = true;
  assert.equal(mediaReferences(doc).has(image.src), false);
});

test("Ordinals additions retain exact supplied destinations and verified sample provenance", () => {
  const items = seedContent.sections
    .filter((s) => s.page === "ordinals")
    .flatMap((s) => s.items);
  for (const target of [
    "https://www.satflow.com/ordinals/lux_ok_algo",
    "https://www.satflow.com/ordinals/kismettwist",
    "https://gamma.io/ordinals/inscriptions/2d284790a8ecddb0f4aa21e7763e0e499fdb068e79f398ad268dda7fcb3eabfei0",
  ])
    assert.ok(items.some((i) => i.tokenLink === target && !i.archived));
  assert.equal(items.filter((i) => /^ordinal-\d$/.test(i.id)).length, 3);
  const preview =
    "https://ordinals.com/preview/383773bbfe98f8fecef04f65c3bbf56fbdc044cb3cdeaf2eb546d140adac5162i98";
  assert.equal(videoSource(preview)?.provider, "ordinals");
  assert.equal(videoSource(preview + "?redirect=https://evil.test"), null);
  assert.equal(
    videoSource(preview.replace("ordinals.com", "ordinals.com.evil.test")),
    null,
  );
});

test("recovered players keep source URLs, preserve two image-only archive entries and reject injected embed queries", () => {
  const archive = seedContent.pages.find(
    (p) => p.slug === "art-by-waambat",
  )!.archive;
  assert.equal(archive.filter((a) => a.embed).length, 23);
  assert.deepEqual(
    archive.map((a, i) => (!a.embed ? i + 1 : 0)).filter(Boolean),
    [18, 23],
  );
  assert.equal(archive[22]!.title, "");
  for (const art of archive.filter((a) => a.embed)) {
    assert.equal(videoSource(art.embed)?.original, art.embed);
    assert.ok(videoSource(art.embed)?.player);
  }
  const source = "https://www.youtube.com/embed/HbP9ujYh_J4?feature=oembed";
  assert.equal(
    videoSource(source)?.player,
    "https://www.youtube-nocookie.com/embed/HbP9ujYh_J4",
  );
  assert.equal(videoSource(source + "&redirect=https://evil.test"), null);
  assert.equal(videoSource(source.replace("oembed", "evil")), null);
  assert.equal(
    videoSource(
      "https://player.vimeo.com/video/538169390?app_id=122963&wmode=opaque",
    )?.player,
    "https://player.vimeo.com/video/538169390",
  );
});

test("recovered source content preserves 23 media URLs, eight Instagram posts and legacy content without invented artwork titles", () => {
  const paintings = seedContent.sections.find((s) => s.id === "nfts")!.items;
  assert.equal(
    paintings[0]!.tokenLink,
    "https://objkt.com/asset/hicetnunc/808942",
  );
  assert.equal(
    paintings[4]!.tokenLink,
    "https://nft.artsy.net/artwork/waambat/enter-boi-ama/47/",
  );
  assert.equal(
    paintings[22]!.tokenLink,
    "https://foundation.app/@waambat/foundation/37954",
  );
  assert.ok(
    paintings.every((a) =>
      /^https:\/\/i.imgur.com\/[A-Za-z0-9]+\.mp4$/.test(a.videoSrc),
    ),
  );
  assert.equal(
    seedContent.sections.find((s) => s.id === "instagram-survivors")!.items
      .length,
    8,
  );
  const ig = seedContent.pages.find((p) => p.slug === "instagram")!;
  assert.equal(ig.layout, "image-grid");
  assert.equal(ig.blocks.filter((b) => b.type === "image").length, 32);
  const art = seedContent.pages.find((p) => p.slug === "art")!;
  const loops = art.blocks.filter((b) => b.type === "embed");
  assert.equal(loops.length, 4);
  assert.ok(loops.every((b) => b.loop && !b.text));
  assert.ok(seedContent.pages.some((p) => p.slug === "waambat"));
  assert.ok(seedContent.pages.some((p) => p.slug === "lindsay-scoggins"));
  assert.equal(
    pageSlug.safeParse("nfts-copy").success,
    false,
    "Canonical redirect cannot be shadowed by CMS pages",
  );
  const invalid = structuredClone(art);
  invalid.blocks[0]!.src = "https://youtu.be/T5i24dLZ9Ds";
  assert.equal(
    pageSchema.safeParse(invalid).success,
    false,
    "Looping mode is direct media only",
  );
});
