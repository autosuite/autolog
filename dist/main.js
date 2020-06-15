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
var autolib = __importStar(require("@teaminkling/autolib"));
var CHANGELOG_GENERATOR_META_FILENAME = ".github_changelog_generator";
var CHANGELOG_FILENAME = "CHANGELOG.md";
var HISTORY_FILENAME = "HISTORY.md";
var RETAINED_METADATA_REGEX = /unreleased.*|base.*|future-release.*|since-tag.*/;
var CHANGELOG_VERSION_REGEX = /(?<=## \[)(v?\d\.\d\.\d)(?=].*)/;
function findLatestVersionFromMilestones(owner, repo) {
    return __awaiter(this, void 0, void 0, function () {
        var milestones, _i, milestones_1, milestone, versionMatches;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, new github.GitHub(core.getInput("github-token")).issues.listMilestonesForRepo({ owner: owner, repo: repo })];
                case 1:
                    milestones = (_a.sent()).data;
                    for (_i = 0, milestones_1 = milestones; _i < milestones_1.length; _i++) {
                        milestone = milestones_1[_i];
                        versionMatches = milestone.title.match(autolib.SEMVER_REGEXP);
                        if (versionMatches && versionMatches.length == 1) {
                            return [2, autolib.SemVer.constructFromText(versionMatches[0])];
                        }
                    }
                    core.warning("No milestones have been found. Consider running autosuite/automilestone before autolog! Returning 0.0.0.");
                    return [2, autolib.SemVer.constructZero()];
            }
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
                return [2, autolib.SemVer.constructZero()];
            }
            return [2, autolib.SemVer.constructFromText(foundVersions[0])];
        });
    });
}
function determineLatestPrepared(logContents, logVersion, tagVersion) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (logContents.includes(tagVersion.toString())) {
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
            switch (_a.label) {
                case 0: return [4, exec.exec("touch " + CHANGELOG_GENERATOR_META_FILENAME)];
                case 1:
                    _a.sent();
                    metaFileContents = fs_1.default.readFileSync(CHANGELOG_GENERATOR_META_FILENAME).toString();
                    newMetaFileContents = "";
                    metaFileContents.split("\n").forEach(function (line) {
                        if (!line.match(RETAINED_METADATA_REGEX) && line != "") {
                            newMetaFileContents += line + "\n";
                        }
                    });
                    newMetaFileContents += "base=" + HISTORY_FILENAME + "\n";
                    newMetaFileContents += "future-release=" + latestMilestoneVersion + "\n";
                    if (!latestPreparedVersion.isZero()) {
                        newMetaFileContents += "since-tag=" + latestPreparedVersion + "\n";
                    }
                    fs_1.default.writeFileSync(CHANGELOG_GENERATOR_META_FILENAME, newMetaFileContents);
                    return [2];
            }
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var token, ownerWithRepo, owner, repo, changelogContents, latestMilestoneVersion, latestLogVersion, latestTagVersion, latestPreparedVersion, workingDirectory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = core.getInput("github-token");
                    ownerWithRepo = core.getInput('github-repository');
                    owner = ownerWithRepo.split("/")[0];
                    repo = ownerWithRepo.split("/")[1];
                    if (!token) {
                        core.setFailed("Please provide the `github-token` input! Ensure the hyphen (-) isn't an underscore (_).");
                    }
                    if (!ownerWithRepo) {
                        core.setFailed("Please provide the `github-repository` input as \"owner/repo\"!");
                    }
                    if (!owner || !repo) {
                        core.setFailed("github-repository was not correctly set. Got owner: " + owner + " and repo: " + repo + ".");
                    }
                    return [4, exec.exec("touch " + CHANGELOG_FILENAME)];
                case 1:
                    _a.sent();
                    changelogContents = fs_1.default.readFileSync(CHANGELOG_FILENAME).toString();
                    core.info("Trying to find the latest milestone version.");
                    return [4, findLatestVersionFromMilestones(owner, repo)];
                case 2:
                    latestMilestoneVersion = _a.sent();
                    if (latestMilestoneVersion.isZero()) {
                        core.setFailed("No milestones found. At least one milestone must exist if you use autolog!");
                    }
                    core.info("[Found] The latest milestone version found was: `" + latestMilestoneVersion + "`");
                    core.info("Trying to find latest changelog version.");
                    return [4, findLatestVersionFromChangelog(changelogContents)];
                case 3:
                    latestLogVersion = _a.sent();
                    core.info("[Found] The latest log version found was: `" + latestLogVersion + "`");
                    core.info("Trying to find the latest tag version.");
                    return [4, autolib.findLatestVersionFromGitTags(true)];
                case 4:
                    latestTagVersion = _a.sent();
                    core.info("[Found] THe latest tag version found was: `" + latestTagVersion + "`");
                    core.info("Trying to derive the latest prepared version…");
                    return [4, determineLatestPrepared(changelogContents, latestLogVersion, latestTagVersion)];
                case 5:
                    latestPreparedVersion = _a.sent();
                    core.info("[Derived] Latest prepared version found was: `" + latestPreparedVersion + "`");
                    core.info("Trying to create/update meta file.");
                    return [4, updateMetaFile(latestMilestoneVersion, latestPreparedVersion)];
                case 6:
                    _a.sent();
                    core.info('[Task] Meta file successfully created/updated.');
                    core.info("Copying existing changelog data.");
                    return [4, exec.exec("awk \"/## \\[" + latestPreparedVersion + "\\]/,/\\* *This Changelog/\" " + CHANGELOG_FILENAME, [], {
                            listeners: {
                                stdout: function (data) {
                                    fs_1.default.writeFileSync(HISTORY_FILENAME, data.toString().trim().replace(/\n.*$/, "").trim());
                                }
                            },
                        })];
                case 7:
                    _a.sent();
                    core.info("[Task] Changelog data successfully copied.");
                    core.info("Running auto-logger for: \"" + ownerWithRepo + "\".");
                    workingDirectory = "";
                    return [4, exec.exec('pwd', [], {
                            listeners: {
                                stdout: function (data) {
                                    workingDirectory = data.toString().trim();
                                }
                            },
                        })];
                case 8:
                    _a.sent();
                    return [4, exec.exec("docker run --rm -v " + workingDirectory + ":/usr/local/src/your-app ferrarimarco/github-changelog-generator " +
                            ("--user " + owner + " --project " + repo + " --token " + token))];
                case 9:
                    _a.sent();
                    core.info("[Task] Autolog run is now complete.");
                    core.info("All finished with normal tasks, cleaning up.");
                    autolib.rewriteFileContentsWithReplacement(CHANGELOG_FILENAME, /\n{2,}/gi, "\n\n");
                    core.info("[Task] Cleanup completed.");
                    return [2];
            }
        });
    });
}
run();
