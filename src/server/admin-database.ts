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
let loginClient: ReturnType<typeof postgres> | undefined;
let loginInFlight = false;
let localWindow = 0;
let localRequests = 0;
const admissionStats = {
  deniedLocal: 0,
  deniedShared: 0,
  databaseFailure: 0,
  verificationKdfs: 0,
};
const kdfEvents: { start: number; finish: number }[] = [];
// Internal diagnostics only: no HTTP endpoint, identities or credentials.
export const passwordAdmissionStats = () => ({
  ...admissionStats,
  kdfEvents: kdfEvents.map((event) => ({ ...event })),
});
export const passwordConfigured = () =>
  process.env.ADMIN_PASSWORD_LOGIN === "1" &&
  (Boolean(process.env.AUTH_DATABASE_URL) ||
    process.env.ADMIN_DATABASE_PROVIDER === "netlify");
function databaseConnection() {
  const connection =
    process.env.ADMIN_DATABASE_PROVIDER === "netlify"
      ? getConnectionString()
      : process.env.AUTH_DATABASE_URL;
  if (!connection)
    throw new Error("The approved admin database is not configured");
  return connection;
}
export function adminDatabase() {
  return (client ??= postgres(databaseConnection(), {
    max: 2,
    connect_timeout: 5,
    idle_timeout: 20,
  }));
}
function passwordDatabase() {
  // Password attempts never occupy the pool used by existing sessions or setup.
  return (loginClient ??= postgres(databaseConnection(), {
    max: 1,
    connect_timeout: 3,
    idle_timeout: 20,
    connection: {
      application_name: "waambat-password-login",
      statement_timeout: 1500,
      lock_timeout: 150,
    },
  }));
}
export async function closeAdminDatabase() {
  await Promise.all([client?.end(), loginClient?.end()]);
  client = undefined;
  loginClient = undefined;
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
  for (const name of [
    "0001_admin_accounts.sql",
    "0002_password_admission.sql",
  ]) {
    const migration = await readFile(
      new URL(`../../database/migrations/${name}`, import.meta.url),
      "utf8",
    );
    await adminDatabase().unsafe(migration);
  }
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
// Dummy work is bounded by the exact same shared admission as real accounts.
// This is not an account or default credential, and its comparison can never authorize.
const dummyHash = `scrypt-131072-8-1:${"0".repeat(64)}:${"0".repeat(128)}`;
const wellFormedHash = (value: unknown): value is string =>
  typeof value === "string" &&
  /^scrypt-131072-8-1:[a-f0-9]{64}:[a-f0-9]{128}$/.test(value);
export async function verifyBackupCredentials(input: unknown) {
  if (!passwordConfigured()) return null;
  const credentials = credentialsSchema.safeParse(input);
  if (!credentials.success) return null;
  const now = Date.now();
  if (now - localWindow >= 60000) {
    localWindow = now;
    localRequests = 0;
  }
  localRequests++;
  // No waiting queue or expensive work for parallel requests in one process.
  if (loginInFlight || localRequests > 48) {
    admissionStats.deniedLocal++;
    return null;
  }
  loginInFlight = true;
  const lease = randomUUID();
  let claimed = false;
  let lostLease = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  try {
    const sql = passwordDatabase();
    // Atomic conditional UPDATE provides a deployment-wide 12/min budget and one live lease.
    // It does not trust client IP/forwarded headers or key quotas by guessed usernames.
    const admission = await sql`UPDATE waambat_password_admission SET
      attempts=CASE WHEN window_started<=now()-interval '1 minute' THEN 1 ELSE attempts+1 END,
      window_started=CASE WHEN window_started<=now()-interval '1 minute' THEN now() ELSE window_started END,
      lease_id=${lease},lease_until=now()+interval '2 minutes'
      WHERE key='password' AND (lease_until IS NULL OR lease_until<=now())
      AND (window_started<=now()-interval '1 minute' OR attempts<12) RETURNING key`;
    if (!admission.length) {
      admissionStats.deniedShared++;
      return null;
    }
    claimed = true;
    heartbeat = setInterval(() => {
      if (!claimed) return;
      void sql`UPDATE waambat_password_admission SET lease_until=now()+interval '2 minutes'
        WHERE key='password' AND lease_id=${lease} AND lease_until>now() RETURNING key`
        .then((rows) => {
          if (!rows.length) lostLease = true;
        })
        .catch(() => {
          lostLease = true;
        });
    }, 15000);
    const rows = await sql`SELECT id,password_hash,auth_version,role,disabled,
      (locked_until IS NOT NULL AND locked_until>now()) AS locked
      FROM waambat_admin_accounts WHERE username=${credentials.data.username}`;
    const row = rows[0];
    const hash = wellFormedHash(row?.password_hash)
      ? row.password_hash
      : dummyHash;
    const eligible = Boolean(
      row &&
        !row.disabled &&
        row.role === "admin" &&
        !row.locked &&
        wellFormedHash(row.password_hash),
    );
    // No transaction, row lock or DB connection is held during the memory-hard KDF.
    admissionStats.verificationKdfs++;
    const event = { start: Date.now(), finish: 0 };
    kdfEvents.push(event);
    if (kdfEvents.length > 12) kdfEvents.shift();
    let matched = false;
    try {
      matched = await matches(credentials.data.password, hash);
    } finally {
      event.finish = Date.now();
    }
    if (!eligible || lostLease) return null;
    if (!matched) {
      await sql`UPDATE waambat_admin_accounts SET failures=failures+1,
        locked_until=CASE WHEN failures+1>=5 THEN now()+interval '15 minutes' ELSE locked_until END
        WHERE id=${row!.id as string} AND password_hash=${hash} AND auth_version=${row!.auth_version as number}
        AND NOT disabled AND role='admin' AND (locked_until IS NULL OR locked_until<=now())
        AND EXISTS (SELECT 1 FROM waambat_password_admission WHERE key='password' AND lease_id=${lease} AND lease_until>now())`;
      return null;
    }
    // Recheck revocation/password changes and lease ownership after hashing.
    const authorized =
      await sql`UPDATE waambat_admin_accounts SET failures=0,locked_until=NULL
      WHERE id=${row!.id as string} AND password_hash=${hash} AND auth_version=${row!.auth_version as number}
      AND NOT disabled AND role='admin' AND (locked_until IS NULL OR locked_until<=now())
      AND EXISTS (SELECT 1 FROM waambat_password_admission WHERE key='password' AND lease_id=${lease} AND lease_until>now())
      RETURNING id,auth_version`;
    if (!authorized.length || lostLease) return null;
    return {
      id: `password:${authorized[0]!.id as string}`,
      name: credentials.data.username,
      authVersion: authorized[0]!.auth_version as number,
    };
  } catch {
    admissionStats.databaseFailure++;
    return null;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    if (claimed) {
      claimed = false;
      try {
        await passwordDatabase()`UPDATE waambat_password_admission SET lease_id=NULL,lease_until=NULL WHERE key='password' AND lease_id=${lease}`;
      } catch {
        /* A failed release stays closed until its finite crash-recovery lease expires. */
      }
    }
    loginInFlight = false;
  }
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
