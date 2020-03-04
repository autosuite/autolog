# Autolog

| Summary           | Badge                                              |
| ----------------- | -------------------------------------------------- |
| Release Stability | ![Autobadge Release Stability][release-stability] |
| Latest Release    | ![Autobadge Latest Release][latest-release]       |
| Code Quality      | [![Maintainability][quality-image]][quality-link]  |
| Code Coverage     | [![Test Coverage][coverage-image]][coverage-link]  |

[release-stability]: https://img.shields.io/static/v1?label=latest&message=0.2.0&color=purple
[latest-release]: https://img.shields.io/static/v1?label=stability&message=prerelease&color=yellow
[quality-image]: https://api.codeclimate.com/v1/badges/f0ae0a65fb3e04fa6722/maintainability
[quality-link]: https://codeclimate.com/github/autosuite/autolog/maintainability
[coverage-image]: https://api.codeclimate.com/v1/badges/f0ae0a65fb3e04fa6722/test_coverage
[coverage-link]: https://codeclimate.com/github/autosuite/autolog/test_coverage

## Introduction

Wrapper for [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator)
that allows human-readable changelog sections to be kept to automatically prepare versions based on the most
recent SemVer milestone, and to add to a pipeline that performs auto addition, committing, and pushing of changes.

## Rationale

The `github-changelog-generator` is a fantastic tool and this tool utilises and extends it. Autolog:

- Can be used to update the changelog on an event trigger.
- Allows keeping human-readable/edited changes available.
- Removes need to manage a `since-version` or `future-release` option in favour of looking in `git tags` for the
  former and GitHub Milestones for the latter.

## Usage

> Note: you **must** be using GitHub Milestones as one per version in order for Autolog to work. Additionally, you
> **must** fetch all the commits/up to the tagged commit when checking out (see below).

Simply add this job to a workflow as part of the full Autosuite set or with just the following:

```yml
name: my-workflow

on: [push]

jobs:
  autocommit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2.0.0
        with:
          fetch-depth: 0
      - uses: autosuite/autolog@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          github-repository: ${{ github.repository }}
      - uses: autosuite/autocommit@master
      - uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

- Ensure `actions/checkout@v2.0.0` has option `fetch-depth` set to `0`.
- You may want to add `HISTORY.md` to your `.gitignore`.

## Configuration

> You can see all configuration in the [action.yml](action.yml) file.

| Variable          | Value                    | Example                     | Default | Required? |
| ----------------- | ------------------------ | --------------------------- | ------- | --------- |
| github-token      | The GitHub access token. | ${{ secrets.GITHUB_TOKEN }} | N/A     | Yes.      |
| github-repository | `group_or_user/repo`.    | ${{ github.repository }}    | N/A     | Yes.      |
