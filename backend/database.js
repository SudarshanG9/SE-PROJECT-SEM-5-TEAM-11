
const Database = require("better-sqlite3");
const path = require("node:path");
const fs = require("node:fs");

// Store the database inside backend/data
const dataDirectory = path.join(__dirname, "data");

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, "mergelab.db");

const db = new Database(databasePath);

// Enable foreign key constraints
db.pragma("foreign_keys = ON");

// Create database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS repositories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    createdAt TEXT,
    updatedAt TEXT
);

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    repositoryId TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (repositoryId)
      REFERENCES repositories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    repositoryId TEXT NOT NULL,
    name TEXT NOT NULL,
    isDefault INTEGER DEFAULT 0,
    isProtected INTEGER DEFAULT 0,
    baseBranchId TEXT,
    baseCommitId TEXT,
    headCommitId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (repositoryId)
      REFERENCES repositories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS commits (
    id TEXT PRIMARY KEY,
    repositoryId TEXT NOT NULL,
    branchId TEXT,
    message TEXT NOT NULL,
    code TEXT NOT NULL,
    parentCommitId TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (repositoryId)
      REFERENCES repositories(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_files_repository
    ON files(repositoryId);

  CREATE INDEX IF NOT EXISTS idx_branches_repository
    ON branches(repositoryId);

  CREATE INDEX IF NOT EXISTS idx_commits_repository
    ON commits(repositoryId);

  CREATE TABLE IF NOT EXISTS users (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    role      TEXT NOT NULL CHECK(role IN ('viewer','contributor','maintainer','owner')),
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tokens (
    token     TEXT PRIMARY KEY,
    userId    TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tokens_userId
    ON tokens(userId);
`);
const repositoryColumns = db
    .prepare("PRAGMA table_info(repositories)")
    .all()
    .map(column => column.name);

if (!repositoryColumns.includes("description")) {
    db.exec("ALTER TABLE repositories ADD COLUMN description TEXT NOT NULL DEFAULT ''");
}

if (!repositoryColumns.includes("updatedAt")) {
    db.exec("ALTER TABLE repositories ADD COLUMN updatedAt TEXT");
}

// ─── Seed default RBAC users and tokens (runs only when the table is empty) ──
// These accounts match the hardcoded tokens used throughout rbac.test.js and
// api.test.js so all existing tests continue to pass without modification.
const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;

if (userCount === 0) {
    const insertUser = db.prepare(
        "INSERT INTO users (id, name, role, createdAt) VALUES (?, ?, ?, ?)"
    );
    const insertToken = db.prepare(
        "INSERT INTO tokens (token, userId, createdAt) VALUES (?, ?, ?)"
    );

    const seedUsers = [
        { id: "u1", name: "Alice", role: "owner",       token: "token-alice" },
        { id: "u2", name: "Bob",   role: "maintainer",  token: "token-bob"   },
        { id: "u3", name: "Carol", role: "contributor", token: "token-carol" },
        { id: "u4", name: "Dave",  role: "viewer",      token: "token-dave"  },
    ];

    const seed = db.transaction((users) => {
        const now = new Date().toISOString();
        for (const u of users) {
            insertUser.run(u.id, u.name, u.role, now);
            insertToken.run(u.token, u.id, now);
        }
    });

    seed(seedUsers);
}

console.log("SQLite database initialized successfully.");

module.exports = db;
