# Repository rules

- Use HTML, CSS, and vanilla JavaScript only; do not add a framework, backend, build step, or runtime dependency.
- Preserve the one-ball move rule, same-color destination rule, all 30 levels, progress saving, and smartphone pointer controls unless the issue explicitly changes one of them.
- Before completing every task, run `node --check` for every file in `js/` and run every `tests/*.test.js` suite.
- Run issue-specific analyzer and validation commands when the issue requires them.
- Do not complete a task while a required check is failing, and do not weaken tests to make a change pass.
- Keep one issue to one focused `codex/*` branch and one pull request.
- Read `STATE.md` and the linked automation-control issue before starting an autonomous task.
- Include `Closes #<issue>` in the pull request body and add the `codex` label when it exists.
- Do not modify `.github/`, `AGENTS.md`, `STATE.md`, dependency/package files, security/authentication, or repository settings unless the issue explicitly requires it; these changes always require manual review.
- Do not start dependent work until its prerequisite changes are present in the latest `main`.
- If push, PR creation, tests, dependencies, or scope are blocked, report the exact blocker and stop instead of claiming completion.
- Keep changes minimal and do not mix unrelated gameplay changes.
