export function newTabProps(href?: string) {
  const path = href?.split(/[?#]/, 1)[0] ?? "";
  const localVideo = path.startsWith("/") && /\.(?:mp4|webm|mov|m4v)$/i.test(path);
  return href && (/^(?:https?:)?\/\//i.test(href) || localVideo)
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}
