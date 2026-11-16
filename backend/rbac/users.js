
const db = require("../database");
const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;

/**
 * Hash a password using scrypt and a unique random salt.
 * Stored format: salt:hash
 */
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");

  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a password against its stored hash.
 */
async function verifyPassword(password, storedHash) {
  if (
    typeof password !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  const parts = storedHash.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, originalHash] = parts;

  if (
    !/^[a-f0-9]{32}$/i.test(salt) ||
    !/^[a-f0-9]{128}$/i.test(originalHash)
  ) {
    return false;
  }

  const derivedKey = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH
  );

  const originalBuffer = Buffer.from(originalHash, "hex");

  return crypto.timingSafeEqual(
    derivedKey,
    originalBuffer
  );
}

/**
 * Looks up a user by bearer token.
 */
function getUserByToken(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const row = db
    .prepare(
      `SELECT users.id, users.name, users.role
       FROM tokens
       JOIN users ON tokens.userId = users.id
       WHERE tokens.token = ?`
    )
    .get(token);

  return row ?? null;
}

/**
 * Returns users without exposing credentials.
 */
function listUsers() {
  return db
    .prepare(
      "SELECT id, name, role FROM users ORDER BY name ASC"
    )
    .all();
}

/**
 * Creates a registered user.
 */
function createRegisteredUser({ id, name, email, passwordHash }) {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (
      id,
      name,
      email,
      passwordHash,
      role,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name,
    email,
    passwordHash,
    "contributor",
    now
  );

  return {
    id,
    name,
    email,
    role: "contributor",
  };
}

/**
 * Preserves the existing user creation functionality
 * used by RBAC tests and other existing code.
 */
function createUser({ id, name, role, token }) {
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO users (id, name, role, createdAt) VALUES (?, ?, ?, ?)"
    ).run(id, name, role, now);

    if (token) {
      db.prepare(
        "INSERT INTO tokens (token, userId, createdAt) VALUES (?, ?, ?)"
      ).run(token, id, now);
    }
  });

  tx();

  return { id, name, role };
}

/**
 * Deletes a user and associated tokens.
 */
function deleteUser(id) {
  const result = db
    .prepare("DELETE FROM users WHERE id = ?")
    .run(id);

  return result.changes > 0;
}

module.exports = {
  getUserByToken,
  listUsers,
  createUser,
  deleteUser,
  hashPassword,
  verifyPassword,
  createRegisteredUser,
};
