"use client";
import type { SitePage, PageBlock } from "~/lib/content";
const input = "mt-1 w-full rounded border border-white/30 bg-black px-3 py-2";
function Field({
  label,
  value,
  onChange,
  large = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  large?: boolean;
}) {
  return (
    <label className="block text-sm">
      {label}
      {large ? (
        <textarea
          aria-label={label}
          className={input}
          rows={5}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          aria-label={label}
          className={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export default function PageEditor({
  pages,
  onChange,
}: {
  pages: SitePage[];
  onChange: (pages: SitePage[]) => void;
}) {
  function edit(index: number, change: (page: SitePage) => void) {
    const next = structuredClone(pages);
    change(next[index]!);
    onChange(next);
  }
  return (
    <section className="mt-10 space-y-5" aria-label="Site pages">
      <h2 className="text-waambat-pink text-2xl">Site pages</h2>
      {pages.map((page, pi) => (
        <details
          key={page.slug}
          data-page={page.slug}
          className="rounded border border-white/25 p-5"
        >
          <summary className="cursor-pointer text-xl">
            {page.title} · /{page.slug}
          </summary>
          <div className="mt-5 space-y-5">
            <Field
              label="Page title"
              value={page.title}
              onChange={(v) =>
                edit(pi, (p) => {
                  p.title = v;
                })
              }
            />
            <a
              href={`/admin/preview?page=${page.slug}`}
              target="_blank"
              rel="noopener"
              className="text-waambat-link"
            >
              Preview saved {page.title} ↗
            </a>
            {page.blocks.map((block, bi) => (
              <details
                key={block.id}
                className="rounded border border-white/15 p-4"
              >
                <summary className="cursor-pointer">
                  {block.type} ·{" "}
                  {block.text.slice(0, 90) || block.src || "Divider"}
                  {block.archived ? " · archived" : ""}
                </summary>
                <div className="mt-4 space-y-4">
                  <label>
                    Block type
                    <select
                      className={input}
                      value={block.type}
                      onChange={(e) =>
                        edit(pi, (p) => {
                          p.blocks[bi]!.type = e.target
                            .value as PageBlock["type"];
                        })
                      }
                    >
                      {[
                        "heading",
                        "paragraph",
                        "image",
                        "embed",
                        "separator",
                        "list",
                      ].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <Field
                    label="Page block text / image description"
                    large
                    value={block.text}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.blocks[bi]!.text = v;
                      })
                    }
                  />
                  <Field
                    label="Page block link (optional HTTPS URL)"
                    value={block.href}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.blocks[bi]!.href = v;
                      })
                    }
                  />
                  {block.links.map((link, li) => (
                    <div key={li} className="grid gap-3 md:grid-cols-2">
                      <Field
                        label="Linked words (as written in this block)"
                        value={link.text}
                        onChange={(value) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.links[li]!.text = value;
                          })
                        }
                      />
                      <Field
                        label="Linked words destination"
                        value={link.href}
                        onChange={(value) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.links[li]!.href = value;
                          })
                        }
                      />
                    </div>
                  ))}
                  {["image", "embed"].includes(block.type) && (
                    <Field
                      label={
                        block.type === "image"
                          ? "Page image URL"
                          : "Verified YouTube privacy embed / Vimeo player URL"
                      }
                      value={block.src}
                      onChange={(v) =>
                        edit(pi, (p) => {
                          p.blocks[bi]!.src = v;
                        })
                      }
                    />
                  )}
                  {block.type === "heading" && (
                    <label>
                      Heading size
                      <select
                        className={input}
                        value={block.level}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.level = Number(e.target.value);
                          })
                        }
                      >
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {block.type === "list" && (
                    <div className="space-y-3">
                      {block.items.map((item, ii) => (
                        <div key={ii} className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="List item text"
                            value={item.text}
                            onChange={(v) =>
                              edit(pi, (p) => {
                                p.blocks[bi]!.items[ii]!.text = v;
                              })
                            }
                          />
                          <Field
                            label="List item URL (optional)"
                            value={item.href}
                            onChange={(v) =>
                              edit(pi, (p) => {
                                p.blocks[bi]!.items[ii]!.href = v;
                              })
                            }
                          />
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.items.push({
                              text: "New item",
                              href: "",
                            });
                          })
                        }
                      >
                        + Add list item
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-5">
                    <label>
                      <input
                        type="checkbox"
                        checked={block.archived}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.archived = e.target.checked;
                          })
                        }
                      />{" "}
                      Archive page block
                    </label>
                    <button
                      disabled={bi === 0}
                      onClick={() =>
                        edit(pi, (p) => {
                          [p.blocks[bi - 1], p.blocks[bi]] = [
                            p.blocks[bi]!,
                            p.blocks[bi - 1]!,
                          ];
                        })
                      }
                    >
                      Move block up
                    </button>
                    <button
                      disabled={bi === page.blocks.length - 1}
                      onClick={() =>
                        edit(pi, (p) => {
                          [p.blocks[bi + 1], p.blocks[bi]] = [
                            p.blocks[bi]!,
                            p.blocks[bi + 1]!,
                          ];
                        })
                      }
                    >
                      Move block down
                    </button>
                  </div>
                </div>
              </details>
            ))}
            {page.layout !== "archive" && (
              <button
                onClick={() =>
                  edit(pi, (p) => {
                    p.blocks.push({
                      id: `block-${crypto.randomUUID()}`,
                      type: "paragraph",
                      text: "New paragraph",
                      href: "",
                      src: "",
                      level: 2,
                      items: [],
                      links: [],
                      archived: false,
                    });
                  })
                }
              >
                + Add page block
              </button>
            )}
            {page.archive.map((item, ii) => (
              <details
                key={item.id}
                className="rounded border border-white/15 p-4"
              >
                <summary className="cursor-pointer">
                  {item.title || "Archive image"}
                  {item.archived ? " · archived" : ""}
                </summary>
                <div className="mt-4 space-y-4">
                  <Field
                    label="Archive artwork title"
                    value={item.title}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.archive[ii]!.title = v;
                      })
                    }
                  />
                  <Field
                    label="Archive original image URL"
                    value={item.image}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.archive[ii]!.image = v;
                      })
                    }
                  />
                  <Field
                    label="Archive description"
                    large
                    value={item.description}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.archive[ii]!.description = v;
                      })
                    }
                  />
                  <Field
                    label="Archive verified embed URL (optional)"
                    value={item.embed}
                    onChange={(v) =>
                      edit(pi, (p) => {
                        p.archive[ii]!.embed = v;
                      })
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={item.archived}
                      onChange={(e) =>
                        edit(pi, (p) => {
                          p.archive[ii]!.archived = e.target.checked;
                        })
                      }
                    />{" "}
                    Archive this entry
                  </label>
                  <div className="flex gap-5">
                    <button
                      disabled={ii === 0}
                      onClick={() =>
                        edit(pi, (p) => {
                          [p.archive[ii - 1], p.archive[ii]] = [
                            p.archive[ii]!,
                            p.archive[ii - 1]!,
                          ];
                        })
                      }
                    >
                      Move archive entry up
                    </button>
                    <button
                      disabled={ii === page.archive.length - 1}
                      onClick={() =>
                        edit(pi, (p) => {
                          [p.archive[ii + 1], p.archive[ii]] = [
                            p.archive[ii]!,
                            p.archive[ii + 1]!,
                          ];
                        })
                      }
                    >
                      Move archive entry down
                    </button>
                  </div>
                </div>
              </details>
            ))}
            {page.layout === "archive" && (
              <button
                onClick={() =>
                  edit(pi, (p) => {
                    p.archive.push({
                      id: `archive-${crypto.randomUUID()}`,
                      title: "New artwork",
                      image: "https://waambat.com",
                      description: "",
                      embed: "",
                      archived: true,
                    });
                  })
                }
              >
                + Add archive entry (archived until reviewed)
              </button>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}
