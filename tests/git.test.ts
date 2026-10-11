import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  LocalGitStore,
  GitHubStore,
  CONTENT_PATH,
  DRAFT_BRANCH,
} from "../src/server/git-store";
import { seedContent } from "../src/content/seed";
test("real Git draft/publish commits preserve originals and reject competing writes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "waambat-git-unit-"));
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", directory, ...args], {
      encoding: "utf8",
    }).trim();
  try {
    await mkdir(join(directory, "src/content"), { recursive: true });
    await writeFile(join(directory, CONTENT_PATH), JSON.stringify(seedContent));
    git("init", "-b", "main");
    git("add", CONTENT_PATH);
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-m",
      "Initial content",
    );
    const store = new LocalGitStore(directory);
    const initial = (await store.read("main"))!;
    await store.createBranch(DRAFT_BRANCH, initial.sha);
    const changed = structuredClone(seedContent);
    changed.sections[0]!.items[0]!.title = "Private draft";
    const draft = await store.commit(
      DRAFT_BRANCH,
      initial.sha,
      changed,
      "Save draft",
    );
    assert.equal(
      (await store.read("main"))!.content.sections[0]!.items[0]!.title,
      "Feels 404",
    );
    assert.equal(git("diff", "--name-only", initial.sha, draft), CONTENT_PATH);
    await assert.rejects(
      () => store.commit(DRAFT_BRANCH, initial.sha, seedContent, "Stale edit"),
      { status: 409 },
    );
    const contenders = await Promise.allSettled([
      store.commit(DRAFT_BRANCH, draft, seedContent, "Save one"),
      store.commit(DRAFT_BRANCH, draft, changed, "Save two"),
    ]);
    assert.equal(contenders.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(contenders.filter((x) => x.status === "rejected").length, 1);
    const latest = (await store.read(DRAFT_BRANCH))!;
    await store.commit(
      "main",
      initial.sha,
      latest.content,
      "Publish reviewed draft",
    );
    assert.ok((await store.read("main"))!.sha !== initial.sha);
    assert.equal(
      git("show", `${initial.sha}:${CONTENT_PATH}`),
      JSON.stringify(seedContent),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("GitHub adapter limits writes to content JSON and rejects force pushes", async () => {
  const calls: { path: string; body: Record<string, unknown> | undefined }[] =
    [];
  const head = "a".repeat(40);
  const transport: typeof fetch = async (input, init) => {
    const path = String(input).split("/waambat.com/")[1]!;
    const body = init?.body
      ? (JSON.parse(String(init.body)) as Record<string, unknown>)
      : undefined;
    calls.push({ path, body });
    assert.ok(
      (init!.headers as Record<string, string>).Authorization!.startsWith(
        "Bearer ",
      ),
    );
    let data: unknown = { sha: "b".repeat(40) };
    if (path.startsWith("git/ref/")) data = { object: { sha: head } };
    else if (path.startsWith("git/commits/") && init?.method === "GET")
      data = { tree: { sha: "c".repeat(40) } };
    else if (path.startsWith("contents/"))
      data = {
        content: Buffer.from(JSON.stringify(seedContent)).toString("base64"),
        encoding: "base64",
      };
    return Response.json(data);
  };
  await new GitHubStore(
    transport,
    async () => "ephemeral-installation-token",
  ).commit(DRAFT_BRANCH, head, seedContent, "Save draft");
  const tree = calls.find((c) => c.path === "git/trees")!.body!.tree as {
    path: string;
    type: string;
  }[];
  assert.deepEqual(
    tree.map((t) => t.path),
    [CONTENT_PATH],
  );
  assert.equal(calls.at(-1)!.body!.force, false);
  assert.deepEqual(calls.find((c) => c.path === "git/commits")!.body!.parents, [
    head,
  ]);
});
