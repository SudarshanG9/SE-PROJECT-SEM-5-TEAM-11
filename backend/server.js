
const express = require("express");
const cors = require("cors");
const { mergeCode } = require("./merge");
const {
  createRepository,
  getRepositories,
  getRepositoryById,
  updateRepository,
  deleteRepository,
} = require("./repositories");
const {
  createFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  clearFiles,
} = require("./files");
const { authenticate, authorize } = require("./rbac/middleware");
const { listUsers } = require("./rbac/users");

const MAX_FILE_CONTENT_BYTES = 1024 * 1024;

const SUPPORTED_FILE_EXTENSIONS = new Set([
  "c", "cc", "cpp", "cs", "css", "go",
  "h", "hpp", "html", "java", "js",
  "json", "jsx", "md", "php", "py",
  "rb", "rs", "scss", "sh", "sql",
  "svg", "text", "ts", "tsx", "txt",
  "xml", "yaml", "yml",
]);

const app = express();
const {
  initializeRepository,
  getBranches,
  getBranchById,
  getCommits,
  createBranch,
  renameBranch,
  deleteBranch,
  createCommit,
  deleteRepositoryBranches,
} = require("./branchStore");

app.use(cors());

// Allow file API requests to contain up to 1 MB of
// file content plus reasonable JSON encoding overhead.
app.use(
  "/api/repositories/:id/files",
  express.json({ limit: "2mb" })
);

// Preserve the existing request limit for other APIs.
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Code Merge Simulator API is running",
  });
});

// Create a new repository
app.post("/api/repositories", (req, res) => {
  const { name, description = "" } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      error: "Repository name is required.",
    });
  }

  if (typeof description !== "string") {
    return res.status(400).json({
      error: "Repository description must be a string.",
    });
  }

  const repository = createRepository({
    name,
    description,
  });
  initializeRepository(repository.id);

  return res.status(201).json({
    message: "Repository created successfully.",
    repository,
  });
});

// Get all repositories
app.get("/api/repositories", (req, res) => {
  return res.status(200).json({
    repositories: getRepositories(),
  });
});
// Get a repository by ID
app.get("/api/repositories/:id", (req, res) => {
  const repository = getRepositoryById(req.params.id);

  if (!repository) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  return res.status(200).json({ repository });
});

// Update repository details
app.put("/api/repositories/:id", (req, res) => {
  const { name, description } = req.body || {};

  if (name === undefined && description === undefined) {
    return res.status(400).json({
      error: "Provide a name or description to update.",
    });
  }

  if (
    name !== undefined &&
    (typeof name !== "string" || !name.trim())
  ) {
    return res.status(400).json({
      error: "Repository name must be a non-empty string.",
    });
  }

  if (
    description !== undefined &&
    typeof description !== "string"
  ) {
    return res.status(400).json({
      error: "Repository description must be a string.",
    });
  }

  const repository = updateRepository(req.params.id, {
    ...(name !== undefined && { name }),
    ...(description !== undefined && { description }),
  });

  if (!repository) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  return res.status(200).json({
    message: "Repository updated successfully.",
    repository,
  });
});

// Delete a repository
app.delete("/api/repositories/:id", (req, res) => {
  const deleted = deleteRepository(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  deleteRepositoryBranches(req.params.id);
  clearFiles(req.params.id);
  return res.status(200).json({
    message: "Repository deleted successfully.",
  });
});

/* =========================================
   FILE MANAGEMENT API
   ========================================= */

// Validate the content type and structure of file API requests.
function validateFileJsonRequest(req, res, next) {
  if (!req.is("application/json")) {
    return res.status(415).json({
      error: "File API requests must use application/json.",
    });
  }

  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      error: "File API request body must be a JSON object.",
    });
  }

  next();
}

// Validate file names before creating or updating files.


function isValidFileName(name) {
  return (
    typeof name === "string" &&
    name.trim().length > 0 &&
    name.trim().length <= 255 &&
    name.trim() !== "." &&
    name.trim() !== ".." &&
    !/[\\/]/.test(name) &&
    !/[\x00-\x1F\x7F]/.test(name)
  );
}

function isSupportedFileExtension(name) {
  if (typeof name !== "string") {
    return false;
  }

  const trimmedName = name.trim();
  const lastDot = trimmedName.lastIndexOf(".");

  if (lastDot === -1) {
    return false;
  }

  const extension = trimmedName
    .slice(lastDot + 1)
    .toLowerCase();

  return SUPPORTED_FILE_EXTENSIONS.has(extension);
}

function isFileContentTooLarge(content) {
  return (
    Buffer.byteLength(content, "utf8") >
    MAX_FILE_CONTENT_BYTES
  );
}



// Check whether another file already uses this name.
function hasDuplicateFileName(repositoryId, name, excludeFileId = null) {
  return getFiles(repositoryId).some(
    (file) =>
      file.id !== excludeFileId &&
      file.name.toLowerCase() === name.trim().toLowerCase()
  );
}

// GET /api/repositories/:id/files
// Retrieve all files belonging to a repository.
app.get("/api/repositories/:id/files", (req, res) => {
  const repositoryId = req.params.id;

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  return res.status(200).json({
    files: getFiles(repositoryId),
  });
});

// POST /api/repositories/:id/files
// Create a new file inside a repository.
app.post(
  "/api/repositories/:id/files",
  validateFileJsonRequest,
  (req, res) => {
  const repositoryId = req.params.id;
  const { name, content = "" } = req.body || {};

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  if (!isValidFileName(name)) {
    return res.status(400).json({
      error: "A valid file name is required. Names must be 1-255 characters and cannot contain path separators or control characters.",
    });
  }

  if (typeof content !== "string") {
    return res.status(400).json({
      error: "File content must be a string.",
    });
  }

  if (!isSupportedFileExtension(name)) {
    return res.status(400).json({
      error: "Unsupported file type. Choose a supported text or code file.",
    });
  }

  if (isFileContentTooLarge(content)) {
    return res.status(413).json({
      error: "File content exceeds the 1 MB limit.",
    });
  }

  if (hasDuplicateFileName(repositoryId, name)) {
    return res.status(409).json({
      error: "A file with this name already exists in this repository.",
    });
  }

  const file = createFile({
    repositoryId,
    name,
    content,
  });

  return res.status(201).json({
    message: "File created successfully.",
    file,
  });
});

// GET /api/repositories/:id/files/:fileId
// Retrieve one file.
app.get("/api/repositories/:id/files/:fileId", (req, res) => {
  const { id: repositoryId, fileId } = req.params;

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  const file = getFileById(repositoryId, fileId);

  if (!file) {
    return res.status(404).json({
      error: "File not found.",
    });
  }

  return res.status(200).json({ file });
});

// PUT /api/repositories/:id/files/:fileId
// Update a file's name or content.
app.put(
  "/api/repositories/:id/files/:fileId",
  validateFileJsonRequest,
  (req, res) => {
  const { id: repositoryId, fileId } = req.params;
  const { name, content } = req.body || {};

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  const existingFile = getFileById(repositoryId, fileId);

  if (!existingFile) {
    return res.status(404).json({
      error: "File not found.",
    });
  }

  if (name === undefined && content === undefined) {
    return res.status(400).json({
      error: "Provide a file name or content to update.",
    });
  }

  if (name !== undefined && !isValidFileName(name)) {
    return res.status(400).json({
      error: "A valid file name is required. Names must be 1-255 characters and cannot contain path separators or control characters.",
    });
  }

  if (content !== undefined && typeof content !== "string") {
    return res.status(400).json({
      error: "File content must be a string.",
    });
  }

  if (
    name !== undefined &&
    !isSupportedFileExtension(name)
  ) {
    return res.status(400).json({
      error: "Unsupported file type. Choose a supported text or code file.",
    });
  }

  if (
    content !== undefined &&
    isFileContentTooLarge(content)
  ) {
    return res.status(413).json({
      error: "File content exceeds the 1 MB limit.",
    });
  }

  if (
    name !== undefined &&
    hasDuplicateFileName(repositoryId, name, fileId)
  ) {
    return res.status(409).json({
      error: "A file with this name already exists in this repository.",
    });
  }

  const file = updateFile(repositoryId, fileId, {
    ...(name !== undefined && { name }),
    ...(content !== undefined && { content }),
  });

  return res.status(200).json({
    message: "File updated successfully.",
    file,
  });
});

// DELETE /api/repositories/:id/files/:fileId
// Delete a file from a repository.
app.delete("/api/repositories/:id/files/:fileId", (req, res) => {
  const { id: repositoryId, fileId } = req.params;

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({
      error: "Repository not found.",
    });
  }

  const deleted = deleteFile(repositoryId, fileId);

  if (!deleted) {
    return res.status(404).json({
      error: "File not found.",
    });
  }

  return res.status(200).json({
    message: "File deleted successfully.",
  });
});

// List branches for a repository
app.get("/api/repositories/:id/branches", (req, res) => {
  if (!getRepositoryById(req.params.id)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  return res.status(200).json({
    branches: getBranches(req.params.id),
  });
});

// Create a branch from another branch or commit
app.post("/api/repositories/:id/branches", (req, res) => {
  const repositoryId = req.params.id;
  const { name, sourceBranchId, sourceCommitId } = req.body || {};

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Branch name is required." });
  }

  const duplicate = getBranches(repositoryId).some(
    (branch) => branch.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (duplicate) {
    return res.status(409).json({
      error: "A branch with this name already exists.",
    });
  }

  const result = createBranch({
    repositoryId,
    name,
    sourceBranchId,
    sourceCommitId,
  });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json({ branch: result.branch });
});

// Rename a branch
app.put("/api/repositories/:id/branches/:branchId", (req, res) => {
  const repositoryId = req.params.id;
  const { name } = req.body || {};

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Branch name is required." });
  }

  const result = renameBranch(repositoryId, req.params.branchId, name);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({ branch: result.branch });
});

// Delete a branch
app.delete("/api/repositories/:id/branches/:branchId", (req, res) => {
  const repositoryId = req.params.id;

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  const result = deleteBranch(repositoryId, req.params.branchId);
  if (result.error) {
    return res.status(result.status).json({ error: result.error });
  }

  return res.status(200).json({ message: "Branch deleted successfully." });
});

// List all commits, or the history visible from a specific branch
app.get("/api/repositories/:id/commits", (req, res) => {
  const repositoryId = req.params.id;

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  if (req.query.branchId && !getBranchById(repositoryId, req.query.branchId)) {
    return res.status(404).json({ error: "Branch not found." });
  }

  return res.status(200).json({
    commits: getCommits(repositoryId, req.query.branchId || null),
  });
});

// Create a commit on a branch
app.post("/api/repositories/:id/commits", (req, res) => {
  const repositoryId = req.params.id;
  const { branchId, message, code } = req.body || {};

  if (!getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: "Repository not found." });
  }

  if (
    typeof branchId !== "string" ||
    typeof message !== "string" ||
    !message.trim() ||
    typeof code !== "string"
  ) {
    return res.status(400).json({
      error: "A branch ID, non-empty message, and code string are required.",
    });
  }

  const result = createCommit({
    repositoryId,
    branchId,
    message,
    code,
  });

  if (!result) {
    return res.status(404).json({ error: "Branch not found." });
  }

  return res.status(201).json(result);
});

/**
 * POST /api/merge
 *
 * Accepts three code strings (base, branchA, branchB) and returns a
 * three-way merge result, including any conflicting regions.
 *
 * Request body:
 *   { base: string, branchA: string, branchB: string }
 *
 * Response:
 *   { mergedCode: string, hasConflict: boolean, message: string, conflicts: array }
 */
app.post("/api/merge", authenticate, authorize("merge:create"), (req, res) => {
  const { base, branchA, branchB } = req.body || {};

  // Validate that all three inputs are present
  if (base === undefined || branchA === undefined || branchB === undefined) {
    return res.status(400).json({
      error: "Missing required fields: base, branchA, and branchB are all required.",
    });
  }

  if ([base, branchA, branchB].some((input) => typeof input !== "string")) {
    return res.status(400).json({
      error: "base, branchA, and branchB must be strings.",
    });
  }

  const result = mergeCode(base, branchA, branchB);
  const hasConflict = result.conflicts && result.conflicts.length > 0;

  return res.status(200).json({
    mergedCode: result.mergedCode,
    hasConflict,
    message: result.message,
    conflicts: result.conflicts,
  });
});

// Return safe, structured errors without exposing server internals.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const isFileApiPath =
    /^\/api\/repositories\/[^/]+\/files(?:\/[^/]+)?\/?$/.test(
      req.path
    );

  // Malformed JSON
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Invalid JSON request body.",
    });
  }

  // Unsupported request encoding for file operations
  if (
    isFileApiPath &&
    (
      error.type === "charset.unsupported" ||
      error.type === "encoding.unsupported"
    )
  ) {
    return res.status(415).json({
      error: "Unsupported request encoding for file API.",
    });
  }

  // Oversized JSON bodies or excessive merge processing
  if (
    error.type === "entity.too.large" ||
    error instanceof RangeError
  ) {
    return res.status(413).json({
      error: isFileApiPath
        ? "File API request body is too large."
        : "Input is too large. Use smaller code snippets.",
    });
  }

  // Unexpected failures during file API operations
  if (isFileApiPath) {
    return res.status(500).json({
      error: "Unable to process this file request. Please try again.",
    });
  }

  // Preserve the existing fallback for other endpoints
  return res.status(500).json({
    error: "Unable to merge these inputs. Please try again.",
  });
});

/**
 * GET /api/users
 *
 * Returns the list of all registered users and their roles.
 * Requires: authenticated user with the 'owner' role.
 *
 * Response:
 *   { users: Array<{ id, name, role }> }
 */
app.get("/api/users", authenticate, authorize("members:manage"), (req, res) => {
  res.json({ users: listUsers() });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;
