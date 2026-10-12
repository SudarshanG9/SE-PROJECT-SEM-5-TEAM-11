
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";

describe("Health API", () => {
  it("returns OK when the backend is running", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.message).toBe(
      "Code Merge Simulator API is running"
    );
  });
});
