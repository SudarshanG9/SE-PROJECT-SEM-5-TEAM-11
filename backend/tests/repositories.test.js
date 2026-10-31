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
});