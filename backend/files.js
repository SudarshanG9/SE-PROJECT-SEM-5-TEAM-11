
const { randomUUID } = require("node:crypto");

// In-memory storage for repository files.
// Each file is stored using its unique file ID as the key.
const files = new Map();

/**
 * Create a file inside a repository.
 *
 * @param {Object} data
 * @param {string} data.repositoryId - Repository that owns the file.
 * @param {string} data.name - File name.
 * @param {string} [data.content=""] - File contents.
 * @returns {Object} The newly created file.
 */
function createFile({ repositoryId, name, content = "" }) {
  if (!repositoryId || typeof repositoryId !== "string") {
    throw new Error("A valid repository ID is required.");
  }

  if (typeof name !== "string" || !name.trim()) {
    throw new Error("A non-empty file name is required.");
  }

  if (typeof content !== "string") {
    throw new Error("File content must be a string.");
  }

  const now = new Date().toISOString();

  const file = {
    id: randomUUID(),
    repositoryId,
    name: name.trim(),
    content,
    createdAt: now,
    updatedAt: now,
  };

  files.set(file.id, file);

  return file;
}

/**
 * Get all files belonging to a repository.
 *
 * @param {string} repositoryId
 * @returns {Array<Object>}
 */
function getFiles(repositoryId) {
  return Array.from(files.values())
    .filter((file) => file.repositoryId === repositoryId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get one file by its ID, ensuring it belongs to the given repository.
 *
 * @param {string} repositoryId
 * @param {string} fileId
 * @returns {Object|null}
 */
function getFileById(repositoryId, fileId) {
  const file = files.get(fileId);

  if (!file || file.repositoryId !== repositoryId) {
    return null;
  }

  return file;
}

/**
 * Update a file's name and/or content.
 *
 * @param {string} repositoryId
 * @param {string} fileId
 * @param {Object} updates
 * @returns {Object|null}
 */
function updateFile(repositoryId, fileId, updates = {}) {
  const file = getFileById(repositoryId, fileId);

  if (!file) {
    return null;
  }

  if (
    updates.name !== undefined &&
    (typeof updates.name !== "string" || !updates.name.trim())
  ) {
    throw new Error("File name must be a non-empty string.");
  }

  if (
    updates.content !== undefined &&
    typeof updates.content !== "string"
  ) {
    throw new Error("File content must be a string.");
  }

  const updatedFile = {
    ...file,
    ...(updates.name !== undefined && {
      name: updates.name.trim(),
    }),
    ...(updates.content !== undefined && {
      content: updates.content,
    }),
    updatedAt: new Date().toISOString(),
  };

  files.set(fileId, updatedFile);

  return updatedFile;
}

/**
 * Delete a file, provided it belongs to the given repository.
 *
 * @param {string} repositoryId
 * @param {string} fileId
 * @returns {boolean}
 */
function deleteFile(repositoryId, fileId) {
  const file = getFileById(repositoryId, fileId);

  if (!file) {
    return false;
  }

  return files.delete(fileId);
}

/**
 * Clear stored files.
 *
 * When repositoryId is provided, only that repository's files
 * are cleared. Without it, the entire file store is cleared.
 *
 * @param {string|null} repositoryId
 */
function clearFiles(repositoryId = null) {
  if (repositoryId === null) {
    files.clear();
    return;
  }

  for (const [fileId, file] of files.entries()) {
    if (file.repositoryId === repositoryId) {
      files.delete(fileId);
    }
  }
}

module.exports = {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  clearFiles,
};
