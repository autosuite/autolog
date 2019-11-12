# Autologger

![Autobadger Release Stability](https://img.shields.io/static/v1?label=stability&message=prerelease&style=flat-square&color=yellow)
![Autobadger Latest Release](https://img.shields.io/static/v1?label=latest&message=0.1.0&style=flat-square&color=purple)

[_What are these badges?_](https://github.com/teaminkling/autobadger/tree/master/BADGES.md)

## Introduction

Wrapper for [`github-changelog-generator`](https://github.com/github-changelog-generator/github-changelog-generator) that allows human-readable changelog sections to be retained, to automatically prepare versions based on the most recent SemVer milestone, and to add to a pipeline that performs auto addition, committing, and pushing of changes.

## Rationale

`github-changelog-generator` is a fantastic tool. Unfortunately, I'm not too familiar with Ruby and I'm much faster with `bash` scripting to achieve my ends through a fork. This generator adds the following features:

- Can be used to automatically update the changelog on an event trigger.
- Allows keeping human-readable/edited changes available.
- Removes need to manage a `since-version` or `future-release` option in favour of looking in `git tags` for the former and GitHub Milestones for the latter.

## Usage

> Note: you **must** be using GitHub Milestones as one per version in order for Autologger to work.

Simply add this to your `main.yml`. You will gain a special commit note called `skip-log` that will prevent this action from running. You should add this to the automatic commit (see below) and the commit prior to a tag release where you humanise a changelog section, e.g.: `[skip-log] Humanise changelog preparing for the 1.3.10 release`.

You will need a step before this Action that clones the branch and another that performs a commit. You will also want to prevent tag pushes from generating a `CHANGELOG.md`.

```yml
name: my-workflow

on: [push]

jobs:
  autocommit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: teaminkling/skip-commit@master
        with:
          commit-filter: skip-log, skip-ci, automated
      - uses: teaminkling/autologger@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_repository: ${{ github.repository }}
      - name: Pre-remote commit actions
        run: |
          git add CHANGELOG.md && \
            git config --local user.email "action@github.com" && \
            git config --local user.name "GitHub Action" && \
            git commit -m "[skip-log, auto] Make changes automatically to meta files." || \
            echo "No files changed."
      - uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```
