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
var dotenv = __importStar(require("dotenv"));
var exec = __importStar(require("@actions/exec"));
var github = __importStar(require("@actions/github"));
var CHANGELOG_GENERATOR_META_FILENAME = ".github_changelog_generator";
var CHANGELOG_FILENAME = "CHANGELOG.md";
var HISTORY_FILENAME = "HISTORY.md";
var RETAINED_METADATA_REGEX = /unreleased.*|base.*|future-release.*|since-tag.*/;
var CHANGELOG_VERSION_REGEX = /(?<=## \[)(v?\d\.\d\.\d)(?=].*)/;
var SEMVER_REGEX = /v?\d\.\d\.\d/;
function findLatestVersionFromMilestones(milestones) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, milestones_1, milestone, versionMatches;
        return __generator(this, function (_a) {
            for (_i = 0, milestones_1 = milestones; _i < milestones_1.length; _i++) {
                milestone = milestones_1[_i];
                versionMatches = milestone.title.match(SEMVER_REGEX);
                if (versionMatches && versionMatches.length == 1) {
                    return [2, versionMatches[0]];
                }
            }
            return [2, null];
        });
    });
}
function findLatestVersionFromChangelog(changelogContents) {
    return __awaiter(this, void 0, void 0, function () {
        var foundVersions;
        return __generator(this, function (_a) {
            foundVersions = changelogContents.match(CHANGELOG_VERSION_REGEX);
            if (!foundVersions) {
                core.warning("Cannot find a version in the changelog. This can be okay; setting to `0.0.0`.");
                return [2, "0.0.0"];
            }
            return [2, foundVersions[0]];
        });
    });
}
function determineLatestPrepared(changelogContents, logVersion, tagVersion) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (changelogContents.includes(tagVersion)) {
                return [2, tagVersion];
            }
            return [2, logVersion];
        });
    });
}
function updateMetaFile(latestMilestoneVersion, latestPreparedVersion) {
    return __awaiter(this, void 0, void 0, function () {
        var metaFileContents, newMetaFileContents;
        return __generator(this, function (_a) {
            metaFileContents = fs_1.default.existsSync(CHANGELOG_GENERATOR_META_FILENAME) ?
                fs_1.default.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString() : "";
            newMetaFileContents = "";
            metaFileContents.split("\n").forEach(function (line) {
                if (!line.match(RETAINED_METADATA_REGEX) && line != "") {
                    newMetaFileContents += line + "\n";
                }
            });
            newMetaFileContents += "base=" + HISTORY_FILENAME + "\n";
            newMetaFileContents += "future-release=" + latestMilestoneVersion + "\n";
            if (latestPreparedVersion != "0.0.0") {
                newMetaFileContents += "since-tag=" + latestPreparedVersion + "\n";
            }
            fs_1.default.writeFileSync(CHANGELOG_GENERATOR_META_FILENAME, newMetaFileContents);
            return [2];
        });
    });
}
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
                    return [4, exec.exec("git fetch --all", [], { silent: true })];
                case 2:
                    _b.sent();
                    return [4, exec.exec('git describe --abbrev=0', [], {
                            listeners: {
                                stdout: function (data) {
                                    text += data.toString();
                                }
                            },
                            silent: true
                        })];
                case 3:
                    _b.sent();
                    return [3, 5];
                case 4:
                    _a = _b.sent();
                    core.warning("Git tags cannot be found. Caller must handle failure outside of function.");
                    return [2, "0.0.0"];
                case 5: return [2, text.trim()];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var token, octokit, ownerWithRepo, owner, repo, latestMilestoneVersion, _a, changelogContents, latestLogVersion, latestTagVersion, latestPreparedVersion, workingDirectory;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dotenv.config();
                    token = core.getInput("github-token") || process.env["GITHUB_TOKEN"] || "";
                    if (!token) {
                        core.setFailed("Please provide the `github-token` input! Ensure the hyphen (-) isn't an underscore (_).");
                    }
                    octokit = new github.GitHub(token);
                    core.info("Trying to find the latest milestone version...");
                    ownerWithRepo = core.getInput('github-repository') || process.env["GITHUB_REPOSITORY"] || "";
                    if (!ownerWithRepo) {
                        core.setFailed("Please provide the `github-repository` input as \"owner/repo\"!");
                    }
                    owner = ownerWithRepo.split("/")[0];
                    repo = ownerWithRepo.split("/")[1];
                    if (!owner || !repo) {
                        core.setFailed("github-repository was not correctly set. Got owner: " + owner + " and repo: " + repo + ".");
                    }
                    _a = findLatestVersionFromMilestones;
                    return [4, octokit.issues.listMilestonesForRepo({ owner: owner, repo: repo })];
                case 1: return [4, _a.apply(void 0, [(_b.sent()).data])];
                case 2:
                    latestMilestoneVersion = (_b.sent());
                    core.info("[Found] The latest milestone version found was: `" + latestMilestoneVersion + "`");
                    core.info("Trying to find latest changelog version...");
                    if (!!fs_1.default.existsSync(CHANGELOG_FILENAME)) return [3, 4];
                    core.warning("Changelog file does not exist. Creating it...");
                    return [4, exec.exec("touch " + CHANGELOG_FILENAME)];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4:
                    changelogContents = fs_1.default.readFileSync(CHANGELOG_FILENAME).toString();
                    return [4, findLatestVersionFromChangelog(changelogContents)];
                case 5:
                    latestLogVersion = _b.sent();
                    core.info("[Found] The latest log version found was: `" + latestLogVersion + "`");
                    core.info("Trying to find the latest tag version…");
                    return [4, findLatestVersionFromGitTags()];
                case 6:
                    latestTagVersion = _b.sent();
                    core.info("[Found] THe latest tag version found was: `" + latestTagVersion + "`");
                    core.info("Trying to derive the latest prepared version…");
                    return [4, determineLatestPrepared(changelogContents, latestLogVersion, latestTagVersion)];
                case 7:
                    latestPreparedVersion = _b.sent();
                    core.info("[Derived] Latest prepared version found was: `" + latestPreparedVersion + "`");
                    core.info("Trying to create/update meta file…");
                    return [4, updateMetaFile(latestMilestoneVersion, latestPreparedVersion)];
                case 8:
                    _b.sent();
                    core.info('[Task] Meta file successfully created/updated.');
                    core.info("Copying existing changelog data…");
                    return [4, exec.exec("awk \"/## \\[" + latestPreparedVersion + "\\]/,/\\* *This Changelog/\" " + CHANGELOG_FILENAME, [], {
                            listeners: {
                                stdout: function (data) {
                                    fs_1.default.writeFileSync(HISTORY_FILENAME, data.toString().trim().replace(/\n.*$/, "").trim());
                                }
                            },
                            silent: true
                        })];
                case 9:
                    _b.sent();
                    core.info("[Task] Changelog data successfully copied.");
                    core.info("Running auto-logger for: \"" + ownerWithRepo + "\"\u2026");
                    workingDirectory = "";
                    return [4, exec.exec('pwd', [], {
                            listeners: {
                                stdout: function (data) {
                                    workingDirectory += data.toString().trim();
                                }
                            },
                            silent: true
                        })];
                case 10:
                    _b.sent();
                    return [4, exec.exec("docker run --rm -v " + workingDirectory + ":/usr/local/src/your-app ferrarimarco/github-changelog-generator " +
                            ("--user " + owner + " --project " + repo + " --token " + token))];
                case 11:
                    _b.sent();
                    core.info("[Task] Autolog run is now complete.");
                    core.info("All finished with normal tasks, cleaning up…");
                    fs_1.default.writeFileSync(CHANGELOG_FILENAME, fs_1.default.readFileSync(CHANGELOG_FILENAME)
                        .toString()
                        .replace(/\n{2,}/gi, "\n\n"));
                    core.info("[Task] Cleanup completed.");
                    return [2];
            }
        });
    });
}
run().then(function (_) { });
