import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import images from "../src/content/social-images.json";
const sharp = createRequire(import.meta.resolve("next/package.json"))("sharp");
test("static sharing cards are compact, versioned and retain visible brand labels", async () => {
  assert.equal(Object.keys(images).length, 9);
  for (const src of Object.values(images)) {
    assert.match(src, /^\/social\/cards\/[a-f0-9]{24}\.jpg$/);
    const bytes = readFileSync(`public${src}`);
    assert.ok(bytes.length < 200000);
    assert.ok(
      src.includes(
        createHash("sha256").update(bytes).digest("hex").slice(0, 24),
      ),
    );
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    for (const top of [58, 540]) {
      const data: Buffer = await sharp(bytes)
        .extract({ left: 48, top, width: 450, height: 64 })
        .removeAlpha()
        .raw()
        .toBuffer();
      let pink = 0;
      for (let i = 0; i < data.length; i += 3)
        if (
          data[i]! > 160 &&
          data[i]! > data[i + 1]! + 20 &&
          data[i + 2]! > data[i + 1]!
        )
          pink++;
      assert.ok(pink > 100, `${src}: missing brand label at ${top}`);
    }
  }
});
