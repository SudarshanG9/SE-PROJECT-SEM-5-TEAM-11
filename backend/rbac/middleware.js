
const { getUserByToken } = require('./users');
const { hasPermission, PERMISSIONS } = require('./roles');

/**
 * authenticate
 *
 * Reads the Bearer token from the Authorization header, resolves the
 * matching user from the store, and attaches them to `req.user`.
 *
 * Returns 401 when the header is absent or the token is unrecognised.
 *
 * Expected request header:
 *   Authorization: Bearer <token>
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] ?? '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Provide an "Authorization: Bearer <token>" header.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const user  = getUserByToken(token);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired token.',
    });
  }

  req.user = user; // available to all downstream middleware and route handlers
  next();
}

/**
 * authorize(operation)
 *
 * Factory that returns a middleware which checks whether `req.user`
 * holds a role that satisfies the minimum role required for `operation`.
 *
 * Must always be placed AFTER `authenticate` in the middleware chain.
 *
 * Fails closed: if `operation` is not registered in PERMISSIONS,
 * access is denied (403) rather than granted.
 *
 * @param {string} operation - A key from PERMISSIONS (e.g. 'merge:create').
 * @returns {import('express').RequestHandler}
 */
function authorize(operation) {
  return function (req, res, next) {
    const requiredRole = PERMISSIONS[operation];

    if (!requiredRole) {
      // Unknown operation — deny by default (fail closed)
      return res.status(403).json({
        error: `Unknown operation: "${operation}". Access denied.`,
      });
    }

    if (!hasPermission(req.user.role, requiredRole)) {
      return res.status(403).json({
        error: `Forbidden. "${operation}" requires at least the "${requiredRole}" role. ` +
               `Your role: "${req.user.role}".`,
      });
    }

    next();
  };
}

module.exports = { authenticate, authorize };

