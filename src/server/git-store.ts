import { createSign } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { contentSchema, type Content } from "~/lib/content";
import { AdminError } from "./auth";
export const CONTENT_PATH = "src/content/site.json";
export const MAX_CONTENT_BYTES = 500000;
export function serializeContent(content: Content) {
  const serialized =
    JSON.stringify(contentSchema.parse(content), null, 2) + "\n";
  if (Buffer.byteLength(serialized, "utf8") > MAX_CONTENT_BYTES)
    throw new AdminError(
      413,
      "Draft exceeds 500 KB after formatting. Shorten descriptions or other text before saving. Your previous draft is unchanged.",
    );
  return serialized;
}
export const DRAFT_BRANCH = "cms/waambat-drafts";
export const draftBranch = () =>
  process.env.GITHUB_DRAFT_BRANCH ?? DRAFT_BRANCH;
export const baseBranch = () => process.env.GITHUB_CONTENT_BRANCH ?? "main";
export interface GitSnapshot {
  sha: string;
  tree: string;
  content: Content;
}
export interface GitStore {
  read(branch: string): Promise<GitSnapshot | null>;
  createBranch(branch: string, sha: string): Promise<void>;
  commit(
    branch: string,
    expected: string,
    content: Content,
    message: string,
  ): Promise<string>;
}
function checkBranch(branch: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]{0,150}$/.test(branch))
    throw new AdminError(503, "Content branch configuration is invalid");
  return branch;
}
export const gitConfigured = () =>
  Boolean(
    process.env.GITHUB_APP_ID &&
      process.env.GITHUB_APP_INSTALLATION_ID &&
      process.env.GITHUB_APP_PRIVATE_KEY &&
      process.env.GITHUB_CONTENT_BRANCH &&
      baseBranch() !== draftBranch(),
  );
let cached: { token: string; expires: number } | undefined;
async function installationToken() {
  if (!gitConfigured())
    throw new AdminError(503, "Git-backed publishing is not configured");
  if (cached && cached.expires > Date.now() + 60000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const encode = (data: unknown) =>
    Buffer.from(JSON.stringify(data)).toString("base64url");
  const input = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iat: now - 60, exp: now + 540, iss: process.env.GITHUB_APP_ID })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  const jwt = `${input}.${signer.sign(process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"), "base64url")}`;
  const response = await fetch(
    `https://api.github.com/app/installations/${encodeURIComponent(process.env.GITHUB_APP_INSTALLATION_ID!)}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositories: ["waambat.com"],
        permissions: { contents: "write" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok)
    throw new AdminError(
      503,
      "The approved GitHub App cannot access this repository",
    );
  const result = (await response.json()) as {
    token: string;
    expires_at: string;
  };
  cached = { token: result.token, expires: Date.parse(result.expires_at) };
  return result.token;
}
export class GitHubStore implements GitStore {
  constructor(
    private transport: typeof fetch = fetch,
    private token: () => Promise<string> = installationToken,
  ) {}
  private async call<T>(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<T | null> {
    const response = await this.transport(
      `https://api.github.com/repos/Ravonus/waambat.com/${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok)
      throw new AdminError(
        [409, 422].includes(response.status) ? 409 : 503,
        response.status === 403
          ? "Repository rules or GitHub App permissions blocked the commit; nothing was published"
          : "The Git request failed or a newer commit exists. Reload before saving.",
      );
    return response.json() as Promise<T>;
  }
  async read(branch: string) {
    const ref = await this.call<{ object: { sha: string } }>(
      `git/ref/heads/${encodeURIComponent(checkBranch(branch))}`,
    );
    if (!ref) return null;
    const commit = await this.call<{ tree: { sha: string } }>(
      `git/commits/${ref.object.sha}`,
    );
    const file = await this.call<{ content: string; encoding: string }>(
      `contents/${CONTENT_PATH}?ref=${ref.object.sha}`,
    );
    if (!commit || !file || file.encoding !== "base64")
      throw new AdminError(
        503,
        "The content file is missing from the selected branch",
      );
    const bytes = Buffer.from(file.content, "base64");
    if (bytes.length > MAX_CONTENT_BYTES)
      throw new AdminError(503, "Stored content is too large");
    return {
      sha: ref.object.sha,
      tree: commit.tree.sha,
      content: contentSchema.parse(JSON.parse(bytes.toString("utf8"))),
    };
  }
  async createBranch(branch: string, sha: string) {
    try {
      await this.call("git/refs", "POST", {
        ref: `refs/heads/${checkBranch(branch)}`,
        sha,
      });
    } catch (e) {
      if (
        !(e instanceof AdminError) ||
        e.status !== 409 ||
        !(await this.read(branch))
      )
        throw e;
    }
  }
  async commit(
    branch: string,
    expected: string,
    content: Content,
    message: string,
  ) {
    const serialized = serializeContent(content);
    const current = await this.read(branch);
    if (!current || current.sha !== expected)
      throw new AdminError(
        409,
        "A newer version exists. Reload before saving; your edits remain on screen.",
      );
    const blob = await this.call<{ sha: string }>("git/blobs", "POST", {
      content: serialized,
      encoding: "utf-8",
    });
    const tree = await this.call<{ sha: string }>("git/trees", "POST", {
      base_tree: current.tree,
      tree: [
        { path: CONTENT_PATH, mode: "100644", type: "blob", sha: blob!.sha },
      ],
    });
    const commit = await this.call<{ sha: string }>("git/commits", "POST", {
      message,
      tree: tree!.sha,
      parents: [expected],
    });
    // A concurrent writer creates a divergent commit: force:false rejects it.
    await this.call(
      `git/refs/heads/${encodeURIComponent(checkBranch(branch))}`,
      "PATCH",
      { sha: commit!.sha, force: false },
    );
    return commit!.sha;
  }
}
const run = promisify(execFile);
export class LocalGitStore implements GitStore {
  constructor(private directory: string) {}
  private async git(args: string[], input?: string) {
    if (input !== undefined) {
      const { spawn } = await import("node:child_process");
      return new Promise<string>((resolve, reject) => {
        const child = spawn("git", ["-C", this.directory, ...args], {
          env: {
            ...process.env,
            GIT_AUTHOR_NAME: "WAAMBAT local test",
            GIT_AUTHOR_EMAIL: "test@example.invalid",
            GIT_COMMITTER_NAME: "WAAMBAT local test",
            GIT_COMMITTER_EMAIL: "test@example.invalid",
          },
        });
        let out = "";
        let error = "";
        child.stdout.on("data", (b) => (out += String(b)));
        child.stderr.on("data", (b) => (error += String(b)));
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve(out.trim()) : reject(new Error(error)),
        );
        child.stdin.end(input);
      });
    }
    return (await run("git", ["-C", this.directory, ...args])).stdout.trim();
  }
  async read(branch: string) {
    let sha: string;
    try {
      sha = await this.git([
        "rev-parse",
        "--verify",
        `refs/heads/${checkBranch(branch)}`,
      ]);
    } catch {
      return null;
    }
    const [tree, file] = await Promise.all([
      this.git(["rev-parse", `${sha}^{tree}`]),
      this.git(["show", `${sha}:${CONTENT_PATH}`]),
    ]);
    if (Buffer.byteLength(file, "utf8") > MAX_CONTENT_BYTES)
      throw new AdminError(503, "Stored content is too large");
    return { sha, tree, content: contentSchema.parse(JSON.parse(file)) };
  }
  async createBranch(branch: string, sha: string) {
    try {
      await this.git([
        "update-ref",
        `refs/heads/${checkBranch(branch)}`,
        sha,
        "0".repeat(40),
      ]);
    } catch {
      if (!(await this.read(branch)))
        throw new AdminError(409, "Draft branch changed");
    }
  }
  async commit(
    branch: string,
    expected: string,
    content: Content,
    message: string,
  ) {
    const serialized = serializeContent(content);
    const current = await this.read(branch);
    if (!current || current.sha !== expected)
      throw new AdminError(
        409,
        "A newer version exists. Reload before saving; your edits remain on screen.",
      );
    const blob = await this.git(["hash-object", "-w", "--stdin"], serialized);
    // Use a temporary index so browser tests never edit the source checkout.
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const folder = await mkdtemp(join(tmpdir(), "waambat-index-"));
    try {
      const env = { ...process.env, GIT_INDEX_FILE: join(folder, "index") };
      await run("git", ["-C", this.directory, "read-tree", current.tree], {
        env,
      });
      await run(
        "git",
        [
          "-C",
          this.directory,
          "update-index",
          "--add",
          "--cacheinfo",
          `100644,${blob},${CONTENT_PATH}`,
        ],
        { env },
      );
      const tree = (
        await run("git", ["-C", this.directory, "write-tree"], { env })
      ).stdout.trim();
      const sha = await this.git(
        ["commit-tree", tree, "-p", expected],
        message + "\n",
      );
      try {
        await this.git(["update-ref", `refs/heads/${branch}`, sha, expected]);
      } catch {
        throw new AdminError(
          409,
          "A newer version exists. Reload before saving; your edits remain on screen.",
        );
      }
      return sha;
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }
}
export function localTestConfigured() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.CMS_LOCAL_TEST === "1" &&
    !!process.env.CMS_LOCAL_REPOSITORY
  );
}
export function getGitStore(): GitStore {
  if (localTestConfigured())
    return new LocalGitStore(process.env.CMS_LOCAL_REPOSITORY!);
  if (!gitConfigured())
    throw new AdminError(
      503,
      "Git-backed content is disabled until the approved GitHub App is configured",
    );
  return new GitHubStore();
}
