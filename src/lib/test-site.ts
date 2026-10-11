export function testSiteConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  if (
    env.ADMIN_TEST_LOGIN !== "1" ||
    env.CMS_CONTENT_PROVIDER !== "netlify-blobs"
  )
    return false;
  try {
    const u = new URL(env.AUTH_URL ?? "");
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ["waambat.netlify.app", "deploy-preview-1--waambat.netlify.app"].includes(
        u.hostname,
      )
    );
  } catch {
    return false;
  }
}
