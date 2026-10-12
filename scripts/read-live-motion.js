/* global document, location, performance, getComputedStyle */
// Read-only snapshot for the permitted connected browser on the public art page.
// No fetch, cookie/token/form access, playback mutation, media export or timers.
// Take two snapshots at spaced times; use supported browser network inspection
// for actual HTTP status/MIME and rendered-font inspection for actual glyph use.
(() => {
  const url = new URL(location.href);
  const hosts = [
    "waambat.com",
    "www.waambat.com",
    "waambat.netlify.app",
    "www.satflow.com",
    "satflow.com",
    "whitepaper.terminus.art",
    "ordinals.com",
  ];
  const preview = /^deploy-preview-\d+--waambat\.netlify\.app$/.test(
    url.hostname,
  );
  if (!hosts.includes(url.hostname) && !preview)
    throw new Error("Use only the requested public source/site pages");
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/auth"))
    throw new Error(
      "This snapshot excludes administrator/authentication routes",
    );
  /** @param {Element} element */
  const dimensions = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  };
  /** @param {string | undefined} value */
  const publicPath = (value) => {
    if (!value) return "";
    try {
      const target = new URL(value, location.href);
      return target.origin + target.pathname;
    } catch {
      return "unresolved";
    }
  };
  const logo =
    document.querySelector(".site-logo, .site-title a, #site-title a") ??
    Array.from(document.querySelectorAll("a")).find(
      (element) => element.textContent?.trim().toLowerCase() === "waambat",
    );
  return {
    page: publicPath(location.href),
    sampledAt: new Date().toISOString(),
    viewport: {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    videos: Array.from(document.querySelectorAll("video"), (video) => ({
      source: publicPath(
        video.currentSrc || video.src || video.querySelector("source")?.src,
      ),
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error
        ? { code: video.error.code, message: video.error.message }
        : null,
      currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null,
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      paused: video.paused,
      muted: video.muted,
      playsInline: video.playsInline,
      preload: video.preload,
      bounds: dimensions(video),
    })),
    frames: Array.from(document.querySelectorAll("iframe"), (frame) => ({
      source: publicPath(frame.src),
      bounds: dimensions(frame),
    })),
    canvases: Array.from(document.querySelectorAll("canvas"), (canvas) => ({
      width: canvas.width,
      height: canvas.height,
      bounds: dimensions(canvas),
    })),
    logo: logo
      ? {
          text: logo.textContent,
          bounds: dimensions(logo),
          declaredFamily: getComputedStyle(logo).fontFamily,
          effectiveBrandVariable:
            getComputedStyle(logo).getPropertyValue("--font-brand"),
          size: getComputedStyle(logo).fontSize,
          weight: getComputedStyle(logo).fontWeight,
          letterSpacing: getComputedStyle(logo).letterSpacing,
        }
      : null,
    faces: document.fonts
      ? Array.from(document.fonts, (face) => ({
          family: face.family,
          style: face.style,
          weight: face.weight,
          status: face.status,
        }))
      : [],
    resources: /** @type {PerformanceResourceTiming[]} */ (
      performance.getEntriesByType("resource")
    )
      .filter(
        (entry) =>
          /^https:\/\/use\.typekit\.net\//.test(entry.name) ||
          entry.name.startsWith("https://i.imgur.com/3hhNUKR.mp4"),
      )
      .map((entry) => ({
        source: publicPath(entry.name),
        initiatorType: entry.initiatorType,
        duration: entry.duration,
        note: "Resource timing is not HTTP status or proof of response bytes/font decoding",
      })),
    boundary:
      "Read-only DOM snapshot. Declarations and empty/loaded timing records do not prove actual font glyphs or recursive LUX playback. Cross-origin frames must be inspected through supported normal browser capabilities; no policy bypass.",
  };
})();
