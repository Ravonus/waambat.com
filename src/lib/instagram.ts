export function instagramTarget(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const match = /^\/(p|reel)\/([A-Za-z0-9_-]{5,64})\/?$/.exec(url.pathname);
    if (match) {
      const canonical = `https://www.instagram.com/${match[1]}/${match[2]}/`;
      return {
        canonical,
        embed: `${canonical}embed/`,
        type: match[1] === "reel" ? "reel" : "post",
      };
    }
    if (
      /^\/stories\/highlights\/\d{5,30}\/?$/.test(url.pathname) ||
      /^\/s\/[A-Za-z0-9_-]{5,100}\/?$/.test(url.pathname)
    )
      return {
        canonical: `https://www.instagram.com${url.pathname.replace(/\/?$/, "/")}`,
        embed: null,
        type: "highlight",
      };
  } catch {}
  return null;
}
