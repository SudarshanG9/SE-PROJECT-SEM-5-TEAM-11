const { randomUUID } = require('node:crypto');
const db = require('./database');
const { getCommits } = require('./branchStore');

function recordSimulation(repositoryId, preview, actorId) {
  db.prepare(`INSERT INTO merge_simulations
    (id, repositoryId, sourceBranchId, targetBranchId, sourceName, targetName,
     sourceHeadCommitId, targetHeadCommitId, actorId, conflictCount, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), repositoryId, preview.source.id, preview.target.id,
      preview.source.name, preview.target.name, preview.source.headCommitId,
      preview.target.headCommitId, actorId, preview.conflicts.length, new Date().toISOString());
}

// Read-only history projection; original commits and merge parents remain intact.
function getHistory(repositoryId, filters = {}) {
  const commits = getCommits(repositoryId, filters.branchId || null);
  // Millisecond timestamps can tie. SQLite insertion order keeps children
  // ahead of their parents even when several commits share one timestamp.
  const commitOrder = new Map(db.prepare('SELECT id FROM commits WHERE repositoryId = ? ORDER BY rowid DESC')
    .all(repositoryId).map(({ id }, index) => [id, index]));
  const names = new Map(db.prepare('SELECT id, name FROM branches WHERE repositoryId = ?')
    .all(repositoryId).map(({ id, name }) => [id, name]));
  const users = new Map(db.prepare('SELECT id, name FROM users').all()
    .map(({ id, name }) => [id, name]));
  const events = commits.map(({ code, ...commit }) => ({
    ...commit,
    type: commit.mergeParentCommitId ? 'merge' : 'commit',
    status: 'success',
    actorId: commit.mergedBy || commit.authorId || null,
    branchName: names.get(commit.branchId) || 'Deleted branch',
    sourceName: names.get(commit.mergeSourceBranchId) || null,
  }));
  const simulations = db.prepare('SELECT * FROM merge_simulations WHERE repositoryId = ?')
    .all(repositoryId).filter((event) => !filters.branchId ||
      event.sourceBranchId === filters.branchId || event.targetBranchId === filters.branchId);
  events.push(...simulations.map((event) => ({
    ...event, type: 'simulation',
    status: event.conflictCount ? 'conflicts' : 'success',
    message: `Preview ${event.sourceName} into ${event.targetName}`,
    branchName: event.targetName,
  })));
  const query = (filters.q || '').toLowerCase();
  return events.map((event) => ({ ...event,
    actorName: users.get(event.actorId) || (event.actorId ? 'Deleted user' : 'Unknown / legacy'),
  })).filter((event) =>
    (!filters.type || event.type === filters.type) &&
    (!filters.status || event.status === filters.status) &&
    (!filters.from || event.createdAt >= filters.from) &&
    (!filters.to || event.createdAt <= filters.to) &&
    (!query || [event.id, event.message, event.actorName, event.branchName, event.sourceName]
      .some((value) => value?.toLowerCase().includes(query)))
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt) ||
    (a.type === 'simulation') - (b.type === 'simulation') ||
    (a.type !== 'simulation' && b.type !== 'simulation'
      ? commitOrder.get(a.id) - commitOrder.get(b.id) : b.id.localeCompare(a.id)));
}

function getHistoryDetail(repositoryId, id) {
  const event = getHistory(repositoryId).find((item) => item.id === id);
  if (!event) return null;
  if (event.type === 'simulation') return event;
  const { code } = db.prepare('SELECT code FROM commits WHERE repositoryId = ? AND id = ?')
    .get(repositoryId, id);
  return { ...event, code };
}

module.exports = { recordSimulation, getHistory, getHistoryDetail };
