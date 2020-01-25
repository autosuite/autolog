# Autolog

| Summary           | Badge                                              |
| ----------------- | -------------------------------------------------- |
| Release Stability | ![Autobadger Release Stability][release-stability] |
| Latest Release    | ![Autobadger Latest Release][latest-release]       |

[release-stability]: https://img.shields.io/static/v1?label=latest&message=0.1.1&color=purple
[latest-release]: https://img.shields.io/static/v1?label=stability&message=prerelease&color=yellow

## Introduction

Wrapper for [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator) that allows human-readable changelog sections to be retained to automatically prepare versions based on the most recent SemVer milestone, and to add to a pipeline that performs auto addition, committing, and pushing of changes.

## Rationale

`github-changelog-generator` is a fantastic tool and this tool utilises and extends it. Autolog:

- Can be used to automatically update the changelog on an event trigger.
- Allows keeping human-readable/edited changes available.
- Removes need to manage a `since-version` or `future-release` option in favour of looking in `git tags` for the former and GitHub Milestones for the latter.

## Usage

> Note: you **must** be using GitHub Milestones as one per version in order for Autologger to work.

Simply add this job to a workflow as part of the full Autosuite set or with just the following:

```yml
name: my-workflow

on: [push]

jobs:
  autocommit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: autosuite/autolog@master
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          github-repository: ${{ github.repository }}
      - uses: autosuite/autocommit@master
      - uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

## Configuration

> You can see all configuration in the [action.yml](action.yml) file.

| Variable          | Value                    | Example                     | Default | Required? |
| ----------------- | ------------------------ | --------------------------- | ------- | --------- |
| github-token      | The GitHub access token. | ${{ secrets.GITHUB_TOKEN }} | N/A     | Yes.      |
| github-repository | `group_or_user/repo`.    | ${{ github.repository }}    | N/A     | Yes.      |

## Documentation

If you would like to contribute to this project, please read our [contributors documentation](CONTRIBUTING.md) and our [code of conduct](CODE_OF_CONDUCT.md).

The license we use for this project is defined in [the license file](LICENSE).
