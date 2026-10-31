const { randomUUID } = require("node:crypto");

const repositories = new Map();

function createRepository({ name, description = "" }) {
  const repository = {
    id: randomUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
  };

  repositories.set(repository.id, repository);

  return repository;
}

function getRepositories() {
  return Array.from(repositories.values());
}

function getRepositoryById(id) {
  return repositories.get(id) || null;
}

function updateRepository(id, updates) {
  const repository = repositories.get(id);

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

  repositories.set(id, updatedRepository);

  return updatedRepository;
}

function deleteRepository(id) {
  return repositories.delete(id);
}

function clearRepositories() {
  repositories.clear();
}

module.exports = {
  createRepository,
  getRepositories,
  getRepositoryById,
  updateRepository,
  deleteRepository,
  clearRepositories,
};