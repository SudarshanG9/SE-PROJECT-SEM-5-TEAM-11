import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../server.js";

const { clearRepositories, createRepository } = require("../repositories");
const { clearBranchData } = require("../branchStore");

describe("Branch management API", () => {
  let repository;

  beforeEach(() => {
    clearRepositories();
    clearBranchData();

    repository = createRepository({
      name: "Branch Test Repository",
      description: "Repository for branch tests",
    });

    // The repository API normally initializes its main branch.
    // This direct setup mirrors that behavior for these tests.
    const { initializeRepository } = require("../branchStore");
    initializeRepository(repository.id);
  });

  it("lists the default main branch", async () => {
    const response = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    expect(response.status).toBe(200);
    expect(response.body.branches).toHaveLength(1);
    expect(response.body.branches[0]).toMatchObject({
      name: "main",
      isDefault: true,
      isProtected: true,
    });
    expect(response.body.branches[0].headCommitId).toBeTruthy();
  });

  it("creates a branch from an existing branch", async () => {
    const branchesResponse = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    const main = branchesResponse.body.branches[0];

    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/login",
        sourceBranchId: main.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.branch.name).toBe("feature/login");
    expect(response.body.branch.baseBranchId).toBe(main.id);
    expect(response.body.branch.baseCommitId).toBe(main.headCommitId);
    expect(response.body.branch.headCommitId).toBe(main.headCommitId);
    expect(response.body.branch.isDefault).toBe(false);
  });

  it("creates a commit on a branch", async () => {
    const branchesResponse = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    const main = branchesResponse.body.branches[0];

    const response = await request(app)
      .post(`/api/repositories/${repository.id}/commits`)
      .send({
        branchId: main.id,
        message: "Add initial code",
        code: "console.log('Hello');",
      });

    expect(response.status).toBe(201);
    expect(response.body.commit.message).toBe("Add initial code");
    expect(response.body.commit.code).toBe("console.log('Hello');");
    expect(response.body.commit.parentCommitId).toBe(main.headCommitId);
    expect(response.body.branch.headCommitId).toBe(response.body.commit.id);
  });

  it("creates a branch from a selected commit", async () => {
    const branchesResponse = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    const main = branchesResponse.body.branches[0];

    const commitResponse = await request(app)
      .post(`/api/repositories/${repository.id}/commits`)
      .send({
        branchId: main.id,
        message: "Save version one",
        code: "version one",
      });

    const commitId = commitResponse.body.commit.id;

    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/from-commit",
        sourceCommitId: commitId,
      });

    expect(response.status).toBe(201);
    expect(response.body.branch.baseCommitId).toBe(commitId);
    expect(response.body.branch.headCommitId).toBe(commitId);
  });

  it("includes inherited commits in branch history", async () => {
    const branchesResponse = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    const main = branchesResponse.body.branches[0];

    const commitResponse = await request(app)
      .post(`/api/repositories/${repository.id}/commits`)
      .send({
        branchId: main.id,
        message: "First change",
        code: "first version",
      });

    const featureResponse = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/history",
        sourceBranchId: main.id,
      });

    const featureId = featureResponse.body.branch.id;

    const historyResponse = await request(app)
      .get(`/api/repositories/${repository.id}/commits`)
      .query({ branchId: featureId });

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.commits.map((commit) => commit.id))
      .toContain(commitResponse.body.commit.id);
  });

  it("renames a regular branch", async () => {
    const main = (await request(app)
      .get(`/api/repositories/${repository.id}/branches`)).body.branches[0];

    const created = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "old-name",
        sourceBranchId: main.id,
      });

    const branchId = created.body.branch.id;

    const response = await request(app)
      .put(`/api/repositories/${repository.id}/branches/${branchId}`)
      .send({ name: "new-name" });

    expect(response.status).toBe(200);
    expect(response.body.branch.name).toBe("new-name");
  });

  it("does not allow renaming the default branch", async () => {
    const main = (await request(app)
      .get(`/api/repositories/${repository.id}/branches`)).body.branches[0];

    const response = await request(app)
      .put(`/api/repositories/${repository.id}/branches/${main.id}`)
      .send({ name: "renamed-main" });

    expect(response.status).toBe(403);
  });

  it("does not allow deleting the default branch", async () => {
    const main = (await request(app)
      .get(`/api/repositories/${repository.id}/branches`)).body.branches[0];

    const response = await request(app)
      .delete(`/api/repositories/${repository.id}/branches/${main.id}`);

    expect(response.status).toBe(403);
  });

  it("deletes a regular branch", async () => {
    const main = (await request(app)
      .get(`/api/repositories/${repository.id}/branches`)).body.branches[0];

    const created = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/to-delete",
        sourceBranchId: main.id,
      });

    const branchId = created.body.branch.id;

    const response = await request(app)
      .delete(`/api/repositories/${repository.id}/branches/${branchId}`);

    expect(response.status).toBe(200);

    const list = await request(app)
      .get(`/api/repositories/${repository.id}/branches`);

    expect(list.body.branches.some((branch) => branch.id === branchId))
      .toBe(false);
  });

  it("rejects an empty branch name", async () => {
    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects duplicate branch names", async () => {
    const main = (await request(app)
      .get(`/api/repositories/${repository.id}/branches`)).body.branches[0];

    await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/duplicate",
        sourceBranchId: main.id,
      });

    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "FEATURE/DUPLICATE",
        sourceBranchId: main.id,
      });

    expect(response.status).toBe(409);
  });

  it("rejects a nonexistent base branch", async () => {
    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/invalid",
        sourceBranchId: "unknown-branch",
      });

    expect(response.status).toBe(400);
  });

  it("rejects a commit belonging to another repository", async () => {
    const anotherRepository = createRepository({
      name: "Another Repository",
    });

    const { initializeRepository } = require("../branchStore");
    initializeRepository(anotherRepository.id);

    const otherBranches = await request(app)
      .get(`/api/repositories/${anotherRepository.id}/branches`);

    const otherMain = otherBranches.body.branches[0];

    const otherCommit = await request(app)
      .post(`/api/repositories/${anotherRepository.id}/commits`)
      .send({
        branchId: otherMain.id,
        message: "Other repository commit",
        code: "other code",
      });

    const response = await request(app)
      .post(`/api/repositories/${repository.id}/branches`)
      .send({
        name: "feature/wrong-repository",
        sourceCommitId: otherCommit.body.commit.id,
      });

    expect(response.status).toBe(400);
  });

  it("returns 404 for a nonexistent repository", async () => {
    const response = await request(app)
      .get("/api/repositories/unknown-repository/branches");

    expect(response.status).toBe(404);
  });
});