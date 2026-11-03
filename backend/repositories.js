const { randomUUID } = require("node:crypto");
const db = require("./database");

function createRepository({ name, description = "" }) {
  const repository = {
    id: randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO repositories (id, name, description, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(
    repository.id,
    repository.name,
    repository.description,
    repository.createdAt
  );

  return repository;
}

function getRepositories() {
  return db.prepare(`
    SELECT id, name, description, createdAt, updatedAt
    FROM repositories
  `).all().map(repository => {
    if (!repository.updatedAt) {
      delete repository.updatedAt;
    }
    return repository;
  });
}

function getRepositoryById(id) {
  const repository = db.prepare(`
    SELECT id, name, description, createdAt, updatedAt
    FROM repositories
    WHERE id = ?
  `).get(id);

  if (!repository) {
    return null;
  }

  if (!repository.updatedAt) {
    delete repository.updatedAt;
  }

  return repository;
}

function updateRepository(id, updates) {
  const repository = getRepositoryById(id);

  if (!repository) {
    return null;
  }

  const updatedRepository = {
    ...repository,
    ...(updates.name !== undefined && {
      name: updates.name.trim(),
    }),
    ...(updates.description !== undefined && {
      description: updates.description.trim(),
    }),
    updatedAt: new Date().toISOString(),
  };

  db.prepare(`
    UPDATE repositories
    SET name = ?, description = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    updatedRepository.name,
    updatedRepository.description,
    updatedRepository.updatedAt,
    id
  );

  return updatedRepository;
}

function deleteRepository(id) {
  const result = db.prepare(`
    DELETE FROM repositories WHERE id = ?
  `).run(id);

  return result.changes > 0;
}

function clearRepositories() {
  db.prepare("DELETE FROM repositories").run();
}

module.exports = {
  createRepository,
  getRepositories,
  getRepositoryById,
  updateRepository,
  deleteRepository,
  clearRepositories,
};