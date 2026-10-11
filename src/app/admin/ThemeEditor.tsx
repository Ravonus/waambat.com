"use client";
import { originalTheme, type Theme } from "~/lib/theme";
const colors = [
  "background",
  "body",
  "heading",
  "logo",
  "link",
  "linkHover",
  "navigation",
  "activeNavigation",
  "navigationHover",
] as const;
const numbers = [
  "bodySize",
  "bodyWeight",
  "lineHeight",
  "tracking",
  "headingSize",
  "smallHeadingSize",
  "logoSize",
  "navigationSize",
  "contentWidth",
  "desktopPadding",
  "mobilePadding",
  "headerTop",
  "headerBottom",
  "pageGap",
  "blockPadding",
  "paragraphGap",
  "archiveGap",
] as const;
const label = (value: string) =>
  value.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`);
export default function ThemeEditor({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <section
      aria-label="Site theme"
      className="my-10 border border-white/25 p-5"
    >
      <h2 className="text-waambat-pink text-2xl">Site theme</h2>
      <p className="my-3">
        These settings use the same draft, preview and publish workflow as page
        content. The original font option still requires the existing Adobe
        domain license; preview hosts use fallback fonts.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {colors.map((key) => (
          <label key={key} className="capitalize">
            {label(key)}
            <input
              aria-label={`Theme ${label(key)}`}
              type="color"
              value={theme[key]}
              onChange={(e) => onChange({ ...theme, [key]: e.target.value })}
              className="block h-10 w-full"
            />
          </label>
        ))}
        {(["font", "brandFont"] as const).map((key) => (
          <label key={key} className="capitalize">
            {label(key)}
            <select
              aria-label={`Theme ${label(key)}`}
              value={theme[key]}
              onChange={(e) =>
                onChange({
                  ...theme,
                  [key]: e.target.value as Theme[typeof key],
                })
              }
              className="block w-full border bg-black p-2"
            >
              {["original", "system", "serif", "monospace"].map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
          </label>
        ))}
        {numbers.map((key) => (
          <label key={key} className="capitalize">
            {label(key)}
            <input
              aria-label={`Theme ${label(key)}`}
              type="number"
              step={key === "tracking" ? 0.01 : key === "lineHeight" ? 0.1 : 1}
              value={theme[key]}
              onChange={(e) => {
                if (e.target.value)
                  onChange({ ...theme, [key]: Number(e.target.value) });
              }}
              className="block w-full border bg-black p-2"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        className="mt-5 underline"
        onClick={() => {
          if (
            confirm(
              "Reset theme settings to the original source preset? Save the draft to keep this change.",
            )
          )
            onChange(structuredClone(originalTheme));
        }}
      >
        Reset theme to original preset
      </button>
    </section>
  );
}
