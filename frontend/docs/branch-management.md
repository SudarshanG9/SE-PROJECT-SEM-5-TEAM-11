# Branch Management

## Overview

The branch management module allows users to manage development branches
inside a MergeLab repository.

It supports:

- Listing repository branches.
- Creating a branch from an existing branch.
- Creating a branch from a selected commit.
- Renaming regular branches.
- Deleting regular branches.
- Creating code snapshot commits.
- Viewing commit history, including inherited commits.

## Branch model

Each branch contains:

- `id`: Unique branch identifier.
- `repositoryId`: Repository to which the branch belongs.
- `name`: Branch name.
- `isDefault`: Whether it is the repository's default branch.
- `isProtected`: Whether branch modifications are restricted.
- `baseBranchId`: Branch from which it was created.
- `baseCommitId`: Commit used as its starting point.
- `headCommitId`: Latest commit on the branch.
- `createdAt`: Creation timestamp.
- `updatedAt`: Last update timestamp.

## Commit model

Each commit contains:

- `id`: Unique commit identifier.
- `repositoryId`: Associated repository.
- `branchId`: Branch on which the commit was created.
- `message`: Commit message.
- `code`: Saved code snapshot.
- `parentCommitId`: Previous commit in the commit sequence.
- `createdAt`: Creation timestamp.

## Default branch protection

Every repository starts with a protected `main` branch and an initial commit.

The default or protected branch cannot be renamed or deleted through the
branch management API.

Regular branches can be renamed and deleted.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/repositories/:repositoryId/branches` | List branches |
| POST | `/api/repositories/:repositoryId/branches` | Create a branch |
| PUT | `/api/repositories/:repositoryId/branches/:branchId` | Rename a branch |
| DELETE | `/api/repositories/:repositoryId/branches/:branchId` | Delete a branch |
| GET | `/api/repositories/:repositoryId/commits` | List commits |
| POST | `/api/repositories/:repositoryId/commits` | Create a commit |

## Create a branch from another branch

Request:

```json
{
  "name": "feature/login",
  "sourceBranchId": "existing-branch-id"
}