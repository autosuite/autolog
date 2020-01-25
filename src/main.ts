import fs from 'fs';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import Octokit from '@octokit/rest';

/**
 * The filename for the meta file for GitHub Changelog Generator.
 */
const CHANGELOG_GENERATOR_META_FILENAME: string = ".github_changelog_generator";

/**
 * The expected name for the changelog file.
 */
const CHANGELOG_FILENAME: string = "CHANGELOG.md"

/**
 * A regular expression for all of the metadata retained (per line) for the changelog generator meta file.
 */
const RETAINED_METADATA_REGEX: RegExp = /unreleased.*|base.*|future-release.*|since-tag.*/;

/**
 * The regular expression used to find a version match in the `CHANGELOG.md` file.
 */
const CHANGELOG_VERSION_REGEX: RegExp = /(?<=## \[)(\d\.\d\.\d)(?=].*)/

/**
 * The regular expression for the standard SemVer version string.
 */
const SEMVER_REGEX: RegExp = /\d\.\d\.\d/;

/**
 * From a GitHub Milestones API response (as JSON), find the latest SemVer version.
 *
 * @param milestones the milestones data from the Octokit API
 */
async function findLatestVersionFromMilestones(
    milestones: Octokit.IssuesListMilestonesForRepoResponseItem[]
): Promise<string | null> {
    /* The latest milestone is the last one in the array response. */

    for (const milestone of milestones) {
        const versionMatches: RegExpMatchArray | null = milestone.title.match(SEMVER_REGEX);

        if (versionMatches && versionMatches.length == 1) {
            return versionMatches[0];
        }
    }

    return null;
}

/**
 * Try to find the latest version section from the changelog.
 *
 * @param changelogContents the contents of the `CHANGELOG.md` file
 */
async function findLatestVersionFromChangelog(changelogContents: string): Promise<string | null> {
    const foundVersions = changelogContents.match(CHANGELOG_VERSION_REGEX);

    if (!foundVersions) {
        return null;
    }

    return foundVersions[0];
}

/**
 * Decide between using a since-tag of the log version or the tag version. The log version often is a version that is
 * not yet tagged and therefore unreleased (e.g.: the same as the milestones version). The tag version is always a
 * version that is released, but an edge case is that it is not in the `CHANGELOG.md` file for whatever reason.
 *
 * In conclusion, the tag version should be used unless it is not in the `CHANGELOG.md` file. In that case, the version
 * to be used is the version at the top of the `CHANGELOG.md` file.
 *
 * @param changelogContents the contents of the `CHANGELOG.md` file
 * @param logVersion the log version
 * @param tagVersion the tag version
 */
async function determineLatestPrepared(
    changelogContents: string, logVersion: string, tagVersion: string
): Promise<string> {
    if (changelogContents.includes(tagVersion)) {
        return tagVersion;
    }

    return logVersion;
}

/**
 * Update or create the meta files required. This involves adding "unreleased", "future-release", and "since-tag". If
 * these flags are already present in the file, they are updated. Otherwise, they are added.
 *
 * @param latestMilestoneVersion
 * @param latestPreparedVersion
 */
async function updateMetaFile(latestMilestoneVersion: string, latestPreparedVersion: string): Promise<void> {
    const metaFileContents: string = fs.existsSync(CHANGELOG_GENERATOR_META_FILENAME) ?
        fs.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString() : "";

    let newMetaFileContents: string = "";

    /* Retain some metadata. */

    metaFileContents.split("\n").forEach((line: string) => {
        if (!line.match(RETAINED_METADATA_REGEX) && line != "") {
            newMetaFileContents += `${line}\n`;
        }
    });

    /* Add new content. */

    newMetaFileContents += "base=HISTORY.md\n";
    newMetaFileContents += `future-release=${latestMilestoneVersion}\n`;

    if (latestPreparedVersion != "0.0.0") {
        newMetaFileContents += `since-tag=${latestPreparedVersion}\n`;
    }

    fs.writeFileSync(CHANGELOG_GENERATOR_META_FILENAME, newMetaFileContents);
}

/**
 * Using `git` tags, find the latest version if possible. This can exception out.
 */
async function findLatestVersionFromGitTags(): Promise<string | null> {
    let text: string = "";

    try {
        await exec.exec("git fetch --tags");
        await exec.exec('git describe --abbrev=0', [], {
            listeners: {
                stdout: (data: Buffer) => {
                    text += data.toString();
                }
            }
        });
    } catch {
        /* Cannot be found. Caller must handle failure outside of function. */

        return null;
    }

    return text;
}

async function run() {
    /* Initialise GitHub API instance. */

    const octokit = new github.GitHub(core.getInput("github-token"));

    /* Find the latest milestone version. */

    core.info("Trying to find the latest milestone version...");
    const ownerWithRepo: string = core.getInput('github-repository');
    const owner: string = ownerWithRepo.split("/")[0];
    const repo: string = ownerWithRepo.split("/")[1];
    if (!owner || !repo) {
        core.setFailed(`github-repository was not set as a correct input. Got owner: ${owner} and repo: ${repo}.`);
    }
    const latestMilestoneVersion: string = (
        await findLatestVersionFromMilestones(
            (await octokit.issues.listMilestonesForRepo({ owner, repo })).data
        )
    )!;
    core.info(`[Found] Latest milestone version found was: ${latestMilestoneVersion}`);

    /*
     * Try to find the latest version in the changelog (not mandatory; default "0.0.0").
     */

    core.info("Trying to find latest changelog version...");
    if (!fs.existsSync(CHANGELOG_FILENAME)) {
        core.warning("Changelog file does not exist. Creating it...");

        await exec.exec(`touch ${CHANGELOG_FILENAME}`);
    }
    const changelogContents: string = fs.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString();
    const latestLogVersion: string = await findLatestVersionFromChangelog(changelogContents) || "0.0.0";
    core.info(`[Found] Latest log version found was: ${latestLogVersion}`);

    /*
     * Try to find the latest tag version (not mandatory; default to "0.0.0").
     */

    core.info("Trying to find the latest tag version...");
    const latestTagVersion: string = await findLatestVersionFromGitTags() || "0.0.0";
    core.info(`[Found] Latest tag version found was: ${latestTagVersion}`);

    /*
     * Try to find the version that will be seen as the last "completed" version.
     */

    core.info("Trying to derive latest prepared version...");
    const latestPreparedVersion: string = await determineLatestPrepared(
        changelogContents, latestLogVersion, latestTagVersion
    );
    core.info(`[Derived] Latest prepared version found was: ${latestPreparedVersion}`);

    /*
     * Try to update the meta file with the latest prepared version.
     */

    core.info("Trying to create/update meta file...");
    await updateMetaFile(latestMilestoneVersion, latestPreparedVersion);
    core.info('[Task] Meta file successfully created/updated.');

    /* Copy existing changelog data, if present. */

    core.info("Copying existing changelog data...");
    const command: string = "touch CHANGELOG.md && awk \"/## \\[" + latestPreparedVersion +
        "\\]/\,/\\\* \*This Changelog/\" CHANGELOG.md | head -n -1 > HISTORY.md";
    exec.exec(command);
    core.info("[Task] Changelog data successfully copied.")

    /* Run auto-changelogger. */

    core.info(`Running auto-logger for: \`${ownerWithRepo}\`...`);
    exec.exec(
        `docker run --rm -v \"$(pwd)\":/usr/local/src/your-app ferrarimarco/github-changelog-generator --user ` +
        `${owner} --project ${repo}`
    );
    core.info("[Task] Autologger run complete.")

    /* Clean up. */

    core.info("All done with normal tasks, cleaning up...");
    fs.writeFileSync(
        CHANGELOG_FILENAME,
        fs.readFileSync(CHANGELOG_FILENAME)
            .toString()
            .replace(/\n{2,}/gi, "\n\n")
    );
    exec.exec("rm HISTORY.md || echo \"No HISTORY.md file was created, therefore it was not deleted.\"");
    core.info("[Task] Cleanup completed.")
}

run();