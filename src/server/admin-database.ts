import postgres from "postgres";
import { getConnectionString } from "@netlify/database";
import { readFile } from "node:fs/promises";
import {
  randomBytes,
  randomUUID,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    derive(
      password,
      salt,
      64,
      { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
let client: ReturnType<typeof postgres> | undefined;
export const passwordConfigured = () =>
  process.env.ADMIN_PASSWORD_LOGIN === "1" &&
  (Boolean(process.env.AUTH_DATABASE_URL) ||
    process.env.ADMIN_DATABASE_PROVIDER === "netlify");
export function adminDatabase() {
  const connection =
    process.env.ADMIN_DATABASE_PROVIDER === "netlify"
      ? getConnectionString()
      : process.env.AUTH_DATABASE_URL;
  if (!connection)
    throw new Error("The approved admin database is not configured");
  return (client ??= postgres(connection, {
    max: 2,
    connect_timeout: 5,
    idle_timeout: 20,
  }));
}
export async function closeAdminDatabase() {
  await client?.end();
  client = undefined;
}
export async function hashPassword(password: string) {
  if (password.length < 20 || password.length > 200)
    throw new Error("Use a random password of at least 20 characters");
  const salt = randomBytes(32).toString("hex");
  const hash = (await scrypt(password, salt)) as Buffer;
  return `scrypt-131072-8-1:${salt}:${hash.toString("hex")}`;
}
async function matches(password: string, stored: string) {
  const [parameters, salt, digest] = stored.split(":");
  if (
    parameters !== "scrypt-131072-8-1" ||
    !salt ||
    !digest ||
    !/^[a-f0-9]{64}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(digest)
  )
    return false;
  const actual = (await scrypt(password, salt)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(digest, "hex"));
}
// Explicit setup command only. HTTP requests never create tables or administrator accounts.
export async function initializeAdminDatabase() {
  const migration = await readFile(
    new URL(
      "../../database/migrations/0001_admin_accounts.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await adminDatabase().unsafe(migration);
}
export async function provisionBackupAdmin(username: string, password: string) {
  if (!/^[a-z0-9-]{3,40}$/.test(username)) throw new Error("Invalid username");
  const hashed = await hashPassword(password);
  const id = randomUUID();
  // Duplicate usernames are rejected; no silent reset, overwrite or privilege expansion.
  await adminDatabase()`INSERT INTO waambat_admin_accounts (id,username,password_hash,role) VALUES (${id},${username},${hashed},'admin')`;
  return id;
}
const credentialsSchema = z.object({
  username: z.string().regex(/^[a-z0-9-]{3,40}$/),
  password: z.string().min(1).max(200),
});
export async function verifyBackupCredentials(input: unknown) {
  if (!passwordConfigured()) return null;
  const credentials = credentialsSchema.safeParse(input);
  if (!credentials.success) return null;
  return adminDatabase().begin(async (sql) => {
    const rows =
      await sql`SELECT * FROM waambat_admin_accounts WHERE username=${credentials.data.username} FOR UPDATE`;
    const row = rows[0];
    if (
      !row ||
      row.disabled ||
      row.role !== "admin" ||
      (row.locked_until &&
        new Date(row.locked_until as string).getTime() > Date.now())
    ) {
      await scrypt(credentials.data.password, "missing-account-constant-salt");
      return null;
    }
    if (
      !(await matches(credentials.data.password, row.password_hash as string))
    ) {
      await sql`UPDATE waambat_admin_accounts SET failures=failures+1, locked_until=CASE WHEN failures+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END WHERE id=${row.id as string}`;
      return null;
    }
    await sql`UPDATE waambat_admin_accounts SET failures=0,locked_until=NULL WHERE id=${row.id as string}`;
    return {
      id: `password:${row.id as string}`,
      name: credentials.data.username,
      authVersion: row.auth_version as number,
    };
  });
}
export async function backupSessionAuthorized(
  id: string,
  version: number | undefined,
) {
  if (!passwordConfigured() || !/^password:[a-f0-9-]{36}$/.test(id))
    return false;
  const rows =
    await adminDatabase()`SELECT auth_version,disabled,role FROM waambat_admin_accounts WHERE id=${id.slice(9)}`;
  return Boolean(
    rows[0] &&
      !rows[0].disabled &&
      rows[0].role === "admin" &&
      rows[0].auth_version === version,
  );
}
