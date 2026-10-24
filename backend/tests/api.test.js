import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";

describe("API basics", () => {
  it("returns 404 for an unknown route", async () => {
    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
  });

  it("allows cross-origin requests (CORS)", async () => {
    const response = await request(app).get("/api/health");

    expect(response.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("rejects merge requests with missing inputs", async () => {
    const response = await request(app).post("/api/merge").send({
      base: "base",
      branchA: "branch A",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Missing required fields");
  });

  it("rejects merge requests with non-string inputs", async () => {
    const response = await request(app).post("/api/merge").send({
      base: "base",
      branchA: 42,
      branchB: "branch B",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe(
      "base, branchA, and branchB must be strings."
    );
  });
});