---
name: lingualens-release
description: Use only in the LinguaLens repository when preparing, squash-merging, tagging, documenting, or verifying a Chrome extension release such as v0.1.0.
---

# LinguaLens Release

Use this skill only from the LinguaLens repository root. Confirm the repository by checking that
`package.json`, `manifest.config.ts`, `.github/workflows/release.yml`, and `AGENTS.md` are present,
and that `package.json` has `"name": "lingualens"`.

Throughout the workflow:

- `<version>` means plain semver, for example `0.1.0`.
- `<tag>` means the Git tag, for example `v0.1.0`.
- `<branch>` means the release branch, for example `release/v0.1.0`.

## Release Model

- Source changes land through a PR into `main`.
- Release PRs must be squash-merged into `main`; do not use a merge commit or rebase merge.
- GitHub Release is created by `.github/workflows/release.yml` only when a pushed tag matches `v*`.
- Every GitHub Release must include manually prepared release notes; the workflow creates the
  release and zip asset but does not populate the notes.
- Package and Chrome manifest versions use plain semver, for example `0.1.0`.
- Git tags use a leading `v`, for example `v0.1.0`.
- Do not commit local `release/` zips. GitHub Actions packages `dist/` and uploads `lingualens-extension.zip` after the tag is pushed.

## Prerequisites

1. Confirm the current directory is the repository root:
   ```bash
   test -f package.json
   test -f manifest.config.ts
   test -f .github/workflows/release.yml
   node -p "require('./package.json').name"
   ```
   Continue only when the package name is `lingualens`.
2. Confirm GitHub CLI is installed and authenticated before PR, tag, or release operations:
   ```bash
   gh --version
   gh auth status
   ```
3. Inspect the worktree before switching branches:
   ```bash
   git status --short --branch
   ```
   If unrelated tracked changes are present, stop and ask how to handle them. Leave an untracked
   local `release/` directory alone unless the user explicitly asks to remove or commit it.

## Prepare A Release PR

1. Set concrete values before running commands:
   - `<version>`: plain semver, such as `0.2.0`
   - `<tag>`: `v<version>`, such as `v0.2.0`
   - `<branch>`: `release/<tag>`, such as `release/v0.2.0`
2. Fetch latest `origin/main`:
   ```bash
   git fetch origin main
   ```
3. Create a release branch from `origin/main`:
   ```bash
   git switch -c <branch> origin/main
   ```
4. Update npm-managed versions with npm, never by hand:
   ```bash
   npm version <version> --no-git-tag-version
   ```
   This updates `package.json` and the root entries in `package-lock.json`.
5. Update the Chrome extension manifest version manually:
   - `manifest.config.ts`: `version: '<version>'`
6. Check for missed project version references. Replace `<version>` and `<tag>` before running:
   ```bash
   rg -n "<version>|<tag>|\"version\": \"v|version: '0\\.0|v[0-9]+\\.[0-9]+\\.[0-9]+" package.json package-lock.json manifest.config.ts README.md TESTING.md TODO.md AGENTS.md .github src e2e
   ```
7. Run validation:
   ```bash
   npm test
   npm run build
   npm run test:e2e
   ```
   Run `npm run test:e2e` in the real local environment, not the sandbox. It rebuilds `dist/`;
   the final published zip still comes from the tag-triggered GitHub Action.
8. Commit only the intended version files:
   ```bash
   git add package.json package-lock.json manifest.config.ts
   git commit -m "chore(release): prepare <tag>"
   ```
9. Push the branch and create a regular PR to `main`. Write a short PR body to a temporary file
   so markdown renders with real newlines, then pass `--body-file`; do not let `gh pr create`
   enter interactive mode:
   ```bash
   git push -u origin <branch>
   gh pr create --base main --head <branch> --title "chore(release): prepare <tag>" --body-file <body-file>
   ```
   The PR body should include:
   ```markdown
   ## Summary
   - bump package and lockfile versions to <version> using npm version
   - update Chrome extension manifest version to <version>

   ## Validation
   - npm test
   - npm run build
   - npm run test:e2e
   ```
10. Wait for required checks, then squash-merge the release PR. Never use a merge commit or
    rebase merge. If merging in the GitHub UI, select **Squash and merge**:
    ```bash
    gh pr checks <number> --watch
    gh pr merge <number> --squash
    ```

## Prepare Release Notes

Prepare release notes before pushing the tag and keep them in a temporary Markdown file for the
publish steps. Release notes are required; do not rely on an empty or automatically generated body.

1. Identify the previous release tag and review every merged change since it:
   ```bash
   git describe --tags --abbrev=0 origin/main
   git log --first-parent --oneline <previous-tag>..origin/main
   ```
   Review relevant merged PR descriptions when commit subjects do not contain enough user-facing
   detail. Base the notes on the changes that actually landed; do not copy commit subjects or list
   every commit or PR.
2. Write `<release-notes-file>` in English for extension users. Organize changes under only the
   headings that apply:
   - `## What's New`: new user-visible capabilities.
   - `## Improvements`: fixes and usability, performance, or reliability improvements.
   - `## Compatibility`: compatibility changes, migrations, or actions users must take.
   - `## Maintenance`: dependency, build, or release-process changes worth calling out.
   - `## Validation`: the checks actually completed for this release and their accurate results.
3. Follow these writing rules:
   - Include at least one change section, then `## Validation` and the full changelog link.
   - Omit empty change sections; do not add `None` or placeholder bullets to the final notes.
   - Start each change bullet with a past-tense action verb and describe the user or maintainer
     outcome, not implementation details.
   - Combine related work into one coherent bullet. Avoid commit jargon, PR numbers, exhaustive
     change lists, marketing language, and unsupported claims.
   - Omit routine dependency updates and internal refactors unless they affect security,
     compatibility, or user-visible behavior.
   - Report exact test counts when available. Do not claim a check passed if it was not run, and
     mention end-to-end or live-provider validation only when it was actually performed.
   - Keep API keys, secrets, sensitive values, and internal-only details out of the notes.
4. Use this template. Replace every angle-bracket placeholder and remove unused change sections
   before publishing:
   ```markdown
   ## What's New

   - Added <user-visible capability and outcome>.

   ## Improvements

   - Improved <behavior and user-visible benefit>.

   ## Compatibility

   - Preserved or changed <compatibility behavior and any required user action>.

   ## Maintenance

   - Updated <maintenance area and why it matters>.

   ## Validation

   - <actual validation result, including an exact test count when available>.
   - Production build completed successfully.

   **Full changelog:** https://github.com/leonfrer/LinguaLens/compare/<previous-tag>...<tag>
   ```

## Publish After PR Merge

1. Confirm the PR is merged and identify the merge commit:
   ```bash
   gh pr view <number> --json state,mergeCommit,url,baseRefName,headRefName
   ```
   Continue only when `state` is `MERGED`; save `mergeCommit.oid` for the next checks.
2. Fetch `main` and tags:
   ```bash
   git fetch origin main --tags
   ```
3. Verify `origin/main` exactly matches the saved PR merge commit. Stop if the printed SHA differs:
   ```bash
   git rev-parse origin/main
   ```
4. Verify the tag does not already exist locally or remotely:
   ```bash
   git tag --list <tag>
   git ls-remote --tags origin <tag>
   ```
5. Create and push an annotated tag on `origin/main`:
   ```bash
   git tag -a <tag> origin/main -m "Release <tag>"
   git push origin <tag>
   ```
6. Watch the release workflow:
   ```bash
   gh run list --workflow "Build and Release Extension" --branch <tag> --limit 5
   gh run watch <run-id> --exit-status
   ```
7. Confirm the GitHub Release and `lingualens-extension.zip` asset exist:
   ```bash
   gh release view <tag> --json url,tagName,name,isDraft,isPrerelease,assets
   ```
8. Add the required release notes after the workflow creates the GitHub Release:
   ```bash
   gh release edit <tag> --notes-file <release-notes-file>
   ```
9. Verify the final Release, including its non-empty `body` and zip asset. The release is not
   complete until both are present:
   ```bash
   gh release view <tag> --json url,tagName,name,body,isDraft,isPrerelease,assets
   ```

## Safety Notes

- If the worktree contains unrelated changes, stage only the release files explicitly.
- If there is a local untracked `release/` directory, leave it untracked unless the user explicitly asks otherwise.
- Do not push tags before the release PR is merged.
- Do not merge a release PR with a merge commit or rebase merge; always squash-merge it.
- Do not leave a GitHub Release with an empty notes body.
- Do not create a draft PR unless the user specifically asks for one.
