const { execSync } = require('child_process');
const fs = require('fs');
const path = process.cwd();

const core = require('@actions/core');
const Octokit = require("@octokit/rest");

/**
 * The filename for the meta file for GitHub Changelog Generator.
 */
let CHANGELOG_GENERATOR_META_FILENAME = "/.github_changelog_generator";

/*
 * Initialise GitHub API instance.
 */

console.log("Authenticating with the GitHub API...");

const octokit = Octokit({
    auth: core.getInput("github-token"),
    baseUrl: 'https://api.github.com',
});

/**
 * Run a command and syncronously return its result.
 *
 * @param String command the command to run
 */
function exec(command) {
    return execSync(command, { encoding: 'utf-8' });
}

/**
 * From a GitHub Milestones API response (as JSON), find the latest SemVer version.
 *
 * @param Object milestones
 */
function findLatestVersionFromMilestones(milestones) {
    console.log("Trying to find the latest milestone version.");

    const data = milestones.data;

    /* The latest milestone is the last one in the array response. */

    for (const milestone of data.reverse()) {
        const versionMatches = milestone.title.match(/\d\.\d\.\d/);

        if (versionMatches.length == 1) {
            return versionMatches[0];
        }
    }

    /* No found milestone. Fail with exit. */

    console.error("No milestones were found with SemVer titles. We just need X.Y.Z somewhere and once in the title.");

    process.exit(1);
}

/**
 * Update or create the meta files required. This involves adding "unreleased", "future-release", and "since-tag". If
 * these flags are already present in the file, they are updated. Otherwise, they are added.
 */
function updateMetaFile(latestMilestoneVersion, latestTagVersion) {
    const absPath = path + "/" + CHANGELOG_GENERATOR_META_FILENAME;
    const existingContents = fs.existsSync(absPath) ?
        fs.readFileSync(absPath).toString() : "";
    let newContents = "";

    /* Retain some metadata. */

    existingContents.split("\n").forEach(line => {
        if (!line.match(/unreleased.*|future-release.*|since-tag.*|/)) {
            newContents += line + "\n";
        }
    });

    /* Add new content. */

    newContents += "unreleased=false" + "\n";
    newContents += "future-release=" + latestMilestoneVersion + "\n";

    if (latestTagVersion != "0.0.0") {
        newContents += "since-tag=" + latestTagVersion + "\n";
    }

    fs.writeFileSync(absPath, newContents);
}

/* Find the latest milestone version tag, if it exists. */

const ownerRepo = core.getInput('github-repository');
const owner = ownerRepo.split("/")[0];
const repo = ownerRepo.split("/")[1];

if (!owner || !repo) {
    console.error("github-repository was not set as a correct input.");

    process.exit(1);
}

console.log("Attempting to call milestones for owner: " + owner + " and repo: " + repo);

octokit.issues.listMilestonesForRepo({
    owner,
    repo
}).then(milestones => {
    const latestMilestoneVersion = findLatestVersionFromMilestones(milestones);

    /*
     * Note that the following must run in the working directory of the same repo that we checked milestones from. It
     * can fail if the current repository does not have any tags.
     */

    let latestTagVersion = "0.0.0";

    try {
        console.log("Trying to find latest tag.");

        latestTagVersion = exec('git describe --abbrev=0');
    } catch {
        console.log("No tags are present in the repository. This is fine, it just means the entire file will be " +
            "regenerated");
    }

    /* Create the meta files. */

    updateMetaFile(latestMilestoneVersion, latestTagVersion);

    /* Copy existing changelog data, if present. */

    exec("touch CHANGELOG.md && awk \"/## \\[$(git describe --abbrev=0)\\]/,0\" CHANGELOG.md > HISTORY.md");

    /* Run auto-changelogger. */

    console.log("Running auto-logger for: " + ownerRepo);

    exec("docker run --rm -v \"$(pwd)\" ferrarimarco/github-changelog-generator --user " + owner +
        " --project " + repo);

    /* Clean up. */

    console.log("All done, cleaning up.");

    exec("rm HISTORY.md || echo \"No HISTORY.md file was created, therefore it was not deleted.\"");
});
