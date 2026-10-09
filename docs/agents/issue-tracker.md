# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `jellotheman/gamified-todo`.
Use the `gh` CLI from this repository.

GitHub issues are repository-wide. Implementation tickets target `dev`. Git pushes require explicit user instruction; local merges are not an approval gate.

## Operations

- Publish to the issue tracker: create a GitHub issue.
- Fetch a ticket: `gh issue view <number> --comments`.
- Create: `gh issue create --title "..." --body-file <path>`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
- Comment: `gh issue comment <number> --body-file <path>`.
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- Close: `gh issue close <number>`.

Use a UTF-8 file for multiline bodies and comments. Preserve actual newlines.
Infer the repository from the Git remote.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub issues and PRs share a number space. Resolve an ambiguous number
with `gh pr view <number>`, falling back to `gh issue view <number>`.

## Wayfinding

A map is one issue labelled `wayfinder:map`. Child tickets use
`wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or
`wayfinder:task`.

Use GitHub sub-issues to link children. If unavailable, use a task list
in the map and `Part of #<map>` in each child.

Use native issue dependencies for blockers. If unavailable, record
`Blocked by: #<number>` in the child. A ticket is unblocked when all
blockers are closed.

Select unassigned, unblocked, open children in map order. Claim with
`gh issue edit <number> --add-assignee @me`. Resolve by posting the
result, closing the child, and updating the map with a result link.
