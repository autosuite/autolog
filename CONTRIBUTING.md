# Contributing

## Getting Started

- [Ensure you have a GitHub account](https://github.com/join).
- Feel free to [open an issue](https://github.com/mas-cli/mas/issues/new) to report a bug, ask a question, or request a feature.
  - Before you do this, try to look for similar issues that ask the same thing.
    - If it is a bug report, you can probably look up by error code experienced.
  - When you open the issue, make sure you read the template and follow it.

Move on to the next section to learn how to contribute changes!

## The Basics

> Team Inkling collaborators may push directly to `master` for minor documentation fixes.

1. Leave a comment that you're working on/would like to work on an open Issue.
2. Fork the repository.
3. Branch from `master` in your fork.
4. Open pull requests (PRs) from your fork's new branch to our repository's `master` branch.
5. A branch has exactly one corresponding issue.
6. A branch has exactly one contributor.
7. The branch should be named `#-brief-description`, e.g.: `31-fix-aligned-ball`.

## Issue Correspondence

An issue has:

- Exactly one assignee.
- Zero to many branches.
  - Ideally, these branches do not conflict.
  - Also ideally, there is exactly one branch, but sometimes this is not possible.
- A milestone.

## Changelog

[`CHANGELOG.md`](http://changelog.md) is automatically populated and managed via a GitHub Action. On the `master` branch, a Team Inkling contributor will "humanise" the changelog before tagging and releasing a new version of software.

A milestone corresponds to a release and vice versa.

## Slightly More Advanced Rules

1. Nobody else is supposed to touch your branch.
    1. If you want to hand over the branch to somebody else, they must rebase your changes on their own branch. Your branch will then be closed by you or when it becomes stale.
2. If `master` is ahead of your branch, make yourself level with `master` by rebasing before submitting a pull request.
3. Once it's on `master`, that's the truth. No more rewriting history!
4. If anything goes stale, it may be closed at the maintainer's discretion.
    1. Team Inkling engineers are exempt from this rule.

## Quality Control

Team Inkling has stringent quality control standards.

- Run your code under as many code quality checks as possible.
- Make sure it is readable and well-documented.
- Make sure it adheres to language/framework-specific conventions.
