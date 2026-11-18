# Merge and commit history — Issue #32

Open **Repositories**, view a repository, then expand **Open merge and commit
history**. Search by message, ID, actor, or branch; filter by type and status;
use the page controls and Refresh history to load newly saved work. View snapshot
loads the saved code without restoring it or changing any branch.

## Records

- Commits come from the existing persistent snapshots. Both parents of finalized
  merges remain visible; history includes inherited commits when filtering a branch.
- Finalized merges are projected from merge commits, so repeated confirmation
  does not manufacture duplicate history entries.
- Successful repository merge previews are stored with source/target branch names
  and heads, actor, timestamp, and conflict count. A conflicting preview is a
  simulation, not a failed or finalized merge. Denied/invalid previews are not saved.
- The standalone three-snippet simulator has no repository identity and is not
  included. This feature is repository history, not administrator/security auditing.
- Signed-in commit requests resolve authors from server-side tokens. Older and
  anonymous snapshots display **Unknown / legacy**; no historical identity is invented.
- Existing access rules remain unchanged. History reads follow existing public
  repository reads; preview and finalization retain their original RBAC checks.

## API

`GET /api/repositories/:id/history` returns
`{ events, total, limit, offset }`, newest first. Equal commit timestamps use
insertion order, newest first, to retain parent/child ordering.

Optional query parameters:

| Parameter | Meaning |
| --- | --- |
| `q` | Case-insensitive literal search, maximum 200 characters |
| `type` | `commit`, `merge`, or `simulation` |
| `status` | `success` or `conflicts` |
| `branchId` | Commits reachable through either parent; previews involving that branch |
| `from`, `to` | Inclusive ISO timestamps, normalized to UTC |
| `limit` | 1–100, default 25 |
| `offset` | Nonnegative integer, default 0 |

`GET /api/repositories/:id/history/:eventId` returns `{ event }`. Commit and
merge details include their code snapshot; list responses omit source contents.
Unknown repository, branch, or event IDs return 404; invalid filters return 400.
No write or restore history endpoint is exposed.

## Persistence and compatibility

Startup adds a nullable commit author column and a separate `merge_simulations`
table without rewriting existing commits. Deleting a source branch preserves
its commits and saved preview names. Deleting the repository removes its history
through the repository foreign key. There is no new dependency or authentication
requirement on existing operations, and merge algorithms are unchanged.

Queries currently project the repository's history in memory before filtering
and pagination. This is suitable for the coursework dataset; large histories
would need database-side filtering and pagination. Actor display names are resolved
from current user records; deleted users display **Deleted user**. No backfill of
past previews is possible.

## Verification

Run `npm test` in backend and frontend, then `npm run lint` and `npm run build`
in frontend. History API tests exercise the actual CommonJS server and matching
stores, bypassing the legacy setup's replacement file handlers. Tests create and
delete only their own repository fixtures. Persistence is checked with a separate
read-only SQLite connection. Interface tests cover filtering, paging, retry,
snapshot escaping, conflicts/parents, and stale repository responses.
