"use client";
import { useState } from "react";
import { pageSchema, pageSlug } from "~/lib/content";
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
  onCreate,
}: {
  pages: SitePage[];
  onChange: (pages: SitePage[]) => void;
  onCreate: (page: SitePage, addNavigation: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [layout, setLayout] = useState<SitePage["layout"]>("article");
  const [addNavigation, setAddNavigation] = useState(true);
  const [error, setError] = useState("");
  function edit(index: number, change: (page: SitePage) => void) {
    const next = structuredClone(pages);
    change(next[index]!);
    onChange(next);
  }
  return (
    <section className="mt-10 space-y-5" aria-label="Site pages">
      <h2 className="text-waambat-pink text-2xl">Site pages</h2>
      <div className="space-y-4 rounded border border-white/25 p-5">
        <h3>Create a page</h3>
        <Field label="New page title" value={title} onChange={setTitle} />
        <Field label="New page slug" value={slug} onChange={setSlug} />
        <label>
          Page template
          <select
            aria-label="Page template"
            className={input}
            value={layout}
            onChange={(e) => setLayout(e.target.value as SitePage["layout"])}
          >
            {[
              "article",
              "gallery",
              "archive",
              "image-grid",
              "biography",
              "centered",
              "contact",
              "two-column",
              "splash",
              "split-splash",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={addNavigation}
            onChange={(e) => setAddNavigation(e.target.checked)}
          />{" "}
          Add to navigation
        </label>
        <p>
          Slugs remain fixed after creation to preserve incoming links. Archive
          pages to hide them without deleting content.
        </p>
        <button
          type="button"
          onClick={() => {
            const valid = pageSlug.safeParse(slug);
            if (
              !valid.success ||
              pages.some((p) => p.slug === slug) ||
              !title.trim()
            ) {
              setError(
                "Enter a title and a unique lowercase slug outside reserved routes.",
              );
              return;
            }
            onCreate(
              pageSchema.parse({
                slug,
                title,
                layout,
                blocks:
                  layout === "archive"
                    ? []
                    : [
                        {
                          id: `block-${crypto.randomUUID()}`,
                          type: "heading",
                          text: title,
                          level: 1,
                        },
                      ],
                archive: [],
              }),
              addNavigation,
            );
            setTitle("");
            setSlug("");
            setError("");
          }}
        >
          Create draft page
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
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
            <div className="flex flex-wrap gap-4">
              <label>
                <input
                  type="checkbox"
                  aria-label="Archive page"
                  checked={page.archived}
                  onChange={(e) =>
                    edit(pi, (p) => {
                      p.archived = e.target.checked;
                    })
                  }
                />{" "}
                Archive page (recoverable; hides navigation)
              </label>
              <button
                type="button"
                disabled={pi === 0}
                onClick={() => {
                  const next = [...pages];
                  [next[pi - 1], next[pi]] = [next[pi]!, next[pi - 1]!];
                  onChange(next);
                }}
              >
                Move page up
              </button>
              <button
                type="button"
                disabled={pi === pages.length - 1}
                onClick={() => {
                  const next = [...pages];
                  [next[pi + 1], next[pi]] = [next[pi]!, next[pi + 1]!];
                  onChange(next);
                }}
              >
                Move page down
              </button>
            </div>
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
            <details className="border border-white/20 p-4">
              <summary className="text-waambat-pink">
                Search and social sharing
              </summary>
              <div className="mt-4 space-y-4">
                <Field
                  label="Search title (optional)"
                  value={page.seo.title}
                  onChange={(value) =>
                    edit(pi, (item) => {
                      item.seo.title = value;
                    })
                  }
                />
                <Field
                  label="Search description (optional)"
                  large
                  value={page.seo.description}
                  onChange={(value) =>
                    edit(pi, (item) => {
                      item.seo.description = value;
                    })
                  }
                />
                <Field
                  label="Social image URL (optional; 1200 × 630 recommended)"
                  value={page.seo.image}
                  onChange={(value) =>
                    edit(pi, (item) => {
                      item.seo.image = value;
                    })
                  }
                />
                <p className="text-sm opacity-70">
                  Leave these empty to use the page title, an automatic
                  description, and the WAAMBAT share image. The canonical
                  address and sitemap update automatically.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={page.seo.noIndex}
                    onChange={(event) =>
                      edit(pi, (item) => {
                        item.seo.noIndex = event.target.checked;
                      })
                    }
                  />{" "}
                  Ask search engines not to index this page
                </label>
              </div>
            </details>
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
                      aria-label="Block type"
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
                        "link",
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
                        p.blocks[bi]!.marks = p.blocks[bi]!.marks.filter((m) =>
                          v.includes(m.text),
                        );
                      })
                    }
                  />
                  {["paragraph", "heading"].includes(block.type) && (
                    <div className="space-y-2">
                      <p>
                        Emphasis applies to the exact words below. Text edits
                        remove emphasis whose words no longer match.
                      </p>
                      {block.marks.map((mark, mi) => (
                        <div key={mi} className="flex gap-3">
                          <span>
                            {mark.kind}: {mark.text}
                          </span>
                          <button
                            type="button"
                            className="underline"
                            onClick={() =>
                              edit(pi, (p) => {
                                p.blocks[bi]!.marks.splice(mi, 1);
                              })
                            }
                          >
                            Remove emphasis
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          const words = prompt(
                            "Exact words to make bold (must appear in this block)",
                          );
                          if (words && block.text.includes(words))
                            edit(pi, (p) => {
                              p.blocks[bi]!.marks.push({
                                text: words,
                                kind: "strong",
                              });
                            });
                        }}
                      >
                        Add bold words
                      </button>
                      {" · "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          const words = prompt(
                            "Exact words to italicize (must appear in this block)",
                          );
                          if (words && block.text.includes(words))
                            edit(pi, (p) => {
                              p.blocks[bi]!.marks.push({
                                text: words,
                                kind: "em",
                              });
                            });
                        }}
                      >
                        Add italic words
                      </button>
                      <label className="block">
                        Empty lines
                        <input
                          className={input}
                          type="number"
                          min={0}
                          max={4}
                          value={block.blankLines ?? 0}
                          onChange={(e) =>
                            edit(pi, (p) => {
                              p.blocks[bi]!.blankLines = Number(e.target.value);
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
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
                          : "Video source (YouTube, Vimeo, Imgur, Instagram or MP4/WebM)"
                      }
                      value={block.src}
                      onChange={(v) =>
                        edit(pi, (p) => {
                          p.blocks[bi]!.src = v;
                        })
                      }
                    />
                  )}
                  {block.type === "embed" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!block.loop}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.loop = e.target.checked;
                          })
                        }
                      />
                      Muted looping playback when visible (direct MP4/WebM)
                    </label>
                  )}
                  {["biography", "two-column"].includes(page.layout) && (
                    <label>
                      Biography column
                      <select
                        className={input}
                        value={block.column ?? "main"}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.column = e.target.value as
                              | "main"
                              | "side";
                          })
                        }
                      >
                        <option value="main">Interview / main column</option>
                        <option value="side">
                          Animation / portrait column
                        </option>
                      </select>
                    </label>
                  )}
                  {block.type === "embed" && block.loop && (
                    <label className="block">
                      Exact video width / height ratio (optional)
                      <input
                        className={input}
                        type="number"
                        min={0.25}
                        max={4}
                        step={0.001}
                        value={block.ratio ?? ""}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.ratio = e.target.value
                              ? Number(e.target.value)
                              : undefined;
                          })
                        }
                      />
                    </label>
                  )}
                  {block.type === "embed" && block.loop && (
                    <label>
                      Video proportions
                      <select
                        className={input}
                        value={block.aspect ?? "square"}
                        onChange={(e) =>
                          edit(pi, (p) => {
                            p.blocks[bi]!.aspect = e.target.value as
                              | "square"
                              | "portrait";
                          })
                        }
                      >
                        <option value="square">Square</option>
                        <option value="portrait">Portrait 4:5</option>
                      </select>
                    </label>
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
                      marks: [],
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
                  <label className="block">
                    Poster width / height ratio
                    <input
                      className={input}
                      type="number"
                      min={0.25}
                      max={4}
                      step={0.001}
                      value={item.ratio}
                      onChange={(e) =>
                        edit(pi, (p) => {
                          p.archive[ii]!.ratio = Number(e.target.value);
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    Fullscreen video width / height ratio (optional)
                    <input
                      className={input}
                      type="number"
                      min={0.25}
                      max={4}
                      step={0.001}
                      value={item.videoRatio ?? ""}
                      onChange={(e) =>
                        edit(pi, (p) => {
                          p.archive[ii]!.videoRatio = e.target.value
                            ? Number(e.target.value)
                            : undefined;
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    <input
                      type="checkbox"
                      checked={item.rowEnd}
                      onChange={(e) =>
                        edit(pi, (p) => {
                          p.archive[ii]!.rowEnd = e.target.checked;
                        })
                      }
                    />{" "}
                    End montage row after this entry
                  </label>
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
                      ratio: 16 / 9,
                      rowEnd: true,
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
