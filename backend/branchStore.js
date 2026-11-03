const { randomUUID } = require("node:crypto");
const db = require("./database");

// Convert SQLite integer values into JavaScript booleans.
function formatBranch(branch) {
  if (!branch) return null;

  return {
    ...branch,
    isDefault: Boolean(branch.isDefault),
    isProtected: Boolean(branch.isProtected),
  };
}

// Get all branches belonging to a repository.
function getRepositoryBranches(repositoryId) {
  const rows = db.prepare(`
    SELECT *
    FROM branches
    WHERE repositoryId = ?
    ORDER BY isDefault DESC, name COLLATE NOCASE ASC
  `).all(repositoryId);

  return rows.map(formatBranch);
}

// Get a branch by ID, ensuring it belongs to the repository.
function getBranch(repositoryId, branchId) {
  const branch = db.prepare(`
    SELECT *
    FROM branches
    WHERE id = ? AND repositoryId = ?
  `).get(branchId, repositoryId);

  return formatBranch(branch);
}

// Get a commit by ID, ensuring it belongs to the repository.
function getCommit(repositoryId, commitId) {
  return db.prepare(`
    SELECT *
    FROM commits
    WHERE id = ? AND repositoryId = ?
  `).get(commitId, repositoryId) || null;
}

// Every new repository starts with a protected main branch
// and an initial commit.
function initializeRepository(repositoryId) {
  const existing = getRepositoryBranches(repositoryId);

  if (existing.length > 0) {
    return existing[0];
  }

  const branchId = randomUUID();
  const commitId = randomUUID();
  const now = new Date().toISOString();

  const initialCommit = {
    id: commitId,
    repositoryId,
    branchId,
    message: "Initial commit",
    code: "",
    parentCommitId: null,
    createdAt: now,
  };

  const mainBranch = {
    id: branchId,
    repositoryId,
    name: "main",
    isDefault: true,
    isProtected: true,
    baseBranchId: null,
    baseCommitId: null,
    headCommitId: commitId,
    createdAt: now,
    updatedAt: now,
  };

  const initializeTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO commits (
        id, repositoryId, branchId, message,
        code, parentCommitId, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      initialCommit.id,
      initialCommit.repositoryId,
      initialCommit.branchId,
      initialCommit.message,
      initialCommit.code,
      initialCommit.parentCommitId,
      initialCommit.createdAt
    );

    db.prepare(`
      INSERT INTO branches (
        id, repositoryId, name, isDefault, isProtected,
        baseBranchId, baseCommitId, headCommitId,
        createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mainBranch.id,
      mainBranch.repositoryId,
      mainBranch.name,
      1,
      1,
      mainBranch.baseBranchId,
      mainBranch.baseCommitId,
      mainBranch.headCommitId,
      mainBranch.createdAt,
      mainBranch.updatedAt
    );
  });

  initializeTransaction();

  return mainBranch;
}

function getBranches(repositoryId) {
  return getRepositoryBranches(repositoryId);
}

function getBranchById(repositoryId, branchId) {
  return getBranch(repositoryId, branchId);
}

// Get commits, optionally following the parent history of a branch.
function getCommits(repositoryId, branchId = null) {
  let visibleCommitIds = null;

  if (branchId) {
    const branch = getBranch(repositoryId, branchId);

    if (!branch) {
      return [];
    }

    visibleCommitIds = new Set();
    let currentCommitId = branch.headCommitId;

    while (currentCommitId) {
      const commit = getCommit(repositoryId, currentCommitId);

      if (!commit || visibleCommitIds.has(currentCommitId)) {
        break;
      }

      visibleCommitIds.add(currentCommitId);
      currentCommitId = commit.parentCommitId;
    }
  }

  const allCommits = db.prepare(`
    SELECT *
    FROM commits
    WHERE repositoryId = ?
    ORDER BY createdAt DESC
  `).all(repositoryId);

  if (!visibleCommitIds) {
    return allCommits;
  }

  return allCommits.filter((commit) =>
    visibleCommitIds.has(commit.id)
  );
}

function createBranch({
  repositoryId,
  name,
  sourceBranchId = null,
  sourceCommitId = null,
}) {
  let sourceCommit = null;
  let sourceBranch = null;

  if (sourceCommitId) {
    sourceCommit = getCommit(repositoryId, sourceCommitId);

    if (!sourceCommit) {
      return {
        error: "The selected commit does not exist in this repository.",
      };
    }

    sourceBranch = getBranch(repositoryId, sourceCommit.branchId);
  } else {
    sourceBranch = sourceBranchId
      ? getBranch(repositoryId, sourceBranchId)
      : getRepositoryBranches(repositoryId).find(
          (branch) => branch.isDefault
        );

    if (!sourceBranch) {
      return { error: "The selected base branch does not exist." };
    }

    sourceCommit = getCommit(
      repositoryId,
      sourceBranch.headCommitId
    );

    if (!sourceCommit) {
      return {
        error: "The selected base branch has no valid commit.",
      };
    }
  }

  const now = new Date().toISOString();

  const branch = {
    id: randomUUID(),
    repositoryId,
    name: name.trim(),
    isDefault: false,
    isProtected: false,
    baseBranchId: sourceBranch ? sourceBranch.id : null,
    baseCommitId: sourceCommit.id,
    headCommitId: sourceCommit.id,
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(`
    INSERT INTO branches (
      id, repositoryId, name, isDefault, isProtected,
      baseBranchId, baseCommitId, headCommitId,
      createdAt, updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    branch.id,
    branch.repositoryId,
    branch.name,
    0,
    0,
    branch.baseBranchId,
    branch.baseCommitId,
    branch.headCommitId,
    branch.createdAt,
    branch.updatedAt
  );

  return { branch };
}

function renameBranch(repositoryId, branchId, newName) {
  const branch = getBranch(repositoryId, branchId);

  if (!branch) {
    return { error: "Branch not found.", status: 404 };
  }

  if (branch.isDefault || branch.isProtected) {
    return {
      error: "The default or protected branch cannot be renamed.",
      status: 403,
    };
  }

  const trimmedName = newName.trim();

  const duplicate = getRepositoryBranches(repositoryId).some(
    (item) =>
      item.id !== branchId &&
      item.name.toLowerCase() === trimmedName.toLowerCase()
  );

  if (duplicate) {
    return {
      error: "A branch with this name already exists.",
      status: 409,
    };
  }

  const updatedAt = new Date().toISOString();

  db.prepare(`
    UPDATE branches
    SET name = ?, updatedAt = ?
    WHERE id = ? AND repositoryId = ?
  `).run(trimmedName, updatedAt, branchId, repositoryId);

  return {
    branch: getBranch(repositoryId, branchId),
  };
}

function deleteBranch(repositoryId, branchId) {
  const branch = getBranch(repositoryId, branchId);

  if (!branch) {
    return { error: "Branch not found.", status: 404 };
  }

  if (branch.isDefault || branch.isProtected) {
    return {
      error: "The default or protected branch cannot be deleted.",
      status: 403,
    };
  }

  db.prepare(`
    DELETE FROM branches
    WHERE id = ? AND repositoryId = ?
  `).run(branchId, repositoryId);

  // Commits are retained because another branch may still reference them.
  return { success: true };
}

function createCommit({ repositoryId, branchId, message, code }) {
  const branch = getBranch(repositoryId, branchId);

  if (!branch) {
    return null;
  }

  const now = new Date().toISOString();

  const commit = {
    id: randomUUID(),
    repositoryId,
    branchId,
    message: message.trim(),
    code,
    parentCommitId: branch.headCommitId,
    createdAt: now,
  };

  const updatedBranch = {
    ...branch,
    headCommitId: commit.id,
    updatedAt: now,
  };

  const commitTransaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO commits (
        id, repositoryId, branchId, message,
        code, parentCommitId, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      commit.id,
      commit.repositoryId,
      commit.branchId,
      commit.message,
      commit.code,
      commit.parentCommitId,
      commit.createdAt
    );

    db.prepare(`
      UPDATE branches
      SET headCommitId = ?, updatedAt = ?
      WHERE id = ? AND repositoryId = ?
    `).run(
      commit.id,
      now,
      branchId,
      repositoryId
    );
  });

  commitTransaction();

  return {
    commit,
    branch: updatedBranch,
  };
}

// Delete all branches and commits belonging to a repository.
function deleteRepositoryBranches(repositoryId) {
  const deleteTransaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM branches
      WHERE repositoryId = ?
    `).run(repositoryId);

    db.prepare(`
      DELETE FROM commits
      WHERE repositoryId = ?
    `).run(repositoryId);
  });

  deleteTransaction();
}

// Clear all branch and commit data.
function clearBranchData() {
  const clearTransaction = db.transaction(() => {
    db.prepare("DELETE FROM branches").run();
    db.prepare("DELETE FROM commits").run();
  });

  clearTransaction();
}

module.exports = {
  initializeRepository,
  getBranches,
  getBranchById,
  getCommits,
  createBranch,
  renameBranch,
  deleteBranch,
  createCommit,
  deleteRepositoryBranches,
  clearBranchData,
};