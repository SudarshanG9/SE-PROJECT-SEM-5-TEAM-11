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

// Used to keep automated tests independent.
function clearRepositories() {
  repositories.clear();
}

module.exports = {
  createRepository,
  getRepositories,
  clearRepositories,
};