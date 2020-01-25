"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var core = __importStar(require("@actions/core"));
var exec = __importStar(require("@actions/exec"));
var github = __importStar(require("@actions/github"));
var null_writable_1 = __importDefault(require("null-writable"));
/**
 * The filename for the meta file for GitHub Changelog Generator.
 */
var CHANGELOG_GENERATOR_META_FILENAME = ".github_changelog_generator";
/**
 * The expected name for the changelog file.
 */
var CHANGELOG_FILENAME = "CHANGELOG.md";
/**
 * A regular expression for all of the metadata retained (per line) for the changelog generator meta file.
 */
var RETAINED_METADATA_REGEX = /unreleased.*|base.*|future-release.*|since-tag.*/;
/**
 * The regular expression used to find a version match in the `CHANGELOG.md` file.
 */
var CHANGELOG_VERSION_REGEX = /(?<=## \[)(\d\.\d\.\d)(?=].*)/;
/**
 * The regular expression for the standard SemVer version string.
 */
var SEMVER_REGEX = /\d\.\d\.\d/;
/**
 * From a GitHub Milestones API response (as JSON), find the latest SemVer version.
 *
 * @param milestones the milestones data from the Octokit API
 */
function findLatestVersionFromMilestones(milestones) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, milestones_1, milestone, versionMatches;
        return __generator(this, function (_a) {
            /* The latest milestone is the last one in the array response. */
            for (_i = 0, milestones_1 = milestones; _i < milestones_1.length; _i++) {
                milestone = milestones_1[_i];
                versionMatches = milestone.title.match(SEMVER_REGEX);
                if (versionMatches && versionMatches.length == 1) {
                    return [2 /*return*/, versionMatches[0]];
                }
            }
            return [2 /*return*/, null];
        });
    });
}
/**
 * Try to find the latest version section from the changelog.
 *
 * @param changelogContents the contents of the `CHANGELOG.md` file
 */
function findLatestVersionFromChangelog(changelogContents) {
    return __awaiter(this, void 0, void 0, function () {
        var foundVersions;
        return __generator(this, function (_a) {
            foundVersions = changelogContents.match(CHANGELOG_VERSION_REGEX);
            if (!foundVersions) {
                core.warning("Can't find a version in the changelog. This can be okay; setting to `0.0.0`.");
                return [2 /*return*/, "0.0.0"];
            }
            return [2 /*return*/, foundVersions[0]];
        });
    });
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
function determineLatestPrepared(changelogContents, logVersion, tagVersion) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (changelogContents.includes(tagVersion)) {
                return [2 /*return*/, tagVersion];
            }
            return [2 /*return*/, logVersion];
        });
    });
}
/**
 * Update or create the meta files required. This involves adding "unreleased", "future-release", and "since-tag". If
 * these flags are already present in the file, they are updated. Otherwise, they are added.
 *
 * @param latestMilestoneVersion
 * @param latestPreparedVersion
 */
function updateMetaFile(latestMilestoneVersion, latestPreparedVersion) {
    return __awaiter(this, void 0, void 0, function () {
        var metaFileContents, newMetaFileContents;
        return __generator(this, function (_a) {
            metaFileContents = fs_1.default.existsSync(CHANGELOG_GENERATOR_META_FILENAME) ?
                fs_1.default.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString() : "";
            newMetaFileContents = "";
            /* Retain some metadata. */
            metaFileContents.split("\n").forEach(function (line) {
                if (!line.match(RETAINED_METADATA_REGEX) && line != "") {
                    newMetaFileContents += line + "\n";
                }
            });
            /* Add new content. */
            newMetaFileContents += "base=HISTORY.md\n";
            newMetaFileContents += "future-release=" + latestMilestoneVersion + "\n";
            if (latestPreparedVersion != "0.0.0") {
                newMetaFileContents += "since-tag=" + latestPreparedVersion + "\n";
            }
            fs_1.default.writeFileSync(CHANGELOG_GENERATOR_META_FILENAME, newMetaFileContents);
            return [2 /*return*/];
        });
    });
}
/**
 * Using `git` tags, find the latest version if possible. This can exception out.
 */
function findLatestVersionFromGitTags() {
    return __awaiter(this, void 0, void 0, function () {
        var text, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    text = "";
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, exec.exec("git fetch --unshallow --all")];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, exec.exec('git describe --abbrev=0', [], {
                            listeners: {
                                stdout: function (data) {
                                    text += data.toString();
                                }
                            }
                        })];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    /* Cannot be found. Caller must handle failure outside of function. */
                    return [2 /*return*/, "0.0.0"];
                case 5: return [2 /*return*/, text];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var token, octokit, ownerWithRepo, owner, repo, latestMilestoneVersion, _a, changelogContents, latestLogVersion, latestTagVersion, latestPreparedVersion;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    token = core.getInput("github-token");
                    if (!token) {
                        core.setFailed("Please provide the `github-token` input! Ensure the hyphen (-) isn't an underscore (_).");
                    }
                    octokit = new github.GitHub(token);
                    /* Find the latest milestone version. */
                    core.info("Trying to find the latest milestone version...");
                    ownerWithRepo = core.getInput('github-repository');
                    if (!ownerWithRepo) {
                        core.setFailed("Please provide the `github-repository` input!");
                    }
                    owner = ownerWithRepo.split("/")[0];
                    repo = ownerWithRepo.split("/")[1];
                    if (!owner || !repo) {
                        core.setFailed("github-repository was not set as a correct input. Got owner: " + owner + " and repo: " + repo + ".");
                    }
                    _a = findLatestVersionFromMilestones;
                    return [4 /*yield*/, octokit.issues.listMilestonesForRepo({ owner: owner, repo: repo })];
                case 1: return [4 /*yield*/, _a.apply(void 0, [(_b.sent()).data])];
                case 2:
                    latestMilestoneVersion = (_b.sent());
                    core.info("[Found] Latest milestone version found was: " + latestMilestoneVersion);
                    /*
                     * Try to find the latest version in the changelog (not mandatory; default "0.0.0").
                     */
                    core.info("Trying to find latest changelog version...");
                    if (!!fs_1.default.existsSync(CHANGELOG_FILENAME)) return [3 /*break*/, 4];
                    core.warning("Changelog file does not exist. Creating it...");
                    return [4 /*yield*/, exec.exec("touch " + CHANGELOG_FILENAME)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    changelogContents = fs_1.default.readFileSync(CHANGELOG_FILENAME).toString();
                    return [4 /*yield*/, findLatestVersionFromChangelog(changelogContents)];
                case 5:
                    latestLogVersion = _b.sent();
                    core.info("[Found] Latest log version found was: " + latestLogVersion);
                    /*
                     * Try to find the latest tag version (not mandatory; default to "0.0.0").
                     */
                    core.info("Trying to find the latest tag version...");
                    return [4 /*yield*/, findLatestVersionFromGitTags()];
                case 6:
                    latestTagVersion = _b.sent();
                    core.info("[Found] Latest tag version found was: " + latestTagVersion);
                    /*
                     * Try to find the version that will be seen as the last "completed" version.
                     */
                    core.info("Trying to derive latest prepared version...");
                    return [4 /*yield*/, determineLatestPrepared(changelogContents, latestLogVersion, latestTagVersion)];
                case 7:
                    latestPreparedVersion = _b.sent();
                    core.info("[Derived] Latest prepared version found was: " + latestPreparedVersion);
                    /*
                     * Try to update the meta file with the latest prepared version.
                     */
                    core.info("Trying to create/update meta file...");
                    return [4 /*yield*/, updateMetaFile(latestMilestoneVersion, latestPreparedVersion)];
                case 8:
                    _b.sent();
                    core.info('[Task] Meta file successfully created/updated.');
                    /* Copy existing changelog data, if present. */
                    core.info("Copying existing changelog data...");
                    return [4 /*yield*/, exec.exec("touch " + CHANGELOG_FILENAME)];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, exec.exec("awk \"/## \\[" + latestPreparedVersion + "\\]/,/\\* *This Changelog/\" " + CHANGELOG_FILENAME, [], {
                            /* Swallout output. */
                            outStream: new null_writable_1.default()
                        })];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, exec.exec("head -n -1", [], {
                            listeners: {
                                stdout: function (data) {
                                    fs_1.default.writeFileSync("HISTORY.md", data.toString());
                                }
                            }
                        })];
                case 11:
                    _b.sent();
                    core.info("[Task] Changelog data successfully copied.");
                    /* Run auto-changelogger. */
                    core.info("Running auto-logger for: `" + ownerWithRepo + "`...");
                    return [4 /*yield*/, exec.exec("docker run --rm -v \"$(pwd)\":/usr/local/src/your-app ferrarimarco/github-changelog-generator --user " +
                            (owner + " --project " + repo))];
                case 12:
                    _b.sent();
                    core.info("[Task] Autologger run complete.");
                    /* Clean up. */
                    core.info("All done with normal tasks, cleaning up...");
                    fs_1.default.writeFileSync(CHANGELOG_FILENAME, fs_1.default.readFileSync(CHANGELOG_FILENAME)
                        .toString()
                        .replace(/\n{2,}/gi, "\n\n"));
                    return [4 /*yield*/, exec.exec("rm HISTORY.md || echo \"No HISTORY.md file was created, therefore it was not deleted.\"")];
                case 13:
                    _b.sent();
                    core.info("[Task] Cleanup completed.");
                    return [2 /*return*/];
            }
        });
    });
}
run();
