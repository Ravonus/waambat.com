"use client";
import type { Content, SitePage } from "~/lib/content";
export default function NavigationEditor({
  navigation,
  pages,
  onChange,
}: {
  navigation: Content["navigation"];
  pages: SitePage[];
  onChange: (value: Content["navigation"]) => void;
}) {
  const change = (
    index: number,
    values: Partial<Content["navigation"][number]>,
  ) =>
    onChange(navigation.map((n, i) => (i === index ? { ...n, ...values } : n)));
  const move = (index: number, offset: number) => {
    const next = [...navigation];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    onChange(next);
  };
  return (
    <section
      aria-label="Navigation editor"
      className="space-y-5 rounded border border-white/25 p-5"
    >
      <h2 className="text-waambat-pink text-2xl">Navigation</h2>
      {navigation.map((entry, index) => (
        <div key={entry.id} className="space-y-3 border-b border-white/20 pb-4">
          <label className="block">
            Navigation label
            <input
              aria-label="Navigation label"
              value={entry.label}
              onChange={(e) => change(index, { label: e.target.value })}
              className="ml-3 rounded border border-white/30 bg-black p-2"
            />
          </label>
          <label className="block">
            Navigation destination
            <input
              aria-label="Navigation destination"
              value={entry.href}
              onChange={(e) => change(index, { href: e.target.value })}
              className="ml-3 w-full rounded border border-white/30 bg-black p-2"
            />
          </label>
          <p className="text-xs">
            {pages.find((p) => `/${p.slug}` === entry.href)?.archived
              ? "Destination archived: hidden from public navigation."
              : entry.href}
          </p>
          <div className="flex gap-5">
            <label>
              <input
                type="checkbox"
                checked={entry.archived}
                onChange={(e) => change(index, { archived: e.target.checked })}
              />{" "}
              Archive navigation entry
            </label>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              Move navigation up
            </button>
            <button
              type="button"
              disabled={index === navigation.length - 1}
              onClick={() => move(index, 1)}
            >
              Move navigation down
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...navigation,
            {
              id: `nav-${crypto.randomUUID()}`,
              label: "New link",
              href: "/",
              archived: true,
            },
          ])
        }
      >
        + Add navigation link (archived until reviewed)
      </button>
    </section>
  );
}
