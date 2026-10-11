import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import {
  passwordConfigured,
  verifyBackupCredentials,
  backupSessionAuthorized,
} from "./admin-database";
export const adminEmails = () =>
  new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)),
  );
export const githubConfigured = () =>
  Boolean(
    process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET &&
      adminIds().size,
  );
export const googleConfigured = () =>
  Boolean(
    process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET &&
      adminEmails().size,
  );
export function approvedGoogleProfile(
  profile: { email?: string | null; email_verified?: unknown } | undefined,
) {
  return (
    profile?.email_verified === true &&
    typeof profile.email === "string" &&
    adminEmails().has(profile.email.toLowerCase())
  );
}
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
      (githubConfigured() || googleConfigured() || passwordConfigured()),
  );
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(githubConfigured() ? [GitHub] : []),
    ...(googleConfigured() ? [Google] : []),
    ...(passwordConfigured()
      ? [
          Credentials({
            credentials: {
              username: { label: "Username" },
              password: { label: "Password", type: "password" },
            },
            authorize: verifyBackupCredentials,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  callbacks: {
    signIn({ account, profile, user }) {
      if (!authConfigured()) return false;
      if (account?.provider === "google")
        return googleConfigured() && approvedGoogleProfile(profile);
      if (account?.provider === "credentials")
        return (
          passwordConfigured() && Boolean(user.id?.startsWith("password:"))
        );
      return (
        authConfigured() &&
        account?.provider === "github" &&
        adminIds().has(account.providerAccountId)
      );
    },
    jwt({ token, account, profile, user }) {
      if (account?.provider === "github")
        token.adminId = account.providerAccountId;
      if (account?.provider === "google") {
        token.adminId = `google:${profile?.email?.toLowerCase()}`;
        token.verifiedEmail = profile?.email_verified === true;
      }
      if (account?.provider === "credentials") {
        token.adminId = user.id;
        token.adminVersion = user.authVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = typeof token.adminId === "string" ? token.adminId : "";
      session.user.authVersion =
        typeof token.adminVersion === "number" ? token.adminVersion : undefined;
      session.user.verifiedEmail = token.verifiedEmail === true;
      return session;
    },
  },
  pages: { error: "/admin" },
});
export async function requireAdmin() {
  if (!authConfigured())
    throw new AdminError(503, "Admin sign-in is not configured");
  const session = await auth();
  const id = session?.user?.id ?? "";
  const allowed = id.startsWith("password:")
    ? await backupSessionAuthorized(id, session?.user.authVersion)
    : id.startsWith("google:")
      ? googleConfigured() &&
        session?.user.verifiedEmail === true &&
        adminEmails().has(id.slice(7))
      : githubConfigured() && adminIds().has(id);
  if (!allowed) throw new AdminError(401, "Sign in with an authorized account");
  return id;
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
