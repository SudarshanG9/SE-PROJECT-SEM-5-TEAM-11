import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../server.js";
import { hasPermission } from "../rbac/roles.js";

const VALID_BODY = {
  base:    "const x = 1;",
  branchA: "const x = 2;",
  branchB: "const x = 3;",
};

// ─── authenticate middleware ──────────────────────────────────────────────────

describe("authenticate middleware", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const res = await request(app).post("/api/merge").send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it("returns 401 when the token is not recognised", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer not-a-real-token")
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it("returns 401 when the Authorization scheme is missing the 'Bearer ' prefix", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "token-alice") // missing "Bearer " prefix
      .send(VALID_BODY);
    expect(res.status).toBe(401);
  });
});

// ─── authorize middleware — POST /api/merge ───────────────────────────────────

describe("POST /api/merge — role-based authorization", () => {
  it("returns 403 when a viewer tries to merge", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer token-dave") // dave = viewer
      .send(VALID_BODY);
    expect(res.status).toBe(403);
  });

  it("allows a contributor to merge", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer token-carol") // carol = contributor
      .send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("mergedCode");
    expect(res.body).toHaveProperty("hasConflict");
  });

  it("allows a maintainer to merge", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer token-bob") // bob = maintainer
      .send(VALID_BODY);
    expect(res.status).toBe(200);
  });

  it("allows an owner to merge", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer token-alice") // alice = owner
      .send(VALID_BODY);
    expect(res.status).toBe(200);
  });

  it("still returns 400 for missing fields even when auth passes", async () => {
    const res = await request(app)
      .post("/api/merge")
      .set("Authorization", "Bearer token-carol")
      .send({ base: "x" }); // branchA and branchB missing
    expect(res.status).toBe(400);
  });
});

// ─── authorize middleware — GET /api/users ────────────────────────────────────

describe("GET /api/users — role-based authorization", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/users");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a contributor trying to list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer token-carol"); // carol = contributor
    expect(res.status).toBe(403);
  });

  it("returns 403 for a maintainer trying to list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer token-bob"); // bob = maintainer
    expect(res.status).toBe(403);
  });

  it("returns 200 with user list for an owner", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer token-alice"); // alice = owner
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThan(0);
  });

  it("does not expose tokens in the user list", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", "Bearer token-alice");
    const hasToken = res.body.users.some((u) => "token" in u);
    expect(hasToken).toBe(false);
  });
});

// ─── hasPermission unit tests ─────────────────────────────────────────────────

describe("hasPermission", () => {
  it("viewer does not have contributor-level access", () => {
    expect(hasPermission("viewer", "contributor")).toBe(false);
  });

  it("contributor satisfies contributor requirement", () => {
    expect(hasPermission("contributor", "contributor")).toBe(true);
  });

  it("contributor does not have maintainer-level access", () => {
    expect(hasPermission("contributor", "maintainer")).toBe(false);
  });

  it("maintainer satisfies contributor requirement", () => {
    expect(hasPermission("maintainer", "contributor")).toBe(true);
  });

  it("owner satisfies every role level", () => {
    for (const role of ["viewer", "contributor", "maintainer", "owner"]) {
      expect(hasPermission("owner", role)).toBe(true);
    }
  });

  it("returns false for an unknown user role", () => {
    expect(hasPermission("superadmin", "viewer")).toBe(false);
  });
});

