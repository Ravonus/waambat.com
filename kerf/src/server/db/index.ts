import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const env = process.env;
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

/** The optional legacy store must not connect during Kerf's module discovery. */
export function getLegacyDatabase() {
  if (!env.DATABASE_URL)
    throw new Error("The optional legacy database requires DATABASE_URL");
  const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
  if (env.NODE_ENV !== "production") globalForDb.conn = conn;
  return drizzle(conn, { schema });
}
