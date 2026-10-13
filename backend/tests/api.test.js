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
});