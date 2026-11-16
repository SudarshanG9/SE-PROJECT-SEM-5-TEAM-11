
import { describe, it, expect, afterEach } from "vitest";
const request = require("supertest");
const crypto = require("crypto");

const app = require("../server");
const db = require("../database");
const {
  verifyPassword,
  getUserByToken,
} = require("../rbac/users");

const registeredEmails = [];

function registrationData(overrides = {}) {
  return {
    name: "Test User",
    email: `test-${crypto.randomUUID()}@example.com`,
    password: "SecurePassword123",
    ...overrides,
  };
}

afterEach(() => {
  for (const email of registeredEmails) {
    db.prepare("DELETE FROM users WHERE email = ?").run(email);
  }

  registeredEmails.length = 0;
});

describe("User registration API", () => {
  it("registers a new user successfully", async () => {
    const data = registrationData();
    registeredEmails.push(data.email);

    const response = await request(app)
      .post("/api/auth/register")
      .send(data);

    expect(response.status).toBe(201);
    expect(response.body.user.name).toBe(data.name);
    expect(response.body.user.email).toBe(data.email);
    expect(response.body.user.role).toBe("contributor");
    expect(response.body.user.id).toBeTruthy();

    expect(response.body.user.password).toBeUndefined();
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it("rejects a missing name", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: "missingname@example.com",
        password: "SecurePassword123",
      });

    expect(response.status).toBe(400);
  });

  it("rejects a missing email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        password: "SecurePassword123",
      });

    expect(response.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "invalid-email",
        password: "SecurePassword123",
      });

    expect(response.status).toBe(400);
  });

  it("rejects a missing password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "missingpassword@example.com",
      });

    expect(response.status).toBe(400);
  });

  it("rejects passwords shorter than eight characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "shortpassword@example.com",
        password: "1234567",
      });

    expect(response.status).toBe(400);
  });

  it("rejects duplicate email addresses", async () => {
    const data = registrationData();
    registeredEmails.push(data.email);

    const first = await request(app)
      .post("/api/auth/register")
      .send(data);

    const second = await request(app)
      .post("/api/auth/register")
      .send({
        ...data,
        name: "Another User",
      });

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
  });

  it("normalizes email addresses to lowercase", async () => {
    const email = `Mixed-${crypto.randomUUID()}@Example.COM`;
    registeredEmails.push(email.toLowerCase());

    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email,
        password: "SecurePassword123",
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(email.toLowerCase());
  });

  it("stores a hashed password instead of plaintext", async () => {
    const data = registrationData();
    registeredEmails.push(data.email);

    const response = await request(app)
      .post("/api/auth/register")
      .send(data);

    expect(response.status).toBe(201);

    const storedUser = db.prepare(
      "SELECT passwordHash FROM users WHERE email = ?"
    ).get(data.email);

    expect(storedUser.passwordHash).not.toBe(data.password);
    expect(storedUser.passwordHash).toContain(":");

    expect(
      await verifyPassword(data.password, storedUser.passwordHash)
    ).toBe(true);

    expect(
      await verifyPassword("WrongPassword123", storedUser.passwordHash)
    ).toBe(false);
  });

  it("preserves existing seeded RBAC users and tokens", () => {
    const alice = getUserByToken("token-alice");

    expect(alice).toBeTruthy();
    expect(alice.name).toBe("Alice");
    expect(alice.role).toBe("owner");
  });
});
