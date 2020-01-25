"use strict";
var execSync = require('child_process').execSync;
var fs = require('fs');
var path = process.cwd();
var core = require('@actions/core');
var Octokit = require("@octokit/rest");
exec("git fetch --tags");
/**
 * The filename for the meta file for GitHub Changelog Generator.
 */
var CHANGELOG_GENERATOR_META_FILENAME = "/.github_changelog_generator";
/*
 * Initialise GitHub API instance.
 */
console.log("Authenticating with the GitHub API...");
var octokit = Octokit({
    auth: core.getInput("github-token"),
    baseUrl: 'https://api.github.com',
});
/**
 * Run a command and syncronously return its result.
 *
 * @param {String} command the command to run
 */
function exec(command) {
    return execSync(command, { encoding: 'utf-8' });
}
/**
 * From a GitHub Milestones API response (as JSON), find the latest SemVer version.
 *
 * @param {Object} milestones
 */
function findLatestVersionFromMilestones(milestones) {
    console.log("Trying to find the latest milestone version.");
    var data = milestones.data;
    /* The latest milestone is the last one in the array response. */
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var milestone = data_1[_i];
        var versionMatches = milestone.title.match(/\d\.\d\.\d/);
        if (versionMatches.length == 1) {
            return versionMatches[0];
        }
    }
    /* No found milestone. Fail with exit. */
    console.error("No milestones were found with SemVer titles. We just need X.Y.Z somewhere and once in the title.");
    process.exit(1);
}
/**
 * Try to find the latest version section from the changelog.
 */
function findLatestVersionFromChangelog() {
    console.log("Trying to find latest changelog version.");
    var contents = fs.readFileSync(path + "/CHANGELOG.md").toString();
    /* Attempt to get the first match. */
    var foundVersions = contents.match(/(?<=## \[)(\d\.\d\.\d)(?=].*)/);
    if (!foundVersions) {
        return "0.0.0";
    }
    else {
        return foundVersions[0];
    }
}
/**
 * Decide between using a since-tag of the log version or the tag version. The log version often is a version that is
 * not yet tagged and therefore unreleased (e.g.: the same as the milestones version). The tag version is always a
 * version that is released, but an edge case is that it is not in the CHANGELOG.md file for whatever reason.
 *
 * In conclusion, the tag version should be used unless it is not in the CHANGELOG.md file. In that case, the version to
 * be used is the version at the top of the CHANGELOG.md file.
 *
 * @param {String} logVersion the log version
 * @param {String} tagVersion the tag version
 */
function determineLatestPrepared(logVersion, tagVersion) {
    var contents = fs.readFileSync(path + "/CHANGELOG.md").toString();
    if (contents.includes(tagVersion)) {
        return tagVersion;
    }
    return logVersion;
}
/**
 * Update or create the meta files required. This involves adding "unreleased", "future-release", and "since-tag". If
 * these flags are already present in the file, they are updated. Otherwise, they are added.
 */
function updateMetaFile(latestMilestoneVersion, latestPreparedVersion) {
    var absPath = path + "/" + CHANGELOG_GENERATOR_META_FILENAME;
    var existingContents = fs.existsSync(absPath) ?
        fs.readFileSync(absPath).toString() : "";
    var newContents = "";
    /* Retain some metadata. */
    existingContents.split("\n").forEach(function (line) {
        if (!line.match(/unreleased.*|base.*|future-release.*|since-tag.*/) && line != "") {
            newContents += line + "\n";
        }
    });
    /* Add new content. */
    newContents += "base=HISTORY.md" + "\n";
    newContents += "future-release=" + latestMilestoneVersion + "\n";
    if (latestPreparedVersion != "0.0.0") {
        newContents += "since-tag=" + latestPreparedVersion + "\n";
    }
    fs.writeFileSync(absPath, newContents);
}
/* Find the latest milestone version, if it exists. */
var ownerRepo = core.getInput('github-repository');
var owner = ownerRepo.split("/")[0];
var repo = ownerRepo.split("/")[1];
if (!owner || !repo) {
    console.error("github-repository was not set as a correct input. Got owner: '" + owner +
        "' and repo: '" + repo + "'");
    process.exit(1);
}
console.log("Attempting to call milestones for owner: " + owner + " and repo: " + repo);
octokit.issues.listMilestonesForRepo({
    owner: owner,
    repo: repo
}).then(function (milestones) {
    var latestMilestoneVersion = findLatestVersionFromMilestones(milestones);
    /*
     * Note that the following must run in the working directory of the same repo that we checked milestones from.
     */
    var latestLogVersion = "0.0.0";
    var latestTagVersion = "0.0.0";
    try {
        console.log("Trying to find latest changelog version.");
        if (!fs.existsSync(path + "/CHANGELOG.md")) {
            console.log("Changelog file does not exist. Creating it...");
            exec("touch CHANGELOG.md");
        }
        latestLogVersion = findLatestVersionFromChangelog();
        latestTagVersion = exec('git describe --abbrev=0').trim();
    }
    catch (e) {
        console.log(e);
        console.log("No versions are present in the tags.");
    }
    console.log("Latest milestone version found was: " + latestMilestoneVersion);
    console.log("Latest log version found was: " + latestLogVersion);
    console.log("Latest tag version found was: " + latestTagVersion);
    /* Create the meta files. */
    var latestPreparedVersion = determineLatestPrepared(latestLogVersion, latestTagVersion);
    console.log("Latest prepared version found was: " + latestPreparedVersion);
    updateMetaFile(latestMilestoneVersion, latestPreparedVersion);
    /* Copy existing changelog data, if present. */
    var command = "touch CHANGELOG.md && awk \"/## \\[" + latestPreparedVersion +
        "\\]/\,/\\\* \*This Changelog/\" CHANGELOG.md | head -n -1 > HISTORY.md";
    console.log("Running: " + command.toString());
    exec(command);
    /* Run auto-changelogger. */
    console.log("Running auto-logger for: " + ownerRepo);
    exec("docker run --rm -v \"$(pwd)\":/usr/local/src/your-app ferrarimarco/github-changelog-generator --user " +
        owner + " --project " + repo);
    /* Clean up. */
    console.log("All done, cleaning up.");
    fs.writeFileSync(path + "/CHANGELOG.md", fs.readFileSync(path + "/CHANGELOG.md").toString()
        .replace(/\n{2,}/gi, "\n\n"));
    exec("rm HISTORY.md || echo \"No HISTORY.md file was created, therefore it was not deleted.\"");
});
