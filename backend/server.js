
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

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Code Merge Simulator API is running",
  });
});
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

  return res.status(200).json({
    message: "Repository deleted successfully.",
  });
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
app.post("/api/merge", (req, res) => {
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

// Keep parser and merge failures in the same JSON contract as validation errors.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON request body." });
  }
  if (error.type === "entity.too.large" || error instanceof RangeError) {
    return res.status(413).json({ error: "Input is too large. Use smaller code snippets." });
  }
  return res.status(500).json({ error: "Unable to merge these inputs. Please try again." });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;

