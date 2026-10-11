import { readFile } from "node:fs/promises";
import {
  initializeAdminDatabase,
  provisionBackupAdmin,
  closeAdminDatabase,
} from "../src/server/admin-database";
// Requires the operator's approved target DB and an explicit username/password-file; creates no default credential.
const [username, passwordFile, confirmation] = process.argv.slice(2);
if (
  !process.env.AUTH_DATABASE_URL ||
  !username ||
  !passwordFile ||
  confirmation !== "--approved-target"
)
  throw new Error(
    "Provide AUTH_DATABASE_URL, username, private password-file and --approved-target after target/account approval",
  );
try {
  const password = (await readFile(passwordFile, "utf8")).trim();
  await initializeAdminDatabase();
  const id = await provisionBackupAdmin(username, password);
  console.log(
    JSON.stringify({
      username,
      id,
      created: true,
      password: "Stored only as salted scrypt hash",
    }),
  );
} finally {
  await closeAdminDatabase();
}
