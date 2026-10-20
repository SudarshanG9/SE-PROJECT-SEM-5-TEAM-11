# Backend Test Report

## Latest local run

- **Run date:** 2026-10-20
- **Branch:** `test/api-tests-and-docs`
- **Command:** `npm test -- --reporter=verbose` (from `backend/`)
- **Result:** 10 passed, 0 failed across 3 test files.
- **Details:** All 7 merge tests and all 3 API/health tests passed.

## GitHub Actions CI run

- **Workflow:** `MergeLab CI`
- **Run context:** The reported run was triggered on `main` at commit `8209182`, not on the current branch.
- **Command:** `npm test` (from `backend/`, on Ubuntu)
- **Result:** 5 passed, 5 failed across 3 test files.
- **Passing tests:** Branch A-only change, identical changes on both branches, health endpoint, unknown-route response, and CORS.
- **Failing tests:** Unchanged branches return the wrong message; Branch B-only change is not applied; independent line changes are not combined; same-line conflicting changes are not reported; and non-string input does not throw a `TypeError`.
- **CI outcome:** Backend job failed; frontend tests and build passed.

## Conclusion

The latest local test run on `test/api-tests-and-docs` passed all 10 backend tests. The CI failure above is from a different commit on `main`, so it does not verify the current branch. A new CI result for the current branch is needed before reporting CI as passing.
