import { state, derived, onMount, watch, onCleanup } from "@kerf-js/core";
import { update as writeBox } from "#/lib/reactive";
import type { ContentState } from "~/server/content";
import { contentSchema, type Artwork, type Content } from "~/lib/content";
import { MAX_UPLOAD } from "~/lib/uploads";
import SiteSettingsEditor from './SiteSettingsEditor';
import PageEditor from "./PageEditor";
import NavigationEditor from "./NavigationEditor";
import ThemeEditor from "./ThemeEditor";
import FormsEditor from "./FormsEditor";
import ContactInbox from "./ContactInbox";
import { AdminRequestError, requestContentState } from "~/lib/admin-request";
import { firstFramePoster } from "~/lib/first-frame";
import "./studio.css";
type PendingWrite = {
    action: "save" | "publish";
    revision: string;
    publishedRevision: string;
    content: Content;
};
const inputClass = "mt-1 w-full rounded border border-white/30 bg-black px-3 py-2 text-white";
function Field({ label, value, onChange, multiline = false, }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    multiline?: boolean;
}) {
    return (<label className="block text-sm text-white/75">
      {label}
      {multiline ? (<textarea aria-label={label} value={value} onChange={(e) => onChange(e.currentTarget.value)} className={inputClass} rows={3}/>) : (<input aria-label={label} value={value} onChange={(e) => onChange(e.currentTarget.value)} className={inputClass}/>)}
    </label>);
}
type MediaField = "poster" | "mobilePoster" | "logoSrc" | "videoSrc" | "mobileVideoSrc" | "loopSrc" | "mobileLoopSrc" | "previewSrc";
const IMAGE_FIELDS: MediaField[] = ["poster", "mobilePoster", "logoSrc"];
const MEDIA_LABELS: Record<MediaField, string> = {
    poster: "Poster / image URL",
    mobilePoster: "Mobile poster URL (optional)",
    logoSrc: "Additional logo URL (optional; appears beside WAAMBAT)",
    videoSrc: "Original video URL",
    mobileVideoSrc: "Mobile video URL (optional)",
    loopSrc: "Ending loop URL (optional; the video plays once, then this loops. Leave empty to repeat the whole video)",
    mobileLoopSrc: "Mobile ending loop URL (optional)",
    previewSrc: "Cached preview loop (optional; plays at once, before the live piece is opened)",
};
const KIND_LABELS: Record<string, string> = {
    video: "Video painting",
    embed: "Player / on-chain",
    image: "Image / GIF",
    link: "Link",
    instagram: "Instagram",
};
const KIND_GLYPHS: Record<string, string> = { video: "▶", embed: "◆", image: "▣", link: "↗", instagram: "◎" };
// Same-origin stills only: third-party hosts (ordinals.com) refuse cross-origin embedding,
// and the studio should not contact them just to draw a list.
const thumbnail = (item: Artwork) => [item.poster, item.mobilePoster, firstFramePoster(item.videoSrc, "")]
    .find((src) => src?.startsWith("/") && !src.startsWith("//")) ?? "";
export default function Editor({ initial, onSignOut }: {
    initial: ContentState;
    onSignOut: () => void;
}) {
    const serverState = state.linked(()=>initial);
    const content = state.linked(()=>structuredClone(initial.draft));
    const status = state.linked(()=>[
        initial.sourceCorrectionsPending
            ? "Verified live artwork sources are ready."
            : "",
        initial.heroPending ? "The new home hero banner is ready." : "",
        initial.formsPending ? "The contact form is ready to customize." : "",
        initial.optimizationPending ? "Optimized display media is ready." : "",
    ]
        .filter(Boolean)
        .concat(initial.sourceCorrectionsPending ||
        initial.heroPending ||
        initial.formsPending ||
        initial.optimizationPending
        ? [
            "Save this draft to retain these updates in your content, then preview before publishing.",
        ]
        : [])
        .join(" "));
    const busy = state(false);
    const uploading = state(false);
    const mailPreview = state("");
    const uncertain = state<PendingWrite | null>(null);
    const upload = { current: null as (AbortController | null) | null | undefined };
    const dirty = derived(() => !!serverState.value.sourceCorrectionsPending ||
        !!serverState.value.heroPending ||
        !!serverState.value.formsPending ||
        !!serverState.value.optimizationPending ||
        JSON.stringify(content.value) !== JSON.stringify(serverState.value.draft));
    onMount(() => watch(() => [dirty.value, uploading.value, uncertain.value], () => {
        const before = (e: BeforeUnloadEvent) => {
            if (dirty.value || uploading.value || uncertain.value) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", before);
        const navigate = (e: MouseEvent) => {
            if ((!dirty.value && !uploading.value && !uncertain.value) ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0)
                return;
            const anchor = (e.target as Element | null)?.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement) ||
                anchor.target === "_blank" ||
                anchor.hasAttribute("download"))
                return;
            if (anchor.href === window.location.href ||
                anchor.getAttribute("href")?.startsWith("#"))
                return;
            if (!confirm("Leave the studio? Unsaved edits and unfinished requests remain only in this tab.")) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.addEventListener("click", navigate, true);
        return () => {
            window.removeEventListener("beforeunload", before);
            document.removeEventListener("click", navigate, true);
        };
    }));
    onMount(() => watch(() => [], () => () => upload.current?.abort()));
    function edit(mutator: (draft: Content) => void) {
        writeBox(content, (current) => {
            const next = structuredClone(current);
            mutator(next);
            return next;
        });
    }
    function changeItem(id: string, key: keyof Artwork, value: string | boolean | number | undefined) {
        edit((d) => {
            for (const s of d.sections) {
                const i = s.items.find((i) => i.id === id);
                if (i) {
                    Object.assign(i, { [key]: value });
                    if (key === "description")
                        i.captionLines = undefined;
                }
            }
        });
    }
    async function request(action: "save" | "publish") {
        if (busy.value || uploading.value || uncertain.value)
            return;
        if (action === "save") {
            const validation = contentSchema.safeParse(content.value);
            if (!validation.success) {
                writeBox(status, validation.error.issues
                    .map((i) => `${i.path.join(".")}: ${i.message}`)
                    .join("; "));
                return;
            }
        }
        if (action === "publish" &&
            (dirty.value ||
                !confirm("Publish the saved draft? This updates the published content on the configured site. Previous versions are retained.")))
            return;
        writeBox(busy, true);
        writeBox(status, "");
        const pending: PendingWrite = {
            action,
            revision: serverState.value.revision,
            publishedRevision: serverState.value.publishedRevision,
            content: contentSchema.parse(action === "save" ? content.value : serverState.value.draft),
        };
        try {
            const next = await requestContentState({
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    revision: serverState.value.revision,
                    publishedRevision: serverState.value.publishedRevision,
                    action,
                    ...(action === "save" ? { content } : {}),
                }),
            });
            writeBox(serverState, next);
            writeBox(content, structuredClone(next.draft));
            writeBox(status, action === "save"
                ? "Draft saved. Preview it before publishing."
                : "Published content saved. Open the site to review the result.");
        }
        catch (e) {
            if (e instanceof AdminRequestError && e.uncertain) {
                writeBox(uncertain, pending);
                writeBox(status, `${e.message} Your edits remain here. Checking the remote revision before another write.`);
                await reconcile(pending);
                return;
            }
            writeBox(status, e instanceof Error
                ? e.message
                : "Could not save. Your edits remain here.");
        }
        finally {
            writeBox(busy, false);
        }
    }
    async function reconcile(pending: PendingWrite | null = uncertain.value) {
        if (!pending)
            return;
        writeBox(busy, true);
        try {
            const remote = await requestContentState({}, 10000);
            const observed = pending.action === "save" ? remote.draft : remote.published;
            const changed = pending.action === "save"
                ? remote.revision !== pending.revision
                : remote.publishedRevision !== pending.publishedRevision;
            if (changed &&
                JSON.stringify(observed) === JSON.stringify(pending.content)) {
                writeBox(serverState, remote);
                writeBox(content, (current) => {
                    const parsed = contentSchema.safeParse(current);
                    return parsed.success &&
                        JSON.stringify(parsed.data) === JSON.stringify(pending.content)
                        ? structuredClone(remote.draft)
                        : current;
                });
                writeBox(status, pending.action === "save"
                    ? "Saved revision confirmed. Your edits are retained; preview before publishing."
                    : "Published revision confirmed. Open the site to review the result.");
            }
            else {
                writeBox(status, changed
                    ? "Remote content changed. Your edits remain here. Reload and review the latest draft before retrying."
                    : "No new revision observed. Your edits remain here. You may retry; the expected revision protects against late or concurrent writes.");
            }
            writeBox(uncertain, null);
        }
        catch {
            writeBox(status, "Save status is still unknown. Your edits remain here. Check the remote revision before saving or publishing again.");
        }
        finally {
            writeBox(busy, false);
        }
    }
    async function reload() {
        if ((dirty.value || uploading.value || uncertain.value) &&
            !confirm("Discard unsaved edits and load the latest saved draft?"))
            return;
        upload.current?.abort();
        writeBox(busy, true);
        try {
            const body = await requestContentState({}, 10000);
            writeBox(serverState, body);
            writeBox(content, structuredClone(body.draft));
            writeBox(uncertain, null);
            writeBox(status, "Latest draft loaded.");
        }
        catch (e) {
            writeBox(status, e instanceof Error ? e.message : "Could not reload");
        }
        finally {
            writeBox(busy, false);
        }
    }
    async function uploadFile(file: File | undefined, id: string, field: MediaField) {
        if (!file || uploading.value || busy.value)
            return;
        if (file.size > MAX_UPLOAD || !file.size) {
            writeBox(status, "Choose a file between 1 byte and 4 MB. Use an existing hosted media URL for larger originals.");
            return;
        }
        const controller = new AbortController();
        let timedOut = false;
        const deadline = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, 30000);
        upload.current = controller;
        writeBox(uploading, true);
        writeBox(status, "Uploading…");
        try {
            const data = new FormData();
            data.set("file", file);
            const res = await fetch("/_kerf/x/waambat/admin/upload", {
                method: "POST",
                body: data,
                signal: controller.signal,
            });
            const body = (await res.json()) as {
                url?: string;
                type?: string;
                error?: string;
            };
            if (!res.ok || !body.url)
                throw new Error(body.error ?? "Upload failed");
            if (IMAGE_FIELDS.includes(field) && !body.type?.startsWith("image/"))
                throw new Error("Choose an image for this field.");
            if (!IMAGE_FIELDS.includes(field) && !body.type?.startsWith("video/"))
                throw new Error("Choose a video for the video source.");
            if (upload.current !== controller || controller.signal.aborted)
                return;
            changeItem(id, field, body.url);
            writeBox(status, "Upload saved privately. Save the draft to attach it; publishing makes it visible.");
        }
        catch (e) {
            if (controller.signal.aborted)
                writeBox(status, timedOut
                    ? "Upload timed out. No artwork was changed. You may retry; identical media is deduplicated."
                    : "Upload cancelled. No artwork was changed.");
            else
                writeBox(status, e instanceof Error ? e.message : "Upload failed");
        }
        finally {
            clearTimeout(deadline);
            if (upload.current === controller) {
                upload.current = null;
                writeBox(uploading, false);
            }
        }
    }
    const query = state("");
    const active = state("overview");
    const needle = derived(() => query.value.trim().toLowerCase());
    const matches = (item: Artwork) => !needle.value ||
        `${item.title} ${item.year} ${item.description} ${KIND_LABELS[item.kind] ?? ""}`.toLowerCase().includes(needle.value);
    const unpublished = derived(() => JSON.stringify(serverState.value.draft) !== JSON.stringify(serverState.value.published));
    const stats = derived(() => {
        const items = content.value.sections.flatMap((s) => s.archived ? [] : s.items);
        return [
            { label: "Live artworks", value: items.filter((i) => !i.archived).length },
            { label: "Featured", value: items.filter((i) => i.featured && !i.archived).length },
            { label: "Archived", value: content.value.sections.flatMap((s) => s.items).filter((i) => i.archived).length },
            { label: "Sections", value: content.value.sections.filter((s) => !s.archived).length },
            { label: "Pages", value: content.value.pages.filter((p) => !p.archived).length },
            { label: "Active forms", value: content.value.forms.filter((f) => f.enabled).length },
        ];
    });
    const saveState = derived(() => busy.value ? { tone: "busy", label: "Working…" }
        : uploading.value ? { tone: "busy", label: "Uploading…" }
            : uncertain.value ? { tone: "warn", label: "Checking last save" }
                : dirty.value ? { tone: "warn", label: "Unsaved changes" }
                    : unpublished.value ? { tone: "draft", label: "Draft saved · not published" }
                        : { tone: "live", label: "Published · up to date" });
    const step = derived(() => dirty.value || uncertain.value ? 0 : unpublished.value ? 2 : 4);
    const pageName = (slug: string) => slug === "nfts" ? "NFTs" : slug === "ordinals" ? "Ordinals"
        : content.value.pages.find((p) => p.slug === slug)?.title ?? slug;
    const groups = derived(() => [
        { label: "Studio", links: [{ id: "overview", label: "Overview" }] },
        {
            label: "Artwork",
            links: content.value.sections.map((s) => ({
                id: `art-${s.id}`,
                label: s.title || "Untitled section",
                count: s.items.filter((i) => !i.archived && matches(i)).length,
                muted: s.archived,
            })),
        },
        {
            label: "Site",
            links: [
                { id: "pages", label: "Pages", count: content.value.pages.filter((p) => !p.archived).length },
                { id: "navigation", label: "Navigation", count: content.value.navigation.filter((n) => !n.archived).length },
                { id: "theme", label: "Theme" },
            ],
        },
        {
            label: "Contact",
            links: [
                { id: "forms", label: "Forms", count: content.value.forms.length },
                { id: "inbox", label: "Inbox" },
                { id: "email", label: "Outgoing email" },
            ],
        },
        {
            label: "Settings",
            links: [
                { id: "seo", label: "Search & analytics" },
                { id: "backup", label: "Backup & restore" },
            ],
        },
    ] as { label: string; links: { id: string; label: string; count?: number; muted?: boolean }[] }[]);
    // The bar wraps on narrow screens; panels and the sticky nav offset by its real height.
    onMount(() => watch(() => [], () => {
        const shell = document.querySelector<HTMLElement>(".studio-shell");
        const bar = document.querySelector<HTMLElement>(".studio-bar");
        if (!shell || !bar)
            return;
        const measure = () => shell.style.setProperty("--studio-bar-h", `${bar.offsetHeight}px`);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }));
    // Highlight the panel the reader is in: the last one whose top has passed under the bar.
    onMount(() => watch(() => [], () => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const offset = (document.querySelector<HTMLElement>(".studio-bar")?.offsetHeight ?? 0) + 96;
            let current = "overview";
            for (const panel of document.querySelectorAll<HTMLElement>("[data-studio-panel]")) {
                if (panel.getBoundingClientRect().top - offset <= 0)
                    current = panel.id;
            }
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
                const panels = document.querySelectorAll<HTMLElement>("[data-studio-panel]");
                current = panels[panels.length - 1]?.id ?? current;
            }
            if (active.value !== current) {
                writeBox(active, current);
                document.querySelector(`.studio-nav a[href="#${CSS.escape(current)}"]`)
                    ?.scrollIntoView({ block: "nearest", inline: "nearest" });
            }
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
        update();
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
        };
    }));
    // ⌘S / Ctrl+S saves the draft instead of saving the page.
    onMount(() => watch(() => [], () => {
        const key = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (dirty.value)
                    void request("save");
            }
        };
        window.addEventListener("keydown", key);
        return () => window.removeEventListener("keydown", key);
    }));
    const noMatches = derived(() => !!needle.value && !content.value.sections.some((section) => section.items.some(matches)));
    return (<div className="studio">
      <header className="studio-bar">
        <div className="studio-brand">
          <a href="/" target="_blank" rel="noopener" className="studio-wordmark">waambat</a>
          <span className="studio-brand-sub">studio</span>
        </div>
        <p className="studio-state" data-tone={saveState.value.tone}>
          <span className="studio-dot" aria-hidden="true"/>
          {saveState.value.label}
        </p>
        <div className="studio-actions">
          {uncertain.value && (<button type="button" className="studio-btn" disabled={busy.value} onClick={() => void reconcile()}>
              Check remote revision
            </button>)}
          {uploading.value && (<button type="button" className="studio-btn" onClick={() => upload.current?.abort()}>
              Cancel upload
            </button>)}
          <button type="button" className="studio-btn ghost" disabled={busy.value} onClick={reload} title="Load the latest saved draft">
            {dirty.value ? "Discard" : "Reload"}
          </button>
          <a href="/admin/preview" target="_blank" rel="noopener" className="studio-btn">
            Preview ↗
          </a>
          <button type="button" className="studio-btn primary" disabled={busy.value || uploading.value || !dirty.value || !!uncertain.value} onClick={() => request("save")} title="Save draft (⌘S)">
            Save draft
          </button>
          <button type="button" className="studio-btn" disabled={busy.value || uploading.value || dirty.value || !!uncertain.value || !unpublished.value} onClick={() => request("publish")}>
            Publish
          </button>
        </div>
        <button type="button" className="studio-btn ghost studio-signout" onClick={onSignOut}>
          Sign out
        </button>
      </header>
      <div className="studio-body">
        <nav className="studio-nav" aria-label="Studio sections">
          {groups.value.map((group) => (<div key={group.label} className="studio-nav-group">
              <p className="studio-nav-label">{group.label}</p>
              <ul>
                {group.links.map((link) => (<li key={link.id}>
                    <a href={`#${link.id}`} aria-current={active.value === link.id ? "location" : undefined} className={link.muted ? "is-muted" : undefined}>
                      <span className="studio-nav-text">{link.label}</span>
                      {link.count !== undefined && <span className="studio-count">{link.count}</span>}
                    </a>
                  </li>))}
              </ul>
            </div>))}
        </nav>
        <div className="studio-main">
          <p role="status" aria-live="polite" className="studio-status">
            {status.value}
          </p>
          <section id="overview" data-studio-panel className="studio-panel studio-overview">
            <h1>Content studio</h1>
            <ol className="studio-steps" aria-label="Publishing steps">
              {["Edit", "Save draft", "Preview", "Publish"].map((label, i) => (<li key={label} data-state={i < step.value ? "done" : i === step.value ? "current" : "todo"}>
                  <span>{i + 1}</span>{label}
                </li>))}
            </ol>
            <dl className="studio-stats">
              {stats.value.map((stat) => (<div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>))}
            </dl>
            <p className="studio-meta">
              Draft{" "}
              {serverState.value.revision === "0".repeat(40)
            ? "original seed"
            : serverState.value.revision.slice(0, 8)}{" "}
              · Published{" "}
              {serverState.value.publishedRevision === "0".repeat(40)
            ? "original seed"
            : serverState.value.publishedRevision.slice(0, 8)}{" "}
              · Site build {serverState.value.deployedRevision.slice(0, 12)} · Archiving hides an item and keeps its original media.
            </p>
          </section>
          <fieldset disabled={busy.value || uploading.value} className="studio-panels">
            <div className="studio-group-head">
              <h2>Artwork</h2>
              <label className="studio-search">
                <span className="sr-only">Find artwork</span>
                <input type="search" className="studio-search-input" placeholder="Find artwork by title, year or type" value={query.value} onInput={(e) => writeBox(query, e.currentTarget.value)}/>
              </label>
            </div>
            {noMatches.value && (<p className="studio-empty">No artwork matches “{query.value}”.</p>)}
            {content.value.sections.map((section, si) => (<section key={section.id} id={`art-${section.id}`} data-studio-panel hidden={!!needle.value && !section.items.some(matches)} className={`studio-panel${section.archived ? " is-archived" : ""}`}>
                <header className="studio-panel-head">
                  <div>
                    <p className="studio-eyebrow">
                      {pageName(section.page)} page · {section.items.filter((i) => !i.archived).length} live
                      {section.items.some((i) => i.archived) ? ` · ${section.items.filter((i) => i.archived).length} archived` : ""}
                      {section.archived ? " · section hidden" : ""}
                    </p>
                    <h2>{section.title || "Untitled section"}</h2>
                  </div>
                  <div className="studio-tools">
                    <label className="studio-toggle">
                      <input type="checkbox" checked={section.archived} onChange={(e) => edit((d) => {
                    d.sections[si]!.archived = e.currentTarget.checked;
                })}/>
                      Archive section
                    </label>
                    <button type="button" className="studio-icon" aria-label={`Move ${section.title} up`} disabled={si === 0} onClick={() => edit((d) => {
                    [d.sections[si - 1], d.sections[si]] = [
                        d.sections[si]!,
                        d.sections[si - 1]!,
                    ];
                })}>↑</button>
                    <button type="button" className="studio-icon" aria-label={`Move ${section.title} down`} disabled={si === content.value.sections.length - 1} onClick={() => edit((d) => {
                    [d.sections[si + 1], d.sections[si]] = [
                        d.sections[si]!,
                        d.sections[si + 1]!,
                    ];
                })}>↓</button>
                  </div>
                </header>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Section title" value={section.title} onChange={(v) => edit((d) => {
                d.sections[si]!.title = v;
            })}/>
                  <label>
                    Page
                    <select className={inputClass} value={section.page} onChange={(e) => edit((d) => {
                d.sections[si]!.page = e.currentTarget.value;
            })}>
                      <option value="nfts">NFTs</option>
                      <option value="ordinals">Ordinals</option>
                      {content.value.pages.map((p) => (<option key={p.slug} value={p.slug}>
                          {p.title}
                          {p.archived ? " (archived)" : ""}
                        </option>))}
                    </select>
                  </label>
                  <label>
                    Placement
                    <select className={inputClass} value={section.presentation ?? "gallery"} onChange={(e) => edit((d) => {
                d.sections[si]!.presentation = e.currentTarget.value as "gallery" | "trailer" | "hero";
            })}>
                      <option value="gallery">Original gallery flow</option>
                      <option value="trailer">Trailer at top of page</option>
                      <option value="hero">Hero banner above the page</option>
                    </select>
                  </label>
                </div>
                {section.presentation === "hero" && (<p className="studio-note">
                    The hero banner runs a silent looping video full width under the
                    navigation, with the section title as the live wordmark (colour
                    and font come from Theme). Without a video or poster it is
                    hidden. The poster should be the video&apos;s first frame; add a
                    mobile video and poster for the portrait composition.
                  </p>)}
                {section.presentation === "trailer" &&
                    !section.items.some((item) => !item.archived && item.kind === "video") && (<p className="studio-note">
                      Add the reviewed trailer video and poster, then unarchive this
                      section to show it at the top of the page.
                    </p>)}
                <div className="mt-4">
                  <Field label="Introduction (plain text)" multiline value={section.intro} onChange={(v) => edit((d) => {
                d.sections[si]!.intro = v;
            })}/>
                </div>
                <div className="studio-items">
                  {section.items.map((item, ii) => (<details key={item.id} hidden={!matches(item)} className={`studio-item${item.archived ? " is-archived" : ""}`}>
                      <summary>
                        {thumbnail(item) ? (<img src={thumbnail(item)} alt="" width={56} height={42} loading="lazy" decoding="async" className="studio-thumb"/>) : (<span className="studio-thumb studio-thumb-empty" aria-hidden="true">{KIND_GLYPHS[item.kind] ?? "•"}</span>)}
                        <span className="studio-item-text">
                          <span className="studio-item-title">{item.title || "Instagram entry"}</span>
                          <span className="studio-item-meta">
                            {KIND_LABELS[item.kind] ?? item.kind}
                            {item.year ? ` · ${item.year}` : ""}
                          </span>
                        </span>
                        {item.featured && <span className="studio-badge is-featured">Featured</span>}
                        {item.archived && <span className="studio-badge">Archived</span>}
                        <span className="studio-chevron" aria-hidden="true"/>
                      </summary>
                      <div className="studio-item-body grid gap-4 md:grid-cols-2">
                        <Field label="Artwork title" value={item.title} onChange={(v) => changeItem(item.id, "title", v)}/>
                        <Field label="Year" value={item.year} onChange={(v) => changeItem(item.id, "year", v)}/>
                        {["video", "embed", "image"].includes(item.kind) && (<label>
                            {section.presentation === "hero"
                        ? "Hero banner"
                        : section.presentation === "trailer"
                            ? "Trailer"
                            : "Artwork"}{" "}
                            width / height ratio
                            <input className={inputClass} type="number" min="0.25" max="4" step="0.001" value={item.aspectRatio ??
                        (["trailer", "hero"].includes(section.presentation ?? "")
                            ? 16 / 9
                            : "")} onChange={(e) => changeItem(item.id, "aspectRatio", e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : undefined)}/>
                          </label>)}
                        {section.presentation === "hero" &&
                    item.kind === "video" && (<label>
                              Mobile banner width / height ratio
                              <input className={inputClass} type="number" min="0.25" max="4" step="0.001" value={item.mobileAspectRatio ?? ""} onChange={(e) => changeItem(item.id, "mobileAspectRatio", e.currentTarget.value
                        ? Number(e.currentTarget.value)
                        : undefined)}/>
                            </label>)}
                        <Field label="Description (plain text)" multiline value={item.description} onChange={(v) => changeItem(item.id, "description", v)}/>
                        <Field label={item.kind === "instagram"
                    ? "Instagram post / reel / highlight URL"
                    : "Original token / inscription / collection URL"} value={item.tokenLink} onChange={(v) => changeItem(item.id, "tokenLink", v)}/>
                        <label>
                          Media type
                          <select value={item.kind} onChange={(e) => changeItem(item.id, "kind", e.currentTarget.value)} className={inputClass}>
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
                        {((item.kind === "instagram"
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
                        ]) as MediaField[])
                    .filter((field) => field !== "previewSrc" || item.kind === "embed")
                    .map((field) => (<div key={field} className="studio-media-field">
                              <Field label={MEDIA_LABELS[field]} value={item[field]} onChange={(v) => changeItem(item.id, field, v)}/>
                              <label className="studio-upload">
                                Or upload{" "}
                                {IMAGE_FIELDS.includes(field) ? "an image" : "a video"}{" "}
                                (4 MB max)
                                <input type="file" accept={IMAGE_FIELDS.includes(field)
                        ? "image/png,image/jpeg,image/webp,image/gif"
                        : "video/mp4,video/webm"} onChange={(e) => {
                        void uploadFile(e.currentTarget.files?.[0], item.id, field);
                        e.currentTarget.value = "";
                    }}/>
                              </label>
                            </div>))}
                        <div className="studio-item-footer md:col-span-2">
                          <label className="studio-toggle">
                            <input type="checkbox" checked={item.featured} onChange={(e) => changeItem(item.id, "featured", e.currentTarget.checked)}/>
                            Featured (shown first, preserving other entry order)
                          </label>
                          <label className="studio-toggle">
                            <input type="checkbox" checked={item.archived} onChange={(e) => changeItem(item.id, "archived", e.currentTarget.checked)}/>
                            Archive artwork (reversible)
                          </label>
                          <span className="studio-tools">
                            <button type="button" className="studio-icon" aria-label={`Move ${item.title} up`} disabled={ii === 0} onClick={() => edit((d) => {
                    const list = d.sections[si]!.items;
                    [list[ii - 1], list[ii]] = [
                        list[ii]!,
                        list[ii - 1]!,
                    ];
                })}>↑</button>
                            <button type="button" className="studio-icon" aria-label={`Move ${item.title} down`} disabled={ii === section.items.length - 1} onClick={() => edit((d) => {
                    const list = d.sections[si]!.items;
                    [list[ii + 1], list[ii]] = [
                        list[ii]!,
                        list[ii + 1]!,
                    ];
                })}>↓</button>
                          </span>
                        </div>
                      </div>
                    </details>))}
                </div>
                <button type="button" className="studio-add" onClick={() => edit((d) => {
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
            })}>
                  + Add artwork
                </button>
              </section>))}
            <button type="button" className="studio-add" onClick={() => edit((d) => {
            d.sections.push({
                id: `section-${crypto.randomUUID()}`,
                title: "New section",
                intro: "",
                page: "nfts",
                archived: false,
                items: [],
            });
        })}>
              + Add section
            </button>
            <div className="studio-group-head"><h2>Site</h2></div>
            <div id="pages" data-studio-panel className="studio-panel">
              <PageEditor pages={content.value.pages} onCreate={(page, nav) => edit((d) => {
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
        })} onChange={(pages) => edit((d) => {
            d.pages = pages;
        })}/>
            </div>
            <div id="navigation" data-studio-panel className="studio-panel">
              <NavigationEditor navigation={content.value.navigation} pages={content.value.pages} onChange={(navigation) => edit((d) => {
            d.navigation = navigation;
        })}/>
            </div>
            <div id="theme" data-studio-panel className="studio-panel">
              <ThemeEditor theme={content.value.theme} onChange={(theme) => edit((d) => {
            d.theme = theme;
        })}/>
            </div>
            <div className="studio-group-head"><h2>Contact</h2></div>
            <div id="forms" data-studio-panel className="studio-panel">
              <FormsEditor forms={content.value.forms} pages={content.value.pages} theme={content.value.theme} onChange={(forms) => edit((draft) => {
            draft.forms = forms;
            draft.formsVersion = 1;
        })}/>
            </div>
            <div id="inbox" data-studio-panel className="studio-panel">
              <ContactInbox />
            </div>
            <section id="email" data-studio-panel className="studio-panel">
              <h2>Outgoing email</h2>
              <p className="studio-lede">
                Save settings with the draft, then publish. Gmail uses a separately
                approved sending connection; custom providers use verified SMTP.
                Credentials stay in server configuration. Delivery stays disabled
                until a verified sender and transport are ready.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  Provider
                  <select className={inputClass} value={content.value.email.provider} onChange={(e) => edit((d) => {
            d.email.provider = e.currentTarget.value as "gmail" | "custom";
        })}>
                    <option value="gmail">Gmail</option>
                    <option value="custom">Custom SMTP provider</option>
                  </select>
                </label>
                <Field label="Sender email" value={content.value.email.from} onChange={(v) => edit((d) => {
            d.email.from = v;
        })}/>
                <Field label="Reply-to email (optional)" value={content.value.email.replyTo} onChange={(v) => edit((d) => {
            d.email.replyTo = v;
        })}/>
              </div>
              <div className="studio-item-footer mt-4">
                <label className="studio-toggle">
                  <input type="checkbox" checked={content.value.email.enabled} onChange={(e) => edit((d) => {
            d.email.enabled = e.currentTarget.checked;
        })}/>
                  Enable approved outgoing email
                </label>
                <button type="button" className="studio-add" onClick={async () => {
            writeBox(mailPreview, "Preparing saved-draft capture…");
            try {
                const response = await fetch("/_kerf/x/waambat/admin/email-preview", {
                    method: "POST",
                    signal: AbortSignal.timeout(10000),
                });
                const result = (await response.json()) as {
                    mime?: string;
                    error?: string;
                    readiness?: {
                        ready: boolean;
                    };
                };
                if (!response.ok || !result.mime)
                    throw new Error(result.error || "Capture failed");
                writeBox(mailPreview, `No email sent. Delivery configuration ${result.readiness?.ready ? "ready" : "incomplete"}.\n${result.mime}`);
            }
            catch (error) {
                writeBox(mailPreview, error instanceof Error ? error.message : "Capture failed");
            }
        }}>
                  Preview email without sending
                </button>
              </div>
              {mailPreview.value && (<pre role="status" className="studio-pre">
                  {mailPreview.value}
                </pre>)}
            </section>
            <div className="studio-group-head"><h2>Settings</h2></div>
            <div id="seo" data-studio-panel className="studio-panel">
              <SiteSettingsEditor content={content.value} onChange={patch=>edit(d=>Object.assign(d,patch))}/>
            </div>
            <section id="backup" data-studio-panel className="studio-panel">
              <h2>Backup &amp; restore</h2>
              <p className="studio-lede">
                Download the saved content as JSON, or load a backup into this
                draft. Nothing public changes until you save and publish.
              </p>
              <div className="studio-item-footer">
                <a href="/_kerf/x/waambat/admin/export" download className="studio-btn">
                  Download saved content backup
                </a>
                <label className="studio-upload">
                  Restore content backup into draft
                  <input aria-label="Restore content backup" type="file" accept="application/json,.json" disabled={busy.value || uploading.value || Boolean(uncertain.value)} onChange={async (event) => {
            const input = event.currentTarget, file = input.files?.[0];
            if (!file)
                return;
            try {
                if (file.size > 1500000)
                    throw new Error("Backup is too large");
                const value: unknown = JSON.parse(await file.text());
                const restored = contentSchema.parse(value && typeof value === "object" && "draft" in value
                    ? value.draft
                    : value);
                if (confirm("Replace unsaved edits with this backup? Public content changes only after saving and publishing.")) {
                    writeBox(content, restored);
                    writeBox(status, "Backup loaded into unsaved draft. Save and preview before publishing.");
                }
            }
            catch {
                writeBox(status, "Invalid backup. Your current edits remain unchanged.");
            }
            finally {
                input.value = "";
            }
        }}/>
                </label>
              </div>
            </section>
          </fieldset>
        </div>
      </div>
    </div>);
}
