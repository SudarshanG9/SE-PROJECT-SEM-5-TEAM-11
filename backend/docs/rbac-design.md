# RBAC Design — Code Merge Simulator

## Requirements

- **CSM-F-003**: Protected repository operations require authorization.
- **CSM-SR-003**: Users must be assigned roles; roles determine allowed actions.

## Roles (ascending privilege)

```
viewer → contributor → maintainer → owner
```

Each role inherits all permissions of every role below it.

## Permission Matrix

| Operation         | viewer | contributor | maintainer | owner |
|-------------------|:------:|:-----------:|:----------:|:-----:|
| Read / view code  | ✅     | ✅          | ✅         | ✅    |
| Simulate merge    | ❌     | ✅          | ✅         | ✅    |
| Commit / save     | ❌     | ✅          | ✅         | ✅    |
| Approve merge     | ❌     | ❌          | ✅         | ✅    |
| Delete branch     | ❌     | ❌          | ✅         | ✅    |
| Manage members    | ❌     | ❌          | ❌         | ✅    |

## Protected Routes

| Route              | Method | Minimum role  |
|--------------------|--------|---------------|
| POST /api/merge    | POST   | contributor   |
| POST /api/commit   | POST   | contributor   |
| POST /api/approve  | POST   | maintainer    |
| DELETE /api/branch | DELETE | maintainer    |
| GET /api/users     | GET    | owner         |

## Token Strategy (Sprint 2 scope)

Tokens are opaque strings stored in a server-side in-memory map
(`backend/rbac/users.js`). A production deployment would use JWTs
signed with a secret and verified via a shared key.

## Middleware Chain

```
HTTP Request
     │
     ▼
authenticate   →  401 if no/invalid token
     │
     ▼
authorize(op)  →  403 if role is insufficient
     │
     ▼
Route handler
```

## Files

| File                        | Purpose                                      |
|-----------------------------|----------------------------------------------|
| `backend/rbac/roles.js`     | Role hierarchy + permission map + `hasPermission` |
| `backend/rbac/users.js`     | In-memory token → user store                 |
| `backend/rbac/middleware.js`| `authenticate` and `authorize` middleware    |
| `backend/tests/rbac.test.js`| RBAC-specific test suite                     |

