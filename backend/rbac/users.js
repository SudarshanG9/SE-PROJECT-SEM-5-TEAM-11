
/**
 * In-memory user store.
 *
 * Maps bearer tokens to user objects.
 * In production, replace this with a database lookup and JWT verification.
 *
 * Shape: { [token]: { id, name, role } }
 */
const USER_STORE = {
  'token-alice': { id: 'u1', name: 'Alice', role: 'owner'       },
  'token-bob':   { id: 'u2', name: 'Bob',   role: 'maintainer'  },
  'token-carol': { id: 'u3', name: 'Carol', role: 'contributor' },
  'token-dave':  { id: 'u4', name: 'Dave',  role: 'viewer'      },
};

/**
 * Looks up a user by their bearer token.
 *
 * @param {string} token - The raw token string (without "Bearer " prefix).
 * @returns {{ id: string, name: string, role: string } | null}
 */
function getUserByToken(token) {
  return USER_STORE[token] ?? null;
}

/**
 * Returns all registered users (without their tokens).
 * Used by the GET /api/users route.
 *
 * @returns {Array<{ id: string, name: string, role: string }>}
 */
function listUsers() {
  return Object.values(USER_STORE);
}

module.exports = { getUserByToken, listUsers };

