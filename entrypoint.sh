#!/usr/bash

# Exit immediately if a command returns a non-zero status.
set -e

export LATEST_MILESTONE=$(curl "https://api.github.com/repos/paced/perfect/milestones" -s \
    -H "Authorization: token $INPUT_GITHUB_TOKEN" | grep '"title": "\d\.\d\.\d"' | grep "\d.\d.\d." -o)

touch .github_changelog_generator
echo "unreleased=false" >> .github_changelog_generator
echo "future-release=$LATEST_MILESTONE" >> .github_changelog_generator
git describe --abbrev=0 && echo "since-tag=$(git describe --abbrev=0)" >> .github_changelog_generator || \
    echo "Couldn't find any tags. This is the first version."

touch CHANGELOG.md
awk "/## \[$(git describe --abbrev=0)\]/,0" CHANGELOG.md > HISTORY.md

export REPO_OWNER=$(echo "$INPUT_GITHUB_REPOSITORY" | cut -d "/" -f 1)
export REPO_NAME=$(echo "$INPUT_GITHUB_REPOSITORY" | cut -d "/" -f 2)
echo "Running auto changelogger for $REPO_OWNER's repository: $REPO_NAME"
github_changelog_generator --user $REPO_OWNER --project $REPO_NAME

rm HISTORY.md || echo "No HISTORY.md file was created, therefore it was not deleted."
rm .github_changelog_generator
