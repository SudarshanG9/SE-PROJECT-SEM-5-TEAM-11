
const { randomUUID } = require("node:crypto");
const db = require("./database");

/**
 * Create a file inside a repository.
 *
 * @param {Object} data
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

  db.prepare(`
    INSERT INTO files (id, repositoryId, name, content, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    file.id,
    file.repositoryId,
    file.name,
    file.content,
    file.createdAt,
    file.updatedAt
  );

  return file;
}

/**
 * Get all files belonging to a repository.
 *
 * @param {string} repositoryId
 * @returns {Array<Object>}
 */
function getFiles(repositoryId) {
  return db.prepare(`
    SELECT id, repositoryId, name, content, createdAt, updatedAt
    FROM files
    WHERE repositoryId = ?
    ORDER BY name COLLATE NOCASE ASC
  `).all(repositoryId);
}

/**
 * Get one file by its ID, ensuring it belongs to the given repository.
 *
 * @param {string} repositoryId
 * @param {string} fileId
 * @returns {Object|null}
 */
function getFileById(repositoryId, fileId) {
  return db.prepare(`
    SELECT id, repositoryId, name, content, createdAt, updatedAt
    FROM files
    WHERE id = ? AND repositoryId = ?
  `).get(fileId, repositoryId) || null;
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

  db.prepare(`
    UPDATE files
    SET name = ?, content = ?, updatedAt = ?
    WHERE id = ? AND repositoryId = ?
  `).run(
    updatedFile.name,
    updatedFile.content,
    updatedFile.updatedAt,
    fileId,
    repositoryId
  );

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

  db.prepare(`
    DELETE FROM files
    WHERE id = ? AND repositoryId = ?
  `).run(fileId, repositoryId);

  return true;
}

/**
 * Clear stored files.
 *
 * @param {string|null} repositoryId
 */
function clearFiles(repositoryId = null) {
  if (repositoryId === null) {
    db.prepare("DELETE FROM files").run();
    return;
  }

  db.prepare(`
    DELETE FROM files WHERE repositoryId = ?
  `).run(repositoryId);
}

module.exports = {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  clearFiles,
};
