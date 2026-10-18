"use client";
import { useEffect, useRef, useState } from "react";
import type { ContentState } from "~/server/content";
import { contentSchema, type Artwork, type Content } from "~/lib/content";
import { MAX_UPLOAD } from "~/lib/uploads";
import PageEditor from "./PageEditor";
import NavigationEditor from "./NavigationEditor";
import ThemeEditor from "./ThemeEditor";
import FormsEditor from "./FormsEditor";
import ContactInbox from "./ContactInbox";
import { AdminRequestError, requestContentState } from "~/lib/admin-request";
type PendingWrite = {
  action: "save" | "publish";
  revision: string;
  publishedRevision: string;
  content: Content;
};
const inputClass =
  "mt-1 w-full rounded border border-white/30 bg-black px-3 py-2 text-white";
function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm text-white/75">
      {label}
      {multiline ? (
        <textarea
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          rows={3}
        />
      ) : (
        <input
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}
type MediaField =
  | "poster"
  | "mobilePoster"
  | "logoSrc"
  | "videoSrc"
  | "mobileVideoSrc"
  | "loopSrc"
  | "mobileLoopSrc"
  | "previewSrc";
const IMAGE_FIELDS: MediaField[] = ["poster", "mobilePoster", "logoSrc"];
const MEDIA_LABELS: Record<MediaField, string> = {
  poster: "Poster / image URL",
  mobilePoster: "Mobile poster URL (optional)",
  logoSrc: "Image wordmark URL (optional; replaces the live wordmark)",
  videoSrc: "Original video URL",
  mobileVideoSrc: "Mobile video URL (optional)",
  loopSrc:
    "Ending loop URL (optional; the video plays once, then this loops. Leave empty to repeat the whole video)",
  mobileLoopSrc: "Mobile ending loop URL (optional)",
  previewSrc:
    "Cached preview loop (optional; plays at once, before the live piece is opened)",
};
export default function Editor({ initial }: { initial: ContentState }) {
  const [state, setState] = useState(initial);
  const [content, setContent] = useState<Content>(
    structuredClone(initial.draft),
  );
  const [status, setStatus] = useState(
    [
      initial.sourceCorrectionsPending
        ? "Verified live artwork sources are ready."
        : "",
      initial.heroPending ? "The new home hero banner is ready." : "",
      initial.formsPending ? "The contact form is ready to customize." : "",
      initial.optimizationPending ? "Optimized display media is ready." : "",
    ]
      .filter(Boolean)
      .concat(
        initial.sourceCorrectionsPending ||
          initial.heroPending ||
          initial.formsPending ||
          initial.optimizationPending
          ? [
              "Save this draft to retain these updates in your content, then preview before publishing.",
            ]
          : [],
      )
      .join(" "),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mailPreview, setMailPreview] = useState("");
  const [uncertain, setUncertain] = useState<PendingWrite | null>(null);
  const upload = useRef<AbortController | null>(null);
  const dirty =
    !!state.sourceCorrectionsPending ||
    !!state.heroPending ||
    !!state.formsPending ||
    !!state.optimizationPending ||
    JSON.stringify(content) !== JSON.stringify(state.draft);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty || uploading || uncertain) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    const navigate = (e: MouseEvent) => {
      if (
        (!dirty && !uploading && !uncertain) ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      )
        return;
      const anchor = (e.target as Element | null)?.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      if (
        anchor.href === window.location.href ||
        anchor.getAttribute("href")?.startsWith("#")
      )
        return;
      if (
        !confirm(
          "Leave the studio? Unsaved edits and unfinished requests remain only in this tab.",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, uploading, uncertain]);
  useEffect(() => () => upload.current?.abort(), []);
  function edit(mutator: (draft: Content) => void) {
    setContent((current) => {
      const next = structuredClone(current);
      mutator(next);
      return next;
    });
  }
  function changeItem(
    id: string,
    key: keyof Artwork,
    value: string | boolean | number | undefined,
  ) {
    edit((d) => {
      for (const s of d.sections) {
        const i = s.items.find((i) => i.id === id);
        if (i) {
          Object.assign(i, { [key]: value });
          if (key === "description") i.captionLines = undefined;
        }
      }
    });
  }
  async function request(action: "save" | "publish") {
    if (busy || uploading || uncertain) return;
    if (action === "save") {
      const validation = contentSchema.safeParse(content);
      if (!validation.success) {
        setStatus(
          validation.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        );
        return;
      }
    }
    if (
      action === "publish" &&
      (dirty ||
        !confirm(
          "Publish the saved draft? This updates the published content on the configured site. Previous versions are retained.",
        ))
    )
      return;
    setBusy(true);
    setStatus("");
    const pending: PendingWrite = {
      action,
      revision: state.revision,
      publishedRevision: state.publishedRevision,
      content: contentSchema.parse(action === "save" ? content : state.draft),
    };
    try {
      const next = await requestContentState({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: state.revision,
          publishedRevision: state.publishedRevision,
          action,
          ...(action === "save" ? { content } : {}),
        }),
      });
      setState(next);
      setContent(structuredClone(next.draft));
      setStatus(
        action === "save"
          ? "Draft saved. Preview it before publishing."
          : "Published content saved. Open the site to review the result.",
      );
    } catch (e) {
      if (e instanceof AdminRequestError && e.uncertain) {
        setUncertain(pending);
        setStatus(
          `${e.message} Your edits remain here. Checking the remote revision before another write.`,
        );
        await reconcile(pending);
        return;
      }
      setStatus(
        e instanceof Error
          ? e.message
          : "Could not save. Your edits remain here.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reconcile(pending: PendingWrite | null = uncertain) {
    if (!pending) return;
    setBusy(true);
    try {
      const remote = await requestContentState({}, 10000);
      const observed =
        pending.action === "save" ? remote.draft : remote.published;
      const changed =
        pending.action === "save"
          ? remote.revision !== pending.revision
          : remote.publishedRevision !== pending.publishedRevision;
      if (
        changed &&
        JSON.stringify(observed) === JSON.stringify(pending.content)
      ) {
        setState(remote);
        setContent((current) => {
          const parsed = contentSchema.safeParse(current);
          return parsed.success &&
            JSON.stringify(parsed.data) === JSON.stringify(pending.content)
            ? structuredClone(remote.draft)
            : current;
        });
        setStatus(
          pending.action === "save"
            ? "Saved revision confirmed. Your edits are retained; preview before publishing."
            : "Published revision confirmed. Open the site to review the result.",
        );
      } else {
        setStatus(
          changed
            ? "Remote content changed. Your edits remain here. Reload and review the latest draft before retrying."
            : "No new revision observed. Your edits remain here. You may retry; the expected revision protects against late or concurrent writes.",
        );
      }
      setUncertain(null);
    } catch {
      setStatus(
        "Save status is still unknown. Your edits remain here. Check the remote revision before saving or publishing again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (
      (dirty || uploading || uncertain) &&
      !confirm("Discard unsaved edits and load the latest saved draft?")
    )
      return;
    upload.current?.abort();
    setBusy(true);
    try {
      const body = await requestContentState({}, 10000);
      setState(body);
      setContent(structuredClone(body.draft));
      setUncertain(null);
      setStatus("Latest draft loaded.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not reload");
    } finally {
      setBusy(false);
    }
  }
  async function uploadFile(
    file: File | undefined,
    id: string,
    field: MediaField,
  ) {
    if (!file || uploading || busy) return;
    if (file.size > MAX_UPLOAD || !file.size) {
      setStatus(
        "Choose a file between 1 byte and 4 MB. Use an existing hosted media URL for larger originals.",
      );
      return;
    }
    const controller = new AbortController();
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);
    upload.current = controller;
    setUploading(true);
    setStatus("Uploading…");
    try {
      const data = new FormData();
      data.set("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: data,
        signal: controller.signal,
      });
      const body = (await res.json()) as {
        url?: string;
        type?: string;
        error?: string;
      };
      if (!res.ok || !body.url) throw new Error(body.error ?? "Upload failed");
      if (IMAGE_FIELDS.includes(field) && !body.type?.startsWith("image/"))
        throw new Error("Choose an image for this field.");
      if (!IMAGE_FIELDS.includes(field) && !body.type?.startsWith("video/"))
        throw new Error("Choose a video for the video source.");
      if (upload.current !== controller || controller.signal.aborted) return;
      changeItem(id, field, body.url);
      setStatus(
        "Upload saved privately. Save the draft to attach it; publishing makes it visible.",
      );
    } catch (e) {
      if (controller.signal.aborted)
        setStatus(
          timedOut
            ? "Upload timed out. No artwork was changed. You may retry; identical media is deduplicated."
            : "Upload cancelled. No artwork was changed.",
        );
      else setStatus(e instanceof Error ? e.message : "Upload failed");
    } finally {
      clearTimeout(deadline);
      if (upload.current === controller) {
        upload.current = null;
        setUploading(false);
      }
    }
  }
  return (
    <>
      <h1 className="text-waambat-pink text-3xl">Manage artwork & content</h1>
      <p className="mt-2">
        Edit → save draft → preview → publish. Archiving hides an item and keeps
        its original media. Draft{" "}
        {state.revision === "0".repeat(40)
          ? "original seed"
          : state.revision.slice(0, 8)}{" "}
        · Published{" "}
        {state.publishedRevision === "0".repeat(40)
          ? "original seed"
          : state.publishedRevision.slice(0, 8)}{" "}
        · Site build {state.deployedRevision.slice(0, 12)}
      </p>
      <div className="sticky top-0 z-20 my-6 flex flex-wrap items-center gap-4 border-y border-white/20 bg-black py-4">
        <button
          disabled={busy || uploading || !dirty || !!uncertain}
          onClick={() => request("save")}
          className="bg-waambat-pink rounded px-4 py-2 text-black"
        >
          Save draft
        </button>
        <a
          href="/admin/preview"
          target="_blank"
          rel="noopener"
          className="text-waambat-link"
        >
          Preview saved draft ↗
        </a>
        <button
          disabled={busy || uploading || dirty || !!uncertain}
          onClick={() => request("publish")}
          className="border-waambat-pink rounded border px-4 py-2"
        >
          Publish saved draft
        </button>
        <button disabled={busy} onClick={reload}>
          Reload / discard edits
        </button>
        <span>{dirty ? "Unsaved changes" : "Draft saved"}</span>
        {uncertain && (
          <button disabled={busy} onClick={() => void reconcile()}>
            Check remote revision
          </button>
        )}
        {uploading && (
          <button
            onClick={() => upload.current?.abort()}
            className="text-waambat-pink"
          >
            Cancel upload
          </button>
        )}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-waambat-pink my-5 whitespace-pre-wrap"
      >
        {status}
      </p>
      <fieldset disabled={busy || uploading} className="space-y-8">
        <FormsEditor
          forms={content.forms}
          pages={content.pages}
          theme={content.theme}
          onChange={(forms) =>
            edit((draft) => {
              draft.forms = forms;
              draft.formsVersion = 1;
            })
          }
        />
        <ContactInbox />
        <section className="rounded border border-white/25 p-5">
          <h2 className="text-waambat-pink mb-4 text-xl">Outgoing email</h2>
          <p className="mb-4 text-sm">
            Save settings with the draft, then publish. Gmail uses a separately
            approved sending connection; custom providers use verified SMTP.
            Credentials stay in server configuration. Delivery stays disabled
            until a verified sender and transport are ready.
          </p>
          <label className="block">
            Provider
            <select
              className={inputClass}
              value={content.email.provider}
              onChange={(e) =>
                edit((d) => {
                  d.email.provider = e.target.value as "gmail" | "custom";
                })
              }
            >
              <option value="gmail">Gmail</option>
              <option value="custom">Custom SMTP provider</option>
            </select>
          </label>
          <Field
            label="Sender email"
            value={content.email.from}
            onChange={(v) =>
              edit((d) => {
                d.email.from = v;
              })
            }
          />
          <Field
            label="Reply-to email (optional)"
            value={content.email.replyTo}
            onChange={(v) =>
              edit((d) => {
                d.email.replyTo = v;
              })
            }
          />
          <label className="my-4 block">
            <input
              type="checkbox"
              checked={content.email.enabled}
              onChange={(e) =>
                edit((d) => {
                  d.email.enabled = e.target.checked;
                })
              }
            />{" "}
            Enable approved outgoing email
          </label>
          <button
            type="button"
            onClick={async () => {
              setMailPreview("Preparing saved-draft capture…");
              try {
                const response = await fetch("/api/admin/email-preview", {
                  method: "POST",
                  signal: AbortSignal.timeout(10000),
                });
                const result = (await response.json()) as {
                  mime?: string;
                  error?: string;
                  readiness?: { ready: boolean };
                };
                if (!response.ok || !result.mime)
                  throw new Error(result.error || "Capture failed");
                setMailPreview(
                  `No email sent. Delivery configuration ${result.readiness?.ready ? "ready" : "incomplete"}.\n${result.mime}`,
                );
              } catch (error) {
                setMailPreview(
                  error instanceof Error ? error.message : "Capture failed",
                );
              }
            }}
            className="text-waambat-link"
          >
            Preview email without sending
          </button>
          {mailPreview && (
            <pre
              role="status"
              className="mt-4 max-h-60 overflow-auto text-xs break-all whitespace-pre-wrap"
            >
              {mailPreview}
            </pre>
          )}
        </section>
        {content.sections.map((section, si) => (
          <section
            key={section.id}
            className="rounded border border-white/25 p-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-4">
              <h2 className="text-waambat-pink text-xl">{section.title}</h2>
              <label>
                <input
                  type="checkbox"
                  checked={section.archived}
                  onChange={(e) =>
                    edit((d) => {
                      d.sections[si]!.archived = e.target.checked;
                    })
                  }
                />{" "}
                Archive section
              </label>
              <button
                disabled={si === 0}
                onClick={() =>
                  edit((d) => {
                    [d.sections[si - 1], d.sections[si]] = [
                      d.sections[si]!,
                      d.sections[si - 1]!,
                    ];
                  })
                }
              >
                Move up
              </button>
              <button
                disabled={si === content.sections.length - 1}
                onClick={() =>
                  edit((d) => {
                    [d.sections[si + 1], d.sections[si]] = [
                      d.sections[si]!,
                      d.sections[si + 1]!,
                    ];
                  })
                }
              >
                Move down
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                Placement
                <select
                  className={inputClass}
                  value={section.presentation}
                  onChange={(e) =>
                    edit((d) => {
                      d.sections[si]!.presentation = e.target.value as
                        | "gallery"
                        | "trailer"
                        | "hero";
                    })
                  }
                >
                  <option value="gallery">Original gallery flow</option>
                  <option value="trailer">Trailer at top of page</option>
                  <option value="hero">Hero banner above the page</option>
                </select>
              </label>
              <Field
                label="Section title"
                value={section.title}
                onChange={(v) =>
                  edit((d) => {
                    d.sections[si]!.title = v;
                  })
                }
              />
              <label>
                Page
                <select
                  className={inputClass}
                  value={section.page}
                  onChange={(e) =>
                    edit((d) => {
                      d.sections[si]!.page = e.target.value;
                    })
                  }
                >
                  <option value="nfts">NFTs</option>
                  <option value="ordinals">Ordinals</option>
                  {content.pages.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.title}
                      {p.archived ? " (archived)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {section.presentation === "hero" && (
              <p className="mt-4 text-white/75">
                The hero banner runs a silent looping video full width under the
                navigation, with the section title as the live wordmark (colour
                and font come from Theme). Without a video or poster it is
                hidden. The poster should be the video&apos;s first frame; add a
                mobile video and poster for the portrait composition.
              </p>
            )}
            {section.presentation === "trailer" &&
              !section.items.some(
                (item) => !item.archived && item.kind === "video",
              ) && (
                <p className="mt-4 text-white/75">
                  Add the reviewed trailer video and poster, then unarchive this
                  section to show it at the top of the page.
                </p>
              )}
            <div className="mt-4">
              <Field
                label="Introduction (plain text)"
                multiline
                value={section.intro}
                onChange={(v) =>
                  edit((d) => {
                    d.sections[si]!.intro = v;
                  })
                }
              />
            </div>
            <div className="mt-5 space-y-4">
              {section.items.map((item, ii) => (
                <details
                  key={item.id}
                  className="rounded border border-white/15 p-4"
                >
                  <summary className="cursor-pointer text-lg">
                    {item.title || "Instagram entry"}
                    {item.archived ? " · archived" : ""}
                  </summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field
                      label="Artwork title"
                      value={item.title}
                      onChange={(v) => changeItem(item.id, "title", v)}
                    />
                    <Field
                      label="Year"
                      value={item.year}
                      onChange={(v) => changeItem(item.id, "year", v)}
                    />
                    {["video", "embed", "image"].includes(item.kind) && (
                      <label>
                        {section.presentation === "hero"
                          ? "Hero banner"
                          : section.presentation === "trailer"
                            ? "Trailer"
                            : "Artwork"}{" "}
                        width / height ratio
                        <input
                          className={inputClass}
                          type="number"
                          min="0.25"
                          max="4"
                          step="0.001"
                          value={
                            item.aspectRatio ??
                            (["trailer", "hero"].includes(
                              section.presentation ?? "",
                            )
                              ? 16 / 9
                              : "")
                          }
                          onChange={(e) =>
                            changeItem(
                              item.id,
                              "aspectRatio",
                              e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </label>
                    )}
                    {section.presentation === "hero" &&
                      item.kind === "video" && (
                        <label>
                          Mobile banner width / height ratio
                          <input
                            className={inputClass}
                            type="number"
                            min="0.25"
                            max="4"
                            step="0.001"
                            value={item.mobileAspectRatio ?? ""}
                            onChange={(e) =>
                              changeItem(
                                item.id,
                                "mobileAspectRatio",
                                e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              )
                            }
                          />
                        </label>
                      )}
                    <Field
                      label="Description (plain text)"
                      multiline
                      value={item.description}
                      onChange={(v) => changeItem(item.id, "description", v)}
                    />
                    <Field
                      label={
                        item.kind === "instagram"
                          ? "Instagram post / reel / highlight URL"
                          : "Original token / inscription / collection URL"
                      }
                      value={item.tokenLink}
                      onChange={(v) => changeItem(item.id, "tokenLink", v)}
                    />
                    <label>
                      Media type
                      <select
                        value={item.kind}
                        onChange={(e) =>
                          changeItem(item.id, "kind", e.target.value)
                        }
                        className={inputClass}
                      >
                        <option value="video">Video painting</option>
                        <option value="embed">
                          Provider player / on-chain artwork
                        </option>
                        <option value="image">Image / GIF</option>
                        <option value="link">Link</option>
                        <option value="instagram">
                          Instagram post / reel / highlight
                        </option>
                      </select>
                    </label>
                    {(
                      (item.kind === "instagram"
                        ? ["poster"]
                        : section.presentation === "hero"
                          ? [
                              "videoSrc",
                              "poster",
                              "mobileVideoSrc",
                              "loopSrc",
                              "mobileLoopSrc",
                              "mobilePoster",
                              "logoSrc",
                            ]
                          : [
                              "poster",
                              "videoSrc",
                              "mobileVideoSrc",
                              "previewSrc",
                            ]) as MediaField[]
                    )
                      .filter(
                        (field) =>
                          field !== "previewSrc" || item.kind === "embed",
                      )
                      .map((field) => (
                        <div key={field}>
                          <Field
                            label={MEDIA_LABELS[field]}
                            value={item[field]}
                            onChange={(v) => changeItem(item.id, field, v)}
                          />
                          <label className="mt-2 block text-sm">
                            Or upload{" "}
                            {IMAGE_FIELDS.includes(field) ? "image" : "video"}{" "}
                            (4 MB max)
                            <input
                              type="file"
                              className="mt-2 block w-full text-xs"
                              accept={
                                IMAGE_FIELDS.includes(field)
                                  ? "image/png,image/jpeg,image/webp,image/gif"
                                  : "video/mp4,video/webm"
                              }
                              onChange={(e) => {
                                void uploadFile(
                                  e.target.files?.[0],
                                  item.id,
                                  field,
                                );
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    <label>
                      <input
                        type="checkbox"
                        checked={item.featured}
                        onChange={(e) =>
                          changeItem(item.id, "featured", e.target.checked)
                        }
                      />{" "}
                      Featured (shown first, preserving other entry order)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={item.archived}
                        onChange={(e) =>
                          changeItem(item.id, "archived", e.target.checked)
                        }
                      />{" "}
                      Archive artwork (reversible)
                    </label>
                    <div className="flex gap-4">
                      <button
                        disabled={ii === 0}
                        onClick={() =>
                          edit((d) => {
                            const items = d.sections[si]!.items;
                            [items[ii - 1], items[ii]] = [
                              items[ii]!,
                              items[ii - 1]!,
                            ];
                          })
                        }
                      >
                        Move up
                      </button>
                      <button
                        disabled={ii === section.items.length - 1}
                        onClick={() =>
                          edit((d) => {
                            const items = d.sections[si]!.items;
                            [items[ii + 1], items[ii]] = [
                              items[ii]!,
                              items[ii + 1]!,
                            ];
                          })
                        }
                      >
                        Move down
                      </button>
                    </div>
                  </div>
                </details>
              ))}
            </div>
            <button
              className="text-waambat-link mt-4"
              onClick={() =>
                edit((d) => {
                  d.sections[si]!.items.push({
                    id: `art-${crypto.randomUUID()}`,
                    title: "New artwork",
                    year: "",
                    description: "",
                    kind: "link",
                    tokenLink: "https://waambat.com",
                    videoSrc: "",
                    mobileVideoSrc: "",
                    loopSrc: "",
                    mobileLoopSrc: "",
                    previewSrc: "",
                    mobilePoster: "",
                    logoSrc: "",
                    poster: "",
                    archived: false,
                    featured: false,
                  });
                })
              }
            >
              + Add artwork
            </button>
          </section>
        ))}
        <button
          onClick={() =>
            edit((d) => {
              d.sections.push({
                id: `section-${crypto.randomUUID()}`,
                title: "New section",
                intro: "",
                page: "nfts",
                archived: false,
                items: [],
              });
            })
          }
          className="text-waambat-link"
        >
          + Add section
        </button>
        <div className="my-8 space-y-4">
          <a href="/api/admin/export" download className="underline">
            Download saved content backup
          </a>
          <label className="block">
            Restore content backup into draft
            <input
              aria-label="Restore content backup"
              type="file"
              accept="application/json,.json"
              disabled={busy || uploading || Boolean(uncertain)}
              onChange={async (event) => {
                const input = event.currentTarget,
                  file = input.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 1500000)
                    throw new Error("Backup is too large");
                  const value: unknown = JSON.parse(await file.text());
                  const restored = contentSchema.parse(
                    value && typeof value === "object" && "draft" in value
                      ? value.draft
                      : value,
                  );
                  if (
                    confirm(
                      "Replace unsaved edits with this backup? Public content changes only after saving and publishing.",
                    )
                  ) {
                    setContent(restored);
                    setStatus(
                      "Backup loaded into unsaved draft. Save and preview before publishing.",
                    );
                  }
                } catch {
                  setStatus(
                    "Invalid backup. Your current edits remain unchanged.",
                  );
                } finally {
                  input.value = "";
                }
              }}
              className="mt-2 block"
            />
          </label>
        </div>
        <ThemeEditor
          theme={content.theme}
          onChange={(theme) =>
            edit((d) => {
              d.theme = theme;
            })
          }
        />
        <NavigationEditor
          navigation={content.navigation}
          pages={content.pages}
          onChange={(navigation) =>
            edit((d) => {
              d.navigation = navigation;
            })
          }
        />
        <PageEditor
          pages={content.pages}
          onCreate={(page, nav) =>
            edit((d) => {
              d.pages.push(page);
              if (nav)
                d.navigation.push({
                  id: `nav-${crypto.randomUUID()}`,
                  label: page.title,
                  href: `/${page.slug}`,
                  archived: false,
                });
              if (page.layout === "gallery")
                d.sections.push({
                  id: `section-${crypto.randomUUID()}`,
                  title: page.title,
                  intro: "",
                  page: page.slug,
                  items: [],
                  archived: false,
                });
            })
          }
          onChange={(pages) =>
            edit((d) => {
              d.pages = pages;
            })
          }
        />
      </fieldset>
    </>
  );
}
