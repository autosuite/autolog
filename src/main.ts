import fs from 'fs';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';

import Octokit from '@octokit/rest';

import * as autolib from '@teaminkling/autolib';

/** The filename for the meta file for GitHub Changelog Generator. */
const CHANGELOG_GENERATOR_META_FILENAME: string = ".github_changelog_generator";

/** The expected name for the changelog file. */
const CHANGELOG_FILENAME: string = "CHANGELOG.md";

/** The expected name for the history file. */
const HISTORY_FILENAME: string = "HISTORY.md";

/** A regular expression for all the metadata not kept (per line) for the changelog generator meta file. */
const RETAINED_METADATA_REGEX: RegExp = /unreleased.*|base.*|future-release.*|since-tag.*/;

/** The regular expression used to find a version match in the `CHANGELOG.md` file. */
const CHANGELOG_VERSION_REGEX: RegExp = /(?<=## \[)(v?\d\.\d\.\d)(?=].*)/;

/**
 * From a GitHub Milestones API response, find the latest SemVer version.
 *
 * @param owner the owner of the repo (or organisation name)
 * @param repo the repo name
 */
async function findLatestVersionFromMilestones(owner: string, repo: string): Promise<autolib.SemVer> {
    const milestones: Octokit.IssuesListMilestonesForRepoResponse = (
        await new github.GitHub(
            core.getInput("github-token")
        ).issues.listMilestonesForRepo({ owner, repo })
    ).data;

    /* The latest milestone is the last one in the array response. */

    for (const milestone of milestones) {
        const versionMatches: RegExpMatchArray | null = milestone.title.match(autolib.SEMVER_REGEXP);

        if (versionMatches && versionMatches.length == 1) {
            return autolib.SemVer.constructFromText(versionMatches[0]);
        }
    }

    core.warning(
        "No milestones have been found. Consider running autosuite/automilestone before autolog! Returning 0.0.0."
    )

    return autolib.SemVer.constructZero();
}

/**
 * Try to find the latest version section from the changelog.
 *
 * @param changelogContents The contents of the `CHANGELOG.md` file.
 */
async function findLatestVersionFromChangelog(changelogContents: string): Promise<autolib.SemVer> {
    const foundVersions: RegExpMatchArray | null = changelogContents.match(CHANGELOG_VERSION_REGEX);

    if (!foundVersions) {
        core.warning("Cannot find a version in the changelog. This can be okay; setting to `0.0.0`.");

        return autolib.SemVer.constructZero();
    }

    /* If something is found, grab the top-most version only. */

    return autolib.SemVer.constructFromText(foundVersions[0]);
}

/**
 * Decide between using a "since-tag" of the log version or the tag version.
 *
 * The log version is often a version that is not yet tagged and therefore unreleased (e.g., the same as the
 * milestone's version). The tag version is always a version that is released, but an edge case is that it is not in
 * the `CHANGELOG.md` file for whatever reason.
 *
 * In other words, the tag version should be used unless it is not in the `CHANGELOG.md` file. In that case, the
 * version to be used is the version at the top of the `CHANGELOG.md` file.
 *
 * @param logContents the contents of the `CHANGELOG.md` file
 * @param logVersion the log version
 * @param tagVersion Tte tag version
 */
async function determineLatestPrepared(
    logContents: string, logVersion: autolib.SemVer, tagVersion: autolib.SemVer
): Promise<autolib.SemVer> {
    if (logContents.includes(tagVersion.toString())) {
        return tagVersion;
    }

    return logVersion;
}

/**
 * Update or create the meta files required. This involves adding "unreleased", "future-release", and "since-tag".
 *
 * If these flags are already present in the file, they are updated. Otherwise, they are added.
 *
 * @param latestMilestoneVersion the latest milestone version
 * @param latestPreparedVersion the latest "prepared" version
 */
async function updateMetaFile(
    latestMilestoneVersion: autolib.SemVer, latestPreparedVersion: autolib.SemVer
): Promise<void> {
    /* Ensure file exists then read from it. */

    await exec.exec(`touch ${CHANGELOG_GENERATOR_META_FILENAME}`);

    const metaFileContents: string = fs.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString();

    /* This file contents replace is more complex than is found in autolib, so we do it manually. */

    let newMetaFileContents: string = "";

    /* Keep some metadata. */

    metaFileContents.split("\n").forEach((line: string) => {
        if (!line.match(RETAINED_METADATA_REGEX) && line != "") {
            newMetaFileContents += `${line}\n`;
        }
    });

    /* Add new content. */

    newMetaFileContents += `base=${HISTORY_FILENAME}\n`;
    newMetaFileContents += `future-release=${latestMilestoneVersion}\n`;

    if (!latestPreparedVersion.isZero()) {
        newMetaFileContents += `since-tag=${latestPreparedVersion}\n`;
    }

    fs.writeFileSync(CHANGELOG_GENERATOR_META_FILENAME, newMetaFileContents);
}

async function run(): Promise<void> {
    /* Capture and process all input info, failing if needed. */

    const token: string = core.getInput("github-token");
    const ownerWithRepo: string = core.getInput('github-repository');

    const owner: string = ownerWithRepo.split("/")[0];
    const repo: string = ownerWithRepo.split("/")[1];

    if (!token) {
        core.setFailed("Please provide the `github-token` input! Ensure the hyphen (-) isn't an underscore (_).");
    }

    if (!ownerWithRepo) {
        core.setFailed("Please provide the `github-repository` input as \"owner/repo\"!");
    }

    if (!owner || !repo) {
        core.setFailed(`github-repository was not correctly set. Got owner: ${owner} and repo: ${repo}.`);
    }

    /* Read the current changelog. */

    await exec.exec(`touch ${CHANGELOG_FILENAME}`);

    const changelogContents: string = fs.readFileSync(CHANGELOG_FILENAME).toString();

    /* Find the latest milestone version. Can fail if a milestone has not been found. */

    core.info("Trying to find the latest milestone version.");

    const latestMilestoneVersion: autolib.SemVer = await findLatestVersionFromMilestones(owner, repo);

    if (latestMilestoneVersion.isZero()) {
        core.setFailed("No milestones found. At least one milestone must exist if you use autolog!");
    }

    core.info(`[Found] The latest milestone version found was: \`${latestMilestoneVersion}\``);

    /* Try to find the latest version in the changelog (not mandatory; default "0.0.0"). */

    core.info("Trying to find latest changelog version.");

    const latestLogVersion: autolib.SemVer = await findLatestVersionFromChangelog(changelogContents);

    core.info(`[Found] The latest log version found was: \`${latestLogVersion}\``);

    /* ry to find the latest tag version (not mandatory; default to "0.0.0"). */

    core.info("Trying to find the latest tag version.");

    const latestTagVersion: autolib.SemVer = await autolib.findLatestVersionFromGitTags(true);

    core.info(`[Found] THe latest tag version found was: \`${latestTagVersion}\``);

    /* Try to find the version that will be seen as the last "completed"/"prepared" version. */

    core.info("Trying to derive the latest prepared version…");

    const latestPreparedVersion: autolib.SemVer = await determineLatestPrepared(
        changelogContents, latestLogVersion, latestTagVersion,
    );

    core.info(`[Derived] Latest prepared version found was: \`${latestPreparedVersion}\``);

    /* Try to update the meta file with the latest prepared version. */

    core.info("Trying to create/update meta file.");

    await updateMetaFile(latestMilestoneVersion, latestPreparedVersion);

    core.info('[Task] Meta file successfully created/updated.');

    /* Copy existing changelog data, if present. */

    core.info("Copying existing changelog data.");

    await exec.exec(`awk "/## \\[${latestPreparedVersion}\\]/\,/\\\* \*This Changelog/" ${CHANGELOG_FILENAME}`, [], {
        listeners: {
            stdout: (data: Buffer) => {
                /* Write copy and leave out the last "autogenerated" line. */

                fs.writeFileSync(HISTORY_FILENAME, data.toString().trim().replace(/\n.*$/, "").trim());
            }
        },
    });

    core.info("[Task] Changelog data successfully copied.");

    /* Run auto-changelog generating tool. */

    core.info(`Running auto-logger for: "${ownerWithRepo}".`);

    let workingDirectory: string = "";

    await exec.exec('pwd', [], {
        listeners: {
            stdout: (data: Buffer) => {
                workingDirectory = data.toString().trim();
            }
        },
    });

    await exec.exec(
        `docker run --rm -v ${workingDirectory}:/usr/local/src/your-app ferrarimarco/github-changelog-generator ` +
        `--user ${owner} --project ${repo} --token ${token}`
    );

    core.info("[Task] Autolog run is now complete.");

    /* Clean up. */

    core.info("All finished with normal tasks, cleaning up.");

    autolib.rewriteFileContentsWithReplacement(CHANGELOG_FILENAME, /\n{2,}/gi, "\n\n");

    core.info("[Task] Cleanup completed.");
}

run();
