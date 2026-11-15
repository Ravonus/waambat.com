// Compares HEAD and working-tree site.json and lists every top-level/page difference.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
const root = new URL("../../../../", import.meta.url).pathname;
const before = JSON.parse(execSync("git show HEAD:kerf/src/content/site.json", { cwd: root }));
const after = JSON.parse(readFileSync(root + "kerf/src/content/site.json", "utf8"));
const out = [];
for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
  if (key === "pages") continue;
  if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out.push(`top-level ${key} changed`);
}
const byslug = (c) => Object.fromEntries(c.pages.map((p) => [p.slug, p]));
const b = byslug(before), a = byslug(after);
for (const slug of new Set([...Object.keys(b), ...Object.keys(a)])) {
  if (JSON.stringify(b[slug]) === JSON.stringify(a[slug])) continue;
  const bb = b[slug]?.blocks ?? [], ab = a[slug]?.blocks ?? [];
  const { blocks: _1, ...bm } = b[slug] ?? {}; const { blocks: _2, ...am } = a[slug] ?? {};
  out.push(`page ${slug}: meta ${JSON.stringify(bm) === JSON.stringify(am) ? "same" : "CHANGED"}; blocks ${bb.length} -> ${ab.length}`);
  const sig = (x) => JSON.stringify({ ...x, id: undefined, width: undefined });
  const bs = bb.map(sig).sort(), as = ab.map(sig).sort();
  out.push(`  same block multiset ignoring id/width: ${JSON.stringify(bs) === JSON.stringify(as)}`);
  out.push(`  widths: ${ab.filter((x) => x.width).map((x) => `${x.src.split("/").pop()}=${x.width}`).join(", ")}`);
  out.push(`  order before: ${bb.map((x) => x.type[0] + ":" + (x.src?.split("/").pop() ?? x.text.slice(0, 12))).join(" | ")}`);
  out.push(`  order after:  ${ab.map((x) => x.type[0] + ":" + (x.src?.split("/").pop() ?? x.text.slice(0, 12))).join(" | ")}`);
}
console.log(out.join("\n"));
