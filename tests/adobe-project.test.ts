import assert from "node:assert/strict";
import { test } from "node:test";
import { adobeProjectURL } from "../src/lib/adobe-project";
test("Adobe embed accepts only an owner-supplied hosted project stylesheet", () => {
  assert.equal(
    adobeProjectURL("https://use.typekit.net/abc1234.css"),
    "https://use.typekit.net/abc1234.css",
  );
  for (const value of [
    undefined,
    "",
    "http://use.typekit.net/abc1234.css",
    "https://other.invalid/abc1234.css",
    "https://use.typekit.net/abc1234.css?anything=1",
    "https://user:pass@use.typekit.net/abc1234.css",
    "https://use.typekit.net/ik/original.js",
  ])
    assert.equal(adobeProjectURL(value), undefined);
});
