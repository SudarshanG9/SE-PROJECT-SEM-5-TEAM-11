
// Role hierarchy — index = privilege level (higher index = more access)
const ROLES = ['viewer', 'contributor', 'maintainer', 'owner'];

// Map each protected operation to the minimum role required to perform it
const PERMISSIONS = {
  'merge:create':   'contributor',
  'commit:create':  'contributor',
  'merge:approve':  'maintainer',
  'branch:delete':  'maintainer',
  'members:manage': 'owner',
};

/**
 * Returns true when `userRole` meets or exceeds `requiredRole`
 * in the ROLES hierarchy.
 *
 * @param {string} userRole     - The role assigned to the requesting user.
 * @param {string} requiredRole - The minimum role needed for the operation.
 * @returns {boolean}
 */
function hasPermission(userRole, requiredRole) {
  const userIndex     = ROLES.indexOf(userRole);
  const requiredIndex = ROLES.indexOf(requiredRole);

  // Unknown role names are treated as having no privileges
  if (userIndex === -1 || requiredIndex === -1) return false;

  return userIndex >= requiredIndex;
}

module.exports = { ROLES, PERMISSIONS, hasPermission };

