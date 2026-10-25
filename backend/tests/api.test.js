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

describe("POST /api/merge integration", () => {
  it("combines independent edits through the real merge engine", async () => {
    const response = await request(app).post("/api/merge").send({
      base: "a\nb", branchA: "A\nb", branchB: "a\nB",
    });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      mergedCode: "A\nB", hasConflict: false,
      message: "Merge completed successfully", conflicts: [],
    });
  });

  it("returns conflict details needed by the frontend", async () => {
    const response = await request(app).post("/api/merge").send({
      base: "original", branchA: "left", branchB: "right",
    });
    expect(response.status).toBe(200);
    expect(response.body.hasConflict).toBe(true);
    expect(response.body.mergedCode).toContain("<<<<<<< BRANCH A");
    expect(response.body.conflicts).toEqual([{
      id: 1, startLine: 1, endLine: 1,
      outputStartLine: 1, outputEndLine: 5, branchALines: ["left"], branchBLines: ["right"],
      base: "original", branchA: "left", branchB: "right",
    }]);
  });

  it.each([{}, { base: "x", branchA: "y" },
    { base: null, branchA: "y", branchB: "z" },
    { base: 1, branchA: "y", branchB: "z" },
    { base: "x", branchA: [], branchB: "z" },
    { base: "x", branchA: "y", branchB: {} },
  ])("rejects invalid request fields: %j", async (body) => {
    const response = await request(app).post("/api/merge").send(body);
    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it("rejects a missing request body", async () => {
    const response = await request(app).post("/api/merge");
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Missing required fields");
  });

  it("accepts empty strings as valid file content", async () => {
    const response = await request(app).post("/api/merge").send({
      base: "", branchA: "", branchB: "new file",
    });
    expect(response.status).toBe(200);
    expect(response.body.mergedCode).toBe("new file");
    expect(response.body.hasConflict).toBe(false);
  });
});


describe('structured request errors', () => {
  it('returns JSON for malformed JSON', async () => {
    const response = await request(app).post('/api/merge').set('Content-Type', 'application/json').send('{bad');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid JSON request body.');
  });
  it('returns JSON for oversized bodies', async () => {
    const response = await request(app).post('/api/merge').send({base: 'x'.repeat(110000), branchA: '', branchB: ''});
    expect(response.status).toBe(413);
    expect(response.body.error).toContain('too large');
  });
  it('rejects excessive comparison work', async () => {
    const base = Array.from({length: 1500}, (_, i) => `line ${i}`).join('\n');
    const response = await request(app).post('/api/merge').send({base, branchA: `${base}\nA`, branchB: `${base}\nB`});
    expect(response.status).toBe(413);
    expect(response.body.error).toContain('too large');
  });
});
