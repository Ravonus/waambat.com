import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  verifyBackupCredentials,
  passwordAdmissionStats,
  closeAdminDatabase,
} from "../src/server/admin-database";
// Test process only: parent supplies an isolated DB through its environment and a start barrier.
const mode = process.argv[2];
if (
  ![
    "parallel-random",
    "parallel-locked",
    "parallel-disabled",
    "sequential-mixed",
  ].includes(mode ?? "")
)
  throw new Error("Unknown test workload");
console.log("READY");
await new Promise<void>((resolve) =>
  process.stdin.once("data", () => resolve()),
);
try {
  const attempt = async (username: string) =>
    assert.equal(
      await verifyBackupCredentials({
        username,
        password: randomBytes(32).toString("hex"),
      }),
      null,
    );
  if (mode === "sequential-mixed") {
    await attempt(`random-${randomBytes(8).toString("hex")}`);
    await attempt("admin");
    await attempt("disabled-test");
    await attempt(`random-${randomBytes(8).toString("hex")}`);
  } else
    await Promise.all(
      Array.from({ length: 64 }, () =>
        attempt(
          mode === "parallel-locked"
            ? "admin"
            : mode === "parallel-disabled"
              ? "disabled-test"
              : `random-${randomBytes(8).toString("hex")}`,
        ),
      ),
    );
  console.log(JSON.stringify(passwordAdmissionStats()));
} finally {
  await closeAdminDatabase();
}
