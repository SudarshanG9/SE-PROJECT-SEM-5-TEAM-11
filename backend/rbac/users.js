
const db = require("../database");

/**
 * Looks up a user by their bearer token from the SQLite database.
 *
 * Replaces the former in-memory USER_STORE lookup so that users and tokens
 * survive server restarts and can be managed dynamically at runtime.
 *
 * @param {string} token - The raw token string (without "Bearer " prefix).
 * @returns {{ id: string, name: string, role: string } | null}
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
 * Returns all registered users (without exposing tokens).
 * Used by the GET /api/users route.
 *
 * @returns {Array<{ id: string, name: string, role: string }>}
 */
function listUsers() {
  return db
    .prepare("SELECT id, name, role FROM users ORDER BY name ASC")
    .all();
}

/**
 * Creates a new user and optionally assigns a token in a single transaction.
 *
 * @param {{ id: string, name: string, role: string, token?: string }} user
 * @returns {{ id: string, name: string, role: string }}
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
 * Deletes a user by ID. Cascades automatically to all associated tokens.
 *
 * @param {string} id
 * @returns {boolean} true if a row was deleted, false if no user was found
 */
function deleteUser(id) {
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return result.changes > 0;
}

module.exports = { getUserByToken, listUsers, createUser, deleteUser };

