import assert from "node:assert/strict";
import { getStore, setEnvironmentContext } from "@netlify/blobs";
import { writeFile } from "node:fs/promises";

// Real SDK with synthetic, nonsecret context and fetch: no provider access.
// Run with NODE_ENV=test so SDK retry delays do not take 25 seconds.
const cases: Record<string, unknown>[] = [];
async function probe(
  name: string,
  context: Record<string, string>,
  status: number,
) {
  setEnvironmentContext(context);
  let requests = 0;
  let strongEndpointSelected = false;
  const started = performance.now();
  let category: string | undefined;
  let resultStatus: number | undefined;
  let absent = false;
  try {
    const result = await getStore({
      name: "waambat-content-context-fixture",
      consistency: "strong",
      fetch: async (input) => {
        requests++;
        strongEndpointSelected = String(input).startsWith(
          "https://uncached.invalid/",
        );
        return new Response(null, { status });
      },
    }).getWithMetadata("state", { type: "json" });
    absent = result === null;
  } catch (error) {
    category = error instanceof Error ? error.name : "unknown";
    if (
      typeof error === "object" &&
      error &&
      "status" in error &&
      typeof error.status === "number"
    )
      resultStatus = error.status;
  }
  const finding = {
    name,
    requests,
    category,
    status: resultStatus,
    absent,
    strongEndpointSelected,
    elapsedMs: Math.round(performance.now() - started),
  };
  cases.push(finding);
  return finding;
}
try {
  const missing = await probe("missing context", {}, 200);
  assert.equal(missing.category, "MissingBlobsEnvironmentError");
  assert.equal(missing.requests, 0);
  const context = {
    siteID: "isolated-fixture",
    token: "synthetic-fixture-only",
    edgeURL: "https://edge.invalid/",
    uncachedEdgeURL: "https://uncached.invalid/",
  };
  const incomplete = {
    siteID: context.siteID,
    token: context.token,
    edgeURL: context.edgeURL,
  };
  const noStrong = await probe(
    "edge context missing strong endpoint",
    incomplete,
    200,
  );
  assert.equal(noStrong.category, "BlobsConsistencyError");
  assert.equal(noStrong.requests, 0);
  for (const status of [401, 403, 404, 503]) {
    const finding = await probe(`provider HTTP${status}`, context, status);
    assert.equal(finding.requests, status === 503 ? 6 : 1);
    assert.equal(finding.strongEndpointSelected, true);
    if (status === 404) assert.equal(finding.absent, true);
    else assert.equal(finding.status, status);
  }
  await writeFile(
    "evidence/blob-runtime-context-check.json",
    JSON.stringify(
      {
        boundary:
          "Real installed SDK11.1.4 with synthetic context/fetch; no hosted tokens, endpoints or credential inspection",
        runtimeAdapter:
          "Locally packaged Netlify Next adapter5.16.2 bootstrap maps event blobs.url to edgeURL and blobs.url_uncached to uncachedEdgeURL before handler invocation",
        store:
          "next.config.js selects waambat-content-production for production and waambat-content-review-1 for PR1 preview at build time; preserve both namespaces. getStore is site-scoped, but selected names isolate content.",
        contextSource:
          "globalThis.netlifyBlobsContext string takes precedence over NETLIFY_BLOBS_CONTEXT; automatic context fields are resolved when getStore is called",
        interpretation:
          "Missing context/strong endpoint fails before fetch. Complete context selects uncached endpoint for strong reads. This synthetic fetch does not include Next response cloning: use blobs-next-cancellation-check.json and packaged adapter evidence for the real cancellation mechanism. Hosted exact provider status remains unobserved. No context/token overrides or legacy connectLambda workaround introduced.",
        cases,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Real SDK runtime-context and failure classification checks pass",
  );
} finally {
  setEnvironmentContext({});
}
