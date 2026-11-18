import { afterEach, beforeEach, describe, expect, it } from 'vitest';
const request = require('supertest');
const app = require('../server');
const db = require('../database');
const repositories = require('../repositories');
const branches = require('../branchStore');

describe('repository merge and commit history', () => {
  let repository, main, source, selection, approval;
  const owned = [];
  const history = (query = '') => request(app).get(`/api/repositories/${repository.id}/history${query}`);
  const preview = () => request(app).post(`/api/repositories/${repository.id}/merges/preview`)
    .set('Authorization', 'Bearer token-carol').send(selection);
  const confirm = () => request(app).post(`/api/repositories/${repository.id}/merges`)
    .set('Authorization', 'Bearer token-bob').send(approval);
  beforeEach(() => {
    repository = repositories.createRepository({ name: 'History test' });
    owned.push(repository.id);
    main = branches.initializeRepository(repository.id);
    source = branches.createBranch({ repositoryId: repository.id, name: 'feature' }).branch;
    source = branches.createCommit({ repositoryId: repository.id, branchId: source.id,
      message: 'Add feature', code: 'feature code' }).branch;
    selection = { sourceBranchId: source.id, targetBranchId: main.id };
    approval = { ...selection, confirmed: true, sourceHeadCommitId: source.headCommitId,
      targetHeadCommitId: main.headCommitId };
  });
  afterEach(() => {
    for (const id of owned.splice(0)) repositories.deleteRepository(id);
  });

  it('records preview identity and summary without moving either branch', async () => {
    await preview().expect(200);
    const { body } = await history('?type=simulation').expect(200);
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({ actorId: 'u3', actorName: 'Carol',
      sourceName: 'feature', targetName: 'main', status: 'success', conflictCount: 0 });
    expect(body.events[0]).not.toHaveProperty('code');
    expect(branches.getBranchById(repository.id, main.id).headCommitId).toBe(main.headCommitId);
    expect(branches.getBranchById(repository.id, source.id).headCommitId).toBe(source.headCommitId);
  });

  it('shows finalized merges once, including both parents and the approving user', async () => {
    const result = await confirm().expect(200);
    await confirm().expect(200);
    const { body } = await history('?type=merge').expect(200);
    expect(body.total).toBe(1);
    expect(body.events[0]).toMatchObject({ id: result.body.commit.id, actorName: 'Bob',
      parentCommitId: main.headCommitId, mergeParentCommitId: source.headCommitId });
    const detail = await request(app).get(`/api/repositories/${repository.id}/history/${result.body.commit.id}`);
    expect(detail.body.event.code).toBe('feature code');
    const branchHistory = await history(`?branchId=${main.id}`).expect(200);
    expect(branchHistory.body.events.map(({ id }) => id)).toContain(source.headCommitId);
  });

  it('records conflicting simulations but never a failed finalization', async () => {
    main = branches.createCommit({ repositoryId: repository.id, branchId: main.id,
      message: 'Conflicting edit', code: 'different' }).branch;
    approval.targetHeadCommitId = main.headCommitId;
    await preview().expect(200);
    await confirm().expect(409);
    const { body } = await history('?status=conflicts').expect(200);
    expect(body.events[0].conflictCount).toBeGreaterThan(0);
    expect((await history('?type=merge')).body.total).toBe(0);
  });

  it('captures signed-in commit authors without trusting submitted metadata', async () => {
    const response = await request(app).post(`/api/repositories/${repository.id}/commits`)
      .set('Authorization', 'Bearer token-carol')
      .send({ branchId: source.id, message: 'Authored change', code: 'next', authorId: 'u1' }).expect(201);
    const { body } = await history('?q=Authored').expect(200);
    expect(body.events[0]).toMatchObject({ id: response.body.commit.id, actorId: 'u3' });
  });

  it('filters and paginates deterministically without changing snapshots', async () => {
    await preview().expect(200);
    const all = (await history()).body;
    const page = (await history('?limit=1&offset=1')).body;
    expect(page.total).toBe(all.total);
    expect(page.events).toEqual(all.events.slice(1, 2));
    expect((await history('?q=feature&type=simulation')).body.total).toBe(1);
    expect((await history('?from=2099-01-01T00%3A00%3A00Z')).body.total).toBe(0);
    expect(branches.getCommits(repository.id)).toHaveLength(2);
  });

  it.each(['?limit=0', '?limit=101', '?offset=-1', '?type=bad', '?from=bad',
    '?q[x]=bad', '?branchId=a&branchId=b', '?from=2099-01-01T00:00:00Z&to=2000-01-01T00:00:00Z'])
    ('rejects invalid filters %s', async (query) => { await history(query).expect(400); });

  it('isolates event details and branches to their repository', async () => {
    const other = repositories.createRepository({ name: 'Other history' });
    owned.push(other.id);
    await request(app).get(`/api/repositories/${other.id}/history/${source.headCommitId}`).expect(404);
    await request(app).get(`/api/repositories/${other.id}/history?branchId=${main.id}`).expect(404);
    await request(app).get('/api/repositories/missing/history').expect(404);
  });

  it('retains history after source deletion and reads persisted records through a new connection', async () => {
    await preview().expect(200);
    await confirm().expect(200);
    branches.deleteBranch(repository.id, source.id);
    const connection = new (require('better-sqlite3'))(db.name, { readonly: true });
    try {
      expect(connection.prepare('SELECT COUNT(*) AS n FROM merge_simulations WHERE repositoryId = ?')
        .get(repository.id).n).toBe(1);
    } finally { connection.close(); }
    expect((await history('?type=merge')).body.total).toBe(1);
    expect((await history('?type=simulation')).body.events[0].sourceName).toBe('feature');
  });
});
