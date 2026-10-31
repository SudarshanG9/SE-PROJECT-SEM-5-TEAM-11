import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../server.js";

const { clearRepositories } = require("../repositories");

describe("Repository API", () => {
  beforeEach(() => {
    clearRepositories();
  });

  it("creates a repository successfully", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({
        name: "Test Repository",
        description: "A sample repository",
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe(
      "Repository created successfully."
    );
    expect(response.body.repository).toMatchObject({
      name: "Test Repository",
      description: "A sample repository",
    });
    expect(response.body.repository.id).toBeTruthy();
    expect(response.body.repository.createdAt).toBeTruthy();
  });

  it("trims whitespace from repository details", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({
        name: "  My Project  ",
        description: "  Project description  ",
      });

    expect(response.status).toBe(201);
    expect(response.body.repository.name).toBe("My Project");
    expect(response.body.repository.description).toBe(
      "Project description"
    );
  });

  it("creates a repository with an empty description", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({ name: "No Description" });

    expect(response.status).toBe(201);
    expect(response.body.repository.description).toBe("");
  });

  it("rejects a missing repository name", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({ description: "Missing name" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "Repository name is required."
    );
  });

  it("rejects an empty repository name", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("rejects a non-string repository name", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({ name: 123 });

    expect(response.status).toBe(400);
  });

  it("rejects a non-string description", async () => {
    const response = await request(app)
      .post("/api/repositories")
      .send({
        name: "Test Repository",
        description: 123,
      });

    expect(response.status).toBe(400);
  });

  it("returns an empty repository list initially", async () => {
    const response = await request(app).get("/api/repositories");

    expect(response.status).toBe(200);
    expect(response.body.repositories).toEqual([]);
  });

  it("lists all created repositories", async () => {
    await request(app)
      .post("/api/repositories")
      .send({ name: "Project One" });

    await request(app)
      .post("/api/repositories")
      .send({ name: "Project Two" });

    const response = await request(app).get("/api/repositories");

    expect(response.status).toBe(200);
    expect(response.body.repositories).toHaveLength(2);
    expect(response.body.repositories.map((repo) => repo.name)).toEqual([
      "Project One",
      "Project Two",
    ]);
  });
    it("gets a repository by ID", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Find Me" });

    const id = created.body.repository.id;

    const response = await request(app)
      .get(`/api/repositories/${id}`);

    expect(response.status).toBe(200);
    expect(response.body.repository.name).toBe("Find Me");
  });

  it("returns 404 for a repository that does not exist", async () => {
    const response = await request(app)
      .get("/api/repositories/unknown-id");

    expect(response.status).toBe(404);
  });

  it("updates repository name and description", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Old Name", description: "Old description" });

    const id = created.body.repository.id;

    const response = await request(app)
      .put(`/api/repositories/${id}`)
      .send({
        name: "New Name",
        description: "New description",
      });

    expect(response.status).toBe(200);
    expect(response.body.repository.name).toBe("New Name");
    expect(response.body.repository.description).toBe(
      "New description"
    );
    expect(response.body.repository.updatedAt).toBeTruthy();
  });

  it("updates only the repository description", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Keep Name", description: "Old" });

    const id = created.body.repository.id;

    const response = await request(app)
      .put(`/api/repositories/${id}`)
      .send({ description: "Updated description" });

    expect(response.status).toBe(200);
    expect(response.body.repository.name).toBe("Keep Name");
    expect(response.body.repository.description).toBe(
      "Updated description"
    );
  });

  it("rejects an empty update request", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Test" });

    const response = await request(app)
      .put(`/api/repositories/${created.body.repository.id}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("rejects an invalid repository name during update", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Test" });

    const response = await request(app)
      .put(`/api/repositories/${created.body.repository.id}`)
      .send({ name: "   " });

    expect(response.status).toBe(400);
  });

  it("returns 404 when updating a missing repository", async () => {
    const response = await request(app)
      .put("/api/repositories/unknown-id")
      .send({ name: "Updated" });

    expect(response.status).toBe(404);
  });

  it("deletes a repository successfully", async () => {
    const created = await request(app)
      .post("/api/repositories")
      .send({ name: "Delete Me" });

    const id = created.body.repository.id;

    const response = await request(app)
      .delete(`/api/repositories/${id}`);

    expect(response.status).toBe(200);

    const check = await request(app)
      .get(`/api/repositories/${id}`);

    expect(check.status).toBe(404);
  });

  it("returns 404 when deleting a missing repository", async () => {
    const response = await request(app)
      .delete("/api/repositories/unknown-id");

    expect(response.status).toBe(404);
  });
});