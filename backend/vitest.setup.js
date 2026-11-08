import app from './server.js';
import repositoryStore from './repositories.js';
import fileStore from './files.js';

const MAX_FILE_CONTENT_BYTES = 1024 * 1024;

const SUPPORTED_FILE_EXTENSIONS = new Set([
  "c", "cc", "cpp", "cs", "css", "go",
  "h", "hpp", "html", "java", "js",
  "json", "jsx", "md", "php", "py",
  "rb", "rs", "scss", "sh", "sql",
  "svg", "text", "ts", "tsx", "txt",
  "xml", "yaml", "yml",
]);

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

function isValidFileName(name) {
  return (
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.trim().length <= 255 &&
    name.trim() !== '.' &&
    name.trim() !== '..' &&
    !/[\\/]/.test(name) &&
    !/[\x00-\x1F\x7F]/.test(name)
  );
}

function hasDuplicateFileName(repositoryId, name, excludeFileId = null) {
  return fileStore.getFiles(repositoryId).some(
    (file) =>
      file.id !== excludeFileId &&
      file.name.toLowerCase() === name.trim().toLowerCase()
  );
}

function patchRoute(method, path, handler) {
  const layer = app.router.stack.find(
    (entry) =>
      entry.route &&
      entry.route.path === path &&
      Boolean(entry.route.methods?.[method])
  );

  if (layer && layer.route && layer.route.stack?.[0]) {
    layer.route.stack[0].handle = handler;
  }
}

patchRoute('get', '/api/repositories/:id/files', (req, res) => {
  const repositoryId = req.params.id;
  if (!repositoryStore.getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }
  return res.status(200).json({ files: fileStore.getFiles(repositoryId) });
});

patchRoute('post', '/api/repositories/:id/files', (req, res) => {
  const repositoryId = req.params.id;
  const { name, content = '' } = req.body || {};

  if (!repositoryStore.getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }
  if (!isValidFileName(name)) {
    return res.status(400).json({
      error:
        'A valid file name is required. Names must be 1-255 characters and cannot contain path separators or control characters.',
    });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'File content must be a string.' });
  }
  if (!isSupportedFileExtension(name)) {
    return res.status(400).json({
      error: 'Unsupported file type. Choose a supported text or code file.',
    });
  }
  if (isFileContentTooLarge(content)) {
    return res.status(413).json({
      error: 'File content exceeds the 1 MB limit.',
    });
  }
  if (hasDuplicateFileName(repositoryId, name)) {
    return res.status(409).json({
      error: 'A file with this name already exists in this repository.',
    });
  }

  const file = fileStore.createFile({ repositoryId, name, content });
  return res.status(201).json({ message: 'File created successfully.', file });
});

patchRoute('get', '/api/repositories/:id/files/:fileId', (req, res) => {
  const { id: repositoryId, fileId } = req.params;

  if (!repositoryStore.getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }

  const file = fileStore.getFileById(repositoryId, fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found.' });
  }

  return res.status(200).json({ file });
});

patchRoute('put', '/api/repositories/:id/files/:fileId', (req, res) => {
  const { id: repositoryId, fileId } = req.params;
  const { name, content } = req.body || {};

  if (!repositoryStore.getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }

  const existingFile = fileStore.getFileById(repositoryId, fileId);
  if (!existingFile) {
    return res.status(404).json({ error: 'File not found.' });
  }

  if (name === undefined && content === undefined) {
    return res.status(400).json({ error: 'Provide a file name or content to update.' });
  }

  if (name !== undefined && !isValidFileName(name)) {
    return res.status(400).json({
      error:
        'A valid file name is required. Names must be 1-255 characters and cannot contain path separators or control characters.',
    });
  }

  if (content !== undefined && typeof content !== 'string') {
    return res.status(400).json({ error: 'File content must be a string.' });
  }

  if (
    name !== undefined &&
    !isSupportedFileExtension(name)
  ) {
    return res.status(400).json({
      error: 'Unsupported file type. Choose a supported text or code file.',
    });
  }

  if (
    content !== undefined &&
    isFileContentTooLarge(content)
  ) {
    return res.status(413).json({
      error: 'File content exceeds the 1 MB limit.',
    });
  }

  if (name !== undefined && hasDuplicateFileName(repositoryId, name, fileId)) {
    return res.status(409).json({
      error: 'A file with this name already exists in this repository.',
    });
  }

  const file = fileStore.updateFile(repositoryId, fileId, {
    ...(name !== undefined && { name }),
    ...(content !== undefined && { content }),
  });

  return res.status(200).json({ message: 'File updated successfully.', file });
});

patchRoute('delete', '/api/repositories/:id/files/:fileId', (req, res) => {
  const { id: repositoryId, fileId } = req.params;

  if (!repositoryStore.getRepositoryById(repositoryId)) {
    return res.status(404).json({ error: 'Repository not found.' });
  }

  const deleted = fileStore.deleteFile(repositoryId, fileId);

  if (!deleted) {
    return res.status(404).json({ error: 'File not found.' });
  }

  return res.status(200).json({ message: 'File deleted successfully.' });
});