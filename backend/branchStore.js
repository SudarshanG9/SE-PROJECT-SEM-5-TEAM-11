const { randomUUID } = require("node:crypto");

const branches = new Map();
const commits = new Map();

function getRepositoryBranches(repositoryId) {
  return Array.from(branches.values())
    .filter((branch) => branch.repositoryId === repositoryId)
    .sort((a, b) => {
      if (a.isDefault !== b.isDefault) {
        return a.isDefault ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

function getBranch(repositoryId, branchId) {
  const branch = branches.get(branchId);

  if (!branch || branch.repositoryId !== repositoryId) {
    return null;
  }

  return branch;
}

function getCommit(repositoryId, commitId) {
  const commit = commits.get(commitId);

  if (!commit || commit.repositoryId !== repositoryId) {
    return null;
  }

  return commit;
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

  commits.set(commitId, initialCommit);
  branches.set(branchId, mainBranch);

  return mainBranch;
}

function getBranches(repositoryId) {
  return getRepositoryBranches(repositoryId);
}

function getBranchById(repositoryId, branchId) {
  return getBranch(repositoryId, branchId);
}

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

  return Array.from(commits.values())
    .filter((commit) => {
      return (
        commit.repositoryId === repositoryId &&
        (!visibleCommitIds || visibleCommitIds.has(commit.id))
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
      return { error: "The selected commit does not exist in this repository." };
    }

    sourceBranch = getBranch(repositoryId, sourceCommit.branchId);
  } else {
    sourceBranch = sourceBranchId
      ? getBranch(repositoryId, sourceBranchId)
      : getRepositoryBranches(repositoryId).find((branch) => branch.isDefault);

    if (!sourceBranch) {
      return { error: "The selected base branch does not exist." };
    }

    sourceCommit = getCommit(repositoryId, sourceBranch.headCommitId);

    if (!sourceCommit) {
      return { error: "The selected base branch has no valid commit." };
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

  branches.set(branch.id, branch);

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

  const duplicate = getRepositoryBranches(repositoryId).some(
    (item) =>
      item.id !== branchId &&
      item.name.toLowerCase() === newName.trim().toLowerCase()
  );

  if (duplicate) {
    return {
      error: "A branch with this name already exists.",
      status: 409,
    };
  }

  const updatedBranch = {
    ...branch,
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };

  branches.set(branchId, updatedBranch);

  return { branch: updatedBranch };
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

  branches.delete(branchId);

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

  commits.set(commit.id, commit);

  const updatedBranch = {
    ...branch,
    headCommitId: commit.id,
    updatedAt: now,
  };

  branches.set(branchId, updatedBranch);

  return {
    commit,
    branch: updatedBranch,
  };
}

function deleteRepositoryBranches(repositoryId) {
  for (const [id, branch] of branches.entries()) {
    if (branch.repositoryId === repositoryId) {
      branches.delete(id);
    }
  }

  for (const [id, commit] of commits.entries()) {
    if (commit.repositoryId === repositoryId) {
      commits.delete(id);
    }
  }
}

function clearBranchData() {
  branches.clear();
  commits.clear();
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