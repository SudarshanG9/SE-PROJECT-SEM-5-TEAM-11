# Commit management — Issue #27

Implements the selected-file commit workflow from CSM-F-013 / TC-COM-01.
Existing commit history (CSM-F-014) remains available through Issue #32.

## Use

1. Open Repositories and view a repository.
2. Save any edits in the existing file editor.
3. Expand **Manage commits**. Refresh commit files if files were edited after opening.
4. Select a branch, choose 1–100 files, and enter a nonblank message.
5. Choose **Commit selected files**. A successful response shows the commit ID and
   the exact saved file contents. History refreshes and its snapshot details include
   the saved files.

Selection captures each selected file's currently saved name and content, not
unsaved browser edits or a cumulative repository tree. Working files are not
changed. Renaming, editing, or deleting a working file later does not rewrite an
existing commit. Commits remain available after source branch deletion. There
are no history-rewrite, commit-edit, commit-delete, or restore actions.

## API

The existing `POST /api/repositories/:id/commits` supports two modes:

- Legacy: `{ branchId, message, code }` retains the existing behavior.
- Selected files: `{ branchId, message, fileIds, expectedHeadCommitId? }` reads
  file names/contents from the server within the commit transaction. A caller
  cannot supply file contents, IDs, author identities, or timestamps to override
  server-managed snapshot metadata. `code` and `fileIds` cannot be combined.

Both modes return `{ commit, branch }` with status 201. Selected-file responses
add `commit.files`, containing `{ fileId, name, content }` entries. Signed-in
authors are resolved through the existing token lookup; legacy/anonymous commit
behavior and all existing RBAC rules are unchanged.

`GET /api/repositories/:id/commits/:commitId` returns `{ commit }`, including
`files` (empty for older/code-only commits). Existing list responses remain
unchanged. History detail responses also include `files` for snapshot viewing.

Invalid selections return 400. Missing/foreign repositories, branches, files,
or commit IDs return 404. A supplied stale `expectedHeadCommitId` returns 409.
The form always supplies this precondition, preventing commits against a branch
head that changed after it was loaded. Refresh after a stale-head error.
All file reads, commit/snapshot inserts, and branch-head advancement happen in
the existing SQLite transaction. Any storage failure rolls back the whole save.

## Compatibility

The migration only adds the `commit_files` table. It does not rewrite existing
commits, branches, files, user roles, or tokens. Selected-file commits keep the
parent's single-code snapshot intact: the branch merge simulator continues to
merge that code, not the selected files. Multi-file merging is outside Issue #27.
No automatic synchronization between file editing and branch code is introduced.
Repository deletion cascades to commits and their file snapshots.

## Validation

`backend/tests/commits.test.js` covers selected snapshots, empty contents,
immutability, author identity, stale-head protection, cross-repository isolation,
invalid selections, rollback, persistence through a separate SQLite connection,
and legacy code compatibility. Tests clean up only their own repository fixtures.
`frontend/src/CommitManager.test.jsx` covers lazy loading, validation, payloads,
double-submit protection, save errors, refresh, and safe snapshot rendering.

Run `npm test` in backend and frontend, and `npm run lint` / `npm run build` in
frontend. Existing file handling, repository operations, merge finalization,
history, authentication, and role tests must continue passing.
