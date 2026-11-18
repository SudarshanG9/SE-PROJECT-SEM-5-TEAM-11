import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../server.js";
import repositories from "../repositories.js";
import branches from "../branchStore.js";

describe("repository merge confirmation", () => {
  let repositoryId, target, source, url, approval, selection;

  const preview = () => request(app).post(`${url}/preview`)
    .set("Authorization", "Bearer token-carol").send(selection);
  const confirm = (payload = approval, token = "token-bob") => request(app).post(url)
    .set("Authorization", `Bearer ${token}`).send(payload);
  const save = (branch, code) => branches.createCommit({
    repositoryId, branchId: branch.id, code, message: "Update snapshot",
  }).branch;

  beforeEach(() => {
    repositories.clearRepositories();
    repositoryId = repositories.createRepository({ name: "Merge test" }).id;
    target = save(branches.initializeRepository(repositoryId), "one\ntwo");
    source = branches.createBranch({
      repositoryId, name: "feature", sourceBranchId: target.id,
    }).branch;
    source = save(source, "ONE\ntwo");
    target = save(target, "one\nTWO");
    url = `/api/repositories/${repositoryId}/merges`;
    selection = { sourceBranchId: source.id, targetBranchId: target.id };
    approval = {
      ...selection, confirmed: true,
      sourceHeadCommitId: source.headCommitId, targetHeadCommitId: target.headCommitId,
    };
  });

  it("previews without mutation, then records and applies exactly the approved result once", async () => {
    const result = await preview().expect(200);
    expect(result.body).toMatchObject({ mergedCode: "ONE\nTWO", conflicts: [] });
    expect(branches.getBranchById(repositoryId, target.id).headCommitId).toBe(target.headCommitId);

    const response = await confirm().expect(200);
    const { commit, branch } = response.body;
    expect(commit).toMatchObject({
      code: result.body.mergedCode, parentCommitId: target.headCommitId,
      mergeParentCommitId: source.headCommitId, mergeSourceBranchId: source.id, mergedBy: "u2",
    });
    expect(branch.headCommitId).toBe(commit.id);
    expect(branches.getBranchById(repositoryId, source.id).headCommitId).toBe(source.headCommitId);
    expect((await confirm().expect(200)).body.commit.id).toBe(commit.id);
    expect(branches.getCommits(repositoryId, target.id).map(({ id }) => id))
      .toEqual(expect.arrayContaining([commit.id, source.headCommitId, target.headCommitId]));
    await preview().expect(409);

    save(source, "One again\ntwo");
    expect((await preview().expect(200)).body).toMatchObject({
      mergedCode: "One again\nTWO", conflicts: [],
    });
  });

  it("requires explicit approval and the existing merge approval role", async () => {
    await confirm({ ...approval, confirmed: false }).expect(400);
    await confirm(approval, "token-carol").expect(403);
    await request(app).post(url).send(approval).expect(401);
    expect(branches.getBranchById(repositoryId, target.id).headCommitId).toBe(target.headCommitId);
  });

  it.each(["source", "target"])("rejects a preview when the %s head changes", async (side) => {
    await preview().expect(200);
    const updated = save(side === "source" ? source : target, "New snapshot");
    const result = await confirm().expect(409);
    expect(result.body.error).toMatch(/changed/);
    expect(branches.getBranchById(repositoryId, target.id).headCommitId)
      .toBe(side === "target" ? updated.headCommitId : target.headCommitId);
  });

  it("previews conflicts and rejects finalizing them", async () => {
    target = save(target, "Different\ntwo");
    const result = await preview().expect(200);
    expect(result.body.conflicts).toHaveLength(1);
    await confirm({ ...approval, targetHeadCommitId: target.headCommitId }).expect(409);
    expect(branches.getBranchById(repositoryId, target.id).headCommitId).toBe(target.headCommitId);
  });
});
