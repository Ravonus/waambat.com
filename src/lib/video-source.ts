import { instagramTarget } from "./instagram";
export type VideoSource = {
  provider: "youtube" | "vimeo" | "instagram" | "imgur" | "direct" | "ordinals";
  original: string;
  player: string;
  direct: boolean;
};
// Parse URLs only; never fetch user-supplied URLs or accept HTML.
export function videoSource(value: string): VideoSource | null {
  if (/^\/paintings\/[a-f0-9]{24}(?:-(?:640|960))?\.(mp4|webm)$/.test(value))
    return { provider: "direct", original: value, player: value, direct: true };
  if (/^\/api\/media\/[a-f0-9]{64}$/.test(value))
    return { provider: "direct", original: value, player: value, direct: true };
  // Same-origin hero renders shipped with the site (public/hero), never a user-supplied host.
  if (/^\/hero\/[a-z0-9][a-z0-9-]{0,80}\.(mp4|webm)$/.test(value))
    return { provider: "direct", original: value, player: value, direct: true };
  // Same-origin cached preview loops of the live Ordinals pieces (public/previews), content-hashed.
  if (/^\/previews\/[a-z0-9][a-z0-9-]{0,80}\.(mp4|webm)$/.test(value))
    return { provider: "direct", original: value, player: value, direct: true };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":")
    )
      return null;
    if (
      host === "ordinals.com" &&
      /^\/(?:preview|content)\/[a-f0-9]{64}i\d{1,12}$/.test(url.pathname) &&
      !url.search &&
      !url.hash
    )
      return {
        provider: "ordinals",
        original: value,
        player: value,
        direct: false,
      };
    const instagram = instagramTarget(value);
    if (instagram)
      return {
        provider: "instagram",
        original: instagram.canonical,
        player: instagram.embed ?? "",
        direct: false,
      };
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtu.be",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      if (
        url.pathname.startsWith("/embed/") &&
        [...url.searchParams].some(
          ([key, value]) => key !== "feature" || value !== "oembed",
        )
      )
        return null;
      const id =
        host === "youtu.be"
          ? url.pathname.slice(1)
          : url.pathname === "/watch"
            ? url.searchParams.get("v")
            : url.pathname.match(
                /^\/(?:embed|shorts)\/([A-Za-z0-9_-]{11})\/?$/,
              )?.[1];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id)
        ? {
            provider: "youtube",
            original: value,
            player: `https://www.youtube-nocookie.com/embed/${id}`,
            direct: false,
          }
        : null;
    }
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      const match = url.pathname.match(
        /^\/(?:video\/)?(\d{1,15})(?:\/([a-f0-9]{6,32}))?\/?$/,
      );
      const hash = url.searchParams.get("h") ?? match?.[2];
      if (!match || (hash && !/^[a-f0-9]{6,32}$/.test(hash))) return null;
      return {
        provider: "vimeo",
        original: value,
        player: `https://player.vimeo.com/video/${match[1]}${hash ? `?h=${hash}` : ""}`,
        direct: false,
      };
    }
    if (
      host === "i.imgur.com" &&
      /^\/[A-Za-z0-9]{5,10}\.(mp4|webm)$/.test(url.pathname)
    )
      return {
        provider: "imgur",
        original: value,
        player: `https://i.imgur.com${url.pathname}`,
        direct: true,
      };
    if (
      ["imgur.com", "www.imgur.com"].includes(host) &&
      /^\/[A-Za-z0-9]{5,10}\/?$/.test(url.pathname)
    )
      return {
        provider: "imgur",
        original: value,
        player: `https://imgur.com/${url.pathname.split("/")[1]}/embed`,
        direct: false,
      };
    if (/\.(mp4|webm)$/i.test(url.pathname))
      return {
        provider: "direct",
        original: value,
        player: value,
        direct: true,
      };
    return null;
  } catch {
    return null;
  }
}
