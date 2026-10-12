import { readFile } from "node:fs/promises";
import { contentSchema } from "../src/lib/content";
const source = await readFile(
  new URL("../src/content/site.json", import.meta.url),
  "utf8",
);
if (Buffer.byteLength(source) > 500000)
  throw new Error("Content JSON exceeds 500 KB");
contentSchema.parse(JSON.parse(source));
console.log("Repository content schema is valid");
