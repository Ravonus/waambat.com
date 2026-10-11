import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
export const adminIds = () =>
  new Set(
    (process.env.ADMIN_GITHUB_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((id) => /^\d{1,20}$/.test(id)),
  );
export const authConfigured = () =>
  Boolean(
    (process.env.AUTH_SECRET?.length ?? 0) >= 32 &&
      process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      adminIds().size,
  );
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    signIn({ account }) {
      return (
        authConfigured() &&
        account?.provider === "github" &&
        adminIds().has(account.providerAccountId)
      );
    },
    jwt({ token, account }) {
      if (account?.provider === "github")
        token.adminId = account.providerAccountId;
      return token;
    },
    session({ session, token }) {
      session.user.id = typeof token.adminId === "string" ? token.adminId : "";
      return session;
    },
  },
  pages: { error: "/admin" },
});
export async function requireAdmin() {
  if (!authConfigured())
    throw new AdminError(503, "Admin sign-in is not configured");
  const session = await auth();
  if (!session?.user?.id || !adminIds().has(session.user.id))
    throw new AdminError(401, "Sign in with an authorized account");
  return session.user.id;
}
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request) {
  const expected = process.env.AUTH_URL
    ? new URL(process.env.AUTH_URL).origin
    : new URL(request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new AdminError(403, "Request origin is not allowed");
}
