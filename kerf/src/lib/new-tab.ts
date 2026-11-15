export function newTabProps(href?: string) {
  return href && /^(?:https?:)?\/\//i.test(href)
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
}
