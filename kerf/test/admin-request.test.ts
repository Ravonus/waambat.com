import test from "node:test";
import assert from "node:assert/strict";
import {
  AdminRequestError,
  requestContentState,
} from "../src/lib/admin-request";
test("admin request deadline aborts transport and treats an unconfirmed write as uncertain", async () => {
  const original = globalThis.fetch;
  let aborted = false;
  globalThis.fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  try {
    await assert.rejects(
      () => requestContentState({ method: "POST" }, 10),
      (error: unknown) => error instanceof AdminRequestError && error.uncertain,
    );
    assert.equal(aborted, true);
  } finally {
    globalThis.fetch = original;
  }
});
test("explicit validation rejection is definitive while server failure remains uncertain", async () => {
  const original = globalThis.fetch;
  try {
    for (const [status, uncertain] of [
      [413, false],
      [409, false],
      [503, true],
    ] as const) {
      globalThis.fetch = async () =>
        Response.json({ error: "Request failed" }, { status });
      await assert.rejects(
        () => requestContentState({ method: "POST" }),
        (error: unknown) =>
          error instanceof AdminRequestError && error.uncertain === uncertain,
      );
    }
  } finally {
    globalThis.fetch = original;
  }
});
