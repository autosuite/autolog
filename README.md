# Autologger

Wrapper for [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator) that allows human-readable changelog sections to be retained, to automatically prepare versions based on the most recent SemVer milestone, and to add to a pipeline that performs auto addition, committing, and pushing of changes.

## Rationale

`github-changelog-generator` is a fantastic tool. Unfortunately, I'm not too familiar with Ruby and I'm much faster with `bash` scripting to achieve my ends. This generator adds the following features:

- Can be used to automatically update the changelog on an event trigger.
- Allows keeping human-readable/edited changes available.
- Removes need to manage a `since-version` or `future-release` option in favour of looking in `git tags` for the former and GitHub Milestones for the latter.

## Usage

You will first need to ensure you have a secret in your repository called `CHANGELOG_GITHUB_TOKEN` with either a [personal access token](https://github.com/settings/tokens/new?description=GitHub%20Changelog%20Generator%20token) or OAuth token with access to the repository you want to work with.

After setting these, simply add it to your `main.yml`. You will need a step before this Action that clones the branch and another that performs a commit. This is how I suggest you use it:

```yml
name: Autologger

on:
  push:
    branches:
      - master

jobs:
  autocommit:
    runs-on: ubuntu-latest
    env:
      CHANGELOG_GITHUB_TOKEN: ${{secrets.CHANGELOG_GITHUB_TOKEN}}
    steps:
      - uses: veggiemonk/skip-commit@1.0.0
        env:
          COMMIT_FILTER: skip-ci
      - uses: actions/checkout@master
      - uses: teaminkling/autologger@master
      - uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.CHANGELOG_GITHUB_TOKEN }}
```
