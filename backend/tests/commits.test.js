import { afterEach, beforeEach, expect, it } from 'vitest';
const request = require('supertest');
const app = require('../server');
const db = require('../database');
const repositories = require('../repositories');
const branches = require('../branchStore');
const files = require('../files');

let repository, branch, first, second, other;
const owned = [];
const save = (body) => request(app).post(`/api/repositories/${repository.id}/commits`)
  .set('Authorization', 'Bearer token-carol').send({ branchId: branch.id, message: 'Save selected files', ...body });
const detail = (id) => request(app).get(`/api/repositories/${repository.id}/commits/${id}`);

beforeEach(() => {
  repository = repositories.createRepository({ name: 'Commit tests' });
  owned.push(repository.id);
  branch = branches.initializeRepository(repository.id);
  first = files.createFile({ repositoryId: repository.id, name: 'one.js', content: 'original one' });
  second = files.createFile({ repositoryId: repository.id, name: 'two.js', content: '' });
  other = branches.createBranch({ repositoryId: repository.id, name: 'untouched' }).branch;
});
afterEach(() => {
  db.exec('DROP TRIGGER IF EXISTS reject_commit_file');
  for (const id of owned.splice(0)) repositories.deleteRepository(id);
});

it('saves only selected files with identity, parent and timestamp atomically', async () => {
  const response = await save({ fileIds: [first.id], expectedHeadCommitId: branch.headCommitId }).expect(201);
  expect(response.body.commit).toMatchObject({ authorId: 'u3', parentCommitId: branch.headCommitId,
    files: [{ fileId: first.id, name: first.name, content: first.content }] });
  expect(Date.parse(response.body.commit.createdAt)).not.toBeNaN();
  expect(branches.getBranchById(repository.id, branch.id).headCommitId).toBe(response.body.commit.id);
  expect(branches.getBranchById(repository.id, other.id)).toEqual(other);
  expect(files.getFileById(repository.id, first.id)).toEqual(first);
  const read = await detail(response.body.commit.id).expect(200);
  expect(read.body.commit.files).toEqual(response.body.commit.files);
});

it('preserves immutable snapshots after working files are renamed, edited and deleted', async () => {
  const { body } = await save({ fileIds: [first.id, second.id] }).expect(201);
  files.updateFile(repository.id, first.id, { name: 'renamed.js', content: 'new content' });
  files.deleteFile(repository.id, second.id);
  const read = await detail(body.commit.id).expect(200);
  expect(read.body.commit.files).toEqual([
    { fileId: first.id, name: 'one.js', content: 'original one' },
    { fileId: second.id, name: 'two.js', content: '' },
  ]);
  const history = await request(app).get(`/api/repositories/${repository.id}/history/${body.commit.id}`).expect(200);
  expect(history.body.event.files).toEqual(read.body.commit.files);
});

it('keeps existing code snapshots unchanged and readable through the legacy API', async () => {
  const legacy = await save({ code: 'mergeable code' }).expect(201);
  const selected = await save({ fileIds: [first.id] }).expect(201);
  expect(selected.body.commit.code).toBe('mergeable code');
  expect(selected.body.commit.parentCommitId).toBe(legacy.body.commit.id);
  expect((await detail(legacy.body.commit.id)).body.commit.files).toEqual([]);
  const list = await request(app).get(`/api/repositories/${repository.id}/commits`).expect(200);
  expect(list.body.commits.map(({ id }) => id)).toContain(selected.body.commit.id);
});

it.each([[], ['missing'], [null], [''], 'invalid', Array(101).fill('id')])
  ('rejects invalid file selections %j without changing a branch', async (fileIds) => {
    await save({ fileIds }).expect(fileIds.length === 1 && fileIds[0] === 'missing' ? 404 : 400);
    expect(branches.getBranchById(repository.id, branch.id).headCommitId).toBe(branch.headCommitId);
    expect(branches.getCommits(repository.id)).toHaveLength(1);
  });

it('rejects duplicate IDs, mixed modes and invalid parent preconditions', async () => {
  await save({ fileIds: [first.id, first.id] }).expect(400);
  await save({ fileIds: [first.id], code: 'ambiguous' }).expect(400);
  await save({ fileIds: [first.id], expectedHeadCommitId: [] }).expect(400);
  await save({ fileIds: [first.id], message: '   ' }).expect(400);
  expect(branches.getCommits(repository.id)).toHaveLength(1);
});

it('rejects a stale branch head without creating a partial commit', async () => {
  const advance = await save({ code: 'new' }).expect(201);
  await save({ fileIds: [first.id], expectedHeadCommitId: branch.headCommitId }).expect(409);
  expect(branches.getCommits(repository.id)).toHaveLength(2);
  expect(branches.getBranchById(repository.id, branch.id).headCommitId).toBe(advance.body.commit.id);
});

it('rejects foreign files, branches and commit detail lookups', async () => {
  const foreign = repositories.createRepository({ name: 'Other commit repository' });
  owned.push(foreign.id);
  const foreignBranch = branches.initializeRepository(foreign.id);
  const foreignFile = files.createFile({ repositoryId: foreign.id, name: 'secret.js', content: 'secret' });
  await save({ fileIds: [first.id, foreignFile.id] }).expect(404);
  await save({ branchId: foreignBranch.id, fileIds: [first.id] }).expect(404);
  await detail(foreignBranch.headCommitId).expect(404);
  await request(app).get('/api/repositories/missing/commits/missing').expect(404);
  expect(branches.getCommits(repository.id)).toHaveLength(1);
});

it('rolls back the entire commit and branch update on a snapshot storage failure', () => {
  db.exec(`CREATE TEMP TRIGGER reject_commit_file BEFORE INSERT ON commit_files
    BEGIN SELECT RAISE(ABORT, 'test snapshot failure'); END`);
  expect(() => branches.createCommit({ repositoryId: repository.id, branchId: branch.id,
    message: 'Fail safely', fileIds: [first.id] })).toThrow('test snapshot failure');
  expect(branches.getCommits(repository.id)).toHaveLength(1);
  expect(branches.getBranchById(repository.id, branch.id).headCommitId).toBe(branch.headCommitId);
});

it('retains file snapshots after source branch deletion and persists them to SQLite', async () => {
  const { body } = await save({ branchId: other.id, fileIds: [first.id] }).expect(201);
  branches.deleteBranch(repository.id, other.id);
  const connection = new (require('better-sqlite3'))(db.name, { readonly: true });
  try {
    expect(connection.prepare('SELECT content FROM commit_files WHERE commitId = ?')
      .get(body.commit.id).content).toBe(first.content);
  } finally { connection.close(); }
  expect((await detail(body.commit.id)).body.commit.files).toHaveLength(1);
});
